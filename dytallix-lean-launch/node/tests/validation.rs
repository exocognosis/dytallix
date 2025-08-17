use dytallix_lean_node::types::*;
use dytallix_lean_node::crypto::ActivePQC;
use dytallix_lean_node::addr;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_node_validation_errors() {
        // Test ValidationError HTTP status codes
        let chain_error = ValidationError::InvalidChainId {
            expected: "mainnet".into(),
            got: "testnet".into(),
        };
        assert_eq!(chain_error.http_status(), 422);
        assert_eq!(chain_error.error_code(), "INVALID_CHAIN_ID");
        
        let nonce_error = ValidationError::InvalidNonce {
            expected: 5,
            got: 3,
        };
        assert_eq!(nonce_error.http_status(), 409);
        assert_eq!(nonce_error.error_code(), "INVALID_NONCE");
        
        let sig_error = ValidationError::InvalidSignature;
        assert_eq!(sig_error.http_status(), 422);
        assert_eq!(sig_error.error_code(), "INVALID_SIGNATURE");
        
        let funds_error = ValidationError::InsufficientFunds {
            required: 1000,
            available: 500,
        };
        assert_eq!(funds_error.http_status(), 422);
        assert_eq!(funds_error.error_code(), "INSUFFICIENT_FUNDS");
        
        let dup_error = ValidationError::DuplicateTransaction;
        assert_eq!(dup_error.http_status(), 409);
        assert_eq!(dup_error.error_code(), "DUPLICATE_TRANSACTION");
        
        let mempool_error = ValidationError::MempoolFull;
        assert_eq!(mempool_error.http_status(), 503);
        assert_eq!(mempool_error.error_code(), "MEMPOOL_FULL");
    }

    #[test]
    fn test_validation_error_json_format() {
        let nonce_error = ValidationError::InvalidNonce {
            expected: 10,
            got: 8,
        };
        
        let json = nonce_error.to_json();
        assert_eq!(json["error"], "INVALID_NONCE");
        assert_eq!(json["expected"], 10);
        assert_eq!(json["got"], 8);
        assert!(json["message"].as_str().unwrap().contains("expected 10, got 8"));
        
        let funds_error = ValidationError::InsufficientFunds {
            required: 2000,
            available: 1500,
        };
        
        let json = funds_error.to_json();
        assert_eq!(json["error"], "INSUFFICIENT_FUNDS");
        assert_eq!(json["required"], "2000");
        assert_eq!(json["available"], "1500");
    }

    #[test]
    fn test_node_address_derivation() {
        let pubkey = b"test_public_key_12345678901234567890123456789012345678901234567890";
        
        // Test address generation
        let addr1 = addr::get_address(pubkey);
        let addr2 = addr::get_address(pubkey);
        
        // Should be deterministic
        assert_eq!(addr1, addr2);
        
        // Should have correct format
        assert!(addr1.starts_with("dyt1"));
        assert_eq!(addr1.len(), 52); // "dyt1" + 48 hex chars
        
        // Should validate correctly
        assert!(addr::validate_address(&addr1));
        
        // Different pubkey should produce different address
        let different_pubkey = b"different_pubkey_1234567890123456789012345678901234567890123456789";
        let addr3 = addr::get_address(different_pubkey);
        assert_ne!(addr1, addr3);
        assert!(addr::validate_address(&addr3));
    }

    #[test]
    fn test_address_validation_edge_cases() {
        let pubkey = b"test_pubkey_for_validation_12345678901234567890123456789012345678";
        let valid_addr = addr::get_address(pubkey);
        
        // Valid address should pass
        assert!(addr::validate_address(&valid_addr));
        
        // Wrong prefix
        assert!(!addr::validate_address("btc1e1c820e653bb12629306be2af671e2aab83074cdf6193cf6"));
        
        // Wrong length - too short
        assert!(!addr::validate_address("dyt1e1c820e653bb12629306be2af671e2aab83074cdf6193c"));
        
        // Wrong length - too long
        assert!(!addr::validate_address("dyt1e1c820e653bb12629306be2af671e2aab83074cdf6193cf6extra"));
        
        // Invalid hex characters
        assert!(!addr::validate_address("dyt1g1c820e653bb12629306be2af671e2aab83074cdf6193cf6"));
        
        // Corrupted checksum - change last character
        let mut corrupted = valid_addr.clone();
        corrupted.pop();
        corrupted.push(if valid_addr.ends_with('0') { '1' } else { '0' });
        assert!(!addr::validate_address(&corrupted));
        
        // Empty string
        assert!(!addr::validate_address(""));
        
        // Only prefix
        assert!(!addr::validate_address("dyt1"));
    }

    #[test]
    fn test_node_signed_tx_validation() {
        let (sk, pk) = ActivePQC::keypair();
        
        let msg = Msg::Send {
            from: "dyt1alice123456789012345678901234567890123456".into(),
            to: "dyt1bob123456789012345678901234567890123456".into(),
            denom: "DGT".into(),
            amount: 1000,
        };
        
        let tx = Tx::new("test-chain", 42, vec![msg], 50, "test memo").unwrap();
        let signed_tx = SignedTx::sign(tx, &sk, &pk).unwrap();
        
        // Should verify successfully
        assert!(signed_tx.verify().is_ok());
        
        // Should get first from address
        assert_eq!(signed_tx.first_from_address().unwrap(), "dyt1alice123456789012345678901234567890123456");
        
        // Should generate consistent hash
        let hash1 = signed_tx.tx_hash().unwrap();
        let hash2 = signed_tx.tx_hash().unwrap();
        assert_eq!(hash1, hash2);
        assert!(hash1.starts_with("0x"));
    }

    #[test]
    fn test_tx_validation_with_chain_id() {
        let msg = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        
        let tx = Tx::new("mainnet", 1, vec![msg], 10, "").unwrap();
        
        // Should validate with correct chain ID
        assert!(tx.validate("mainnet").is_ok());
        
        // Should fail with wrong chain ID
        assert!(tx.validate("testnet").is_err());
        
        // Should fail with empty chain ID
        assert!(tx.validate("").is_err());
    }

    #[test]
    fn test_msg_address_extraction() {
        let msg = Msg::Send {
            from: "sender_address".into(),
            to: "receiver_address".into(),
            denom: "DRT".into(),
            amount: 500,
        };
        
        assert_eq!(msg.from_address(), "sender_address");
    }

    #[test]
    fn test_u128_string_serialization_node() {
        let msg = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 18446744073709551615u128, // Large number
        };
        
        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"18446744073709551615\""));
        
        let parsed: Msg = serde_json::from_str(&json).unwrap();
        match parsed {
            Msg::Send { amount, .. } => assert_eq!(amount, 18446744073709551615u128),
        }
    }

    #[test] 
    fn test_tx_fee_validation() {
        let msg = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        
        // Zero fee should be rejected
        let tx_result = Tx::new("chain", 1, vec![msg.clone()], 0, "");
        assert!(tx_result.is_err());
        
        // Non-zero fee should work
        let tx_result = Tx::new("chain", 1, vec![msg], 1, "");
        assert!(tx_result.is_ok());
    }

    #[test]
    fn test_algorithm_version_validation() {
        let (sk, pk) = ActivePQC::keypair();
        
        let msg = Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        
        let tx = Tx::new("chain", 1, vec![msg], 10, "").unwrap();
        let mut signed_tx = SignedTx::sign(tx, &sk, &pk).unwrap();
        
        // Valid signature should verify
        assert!(signed_tx.verify().is_ok());
        
        // Wrong algorithm should fail
        signed_tx.algorithm = "wrong_algorithm".into();
        assert!(signed_tx.verify().is_err());
        
        // Reset algorithm, wrong version should fail
        signed_tx.algorithm = ActivePQC::ALG.to_string();
        signed_tx.version = 999;
        assert!(signed_tx.verify().is_err());
    }
}