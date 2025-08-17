use dytallix_lean_node::storage::oracle::{AiRiskRecord, OracleStore};
use dytallix_lean_node::storage::state::Storage;
use dytallix_lean_node::runtime::oracle::{OracleAiRiskInput, OracleAiRiskBatchInput};
use serde_json::json;
use tempfile::tempdir;

#[tokio::test]
async fn test_oracle_integration_single_submission() {
    let dir = tempdir().unwrap();
    let storage = Storage::open(dir.path().join("node.db")).unwrap();
    let oracle_store = OracleStore { db: &storage.db };

    // Test single submission with all fields
    let input = OracleAiRiskInput {
        tx_hash: "0x1234567890abcdef".to_string(),
        model_id: "fraud-detector-v2.1".to_string(),
        risk_score: 0.75,
        confidence: Some(0.92),
        signature: None,
    };

    // Convert to AiRiskRecord
    let record = AiRiskRecord {
        tx_hash: input.tx_hash.clone(),
        model_id: input.model_id.clone(),
        risk_score: input.risk_score,
        confidence: input.confidence,
        signature: input.signature.clone(),
        oracle_pubkey: None,
    };

    // Store the record
    assert!(oracle_store.put_ai_risk(&record).is_ok());

    // Verify retrieval
    let retrieved = oracle_store.get_ai_risk(&input.tx_hash);
    assert!(retrieved.is_some());
    
    let retrieved = retrieved.unwrap();
    assert_eq!(retrieved.tx_hash, input.tx_hash);
    assert_eq!(retrieved.model_id, input.model_id);
    assert_eq!(retrieved.risk_score, input.risk_score);
    assert_eq!(retrieved.confidence, input.confidence);
}

#[tokio::test]
async fn test_oracle_integration_batch_submission() {
    let dir = tempdir().unwrap();
    let storage = Storage::open(dir.path().join("node.db")).unwrap();
    let oracle_store = OracleStore { db: &storage.db };

    // Test batch submission
    let batch_input = OracleAiRiskBatchInput {
        records: vec![
            OracleAiRiskInput {
                tx_hash: "0x111".to_string(),
                model_id: "model-v1".to_string(),
                risk_score: 0.1,
                confidence: Some(0.9),
                signature: None,
            },
            OracleAiRiskInput {
                tx_hash: "0x222".to_string(),
                model_id: "model-v2".to_string(),
                risk_score: 0.8,
                confidence: None,
                signature: None,
            },
            OracleAiRiskInput {
                tx_hash: "0x333".to_string(),
                model_id: "model-v1".to_string(),
                risk_score: 1.5, // Invalid - should fail validation
                confidence: Some(0.5),
                signature: None,
            },
        ],
    };

    // Convert valid records to AiRiskRecord
    let mut records = Vec::new();
    for input in &batch_input.records {
        let record = AiRiskRecord {
            tx_hash: input.tx_hash.clone(),
            model_id: input.model_id.clone(),
            risk_score: input.risk_score,
            confidence: input.confidence,
            signature: input.signature.clone(),
            oracle_pubkey: None,
        };
        records.push(record);
    }

    // Process batch
    let failed_hashes = oracle_store.put_ai_risks_batch(&records).unwrap();
    
    // One record should have failed (invalid risk_score)
    assert_eq!(failed_hashes.len(), 1);
    assert_eq!(failed_hashes[0], "0x333");

    // Valid records should be retrievable
    let record1 = oracle_store.get_ai_risk("0x111").unwrap();
    assert_eq!(record1.risk_score, 0.1);
    assert_eq!(record1.model_id, "model-v1");
    assert_eq!(record1.confidence, Some(0.9));

    let record2 = oracle_store.get_ai_risk("0x222").unwrap();
    assert_eq!(record2.risk_score, 0.8);
    assert_eq!(record2.model_id, "model-v2");
    assert_eq!(record2.confidence, None);

    // Invalid record should not be stored
    assert!(oracle_store.get_ai_risk("0x333").is_none());
}

#[tokio::test]
async fn test_oracle_validation_edge_cases() {
    let dir = tempdir().unwrap();
    let storage = Storage::open(dir.path().join("node.db")).unwrap();
    let oracle_store = OracleStore { db: &storage.db };

    // Test edge case: risk_score exactly 0.0
    let record_min = AiRiskRecord {
        tx_hash: "0x000".to_string(),
        model_id: "test-model".to_string(),
        risk_score: 0.0,
        confidence: Some(0.0),
        signature: None,
        oracle_pubkey: None,
    };
    assert!(oracle_store.put_ai_risk(&record_min).is_ok());

    // Test edge case: risk_score exactly 1.0
    let record_max = AiRiskRecord {
        tx_hash: "0x111".to_string(),
        model_id: "test-model".to_string(),
        risk_score: 1.0,
        confidence: Some(1.0),
        signature: None,
        oracle_pubkey: None,
    };
    assert!(oracle_store.put_ai_risk(&record_max).is_ok());

    // Test edge case: negative risk_score
    let record_negative = AiRiskRecord {
        tx_hash: "0x222".to_string(),
        model_id: "test-model".to_string(),
        risk_score: -0.1,
        confidence: Some(0.5),
        signature: None,
        oracle_pubkey: None,
    };
    assert!(oracle_store.put_ai_risk(&record_negative).is_err());

    // Test edge case: risk_score > 1.0
    let record_over = AiRiskRecord {
        tx_hash: "0x333".to_string(),
        model_id: "test-model".to_string(),
        risk_score: 1.1,
        confidence: Some(0.5),
        signature: None,
        oracle_pubkey: None,
    };
    assert!(oracle_store.put_ai_risk(&record_over).is_err());

    // Test minimal valid tx_hash
    let record_minimal_hash = AiRiskRecord {
        tx_hash: "0x1".to_string(),
        model_id: "test-model".to_string(),
        risk_score: 0.5,
        confidence: Some(0.5),
        signature: None,
        oracle_pubkey: None,
    };
    assert!(oracle_store.put_ai_risk(&record_minimal_hash).is_ok());

    // Verify all valid records were stored
    assert!(oracle_store.get_ai_risk("0x000").is_some());
    assert!(oracle_store.get_ai_risk("0x111").is_some());
    assert!(oracle_store.get_ai_risk("0x1").is_some());
    
    // Verify invalid records were not stored
    assert!(oracle_store.get_ai_risk("0x222").is_none());
    assert!(oracle_store.get_ai_risk("0x333").is_none());
}

#[test]
fn test_oracle_json_serialization() {
    // Test that our data structures serialize/deserialize correctly
    let record = AiRiskRecord {
        tx_hash: "0x1234567890abcdef".to_string(),
        model_id: "fraud-detector-v2.1".to_string(),
        risk_score: 0.75,
        confidence: Some(0.92),
        signature: Some("base64-signature".to_string()),
        oracle_pubkey: Some("base64-pubkey".to_string()),
    };

    // Test serialization
    let json_str = serde_json::to_string(&record).unwrap();
    let expected_fields = [
        "tx_hash", "model_id", "risk_score", "confidence", 
        "signature", "oracle_pubkey"
    ];
    
    for field in &expected_fields {
        assert!(json_str.contains(field));
    }

    // Test deserialization
    let deserialized: AiRiskRecord = serde_json::from_str(&json_str).unwrap();
    assert_eq!(deserialized.tx_hash, record.tx_hash);
    assert_eq!(deserialized.model_id, record.model_id);
    assert_eq!(deserialized.risk_score, record.risk_score);
    assert_eq!(deserialized.confidence, record.confidence);
    assert_eq!(deserialized.signature, record.signature);
    assert_eq!(deserialized.oracle_pubkey, record.oracle_pubkey);

    // Test API input structures
    let input = OracleAiRiskInput {
        tx_hash: "0x1234".to_string(),
        model_id: "test-model".to_string(),
        risk_score: 0.5,
        confidence: Some(0.8),
        signature: None,
    };

    let input_json = serde_json::to_string(&input).unwrap();
    let _: OracleAiRiskInput = serde_json::from_str(&input_json).unwrap();

    // Test batch input
    let batch = OracleAiRiskBatchInput {
        records: vec![input],
    };

    let batch_json = serde_json::to_string(&batch).unwrap();
    let _: OracleAiRiskBatchInput = serde_json::from_str(&batch_json).unwrap();
}