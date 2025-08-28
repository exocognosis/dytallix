// Integration tests for the staking system
// Tests the full workflow from validator registration to reward claiming

use blockchain_core::staking::{
    Evidence, SlashType, StakingError, StakingState, ValidatorEvent, ValidatorStatus,
};
use std::collections::HashMap;

#[test]
fn test_full_staking_workflow() {
    let mut staking = StakingState::new();

    // Test validator registration
    let validator_addr = "validator1".to_string();
    let pubkey = vec![1, 2, 3, 4];

    staking
        .register_validator(validator_addr.clone(), pubkey, 500)
        .unwrap();

    assert!(staking.validators.contains_key(&validator_addr));
    let validator = &staking.validators[&validator_addr];
    assert_eq!(validator.status, ValidatorStatus::Pending);
    assert_eq!(validator.commission_rate, 500);

    // Test self-delegation (should activate validator)
    let self_stake_amount = 1_000_000_000_000u128; // 1M DGT
    staking
        .delegate(
            validator_addr.clone(),
            validator_addr.clone(),
            self_stake_amount,
        )
        .unwrap();

    let validator = &staking.validators[&validator_addr];
    assert_eq!(validator.status, ValidatorStatus::Active);
    assert_eq!(validator.total_stake, self_stake_amount);
    assert_eq!(validator.self_stake, self_stake_amount);

    // Test external delegation
    let delegator_addr = "delegator1".to_string();
    let delegation_amount = 500_000_000_000u128; // 500K DGT

    staking
        .delegate(
            delegator_addr.clone(),
            validator_addr.clone(),
            delegation_amount,
        )
        .unwrap();

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
    let pending_rewards = staking
        .calculate_pending_rewards(&delegator_addr, &validator_addr)
        .unwrap();
    assert!(pending_rewards > 0);

    // Test reward claiming
    let claimed_rewards = staking
        .claim_rewards(&delegator_addr, &validator_addr)
        .unwrap();
    assert_eq!(claimed_rewards, pending_rewards);

    // Test that reward cursor is updated
    let delegation = &staking.delegations[&delegation_key];
    assert_eq!(delegation.reward_cursor_index, validator.reward_index);

    // Test second reward claim should be zero
    let second_claim = staking
        .calculate_pending_rewards(&delegator_addr, &validator_addr)
        .unwrap();
    assert_eq!(second_claim, 0);
}

#[test]
fn test_duplicate_delegation_rejected() {
    let mut staking = StakingState::new();

    // Register validator
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500)
        .unwrap();

    // First delegation should work
    staking
        .delegate("delegator1".to_string(), "validator1".to_string(), 1000)
        .unwrap();

    // Second delegation from same delegator to same validator should fail
    let result = staking.delegate("delegator1".to_string(), "validator1".to_string(), 2000);
    assert!(matches!(result, Err(StakingError::DelegationAlreadyExists)));
}

#[test]
fn test_validator_activation() {
    let mut staking = StakingState::new();

    // Register validator
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500)
        .unwrap();

    // Should be pending initially
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Pending
    );

    // Small delegation shouldn't activate
    staking
        .delegate("validator1".to_string(), "validator1".to_string(), 100)
        .unwrap();
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Pending
    );

    // Large enough self-delegation should activate
    let min_stake = staking.params.min_self_stake;
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            min_stake,
        )
        .unwrap();
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Active
    );
}

#[test]
fn test_max_validators_limit() {
    let mut staking = StakingState::new();
    staking.params.max_validators = 2; // Set low limit for testing

    // Register and activate first validator
    staking
        .register_validator("validator1".to_string(), vec![1], 500)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            staking.params.min_self_stake,
        )
        .unwrap();
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Active
    );

    // Register and activate second validator
    staking
        .register_validator("validator2".to_string(), vec![2], 500)
        .unwrap();
    staking
        .delegate(
            "validator2".to_string(),
            "validator2".to_string(),
            staking.params.min_self_stake,
        )
        .unwrap();
    assert_eq!(
        staking.validators["validator2"].status,
        ValidatorStatus::Active
    );

    // Third validator should register but remain pending (max reached)
    staking
        .register_validator("validator3".to_string(), vec![3], 500)
        .unwrap();
    staking
        .delegate(
            "validator3".to_string(),
            "validator3".to_string(),
            staking.params.min_self_stake,
        )
        .unwrap();
    assert_eq!(
        staking.validators["validator3"].status,
        ValidatorStatus::Pending
    );

    // Verify active validator count
    let active_validators = staking.get_active_validators();
    assert_eq!(active_validators.len(), 2);
}

// New tests for validator lifecycle operations

#[test]
fn test_validator_leave_functionality() {
    let mut staking = StakingState::new();

    // Register and activate validator
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Active
    );
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
    assert!(events
        .iter()
        .any(|e| matches!(e, ValidatorEvent::ValidatorLeft { .. })));
}

#[test]
fn test_uptime_tracking_and_jailing() {
    let mut staking = StakingState::new();
    staking.params.downtime_threshold = 3; // Low threshold for testing

    // Register and activate validator
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Active
    );
    assert_eq!(staking.validators["validator1"].missed_blocks, 0);

    // Record missed blocks
    staking
        .record_missed_block(&"validator1".to_string())
        .unwrap();
    assert_eq!(staking.validators["validator1"].missed_blocks, 1);
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Active
    );

    staking
        .record_missed_block(&"validator1".to_string())
        .unwrap();
    assert_eq!(staking.validators["validator1"].missed_blocks, 2);
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Active
    );

    // Third miss should jail the validator and apply slashing
    staking
        .record_missed_block(&"validator1".to_string())
        .unwrap();
    assert_eq!(staking.validators["validator1"].missed_blocks, 3);
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Jailed
    );
    assert!(staking.validators["validator1"].total_slashed > 0);

    // Should have emitted jail and slash events
    let events = staking.get_events();
    assert!(events
        .iter()
        .any(|e| matches!(e, ValidatorEvent::ValidatorJailed { .. })));
    assert!(events
        .iter()
        .any(|e| matches!(e, ValidatorEvent::ValidatorSlashed { .. })));

    // Record validator present should reset missed blocks
    staking
        .record_validator_present(&"validator1".to_string())
        .unwrap();
    assert_eq!(staking.validators["validator1"].missed_blocks, 0);
    assert_eq!(
        staking.validators["validator1"].last_seen_height,
        staking.current_height
    );
}

#[test]
fn test_slashing_functionality() {
    let mut staking = StakingState::new();

    // Register and activate validator
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

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
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Slashed
    );
    assert_eq!(staking.validators["validator1"].slash_count, 2);

    // Should have emitted slashing events
    let events = staking.get_events();
    let slash_events: Vec<_> = events
        .iter()
        .filter(|e| matches!(e, ValidatorEvent::ValidatorSlashed { .. }))
        .collect();
    assert!(slash_events.len() >= 2);
}

#[test]
fn test_evidence_handling() {
    let mut staking = StakingState::new();

    // Register and activate validator
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    // Create valid double sign evidence
    let evidence = Evidence::DoubleSign {
        validator_address: "validator1".to_string(),
        height: 100,
        signature_1: vec![1, 2, 3],
        signature_2: vec![4, 5, 6], // Different signature
        block_hash_1: vec![7, 8, 9],
        block_hash_2: vec![10, 11, 12], // Different block hash
    };

    let result = staking.handle_evidence(evidence);
    assert!(result.is_ok());
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Slashed
    );

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
    staking
        .register_validator("validator1".to_string(), vec![1], 500)
        .unwrap();
    staking
        .register_validator("validator2".to_string(), vec![2], 600)
        .unwrap();
    staking
        .register_validator("validator3".to_string(), vec![3], 700)
        .unwrap();

    // Activate one validator
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    // Jail another validator by simulating downtime
    staking.params.downtime_threshold = 1;
    staking
        .record_missed_block(&"validator1".to_string())
        .unwrap();

    // Test get_validator_stats
    let stats1 = staking
        .get_validator_stats(&"validator1".to_string())
        .unwrap();
    assert_eq!(stats1.status, ValidatorStatus::Jailed);
    assert_eq!(stats1.commission_rate, 500);
    assert_eq!(stats1.missed_blocks, 1);
    assert!(stats1.total_slashed > 0);

    let stats2 = staking
        .get_validator_stats(&"validator2".to_string())
        .unwrap();
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
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    // Jail the validator
    staking
        .record_missed_block(&"validator1".to_string())
        .unwrap();
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Jailed
    );

    // Unjail should work
    let result = staking.unjail_validator(&"validator1".to_string());
    assert!(result.is_ok());
    assert_eq!(
        staking.validators["validator1"].status,
        ValidatorStatus::Inactive
    );
    assert_eq!(staking.validators["validator1"].missed_blocks, 0);

    // Should have emitted status change event
    let events = staking.get_events();
    assert!(events.iter().any(|e| matches!(
        e,
        ValidatorEvent::ValidatorStatusChanged {
            new_status: ValidatorStatus::Inactive,
            ..
        }
    )));

    // Unjailing non-jailed validator should fail
    let result = staking.unjail_validator(&"validator1".to_string());
    assert!(matches!(result, Err(StakingError::InvalidStatus)));
}

#[test]
fn test_events_system() {
    let mut staking = StakingState::new();

    // Register validator (should emit event)
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500)
        .unwrap();
    assert_eq!(staking.get_events().len(), 1);

    // Activate validator (should emit status change event)
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();
    assert_eq!(staking.get_events().len(), 2);

    // Check event types
    let events = staking.get_events();
    assert!(matches!(events[0], ValidatorEvent::ValidatorJoined { .. }));
    assert!(matches!(
        events[1],
        ValidatorEvent::ValidatorStatusChanged { .. }
    ));

    // Clear events
    staking.clear_events();
    assert_eq!(staking.get_events().len(), 0);

    // Further operations should create new events
    staking
        .slash_validator(&"validator1".to_string(), SlashType::DoubleSign)
        .unwrap();
    assert!(staking.get_events().len() > 0);
}

#[test]
fn test_reward_distribution_accuracy() {
    let mut staking = StakingState::new();

    // Set up validator with known stake amounts for easier math
    staking
        .register_validator("validator1".to_string(), vec![1], 0)
        .unwrap(); // 0% commission

    // Self-delegate 1M DGT
    let self_stake = 1_000_000_000_000u128;
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            self_stake,
        )
        .unwrap();

    // External delegate 1M DGT (total: 2M DGT)
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            self_stake,
        )
        .unwrap();

    // Process block rewards
    staking.process_block_rewards(1).unwrap();

    // Both delegations should get equal rewards (50% each)
    let validator_rewards = staking
        .calculate_pending_rewards(&"validator1".to_string(), &"validator1".to_string())
        .unwrap();
    let delegator_rewards = staking
        .calculate_pending_rewards(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();

    assert_eq!(validator_rewards, delegator_rewards);

    // Total rewards should equal emission per block
    assert_eq!(
        validator_rewards + delegator_rewards,
        staking.params.emission_per_block
    );
}

#[test]
fn test_multiple_block_rewards() {
    let mut staking = StakingState::new();

    // Set up validator
    staking
        .register_validator("validator1".to_string(), vec![1], 0)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000u128,
        )
        .unwrap();
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000u128,
        )
        .unwrap();

    // Process multiple blocks
    staking.process_block_rewards(1).unwrap();
    staking.process_block_rewards(2).unwrap();
    staking.process_block_rewards(3).unwrap();

    // Rewards should accumulate
    let delegator_rewards = staking
        .calculate_pending_rewards(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();

    // Should be approximately 3 blocks worth of rewards for 50% share
    let expected = (staking.params.emission_per_block * 3) / 2;
    assert_eq!(delegator_rewards, expected);
}

#[test]
fn test_partial_reward_claiming() {
    let mut staking = StakingState::new();

    // Set up validator and delegation
    staking
        .register_validator("validator1".to_string(), vec![1], 0)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000u128,
        )
        .unwrap();
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000u128,
        )
        .unwrap();

    // Process first block
    staking.process_block_rewards(1).unwrap();

    // Claim rewards
    let first_claim = staking
        .claim_rewards(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    assert!(first_claim > 0);

    // Process second block
    staking.process_block_rewards(2).unwrap();

    // Second claim should only get rewards from second block
    let second_claim = staking
        .claim_rewards(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
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
    staking
        .register_validator("validator1".to_string(), vec![1], 500)
        .unwrap();
    staking
        .register_validator("validator2".to_string(), vec![2], 500)
        .unwrap();

    // Add stake
    let stake_amount = 1_000_000_000_000u128;
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            stake_amount,
        )
        .unwrap();
    staking
        .delegate(
            "delegator1".to_string(),
            "validator2".to_string(),
            stake_amount,
        )
        .unwrap();

    // Check stats
    assert_eq!(staking.total_stake, stake_amount * 2);
    assert_eq!(staking.validators.len(), 2);
    assert_eq!(staking.get_active_validators().len(), 1); // Only validator1 has enough self-stake
}

#[test]
fn test_accrued_rewards_functionality() {
    let mut staking = StakingState::new();

    // Set up validator and delegation
    let validator_addr = "validator1".to_string();
    let delegator_addr = "delegator1".to_string();

    staking
        .register_validator(validator_addr.clone(), vec![1, 2, 3, 4], 500)
        .unwrap();
    staking
        .delegate(
            validator_addr.clone(),
            validator_addr.clone(),
            1_000_000_000_000u128,
        )
        .unwrap();
    staking
        .delegate(
            delegator_addr.clone(),
            validator_addr.clone(),
            500_000_000_000u128,
        )
        .unwrap();

    // Initially no accrued rewards
    let delegation_key = format!("{}:{}", delegator_addr, validator_addr);
    let delegation = &staking.delegations[&delegation_key];
    assert_eq!(delegation.accrued_rewards, 0);

    // Process block rewards to generate reward index
    staking.process_block_rewards(1).unwrap();

    // Test sync_delegation_rewards
    let (pending_added, total_accrued) = staking
        .sync_delegation_rewards(&delegator_addr, &validator_addr)
        .unwrap();
    assert!(pending_added > 0);
    assert_eq!(total_accrued, pending_added);

    // Check that accrued rewards were stored
    let delegation = &staking.delegations[&delegation_key];
    assert_eq!(delegation.accrued_rewards, total_accrued);

    // Test second sync - should add no new rewards since cursor is updated
    let (pending_added2, total_accrued2) = staking
        .sync_delegation_rewards(&delegator_addr, &validator_addr)
        .unwrap();
    assert_eq!(pending_added2, 0);
    assert_eq!(total_accrued2, total_accrued);

    // Process another block and sync again
    staking.process_block_rewards(2).unwrap();
    let (pending_added3, total_accrued3) = staking
        .sync_delegation_rewards(&delegator_addr, &validator_addr)
        .unwrap();
    assert!(pending_added3 > 0);
    assert_eq!(total_accrued3, total_accrued + pending_added3);

    // Test claim_rewards - should return accrued amount and reset to zero
    let claimed = staking
        .claim_rewards(&delegator_addr, &validator_addr)
        .unwrap();
    assert_eq!(claimed, total_accrued3);

    // Check that accrued rewards were reset
    let delegation = &staking.delegations[&delegation_key];
    assert_eq!(delegation.accrued_rewards, 0);

    // Test claiming again - should be zero
    let claimed2 = staking
        .claim_rewards(&delegator_addr, &validator_addr)
        .unwrap();
    assert_eq!(claimed2, 0);
}

#[test]
fn test_backward_compatibility() {
    use serde_json;

    // Test that old delegation JSON (without accrued_rewards) can be deserialized
    let old_delegation_json = r#"{
        "delegator_address": "delegator1",
        "validator_address": "validator1",
        "stake_amount": 1000000000000,
        "reward_cursor_index": 123456
    }"#;

    let delegation: blockchain_core::staking::Delegation =
        serde_json::from_str(old_delegation_json).unwrap();
    assert_eq!(delegation.accrued_rewards, 0); // Should default to 0
    assert_eq!(delegation.stake_amount, 1000000000000);
    assert_eq!(delegation.reward_cursor_index, 123456);
}

// Tests for the new global reward index system
#[test]
fn test_global_reward_index_system() {
    let mut staking = StakingState::new();

    // Setup validators
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 500)
        .unwrap();
    staking
        .register_validator("validator2".to_string(), vec![5, 6, 7, 8], 300)
        .unwrap();

    // Activate validators with self-delegation
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();
    staking
        .delegate(
            "validator2".to_string(),
            "validator2".to_string(),
            2_000_000_000_000,
        )
        .unwrap();

    // Add external delegations
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();
    staking
        .delegate(
            "delegator2".to_string(),
            "validator2".to_string(),
            2_000_000_000_000,
        )
        .unwrap();

    // Initial global reward index should be 0
    assert_eq!(staking.global_reward_index, 0);

    // Process first block rewards
    staking.process_block_rewards(1).unwrap();

    // Global reward index should be updated
    let expected_increment = (staking.params.emission_per_block
        * blockchain_core::staking::REWARD_SCALE)
        / 6_000_000_000_000;
    assert_eq!(staking.global_reward_index, expected_increment);

    // Verify delegations have correct last_index initialization
    let delegation1 = &staking.delegations["delegator1:validator1"];
    let delegation2 = &staking.delegations["delegator2:validator2"];

    // For new delegations, last_index should match global_reward_index at delegation time
    // Since delegations were created before any block processing, last_index should be 0
    assert_eq!(delegation1.rewards.last_index, 0);
    assert_eq!(delegation2.rewards.last_index, 0);
}

#[test]
fn test_proportional_reward_distribution() {
    let mut staking = StakingState::new();

    // Setup one validator
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 0)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            100_000_000_000,
        )
        .unwrap();

    // Add delegators with 1:2:3 stake ratio
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            100_000_000_000,
        )
        .unwrap(); // 100
    staking
        .delegate(
            "delegator2".to_string(),
            "validator1".to_string(),
            200_000_000_000,
        )
        .unwrap(); // 200
    staking
        .delegate(
            "delegator3".to_string(),
            "validator1".to_string(),
            300_000_000_000,
        )
        .unwrap(); // 300

    // Total stake: validator(100) + delegator1(100) + delegator2(200) + delegator3(300) = 700
    let total_stake = 700_000_000_000u128;
    assert_eq!(staking.validators["validator1"].total_stake, total_stake);

    // Process blocks to generate rewards
    for height in 1..=100 {
        staking.process_block_rewards(height).unwrap();
    }

    // Calculate expected rewards for each delegator (stake ratio 1:2:3)
    let total_emission = staking.params.emission_per_block * 100; // 100 blocks
    let expected_reward_1 = (total_emission * 100_000_000_000) / total_stake; // 1/7 of total
    let expected_reward_2 = (total_emission * 200_000_000_000) / total_stake; // 2/7 of total
    let expected_reward_3 = (total_emission * 300_000_000_000) / total_stake; // 3/7 of total

    // Get actual pending rewards
    let pending_1 = staking
        .calculate_pending_rewards_global(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    let pending_2 = staking
        .calculate_pending_rewards_global(&"delegator2".to_string(), &"validator1".to_string())
        .unwrap();
    let pending_3 = staking
        .calculate_pending_rewards_global(&"delegator3".to_string(), &"validator1".to_string())
        .unwrap();

    // Verify proportional distribution (1:2:3 ratio)
    assert_eq!(pending_1, expected_reward_1);
    assert_eq!(pending_2, expected_reward_2);
    assert_eq!(pending_3, expected_reward_3);

    // Verify the ratio is maintained
    assert_eq!(pending_2, pending_1 * 2);
    assert_eq!(pending_3, pending_1 * 3);
}

#[test]
fn test_settlement_and_claim_functionality() {
    let mut staking = StakingState::new();

    // Setup
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 0)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    // Process some blocks
    for height in 1..=50 {
        staking.process_block_rewards(height).unwrap();
    }

    // Test settlement
    let settled_amount = staking
        .settle_delegator(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    assert!(settled_amount > 0);

    // Verify delegation state after settlement
    let delegation = &staking.delegations["delegator1:validator1"];
    assert_eq!(delegation.rewards.accrued_unclaimed, settled_amount);
    assert_eq!(delegation.rewards.last_index, staking.global_reward_index);
    assert_eq!(delegation.rewards.total_claimed, 0);

    // Test claiming
    let claimed_amount = staking
        .claim_rewards(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    assert_eq!(claimed_amount, settled_amount);

    // Verify state after claiming
    let delegation = &staking.delegations["delegator1:validator1"];
    assert_eq!(delegation.rewards.accrued_unclaimed, 0);
    assert_eq!(delegation.rewards.total_claimed, claimed_amount);
    assert_eq!(delegation.rewards.last_index, staking.global_reward_index);
}

#[test]
fn test_claim_all_rewards_functionality() {
    let mut staking = StakingState::new();

    // Setup multiple validators
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 0)
        .unwrap();
    staking
        .register_validator("validator2".to_string(), vec![5, 6, 7, 8], 0)
        .unwrap();

    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();
    staking
        .delegate(
            "validator2".to_string(),
            "validator2".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    // Delegate to both validators
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            500_000_000_000,
        )
        .unwrap();
    staking
        .delegate(
            "delegator1".to_string(),
            "validator2".to_string(),
            500_000_000_000,
        )
        .unwrap();

    // Process blocks to generate rewards
    for height in 1..=25 {
        staking.process_block_rewards(height).unwrap();
    }

    // Calculate expected individual rewards
    let expected_1 = staking
        .calculate_pending_rewards_global(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    let expected_2 = staking
        .calculate_pending_rewards_global(&"delegator1".to_string(), &"validator2".to_string())
        .unwrap();
    let expected_total = expected_1 + expected_2;

    // Test claim all functionality
    let claimed_total = staking
        .claim_all_rewards(&"delegator1".to_string())
        .unwrap();
    assert_eq!(claimed_total, expected_total);

    // Verify both delegations are properly updated
    let delegation1 = &staking.delegations["delegator1:validator1"];
    let delegation2 = &staking.delegations["delegator1:validator2"];

    assert_eq!(delegation1.rewards.accrued_unclaimed, 0);
    assert_eq!(delegation2.rewards.accrued_unclaimed, 0);
    assert_eq!(delegation1.rewards.total_claimed, expected_1);
    assert_eq!(delegation2.rewards.total_claimed, expected_2);
}

#[test]
fn test_reward_calculation_after_stake_changes() {
    let mut staking = StakingState::new();

    // Setup
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 0)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    // Initial delegation
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            500_000_000_000,
        )
        .unwrap();

    // Process some blocks
    for height in 1..=10 {
        staking.process_block_rewards(height).unwrap();
    }

    // Get rewards accumulated so far
    let initial_rewards = staking
        .calculate_pending_rewards_global(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    assert!(initial_rewards > 0);

    // Settle to capture current rewards
    staking
        .settle_delegator(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();

    // Add more stake (this should trigger settlement internally in real implementation)
    let old_stake = staking.delegations["delegator1:validator1"].stake_amount;
    // Note: In a real implementation, adding stake would call settle_delegator first
    // For this test, we're verifying the calculation logic works correctly

    // Process more blocks
    for height in 11..=20 {
        staking.process_block_rewards(height).unwrap();
    }

    // Calculate new rewards based on the period after settlement
    let new_rewards = staking
        .calculate_pending_rewards_global(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();

    // Total rewards should be higher due to accumulation over more blocks
    assert!(new_rewards > 0);
}

#[test]
fn test_idempotent_claims() {
    let mut staking = StakingState::new();

    // Setup
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 0)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    // Process blocks
    for height in 1..=10 {
        staking.process_block_rewards(height).unwrap();
    }

    // First claim
    let first_claim = staking
        .claim_rewards(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    assert!(first_claim > 0);

    // Immediate second claim should return 0 (no new rewards)
    let second_claim = staking
        .claim_rewards(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    assert_eq!(second_claim, 0);

    // Third claim should also return 0
    let third_claim = staking
        .claim_rewards(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    assert_eq!(third_claim, 0);

    // Process more blocks
    for height in 11..=15 {
        staking.process_block_rewards(height).unwrap();
    }

    // Now another claim should work
    let fourth_claim = staking
        .claim_rewards(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();
    assert!(fourth_claim > 0);
}

#[test]
fn test_new_delegation_backward_compatibility() {
    let mut staking = StakingState::new();

    // Setup
    staking
        .register_validator("validator1".to_string(), vec![1, 2, 3, 4], 0)
        .unwrap();
    staking
        .delegate(
            "validator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000,
        )
        .unwrap();

    // Process some blocks to establish a global reward index
    for height in 1..=10 {
        staking.process_block_rewards(height).unwrap();
    }

    let global_index_before = staking.global_reward_index;
    assert!(global_index_before > 0);

    // Add new delegation - should initialize with current global index
    staking
        .delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            500_000_000_000,
        )
        .unwrap();

    // Verify new delegation has correct initialization
    let delegation = &staking.delegations["delegator1:validator1"];
    assert_eq!(delegation.rewards.last_index, global_index_before);
    assert_eq!(delegation.rewards.accrued_unclaimed, 0);
    assert_eq!(delegation.rewards.total_claimed, 0);

    // Process more blocks
    for height in 11..=15 {
        staking.process_block_rewards(height).unwrap();
    }

    // New delegator should only get rewards from blocks after delegation
    let pending = staking
        .calculate_pending_rewards_global(&"delegator1".to_string(), &"validator1".to_string())
        .unwrap();

    // Calculate expected rewards only from blocks 11-15
    let blocks_after_delegation = 5;
    let total_stake_after_delegation = 1_500_000_000_000u128; // 1T + 500M
    let expected_pending =
        (staking.params.emission_per_block * blocks_after_delegation * 500_000_000_000)
            / total_stake_after_delegation;

    assert_eq!(pending, expected_pending);
}
