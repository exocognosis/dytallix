use dytallix_lean_node::runtime::emission::EmissionEngine;
use dytallix_lean_node::state::State;
use dytallix_lean_node::storage::state::Storage;
use std::sync::{Arc, Mutex};
use tempfile::tempdir;

#[test]
fn emission_accumulates_and_claims() {
    let dir = tempdir().unwrap();
    let storage = Arc::new(Storage::open(dir.path().join("node.db")).unwrap());
    let state = Arc::new(Mutex::new(State::new(storage.clone())));
    let engine = EmissionEngine::new(storage.clone(), state.clone());
    assert_eq!(engine.last_accounted_height(), 0);
    engine.apply_until(5); // 5 blocks
                           // per_block: community=5, staking=7, ecosystem=3 -> totals *5
    assert_eq!(engine.pool_amount("community"), 25);
    assert_eq!(engine.pool_amount("staking"), 35);
    assert_eq!(engine.pool_amount("ecosystem"), 15);
    // claim 10 from staking to acct X
    engine.claim("staking", 10, "acctX").unwrap();
    assert_eq!(engine.pool_amount("staking"), 25);
    // account credited
    let bal = state.lock().unwrap().balance_of("acctX");
    assert_eq!(bal, 10);
}

#[test]
fn emission_boundary_epoch_rollover() {
    let dir = tempdir().unwrap();
    let storage = Arc::new(Storage::open(dir.path().join("node.db")).unwrap());
    let state = Arc::new(Mutex::new(State::new(storage.clone())));
    let engine = EmissionEngine::new(storage.clone(), state.clone());
    engine.apply_until(1);
    engine.apply_until(1); // idempotent if height unchanged
    assert_eq!(engine.pool_amount("community"), 5);
    engine.apply_until(2);
    assert_eq!(engine.pool_amount("community"), 10);
}
