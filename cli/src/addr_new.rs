use sha2::{Sha256, Digest};
use ripemd::Ripemd160;
use bech32::{encode, Variant};
use anyhow::Result;

// Original Blake3-based address derivation for backwards compatibility
use blake3::Hasher;
use sha3::{Digest as Sha3Digest, Sha3_256};

/// Derive canonical address from public key bytes using Blake3 + SHA3 (legacy format).
/// Format: dyt1 + hex( blake3("dyt.addr.v1" || pk) )[0..38] (19 bytes) + 4 hex chars checksum (sha3 over body)
/// Total length: 4 prefix chars + 40 body + 4 checksum = 48.
pub fn address_from_pk(pk: &[u8]) -> String {
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
    format!("dyt1{}{}", body_hex, checksum)
}

/// Derive address from public key using bech32 format as specified in requirements
/// Format: bech32("dytallix", ripemd160(sha256(pubkey_raw)))
pub fn derive_pqc_address(public_key: &[u8]) -> Result<String> {
    // SHA256 hash of public key
    let mut sha256_hasher = Sha256::new();
    sha256_hasher.update(public_key);
    let sha256_hash = sha256_hasher.finalize();
    
    // RIPEMD160 hash of SHA256 hash
    let mut ripemd_hasher = Ripemd160::new();
    ripemd_hasher.update(&sha256_hash);
    let ripemd_hash = ripemd_hasher.finalize();
    
    // Encode as bech32 with "dytallix" prefix
    let address = encode("dytallix", ripemd_hash.to_base32(), Variant::Bech32)
        .map_err(|e| anyhow::anyhow!("Bech32 encoding failed: {}", e))?;
    
    Ok(address)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_legacy_addr_len() {
        let pk = [7u8; 64];
        let addr = address_from_pk(&pk);
        assert!(addr.starts_with("dyt1"));
        assert_eq!(addr.len(), 48);
    }
    
    #[test]
    fn test_pqc_address_format() {
        let public_key = b"test_public_key_data";
        let address = derive_pqc_address(public_key).unwrap();
        
        // Should start with "dytallix1" (bech32 with "dytallix" prefix)
        assert!(address.starts_with("dytallix1"));
        
        // Same public key should always produce same address
        let address2 = derive_pqc_address(public_key).unwrap();
        assert_eq!(address, address2);
        
        // Different public key should produce different address
        let address3 = derive_pqc_address(b"different_key").unwrap();
        assert_ne!(address, address3);
    }
    
    #[test]
    fn test_pqc_address_deterministic() {
        let pk1 = [1u8; 32];
        let pk2 = [2u8; 32];
        
        let addr1a = derive_pqc_address(&pk1).unwrap();
        let addr1b = derive_pqc_address(&pk1).unwrap();
        let addr2 = derive_pqc_address(&pk2).unwrap();
        
        // Same key should produce same address
        assert_eq!(addr1a, addr1b);
        // Different keys should produce different addresses
        assert_ne!(addr1a, addr2);
    }
}