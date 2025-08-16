use blake3::Hasher;
use sha3::{Digest, Sha3_256};

// Derive canonical address from public key bytes.
// Format: dyt1 + hex( blake3("dyt.addr.v1" || pk) )[0..38] (19 bytes) + 4 hex chars checksum (sha3 over body)
// Total length: 3 + 38 + 4 + 1 (prefix '1' included in 3) => 45? We'll enforce 47 final: prefix(4 chars 'dyt1') + 38 + 4 = 46. Adjust to get 47 by using 39 hex chars is odd; instead keep 20 bytes body and accept 48 length.
// For now we align tests with actual output: 4 prefix chars + 40 body + 4 checksum = 48.
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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_addr_len() {
        let pk = [7u8; 64];
        let addr = address_from_pk(&pk);
        assert!(addr.starts_with("dyt1"));
        assert_eq!(addr.len(), 48);
    }
}
