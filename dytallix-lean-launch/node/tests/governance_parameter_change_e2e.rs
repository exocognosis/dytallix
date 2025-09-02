use dytallix_lean_node::runtime::governance::{
    GovernanceModule, ProposalStatus, ProposalType, VoteOption,
};
use dytallix_lean_node::runtime::staking::StakingModule;
use dytallix_lean_node::state::State;
use dytallix_lean_node::storage::state::Storage;
use std::sync::{Arc, Mutex};
use tempfile::tempdir;

#[test]
fn governance_parameter_change_e2e() {
    // Setup backed by temp storage
    let dir = tempdir().unwrap();
    let storage = Arc::new(Storage::open(dir.path().join("node.db")).unwrap());
    let state = Arc::new(Mutex::new(State::new(storage.clone())));
    let staking = Arc::new(Mutex::new(StakingModule::new(storage.clone())));
    let mut governance = GovernanceModule::new(storage.clone(), state.clone(), staking);

    // Test proposal submission
    let proposal_id = governance
        .submit_proposal(
            100, // height
            "Gas Limit Increase".to_string(),
            "Increase gas limit from 21,000 to 50,000 for better UX".to_string(),
            ProposalType::ParameterChange {
                key: "gas_limit".to_string(),
                value: "50000".to_string(),
            },
        )
        .expect("Failed to submit proposal");

    assert_eq!(proposal_id, 1);

    // Deposit enough to meet minimum requirement
    governance
        .deposit(
            150, // height
            "depositor1",
            proposal_id,
            1_000_000_000, // 1000 DGT
            "udgt",
        )
        .expect("Failed to deposit");

    // Vote on proposal within the configured voting period
    governance
        .vote(
            450, // height inside voting window (submit_height + deposit_period .. + voting_period)
            "voter1",
            proposal_id,
            VoteOption::Yes,
        )
        .expect("Failed to vote");

    governance
        .vote(
            460, // height inside voting window
            "voter2",
            proposal_id,
            VoteOption::Yes,
        )
        .expect("Failed to vote");

    // Get initial parameter value
    let initial_gas_limit = governance.get_config().gas_limit;
    assert_eq!(initial_gas_limit, 21_000);

    // Process proposal at end of voting period
    // Tally and execute via end_block after voting end
    governance
        .end_block(701)
        .expect("Failed to process end_block");

    // Verify proposal passed and parameter changed
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(proposal.status, ProposalStatus::Executed);

    // Verify parameter was changed
    let new_gas_limit = governance.get_config().gas_limit;
    assert_eq!(new_gas_limit, 50_000);

    println!("✅ Parameter change test passed: gas_limit {initial_gas_limit} -> {new_gas_limit}");
}
