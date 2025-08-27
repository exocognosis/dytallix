//! Oracle risk ingestion for Dytallix blockchain runtime
//!
//! This module provides secure, deterministic ingestion of AI risk scores
//! from external oracles with optional cryptographic signature verification.

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use ed25519_dalek::{PublicKey, Signature, Verifier};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// Oracle state trait for key-value operations
pub trait OracleState {
    /// Store oracle risk record by transaction hash
    fn set_oracle_risk(
        &mut self,
        tx_hash: &str,
        record: &AiRiskRecord,
    ) -> Result<(), Box<dyn std::error::Error>>;

    /// Retrieve oracle risk record by transaction hash
    fn get_oracle_risk(&self, tx_hash: &str) -> Option<AiRiskRecord>;
}

/// AI risk record for deterministic storage
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AiRiskRecord {
    pub tx_hash: String,
    pub score_str: String, // Original score string - preserved for determinism
    pub model_id: String,
    pub ingested_at: u64, // Unix timestamp
    pub source: String,   // Oracle source identifier
}

/// Verify Ed25519 signature for oracle data
///
/// # Arguments
/// * `payload` - The data that was signed (formatted as "tx_hash:score_str:model_id")
/// * `signature` - Base64-encoded signature
/// * `pubkey` - Base64-encoded public key
///
/// # Returns
/// `true` if signature is valid, `false` otherwise
pub fn verify_sig(payload: &str, signature: &str, pubkey: &str) -> bool {
    let pk_bytes = match B64.decode(pubkey) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    let sig_bytes = match B64.decode(signature) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    let pk = match PublicKey::from_bytes(&pk_bytes) {
        Ok(key) => key,
        Err(_) => return false,
    };

    let sig = match Signature::from_bytes(&sig_bytes) {
        Ok(signature) => signature,
        Err(_) => return false,
    };

    pk.verify(payload.as_bytes(), &sig).is_ok()
}

/// Apply oracle risk assessment to transaction
///
/// # Arguments
/// * `state` - Mutable oracle state for storage
/// * `tx_hash` - Transaction hash (hex format with 0x prefix)
/// * `score_str` - Original score string (preserved for determinism)
/// * `model_id` - AI model identifier
/// * `ingested_at` - Unix timestamp of ingestion
/// * `source` - Oracle source identifier
///
/// # Returns
/// `Ok(())` on success, error on failure
pub fn apply_oracle_risk<S: OracleState>(
    state: &mut S,
    tx_hash: &str,
    score_str: &str,
    model_id: &str,
    ingested_at: u64,
    source: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    // Validate inputs
    if !tx_hash.starts_with("0x") || tx_hash.len() < 3 {
        return Err("Invalid transaction hash format".into());
    }

    if score_str.trim().is_empty() {
        return Err("Score string cannot be empty".into());
    }

    if model_id.trim().is_empty() {
        return Err("Model ID cannot be empty".into());
    }

    if source.trim().is_empty() {
        return Err("Source cannot be empty".into());
    }

    let record = AiRiskRecord {
        tx_hash: tx_hash.to_string(),
        score_str: score_str.to_string(),
        model_id: model_id.to_string(),
        ingested_at,
        source: source.to_string(),
    };

    state.set_oracle_risk(tx_hash, &record)
}

/// Get oracle risk assessment for transaction
///
/// # Arguments
/// * `state` - Oracle state for lookup
/// * `tx_hash` - Transaction hash to lookup
///
/// # Returns
/// `Some(AiRiskRecord)` if found, `None` otherwise
pub fn get_oracle_risk<S: OracleState>(state: &S, tx_hash: &str) -> Option<AiRiskRecord> {
    state.get_oracle_risk(tx_hash)
}

/// Get current Unix timestamp
pub fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    // Mock implementation of OracleState for testing
    #[derive(Default)]
    struct MockOracleState {
        records: HashMap<String, AiRiskRecord>,
    }

    impl OracleState for MockOracleState {
        fn set_oracle_risk(
            &mut self,
            tx_hash: &str,
            record: &AiRiskRecord,
        ) -> Result<(), Box<dyn std::error::Error>> {
            self.records.insert(tx_hash.to_string(), record.clone());
            Ok(())
        }

        fn get_oracle_risk(&self, tx_hash: &str) -> Option<AiRiskRecord> {
            self.records.get(tx_hash).cloned()
        }
    }

    #[test]
    fn test_apply_and_get_oracle_risk() {
        let mut state = MockOracleState::default();
        let tx_hash = "0x1234567890abcdef";
        let score_str = "0.75";
        let model_id = "risk-v1";
        let timestamp = current_timestamp();
        let source = "oracle-1";

        // Test apply
        let result = apply_oracle_risk(&mut state, tx_hash, score_str, model_id, timestamp, source);
        assert!(result.is_ok());

        // Test get
        let retrieved = get_oracle_risk(&state, tx_hash);
        assert!(retrieved.is_some());

        let record = retrieved.unwrap();
        assert_eq!(record.tx_hash, tx_hash);
        assert_eq!(record.score_str, score_str);
        assert_eq!(record.model_id, model_id);
        assert_eq!(record.ingested_at, timestamp);
        assert_eq!(record.source, source);
    }

    #[test]
    fn test_apply_oracle_risk_validation() {
        let mut state = MockOracleState::default();
        let timestamp = current_timestamp();

        // Test invalid transaction hash
        let result = apply_oracle_risk(&mut state, "invalid", "0.5", "model", timestamp, "source");
        assert!(result.is_err());

        // Test empty score string
        let result = apply_oracle_risk(&mut state, "0x123", "", "model", timestamp, "source");
        assert!(result.is_err());

        // Test empty model ID
        let result = apply_oracle_risk(&mut state, "0x123", "0.5", "", timestamp, "source");
        assert!(result.is_err());

        // Test empty source
        let result = apply_oracle_risk(&mut state, "0x123", "0.5", "model", timestamp, "");
        assert!(result.is_err());
    }

    #[test]
    fn test_verify_sig_with_invalid_inputs() {
        // Test with invalid base64
        assert!(!verify_sig("payload", "invalid_base64", "invalid_base64"));

        // Test with empty inputs
        assert!(!verify_sig("", "", ""));

        // Test with valid base64 but invalid key/signature format
        let invalid_b64 = B64.encode(b"too_short");
        assert!(!verify_sig("payload", &invalid_b64, &invalid_b64));
    }

    #[test]
    fn test_deterministic_score_preservation() {
        let mut state = MockOracleState::default();
        let tx_hash = "0xabcdef";
        let original_score = "0.123456789123456789"; // High precision string
        let model_id = "risk-v1";
        let timestamp = current_timestamp();
        let source = "oracle-1";

        apply_oracle_risk(
            &mut state,
            tx_hash,
            original_score,
            model_id,
            timestamp,
            source,
        )
        .unwrap();

        let record = get_oracle_risk(&state, tx_hash).unwrap();
        // Verify original string is preserved exactly
        assert_eq!(record.score_str, original_score);
    }

    #[test]
    fn test_get_oracle_risk_not_found() {
        let state = MockOracleState::default();
        let result = get_oracle_risk(&state, "0xnonexistent");
        assert!(result.is_none());
    }
}
