use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose, Engine as _};
use clap::{Args, Subcommand};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tracing::info;

#[derive(Args, Debug, Clone)]
pub struct SecretsCmd {
    #[command(subcommand)]
    pub action: SecretsAction,
}

#[derive(Subcommand, Debug, Clone)]
pub enum SecretsAction {
    /// Rotate validator private key in Vault (if configured) or sealed keystore fallback
    #[command(name = "rotate-validator")]
    RotateValidator {
        /// Validator ID (path key), e.g. val1
        #[arg(long, default_value = "default")]
        validator_id: String,
        /// Length of key material in bytes
        #[arg(long, default_value_t = 64)]
        length: usize,
        /// Optional output file to also write raw key (for offline backup) — DANGER: plaintext!
        #[arg(long, hide = true)]
        backup_plaintext_path: Option<PathBuf>,
    },
}

#[derive(Serialize, Deserialize)]
struct SealBlob {
    v: u8,
    kdf: String,
    cipher: String,
    salt: String,
    nonce: String,
    ct: String,
}

fn keystore_dir() -> String {
    std::env::var("DYT_KEYSTORE_DIR").unwrap_or_else(|_| {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
        format!("{home}/.dytallix/keystore")
    })
}

fn prompt_passphrase() -> Result<String> {
    if let Ok(p) = std::env::var("DYT_KEYSTORE_PASSPHRASE") {
        if !p.is_empty() {
            return Ok(p);
        }
    }
    let pass = rpassword::prompt_password("Enter keystore passphrase: ")
        .map_err(|_| anyhow!(
            "keystore passphrase not provided; set DYT_KEYSTORE_PASSPHRASE for non-interactive usage"
        ))?;
    Ok(pass)
}

fn derive_key(passphrase: &str, salt_b64: &str) -> Result<chacha20poly1305::Key> {
    use argon2::{password_hash::SaltString, Argon2};
    let salt = general_purpose::STANDARD
        .decode(salt_b64)
        .context("invalid salt b64")?;
    let _s = SaltString::encode_b64(&salt).map_err(|e| anyhow!("salt b64 encode: {e}"))?;
    let argon = Argon2::default();
    let mut out = [0u8; 32];
    argon
        .hash_password_into(passphrase.as_bytes(), &salt, &mut out)
        .map_err(|e| anyhow!("argon2 derive failed: {e}"))?;
    Ok(chacha20poly1305::Key::from_slice(&out).to_owned())
}

fn keystore_path_for(id: &str) -> PathBuf {
    let mut p = PathBuf::from(keystore_dir());
    p.push(format!("validator-{id}.seal"));
    p
}

async fn put_vault(validator_id: &str, key: &[u8]) -> Result<()> {
    let base_url = std::env::var("DYTALLIX_VAULT_URL")
        .ok()
        .or_else(|| std::env::var("VAULT_URL").ok())
        .ok_or_else(|| anyhow!("VAULT_URL/DYTALLIX_VAULT_URL not set"))?;
    let token = std::env::var("DYTALLIX_VAULT_TOKEN")
        .ok()
        .or_else(|| std::env::var("VAULT_TOKEN").ok())
        .ok_or_else(|| anyhow!("VAULT_TOKEN/DYTALLIX_VAULT_TOKEN not set"))?;
    let mount = std::env::var("DYTALLIX_VAULT_KV_MOUNT").unwrap_or_else(|_| "secret".to_string());
    let base = std::env::var("DYTALLIX_VAULT_PATH_BASE")
        .unwrap_or_else(|_| "dytallix/validators".to_string());
    let url = format!(
        "{}/v1/{}/data/{}/{}",
        base_url.trim_end_matches('/'),
        mount.trim_matches('/'),
        base.trim_matches('/'),
        validator_id
    );
    #[derive(Serialize)]
    struct VaultWrite<'a> {
        data: VaultData<'a>,
    }
    #[derive(Serialize)]
    struct VaultData<'a> {
        private_key: &'a str,
    }
    let b64 = general_purpose::STANDARD.encode(key);
    let payload = VaultWrite {
        data: VaultData { private_key: &b64 },
    };
    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .header("X-Vault-Token", token)
        .json(&payload)
        .send()
        .await
        .context("vault put request failed")?;
    if !res.status().is_success() {
        return Err(anyhow!("vault put failed: {}", res.status()));
    }
    Ok(())
}

fn put_keystore(validator_id: &str, key: &[u8]) -> Result<PathBuf> {
    use chacha20poly1305::aead::{Aead, KeyInit};
    let pass = prompt_passphrase()?;
    std::fs::create_dir_all(keystore_dir()).ok();

    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    let salt_b64 = general_purpose::STANDARD.encode(salt);
    let k = derive_key(&pass, &salt_b64)?;
    let cipher = chacha20poly1305::ChaCha20Poly1305::new(&k);
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
    let path = keystore_path_for(validator_id);
    std::fs::write(&path, json).context("write sealed keystore failed")?;
    Ok(path)
}

pub async fn run(cmd: SecretsCmd) -> Result<()> {
    match cmd.action {
        SecretsAction::RotateValidator {
            validator_id,
            length,
            backup_plaintext_path,
        } => {
            // Generate new key material (in-memory)
            let mut key = vec![0u8; length];
            OsRng.fill_bytes(&mut key);

            let vault_url_present =
                std::env::var("DYTALLIX_VAULT_URL").is_ok() || std::env::var("VAULT_URL").is_ok();
            let vault_token_present = std::env::var("DYTALLIX_VAULT_TOKEN").is_ok()
                || std::env::var("VAULT_TOKEN").is_ok();

            if vault_url_present && vault_token_present {
                put_vault(&validator_id, &key).await?;
                info!(
                    "event=validator_key_rotated mode=vault validator_id={}",
                    validator_id
                );
                println!(
                    "Rotated validator key via Vault for id={validator_id} ({length} bytes)."
                );
            } else {
                let path = put_keystore(&validator_id, &key)?;
                info!(
                    "event=validator_key_rotated mode=keystore path={} validator_id={}",
                    path.display(),
                    validator_id
                );
                println!(
                    "Rotated validator key in sealed keystore at {} for id={validator_id} ({length} bytes).",
                    path.display(),
                );
            }

            if let Some(bp) = backup_plaintext_path.as_ref() {
                // Very explicit: user asked to write plaintext backup
                std::fs::write(bp, &key)?;
                println!("Wrote plaintext backup to {} (requested).", bp.display());
            }
        }
    }
    Ok(())
}
