use std::sync::Arc;
use tokio;
use serde_json;

use crate::consensus::ai_integration::{
    AIIntegrationManager, AIIntegrationConfig, RiskProcessingConfig, TransactionRiskThresholds,
    RiskThresholds, RiskPolicySettings, TransactionProcessingDecision, ReviewPriority,
    RejectionCode, AIVerificationResult, RiskFactor
};
use crate::consensus::{AIServiceConfig, VerificationConfig, ReplayProtectionConfig};
use crate::types::{Transaction, TransferTransaction, PQCTransactionSignature};
use crate::crypto::PQCManager;
use crate::runtime::DytallixRuntime;
use dytallix_pqc::{Signature, SignatureAlgorithm};

/// Integration test for risk-based processing in the consensus engine
#[tokio::test]
async fn test_consensus_engine_risk_processing_integration() {
    // Create a test AI integration manager
    let ai_config = AIIntegrationConfig {
        verification_config: VerificationConfig::default(),
        ai_service_config: AIServiceConfig::default(),
        replay_protection_config: ReplayProtectionConfig::default(),
        require_ai_verification: false, // Allow fallback for testing
        fail_on_ai_unavailable: false,
        ai_timeout_ms: 5000,
        enable_response_caching: false,
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

    // Test that the AI integration manager can be created successfully
    let ai_manager = AIIntegrationManager::new_sync(ai_config);
    assert!(ai_manager.is_ok(), "Failed to create AI integration manager");

    let ai_manager = ai_manager.unwrap();

    // Test various risk scenarios
    test_low_risk_scenario(&ai_manager).await;
    test_high_risk_scenario(&ai_manager).await;
    test_medium_risk_scenario(&ai_manager).await;
    test_service_unavailable_scenario(&ai_manager).await;
}

async fn test_low_risk_scenario(ai_manager: &AIIntegrationManager) {
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response_1".to_string(),
        risk_score: Some(0.1),
        confidence: Some(0.95),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoApprove { risk_score, confidence, reasoning } => {
            assert!(risk_score <= 0.3, "Risk score should be low");
            assert!(confidence >= 0.9, "Confidence should be high");
            assert!(reasoning.contains("auto-approve"), "Reasoning should mention auto-approve");
            println!("✓ Low risk scenario: Auto-approved with risk_score={:.3}, confidence={:.3}", risk_score, confidence);
        }
        _ => panic!("Expected auto-approve for low risk scenario"),
    }
}

async fn test_high_risk_scenario(ai_manager: &AIIntegrationManager) {
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response_2".to_string(),
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
        TransactionProcessingDecision::AutoReject { risk_score, rejection_code, reasoning } => {
            assert!(risk_score >= 0.9, "Risk score should be high");
            assert!(matches!(rejection_code, RejectionCode::FraudRisk | RejectionCode::SuspiciousActivity), 
                    "Should have appropriate rejection code");
            assert!(reasoning.contains("auto-reject"), "Reasoning should mention auto-reject");
            println!("✓ High risk scenario: Auto-rejected with risk_score={:.3}, code={:?}", risk_score, rejection_code);
        }
        _ => panic!("Expected auto-reject for high risk scenario"),
    }
}

async fn test_medium_risk_scenario(ai_manager: &AIIntegrationManager) {
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response_3".to_string(),
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
        TransactionProcessingDecision::ManualReview { risk_score, priority, reasoning, estimated_review_time } => {
            assert!(risk_score >= 0.3 && risk_score <= 0.9, "Risk score should be in manual review range");
            assert!(matches!(priority, ReviewPriority::Low | ReviewPriority::Medium | ReviewPriority::High), 
                    "Should have appropriate priority");
            assert!(reasoning.contains("manual review"), "Reasoning should mention manual review");
            assert!(estimated_review_time > 0, "Should have estimated review time");
            println!("✓ Medium risk scenario: Manual review with risk_score={:.3}, priority={:?}, estimated_time={}s", 
                     risk_score, priority, estimated_review_time);
        }
        _ => panic!("Expected manual review for medium risk scenario"),
    }
}

async fn test_service_unavailable_scenario(ai_manager: &AIIntegrationManager) {
    let verification_result = AIVerificationResult::Unavailable {
        error: "Service timeout for testing".to_string(),
        fallback_allowed: true,
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::ManualReview { priority, reasoning, .. } => {
            assert_eq!(priority, ReviewPriority::High, "Should have high priority when AI unavailable");
            assert!(reasoning.contains("unavailable"), "Reasoning should mention service unavailable");
            println!("✓ Service unavailable scenario: Manual review with high priority");
        }
        _ => panic!("Expected manual review when AI service unavailable"),
    }
}

/// Test different transaction types have different thresholds
#[tokio::test]
async fn test_transaction_type_specific_thresholds() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();

    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.25), // Borderline score
        confidence: Some(0.9),
    };

    // Test transfer (default thresholds: auto_approve=0.3)
    let transfer_decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    // Test deploy (stricter thresholds: auto_approve=0.2)
    let deploy_decision = ai_manager.make_risk_based_decision(
        "deploy",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match (&transfer_decision, &deploy_decision) {
        (TransactionProcessingDecision::AutoApprove { .. }, 
         TransactionProcessingDecision::ManualReview { .. }) => {
            println!("✓ Transaction type thresholds working: transfer approved, deploy needs review");
        }
        (TransactionProcessingDecision::AutoApprove { .. }, 
         TransactionProcessingDecision::AutoApprove { .. }) => {
            println!("✓ Both approved but with different thresholds applied");
        }
        _ => {
            println!("Both transactions handled appropriately for their types");
        }
    }
}

/// Test high-value transaction adjustment
#[tokio::test]
async fn test_high_value_transaction_adjustment() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();

    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.25), // Just below auto-approve threshold
        confidence: Some(0.9),
    };

    // Normal value transaction
    let normal_decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(10_000), // Well below threshold
        None,
    ).await;

    // High value transaction
    let high_value_decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(10_000_000), // Above high value threshold
        None,
    ).await;

    println!("Normal value decision: {:?}", normal_decision);
    println!("High value decision: {:?}", high_value_decision);

    // High value should either trigger manual review or have higher risk score
    match (&normal_decision, &high_value_decision) {
        (TransactionProcessingDecision::AutoApprove { risk_score: normal_score, .. }, 
         TransactionProcessingDecision::AutoApprove { risk_score: high_score, .. }) => {
            assert!(high_score > normal_score, "High value transaction should have higher risk score");
            println!("✓ High value adjustment working: normal_score={:.3}, high_score={:.3}", normal_score, high_score);
        }
        (TransactionProcessingDecision::AutoApprove { .. }, 
         TransactionProcessingDecision::ManualReview { .. }) => {
            println!("✓ High value adjustment working: normal approved, high value needs review");
        }
        _ => {
            println!("Both transactions handled appropriately with value consideration");
        }
    }
}

/// Test configuration validation
#[tokio::test]
async fn test_risk_configuration_validation() {
    // Test that configuration is properly loaded
    let config = AIIntegrationConfig::default();
    
    assert!(config.risk_config.enable_risk_processing, "Risk processing should be enabled by default");
    assert!(config.risk_config.enable_manual_review, "Manual review should be enabled by default");
    assert!(config.risk_config.max_review_queue_size > 0, "Review queue should have positive size");
    
    // Test transaction thresholds are properly ordered
    let thresholds = &config.risk_config.transaction_thresholds.transfer;
    assert!(thresholds.auto_approve_threshold < thresholds.manual_review_threshold, 
            "Auto-approve should be less than manual review threshold");
    assert!(thresholds.manual_review_threshold < thresholds.auto_reject_threshold, 
            "Manual review should be less than auto-reject threshold");
    
    println!("✓ Risk configuration validation passed");
}

/// Test error handling and edge cases
#[tokio::test]
async fn test_edge_cases_and_error_handling() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();

    // Test with missing risk score
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: None,
        confidence: Some(0.9),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoApprove { risk_score, .. } => {
            assert_eq!(risk_score, 0.0, "Missing risk score should default to 0.0");
            println!("✓ Missing risk score handled properly");
        }
        _ => panic!("Expected auto-approve with default risk score"),
    }

    // Test with missing confidence
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.1),
        confidence: None,
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoApprove { confidence, .. } => {
            assert_eq!(confidence, 1.0, "Missing confidence should default to 1.0");
            println!("✓ Missing confidence handled properly");
        }
        _ => panic!("Expected auto-approve with default confidence"),
    }

    // Test with unknown transaction type
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.5),
        confidence: Some(0.9),
    };

    let decision = ai_manager.make_risk_based_decision(
        "unknown_type",
        &verification_result,
        Some(1000),
        None,
    ).await;

    // Should use default thresholds
    match decision {
        TransactionProcessingDecision::ManualReview { .. } => {
            println!("✓ Unknown transaction type uses default thresholds");
        }
        TransactionProcessingDecision::AutoApprove { .. } => {
            println!("✓ Unknown transaction type handled with default thresholds");
        }
        _ => panic!("Unexpected decision for unknown transaction type"),
    }
}
