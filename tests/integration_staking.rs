// Integration tests for the staking system
// Tests the full workflow from validator registration to reward claiming

use std::collections::HashMap;
use blockchain_core::staking::{StakingState, ValidatorStatus, StakingError};

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