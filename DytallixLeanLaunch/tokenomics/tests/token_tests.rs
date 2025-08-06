//! Unit tests for token implementations

use dytallix_tokenomics::tokens::*;
use dytallix_tokenomics::config::*;
use rust_decimal::Decimal;
use std::collections::HashMap;

#[cfg(test)]
mod dgt_token_tests {
    use super::*;

    fn create_test_dgt_config() -> DgtConfig {
        DgtConfig {
            name: "Test DGT".to_string(),
            symbol: "TDGT".to_string(),
            decimals: 18,
            total_supply: 1_000_000_000_000_000_000_000_000_000, // 1B tokens
            allocation: AllocationConfig {
                community_treasury: Decimal::from_str_exact("0.40").unwrap(),
                staking_rewards: Decimal::from_str_exact("0.25").unwrap(),
                dev_team: Decimal::from_str_exact("0.15").unwrap(),
                initial_validators: Decimal::from_str_exact("0.10").unwrap(),
                ecosystem_fund: Decimal::from_str_exact("0.10").unwrap(),
            },
        }
    }

    #[test]
    fn test_dgt_token_basic_operations() {
        let config = create_test_dgt_config();
        let mut token = DgtToken::new(config);
        
        // Initialize with allocations
        let mut allocations = HashMap::new();
        allocations.insert("alice".to_string(), 500_000_000_000_000_000_000_000_000);
        allocations.insert("bob".to_string(), 500_000_000_000_000_000_000_000_000);
        
        token.initialize(allocations).unwrap();
        
        // Test basic token operations
        assert_eq!(token.balance_of(&"alice".to_string()), 500_000_000_000_000_000_000_000_000);
        assert_eq!(token.total_supply(), 1_000_000_000_000_000_000_000_000_000);
        
        // Test transfer
        token.transfer(&"alice".to_string(), &"charlie".to_string(), 100_000_000_000_000_000_000_000_000).unwrap();
        assert_eq!(token.balance_of(&"alice".to_string()), 400_000_000_000_000_000_000_000_000);
        assert_eq!(token.balance_of(&"charlie".to_string()), 100_000_000_000_000_000_000_000_000);
        
        // Test approval and transfer_from
        token.approve(&"alice".to_string(), &"bob".to_string(), 50_000_000_000_000_000_000_000_000).unwrap();
        assert_eq!(token.allowance(&"alice".to_string(), &"bob".to_string()), 50_000_000_000_000_000_000_000_000);
        
        token.transfer_from(&"bob".to_string(), &"alice".to_string(), &"dave".to_string(), 25_000_000_000_000_000_000_000_000).unwrap();
        assert_eq!(token.balance_of(&"dave".to_string()), 25_000_000_000_000_000_000_000_000);
        assert_eq!(token.allowance(&"alice".to_string(), &"bob".to_string()), 25_000_000_000_000_000_000_000_000);
    }

    #[test]
    fn test_dgt_staking_operations() {
        let config = create_test_dgt_config();
        let mut token = DgtToken::new(config);
        
        let mut allocations = HashMap::new();
        allocations.insert("alice".to_string(), 1_000_000_000_000_000_000_000_000_000);
        token.initialize(allocations).unwrap();
        
        // Test staking
        token.stake(&"alice".to_string(), 200_000_000_000_000_000_000_000_000).unwrap();
        assert_eq!(token.balance_of(&"alice".to_string()), 800_000_000_000_000_000_000_000_000);
        assert_eq!(token.staked_balance(&"alice".to_string()), 200_000_000_000_000_000_000_000_000);
        assert_eq!(token.total_staked, 200_000_000_000_000_000_000_000_000);
        
        // Test delegation
        token.delegate(&"alice".to_string(), &"validator1".to_string()).unwrap();
        assert_eq!(token.delegation_target(&"alice".to_string()), Some(&"validator1".to_string()));
        
        // Test voting power
        assert_eq!(token.voting_power(&"alice".to_string()), 200_000_000_000_000_000_000_000_000);
        assert_eq!(token.voting_power(&"validator1".to_string()), 200_000_000_000_000_000_000_000_000);
        
        // Test unstaking
        token.unstake(&"alice".to_string(), 50_000_000_000_000_000_000_000_000).unwrap();
        assert_eq!(token.staked_balance(&"alice".to_string()), 150_000_000_000_000_000_000_000_000);
        assert_eq!(token.balance_of(&"alice".to_string()), 850_000_000_000_000_000_000_000_000);
        
        // Test slashing
        token.slash(&"alice".to_string(), 10_000_000_000_000_000_000_000_000).unwrap();
        assert_eq!(token.staked_balance(&"alice".to_string()), 140_000_000_000_000_000_000_000_000);
    }

    #[test]
    fn test_dgt_error_cases() {
        let config = create_test_dgt_config();
        let mut token = DgtToken::new(config);
        
        let mut allocations = HashMap::new();
        allocations.insert("alice".to_string(), 1000);
        token.initialize(allocations).unwrap();
        
        // Test insufficient balance for transfer
        let result = token.transfer(&"alice".to_string(), &"bob".to_string(), 2000);
        assert!(result.is_err());
        
        // Test insufficient balance for staking
        let result = token.stake(&"alice".to_string(), 2000);
        assert!(result.is_err());
        
        // Test staking without sufficient balance
        let result = token.unstake(&"alice".to_string(), 100);
        assert!(result.is_err()); // No staked balance
    }
}

#[cfg(test)]
mod drt_token_tests {
    use super::*;
    use dytallix_tokenomics::config::{EmissionConfig, BurnConfig};

    fn create_test_drt_config() -> DrtConfig {
        DrtConfig {
            name: "Test DRT".to_string(),
            symbol: "TDRT".to_string(),
            decimals: 18,
            annual_inflation_rate: Decimal::from_str_exact("0.05").unwrap(),
            emission: EmissionConfig {
                block_rewards: Decimal::from_str_exact("0.60").unwrap(),
                staking_rewards: Decimal::from_str_exact("0.25").unwrap(),
                ai_module_incentives: Decimal::from_str_exact("0.10").unwrap(),
                bridge_operations: Decimal::from_str_exact("0.05").unwrap(),
            },
            burn: BurnConfig {
                transaction_fee_burn: Decimal::from_str_exact("1.00").unwrap(),
                ai_service_fee_burn: Decimal::from_str_exact("0.50").unwrap(),
                bridge_fee_burn: Decimal::from_str_exact("0.75").unwrap(),
            },
        }
    }

    #[test]
    fn test_drt_token_basic_operations() {
        let config = create_test_drt_config();
        let mut token = DrtToken::new(config);
        
        token.initialize(0).unwrap();
        
        // Test minting
        token.mint(&"alice".to_string(), 1000, 1, "mint_tx".to_string()).unwrap();
        assert_eq!(token.balance_of(&"alice".to_string()), 1000);
        assert_eq!(token.current_supply(), 1000);
        assert_eq!(token.total_minted(), 1000);
        
        // Test transfer
        token.transfer(&"alice".to_string(), &"bob".to_string(), 300).unwrap();
        assert_eq!(token.balance_of(&"alice".to_string()), 700);
        assert_eq!(token.balance_of(&"bob".to_string()), 300);
        
        // Test burning
        token.burn(&"bob".to_string(), 100, 2, "burn_tx".to_string(), "Test burn".to_string()).unwrap();
        assert_eq!(token.balance_of(&"bob".to_string()), 200);
        assert_eq!(token.current_supply(), 900);
        assert_eq!(token.total_burned(), 100);
    }

    #[test]
    fn test_drt_emission_calculation() {
        let config = create_test_drt_config();
        let mut token = DrtToken::new(config);
        
        token.initialize(0).unwrap();
        
        // Start with some supply for emission calculations
        token.mint(&"treasury".to_string(), 1_000_000, 1, "genesis".to_string()).unwrap();
        
        // Test emission calculation for 1 year
        let emission = token.calculate_emission(0, 365 * 24 * 60 * 60, 5_256_000).unwrap();
        
        // Should be approximately 5% of current supply
        let expected = 50_000; // 5% of 1,000,000
        let tolerance = 1_000; // Allow 1000 token tolerance
        assert!((emission as i128 - expected as i128).abs() < tolerance);
    }

    #[test]
    fn test_drt_burn_calculations() {
        let config = create_test_drt_config();
        let token = DrtToken::new(config);
        
        let burn_amounts = token.calculate_burn_amounts(1000, 500, 200).unwrap();
        
        assert_eq!(burn_amounts.transaction_fee_burn, 1000); // 100%
        assert_eq!(burn_amounts.ai_service_fee_burn, 250);   // 50%
        assert_eq!(burn_amounts.bridge_fee_burn, 150);       // 75%
        assert_eq!(burn_amounts.total_burn, 1400);
    }

    #[test]
    fn test_drt_emission_processing() {
        let config = create_test_drt_config();
        let mut token = DrtToken::new(config);
        
        token.initialize(0).unwrap();
        token.mint(&"treasury".to_string(), 1_000_000, 1, "genesis".to_string()).unwrap();
        
        // Process emission for first hour
        let result = token.process_emission(3600, 600, 5_256_000).unwrap();
        
        assert!(result.total_emitted > 0);
        assert!(result.block_rewards > 0);
        assert!(result.staking_rewards > 0);
        assert!(result.ai_incentives > 0);
        assert!(result.bridge_operations > 0);
        
        // Verify percentages are roughly correct
        let total = result.total_emitted;
        let block_ratio = (result.block_rewards * 100) / total;
        let staking_ratio = (result.staking_rewards * 100) / total;
        
        assert!(block_ratio >= 58 && block_ratio <= 62); // ~60%
        assert!(staking_ratio >= 23 && staking_ratio <= 27); // ~25%
    }

    #[test]
    fn test_drt_error_cases() {
        let config = create_test_drt_config();
        let mut token = DrtToken::new(config);
        
        token.initialize(0).unwrap();
        token.mint(&"alice".to_string(), 1000, 1, "mint".to_string()).unwrap();
        
        // Test insufficient balance for burn
        let result = token.burn(&"alice".to_string(), 2000, 2, "burn".to_string(), "test".to_string());
        assert!(result.is_err());
        
        // Test insufficient balance for transfer
        let result = token.transfer(&"alice".to_string(), &"bob".to_string(), 2000);
        assert!(result.is_err());
    }
}