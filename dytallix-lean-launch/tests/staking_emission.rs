use dytallix_lean_node::runtime::emission::{
    EmissionBreakdown, EmissionConfig, EmissionEngine, EmissionSchedule,
};
use dytallix_lean_node::runtime::staking::StakingModule;
use dytallix_lean_node::state::State;
use dytallix_lean_node::storage::state::Storage;
use std::sync::{Arc, Mutex};
use tempfile::tempdir;

/// Minimal integration test: mint and distribute 10 DRT to a single delegator via emissions
#[test]
fn staking_emission_distributes_10_tokens() {
    // Initialize an isolated testnet context (temp RocksDB)
    let dir = tempdir().unwrap();
    let storage = Arc::new(Storage::open(dir.path().join("staking_emission.db")).unwrap());
    let state = Arc::new(Mutex::new(State::new(storage.clone())));

    // Configure emission engine to mint exactly 10 DRT (10_000_000 uDRT) per block,
    // with 100% routed to staking_rewards to keep the test deterministic and simple.
    let config = EmissionConfig {
        schedule: EmissionSchedule::Static {
            per_block: 10_000_000,
        }, // 10 DRT (micro)
        initial_supply: 0,
        emission_breakdown: EmissionBreakdown {
            block_rewards: 0,
            staking_rewards: 100,
            ai_module_incentives: 0,
            bridge_operations: 0,
        },
    };

    let mut emission = EmissionEngine::new_with_config(storage.clone(), state.clone(), config);
    let mut staking = StakingModule::new(storage);

    // Enable staking and delegate full stake to a single delegator so they receive 100% rewards
    let delegator = "delegator1";
    staking.set_total_stake(1_000_000_000_000); // 1,000,000 DGT (uDGT)
    staking.update_delegator_stake(delegator, 1_000_000_000_000);

    // Log before balances
    let before = state.lock().unwrap().balance_of(delegator, "udrt");
    println!(
        "[staking_emission] before: delegator={} udrt={}",
        delegator, before
    );

    // Mint one block of emissions and apply staking pool to staking module
    emission.apply_until(1);
    let staking_rewards = emission.get_latest_staking_rewards();
    assert_eq!(
        staking_rewards, 10_000_000,
        "staking pool must receive 10 DRT (uDRT)"
    );
    staking.apply_external_emission(staking_rewards);

    // Claim rewards (which returns uDRT), then credit to account balance to simulate RPC path
    let claimed = staking.claim_rewards(delegator);
    assert_eq!(claimed, 10_000_000, "delegator should claim full 10 DRT");
    state.lock().unwrap().credit(delegator, "udrt", claimed);

    // Log after balances and verify delta
    let after = state.lock().unwrap().balance_of(delegator, "udrt");
    println!(
        "[staking_emission] after:  delegator={} udrt={}",
        delegator, after
    );

    assert_eq!(
        after.saturating_sub(before),
        10_000_000,
        "balance delta must equal 10 DRT (uDRT)"
    );

    // Extra visibility into staking stats
    let (total_stake, reward_index, pending) = staking.get_stats();
    println!(
        "[staking_emission] stats: total_stake={} reward_index={} pending_emission={}",
        total_stake, reward_index, pending
    );
}
