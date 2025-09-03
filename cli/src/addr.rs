use blake3::Hasher;
use ripemd::{Digest as RipemdDigest, Ripemd160};
use sha2::Sha256;
use sha3::Sha3_256;

// Legacy address derivation for existing wallets (Blake3-based)
// Format: dyt1 + hex( blake3("dyt.addr.v1" || pk) )[0..38] (19 bytes) + 4 hex chars checksum (sha3 over body)
pub fn legacy_address_from_pk(pk: &[u8]) -> String {
    let mut h = Hasher::new();
    h.update(b"dyt.addr.v1");
    h.update(pk);
    let full = h.finalize();
    let body_bytes = &full.as_bytes()[..20]; // 20 bytes -> 40 hex chars
    let body_hex = hex::encode(body_bytes);
    let mut cs_hasher = Sha3_256::new();
    cs_hasher.update(body_bytes);
    let cs = cs_hasher.finalize();
    let checksum = hex::encode(&cs[..2]);
    format!("dyt1{body_hex}{checksum}")
}

// New PQC address derivation using bech32 format
// Format: bech32("dytallix", ripemd160(sha256(pubkey_raw)))
pub fn address_from_pk(pk: &[u8]) -> String {
    pqc_address_from_pk(pk)
}

// PQC address derivation following the specification
// address = bech32("dytallix", ripemd160(sha256(pubkey_raw)))
pub fn pqc_address_from_pk(pk: &[u8]) -> String {
    // Step 1: SHA256 hash of public key
    let mut sha256_hasher = Sha256::new();
    sha256_hasher.update(pk);
    let sha256_hash = sha256_hasher.finalize();

    // Step 2: RIPEMD160 hash of SHA256 result
    let mut ripemd_hasher = Ripemd160::new();
    ripemd_hasher.update(sha256_hash);
    let ripemd_hash = ripemd_hasher.finalize();

    // Step 3: Encode with bech32 using "dytallix" prefix
    // For now using simplified encoding until we add bech32 library
    format!("dytallix{}", hex::encode(ripemd_hash))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_legacy_addr_len() {
        let pk = [7u8; 64];
        let addr = legacy_address_from_pk(&pk);
        assert!(addr.starts_with("dyt1"));
        assert_eq!(addr.len(), 48);
    }

    #[test]
    fn test_pqc_addr_format() {
        let pk = [7u8; 64];
        let addr = pqc_address_from_pk(&pk);
        assert!(addr.starts_with("dytallix"));
        assert_eq!(addr.len(), "dytallix".len() + 40); // prefix + 20 bytes hex encoded
    }

    #[test]
    fn test_addr_deterministic() {
        let pk = [1u8; 32];
        let addr1 = address_from_pk(&pk);
        let addr2 = address_from_pk(&pk);
        assert_eq!(addr1, addr2);
    }

    #[test]
    fn test_different_keys_different_addresses() {
        let pk1 = [1u8; 32];
        let pk2 = [2u8; 32];
        let addr1 = address_from_pk(&pk1);
        let addr2 = address_from_pk(&pk2);
        assert_ne!(addr1, addr2);
    }
}
