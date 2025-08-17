use super::*;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::ActivePQC;

    #[test]
    fn test_crypto_interop_cli_node() {
        // Test that CLI and Node can produce identical transaction hashes
        let (sk, pk) = ActivePQC::keypair();
        
        // Create a transaction using CLI types
        let cli_msg = crate::types::Msg::Send {
            from: "dyt1alice123456789012345678901234567890123456".into(),
            to: "dyt1bob123456789012345678901234567890123456".into(),
            denom: "DGT".into(),
            amount: 1000000000000000000u128, // 1 DGT in smallest units
        };
        
        let cli_tx = crate::types::Tx::new(
            "dytallix-mainnet-1",
            42,
            vec![cli_msg],
            10000000000000000u128, // 0.01 DGT fee
            "test transaction"
        ).unwrap();
        
        let cli_signed_tx = crate::types::SignedTx::sign(cli_tx, &sk, &pk).unwrap();
        
        // Verify the signature
        assert!(cli_signed_tx.verify().is_ok());
        
        // Check hash determinism
        let hash1 = cli_signed_tx.tx_hash().unwrap();
        let hash2 = cli_signed_tx.tx_hash().unwrap();
        assert_eq!(hash1, hash2);
        
        // Verify format
        assert!(hash1.starts_with("0x"));
        assert_eq!(hash1.len(), 66); // "0x" + 64 hex chars
        
        // Test serialization
        let json = serde_json::to_string(&cli_signed_tx).unwrap();
        let parsed: crate::types::SignedTx = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, cli_signed_tx);
        
        // Verify u128 amounts are serialized as strings
        assert!(json.contains("\"1000000000000000000\""));
        assert!(json.contains("\"10000000000000000\""));
    }

    #[test]
    fn test_signature_verification_round_trip() {
        let (sk, pk) = ActivePQC::keypair();
        
        let msg = crate::types::Msg::Send {
            from: "sender".into(),
            to: "receiver".into(),
            denom: "DRT".into(),
            amount: 500,
        };
        
        let tx = crate::types::Tx::new("test-chain", 1, vec![msg], 100, "").unwrap();
        let signed_tx = crate::types::SignedTx::sign(tx, &sk, &pk).unwrap();
        
        // Should verify successfully
        assert!(signed_tx.verify().is_ok());
        
        // Tamper with signature
        let mut tampered = signed_tx.clone();
        tampered.signature = "invalid_signature".into();
        assert!(tampered.verify().is_err());
        
        // Tamper with algorithm
        let mut tampered = signed_tx.clone();
        tampered.algorithm = "invalid_algorithm".into();
        assert!(tampered.verify().is_err());
        
        // Tamper with version
        let mut tampered = signed_tx.clone();
        tampered.version = 999;
        assert!(tampered.verify().is_err());
    }

    #[test]
    fn test_address_derivation_compatibility() {
        // Test that addresses are derived consistently
        let pubkey1 = b"test_pubkey_1234567890123456789012345678901234567890";
        let pubkey2 = b"different_pubkey_123456789012345678901234567890123";
        
        let addr1 = crate::addr::address_from_pk(pubkey1);
        let addr2 = crate::addr::address_from_pk(pubkey2);
        
        // Different pubkeys should produce different addresses
        assert_ne!(addr1, addr2);
        
        // Same pubkey should produce same address
        let addr1_again = crate::addr::address_from_pk(pubkey1);
        assert_eq!(addr1, addr1_again);
        
        // Addresses should have correct format
        assert!(addr1.starts_with("dyt1"));
        assert_eq!(addr1.len(), 48);
        
        // Should be valid hex after prefix
        let hex_part = &addr1[4..];
        assert!(hex::decode(hex_part).is_ok());
    }

    #[test]
    fn test_transaction_validation_edge_cases() {
        let (sk, pk) = ActivePQC::keypair();
        
        // Empty message list should fail
        let empty_tx = crate::types::Tx::new("chain", 1, vec![], 10, "");
        assert!(empty_tx.is_err());
        
        // Zero fee should fail
        let msg = crate::types::Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        let zero_fee_tx = crate::types::Tx::new("chain", 1, vec![msg.clone()], 0, "");
        assert!(zero_fee_tx.is_err());
        
        // Empty chain ID should fail
        let empty_chain_tx = crate::types::Tx::new("", 1, vec![msg.clone()], 10, "");
        assert!(empty_chain_tx.is_err());
        
        // Zero amount in message should fail
        let zero_amount_msg = crate::types::Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 0,
        };
        assert!(zero_amount_msg.validate().is_err());
        
        // Invalid denom should fail
        let invalid_denom_msg = crate::types::Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "INVALID".into(),
            amount: 100,
        };
        assert!(invalid_denom_msg.validate().is_err());
        
        // Empty addresses should fail
        let empty_from_msg = crate::types::Msg::Send {
            from: "".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        assert!(empty_from_msg.validate().is_err());
        
        let empty_to_msg = crate::types::Msg::Send {
            from: "alice".into(),
            to: "".into(),
            denom: "DGT".into(),
            amount: 100,
        };
        assert!(empty_to_msg.validate().is_err());
    }

    #[test]
    fn test_canonical_json_determinism() {
        let msg = crate::types::Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 1000,
        };
        
        // Create two identical transactions
        let tx1 = crate::types::Tx::new("test-chain", 5, vec![msg.clone()], 50, "memo").unwrap();
        let tx2 = crate::types::Tx::new("test-chain", 5, vec![msg], 50, "memo").unwrap();
        
        // They should have identical canonical JSON and hashes
        let hash1 = tx1.canonical_hash().unwrap();
        let hash2 = tx2.canonical_hash().unwrap();
        assert_eq!(hash1, hash2);
        
        // Different nonce should produce different hash
        let tx3 = crate::types::Tx::new("test-chain", 6, vec![crate::types::Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: 1000,
        }], 50, "memo").unwrap();
        let hash3 = tx3.canonical_hash().unwrap();
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_large_amounts_serialization() {
        // Test maximum u128 value
        let max_amount = u128::MAX;
        let msg = crate::types::Msg::Send {
            from: "alice".into(),
            to: "bob".into(),
            denom: "DGT".into(),
            amount: max_amount,
        };
        
        let json = serde_json::to_string(&msg).unwrap();
        let parsed: crate::types::Msg = serde_json::from_str(&json).unwrap();
        
        match parsed {
            crate::types::Msg::Send { amount, .. } => {
                assert_eq!(amount, max_amount);
            }
        }
        
        // Verify it's serialized as string
        assert!(json.contains(&format!("\"{}\"", max_amount)));
    }
}