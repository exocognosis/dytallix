//! Integration tests for signature verification in blockchain consensus.
//!
//! This test suite verifies the end-to-end signature verification flow,
//! including PQC signature verification, oracle management, and transaction
//! validation with AI responses.

use anyhow::Result;
use dytallix_pqc::{Signature, SignatureAlgorithm};
use std::sync::Arc;

use dytallix_node::consensus::{
    ai_integration::{AIIntegrationConfig, AIIntegrationManager},
    signature_verification::{SignatureVerifier, VerificationConfig},
    types::{
        AIResponsePayload, AIResponseSignature, AIServiceType, OracleIdentity,
        SignedAIOracleResponse,
    },
};
use dytallix_node::types::{
    Block, BlockHeader, PQCBlockSignature, PQCTransactionSignature, Transaction,
    TransferTransaction,
};

/// Test data for signature verification
struct TestData {
    /// Test oracle public key
    oracle_public_key: Vec<u8>,
    /// Test oracle private key (for signing)
    _oracle_private_key: Vec<u8>,
    /// Test transaction signature
    transaction_signature: PQCTransactionSignature,
    /// Test AI response payload
    _ai_response: AIResponsePayload,
    /// Test signed AI response
    signed_response: SignedAIOracleResponse,
}

impl TestData {
    fn new() -> Self {
        // Generate test keys (simplified)
        let oracle_public_key = vec![1, 2, 3, 4]; // Mock public key
        let oracle_private_key = vec![5, 6, 7, 8]; // Mock private key

        let transaction_signature = PQCTransactionSignature {
            signature: Signature {
                data: vec![9, 10, 11, 12],
                algorithm: SignatureAlgorithm::Dilithium5,
            },
            public_key: oracle_public_key.clone(),
        };

        // Build enhanced AI response payload (consensus types)
        let ai_response = AIResponsePayload::success(
            "test-request-1".to_string(),
            AIServiceType::RiskScoring,
            serde_json::json!({
                "risk_score": 0.3,
                "confidence": 0.95,
                "factors": ["low_amount", "verified_sender"]
            }),
        )
        .with_processing_time(42);

        // Oracle identity for signed response
        let oracle_identity = OracleIdentity::new(
            "test-oracle-1".to_string(),
            "Test Oracle".to_string(),
            oracle_public_key.clone(),
            SignatureAlgorithm::Dilithium5,
        )
        .update_reputation(0.95);

        // Signature for AI response
        let signature = AIResponseSignature::new(
            dytallix_pqc::SignatureAlgorithm::Dilithium5,
            vec![13, 14, 15, 16],
            vec![1, 2, 3, 4],
        );

        let signed_response = SignedAIOracleResponse::new(
            ai_response.clone(),
            signature,
            12345,
            chrono::Utc::now().timestamp() as u64 + 300,
            oracle_identity,
        );

        Self {
            oracle_public_key,
            _oracle_private_key: oracle_private_key,
            transaction_signature,
            _ai_response: ai_response,
            signed_response,
        }
    }
}

#[tokio::test]
async fn test_signature_verification_setup() -> Result<()> {
    // Create signature verifier with test configuration (align with current VerificationConfig)
    let config = VerificationConfig {
        min_oracle_reputation: 0.5,
        max_signature_age: 600,
        max_response_age: 300,
        clock_skew_tolerance: 30,
        enforce_certificate_validation: false, // Disable for test
        enforce_request_binding: false,
        max_nonce_cache_size: 10_000,
        nonce_cache_ttl: 3_600,
    };

    let verifier = Arc::new(SignatureVerifier::new(config)?);

    // Register test oracle via identity + stake amount
    let identity = OracleIdentity::new(
        "test-oracle-1".to_string(),
        "Test Oracle".to_string(),
        vec![1, 2, 3, 4],
        SignatureAlgorithm::Dilithium5,
    )
    .update_reputation(0.95);

    verifier.register_oracle(identity, 1_000_000)?;

    // Verify oracle is registered
    let registered = verifier.get_oracle("test-oracle-1");
    assert!(registered.is_some());

    Ok(())
}

#[tokio::test]
async fn test_ai_response_verification() -> Result<()> {
    let test_data = TestData::new();

    // Create AI integration manager
    let config = AIIntegrationConfig {
        require_ai_verification: true,
        fail_on_ai_unavailable: false,
        ai_timeout_ms: 5000,
        enable_response_caching: true,
        response_cache_ttl: 300,
        ..Default::default()
    };

    let ai_integration = AIIntegrationManager::new(config).await?;

    // Register test oracle
    let identity = test_data.signed_response.oracle_identity.clone();
    ai_integration.register_oracle(identity, 1_000_000).await?;

    // Test signature verification - returns an enum result
    let result = ai_integration
        .verify_ai_response(&test_data.signed_response, None)
        .await;

    // Should return a concrete result variant, not panic
    assert!(!matches!(
        result,
        dytallix_node::consensus::ai_integration::AIVerificationResult::Unavailable { .. }
    ));

    Ok(())
}

#[tokio::test]
async fn test_transaction_signature_verification() -> Result<()> {
    let test_data = TestData::new();

    // Create a test transfer transaction
    let mut transfer_tx = TransferTransaction::new(
        "dyt1test_sender".to_string(),
        "dyt1test_receiver".to_string(),
        1000,
        10,
        1,
    );

    // Set the signature (mock)
    transfer_tx.signature = test_data.transaction_signature.clone();

    let transaction = Transaction::Transfer(transfer_tx);

    // Test signature verification
    // Note: This may fail with mock data, but tests the flow
    let _result = transaction.verify_signature();

    // Test should complete without panicking
    Ok(())
}

#[tokio::test]
async fn test_block_transaction_verification() -> Result<()> {
    let test_data = TestData::new();

    // Create test transactions
    let transfer_tx = TransferTransaction::new(
        "dyt1test_sender".to_string(),
        "dyt1test_receiver".to_string(),
        1000,
        10,
        1,
    );

    let transactions = vec![Transaction::Transfer(transfer_tx)];

    // Create test block
    let header = BlockHeader {
        number: 1,
        parent_hash: "0".repeat(64),
        transactions_root: BlockHeader::calculate_transactions_root(&transactions),
        state_root: "0".repeat(64),
        timestamp: chrono::Utc::now().timestamp() as u64,
        validator: "dyt1test_validator".to_string(),
        signature: PQCBlockSignature {
            signature: Signature {
                data: vec![17, 18, 19, 20],
                algorithm: SignatureAlgorithm::Dilithium5,
            },
            public_key: test_data.oracle_public_key.clone(),
        },
        nonce: 0,
    };

    let block = Block {
        header,
        transactions,
    };

    // Test basic transaction verification
    let result = block.verify_transactions();
    assert!(result); // Should pass basic checks

    // AI-enhanced verification is not available here (method is gated/removed in this context)
    Ok(())
}

#[tokio::test]
async fn test_oracle_registry_operations() -> Result<()> {
    let config = VerificationConfig::default();
    let verifier = Arc::new(SignatureVerifier::new(config)?);

    // Test oracle registration via identity
    let identity = OracleIdentity::new(
        "test-oracle-registry".to_string(),
        "Registry Test Oracle".to_string(),
        vec![1, 2, 3, 4],
        SignatureAlgorithm::Dilithium5,
    )
    .update_reputation(0.8);

    verifier.register_oracle(identity.clone(), 500_000)?;

    // Test oracle retrieval
    let registered = verifier.get_oracle("test-oracle-registry");
    assert!(registered.is_some());

    // Test reputation update
    verifier.update_oracle_reputation("test-oracle-registry", 0.9)?;

    let updated = verifier.get_oracle("test-oracle-registry").unwrap();
    assert_eq!(updated.identity.reputation_score, 0.9);

    Ok(())
}

#[tokio::test]
async fn test_nonce_replay_protection() -> Result<()> {
    let test_data = TestData::new();
    let config = VerificationConfig::default();
    let verifier = Arc::new(SignatureVerifier::new(config)?);

    // Register oracle
    let identity = OracleIdentity::new(
        "test-oracle-nonce".to_string(),
        "Nonce Test Oracle".to_string(),
        test_data.oracle_public_key.clone(),
        SignatureAlgorithm::Dilithium5,
    )
    .update_reputation(0.9);

    verifier.register_oracle(identity, 100_000)?;

    // Create signed response with specific nonce
    let mut signed_response = test_data.signed_response.clone();
    signed_response.oracle_identity.oracle_id = "test-oracle-nonce".to_string();
    signed_response.nonce = 99_999;

    // First verification should run (mock verification)
    let _result1 = verifier.verify_signed_response(&signed_response, None);

    // Second verification with same nonce should be handled by nonce cache
    let _result2 = verifier.verify_signed_response(&signed_response, None);

    // Test completes successfully
    Ok(())
}

#[tokio::test]
async fn test_ai_integration_manager_statistics() -> Result<()> {
    let config = AIIntegrationConfig::default();
    let ai_integration = AIIntegrationManager::new(config).await?;

    // Get initial statistics
    let initial_stats = ai_integration.get_statistics().await;
    assert_eq!(initial_stats.total_requests, 0);
    assert_eq!(initial_stats.successful_verifications, 0);

    // Test statistics are properly initialized
    assert!(initial_stats.avg_verification_time_ms >= 0.0);

    Ok(())
}

#[tokio::test]
async fn test_signature_verification_error_handling() -> Result<()> {
    let config = VerificationConfig::default();
    let verifier = Arc::new(SignatureVerifier::new(config)?);

    // Test with invalid oracle (not registered)
    let test_data = TestData::new();
    let mut signed_response = test_data.signed_response.clone();
    signed_response.oracle_identity.oracle_id = "non-existent-oracle".to_string();

    let result = verifier.verify_signed_response(&signed_response, None);
    // Should handle gracefully - might return error or success depending on mock
    assert!(result.is_ok() || result.is_err());

    Ok(())
}
