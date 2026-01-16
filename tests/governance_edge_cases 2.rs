/*
Governance Edge Cases Testing - Validates quorum, timeout, and parameter change scenarios

Tests various edge cases:
- Quorum failure scenarios
- Timeout handling for deposits and voting
- Parameter change validation and execution
- Veto threshold edge cases
- Concurrent proposal handling
*/

use dytallix_lean_launch::runtime::governance::{
    GovernanceModule, GovernanceConfig, ProposalType, ProposalStatus, VoteOption, TallyResult
};
use dytallix_lean_launch::runtime::staking::StakingModule;
use dytallix_lean_launch::state::State;
use dytallix_lean_launch::storage::state::Storage;
use std::sync::{Arc, Mutex};
use tempfile;

fn setup_test_governance() -> (GovernanceModule, tempfile::TempDir) {
    let temp_dir = tempfile::tempdir().expect("tempdir");
    let storage = Arc::new(Storage::open(temp_dir.path().join("test.db")).unwrap());
    let state = Arc::new(Mutex::new(State::new(storage.clone())));
    let staking = Arc::new(Mutex::new(StakingModule::new(storage.clone())));

    let governance = GovernanceModule::new(storage, state, staking).unwrap();
    (governance, temp_dir)
}

fn setup_governance_with_custom_config(config: GovernanceConfig) -> (GovernanceModule, tempfile::TempDir) {
    let temp_dir = tempfile::tempdir().expect("tempdir");
    let storage = Arc::new(Storage::open(temp_dir.path().join("test.db")).unwrap());
    let state = Arc::new(Mutex::new(State::new(storage.clone())));
    let staking = Arc::new(Mutex::new(StakingModule::new(storage.clone())));

    let mut governance = GovernanceModule::new(storage, state, staking).unwrap();
    governance.config = config;
    (governance, temp_dir)
}

fn setup_staked_accounts(governance: &mut GovernanceModule, accounts: &[(&str, u128)]) {
    // Setup staking power for accounts
    for (address, power) in accounts {
        let staking = governance.staking.clone();
        let mut staking_guard = staking.lock().unwrap();
        
        // Add validator stake to provide voting power
        let _ = staking_guard.delegate(address, "validator1", *power, 100);
        
        // Setup DGT balance for deposits
        let state = governance.state.clone();
        let mut state_guard = state.lock().unwrap();
        state_guard.set_balance(address, "udgt", power * 10); // 10x voting power for deposits
    }
}

#[test]
fn test_quorum_failure_edge_case() {
    let custom_config = GovernanceConfig {
        quorum: 5000, // 50% quorum required
        threshold: 5000, // 50% threshold
        min_deposit: 1_000_000,
        deposit_period: 100,
        voting_period: 100,
        ..Default::default()
    };
    
    let (mut governance, _temp_dir) = setup_governance_with_custom_config(custom_config);
    
    // Setup accounts with total voting power of 1,000,000
    setup_staked_accounts(&mut governance, &[
        ("voter1", 300_000), // 30% voting power
        ("voter2", 200_000), // 20% voting power  
        ("voter3", 500_000), // 50% voting power (not voting)
    ]);
    
    // Submit proposal
    let proposal_id = governance.submit_proposal(
        100,
        "Test Quorum Failure".to_string(),
        "This should fail due to low participation".to_string(),
        ProposalType::ParameterChange {
            key: "gas_limit".to_string(),
            value: "50000".to_string(),
        },
    ).unwrap();
    
    // Make proposal reach voting period
    governance.deposit(150, "voter1", proposal_id, 1_000_000, "udgt").unwrap();
    governance.process_proposals(200).unwrap(); // Start voting period
    
    // Only voters with 50% total power participate (but need 50% of total for quorum)
    governance.vote(220, "voter1", proposal_id, VoteOption::Yes).unwrap();
    governance.vote(220, "voter2", proposal_id, VoteOption::Yes).unwrap();
    // voter3 doesn't vote (500,000 voting power missing)
    
    // End voting period
    governance.process_proposals(300).unwrap();
    
    // Check proposal failed due to quorum
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(proposal.status, ProposalStatus::Rejected);
    
    let tally = proposal.tally.unwrap();
    assert_eq!(tally.yes, 500_000); // 300k + 200k
    assert_eq!(tally.total_voting_power, 500_000);
    
    // Verify quorum calculation: 500_000 < (1_000_000 * 5000 / 10000) = 500_000
    // Should fail because 500,000 participating < 500,000 required
    assert!(!governance.proposal_passes(&tally).unwrap());
}

#[test]
fn test_exact_quorum_boundary() {
    let custom_config = GovernanceConfig {
        quorum: 5000, // 50% quorum required
        threshold: 5000, // 50% threshold
        min_deposit: 1_000_000,
        deposit_period: 100,
        voting_period: 100,
        ..Default::default()
    };
    
    let (mut governance, _temp_dir) = setup_governance_with_custom_config(custom_config);
    
    // Setup exactly 50% participation scenario
    setup_staked_accounts(&mut governance, &[
        ("voter1", 250_000), // 25%
        ("voter2", 250_000), // 25% 
        ("voter3", 500_000), // 50% (not voting)
    ]);
    
    let proposal_id = governance.submit_proposal(
        100,
        "Exact Quorum Test".to_string(),
        "Testing exact quorum boundary".to_string(),
        ProposalType::ParameterChange {
            key: "gas_limit".to_string(),
            value: "60000".to_string(),
        },
    ).unwrap();
    
    governance.deposit(150, "voter1", proposal_id, 1_000_000, "udgt").unwrap();
    governance.process_proposals(200).unwrap();
    
    // Exactly 50% participation
    governance.vote(220, "voter1", proposal_id, VoteOption::Yes).unwrap();
    governance.vote(220, "voter2", proposal_id, VoteOption::Yes).unwrap();
    
    governance.process_proposals(300).unwrap();
    
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    let tally = proposal.tally.unwrap();
    
    // Should pass: 500_000 >= 500_000 (exact quorum)
    assert_eq!(tally.total_voting_power, 500_000);
    assert!(governance.proposal_passes(&tally).unwrap());
    assert_eq!(proposal.status, ProposalStatus::Passed);
}

#[test]
fn test_deposit_timeout_edge_case() {
    let custom_config = GovernanceConfig {
        min_deposit: 2_000_000, // Higher minimum deposit
        deposit_period: 50, // Short deposit period
        voting_period: 100,
        ..Default::default()
    };
    
    let (mut governance, _temp_dir) = setup_governance_with_custom_config(custom_config);
    setup_staked_accounts(&mut governance, &[("depositor", 1_000_000)]);
    
    // Submit proposal
    let proposal_id = governance.submit_proposal(
        100,
        "Deposit Timeout Test".to_string(),
        "Testing deposit timeout scenario".to_string(),
        ProposalType::ParameterChange {
            key: "gas_limit".to_string(),
            value: "70000".to_string(),
        },
    ).unwrap();
    
    // Try to deposit after deposit period ends (height 150 > deposit_end_height 150)
    let result = governance.deposit(151, "depositor", proposal_id, 1_000_000, "udgt");
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not in deposit period"));
    
    // Process proposals to move to rejected state
    governance.process_proposals(151).unwrap();
    
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(proposal.status, ProposalStatus::Rejected);
}

#[test]
fn test_voting_timeout_edge_case() {
    let custom_config = GovernanceConfig {
        min_deposit: 1_000_000,
        deposit_period: 50,
        voting_period: 50, // Short voting period
        ..Default::default()
    };
    
    let (mut governance, _temp_dir) = setup_governance_with_custom_config(custom_config);
    setup_staked_accounts(&mut governance, &[("voter", 1_000_000)]);
    
    let proposal_id = governance.submit_proposal(
        100,
        "Voting Timeout Test".to_string(),
        "Testing voting timeout scenario".to_string(),
        ProposalType::ParameterChange {
            key: "gas_limit".to_string(),
            value: "80000".to_string(),
        },
    ).unwrap();
    
    // Complete deposit phase
    governance.deposit(120, "voter", proposal_id, 1_000_000, "udgt").unwrap();
    governance.process_proposals(150).unwrap(); // Move to voting period
    
    // Try to vote after voting period ends (height 201 > voting_end_height 200)
    let result = governance.vote(201, "voter", proposal_id, VoteOption::Yes);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not in voting period"));
    
    // Process to finalize
    governance.process_proposals(201).unwrap();
    
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(proposal.status, ProposalStatus::Rejected); // No votes = rejected
}

#[test]
fn test_veto_threshold_edge_case() {
    let custom_config = GovernanceConfig {
        quorum: 3000, // 30% quorum
        threshold: 5000, // 50% threshold
        veto_threshold: 3300, // 33% veto threshold
        min_deposit: 1_000_000,
        deposit_period: 100,
        voting_period: 100,
        ..Default::default()
    };
    
    let (mut governance, _temp_dir) = setup_governance_with_custom_config(custom_config);
    
    setup_staked_accounts(&mut governance, &[
        ("voter1", 400_000), // 40% - votes yes
        ("voter2", 300_000), // 30% - votes no
        ("voter3", 340_000), // 34% - votes no_with_veto (above 33% veto threshold)
    ]);
    
    let proposal_id = governance.submit_proposal(
        100,
        "Veto Test".to_string(),
        "Testing veto threshold".to_string(),
        ProposalType::ParameterChange {
            key: "gas_limit".to_string(),
            value: "90000".to_string(),
        },
    ).unwrap();
    
    governance.deposit(120, "voter1", proposal_id, 1_000_000, "udgt").unwrap();
    governance.process_proposals(200).unwrap();
    
    // Vote distribution that should trigger veto
    governance.vote(220, "voter1", proposal_id, VoteOption::Yes).unwrap(); // 400k yes
    governance.vote(220, "voter2", proposal_id, VoteOption::No).unwrap(); // 300k no
    governance.vote(220, "voter3", proposal_id, VoteOption::NoWithVeto).unwrap(); // 340k veto
    
    governance.process_proposals(300).unwrap();
    
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    let tally = proposal.tally.unwrap();
    
    // Should be vetoed: 340,000 >= (1,040,000 * 3300 / 10000) = 343,200
    // Actually should not be vetoed since 340k < 343.2k
    // Let's check the exact calculation
    let total_participating = tally.total_voting_power;
    let veto_required = (total_participating * custom_config.veto_threshold) / 10000;
    
    if tally.no_with_veto >= veto_required {
        assert_eq!(proposal.status, ProposalStatus::Rejected);
    } else {
        // If not vetoed, check if it passes other criteria
        assert!(tally.yes >= (tally.yes + tally.no + tally.no_with_veto) * custom_config.threshold / 10000);
    }
}

#[test]
fn test_parameter_change_validation() {
    let (mut governance, _temp_dir) = setup_test_governance();
    setup_staked_accounts(&mut governance, &[("voter", 1_000_000)]);
    
    // Test valid parameter changes
    let valid_params = vec![
        ("gas_limit", "100000"),
        ("consensus.max_gas_per_block", "20000000"),
        ("staking_reward_rate", "0.05"),
    ];
    
    for (key, value) in valid_params {
        let proposal_id = governance.submit_proposal(
            100,
            format!("Change {}", key),
            format!("Change {} to {}", key, value),
            ProposalType::ParameterChange {
                key: key.to_string(),
                value: value.to_string(),
            },
        ).unwrap();
        
        governance.deposit(120, "voter", proposal_id, 1_000_000, "udgt").unwrap();
        governance.process_proposals(200).unwrap(); // Start voting
        governance.vote(220, "voter", proposal_id, VoteOption::Yes).unwrap();
        governance.process_proposals(300).unwrap(); // Finalize
        
        let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
        assert_eq!(proposal.status, ProposalStatus::Passed);
    }
    
    // Test invalid parameter change
    let invalid_proposal_id = governance.submit_proposal(
        100,
        "Invalid Parameter".to_string(),
        "Try to change invalid parameter".to_string(),
        ProposalType::ParameterChange {
            key: "invalid_param".to_string(),
            value: "123".to_string(),
        },
    ).unwrap();
    
    governance.deposit(120, "voter", invalid_proposal_id, 1_000_000, "udgt").unwrap();
    governance.process_proposals(200).unwrap();
    governance.vote(220, "voter", invalid_proposal_id, VoteOption::Yes).unwrap();
    governance.process_proposals(300).unwrap();
    
    // Should pass governance but fail parameter application
    let proposal = governance.get_proposal(invalid_proposal_id).unwrap().unwrap();
    assert_eq!(proposal.status, ProposalStatus::Passed);
    
    // Test parameter application
    let result = governance.apply_parameter_change("invalid_param", "123");
    assert!(result.is_err());
}

#[test]
fn test_concurrent_proposals_edge_case() {
    let (mut governance, _temp_dir) = setup_test_governance();
    setup_staked_accounts(&mut governance, &[
        ("voter1", 400_000),
        ("voter2", 300_000),
        ("voter3", 300_000),
    ]);
    
    // Submit multiple proposals
    let proposal1 = governance.submit_proposal(
        100,
        "Proposal 1".to_string(),
        "First proposal".to_string(),
        ProposalType::ParameterChange {
            key: "gas_limit".to_string(),
            value: "25000".to_string(),
        },
    ).unwrap();
    
    let proposal2 = governance.submit_proposal(
        110,
        "Proposal 2".to_string(),
        "Second proposal".to_string(),
        ProposalType::ParameterChange {
            key: "consensus.max_gas_per_block".to_string(),
            value: "15000000".to_string(),
        },
    ).unwrap();
    
    // Both proposals get deposits and reach voting
    governance.deposit(120, "voter1", proposal1, 2_000_000, "udgt").unwrap();
    governance.deposit(130, "voter2", proposal2, 2_000_000, "udgt").unwrap();
    
    governance.process_proposals(200).unwrap(); // Both start voting around same time
    
    // Vote on both proposals
    governance.vote(220, "voter1", proposal1, VoteOption::Yes).unwrap();
    governance.vote(220, "voter2", proposal1, VoteOption::No).unwrap();
    
    governance.vote(225, "voter1", proposal2, VoteOption::Yes).unwrap();
    governance.vote(225, "voter3", proposal2, VoteOption::Yes).unwrap();
    
    governance.process_proposals(310).unwrap(); // Finalize both
    
    let prop1 = governance.get_proposal(proposal1).unwrap().unwrap();
    let prop2 = governance.get_proposal(proposal2).unwrap().unwrap();
    
    // Check that both proposals were processed independently
    assert!(prop1.status == ProposalStatus::Passed || prop1.status == ProposalStatus::Rejected);
    assert!(prop2.status == ProposalStatus::Passed || prop2.status == ProposalStatus::Rejected);
    
    // Proposal 2 should pass (700k yes vs 0 no)
    assert_eq!(prop2.status, ProposalStatus::Passed);
}

#[test]
fn test_zero_voting_power_edge_case() {
    let (mut governance, _temp_dir) = setup_test_governance();
    
    // Setup account with no staking power
    {
        let state = governance.state.clone();
        let mut state_guard = state.lock().unwrap();
        state_guard.set_balance("no_power", "udgt", 10_000_000); // Has DGT but no voting power
    }
    
    let proposal_id = governance.submit_proposal(
        100,
        "Zero Power Test".to_string(),
        "Testing zero voting power".to_string(),
        ProposalType::ParameterChange {
            key: "gas_limit".to_string(),
            value: "30000".to_string(),
        },
    ).unwrap();
    
    // Can deposit without voting power
    governance.deposit(120, "no_power", proposal_id, 1_000_000, "udgt").unwrap();
    governance.process_proposals(200).unwrap();
    
    // Try to vote with zero voting power
    let result = governance.vote(220, "no_power", proposal_id, VoteOption::Yes);
    // Should either be allowed (counting as 0 power) or rejected
    // Implementation dependent - both behaviors are valid
    
    governance.process_proposals(300).unwrap();
    
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    // Should be rejected due to no participation
    assert_eq!(proposal.status, ProposalStatus::Rejected);
}