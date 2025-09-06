use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose, Engine as _};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};

// Async traits for providers
#[async_trait::async_trait]
pub trait KeyProvider {
    async fn get_validator_key(&self, id: &str) -> Result<Vec<u8>>;
    async fn put_validator_key(&self, id: &str, key: &[u8]) -> Result<()>;
}

// -------------------- Vault Provider --------------------
pub struct VaultProvider {
    base_url: String,
    token: String,
    kv_mount: String,
    path_base: String,
    client: reqwest::Client,
}

impl VaultProvider {
    pub fn new(base_url: String, token: String, kv_mount: String, path_base: String) -> Self {
        let client = reqwest::Client::new();
        Self { base_url, token, kv_mount, path_base, client }
    }

    fn data_url(&self, id: &str) -> String {
        // KV v2 path: /v1/<mount>/data/<path>
        format!(
            "{}/v1/{}/data/{}/{}",
            self.base_url.trim_end_matches('/'),
            self.kv_mount.trim_matches('/'),
            self.path_base.trim_matches('/'),
            id
        )
    }
}

#[derive(Serialize, Debug)]
struct VaultWrite<'a> {
    data: VaultData<'a>,
}
#[derive(Serialize, Debug)]
struct VaultData<'a> {
    private_key: &'a str,
}
#[derive(Deserialize, Debug)]
struct VaultReadOuter {
    data: VaultReadData,
}
#[derive(Deserialize, Debug)]
struct VaultReadData {
    data: VaultReadInner,
}
#[derive(Deserialize, Debug)]
struct VaultReadInner {
    private_key: String,
}

#[async_trait::async_trait]
impl KeyProvider for VaultProvider {
    async fn get_validator_key(&self, id: &str) -> Result<Vec<u8>> {
        let url = self.data_url(id);
        let res = self
            .client
            .get(url)
            .header("X-Vault-Token", &self.token)
            .send()
            .await
            .context("vault get request failed")?;
        if !res.status().is_success() {
            return Err(anyhow!("vault get failed: {}", res.status()));
        }
        let body: VaultReadOuter = res.json().await.context("invalid vault json")?;
        let decoded = general_purpose::STANDARD
            .decode(body.data.data.private_key)
            .context("invalid base64 in vault secret")?;
        Ok(decoded)
    }

    async fn put_validator_key(&self, id: &str, key: &[u8]) -> Result<()> {
        let url = self.data_url(id);
        let b64 = general_purpose::STANDARD.encode(key);
        let payload = VaultWrite { data: VaultData { private_key: &b64 } };
        let res = self
            .client
            .post(url)
            .header("X-Vault-Token", &self.token)
            .json(&payload)
            .send()
            .await
            .context("vault put request failed")?;
        if !res.status().is_success() {
            return Err(anyhow!("vault put failed: {}", res.status()));
        }
        Ok(())
    }
}

// -------------------- Sealed Keystore Provider --------------------
use argon2::{password_hash::SaltString, Argon2};
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
struct SealBlob {
    v: u8,
    kdf: String,
    cipher: String,
    salt: String,
    nonce: String,
    ct: String,
}

pub struct SealedKeystoreProvider {
    dir: PathBuf,
}

impl SealedKeystoreProvider {
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self { dir: dir.into() }
    }

    fn file_path(&self, id: &str) -> PathBuf {
        let mut p = self.dir.clone();
        p.push(format!("validator-{id}.seal"));
        p
    }

    fn derive_key(passphrase: &str, salt_b64: &str) -> Result<Key> {
        let salt = general_purpose::STANDARD
            .decode(salt_b64)
            .context("invalid salt b64")?;
        let _s = SaltString::encode_b64(&salt).map_err(|e| anyhow!("salt b64 encode: {e}"))?;
        let argon = Argon2::default();
        let mut out = [0u8; 32];
        argon
            .hash_password_into(passphrase.as_bytes(), &salt, &mut out)
            .map_err(|e| anyhow!("argon2 derive failed: {e}"))?;
        Ok(Key::from_slice(&out).to_owned())
    }

    fn write_proof(&self, path: &PathBuf) {
        let proof_dir = PathBuf::from("launch-evidence/secrets");
        let _ = fs::create_dir_all(&proof_dir);
        let proof_path = proof_dir.join("keystore_proof.txt");
        if let Ok(meta) = fs::metadata(path) {
            let size = meta.len();
            use sha2::Digest;
            let sha = sha2::Sha256::digest(fs::read(path).unwrap_or_default());
            let _ = fs::write(
                proof_path,
                format!(
                    "path: {}\nsize: {} bytes\nsha256: 0x{}\n",
                    path.display(),
                    size,
                    hex::encode(sha)
                ),
            );
        }
    }
}

#[async_trait::async_trait]
impl KeyProvider for SealedKeystoreProvider {
    async fn get_validator_key(&self, id: &str) -> Result<Vec<u8>> {
        let path = self.file_path(id);
        fs::create_dir_all(&self.dir).ok();
        if !path.exists() {
            // Create new sealed keystore by prompting passphrase and storing key material
            let pass = super::providers::prompt_passphrase()?;
            let mut key_bytes = vec![0u8; 64];
            OsRng.fill_bytes(&mut key_bytes);
            // Encrypt
            let salt = {
                let mut s = [0u8; 16];
                OsRng.fill_bytes(&mut s);
                s
            };
            let salt_b64 = general_purpose::STANDARD.encode(salt);
            let k = Self::derive_key(&pass, &salt_b64)?;
            let cipher = ChaCha20Poly1305::new(&k);
            let mut nonce_bytes = [0u8; 12];
            OsRng.fill_bytes(&mut nonce_bytes);
            let nonce = chacha20poly1305::Nonce::from(nonce_bytes);
            let ct = cipher
                .encrypt(&nonce, key_bytes.as_ref())
                .map_err(|e| anyhow!("encrypt failed: {e}"))?;
            let blob = SealBlob {
                v: 1,
                kdf: "argon2id".into(),
                cipher: "chacha20poly1305".into(),
                salt: salt_b64,
                nonce: general_purpose::STANDARD.encode(nonce),
                ct: general_purpose::STANDARD.encode(&ct),
            };
            let json = serde_json::to_vec_pretty(&blob)?;
            fs::write(&path, json).context("write sealed keystore failed")?;
            self.write_proof(&path);
            Ok(key_bytes)
        } else {
            // Read and decrypt
            let pass = super::providers::prompt_passphrase()?;
            let raw = fs::read(&path).context("read sealed keystore failed")?;
            let blob: SealBlob = serde_json::from_slice(&raw).context("invalid sealed keystore json")?;
            if blob.v != 1 || blob.cipher != "chacha20poly1305" || blob.kdf != "argon2id" {
                return Err(anyhow!("unsupported keystore format"));
            }
            let k = Self::derive_key(&pass, &blob.salt)?;
            let cipher = ChaCha20Poly1305::new(&k);
            let nonce_bytes = general_purpose::STANDARD
                .decode(&blob.nonce)
                .context("invalid nonce b64")?;
            let nonce = Nonce::from_slice(&nonce_bytes);
            let ct = general_purpose::STANDARD
                .decode(&blob.ct)
                .context("invalid ct b64")?;
            let pt = cipher
                .decrypt(nonce, ct.as_ref())
                .map_err(|_| anyhow!("decryption failed (wrong passphrase?)"))?;
            self.write_proof(&path);
            Ok(pt)
        }
    }

    async fn put_validator_key(&self, id: &str, key: &[u8]) -> Result<()> {
        let path = self.file_path(id);
        fs::create_dir_all(&self.dir).ok();
        let pass = super::providers::prompt_passphrase()?;
        let mut salt = [0u8; 16];
        OsRng.fill_bytes(&mut salt);
        let salt_b64 = general_purpose::STANDARD.encode(salt);
        let k = Self::derive_key(&pass, &salt_b64)?;
        let cipher = ChaCha20Poly1305::new(&k);
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = chacha20poly1305::Nonce::from(nonce_bytes);
        let ct = cipher
            .encrypt(&nonce, key)
            .map_err(|e| anyhow!("encrypt failed: {e}"))?;
        let blob = SealBlob {
            v: 1,
            kdf: "argon2id".into(),
            cipher: "chacha20poly1305".into(),
            salt: salt_b64,
            nonce: general_purpose::STANDARD.encode(nonce),
            ct: general_purpose::STANDARD.encode(&ct),
        };
        let json = serde_json::to_vec_pretty(&blob)?;
        fs::write(&path, json).context("write sealed keystore failed")?;
        self.write_proof(&path);
        Ok(())
    }
}

/// Passphrase prompt helper: uses env if present, else interactive TTY prompt.
pub fn prompt_passphrase() -> Result<String> {
    if let Ok(p) = std::env::var("DYT_KEYSTORE_PASSPHRASE") {
        if !p.is_empty() {
            return Ok(p);
        }
    }
    // Try to use rpassword for a masked prompt; fallback to stdin
    // Prompt (masked); if prompt fails (non-tty), instruct to set env
    let pass = rpassword::prompt_password("Enter keystore passphrase: ")
        .map_err(|_| anyhow!("keystore passphrase not provided; set DYT_KEYSTORE_PASSPHRASE for non-interactive startup"))?;
    Ok(pass)
}
