//! Governance system tests

use dytallix_tokenomics::governance::*;
use dytallix_tokenomics::config::*;
use rust_decimal::Decimal;

#[cfg(test)]
mod governance_tests {
    use super::*;

    fn create_test_governance_config() -> GovernanceConfig {
        GovernanceConfig {
            minimum_proposal_deposit: 10_000_000_000_000_000_000, // 10 DGT
            voting_period: 7 * 24 * 60 * 60, // 7 days
            minimum_quorum: Decimal::from_str_exact("0.15").unwrap(), // 15%
            proposal_threshold: Decimal::from_str_exact("0.51").unwrap(), // 51%
            time_lock_period: 2 * 24 * 60 * 60, // 2 days
        }
    }

    #[test]
    fn test_proposal_lifecycle() {
        let config = create_test_governance_config();
        let mut manager = ProposalManager::new(config);
        manager.update_total_voting_power(100_000_000_000_000_000_000); // 100 DGT total
        
        // Create proposal
        let proposal_id = manager.create_proposal(
            "Increase Max Validators".to_string(),
            "Proposal to increase max validators from 100 to 150".to_string(),
            proposal_manager::ProposalType::ParameterChange {
                parameter: "max_validators".to_string(),
                new_value: "150".to_string(),
            },
            "proposer".to_string(),
            50_000_000_000_000_000_000, // Has enough DGT
            1,
            1000,
        ).unwrap();
        
        assert_eq!(proposal_id, 1);
        
        let proposal = manager.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.title, "Increase Max Validators");
        assert_eq!(proposal.status, proposal_manager::ProposalStatus::Active);
        assert_eq!(proposal.voting_end, 1000 + 7 * 24 * 60 * 60);
    }

    #[test]
    fn test_voting_process() {
        let config = create_test_governance_config();
        let mut manager = ProposalManager::new(config);
        manager.update_total_voting_power(100_000_000_000_000_000_000);
        
        // Create proposal
        let proposal_id = manager.create_proposal(
            "Test Proposal".to_string(),
            "Test proposal".to_string(),
            proposal_manager::ProposalType::Text { content: "Test".to_string() },
            "proposer".to_string(),
            50_000_000_000_000_000_000,
            1,
            1000,
        ).unwrap();
        
        // Vote on proposal
        manager.vote(
            proposal_id,
            "voter1".to_string(),
            voting_system::VoteChoice::Yes,
            30_000_000_000_000_000_000, // 30 DGT voting power
            2,
            1500,
        ).unwrap();
        
        manager.vote(
            proposal_id,
            "voter2".to_string(),
            voting_system::VoteChoice::No,
            10_000_000_000_000_000_000, // 10 DGT voting power
            3,
            1600,
        ).unwrap();
        
        // Check voting results
        let results = manager.get_voting_results(proposal_id).unwrap();
        assert_eq!(results.voter_count, 2);
        assert_eq!(results.total_raw_power, 40_000_000_000_000_000_000);
        
        // Check participation rate
        let expected_participation = Decimal::from(40_000_000_000_000_000_000u128) / Decimal::from(100_000_000_000_000_000_000u128);
        assert_eq!(results.participation_rate, expected_participation);
        
        // Quadratic voting: sqrt(30_000_000_000_000_000_000) ≈ 5477225575
        // sqrt(10_000_000_000_000_000_000) ≈ 3162277660
        assert!(results.yes_votes > results.no_votes);
    }

    #[test]
    fn test_proposal_finalization() {
        let config = create_test_governance_config();
        let mut manager = ProposalManager::new(config);
        manager.update_total_voting_power(100_000_000_000_000_000_000);
        
        // Create and vote on proposal
        let proposal_id = manager.create_proposal(
            "Test Proposal".to_string(),
            "Test".to_string(),
            proposal_manager::ProposalType::Text { content: "Test".to_string() },
            "proposer".to_string(),
            50_000_000_000_000_000_000,
            1,
            1000,
        ).unwrap();
        
        // Add enough votes to pass (meet quorum and approval threshold)
        manager.vote(proposal_id, "voter1".to_string(), voting_system::VoteChoice::Yes, 20_000_000_000_000_000_000, 2, 1500).unwrap();
        manager.vote(proposal_id, "voter2".to_string(), voting_system::VoteChoice::Yes, 15_000_000_000_000_000_000, 3, 1600).unwrap();
        manager.vote(proposal_id, "voter3".to_string(), voting_system::VoteChoice::No, 5_000_000_000_000_000_000, 4, 1700).unwrap();
        
        // Finalize after voting period
        let voting_end = 1000 + 7 * 24 * 60 * 60;
        let status = manager.finalize_proposal(proposal_id, voting_end + 1).unwrap();
        
        assert_eq!(status, proposal_manager::ProposalStatus::Passed);
        
        let proposal = manager.get_proposal(proposal_id).unwrap();
        assert!(proposal.execution_deadline.is_some());
        assert_eq!(proposal.execution_deadline.unwrap(), voting_end + 1 + 2 * 24 * 60 * 60);
    }

    #[test]
    fn test_proposal_execution() {
        let config = create_test_governance_config();
        let mut manager = ProposalManager::new(config);
        manager.update_total_voting_power(100_000_000_000_000_000_000);
        
        // Create, vote, and pass proposal
        let proposal_id = manager.create_proposal(
            "Parameter Change".to_string(),
            "Change parameter".to_string(),
            proposal_manager::ProposalType::ParameterChange {
                parameter: "max_validators".to_string(),
                new_value: "150".to_string(),
            },
            "proposer".to_string(),
            50_000_000_000_000_000_000,
            1,
            1000,
        ).unwrap();
        
        // Vote to pass
        manager.vote(proposal_id, "voter1".to_string(), voting_system::VoteChoice::Yes, 40_000_000_000_000_000_000, 2, 1500).unwrap();
        
        // Finalize
        let voting_end = 1000 + 7 * 24 * 60 * 60;
        manager.finalize_proposal(proposal_id, voting_end + 1).unwrap();
        
        // Execute after time lock
        let execution_time = voting_end + 1 + 2 * 24 * 60 * 60 + 1;
        let result = manager.execute_proposal(proposal_id, execution_time).unwrap();
        
        assert!(result.contains("max_validators"));
        assert!(result.contains("150"));
        
        let proposal = manager.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.status, proposal_manager::ProposalStatus::Executed);
        assert!(proposal.execution_result.is_some());
    }

    #[test]
    fn test_proposal_cancellation() {
        let config = create_test_governance_config();
        let mut manager = ProposalManager::new(config);
        
        let proposal_id = manager.create_proposal(
            "Test Proposal".to_string(),
            "Test".to_string(),
            proposal_manager::ProposalType::Text { content: "Test".to_string() },
            "proposer".to_string(),
            50_000_000_000_000_000_000,
            1,
            1000,
        ).unwrap();
        
        // Cancel proposal
        manager.cancel_proposal(proposal_id, &"proposer".to_string(), 1500).unwrap();
        
        let proposal = manager.get_proposal(proposal_id).unwrap();
        assert_eq!(proposal.status, proposal_manager::ProposalStatus::Cancelled);
    }

    #[test]
    fn test_quadratic_voting() {
        let config = create_test_governance_config();
        let mut manager = ProposalManager::new(config);
        manager.update_total_voting_power(100_000_000_000_000_000_000);
        
        let proposal_id = manager.create_proposal(
            "Quadratic Voting Test".to_string(),
            "Test".to_string(),
            proposal_manager::ProposalType::Text { content: "Test".to_string() },
            "proposer".to_string(),
            50_000_000_000_000_000_000,
            1,
            1000,
        ).unwrap();
        
        // Voter with 4x tokens should have 2x voting power (sqrt effect)
        manager.vote(proposal_id, "whale".to_string(), voting_system::VoteChoice::Yes, 40_000_000_000_000_000_000, 2, 1500).unwrap();
        manager.vote(proposal_id, "small_holder".to_string(), voting_system::VoteChoice::No, 10_000_000_000_000_000_000, 3, 1600).unwrap();
        
        let results = manager.get_voting_results(proposal_id).unwrap();
        
        // With quadratic voting, the whale's advantage is reduced
        // sqrt(40000000000000000000) / sqrt(10000000000000000000) = 2 (instead of 4)
        let whale_power_ratio = results.yes_votes as f64 / results.no_votes as f64;
        assert!(whale_power_ratio > 1.8 && whale_power_ratio < 2.2); // Approximately 2x
    }

    #[test]
    fn test_governance_error_conditions() {
        let config = create_test_governance_config();
        let mut manager = ProposalManager::new(config);
        
        // Test insufficient deposit
        let result = manager.create_proposal(
            "Test".to_string(),
            "Test".to_string(),
            proposal_manager::ProposalType::Text { content: "Test".to_string() },
            "proposer".to_string(),
            5_000_000_000_000_000_000, // Insufficient deposit
            1,
            1000,
        );
        assert!(result.is_err());
        
        // Test voting on non-existent proposal
        let result = manager.vote(999, "voter".to_string(), voting_system::VoteChoice::Yes, 10_000_000_000_000_000_000, 1, 1000);
        assert!(result.is_err());
        
        // Test finalizing non-existent proposal
        let result = manager.finalize_proposal(999, 2000);
        assert!(result.is_err());
        
        // Test unauthorized cancellation
        let proposal_id = manager.create_proposal(
            "Test".to_string(),
            "Test".to_string(),
            proposal_manager::ProposalType::Text { content: "Test".to_string() },
            "proposer".to_string(),
            50_000_000_000_000_000_000,
            1,
            1000,
        ).unwrap();
        
        let result = manager.cancel_proposal(proposal_id, &"not_proposer".to_string(), 1500);
        assert!(result.is_err());
        
        // Test double voting
        manager.vote(proposal_id, "voter".to_string(), voting_system::VoteChoice::Yes, 10_000_000_000_000_000_000, 2, 1500).unwrap();
        let result = manager.vote(proposal_id, "voter".to_string(), voting_system::VoteChoice::No, 10_000_000_000_000_000_000, 3, 1600);
        assert!(result.is_err());
    }

    #[test]
    fn test_proposal_statistics() {
        let config = create_test_governance_config();
        let mut manager = ProposalManager::new(config);
        manager.update_total_voting_power(100_000_000_000_000_000_000);
        
        // Create multiple proposals with different outcomes
        let proposal1 = manager.create_proposal("P1".to_string(), "Test".to_string(), proposal_manager::ProposalType::Text { content: "1".to_string() }, "proposer".to_string(), 50_000_000_000_000_000_000, 1, 1000).unwrap();
        let proposal2 = manager.create_proposal("P2".to_string(), "Test".to_string(), proposal_manager::ProposalType::Text { content: "2".to_string() }, "proposer".to_string(), 50_000_000_000_000_000_000, 2, 2000).unwrap();
        let proposal3 = manager.create_proposal("P3".to_string(), "Test".to_string(), proposal_manager::ProposalType::Text { content: "3".to_string() }, "proposer".to_string(), 50_000_000_000_000_000_000, 3, 3000).unwrap();
        
        // Pass one proposal
        manager.vote(proposal1, "voter".to_string(), voting_system::VoteChoice::Yes, 40_000_000_000_000_000_000, 4, 1500).unwrap();
        manager.finalize_proposal(proposal1, 1000 + 7 * 24 * 60 * 60 + 1).unwrap();
        manager.execute_proposal(proposal1, 1000 + 7 * 24 * 60 * 60 + 1 + 2 * 24 * 60 * 60 + 1).unwrap();
        
        // Fail one proposal (insufficient votes)
        manager.vote(proposal2, "voter".to_string(), voting_system::VoteChoice::No, 5_000_000_000_000_000_000, 5, 2500).unwrap();
        manager.finalize_proposal(proposal2, 2000 + 7 * 24 * 60 * 60 + 1).unwrap();
        
        // Cancel one proposal
        manager.cancel_proposal(proposal3, &"proposer".to_string(), 3500).unwrap();
        
        let stats = manager.get_statistics();
        assert_eq!(stats.total_count, 3);
        assert_eq!(stats.executed_count, 1);
        assert_eq!(stats.failed_count, 1);
        assert_eq!(stats.cancelled_count, 1);
        assert_eq!(stats.active_count, 0);
    }
}