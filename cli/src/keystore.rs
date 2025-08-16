//! Keystore management with Argon2id KDF and ChaCha20-Poly1305 AEAD
//! File: keystore.json (versioned)
//! Only encrypted secret keys are persisted.

use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};
use std::{fs, path::PathBuf};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::{rngs::OsRng, RngCore};
use once_cell::sync::Lazy;
use std::sync::RwLock;
use zeroize::Zeroize;
use std::time::{Instant, Duration};
use tracing::{info, warn};

use crate::addr::address_from_pk;
use crate::crypto::{ActivePQC, PQC};

// ---------- KDF + AEAD wrappers (local minimal to avoid extra modules yet) ----------
use argon2::{Argon2, Params};
use chacha20poly1305::{aead::{Aead, KeyInit}, XChaCha20Poly1305, Key, XNonce};

#[derive(Serialize, Deserialize, Clone)]
pub struct KeystoreFile { pub version: u32, pub keys: Vec<KeystoreEntry> }

#[derive(Serialize, Deserialize, Clone)]
pub struct KeystoreEntry {
    pub name: String,
    pub address: String,
    pub pk: String, // base64 public key raw bytes
    pub enc: EncBlob,
    pub created: u64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EncBlob { pub alg: String, pub nonce: String, pub salt: String, pub kdf: KdfParams, pub ct: String }

#[derive(Serialize, Deserialize, Clone)]
pub struct KdfParams { pub alg: String, pub m_cost: u32, pub t_cost: u32, pub p: u32 }

impl Default for KdfParams { fn default() -> Self { Self { alg: "argon2id".into(), m_cost: 19456, t_cost: 2, p: 1 } } }

static UNLOCKED: Lazy<RwLock<Vec<UnlockedKey>>> = Lazy::new(|| RwLock::new(Vec::new()));

#[derive(Clone)]
pub struct UnlockedKey { pub name: String, pub sk: Vec<u8>, pub pk: Vec<u8>, pub address: String, pub last_used: Instant }

impl UnlockedKey { pub fn mark_used(&mut self) { self.last_used = Instant::now(); } }

pub struct SecretGuard { name: String, sk: Vec<u8>, pk: Vec<u8>, pub address: String }
impl std::ops::Deref for SecretGuard { type Target = [u8]; fn deref(&self) -> &Self::Target { &self.sk } }
impl SecretGuard { pub fn public_key(&self) -> &[u8] { &self.pk } }
impl Drop for SecretGuard { fn drop(&mut self) { self.sk.zeroize(); self.pk.zeroize(); } }

fn timeout() -> Duration { let secs: u64 = std::env::var("DYL_KEY_TIMEOUT_SECS").ok().and_then(|v| v.parse().ok()).unwrap_or(300); Duration::from_secs(secs) }

// Purge expired keys (and zeroize memory)
fn purge_expired() { let to = timeout(); let mut w = UNLOCKED.write().unwrap(); w.retain(|k| k.last_used.elapsed() <= to); }

pub fn purge_all() { let mut w = UNLOCKED.write().unwrap(); for k in w.iter_mut() { k.sk.zeroize(); k.pk.zeroize(); } w.clear(); }

pub fn purge() { purge_all(); }

pub fn get_unlocked(name: &str) -> Option<SecretGuard> {
    purge_expired();
    let mut w = UNLOCKED.write().unwrap();
    if let Some(pos) = w.iter().position(|k| k.name==name) { let mut uk = w[pos].clone(); if uk.last_used.elapsed() > timeout() { w.remove(pos); return None; } uk.mark_used(); w[pos] = uk.clone(); return Some(SecretGuard { name: uk.name, sk: uk.sk.clone(), pk: uk.pk.clone(), address: uk.address }); }
    None
}

pub fn keystore_path(home: &str) -> PathBuf { let expanded = shellexpand::tilde(home).to_string(); PathBuf::from(expanded).join("keystore.json") }

pub fn load_or_init(home: &str) -> Result<KeystoreFile> {
    let path = keystore_path(home);
    if !path.exists() { return Ok(KeystoreFile { version: 1, keys: vec![] }) }
    let data = fs::read(&path)?; Ok(serde_json::from_slice(&data)?)
}

pub fn save(home: &str, ks: &KeystoreFile) -> Result<()> { let path = keystore_path(home); fs::create_dir_all(path.parent().unwrap())?; fs::write(path, serde_json::to_vec_pretty(ks)?)?; Ok(()) }

fn now() -> u64 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() }

// Derive key via Argon2id
fn derive_key(password: &str, salt: &[u8], kp: &KdfParams) -> Result<[u8;32]> {
    let params = Params::new(kp.m_cost, kp.t_cost, kp.p, Some(32)).map_err(|e| anyhow!(e.to_string()))?;
    let argon = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);
    let mut out = [0u8;32];
    argon.hash_password_into(password.as_bytes(), salt, &mut out).map_err(|e| anyhow!(e.to_string()))?;
    Ok(out)
}

fn encrypt_sk(password: &str, sk: &[u8], kp: KdfParams) -> Result<EncBlob> {
    let mut salt = [0u8;16]; OsRng.fill_bytes(&mut salt);
    let key = derive_key(password, &salt, &kp)?;
    let cipher = XChaCha20Poly1305::new(Key::from_slice(&key));
    let mut nonce_bytes = [0u8;24]; OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);
    let ct = cipher.encrypt(nonce, sk).map_err(|e| anyhow!(e.to_string()))?;
    Ok(EncBlob { alg: "chacha20poly1305".into(), nonce: B64.encode(nonce_bytes), salt: B64.encode(salt), kdf: kp, ct: B64.encode(ct) })
}

fn decrypt_sk(password: &str, enc: &EncBlob) -> Result<Vec<u8>> {
    if enc.alg != "chacha20poly1305" { return Err(anyhow!("unsupported alg")) }
    if enc.kdf.alg != "argon2id" { return Err(anyhow!("unsupported kdf")) }
    let salt = B64.decode(&enc.salt)?; let nonce_bytes = B64.decode(&enc.nonce)?; let kp = &enc.kdf; let key = derive_key(password, &salt, kp)?;
    let cipher = XChaCha20Poly1305::new(Key::from_slice(&key));
    let ct = B64.decode(&enc.ct)?; let nonce = XNonce::from_slice(&nonce_bytes);
    let pt = cipher.decrypt(nonce, ct.as_ref()).map_err(|_| anyhow!("decryption failed"))?;
    Ok(pt)
}

pub fn create_new(home: &str, name: &str, password: &str) -> Result<KeystoreEntry> {
    let mut ks = load_or_init(home)?;
    if ks.keys.iter().any(|k| k.name==name) { return Err(anyhow!("name exists")) }
    let (sk, pk) = ActivePQC::keypair();
    let address = address_from_pk(&pk);
    let kp = KdfParams::default();
    let enc = encrypt_sk(password, &sk, kp)?;
    let ent = KeystoreEntry { name: name.into(), address: address.clone(), pk: B64.encode(&pk), enc, created: now() };
    ks.keys.push(ent.clone());
    save(home, &ks)?;
    info!("event=keystore_create name={}" , name);
    Ok(ent)
}

pub fn list(home: &str) -> Result<Vec<KeystoreEntry>> { Ok(load_or_init(home)?.keys) }

pub fn change_password(home: &str, name: &str, old: &str, newp: &str) -> Result<()> {
    let mut ks = load_or_init(home)?; let ent = ks.keys.iter_mut().find(|k| k.name==name).ok_or(anyhow!("not found"))?;
    let sk = decrypt_sk(old, &ent.enc)?; let kp = KdfParams::default(); ent.enc = encrypt_sk(newp, &sk, kp)?; save(home, &ks)?; Ok(())
}

pub fn unlock(home: &str, name: &str, password: &str) -> Result<UnlockedKey> {
    static FAILS: Lazy<RwLock<u32>> = Lazy::new(|| RwLock::new(0));
    if *FAILS.read().unwrap() >= 5 { warn!("event=unlock_blocked name={} reason=too_many_failures", name); return Err(anyhow!("too many failures")) }
    let ks = load_or_init(home)?; let ent = ks.keys.into_iter().find(|k| k.name==name).ok_or(anyhow!("not found"))?;
    let sk = match decrypt_sk(password, &ent.enc) { Ok(v) => v, Err(e) => { let mut f = FAILS.write().unwrap(); *f += 1; warn!("event=unlock_failure name={} attempt={} error=decrypt", name, *f); return Err(e); } };
    let pk = B64.decode(ent.pk)?;
    let uk = UnlockedKey { name: ent.name.clone(), sk, pk: pk.clone(), address: ent.address.clone(), last_used: Instant::now() };
    {
        let mut w = UNLOCKED.write().unwrap();
        w.retain(|k| k.name != uk.name);
        w.push(uk.clone());
    }
    info!("event=unlock_success name={}", ent.name);
    Ok(uk)
}

pub fn with_secret<F, R>(name: &str, f: F) -> Result<R>
where F: FnOnce(&SecretGuard) -> Result<R> {
    let guard = get_unlocked(name).ok_or(anyhow!("key not unlocked or expired"))?;
    f(&guard)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn roundtrip() {
        let dir = tempfile::tempdir().unwrap(); let home = dir.path().to_str().unwrap();
        let e = create_new(home, "def", "pw").unwrap(); assert_eq!(e.name, "def");
        let listv = list(home).unwrap(); assert_eq!(listv.len(),1);
        let _u = unlock(home, "def", "pw").unwrap();
        assert!(get_unlocked("def").is_some());
    }
}
