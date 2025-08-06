//! Burning system tests

use dytallix_tokenomics::burning::*;
use dytallix_tokenomics::tokens::*;
use dytallix_tokenomics::config::*;
use rust_decimal::Decimal;

#[cfg(test)]
mod burning_tests {
    use super::*;

    fn create_test_burn_config() -> BurnConfig {
        BurnConfig {
            transaction_fee_burn: Decimal::from_str_exact("1.00").unwrap(), // 100%
            ai_service_fee_burn: Decimal::from_str_exact("0.50").unwrap(), // 50%
            bridge_fee_burn: Decimal::from_str_exact("0.75").unwrap(), // 75%
        }
    }

    fn create_test_drt_token() -> DrtToken {
        let config = DrtConfig {
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
            burn: create_test_burn_config(),
        };
        
        let mut token = DrtToken::new(config);
        token.initialize(0).unwrap();
        token
    }

    #[test]
    fn test_burn_manager_setup() {
        let config = create_test_burn_config();
        let mut burn_manager = BurnManager::new(config);
        
        // Set fee collectors
        burn_manager.set_fee_collector(burn_manager::BurnReason::TransactionFees, "tx_collector".to_string());
        burn_manager.set_fee_collector(burn_manager::BurnReason::AiServiceFees, "ai_collector".to_string());
        burn_manager.set_fee_collector(burn_manager::BurnReason::BridgeFees, "bridge_collector".to_string());
        
        // Test fee collector retrieval
        assert_eq!(burn_manager.fee_collectors.get(&burn_manager::BurnReason::TransactionFees), Some(&"tx_collector".to_string()));
    }

    #[test]
    fn test_transaction_fee_burning() {
        let mut burn_manager = BurnManager::new(create_test_burn_config());
        let mut drt_token = create_test_drt_token();
        
        burn_manager.set_fee_collector(burn_manager::BurnReason::TransactionFees, "fee_collector".to_string());
        
        // Mint tokens to fee collector
        drt_token.mint(&"fee_collector".to_string(), 10_000, 1, "mint".to_string()).unwrap();
        
        // Burn transaction fees
        let burned = burn_manager.burn_transaction_fees(
            &mut drt_token,
            1_000, // fee amount
            2,
            1000,
            "burn_tx".to_string(),
        ).unwrap();
        
        assert_eq!(burned, 1_000); // 100% burned
        assert_eq!(drt_token.balance_of(&"fee_collector".to_string()), 9_000);
        assert_eq!(drt_token.total_burned(), 1_000);
        
        // Check burn records
        let records = burn_manager.get_burn_records();
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].amount, 1_000);
        assert_eq!(records[0].reason, burn_manager::BurnReason::TransactionFees);
        
        // Check statistics
        let stats = burn_manager.get_statistics();
        assert_eq!(stats.total_burned, 1_000);
        assert_eq!(stats.burn_count, 1);
        assert_eq!(stats.average_burn, 1_000);
    }

    #[test]
    fn test_ai_service_fee_burning() {
        let mut burn_manager = BurnManager::new(create_test_burn_config());
        let mut drt_token = create_test_drt_token();
        
        burn_manager.set_fee_collector(burn_manager::BurnReason::AiServiceFees, "ai_collector".to_string());
        
        drt_token.mint(&"ai_collector".to_string(), 10_000, 1, "mint".to_string()).unwrap();
        
        let burned = burn_manager.burn_ai_service_fees(
            &mut drt_token,
            2_000, // fee amount
            2,
            1000,
            "ai_burn".to_string(),
        ).unwrap();
        
        assert_eq!(burned, 1_000); // 50% of 2000
        assert_eq!(drt_token.balance_of(&"ai_collector".to_string()), 9_000);
        assert_eq!(burn_manager.get_total_burned_by_reason(&burn_manager::BurnReason::AiServiceFees), 1_000);
    }

    #[test]
    fn test_bridge_fee_burning() {
        let mut burn_manager = BurnManager::new(create_test_burn_config());
        let mut drt_token = create_test_drt_token();
        
        burn_manager.set_fee_collector(burn_manager::BurnReason::BridgeFees, "bridge_collector".to_string());
        
        drt_token.mint(&"bridge_collector".to_string(), 10_000, 1, "mint".to_string()).unwrap();
        
        let burned = burn_manager.burn_bridge_fees(
            &mut drt_token,
            1_000, // fee amount
            2,
            1000,
            "bridge_burn".to_string(),
        ).unwrap();
        
        assert_eq!(burned, 750); // 75% of 1000
        assert_eq!(drt_token.balance_of(&"bridge_collector".to_string()), 9_250);
        assert_eq!(burn_manager.get_total_burned_by_reason(&burn_manager::BurnReason::BridgeFees), 750);
    }

    #[test]
    fn test_batch_burn_fees() {
        let mut burn_manager = BurnManager::new(create_test_burn_config());
        let mut drt_token = create_test_drt_token();
        
        // Setup collectors
        burn_manager.set_fee_collector(burn_manager::BurnReason::TransactionFees, "tx_collector".to_string());
        burn_manager.set_fee_collector(burn_manager::BurnReason::AiServiceFees, "ai_collector".to_string());
        burn_manager.set_fee_collector(burn_manager::BurnReason::BridgeFees, "bridge_collector".to_string());
        
        // Mint tokens
        drt_token.mint(&"tx_collector".to_string(), 10_000, 1, "mint1".to_string()).unwrap();
        drt_token.mint(&"ai_collector".to_string(), 10_000, 1, "mint2".to_string()).unwrap();
        drt_token.mint(&"bridge_collector".to_string(), 10_000, 1, "mint3".to_string()).unwrap();
        
        // Batch burn
        let burn_amounts = burn_manager.batch_burn_fees(
            &mut drt_token,
            1_000, // tx fees
            2_000, // ai fees
            1_000, // bridge fees
            2,
            1000,
            "batch_burn".to_string(),
        ).unwrap();
        
        assert_eq!(burn_amounts.transaction_fee_burn, 1_000); // 100%
        assert_eq!(burn_amounts.ai_service_fee_burn, 1_000);  // 50%
        assert_eq!(burn_amounts.bridge_fee_burn, 750);        // 75%
        assert_eq!(burn_amounts.total_burn, 2_750);
        
        // Check final balances
        assert_eq!(drt_token.balance_of(&"tx_collector".to_string()), 9_000);
        assert_eq!(drt_token.balance_of(&"ai_collector".to_string()), 9_000);
        assert_eq!(drt_token.balance_of(&"bridge_collector".to_string()), 9_250);
        
        // Check total burned
        assert_eq!(drt_token.total_burned(), 2_750);
        assert_eq!(burn_manager.get_statistics().total_burned, 2_750);
        assert_eq!(burn_manager.get_statistics().burn_count, 3);
    }

    #[test]
    fn test_governance_violation_burn() {
        let mut burn_manager = BurnManager::new(create_test_burn_config());
        let mut drt_token = create_test_drt_token();
        
        // Mint tokens to violator
        drt_token.mint(&"violator".to_string(), 10_000, 1, "mint".to_string()).unwrap();
        
        let burned = burn_manager.burn_governance_violation(
            &mut drt_token,
            &"violator".to_string(),
            2_000,
            2,
            1000,
            "violation_burn".to_string(),
            "Double voting detected".to_string(),
        ).unwrap();
        
        assert_eq!(burned, 2_000);
        assert_eq!(drt_token.balance_of(&"violator".to_string()), 8_000);
        
        let records = burn_manager.get_burn_records();
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].reason, burn_manager::BurnReason::GovernanceViolation);
        assert!(records[0].details.contains("Double voting"));
    }

    #[test]
    fn test_manual_burn() {
        let mut burn_manager = BurnManager::new(create_test_burn_config());
        let mut drt_token = create_test_drt_token();
        
        drt_token.mint(&"admin".to_string(), 10_000, 1, "mint".to_string()).unwrap();
        
        burn_manager.manual_burn(
            &mut drt_token,
            &"admin".to_string(),
            1_500,
            2,
            1000,
            "manual_burn".to_string(),
            "Administrative token burn for testing".to_string(),
        ).unwrap();
        
        assert_eq!(drt_token.balance_of(&"admin".to_string()), 8_500);
        assert_eq!(burn_manager.get_total_burned_by_reason(&burn_manager::BurnReason::Manual), 1_500);
        
        let records = burn_manager.get_burn_records();
        assert_eq!(records[0].reason, burn_manager::BurnReason::Manual);
        assert!(records[0].details.contains("Administrative"));
    }

    #[test]
    fn test_burn_statistics_and_rates() {
        let mut burn_manager = BurnManager::new(create_test_burn_config());
        let mut drt_token = create_test_drt_token();
        
        burn_manager.set_fee_collector(burn_manager::BurnReason::TransactionFees, "collector".to_string());
        drt_token.mint(&"collector".to_string(), 100_000, 1, "mint".to_string()).unwrap();
        
        // Multiple burns over time
        burn_manager.burn_transaction_fees(&mut drt_token, 1_000, 2, 1000, "burn1".to_string()).unwrap();
        burn_manager.burn_transaction_fees(&mut drt_token, 2_000, 3, 2000, "burn2".to_string()).unwrap();
        burn_manager.burn_transaction_fees(&mut drt_token, 1_500, 4, 3000, "burn3".to_string()).unwrap();
        
        let stats = burn_manager.get_statistics();
        assert_eq!(stats.total_burned, 4_500);
        assert_eq!(stats.burn_count, 3);
        assert_eq!(stats.average_burn, 1_500);
        
        // Test burn rate calculation
        let rate = burn_manager.calculate_burn_rate(3000); // 3000 second period
        assert!(rate > Decimal::ZERO);
        
        // Test recent burns
        let recent = burn_manager.get_recent_burns(2);
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].amount, 1_500); // Most recent first
        assert_eq!(recent[1].amount, 2_000);
        
        // Test burns by reason
        let tx_burns = burn_manager.get_burns_by_reason(&burn_manager::BurnReason::TransactionFees);
        assert_eq!(tx_burns.len(), 3);
    }

    #[test]
    fn test_emission_schedule() {
        let emission_config = EmissionConfig {
            block_rewards: Decimal::from_str_exact("0.60").unwrap(),
            staking_rewards: Decimal::from_str_exact("0.25").unwrap(),
            ai_module_incentives: Decimal::from_str_exact("0.10").unwrap(),
            bridge_operations: Decimal::from_str_exact("0.05").unwrap(),
        };
        
        let network_config = NetworkConfig {
            block_time: 6,
            blocks_per_year: 5_256_000,
            genesis_timestamp: 0,
            is_testnet: true,
        };
        
        let targets = emission_schedule::EmissionTargets {
            block_reward_recipient: Some("validator1".to_string()),
            staking_reward_pool: "staking_pool".to_string(),
            ai_incentive_pool: "ai_pool".to_string(),
            bridge_operations_pool: "bridge_pool".to_string(),
        };
        
        let mut schedule = EmissionSchedule::new(emission_config, network_config, targets);
        let mut drt_token = create_test_drt_token();
        
        // Start with initial supply
        drt_token.mint(&"initial".to_string(), 1_000_000, 1, "genesis".to_string()).unwrap();
        
        // Process emission
        let result = schedule.process_block_emission(
            &mut drt_token,
            2,
            3600, // 1 hour after genesis
            Some("validator1".to_string()),
        ).unwrap();
        
        assert!(result.total_emitted > 0);
        assert!(result.block_rewards > 0);
        assert!(result.staking_rewards > 0);
        assert!(result.ai_incentives > 0);
        assert!(result.bridge_operations > 0);
        
        // Check tokens were minted to pools
        assert!(drt_token.balance_of(&"validator1".to_string()) > 0);
        assert!(drt_token.balance_of(&"staking_pool".to_string()) > 0);
        assert!(drt_token.balance_of(&"ai_pool".to_string()) > 0);
        assert!(drt_token.balance_of(&"bridge_pool".to_string()) > 0);
        
        // Check emission history
        let history = schedule.get_emission_history();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].block_number, 2);
        
        // Check totals
        let totals = schedule.get_total_emissions();
        assert_eq!(totals.total_emitted, result.total_emitted);
        
        // Test inflation rate calculation
        let inflation_rate = schedule.calculate_current_inflation_rate(drt_token.current_supply());
        assert!(inflation_rate > Decimal::ZERO);
    }

    #[test]
    fn test_burn_error_conditions() {
        let mut burn_manager = BurnManager::new(create_test_burn_config());
        let mut drt_token = create_test_drt_token();
        
        // Test burning without fee collector set
        let result = burn_manager.burn_transaction_fees(&mut drt_token, 1000, 1, 1000, "tx".to_string());
        assert!(result.is_err());
        
        // Set fee collector but don't mint tokens
        burn_manager.set_fee_collector(burn_manager::BurnReason::TransactionFees, "collector".to_string());
        
        // Test burning with insufficient balance
        let result = burn_manager.burn_transaction_fees(&mut drt_token, 1000, 1, 1000, "tx".to_string());
        assert!(result.is_err());
        
        // Test governance violation burn with insufficient balance
        let result = burn_manager.burn_governance_violation(
            &mut drt_token,
            &"violator".to_string(),
            1000,
            1,
            1000,
            "tx".to_string(),
            "test".to_string(),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_burn_cleanup() {
        let mut burn_manager = BurnManager::new(create_test_burn_config());
        let mut drt_token = create_test_drt_token();
        
        burn_manager.set_fee_collector(burn_manager::BurnReason::TransactionFees, "collector".to_string());
        drt_token.mint(&"collector".to_string(), 100_000, 1, "mint".to_string()).unwrap();
        
        // Create many burn records
        for i in 0..20 {
            burn_manager.burn_transaction_fees(&mut drt_token, 100, i + 2, (i + 1) * 1000, format!("burn_{}", i)).unwrap();
        }
        
        assert_eq!(burn_manager.get_burn_records().len(), 20);
        
        // Clean up old records, keep only 10
        burn_manager.cleanup_old_records(10);
        
        assert_eq!(burn_manager.get_burn_records().len(), 10);
        
        // Check that the most recent records were kept
        let recent_records = burn_manager.get_burn_records();
        assert!(recent_records[0].block_number >= 12); // Should be from later burns
    }
}