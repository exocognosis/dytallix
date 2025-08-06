//! Integration tests for the tokenomics system

use dytallix_tokenomics::*;
use dytallix_tokenomics::config::*;
use dytallix_tokenomics::tokens::*;
use dytallix_tokenomics::vesting::*;
use dytallix_tokenomics::staking::*;
use dytallix_tokenomics::governance::*;
use dytallix_tokenomics::burning::*;
use rust_decimal::Decimal;
use std::collections::HashMap;

/// Test the complete tokenomics system integration
#[cfg(test)]
mod integration_tests {
    use super::*;

    fn create_test_tokenomics_config() -> TokenomicsConfig {
        TokenomicsConfig::default()
    }

    #[tokio::test]
    async fn test_full_system_integration() {
        let config = create_test_tokenomics_config();
        
        // Initialize tokens
        let mut dgt_token = DgtToken::new(config.dgt.clone());
        let mut drt_token = DrtToken::new(config.drt.clone());
        
        // Initialize allocation manager
        let mut allocation_manager = AllocationManager::new(config.dgt.clone());
        allocation_manager.initialize(0).unwrap();
        
        // Setup allocations
        allocation_manager.add_recipient(
            StakeholderGroup::DevTeam,
            "dev_team_lead".to_string(),
            100_000_000_000_000_000_000_000_000, // 100M DGT
        ).unwrap();
        
        allocation_manager.add_recipient(
            StakeholderGroup::CommunityTreasury,
            "community_treasury".to_string(),
            200_000_000_000_000_000_000_000_000, // 200M DGT
        ).unwrap();
        
        // Get initial distribution
        let initial_distribution = allocation_manager.get_initial_distribution();
        dgt_token.initialize(initial_distribution).unwrap();
        
        // Initialize staking
        let mut staking_manager = StakingManager::new(config.staking.clone());
        
        // Create validators
        staking_manager.create_validator(
            "validator1".to_string(),
            10_000_000_000_000_000_000, // 10 DGT
            Decimal::from_str_exact("0.10").unwrap(),
            1,
        ).unwrap();
        
        // Delegate some tokens
        staking_manager.delegate(
            "community_treasury".to_string(),
            "validator1".to_string(),
            50_000_000_000_000_000_000, // 50 DGT
            2,
        ).unwrap();
        
        // Initialize governance
        let mut proposal_manager = ProposalManager::new(config.governance.clone());
        proposal_manager.update_total_voting_power(staking_manager.get_total_staked());
        
        // Create a proposal
        let proposal_id = proposal_manager.create_proposal(
            "Increase validator count".to_string(),
            "Proposal to increase max validators from 100 to 150".to_string(),
            proposal_manager::ProposalType::ParameterChange {
                parameter: "max_validators".to_string(),
                new_value: "150".to_string(),
            },
            "community_treasury".to_string(),
            200_000_000_000_000_000_000_000_000, // Has enough DGT
            3,
            1000,
        ).unwrap();
        
        // Vote on the proposal
        proposal_manager.vote(
            proposal_id,
            "community_treasury".to_string(),
            voting_system::VoteChoice::Yes,
            50_000_000_000_000_000_000, // 50 DGT voting power
            4,
            1500,
        ).unwrap();
        
        // Initialize emission schedule
        let emission_targets = emission_schedule::EmissionTargets {
            block_reward_recipient: Some("validator1".to_string()),
            staking_reward_pool: "staking_pool".to_string(),
            ai_incentive_pool: "ai_pool".to_string(),
            bridge_operations_pool: "bridge_pool".to_string(),
        };
        
        let mut emission_schedule = EmissionSchedule::new(
            config.drt.emission.clone(),
            config.network.clone(),
            emission_targets,
        );
        
        // Initialize DRT token
        drt_token.initialize(0).unwrap();
        
        // Start with some initial DRT supply
        drt_token.mint(&"initial_holder".to_string(), 1_000_000_000_000_000_000_000_000, 0, "genesis".to_string()).unwrap();
        
        // Process emission
        let emission_result = emission_schedule.process_block_emission(
            &mut drt_token,
            5,
            3600, // 1 hour after genesis
            Some("validator1".to_string()),
        ).unwrap();
        
        assert!(emission_result.total_emitted > 0);
        
        // Initialize burn manager
        let mut burn_manager = BurnManager::new(config.drt.burn.clone());
        burn_manager.set_fee_collector(burn_manager::BurnReason::TransactionFees, "fee_collector".to_string());
        
        // Mint some DRT to fee collector for burning
        drt_token.mint(&"fee_collector".to_string(), 10_000_000_000_000_000_000_000, 5, "fees".to_string()).unwrap();
        
        // Burn transaction fees
        let burned_amount = burn_manager.burn_transaction_fees(
            &mut drt_token,
            1_000_000_000_000_000_000_000, // 1000 DRT in fees
            6,
            4000,
            "burn_tx".to_string(),
        ).unwrap();
        
        assert_eq!(burned_amount, 1_000_000_000_000_000_000_000); // 100% burned
        
        // Initialize reward distributor
        let mut reward_distributor = RewardDistributor::new();
        
        // Distribute staking rewards
        let distribution = reward_distributor.distribute_rewards(
            &staking_manager,
            emission_result.staking_rewards,
            7,
            5000,
        ).unwrap();
        
        assert!(distribution.total_rewards > 0);
        
        // Verify system state
        assert!(dgt_token.balance_of(&"community_treasury".to_string()) > 0);
        assert!(staking_manager.get_total_staked() > 0);
        assert!(drt_token.current_supply() > 0);
        assert!(burn_manager.get_statistics().total_burned > 0);
        assert!(reward_distributor.get_total_rewards_distributed() > 0);
        
        // Test vesting release
        let one_year_later = 365 * 24 * 60 * 60;
        let released = allocation_manager.release_vested_tokens(&"dev_team_lead".to_string(), one_year_later).unwrap();
        
        // Dev team has 1 year cliff, so should be 0 at exactly 1 year
        assert_eq!(released, 0);
        
        // Test after cliff period
        let cliff_plus_one_day = one_year_later + 24 * 60 * 60;
        let released_after_cliff = allocation_manager.release_vested_tokens(&"dev_team_lead".to_string(), cliff_plus_one_day).unwrap();
        assert!(released_after_cliff > 0);
        
        // Finalize the proposal after voting period
        let voting_end = 1000 + config.governance.voting_period + 1;
        let status = proposal_manager.finalize_proposal(proposal_id, voting_end).unwrap();
        assert_eq!(status, proposal_manager::ProposalStatus::Passed);
        
        // Execute the proposal after time lock
        let execution_time = voting_end + config.governance.time_lock_period + 1;
        let execution_result = proposal_manager.execute_proposal(proposal_id, execution_time).unwrap();
        assert!(execution_result.contains("max_validators"));
        
        println!("✅ Full system integration test passed!");
        println!("- DGT Token: {} total supply", dgt_token.total_supply());
        println!("- DRT Token: {} current supply", drt_token.current_supply());
        println!("- Total Staked: {} DGT", staking_manager.get_total_staked());
        println!("- Total Burned: {} DRT", burn_manager.get_statistics().total_burned);
        println!("- Total Rewards: {} DRT", reward_distributor.get_total_rewards_distributed());
        println!("- Proposal Status: {:?}", status);
    }

    #[tokio::test]
    async fn test_tokenomics_config_loading() {
        // Test loading configuration from files
        let config = TokenomicsConfig::default();
        
        // Save to temp file
        let temp_path = "/tmp/test_tokenomics_config.json";
        config.to_file(temp_path).unwrap();
        
        // Load from file
        let loaded_config = TokenomicsConfig::from_file(temp_path).unwrap();
        
        // Verify loaded config
        assert_eq!(config.dgt.name, loaded_config.dgt.name);
        assert_eq!(config.drt.symbol, loaded_config.drt.symbol);
        assert_eq!(config.governance.voting_period, loaded_config.governance.voting_period);
        
        // Clean up
        std::fs::remove_file(temp_path).ok();
        
        println!("✅ Configuration loading test passed!");
    }

    #[tokio::test]
    async fn test_error_handling() {
        let config = create_test_tokenomics_config();
        let mut dgt_token = DgtToken::new(config.dgt.clone());
        
        // Test insufficient balance error
        let result = dgt_token.transfer(&"alice".to_string(), &"bob".to_string(), 1000);
        assert!(matches!(result, Err(TokenomicsError::InsufficientBalance { .. })));
        
        // Test invalid staking
        let mut staking_manager = StakingManager::new(config.staking.clone());
        let result = staking_manager.create_validator(
            "validator1".to_string(),
            100, // Below minimum stake
            Decimal::from_str_exact("0.10").unwrap(),
            1,
        );
        assert!(matches!(result, Err(TokenomicsError::InsufficientBalance { .. })));
        
        // Test proposal not found
        let mut proposal_manager = ProposalManager::new(config.governance.clone());
        let result = proposal_manager.finalize_proposal(999, 1000);
        assert!(matches!(result, Err(TokenomicsError::ProposalNotFound { .. })));
        
        println!("✅ Error handling test passed!");
    }

    #[tokio::test] 
    async fn test_performance_benchmarks() {
        let config = create_test_tokenomics_config();
        
        // Benchmark token transfers
        let mut dgt_token = DgtToken::new(config.dgt.clone());
        let mut allocations = HashMap::new();
        allocations.insert("alice".to_string(), 1_000_000_000_000_000_000_000_000);
        dgt_token.initialize(allocations).unwrap();
        
        let start = std::time::Instant::now();
        for i in 0..1000 {
            let recipient = format!("user_{}", i);
            dgt_token.transfer(&"alice".to_string(), &recipient, 1_000_000_000_000_000_000).unwrap();
        }
        let transfer_duration = start.elapsed();
        
        // Benchmark staking operations
        let mut staking_manager = StakingManager::new(config.staking.clone());
        staking_manager.create_validator(
            "validator1".to_string(),
            100_000_000_000_000_000_000,
            Decimal::from_str_exact("0.10").unwrap(),
            1,
        ).unwrap();
        
        let start = std::time::Instant::now();
        for i in 0..100 {
            let delegator = format!("delegator_{}", i);
            staking_manager.delegate(
                delegator,
                "validator1".to_string(),
                1_000_000_000_000_000_000,
                i + 2,
            ).unwrap();
        }
        let staking_duration = start.elapsed();
        
        println!("✅ Performance benchmarks:");
        println!("- 1000 transfers: {:?}", transfer_duration);
        println!("- 100 delegations: {:?}", staking_duration);
        
        // Basic performance assertions
        assert!(transfer_duration.as_millis() < 1000, "Transfers should complete in under 1 second");
        assert!(staking_duration.as_millis() < 500, "Delegations should complete in under 500ms");
    }
}