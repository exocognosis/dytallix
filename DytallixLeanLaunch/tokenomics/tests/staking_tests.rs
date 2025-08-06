//! Staking system tests

use dytallix_tokenomics::staking::*;
use dytallix_tokenomics::config::*;
use rust_decimal::Decimal;

#[cfg(test)]
mod staking_tests {
    use super::*;

    fn create_test_staking_config() -> StakingConfig {
        StakingConfig {
            minimum_stake: 1_000_000_000_000_000_000, // 1 DGT
            unbonding_period: 21 * 24 * 60 * 60, // 21 days
            max_validators: 100,
            slashing: SlashingConfig {
                double_signing_penalty: Decimal::from_str_exact("0.05").unwrap(),
                downtime_penalty: Decimal::from_str_exact("0.01").unwrap(),
                governance_violation_penalty: Decimal::from_str_exact("0.10").unwrap(),
            },
        }
    }

    #[test]
    fn test_validator_lifecycle() {
        let config = create_test_staking_config();
        let mut manager = StakingManager::new(config);
        
        // Create validator
        manager.create_validator(
            "validator1".to_string(),
            10_000_000_000_000_000_000, // 10 DGT
            Decimal::from_str_exact("0.10").unwrap(), // 10% commission
            1,
        ).unwrap();
        
        let validator = manager.get_validator(&"validator1".to_string()).unwrap();
        assert_eq!(validator.self_stake, 10_000_000_000_000_000_000);
        assert_eq!(validator.total_stake, 10_000_000_000_000_000_000);
        assert_eq!(validator.commission_rate, Decimal::from_str_exact("0.10").unwrap());
        assert_eq!(validator.status, ValidatorStatus::Active);
        
        // Check validator is in active set
        assert!(manager.is_validator_active(&"validator1".to_string()));
        assert_eq!(manager.get_active_validators().len(), 1);
    }

    #[test]
    fn test_delegation_flow() {
        let config = create_test_staking_config();
        let mut manager = StakingManager::new(config);
        
        // Create validator
        manager.create_validator(
            "validator1".to_string(),
            5_000_000_000_000_000_000,
            Decimal::from_str_exact("0.10").unwrap(),
            1,
        ).unwrap();
        
        // Delegate to validator
        manager.delegate(
            "delegator1".to_string(),
            "validator1".to_string(),
            3_000_000_000_000_000_000,
            2,
        ).unwrap();
        
        // Check delegation
        let delegations = manager.get_delegations(&"delegator1".to_string()).unwrap();
        assert_eq!(delegations.len(), 1);
        assert_eq!(delegations[0].amount, 3_000_000_000_000_000_000);
        assert_eq!(delegations[0].validator, "validator1".to_string());
        
        // Check validator total stake increased
        let validator = manager.get_validator(&"validator1".to_string()).unwrap();
        assert_eq!(validator.total_stake, 8_000_000_000_000_000_000); // 5 + 3
        
        // Check total staked
        assert_eq!(manager.get_total_staked(), 8_000_000_000_000_000_000);
        assert_eq!(manager.get_total_delegated(&"delegator1".to_string()), 3_000_000_000_000_000_000);
    }

    #[test]
    fn test_unbonding_flow() {
        let config = create_test_staking_config();
        let mut manager = StakingManager::new(config);
        
        // Setup validator and delegation
        manager.create_validator("validator1".to_string(), 5_000_000_000_000_000_000, Decimal::from_str_exact("0.10").unwrap(), 1).unwrap();
        manager.delegate("delegator1".to_string(), "validator1".to_string(), 3_000_000_000_000_000_000, 2).unwrap();
        
        // Begin unbonding
        manager.begin_unbonding(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000_000_000,
            1000, // current timestamp
            3,
        ).unwrap();
        
        // Check unbonding delegation created
        let unbondings = manager.get_unbonding_delegations(&"delegator1".to_string()).unwrap();
        assert_eq!(unbondings.len(), 1);
        assert_eq!(unbondings[0].amount, 1_000_000_000_000_000_000);
        assert_eq!(unbondings[0].completion_timestamp, 1000 + 21 * 24 * 60 * 60);
        
        // Check delegation amount reduced
        let delegations = manager.get_delegations(&"delegator1".to_string()).unwrap();
        assert_eq!(delegations[0].amount, 2_000_000_000_000_000_000);
        
        // Check validator total stake reduced
        let validator = manager.get_validator(&"validator1".to_string()).unwrap();
        assert_eq!(validator.total_stake, 7_000_000_000_000_000_000);
        
        // Complete unbonding after period
        let completion_time = 1000 + 21 * 24 * 60 * 60 + 1;
        let completed = manager.complete_unbonding(completion_time).unwrap();
        assert_eq!(completed.len(), 1);
        assert_eq!(completed[0].0, "delegator1".to_string());
        assert_eq!(completed[0].1, 1_000_000_000_000_000_000);
        
        // Check unbonding delegation removed
        assert!(manager.get_unbonding_delegations(&"delegator1".to_string()).is_none());
    }

    #[test]
    fn test_slashing() {
        let config = create_test_staking_config();
        let mut manager = StakingManager::new(config);
        
        // Create validator with stake
        manager.create_validator("validator1".to_string(), 10_000_000_000_000_000_000, Decimal::from_str_exact("0.10").unwrap(), 1).unwrap();
        
        // Slash for double signing (5% penalty)
        let slashed = manager.slash_validator(
            "validator1".to_string(),
            SlashingReason::DoubleSigning,
            2,
            1000,
        ).unwrap();
        
        assert_eq!(slashed, 500_000_000_000_000_000); // 5% of 10 DGT
        
        let validator = manager.get_validator(&"validator1".to_string()).unwrap();
        assert_eq!(validator.total_stake, 9_500_000_000_000_000_000);
        assert_eq!(validator.status, ValidatorStatus::Jailed); // Jailed for serious offense
        assert_eq!(validator.penalty_count, 1);
        
        // Check slashing event recorded
        assert_eq!(manager.slashing_events.len(), 1);
        assert_eq!(manager.slashing_events[0].amount, 500_000_000_000_000_000);
        assert_eq!(manager.slashing_events[0].reason, SlashingReason::DoubleSigning);
    }

    #[test]
    fn test_validator_selection() {
        let config = create_test_staking_config();
        let mut manager = StakingManager::new(config);
        
        // Create multiple validators with different stakes
        manager.create_validator("validator1".to_string(), 10_000_000_000_000_000_000, Decimal::from_str_exact("0.10").unwrap(), 1).unwrap();
        manager.create_validator("validator2".to_string(), 15_000_000_000_000_000_000, Decimal::from_str_exact("0.10").unwrap(), 2).unwrap();
        manager.create_validator("validator3".to_string(), 5_000_000_000_000_000_000, Decimal::from_str_exact("0.10").unwrap(), 3).unwrap();
        
        let active_validators = manager.get_active_validators();
        assert_eq!(active_validators.len(), 3);
        
        // Should be sorted by stake (highest first)
        assert_eq!(active_validators[0], "validator2".to_string()); // 15 DGT
        assert_eq!(active_validators[1], "validator1".to_string()); // 10 DGT
        assert_eq!(active_validators[2], "validator3".to_string()); // 5 DGT
    }

    #[test]
    fn test_reward_distribution() {
        let config = create_test_staking_config();
        let mut staking_manager = StakingManager::new(config);
        let mut reward_distributor = RewardDistributor::new();
        
        // Setup validators and delegations
        staking_manager.create_validator("validator1".to_string(), 10_000_000_000_000_000_000, Decimal::from_str_exact("0.10").unwrap(), 1).unwrap();
        staking_manager.delegate("delegator1".to_string(), "validator1".to_string(), 5_000_000_000_000_000_000, 2).unwrap();
        
        // Distribute rewards
        let distribution = reward_distributor.distribute_rewards(
            &staking_manager,
            1_000_000_000_000_000_000, // 1 DRT rewards
            10,
            1000,
        ).unwrap();
        
        assert_eq!(distribution.total_rewards, 1_000_000_000_000_000_000);
        assert_eq!(distribution.validator_rewards.len(), 1);
        
        let validator_reward = distribution.validator_rewards.get("validator1").unwrap();
        assert_eq!(validator_reward.total_reward, 1_000_000_000_000_000_000);
        assert_eq!(validator_reward.commission, 100_000_000_000_000_000); // 10% commission
        assert_eq!(validator_reward.delegator_rewards, 900_000_000_000_000_000);
        
        // Check accumulated rewards
        let validator_accumulated = reward_distributor.get_accumulated_rewards(&"validator1".to_string());
        let delegator_accumulated = reward_distributor.get_accumulated_rewards(&"delegator1".to_string());
        
        // Validator gets commission + their share of delegator rewards
        // Total stake: 15 DGT, validator self-stake: 10 DGT, delegator: 5 DGT
        // Validator gets: 100 (commission) + (10/15 * 900) = 100 + 600 = 700
        // Delegator gets: (5/15 * 900) = 300
        assert_eq!(validator_accumulated, 700_000_000_000_000_000);
        assert_eq!(delegator_accumulated, 300_000_000_000_000_000);
    }

    #[test]
    fn test_error_conditions() {
        let config = create_test_staking_config();
        let mut manager = StakingManager::new(config);
        
        // Test creating validator with insufficient stake
        let result = manager.create_validator(
            "validator1".to_string(),
            500_000_000_000_000_000, // Less than minimum
            Decimal::from_str_exact("0.10").unwrap(),
            1,
        );
        assert!(result.is_err());
        
        // Test delegating to non-existent validator
        let result = manager.delegate(
            "delegator1".to_string(),
            "nonexistent".to_string(),
            1_000_000_000_000_000_000,
            1,
        );
        assert!(result.is_err());
        
        // Test unbonding non-existent delegation
        let result = manager.begin_unbonding(
            "delegator1".to_string(),
            "validator1".to_string(),
            1_000_000_000_000_000_000,
            1000,
            2,
        );
        assert!(result.is_err());
        
        // Test slashing non-existent validator
        let result = manager.slash_validator(
            "nonexistent".to_string(),
            SlashingReason::DoubleSigning,
            1,
            1000,
        );
        assert!(result.is_err());
    }
}