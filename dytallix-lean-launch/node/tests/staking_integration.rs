// Integration test for the staking module to verify implementation
// This test demonstrates the core functionality working end-to-end

use dytallix_lean_node::runtime::staking::{
    StakingState, StakingConfig, MsgRegisterValidator, MsgDelegate,
    ValidatorStatus, StakingError, proportional_split
};

#[test]
fn test_staking_integration() {
    // Create staking state with custom config
    let config = StakingConfig {
        max_validators: 3,  // Low limit for testing
        r_block_drt: 10_000,
        min_self_bond_dgt: 1_000_000,
    };
    let mut staking = StakingState::with_config(config);

    // Test 1: Register validators
    let validators = vec!["alice", "bob", "charlie", "dave"];
    for (i, name) in validators.iter().enumerate() {
        let msg = MsgRegisterValidator {
            operator: name.to_string(),
            consensus_pk: vec![i as u8 + 1],
            commission_bps: 500 + (i as u16 * 100), // Different commissions
            details: Some(format!("Validator {}", name)),
        };
        
        let result = staking.register_validator(msg);
        assert!(result.is_ok(), "Failed to register validator {}", name);
        
        let validator = staking.validators.get(*name).unwrap();
        assert_eq!(validator.status, ValidatorStatus::Registered);
    }

    // Test 2: Self-delegate to activate validators
    let self_bonds = vec![2_000_000, 1_500_000, 1_200_000, 800_000]; // dave won't activate (below min)
    
    for (name, amount) in validators.iter().zip(self_bonds.iter()) {
        let msg = MsgDelegate {
            delegator: name.to_string(),
            validator: name.to_string(),
            amount: *amount,
            denom: "uDGT".to_string(),
            nonce: 1,
        };
        
        let result = staking.delegate(msg);
        assert!(result.is_ok(), "Failed to self-delegate for {}", name);
    }

    // Test 3: Check active validators (should be top 3 by stake, dave excluded due to min bond)
    let active = staking.get_active_validators_ordered();
    assert_eq!(active.len(), 3, "Should have exactly 3 active validators");
    
    // Should be ordered by stake: alice (2M), bob (1.5M), charlie (1.2M)
    assert_eq!(active[0].operator_address, "alice");
    assert_eq!(active[1].operator_address, "bob");
    assert_eq!(active[2].operator_address, "charlie");
    
    // Dave should still be registered but not active
    let dave = staking.validators.get("dave").unwrap();
    assert_eq!(dave.status, ValidatorStatus::Registered);

    // Test 4: Add external delegation
    let msg = MsgDelegate {
        delegator: "external_delegator".to_string(),
        validator: "charlie".to_string(),
        amount: 1_000_000, // This should make charlie's total 2.2M, overtaking bob
        denom: "uDGT".to_string(),
        nonce: 1,
    };
    staking.delegate(msg).unwrap();

    // Recheck ordering - should now be alice, charlie, bob
    let active = staking.get_active_validators_ordered();
    assert_eq!(active[0].operator_address, "alice");    // 2M
    assert_eq!(active[1].operator_address, "charlie");  // 2.2M total
    assert_eq!(active[2].operator_address, "bob");      // 1.5M

    // Test 5: Distribute rewards
    staking.distribute_block_rewards(1).unwrap();
    
    // Check that rewards were distributed proportionally
    let alice_val = staking.validators.get("alice").unwrap();
    let charlie_val = staking.validators.get("charlie").unwrap();
    let bob_val = staking.validators.get("bob").unwrap();
    
    assert!(alice_val.accumulated_rewards_udrt > 0);
    assert!(charlie_val.accumulated_rewards_udrt > 0);
    assert!(bob_val.accumulated_rewards_udrt > 0);
    
    // Charlie should have the most rewards (highest stake)
    assert!(charlie_val.accumulated_rewards_udrt >= alice_val.accumulated_rewards_udrt);
    
    // Test 6: Test error conditions
    
    // Duplicate registration should fail
    let duplicate_msg = MsgRegisterValidator {
        operator: "alice".to_string(),
        consensus_pk: vec![99],
        commission_bps: 500,
        details: None,
    };
    assert_eq!(staking.register_validator(duplicate_msg), Err(StakingError::AlreadyRegistered));
    
    // Invalid commission should fail
    let invalid_commission = MsgRegisterValidator {
        operator: "eve".to_string(),
        consensus_pk: vec![99],
        commission_bps: 15_000, // > 10,000
        details: None,
    };
    assert_eq!(staking.register_validator(invalid_commission), Err(StakingError::InvalidAmount));
    
    // Duplicate delegation should fail
    let duplicate_delegation = MsgDelegate {
        delegator: "external_delegator".to_string(),
        validator: "charlie".to_string(),
        amount: 500_000,
        denom: "uDGT".to_string(),
        nonce: 2,
    };
    assert_eq!(staking.delegate(duplicate_delegation), Err(StakingError::AlreadyDelegated));
    
    // Invalid denom should fail
    let invalid_denom = MsgDelegate {
        delegator: "new_delegator".to_string(),
        validator: "alice".to_string(),
        amount: 500_000,
        denom: "BTC".to_string(),
        nonce: 1,
    };
    assert_eq!(staking.delegate(invalid_denom), Err(StakingError::InvalidDenom));

    println!("✓ All staking integration tests passed!");
}

#[test]
fn test_proportional_split_function() {
    // Test exact division
    let weights = vec![25, 25, 25, 25];
    let rewards = proportional_split(100, &weights);
    assert_eq!(rewards, vec![25, 25, 25, 25]);
    
    // Test with remainder
    let weights = vec![100, 200, 300]; // Total 600
    let rewards = proportional_split(1000, &weights);
    // Expected: 166, 333, 500 (with remainder distributed to first validators)
    assert_eq!(rewards[0] + rewards[1] + rewards[2], 1000);
    assert!(rewards[2] > rewards[1]); // Highest weight gets most
    assert!(rewards[1] > rewards[0]); // Middle weight gets middle
    
    // Test edge cases
    assert_eq!(proportional_split(0, &weights), vec![0, 0, 0]);
    assert_eq!(proportional_split(100, &[]), vec![]);
    assert_eq!(proportional_split(100, &vec![0, 0, 0]), vec![0, 0, 0]);
    
    println!("✓ Proportional split tests passed!");
}

#[test]
fn test_environment_variable_config() {
    // Test that default config uses expected values
    let config = StakingConfig::default();
    assert_eq!(config.max_validators, 50);
    assert_eq!(config.r_block_drt, 10_000);
    assert_eq!(config.min_self_bond_dgt, 1_000_000);
    
    println!("✓ Configuration tests passed!");
}