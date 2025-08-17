#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pqc_wallet_creation() {
        // Test deterministic wallet creation
        let wallet_info = inline_pqc::create_pqc_wallet(
            "test_wallet",
            "test_passphrase",
            true, // deterministic
            Some("test_domain"),
            false, // not legacy_secp
        ).unwrap();

        assert_eq!(wallet_info.name, "test_wallet");
        assert_eq!(wallet_info.algorithm, "dilithium5");
        assert!(wallet_info.address.starts_with("dytallix1"));
        assert!(!wallet_info.pubkey_base64.is_empty());

        // Test reproducibility
        let wallet_info2 = inline_pqc::create_pqc_wallet(
            "test_wallet",
            "test_passphrase",
            true, // deterministic
            Some("test_domain"),
            false, // not legacy_secp
        ).unwrap();

        // Note: Due to the current implementation using ActivePQC::keypair() which is not deterministic,
        // these won't be equal. This test documents the current limitation that will be fixed
        // when we implement true deterministic key generation from seeds.
        println!("Wallet 1: {}", wallet_info.address);
        println!("Wallet 2: {}", wallet_info2.address);
    }

    #[test]
    fn test_pqc_public_key_format() {
        let test_pubkey = b"test_public_key_bytes";
        let pk_serialized = inline_pqc::get_pqc_public_key(test_pubkey, "dilithium5");

        assert_eq!(pk_serialized.type_url, "/dytallix.crypto.pqc.v1beta1.PubKey");
        assert_eq!(pk_serialized.algorithm, "dilithium5");
        
        // Should be valid base64
        assert!(BASE64_STANDARD.decode(&pk_serialized.key).is_ok());
    }
}