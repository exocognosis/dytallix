//! Tests for PQC signature verification in mempool

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::{ActivePQC, PQC};
    use crate::storage::tx::Transaction;
    use base64::{engine::general_purpose::STANDARD as B64, Engine};

    #[test]
    fn test_verify_envelope_valid_signature() {
        // Generate test keypair
        let (sk, pk) = ActivePQC::keypair();

        // Create test transaction
        let mut tx = Transaction::with_pqc(
            "test_hash".to_string(),
            "dyt1alice".to_string(),
            "dyt1bob".to_string(),
            1000000,                        // 1 DYT
            1000,                           // fee
            42,                             // nonce
            None,                           // signature (to be set)
            None,                           // public key (to be set)
            "dytallix-testnet".to_string(), // chain_id
            "test memo".to_string(),        // memo
            21000,                          // gas_limit
            1000,                           // gas_price
        );

        // Sign the transaction
        let canonical_tx = tx.canonical_fields();
        let tx_bytes = canonical_json(&canonical_tx).unwrap();
        let tx_hash = sha3_256(&tx_bytes);
        let signature = ActivePQC::sign(&sk, &tx_hash);

        // Set signature and public key
        tx.signature = Some(B64.encode(&signature));
        tx.public_key = Some(B64.encode(&pk));

        // Verify signature
        assert!(
            verify_envelope(&tx),
            "Valid signature should pass verification"
        );
    }

    #[test]
    fn test_verify_envelope_invalid_signature() {
        // Generate test keypair
        let (sk, pk) = ActivePQC::keypair();

        // Create test transaction
        let mut tx = Transaction::with_pqc(
            "test_hash".to_string(),
            "dyt1alice".to_string(),
            "dyt1bob".to_string(),
            1000000,                        // 1 DYT
            1000,                           // fee
            42,                             // nonce
            None,                           // signature (to be set)
            None,                           // public key (to be set)
            "dytallix-testnet".to_string(), // chain_id
            "test memo".to_string(),        // memo
            21000,                          // gas_limit
            1000,                           // gas_price
        );

        // Sign the transaction
        let canonical_tx = tx.canonical_fields();
        let tx_bytes = canonical_json(&canonical_tx).unwrap();
        let tx_hash = sha3_256(&tx_bytes);
        let mut signature = ActivePQC::sign(&sk, &tx_hash);

        // Tamper with signature (mutate one byte)
        if !signature.is_empty() {
            signature[0] ^= 0x01;
        }

        // Set tampered signature and public key
        tx.signature = Some(B64.encode(&signature));
        tx.public_key = Some(B64.encode(&pk));

        // Verify signature
        assert!(
            !verify_envelope(&tx),
            "Tampered signature should fail verification"
        );
    }

    #[test]
    fn test_verify_envelope_missing_signature() {
        // Create test transaction without signature
        let tx = Transaction::with_pqc(
            "test_hash".to_string(),
            "dyt1alice".to_string(),
            "dyt1bob".to_string(),
            1000000,                        // 1 DYT
            1000,                           // fee
            42,                             // nonce
            None,                           // no signature
            None,                           // no public key
            "dytallix-testnet".to_string(), // chain_id
            "test memo".to_string(),        // memo
            21000,                          // gas_limit
            1000,                           // gas_price
        );

        // Verify should fail
        assert!(
            !verify_envelope(&tx),
            "Transaction without signature should fail verification"
        );
    }

    #[test]
    fn test_mempool_rejects_invalid_signature() {
        use crate::state::State;

        // Create test state and mempool
        let state = State::new();
        let mut mempool = Mempool::new();

        // Create transaction with invalid signature
        let tx = Transaction::with_pqc(
            "test_hash".to_string(),
            "dyt1alice".to_string(),
            "dyt1bob".to_string(),
            1000000,                                // 1 DYT
            1000,                                   // fee
            42,                                     // nonce
            Some("invalid_signature".to_string()),  // invalid signature
            Some("invalid_public_key".to_string()), // invalid public key
            "dytallix-testnet".to_string(),         // chain_id
            "test memo".to_string(),                // memo
            21000,                                  // gas_limit
            1000,                                   // gas_price
        );

        // Attempt to add transaction should fail with InvalidSignature
        match mempool.add_transaction(&state, tx) {
            Err(RejectionReason::InvalidSignature) => {
                // Expected result
                assert_eq!(
                    RejectionReason::InvalidSignature.to_string(),
                    TX_INVALID_SIG
                );
            }
            _ => panic!("Expected InvalidSignature rejection"),
        }
    }
}
