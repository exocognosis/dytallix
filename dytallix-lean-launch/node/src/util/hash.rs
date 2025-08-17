use blake3;

// Legacy blake3_tx_hash function - deprecated in favor of canonical SHA3-256 hashing
// Only kept for compatibility with existing tests
#[cfg(feature = "legacy-submit")]
pub fn blake3_tx_hash(data: &[u8]) -> String {
    let h = blake3::hash(data);
    format!("0x{}", hex::encode(h.as_bytes()))
}

// Note: New transaction hashing should use canonical_json + sha3_256 from crypto module
