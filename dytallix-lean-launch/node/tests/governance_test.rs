use crate::runtime::governance::*;
use crate::runtime::staking::StakingModule;
use crate::state::State;
use crate::storage::state::Storage;
use std::sync::{Arc, Mutex};
use tempfile::TempDir;

fn setup_test_governance() -> (GovernanceModule, TempDir) {
    let temp_dir = TempDir::new().unwrap();
    let storage = Arc::new(Storage::open(temp_dir.path().join("test.db")).unwrap());
    let state = Arc::new(Mutex::new(State::new(storage.clone())));
    let staking = Arc::new(Mutex::new(StakingModule::new(storage.clone())));

    let governance = GovernanceModule::new(storage, state, staking);
    (governance, temp_dir)
}

#[test]
fn test_governance_submit_proposal() {
    let (mut governance, _temp_dir) = setup_test_governance();

    let proposal_id = governance
        .submit_proposal(
            100,
            "Test Gas Limit Increase".to_string(),
            "Increase gas limit to 500000".to_string(),
            ProposalType::ParameterChange {
                key: "gas_limit".to_string(),
                value: "500000".to_string(),
            },
        )
        .unwrap();

    assert_eq!(proposal_id, 1);

    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(proposal.title, "Test Gas Limit Increase");
    assert_eq!(proposal.status, ProposalStatus::DepositPeriod);
    assert_eq!(proposal.submit_height, 100);
    assert_eq!(proposal.deposit_end_height, 400); // 100 + 300
    assert_eq!(proposal.voting_start_height, 400);
    assert_eq!(proposal.voting_end_height, 700); // 400 + 300
}

#[test]
fn test_governance_deposit_flow() {
    let (mut governance, _temp_dir) = setup_test_governance();

    // Setup account with DGT balance
    {
        let mut state = governance.state.lock().unwrap();
        let mut account = state.get_account("depositor1");
        account.add_balance("udgt", 2_000_000_000); // 2000 DGT
        state.accounts.insert("depositor1".to_string(), account);
    }

    let proposal_id = governance
        .submit_proposal(
            100,
            "Test Proposal".to_string(),
            "Test Description".to_string(),
            ProposalType::ParameterChange {
                key: "gas_limit".to_string(),
                value: "500000".to_string(),
            },
        )
        .unwrap();

    // Deposit enough to meet minimum - should transition to voting
    governance
        .deposit(150, "depositor1", proposal_id, 1_000_000_000, "udgt")
        .unwrap();

    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(proposal.status, ProposalStatus::VotingPeriod);
    assert_eq!(proposal.total_deposit, 1_000_000_000);

    // Check balance was deducted
    let state = governance.state.lock().unwrap();
    let account = state.get_account("depositor1");
    assert_eq!(account.balance_of("udgt"), 1_000_000_000); // 2000 - 1000 = 1000 DGT remaining
}

#[test]
fn test_governance_voting_flow() {
    let (mut governance, _temp_dir) = setup_test_governance();

    // Setup voters with DGT balances
    {
        let mut state = governance.state.lock().unwrap();

        let mut voter1 = state.get_account("voter1");
        voter1.add_balance("udgt", 500_000_000); // 500 DGT
        state.accounts.insert("voter1".to_string(), voter1);

        let mut voter2 = state.get_account("voter2");
        voter2.add_balance("udgt", 300_000_000); // 300 DGT
        state.accounts.insert("voter2".to_string(), voter2);

        let mut voter3 = state.get_account("voter3");
        voter3.add_balance("udgt", 200_000_000); // 200 DGT
        state.accounts.insert("voter3".to_string(), voter3);
    }

    let proposal_id = governance
        .submit_proposal(
            100,
            "Test Proposal".to_string(),
            "Test Description".to_string(),
            ProposalType::ParameterChange {
                key: "gas_limit".to_string(),
                value: "500000".to_string(),
            },
        )
        .unwrap();

    // Manually set to voting period for test
    {
        let mut proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
        proposal.status = ProposalStatus::VotingPeriod;
        governance.store_proposal(&proposal).unwrap();
    }

    // Cast votes
    governance
        .vote(450, "voter1", proposal_id, VoteOption::Yes)
        .unwrap();
    governance
        .vote(451, "voter2", proposal_id, VoteOption::Yes)
        .unwrap();
    governance
        .vote(452, "voter3", proposal_id, VoteOption::No)
        .unwrap();

    // Tally votes
    let tally = governance.tally(proposal_id).unwrap();
    assert_eq!(tally.yes, 800_000_000); // 500 + 300 DGT
    assert_eq!(tally.no, 200_000_000); // 200 DGT
    assert_eq!(tally.abstain, 0);

    // Should pass with majority yes
    assert!(tally.yes > tally.no);
}

#[test]
fn test_governance_parameter_execution() {
    let (mut governance, _temp_dir) = setup_test_governance();

    let proposal_id = governance
        .submit_proposal(
            100,
            "Increase Gas Limit".to_string(),
            "Increase gas limit from default to 50000".to_string(),
            ProposalType::ParameterChange {
                key: "gas_limit".to_string(),
                value: "50000".to_string(),
            },
        )
        .unwrap();

    // Check initial gas limit
    assert_eq!(governance.get_config().gas_limit, 21_000);

    // Manually set to passed status for test
    {
        let mut proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
        proposal.status = ProposalStatus::Passed;
        governance.store_proposal(&proposal).unwrap();
    }

    // Execute the proposal
    governance.execute(proposal_id).unwrap();

    // Check gas limit was updated
    assert_eq!(governance.get_config().gas_limit, 50_000);

    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(proposal.status, ProposalStatus::Executed);
}

#[test]
fn test_governance_end_block_processing() {
    let (mut governance, _temp_dir) = setup_test_governance();

    let proposal_id = governance
        .submit_proposal(
            100,
            "Test Proposal".to_string(),
            "Test Description".to_string(),
            ProposalType::ParameterChange {
                key: "gas_limit".to_string(),
                value: "500000".to_string(),
            },
        )
        .unwrap();

    // Should be in deposit period
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(proposal.status, ProposalStatus::DepositPeriod);

    // Process end block after deposit period expires (height 401)
    governance.end_block(401).unwrap();

    // Should be rejected due to insufficient deposits
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(proposal.status, ProposalStatus::Rejected);
}

#[test]
fn test_governance_config_defaults() {
    let config = GovernanceConfig::default();
    assert_eq!(config.min_deposit, 1_000_000_000); // 1000 DGT
    assert_eq!(config.deposit_period, 300);
    assert_eq!(config.voting_period, 300);
    assert_eq!(config.gas_limit, 21_000);
}
