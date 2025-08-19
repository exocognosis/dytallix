use dytallix_lean_launch_node::state::State;
use dytallix_lean_launch_node::storage::state::Storage;
use dytallix_lean_launch_node::storage::blocks::Block;
use dytallix_lean_launch_node::types::{Msg, Tx, SignedTx};
use std::sync::Arc;
use tempfile::TempDir;

fn create_test_state() -> (State, TempDir) {
    let temp_dir = TempDir::new().unwrap();
    let storage = Arc::new(Storage::new(temp_dir.path()).unwrap());
    let state = State::new(storage);
    (state, temp_dir)
}

#[test]
fn test_block_validator_set_hash() {
    let (mut state, _temp_dir) = create_test_state();
    
    // Initial hash should be all zeros (no validators)
    let initial_hash = state.get_validator_set_hash();
    assert_eq!(initial_hash, [0u8; 32]);
    
    // Add a stake
    let result = state.apply_stake("delegator1", "validator1", 1_000_000, 1000);
    assert!(result.is_ok());
    
    // Hash should now be different
    let new_hash = state.get_validator_set_hash();
    assert_ne!(new_hash, [0u8; 32]);
    assert_ne!(new_hash, initial_hash);
    
    // Adding more stake should change hash again
    let result2 = state.apply_stake("delegator2", "validator1", 500_000, 1000);
    assert!(result2.is_ok());
    
    let updated_hash = state.get_validator_set_hash();
    assert_ne!(updated_hash, new_hash);
}

#[test]
fn test_block_proposer_reward() {
    let (mut state, _temp_dir) = create_test_state();
    
    let proposer = "proposer1";
    
    // Check initial DRT balance
    let initial_balance = state.balance_of(proposer, "udrt");
    
    // Apply proposer reward
    let reward = state.apply_proposer_reward(proposer);
    
    // Check that DRT was minted
    let new_balance = state.balance_of(proposer, "udrt");
    assert_eq!(new_balance, initial_balance + reward);
    assert_eq!(reward, 10_000); // Default block reward
}

#[test]
fn test_stake_balance_integration() {
    let (mut state, _temp_dir) = create_test_state();
    
    let delegator = "delegator1";
    let validator = "validator1";
    
    // Set initial balance
    state.set_balance(delegator, "udgt", 2_000_000);
    
    // Apply stake
    let result = state.apply_stake(delegator, validator, 1_000_000, 1000);
    assert!(result.is_ok());
    
    // Check balance was debited correctly
    let remaining_balance = state.balance_of(delegator, "udgt");
    assert_eq!(remaining_balance, 999_000); // 2M - 1M - 1k fee
    
    // Check staking state was updated
    let validator_opt = state.staking.get_validator(validator);
    assert!(validator_opt.is_some());
    assert_eq!(validator_opt.unwrap().stake, 1_000_000);
}

#[test]
fn test_unstake_balance_integration() {
    let (mut state, _temp_dir) = create_test_state();
    
    let delegator = "delegator1";
    let validator = "validator1";
    
    // Set initial balance and stake
    state.set_balance(delegator, "udgt", 2_000_000);
    state.apply_stake(delegator, validator, 1_000_000, 1000).unwrap();
    
    let balance_after_stake = state.balance_of(delegator, "udgt");
    
    // Unstake half
    let result = state.apply_unstake(delegator, validator, 500_000, 1000);
    assert!(result.is_ok());
    
    // Check balance was credited back
    let final_balance = state.balance_of(delegator, "udgt");
    assert_eq!(final_balance, balance_after_stake + 500_000 - 1000); // Got tokens back minus fee
    
    // Check staking state
    let delegation = state.staking.get_delegation(delegator, validator);
    assert_eq!(delegation, Some(500_000)); // Half remaining
}

#[test]
fn test_insufficient_funds_for_stake() {
    let (mut state, _temp_dir) = create_test_state();
    
    let delegator = "delegator1";
    let validator = "validator1";
    
    // Set balance too low
    state.set_balance(delegator, "udgt", 500_000);
    
    // Try to stake more than available
    let result = state.apply_stake(delegator, validator, 1_000_000, 1000);
    assert!(result.is_err());
    
    // Balance should be unchanged
    let balance = state.balance_of(delegator, "udgt");
    assert_eq!(balance, 500_000);
}

#[test]
fn test_validator_set_persistence() {
    let (mut state, _temp_dir) = create_test_state();
    
    // Add multiple validators
    state.set_balance("del1", "udgt", 10_000_000);
    state.set_balance("del2", "udgt", 10_000_000);
    state.set_balance("del3", "udgt", 10_000_000);
    
    state.apply_stake("del1", "validator_a", 3_000_000, 1000).unwrap();
    state.apply_stake("del2", "validator_b", 1_000_000, 1000).unwrap();
    state.apply_stake("del3", "validator_c", 2_000_000, 1000).unwrap();
    
    // Get validator set and hash
    let validator_set = state.staking.get_active_validator_set();
    let hash = state.get_validator_set_hash();
    
    // Verify ordering (by stake desc, then address asc)
    assert_eq!(validator_set.len(), 3);
    assert_eq!(validator_set[0].address, "validator_a"); // 3M stake
    assert_eq!(validator_set[1].address, "validator_c"); // 2M stake
    assert_eq!(validator_set[2].address, "validator_b"); // 1M stake
    
    // Hash should be deterministic
    assert_ne!(hash, [0u8; 32]);
    
    // Create block with this hash
    let block = Block::new_with_validator_set_hash(
        1,
        "genesis".to_string(),
        1234567890,
        vec![],
        hash
    );
    
    assert_eq!(block.header.validator_set_hash, hash);
}