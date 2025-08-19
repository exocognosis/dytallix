use crate::runtime::staking::{StakingState, StakingError, ValidatorStatus};

#[test]
fn test_stake_happy_path() {
    let mut staking = StakingState::new();
    
    let result = staking.stake(
        "delegator1".to_string(),
        "validator1".to_string(),
        1_000_000,
    );
    
    assert!(result.is_ok());
    assert_eq!(staking.total_stake, 1_000_000);
    assert!(staking.validators.contains_key("validator1"));
    assert_eq!(staking.validators["validator1"].stake, 1_000_000);
    assert_eq!(staking.validators["validator1"].status, ValidatorStatus::Active);
}

#[test]
fn test_unstake_happy_path() {
    let mut staking = StakingState::new();
    
    // First stake
    staking.stake("delegator1".to_string(), "validator1".to_string(), 1_000_000).unwrap();
    
    // Then unstake partial
    let result = staking.unstake("delegator1".to_string(), "validator1".to_string(), 500_000);
    
    assert!(result.is_ok());
    assert_eq!(staking.total_stake, 500_000);
    assert_eq!(staking.validators["validator1"].stake, 500_000);
}

#[test]
fn test_stake_insufficient_balance() {
    let mut staking = StakingState::new();
    
    // Try to stake zero amount
    let result = staking.stake("delegator1".to_string(), "validator1".to_string(), 0);
    
    assert!(matches!(result, Err(StakingError::ZeroAmount)));
}

#[test]
fn test_validator_set_determinism() {
    let mut staking = StakingState::new();
    
    // Add validators with different stakes
    staking.stake("val1".to_string(), "validator_a".to_string(), 3_000_000).unwrap();
    staking.stake("val2".to_string(), "validator_b".to_string(), 2_000_000).unwrap();
    staking.stake("val3".to_string(), "validator_c".to_string(), 2_000_000).unwrap(); // Tie with validator_b
    
    let validator_set = staking.get_active_validator_set();
    
    // Should be ordered by stake desc, then address asc
    assert_eq!(validator_set.len(), 3);
    assert_eq!(validator_set[0].address, "validator_a"); // Highest stake
    assert_eq!(validator_set[1].address, "validator_b"); // Same stake as c, but lexically first
    assert_eq!(validator_set[2].address, "validator_c");
}

#[test]
fn test_duplicate_delegation_rejected() {
    let mut staking = StakingState::new();
    
    // First delegation
    staking.stake("delegator1".to_string(), "validator1".to_string(), 1_000_000).unwrap();
    
    // Second delegation should fail
    let result = staking.stake("delegator1".to_string(), "validator1".to_string(), 500_000);
    
    assert!(matches!(result, Err(StakingError::DelegationAlreadyExists)));
}

#[test]
fn test_validator_set_hash_deterministic() {
    let mut staking1 = StakingState::new();
    let mut staking2 = StakingState::new();
    
    // Add same validators in different order
    staking1.stake("val1".to_string(), "validator_a".to_string(), 1_000_000).unwrap();
    staking1.stake("val2".to_string(), "validator_b".to_string(), 2_000_000).unwrap();
    
    staking2.stake("val2".to_string(), "validator_b".to_string(), 2_000_000).unwrap();
    staking2.stake("val1".to_string(), "validator_a".to_string(), 1_000_000).unwrap();
    
    // Hashes should be identical despite different insertion order
    let hash1 = staking1.compute_validator_set_hash();
    let hash2 = staking2.compute_validator_set_hash();
    
    assert_eq!(hash1, hash2);
}

#[test]
fn test_proposer_reward() {
    let mut staking = StakingState::new();
    
    let initial_emitted = staking.total_drt_emitted;
    let reward = staking.apply_proposer_reward("proposer1");
    
    assert_eq!(reward, staking.params.drt_block_reward);
    assert_eq!(staking.total_drt_emitted, initial_emitted + reward);
}

#[test]
fn test_get_delegation_stats() {
    let mut staking = StakingState::new();
    
    // Create some delegations
    staking.stake("delegator1".to_string(), "validator1".to_string(), 1_000_000).unwrap();
    staking.stake("delegator1".to_string(), "validator2".to_string(), 500_000).unwrap();
    staking.stake("delegator2".to_string(), "validator1".to_string(), 2_000_000).unwrap();
    
    // Test delegation queries
    let delegations = staking.get_delegations("delegator1");
    assert_eq!(delegations.len(), 2);
    
    let amount = staking.get_delegation("delegator1", "validator1");
    assert_eq!(amount, Some(1_000_000));
    
    let no_amount = staking.get_delegation("delegator1", "nonexistent");
    assert_eq!(no_amount, None);
    
    // Test stats
    let stats = staking.get_stats();
    assert_eq!(stats.total_stake, 3_500_000);
    assert_eq!(stats.validator_count, 2);
    assert_eq!(stats.active_validator_count, 2);
}