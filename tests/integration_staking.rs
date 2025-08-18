// Integration tests for the staking system
// Tests the full workflow from validator registration to reward claiming

use std::collections::HashMap;
use blockchain_core::staking::{StakingState, ValidatorStatus, StakingError, SlashType, Evidence, ValidatorEvent};

#[test]
fn test_full_staking_workflow() {
    let mut staking = StakingState::new();
    
    // Test validator registration
    let validator_addr = "validator1".to_string();
    let pubkey = vec![1, 2, 3, 4];
    
    staking.register_validator(validator_addr.clone(), pubkey, 500).unwrap();
    
    assert!(staking.validators.contains_key(&validator_addr));
    let validator = &staking.validators[&validator_addr];
    assert_eq!(validator.status, ValidatorStatus::Pending);
    assert_eq!(validator.commission_rate, 500);
    
    // Test self-delegation (should activate validator)
    let self_stake_amount = 1_000_000_000_000u128; // 1M DGT
    staking.delegate(validator_addr.clone(), validator_addr.clone(), self_stake_amount).unwrap();
    
    let validator = &staking.validators[&validator_addr];
    assert_eq!(validator.status, ValidatorStatus::Active);
    assert_eq!(validator.total_stake, self_stake_amount);
    assert_eq!(validator.self_stake, self_stake_amount);
    
    // Test external delegation
    let delegator_addr = "delegator1".to_string();
    let delegation_amount = 500_000_000_000u128; // 500K DGT
    
    staking.delegate(delegator_addr.clone(), validator_addr.clone(), delegation_amount).unwrap();
    
    let validator = &staking.validators[&validator_addr];
    assert_eq!(validator.total_stake, self_stake_amount + delegation_amount);
    
    // Test that delegation exists
    let delegation_key = format!("{}:{}", delegator_addr, validator_addr);
    assert!(staking.delegations.contains_key(&delegation_key));
    
    let delegation = &staking.delegations[&delegation_key];
    assert_eq!(delegation.stake_amount, delegation_amount);
    assert_eq!(delegation.delegator_address, delegator_addr);
    assert_eq!(delegation.validator_address, validator_addr);
    
    // Test block reward processing
    staking.process_block_rewards(1).unwrap();
    
    let validator = &staking.validators[&validator_addr];
    assert!(validator.reward_index > 0);
    
    // Test reward calculation
    let pending_rewards = staking.calculate_pending_rewards(&delegator_addr, &validator_addr).unwrap();
    assert!(pending_rewards > 0);
    
    // Test reward claiming
    let claimed_rewards = staking.claim_rewards(&delegator_addr, &validator_addr).unwrap();
    assert_eq!(claimed_rewards, pending_rewards);
    
    // Test that reward cursor is updated
    let delegation = &staking.delegations[&delegation_key];
    assert_eq!(delegation.reward_cursor_index, validator.reward_index);
    
    // Test second reward claim should be zero
    let second_claim = staking.calculate_pending_rewards(&delegator_addr, &validator_addr).unwrap();
    assert_eq!(second_claim, 0);
}

#[test]
fn test_duplicate_delegation_rejected() {
    let mut staking = StakingState::new();
    
    // Register validator
    staking.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
    
    // First delegation should work
    staking.delegate("delegator1".to_string(), "validator1".to_string(), 1000).unwrap();
    
    // Second delegation from same delegator to same validator should fail
    let result = staking.delegate("delegator1".to_string(), "validator1".to_string(), 2000);
    assert!(matches!(result, Err(StakingError::DelegationAlreadyExists)));
}

#[test]
fn test_validator_activation() {
    let mut staking = StakingState::new();
    
    // Register validator
    staking.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
    
    // Should be pending initially
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Pending);
    
    // Small delegation shouldn't activate
    staking.delegate("validator1".to_string(), "validator1".to_string(), 100).unwrap();
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Pending);
    
    // Large enough self-delegation should activate
    let min_stake = staking.params.min_self_stake;
    staking.delegate("validator1".to_string(), "validator1".to_string(), min_stake).unwrap();
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Active);
}

#[test]
fn test_max_validators_limit() {
    let mut staking = StakingState::new();
    staking.params.max_validators = 2; // Set low limit for testing
    
    // Register and activate first validator
    staking.register_validator("validator1".to_string(), vec![1], 500).unwrap();
    staking.delegate("validator1".to_string(), "validator1".to_string(), staking.params.min_self_stake).unwrap();
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Active);
    
    // Register and activate second validator
    staking.register_validator("validator2".to_string(), vec![2], 500).unwrap();
    staking.delegate("validator2".to_string(), "validator2".to_string(), staking.params.min_self_stake).unwrap();
    assert_eq!(staking.validators["validator2"].status, ValidatorStatus::Active);
    
    // Third validator should register but remain pending (max reached)
    staking.register_validator("validator3".to_string(), vec![3], 500).unwrap();
    staking.delegate("validator3".to_string(), "validator3".to_string(), staking.params.min_self_stake).unwrap();
    assert_eq!(staking.validators["validator3"].status, ValidatorStatus::Pending);
    
    // Verify active validator count
    let active_validators = staking.get_active_validators();
    assert_eq!(active_validators.len(), 2);
}

// New tests for validator lifecycle operations

#[test]
fn test_validator_leave_functionality() {
    let mut staking = StakingState::new();
    
    // Register and activate validator
    staking.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
    staking.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
    
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Active);
    assert_eq!(staking.validators.len(), 1);
    
    // Check events were emitted for registration and activation
    assert!(staking.get_events().len() >= 2);
    
    // Validator leave should succeed
    let result = staking.validator_leave(&"validator1".to_string());
    assert!(result.is_ok());
    
    // Validator should be removed (MVP implementation)
    assert!(!staking.validators.contains_key("validator1"));
    assert_eq!(staking.total_stake, 0);
    
    // Should have emitted leave event
    let events = staking.get_events();
    assert!(events.iter().any(|e| matches!(e, ValidatorEvent::ValidatorLeft { .. })));
}

#[test]
fn test_uptime_tracking_and_jailing() {
    let mut staking = StakingState::new();
    staking.params.downtime_threshold = 3; // Low threshold for testing
    
    // Register and activate validator
    staking.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
    staking.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
    
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Active);
    assert_eq!(staking.validators["validator1"].missed_blocks, 0);
    
    // Record missed blocks
    staking.record_missed_block(&"validator1".to_string()).unwrap();
    assert_eq!(staking.validators["validator1"].missed_blocks, 1);
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Active);
    
    staking.record_missed_block(&"validator1".to_string()).unwrap();
    assert_eq!(staking.validators["validator1"].missed_blocks, 2);
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Active);
    
    // Third miss should jail the validator and apply slashing
    staking.record_missed_block(&"validator1".to_string()).unwrap();
    assert_eq!(staking.validators["validator1"].missed_blocks, 3);
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Jailed);
    assert!(staking.validators["validator1"].total_slashed > 0);
    
    // Should have emitted jail and slash events
    let events = staking.get_events();
    assert!(events.iter().any(|e| matches!(e, ValidatorEvent::ValidatorJailed { .. })));
    assert!(events.iter().any(|e| matches!(e, ValidatorEvent::ValidatorSlashed { .. })));
    
    // Record validator present should reset missed blocks
    staking.record_validator_present(&"validator1".to_string()).unwrap();
    assert_eq!(staking.validators["validator1"].missed_blocks, 0);
    assert_eq!(staking.validators["validator1"].last_seen_height, staking.current_height);
}

#[test]
fn test_slashing_functionality() {
    let mut staking = StakingState::new();
    
    // Register and activate validator
    staking.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
    staking.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
    
    let initial_stake = staking.validators["validator1"].total_stake;
    let initial_total_stake = staking.total_stake;
    
    // Slash for downtime (1% = 100 basis points by default)
    let result = staking.slash_validator(&"validator1".to_string(), SlashType::Downtime);
    assert!(result.is_ok());
    
    let validator = &staking.validators["validator1"];
    let expected_slash = (initial_stake * staking.params.slash_downtime as u128) / 10000;
    
    assert_eq!(validator.total_slashed, expected_slash);
    assert_eq!(validator.slash_count, 1);
    assert_eq!(validator.total_stake, initial_stake - expected_slash);
    assert_eq!(staking.total_stake, initial_total_stake - expected_slash);
    assert_eq!(validator.status, ValidatorStatus::Jailed); // Status should still be jailed from previous test pattern
    
    // Double sign should mark as slashed
    let result = staking.slash_validator(&"validator1".to_string(), SlashType::DoubleSign);
    assert!(result.is_ok());
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Slashed);
    assert_eq!(staking.validators["validator1"].slash_count, 2);
    
    // Should have emitted slashing events
    let events = staking.get_events();
    let slash_events: Vec<_> = events.iter().filter(|e| matches!(e, ValidatorEvent::ValidatorSlashed { .. })).collect();
    assert!(slash_events.len() >= 2);
}

#[test]
fn test_evidence_handling() {
    let mut staking = StakingState::new();
    
    // Register and activate validator
    staking.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
    staking.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
    
    // Create valid double sign evidence
    let evidence = Evidence::DoubleSign {
        validator_address: "validator1".to_string(),
        height: 100,
        signature_1: vec![1, 2, 3],
        signature_2: vec![4, 5, 6],  // Different signature
        block_hash_1: vec![7, 8, 9],
        block_hash_2: vec![10, 11, 12], // Different block hash
    };
    
    let result = staking.handle_evidence(evidence);
    assert!(result.is_ok());
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Slashed);
    
    // Create invalid evidence (same signatures)
    let invalid_evidence = Evidence::DoubleSign {
        validator_address: "validator1".to_string(),
        height: 100,
        signature_1: vec![1, 2, 3],
        signature_2: vec![1, 2, 3], // Same signature - invalid
        block_hash_1: vec![7, 8, 9],
        block_hash_2: vec![10, 11, 12],
    };
    
    let result = staking.handle_evidence(invalid_evidence);
    assert!(matches!(result, Err(StakingError::InvalidEvidence)));
    
    // Test downtime evidence
    let downtime_evidence = Evidence::Downtime {
        validator_address: "validator1".to_string(),
        missed_blocks: staking.params.downtime_threshold + 1, // Above threshold
        window_start: 1,
        window_end: 100,
    };
    
    let result = staking.handle_evidence(downtime_evidence);
    assert!(result.is_ok());
}

#[test]
fn test_validator_query_functions() {
    let mut staking = StakingState::new();
    
    // Register multiple validators with different states
    staking.register_validator("validator1".to_string(), vec![1], 500).unwrap();
    staking.register_validator("validator2".to_string(), vec![2], 600).unwrap();
    staking.register_validator("validator3".to_string(), vec![3], 700).unwrap();
    
    // Activate one validator
    staking.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
    
    // Jail another validator by simulating downtime
    staking.params.downtime_threshold = 1;
    staking.record_missed_block(&"validator1".to_string()).unwrap();
    
    // Test get_validator_stats
    let stats1 = staking.get_validator_stats(&"validator1".to_string()).unwrap();
    assert_eq!(stats1.status, ValidatorStatus::Jailed);
    assert_eq!(stats1.commission_rate, 500);
    assert_eq!(stats1.missed_blocks, 1);
    assert!(stats1.total_slashed > 0);
    
    let stats2 = staking.get_validator_stats(&"validator2".to_string()).unwrap();
    assert_eq!(stats2.status, ValidatorStatus::Pending);
    assert_eq!(stats2.commission_rate, 600);
    
    // Test get_validator_set with filters
    let all_validators = staking.get_validator_set(None);
    assert_eq!(all_validators.len(), 3);
    
    let jailed_validators = staking.get_validator_set(Some(ValidatorStatus::Jailed));
    assert_eq!(jailed_validators.len(), 1);
    assert_eq!(jailed_validators[0].address, "validator1".to_string());
    
    let pending_validators = staking.get_validator_set(Some(ValidatorStatus::Pending));
    assert_eq!(pending_validators.len(), 2);
    
    let active_validators = staking.get_validator_set(Some(ValidatorStatus::Active));
    assert_eq!(active_validators.len(), 0); // None are active after jailing
}

#[test]
fn test_unjail_validator() {
    let mut staking = StakingState::new();
    staking.params.downtime_threshold = 1; // Jail after 1 missed block
    
    // Register and activate validator
    staking.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
    staking.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
    
    // Jail the validator
    staking.record_missed_block(&"validator1".to_string()).unwrap();
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Jailed);
    
    // Unjail should work
    let result = staking.unjail_validator(&"validator1".to_string());
    assert!(result.is_ok());
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Inactive);
    assert_eq!(staking.validators["validator1"].missed_blocks, 0);
    
    // Should have emitted status change event
    let events = staking.get_events();
    assert!(events.iter().any(|e| matches!(e, ValidatorEvent::ValidatorStatusChanged { new_status: ValidatorStatus::Inactive, .. })));
    
    // Unjailing non-jailed validator should fail
    let result = staking.unjail_validator(&"validator1".to_string());
    assert!(matches!(result, Err(StakingError::InvalidStatus)));
}

#[test]
fn test_events_system() {
    let mut staking = StakingState::new();
    
    // Register validator (should emit event)
    staking.register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500).unwrap();
    assert_eq!(staking.get_events().len(), 1);
    
    // Activate validator (should emit status change event)
    staking.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000).unwrap();
    assert_eq!(staking.get_events().len(), 2);
    
    // Check event types
    let events = staking.get_events();
    assert!(matches!(events[0], ValidatorEvent::ValidatorJoined { .. }));
    assert!(matches!(events[1], ValidatorEvent::ValidatorStatusChanged { .. }));
    
    // Clear events
    staking.clear_events();
    assert_eq!(staking.get_events().len(), 0);
    
    // Further operations should create new events
    staking.slash_validator(&"validator1".to_string(), SlashType::DoubleSign).unwrap();
    assert!(staking.get_events().len() > 0);
}

#[test]
fn test_reward_distribution_accuracy() {
    let mut staking = StakingState::new();
    
    // Set up validator with known stake amounts for easier math
    staking.register_validator("validator1".to_string(), vec![1], 0).unwrap(); // 0% commission
    
    // Self-delegate 1M DGT
    let self_stake = 1_000_000_000_000u128;
    staking.delegate("validator1".to_string(), "validator1".to_string(), self_stake).unwrap();
    
    // External delegate 1M DGT (total: 2M DGT)
    staking.delegate("delegator1".to_string(), "validator1".to_string(), self_stake).unwrap();
    
    // Process block rewards
    staking.process_block_rewards(1).unwrap();
    
    // Both delegations should get equal rewards (50% each)
    let validator_rewards = staking.calculate_pending_rewards(&"validator1".to_string(), &"validator1".to_string()).unwrap();
    let delegator_rewards = staking.calculate_pending_rewards(&"delegator1".to_string(), &"validator1".to_string()).unwrap();
    
    assert_eq!(validator_rewards, delegator_rewards);
    
    // Total rewards should equal emission per block
    assert_eq!(validator_rewards + delegator_rewards, staking.params.emission_per_block);
}

#[test]
fn test_multiple_block_rewards() {
    let mut staking = StakingState::new();
    
    // Set up validator
    staking.register_validator("validator1".to_string(), vec![1], 0).unwrap();
    staking.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000u128).unwrap();
    staking.delegate("delegator1".to_string(), "validator1".to_string(), 1_000_000_000_000u128).unwrap();
    
    // Process multiple blocks
    staking.process_block_rewards(1).unwrap();
    staking.process_block_rewards(2).unwrap();
    staking.process_block_rewards(3).unwrap();
    
    // Rewards should accumulate
    let delegator_rewards = staking.calculate_pending_rewards(&"delegator1".to_string(), &"validator1".to_string()).unwrap();
    
    // Should be approximately 3 blocks worth of rewards for 50% share
    let expected = (staking.params.emission_per_block * 3) / 2;
    assert_eq!(delegator_rewards, expected);
}

#[test]
fn test_partial_reward_claiming() {
    let mut staking = StakingState::new();
    
    // Set up validator and delegation
    staking.register_validator("validator1".to_string(), vec![1], 0).unwrap();
    staking.delegate("validator1".to_string(), "validator1".to_string(), 1_000_000_000_000u128).unwrap();
    staking.delegate("delegator1".to_string(), "validator1".to_string(), 1_000_000_000_000u128).unwrap();
    
    // Process first block
    staking.process_block_rewards(1).unwrap();
    
    // Claim rewards
    let first_claim = staking.claim_rewards(&"delegator1".to_string(), &"validator1".to_string()).unwrap();
    assert!(first_claim > 0);
    
    // Process second block
    staking.process_block_rewards(2).unwrap();
    
    // Second claim should only get rewards from second block
    let second_claim = staking.claim_rewards(&"delegator1".to_string(), &"validator1".to_string()).unwrap();
    assert_eq!(second_claim, first_claim); // Same rewards per block
}

#[test]
fn test_staking_stats() {
    let mut staking = StakingState::new();
    
    // Initial stats
    assert_eq!(staking.total_stake, 0);
    assert_eq!(staking.validators.len(), 0);
    assert_eq!(staking.get_active_validators().len(), 0);
    
    // Add validators
    staking.register_validator("validator1".to_string(), vec![1], 500).unwrap();
    staking.register_validator("validator2".to_string(), vec![2], 500).unwrap();
    
    // Add stake
    let stake_amount = 1_000_000_000_000u128;
    staking.delegate("validator1".to_string(), "validator1".to_string(), stake_amount).unwrap();
    staking.delegate("delegator1".to_string(), "validator2".to_string(), stake_amount).unwrap();
    
    // Check stats
    assert_eq!(staking.total_stake, stake_amount * 2);
    assert_eq!(staking.validators.len(), 2);
    assert_eq!(staking.get_active_validators().len(), 1); // Only validator1 has enough self-stake
}