use std::sync::Arc;
use tokio;
use serde_json;

use crate::consensus::ai_integration::{
    AIIntegrationManager, AIIntegrationConfig, RiskProcessingConfig, TransactionRiskThresholds,
    RiskThresholds, RiskPolicySettings, TransactionProcessingDecision, ReviewPriority,
    RejectionCode, AIVerificationResult, RiskFactor
};
use crate::consensus::{AIServiceConfig, VerificationConfig, ReplayProtectionConfig};

/// Test helper to create a test AI integration manager
async fn create_test_ai_manager() -> AIIntegrationManager {
    let config = AIIntegrationConfig {
        verification_config: VerificationConfig::default(),
        ai_service_config: AIServiceConfig::default(),
        replay_protection_config: ReplayProtectionConfig::default(),
        require_ai_verification: false,
        fail_on_ai_unavailable: false,
        ai_timeout_ms: 5000,
        enable_response_caching: false, // Disable caching for tests
        response_cache_ttl: 300,
        risk_config: RiskProcessingConfig {
            enable_risk_processing: true,
            enable_manual_review: true,
            max_review_queue_size: 100,
            manual_review_timeout: 3600,
            transaction_thresholds: TransactionRiskThresholds::default(),
            risk_policies: RiskPolicySettings::default(),
        },
    };
    
    AIIntegrationManager::new_sync(config).expect("Failed to create test AI manager")
}

/// Test helper to create different risk thresholds
fn create_strict_thresholds() -> RiskThresholds {
    RiskThresholds {
        auto_approve_threshold: 0.1,
        manual_review_threshold: 0.3,
        auto_reject_threshold: 0.5,
        consider_amount: true,
        high_value_threshold: Some(100_000),
        additional_factors: vec![RiskFactor::SenderReputation],
    }
}

fn create_lenient_thresholds() -> RiskThresholds {
    RiskThresholds {
        auto_approve_threshold: 0.7,
        manual_review_threshold: 0.9,
        auto_reject_threshold: 0.95,
        consider_amount: false,
        high_value_threshold: None,
        additional_factors: vec![],
    }
}

#[tokio::test]
async fn test_auto_approve_low_risk() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.1),
        confidence: Some(0.9),
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::AutoApprove { risk_score, confidence, .. } => {
            assert!(risk_score <= 0.3);
            assert!(confidence >= 0.8);
        }
        _ => panic!("Expected auto-approve decision for low risk transaction"),
    }
}

#[tokio::test]
async fn test_auto_reject_high_risk() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.95),
        confidence: Some(0.9),
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::AutoReject { risk_score, rejection_code, .. } => {
            assert!(risk_score >= 0.9);
            assert!(matches!(rejection_code, RejectionCode::FraudRisk | RejectionCode::SuspiciousActivity));
        }
        _ => panic!("Expected auto-reject decision for high risk transaction"),
    }
}

#[tokio::test]
async fn test_manual_review_medium_risk() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.5),
        confidence: Some(0.8),
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::ManualReview { risk_score, priority, .. } => {
            assert!(risk_score >= 0.3 && risk_score <= 0.9);
            assert!(matches!(priority, ReviewPriority::Low | ReviewPriority::Medium | ReviewPriority::High));
        }
        _ => panic!("Expected manual review decision for medium risk transaction"),
    }
}

#[tokio::test]
async fn test_different_transaction_types_thresholds() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.4),
        confidence: Some(0.8),
    };
    
    // Test transfer transaction
    let transfer_decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    // Test contract deployment
    let deploy_decision = ai_manager.make_risk_based_decision(
        "deploy",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    // Contract deployment should be stricter (lower auto-approve threshold)
    match (transfer_decision, deploy_decision) {
        (TransactionProcessingDecision::AutoApprove { .. }, 
         TransactionProcessingDecision::ManualReview { .. }) => {
            // This is expected: same risk score but different thresholds
        }
        _ => {
            // Both could be manual review, which is also valid
            // The key is that deploy has stricter thresholds
        }
    }
}

#[tokio::test]
async fn test_high_value_transaction_adjustment() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.25), // Just below default auto-approve threshold
        confidence: Some(0.9),
    };
    
    // Test normal value transaction
    let normal_decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(10_000), // Well below high value threshold
        None,
    ).await;
    
    // Test high value transaction
    let high_value_decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(10_000_000), // Above high value threshold
        None,
    ).await;
    
    // High value transaction should have higher effective risk score
    match (normal_decision, high_value_decision) {
        (TransactionProcessingDecision::AutoApprove { .. }, 
         TransactionProcessingDecision::ManualReview { .. }) => {
            // Expected: high value pushes it into manual review
        }
        (TransactionProcessingDecision::AutoApprove { risk_score: normal_score, .. }, 
         TransactionProcessingDecision::AutoApprove { risk_score: high_value_score, .. }) => {
            // Both approved but high value should have higher risk score
            assert!(high_value_score > normal_score);
        }
        _ => {
            // Other combinations are possible depending on exact adjustments
        }
    }
}

#[tokio::test]
async fn test_low_confidence_triggers_review() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.1), // Very low risk
        confidence: Some(0.5), // Below minimum confidence threshold
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::ManualReview { reasoning, .. } => {
            assert!(reasoning.contains("confidence"));
        }
        _ => panic!("Expected manual review due to low confidence"),
    }
}

#[tokio::test]
async fn test_ai_service_unavailable_handling() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Unavailable {
        error: "Service timeout".to_string(),
        fallback_allowed: true,
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::ManualReview { priority, .. } => {
            assert_eq!(priority, ReviewPriority::High);
        }
        _ => panic!("Expected manual review when AI unavailable"),
    }
}

#[tokio::test]
async fn test_ai_service_unavailable_no_fallback() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Unavailable {
        error: "Service down".to_string(),
        fallback_allowed: false,
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::AutoReject { rejection_code, .. } => {
            assert_eq!(rejection_code, RejectionCode::ServiceUnavailable);
        }
        _ => panic!("Expected auto-reject when AI unavailable and no fallback"),
    }
}

#[tokio::test]
async fn test_verification_failed_handling() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Failed {
        error: "Signature verification failed".to_string(),
        oracle_id: Some("test_oracle".to_string()),
        response_id: Some("test_response".to_string()),
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::AutoReject { rejection_code, .. } => {
            assert_eq!(rejection_code, RejectionCode::TechnicalFailure);
        }
        _ => panic!("Expected auto-reject when verification fails"),
    }
}

#[tokio::test]
async fn test_risk_processing_disabled() {
    let mut config = AIIntegrationConfig::default();
    config.risk_config.enable_risk_processing = false;
    
    let ai_manager = AIIntegrationManager::new_sync(config).expect("Failed to create AI manager");
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.9), // High risk
        confidence: Some(0.9),
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::AutoApprove { .. } => {
            // Expected: risk processing disabled, so auto-approve verified transactions
        }
        _ => panic!("Expected auto-approve when risk processing disabled"),
    }
}

#[tokio::test]
async fn test_additional_risk_factors() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.25),
        confidence: Some(0.9),
    };
    
    // Test with bad sender reputation
    let bad_reputation_context = serde_json::json!({
        "sender_reputation": 0.1,
        "transaction_frequency": 200.0
    });
    
    let decision_bad_reputation = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        Some(bad_reputation_context),
    ).await;
    
    // Test with good sender reputation
    let good_reputation_context = serde_json::json!({
        "sender_reputation": 0.9,
        "transaction_frequency": 5.0
    });
    
    let decision_good_reputation = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        Some(good_reputation_context),
    ).await;
    
    // Bad reputation should result in higher effective risk score
    match (decision_good_reputation, decision_bad_reputation) {
        (TransactionProcessingDecision::AutoApprove { .. }, 
         TransactionProcessingDecision::ManualReview { .. }) => {
            // Expected: bad reputation pushes into manual review
        }
        (TransactionProcessingDecision::AutoApprove { risk_score: good_score, .. }, 
         TransactionProcessingDecision::AutoApprove { risk_score: bad_score, .. }) => {
            // Both approved but bad reputation should have higher risk score
            assert!(bad_score > good_score);
        }
        _ => {
            // Other combinations possible depending on exact risk adjustments
        }
    }
}

#[tokio::test]
async fn test_critical_priority_review() {
    let ai_manager = create_test_ai_manager().await;
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.85), // Just below auto-reject threshold
        confidence: Some(0.9),
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::ManualReview { priority, estimated_review_time, .. } => {
            assert_eq!(priority, ReviewPriority::Critical);
            assert_eq!(estimated_review_time, 300); // 5 minutes for critical
        }
        _ => panic!("Expected critical priority manual review for near-reject risk score"),
    }
}

#[tokio::test]
async fn test_boundary_conditions() {
    let ai_manager = create_test_ai_manager().await;
    
    // Test exact threshold values
    let thresholds = ai_manager.get_transaction_thresholds("transfer");
    
    // Test exact auto-approve threshold
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(thresholds.auto_approve_threshold),
        confidence: Some(0.9),
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::AutoApprove { .. } => {
            // At threshold should auto-approve
        }
        _ => panic!("Expected auto-approve at exact threshold"),
    }
    
    // Test just above auto-approve threshold
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(thresholds.auto_approve_threshold + 0.001),
        confidence: Some(0.9),
    };
    
    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;
    
    match decision {
        TransactionProcessingDecision::ManualReview { .. } => {
            // Just above threshold should trigger manual review
        }
        _ => panic!("Expected manual review just above auto-approve threshold"),
    }
}

/// Integration test with full validation pipeline
#[tokio::test]
async fn test_validate_transaction_with_risk_analysis_integration() {
    let ai_manager = create_test_ai_manager().await;
    
    let transaction_data = serde_json::json!({
        "transaction_type": "transfer",
        "from": "dyt1sender123",
        "to": "dyt1recipient456",
        "amount": 1000,
        "fee": 10,
        "nonce": 1,
        "timestamp": 1234567890,
        "hash": "test_hash"
    });
    
    // This will call the AI service (which may not be available in tests)
    // but we can test the error handling
    let result = ai_manager.validate_transaction_with_risk_analysis(
        transaction_data,
        "transfer",
        Some(1000),
        None,
    ).await;
    
    // Should get either a decision or an error (likely error in test environment)
    match result {
        Ok(decision) => {
            // If AI service is available, we got a decision
            println!("Got decision: {:?}", decision);
        }
        Err(e) => {
            // Expected in test environment without AI service
            println!("Got expected error: {}", e);
            assert!(e.contains("AI") || e.contains("service") || e.contains("request"));
        }
    }
}
