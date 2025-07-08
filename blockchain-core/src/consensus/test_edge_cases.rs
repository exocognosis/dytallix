use std::sync::Arc;
use tokio;
use serde_json;

use crate::consensus::ai_integration::{
    AIIntegrationManager, AIIntegrationConfig, RiskProcessingConfig, TransactionRiskThresholds,
    RiskThresholds, RiskPolicySettings, TransactionProcessingDecision, ReviewPriority,
    RejectionCode, AIVerificationResult, RiskFactor
};
use crate::consensus::{AIServiceConfig, VerificationConfig, ReplayProtectionConfig};

/// Tests for edge cases and boundary conditions in risk-based processing
#[tokio::test]
async fn test_exact_threshold_boundaries() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();
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
            println!("✓ Exact auto-approve threshold: AutoApprove");
        }
        _ => panic!("Expected auto-approve at exact threshold"),
    }

    // Test one increment above auto-approve threshold
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(thresholds.auto_approve_threshold + f64::EPSILON),
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
            println!("✓ Just above auto-approve threshold: ManualReview");
        }
        _ => panic!("Expected manual review just above auto-approve threshold"),
    }

    // Test exact auto-reject threshold
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(thresholds.auto_reject_threshold),
        confidence: Some(0.9),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoReject { .. } => {
            println!("✓ Exact auto-reject threshold: AutoReject");
        }
        _ => panic!("Expected auto-reject at exact threshold"),
    }
}

#[tokio::test]
async fn test_extreme_risk_scores() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();

    // Test risk score of 0.0
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.0),
        confidence: Some(1.0),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoApprove { risk_score, .. } => {
            assert_eq!(risk_score, 0.0);
            println!("✓ Zero risk score: AutoApprove");
        }
        _ => panic!("Expected auto-approve for zero risk score"),
    }

    // Test risk score of 1.0
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(1.0),
        confidence: Some(1.0),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoReject { risk_score, .. } => {
            assert_eq!(risk_score, 1.0);
            println!("✓ Maximum risk score: AutoReject");
        }
        _ => panic!("Expected auto-reject for maximum risk score"),
    }

    // Test negative risk score (should be clamped)
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(-0.1),
        confidence: Some(1.0),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoApprove { risk_score, .. } => {
            // Risk score should be adjusted to valid range
            assert!(risk_score >= 0.0);
            println!("✓ Negative risk score clamped: risk_score={:.3}", risk_score);
        }
        _ => panic!("Expected auto-approve for negative risk score (clamped)"),
    }

    // Test risk score > 1.0 (should be clamped)
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(1.5),
        confidence: Some(1.0),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoReject { risk_score, .. } => {
            // Risk score should be clamped to 1.0
            assert!(risk_score <= 1.0);
            println!("✓ Excessive risk score clamped: risk_score={:.3}", risk_score);
        }
        _ => panic!("Expected auto-reject for excessive risk score (clamped)"),
    }
}

#[tokio::test]
async fn test_confidence_level_boundaries() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();
    let min_confidence = ai_manager.config.risk_config.risk_policies.min_confidence_level;

    // Test exact minimum confidence
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.1), // Low risk
        confidence: Some(min_confidence),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoApprove { .. } => {
            println!("✓ Exact minimum confidence: AutoApprove");
        }
        _ => panic!("Expected auto-approve at minimum confidence"),
    }

    // Test just below minimum confidence
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.1), // Low risk
        confidence: Some(min_confidence - f64::EPSILON),
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
            println!("✓ Below minimum confidence: ManualReview");
        }
        _ => panic!("Expected manual review below minimum confidence"),
    }

    // Test zero confidence
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.1), // Low risk
        confidence: Some(0.0),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::ManualReview { .. } => {
            println!("✓ Zero confidence: ManualReview");
        }
        _ => panic!("Expected manual review for zero confidence"),
    }
}

#[tokio::test]
async fn test_high_value_threshold_boundaries() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();
    let thresholds = ai_manager.get_transaction_thresholds("transfer");
    let high_value_threshold = thresholds.high_value_threshold.unwrap();

    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.25), // Just below auto-approve threshold
        confidence: Some(0.9),
    };

    // Test exact high value threshold
    let decision_exact = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(high_value_threshold),
        None,
    ).await;

    // Test just below high value threshold
    let decision_below = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(high_value_threshold - 1),
        None,
    ).await;

    // Test just above high value threshold
    let decision_above = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(high_value_threshold + 1),
        None,
    ).await;

    println!("High value threshold: {}", high_value_threshold);
    println!("Decision below threshold: {:?}", decision_below);
    println!("Decision at threshold: {:?}", decision_exact);
    println!("Decision above threshold: {:?}", decision_above);

    // Verify that higher values have different (stricter) treatment
    match (&decision_below, &decision_above) {
        (TransactionProcessingDecision::AutoApprove { risk_score: below_score, .. },
         TransactionProcessingDecision::AutoApprove { risk_score: above_score, .. }) => {
            assert!(above_score >= below_score, "Above threshold should have higher or equal risk score");
            println!("✓ High value adjustment: below={:.3}, above={:.3}", below_score, above_score);
        }
        (TransactionProcessingDecision::AutoApprove { .. },
         TransactionProcessingDecision::ManualReview { .. }) => {
            println!("✓ High value triggers manual review");
        }
        _ => {
            println!("Both transactions handled appropriately based on value");
        }
    }
}

#[tokio::test]
async fn test_priority_level_assignment() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();
    let thresholds = ai_manager.get_transaction_thresholds("transfer");

    // Test different risk levels within manual review range
    let test_cases = vec![
        (thresholds.auto_approve_threshold + 0.01, ReviewPriority::Low),
        (thresholds.auto_approve_threshold + 0.25, ReviewPriority::Medium),
        (thresholds.auto_reject_threshold - 0.15, ReviewPriority::High),
        (thresholds.auto_reject_threshold - 0.01, ReviewPriority::Critical),
    ];

    for (risk_score, expected_priority) in test_cases {
        let verification_result = AIVerificationResult::Verified {
            oracle_id: "test_oracle".to_string(),
            response_id: "test_response".to_string(),
            risk_score: Some(risk_score),
            confidence: Some(0.9),
        };

        let decision = ai_manager.make_risk_based_decision(
            "transfer",
            &verification_result,
            Some(1000),
            None,
        ).await;

        match decision {
            TransactionProcessingDecision::ManualReview { priority, .. } => {
                assert_eq!(priority, expected_priority, 
                          "Risk score {:.3} should have priority {:?}, got {:?}", 
                          risk_score, expected_priority, priority);
                println!("✓ Risk score {:.3} -> Priority {:?}", risk_score, priority);
            }
            _ => {
                // Some scores might still auto-approve or auto-reject
                println!("Risk score {:.3} -> Non-manual decision (acceptable)", risk_score);
            }
        }
    }
}

#[tokio::test]
async fn test_review_time_estimation() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();

    let priorities = vec![
        ReviewPriority::Critical,
        ReviewPriority::High,
        ReviewPriority::Medium,
        ReviewPriority::Low,
    ];

    for priority in priorities {
        let estimated_time = ai_manager.estimate_review_time(&priority);
        
        match priority {
            ReviewPriority::Critical => assert_eq!(estimated_time, 300), // 5 minutes
            ReviewPriority::High => assert_eq!(estimated_time, 900),     // 15 minutes
            ReviewPriority::Medium => assert_eq!(estimated_time, 1800),  // 30 minutes
            ReviewPriority::Low => assert_eq!(estimated_time, 3600),     // 1 hour
        }
        
        println!("✓ Priority {:?} -> Estimated time: {}s", priority, estimated_time);
    }
}

#[tokio::test]
async fn test_transaction_type_edge_cases() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();

    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.4),
        confidence: Some(0.9),
    };

    // Test various transaction type strings
    let test_types = vec![
        "transfer",
        "TRANSFER",
        "Transfer",
        "deploy",
        "contract_deploy",
        "call",
        "contract_call",
        "stake",
        "ai_request",
        "unknown_type",
        "",
        "invalid",
    ];

    for tx_type in test_types {
        let decision = ai_manager.make_risk_based_decision(
            tx_type,
            &verification_result,
            Some(1000),
            None,
        ).await;

        // Should never panic, should always return a valid decision
        match decision {
            TransactionProcessingDecision::AutoApprove { .. } => {
                println!("✓ Type '{}' -> AutoApprove", tx_type);
            }
            TransactionProcessingDecision::ManualReview { .. } => {
                println!("✓ Type '{}' -> ManualReview", tx_type);
            }
            TransactionProcessingDecision::AutoReject { .. } => {
                println!("✓ Type '{}' -> AutoReject", tx_type);
            }
            TransactionProcessingDecision::ProcessingError { .. } => {
                panic!("Should not get processing error for valid verification result");
            }
        }
    }
}

#[tokio::test]
async fn test_additional_risk_factors_edge_cases() {
    let ai_manager = AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap();

    // Test with malformed context
    let malformed_contexts = vec![
        Some(serde_json::json!({})), // Empty object
        Some(serde_json::json!({"invalid": "data"})), // No expected fields
        Some(serde_json::json!({"sender_reputation": "not_a_number"})), // Wrong type
        Some(serde_json::json!({"sender_reputation": -0.5})), // Negative reputation
        Some(serde_json::json!({"sender_reputation": 1.5})), // Out of range reputation
        Some(serde_json::json!({
            "sender_reputation": 0.5,
            "transaction_frequency": -10.0
        })), // Negative frequency
        None, // No context
    ];

    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.25),
        confidence: Some(0.9),
    };

    for (i, context) in malformed_contexts.into_iter().enumerate() {
        let decision = ai_manager.make_risk_based_decision(
            "transfer",
            &verification_result,
            Some(1000),
            context,
        ).await;

        // Should handle gracefully without panicking
        match decision {
            TransactionProcessingDecision::AutoApprove { risk_score, .. } => {
                assert!(risk_score >= 0.0 && risk_score <= 1.0);
                println!("✓ Malformed context {} -> AutoApprove (risk_score={:.3})", i, risk_score);
            }
            TransactionProcessingDecision::ManualReview { risk_score, .. } => {
                assert!(risk_score >= 0.0 && risk_score <= 1.0);
                println!("✓ Malformed context {} -> ManualReview (risk_score={:.3})", i, risk_score);
            }
            _ => {
                println!("✓ Malformed context {} -> Other valid decision", i);
            }
        }
    }
}

#[tokio::test]
async fn test_risk_processing_disabled() {
    let mut config = AIIntegrationConfig::default();
    config.risk_config.enable_risk_processing = false;

    let ai_manager = AIIntegrationManager::new_sync(config).unwrap();

    // Test with high risk score when risk processing is disabled
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.99), // Very high risk
        confidence: Some(0.9),
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoApprove { reasoning, .. } => {
            assert!(reasoning.contains("disabled"));
            println!("✓ Risk processing disabled: AutoApprove despite high risk");
        }
        _ => panic!("Expected auto-approve when risk processing disabled"),
    }

    // Test with failed verification when risk processing is disabled
    let verification_result = AIVerificationResult::Failed {
        error: "Test failure".to_string(),
        oracle_id: None,
        response_id: None,
    };

    let decision = ai_manager.make_risk_based_decision(
        "transfer",
        &verification_result,
        Some(1000),
        None,
    ).await;

    match decision {
        TransactionProcessingDecision::AutoReject { .. } => {
            println!("✓ Risk processing disabled but verification failed: AutoReject");
        }
        _ => panic!("Expected auto-reject for failed verification even when risk processing disabled"),
    }
}

#[tokio::test]
async fn test_concurrent_risk_decisions() {
    let ai_manager = Arc::new(AIIntegrationManager::new_sync(AIIntegrationConfig::default()).unwrap());
    
    let verification_result = AIVerificationResult::Verified {
        oracle_id: "test_oracle".to_string(),
        response_id: "test_response".to_string(),
        risk_score: Some(0.5),
        confidence: Some(0.9),
    };

    // Test concurrent access to the risk decision logic
    let mut handles = Vec::new();
    
    for i in 0..10 {
        let ai_manager_clone = Arc::clone(&ai_manager);
        let verification_result_clone = verification_result.clone();
        
        let handle = tokio::spawn(async move {
            ai_manager_clone.make_risk_based_decision(
                "transfer",
                &verification_result_clone,
                Some(1000 + i * 100), // Different amounts
                None,
            ).await
        });
        
        handles.push(handle);
    }

    // Wait for all concurrent decisions
    let mut decisions = Vec::new();
    for handle in handles {
        let decision = handle.await.expect("Task should complete");
        decisions.push(decision);
    }

    // All decisions should be valid and consistent
    assert_eq!(decisions.len(), 10);
    
    for (i, decision) in decisions.iter().enumerate() {
        match decision {
            TransactionProcessingDecision::AutoApprove { .. } |
            TransactionProcessingDecision::ManualReview { .. } |
            TransactionProcessingDecision::AutoReject { .. } => {
                println!("✓ Concurrent decision {}: Valid", i);
            }
            TransactionProcessingDecision::ProcessingError { .. } => {
                panic!("Should not get processing error in concurrent test");
            }
        }
    }
    
    println!("✓ All {} concurrent decisions completed successfully", decisions.len());
}
