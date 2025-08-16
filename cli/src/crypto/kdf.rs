use anyhow::Result;
use argon2::{Argon2, Algorithm, Version, Params};

/// Derive a 32-byte key using Argon2id with recommended default parameters.
/// Salt must be at least 16 bytes.
pub fn derive_argon2id_32(password: &str, salt: &[u8]) -> Result<[u8;32]> {
    if salt.len() < 8 { anyhow::bail!("salt too short"); }
    let params = Params::new(19_456, 2, 1, Some(32)).map_err(|e| anyhow::anyhow!(e.to_string()))?;
    let a2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut out = [0u8;32];
    a2.hash_password_into(password.as_bytes(), salt, &mut out).map_err(|e| anyhow::anyhow!(e.to_string()))?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn deterministic() {
        let k1 = derive_argon2id_32("password", b"abcdefghijklmnop").unwrap();
        let k2 = derive_argon2id_32("password", b"abcdefghijklmnop").unwrap();
        assert_eq!(k1, k2);
        assert_eq!(k1.len(), 32);
    }
}
