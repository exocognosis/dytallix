// Dytallix Passphrase Input Demo
//
// Updated: Argon2id KDF 32-byte derivation (no raw hash preview), retry loop, optional CI no-confirm.
// Run with: cargo run --example passphrase_input_demo

use argon2::{Algorithm, Argon2, Params, Version};
use rand::{rngs::OsRng, RngCore};
use std::io::{self, Write};
use tracing::{error, info, warn};
use zeroize::Zeroize; // memory cleanse

fn init_tracing() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .compact()
        .try_init();
}

fn read_passphrase(hidden: bool, prompt: &str) -> io::Result<String> {
    if hidden {
        match rpassword::prompt_password(prompt) {
            Ok(p) => return Ok(p),
            Err(_) => {
                eprintln!("(Hidden input unavailable, falling back to visible echo)");
            }
        }
    }
    print!("{}", prompt);
    io::stdout().flush()?;
    let mut buf = String::new();
    io::stdin().read_line(&mut buf)?;
    Ok(buf.trim_end().to_string())
}

fn derive_argon2id(pass: &str, salt: &[u8]) -> [u8; 32] {
    let params = Params::new(19456, 2, 1, Some(32)).expect("params");
    let mut out = [0u8; 32];
    let a2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    a2.hash_password_into(pass.as_bytes(), salt, &mut out)
        .expect("argon2");
    out
}

fn main() {
    init_tracing();
    println!("Passphrase Demo (Argon2id)");
    let hidden = std::env::var("HIDE").map(|v| v != "0").unwrap_or(true);
    let max_retries: u8 = std::env::var("DYT_PASSPHRASE_MAX_RETRIES")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(3);
    let backoff_ms: u64 = std::env::var("DYT_PASSPHRASE_BACKOFF_MS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(400);
    let ci_no_confirm = std::env::var("DYT_CI_NO_CONFIRM")
        .ok()
        .map(|v| v == "1" || v.to_lowercase() == "true")
        .unwrap_or(false);

    let mut attempt: u8 = 0;
    let final_pass = loop {
        attempt += 1;
        let mut pass = match read_passphrase(hidden, "Enter passphrase: ") {
            Ok(p) => p,
            Err(e) => {
                error!("error=read_passphrase {e}");
                return;
            }
        };
        if !ci_no_confirm {
            let confirm = match read_passphrase(hidden, "Confirm passphrase: ") {
                Ok(p) => p,
                Err(e) => {
                    error!("error=read_confirm {e}");
                    pass.zeroize();
                    return;
                }
            };
            if confirm != pass {
                warn!(
                    "event=passphrase_mismatch attempt={} max={} ",
                    attempt, max_retries
                );
                let mut c = confirm;
                c.zeroize();
                pass.zeroize();
                if attempt >= max_retries {
                    error!("event=passphrase_retry_exhausted");
                    return;
                }
                std::thread::sleep(std::time::Duration::from_millis(backoff_ms));
                continue;
            } else {
                let mut c = confirm;
                c.zeroize();
            }
        }
        break pass;
    };

    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    let mut key = derive_argon2id(&final_pass, &salt);
    info!("event=derived_key len=32");
    // Do not print key material; show salt for deterministic test if desired
    println!(
        "Derived 32-byte key via Argon2id (salt len {} bytes)",
        salt.len()
    );

    // Zeroize sensitive data
    let mut fp = final_pass;
    fp.zeroize();
    key.zeroize();
    salt.zeroize();
}
