use dytallix_lean_node::runtime::governance::{
    GovernanceConfig, GovernanceModule, ProposalType, VoteOption,
};
use dytallix_lean_node::state::State;
use dytallix_lean_node::storage::state::Storage;
use std::sync::{Arc, Mutex};

#[test]
fn governance_parameter_change_e2e() {
    // Setup
    let storage = Arc::new(Storage::memory());
    let state = Arc::new(Mutex::new(State::new()));
    let mut governance = GovernanceModule::new(storage.clone(), state.clone());

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

    // Transition to voting period (in practice this happens via end_block)
    {
        let mut proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
        proposal.status = dytallix_lean_node::runtime::governance::ProposalStatus::VotingPeriod;
        proposal.voting_start_height = 200;
        proposal.voting_end_height = 500;
        governance._store_proposal(&proposal).unwrap();
    }

    // Vote on proposal (achieving quorum and threshold)
    governance
        .vote(
            250, // height
            "voter1",
            proposal_id,
            VoteOption::Yes,
            "udgt",
        )
        .expect("Failed to vote");

    governance
        .vote(
            260, // height
            "voter2",
            proposal_id,
            VoteOption::Yes,
            "udgt",
        )
        .expect("Failed to vote");

    // Get initial parameter value
    let initial_gas_limit = governance.get_config().gas_limit;
    assert_eq!(initial_gas_limit, 21_000);

    // Process proposal at end of voting period
    governance
        .end_block(501)
        .expect("Failed to process end_block");

    // Verify proposal passed and parameter changed
    let proposal = governance.get_proposal(proposal_id).unwrap().unwrap();
    assert_eq!(
        proposal.status,
        dytallix_lean_node::runtime::governance::ProposalStatus::Passed
    );

    // Execute the proposal
    governance
        .execute_proposal(proposal_id)
        .expect("Failed to execute proposal");

    // Verify parameter was changed
    let new_gas_limit = governance.get_config().gas_limit;
    assert_eq!(new_gas_limit, 50_000);

    println!(
        "✅ Parameter change test passed: gas_limit {} -> {}",
        initial_gas_limit, new_gas_limit
    );
}
