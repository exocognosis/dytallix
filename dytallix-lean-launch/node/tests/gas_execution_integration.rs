/*
Integration tests for gas execution to verify deterministic behavior 
across block production and replay scenarios.
*/

use dytallix_lean_node::execution::execute_transaction;
use dytallix_lean_node::gas::GasSchedule;
use dytallix_lean_node::storage::tx::Transaction;
use dytallix_lean_node::storage::receipts::TxStatus;
use dytallix_lean_node::storage::state::Storage;
use dytallix_lean_node::state::State;
use std::path::PathBuf;
use std::sync::Arc;

fn create_test_state() -> State {
    let storage = Arc::new(Storage::open(PathBuf::from(":memory:")).unwrap());
    State::new(storage)
}

#[test]
fn test_block_replay_determinism() {
    let gas_schedule = GasSchedule::default();
    
    // Create two identical states
    let mut state1 = create_test_state();
    let mut state2 = create_test_state();
    
    // Setup identical initial conditions
    state1.set_balance("alice", "udgt", 100_000);
    state1.set_balance("bob", "udgt", 50_000);
    state2.set_balance("alice", "udgt", 100_000);
    state2.set_balance("bob", "udgt", 50_000);
    
    // Create identical transactions
    let txs = vec![
        Transaction::with_gas(
            "tx1".to_string(),
            "alice".to_string(),
            "bob".to_string(),
            1_000,
            5_000,
            0,
            Some("sig1".to_string()),
            25_000,
            1_000,
        ),
        Transaction::with_gas(
            "tx2".to_string(),
            "bob".to_string(),
            "alice".to_string(),
            500,
            3_000,
            0,
            Some("sig2".to_string()),
            20_000,
            800,
        ),
    ];
    
    // Execute on both states
    let mut results1 = Vec::new();
    let mut results2 = Vec::new();
    
    for (i, tx) in txs.iter().enumerate() {
        let result1 = execute_transaction(tx, &mut state1, 100, i as u32, &gas_schedule);
        let result2 = execute_transaction(tx, &mut state2, 100, i as u32, &gas_schedule);
        
        results1.push(result1);
        results2.push(result2);
    }
    
    // Verify identical results
    assert_eq!(results1.len(), results2.len());
    
    for (r1, r2) in results1.iter().zip(results2.iter()) {
        assert_eq!(r1.success, r2.success);
        assert_eq!(r1.gas_used, r2.gas_used);
        assert_eq!(r1.receipt.status, r2.receipt.status);
        assert_eq!(r1.receipt.gas_used, r2.receipt.gas_used);
        assert_eq!(r1.receipt.gas_limit, r2.receipt.gas_limit);
        assert_eq!(r1.receipt.gas_price, r2.receipt.gas_price);
        assert_eq!(r1.receipt.error, r2.receipt.error);
    }
    
    // Verify identical final state
    assert_eq!(state1.balance_of("alice", "udgt"), state2.balance_of("alice", "udgt"));
    assert_eq!(state1.balance_of("bob", "udgt"), state2.balance_of("bob", "udgt"));
    assert_eq!(state1.nonce_of("alice"), state2.nonce_of("alice"));
    assert_eq!(state1.nonce_of("bob"), state2.nonce_of("bob"));
}

#[test]
fn test_multiple_txs_mixed_success_failure() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();
    
    // Setup initial balances
    state.set_balance("alice", "udgt", 100_000);
    state.set_balance("bob", "udgt", 50_000);
    state.set_balance("charlie", "udgt", 1_000); // Low balance
    
    let transactions = vec![
        // Success case
        Transaction::with_gas(
            "tx_success".to_string(),
            "alice".to_string(),
            "bob".to_string(),
            1_000,
            5_000,
            0,
            Some("sig".to_string()),
            25_000,
            1_000,
        ),
        // Insufficient funds case
        Transaction::with_gas(
            "tx_insufficient".to_string(),
            "charlie".to_string(),
            "alice".to_string(),
            10_000, // More than charlie has
            5_000,
            0,
            Some("sig".to_string()),
            25_000,
            1_000,
        ),
        // Out of gas case (very low gas limit)
        Transaction::with_gas(
            "tx_oom".to_string(),
            "alice".to_string(),
            "bob".to_string(),
            1_000,
            5_000,
            1,
            Some("sig".to_string()),
            50, // Very low gas limit
            1_000,
        ),
        // Another success case
        Transaction::with_gas(
            "tx_success2".to_string(),
            "bob".to_string(),
            "alice".to_string(),
            500,
            3_000,
            0,
            Some("sig".to_string()),
            30_000,
            800,
        ),
    ];
    
    let initial_alice_balance = state.balance_of("alice", "udgt");
    let initial_bob_balance = state.balance_of("bob", "udgt");
    let initial_charlie_balance = state.balance_of("charlie", "udgt");
    
    let mut results = Vec::new();
    
    for (i, tx) in transactions.iter().enumerate() {
        let result = execute_transaction(tx, &mut state, 100, i as u32, &gas_schedule);
        results.push(result);
    }
    
    // Verify expected outcomes
    assert!(results[0].success); // alice -> bob success
    assert!(!results[1].success); // charlie insufficient funds
    assert!(!results[2].success); // alice OOM
    assert!(results[3].success); // bob -> alice success
    
    // Verify gas usage and receipts
    assert!(results[0].gas_used > 0);
    assert_eq!(results[1].gas_used, 0); // No gas used on insufficient funds
    assert!(results[2].gas_used > 0); // Some gas used before OOM
    assert!(results[3].gas_used > 0);
    
    // Verify state changes
    let final_alice_balance = state.balance_of("alice", "udgt");
    let final_bob_balance = state.balance_of("bob", "udgt");
    let final_charlie_balance = state.balance_of("charlie", "udgt");
    
    // Charlie should be unchanged (transaction failed early)
    assert_eq!(final_charlie_balance, initial_charlie_balance);
    
    // Alice and Bob should reflect successful transactions and gas fees
    assert!(final_alice_balance < initial_alice_balance); // Paid fees and transfer
    assert!(final_bob_balance > initial_bob_balance); // Received transfer minus fee
}

#[test]
fn test_deterministic_gas_consumption() {
    let gas_schedule = GasSchedule::default();
    
    // Test that identical transactions consume identical gas
    let test_cases = vec![
        ("alice", "bob", 1_000u128, 25_000u64, 1_000u64),
        ("bob", "charlie", 2_000u128, 30_000u64, 800u64),
        ("charlie", "alice", 500u128, 20_000u64, 1_200u64),
    ];
    
    for (from, to, amount, gas_limit, gas_price) in test_cases {
        let mut state1 = create_test_state();
        let mut state2 = create_test_state();
        
        // Setup identical states
        state1.set_balance(from, "udgt", 100_000);
        state2.set_balance(from, "udgt", 100_000);
        
        let tx = Transaction::with_gas(
            "test_hash".to_string(),
            from.to_string(),
            to.to_string(),
            amount,
            5_000,
            0,
            Some("sig".to_string()),
            gas_limit,
            gas_price,
        );
        
        // Execute multiple times
        let result1 = execute_transaction(&tx, &mut state1, 100, 0, &gas_schedule);
        let result2 = execute_transaction(&tx, &mut state2, 100, 0, &gas_schedule);
        
        // Results must be identical
        assert_eq!(result1.success, result2.success);
        assert_eq!(result1.gas_used, result2.gas_used);
        assert_eq!(result1.receipt.gas_used, result2.receipt.gas_used);
        assert_eq!(result1.receipt.status, result2.receipt.status);
    }
}

#[test]
fn test_execution_order_determinism() {
    let gas_schedule = GasSchedule::default();
    
    // Create transactions that could affect each other
    let transactions = vec![
        Transaction::with_gas("tx1".to_string(), "alice".to_string(), "bob".to_string(), 1_000, 5_000, 0, Some("sig".to_string()), 25_000, 1_000),
        Transaction::with_gas("tx2".to_string(), "bob".to_string(), "charlie".to_string(), 500, 3_000, 0, Some("sig".to_string()), 20_000, 800),
        Transaction::with_gas("tx3".to_string(), "alice".to_string(), "charlie".to_string(), 2_000, 4_000, 1, Some("sig".to_string()), 30_000, 1_200),
    ];
    
    // Execute in order on state1
    let mut state1 = create_test_state();
    state1.set_balance("alice", "udgt", 100_000);
    state1.set_balance("bob", "udgt", 50_000);
    state1.set_balance("charlie", "udgt", 25_000);
    
    let mut results1 = Vec::new();
    for (i, tx) in transactions.iter().enumerate() {
        let result = execute_transaction(tx, &mut state1, 100, i as u32, &gas_schedule);
        results1.push(result);
    }
    
    // Execute in same order on state2 (should be identical)
    let mut state2 = create_test_state();
    state2.set_balance("alice", "udgt", 100_000);
    state2.set_balance("bob", "udgt", 50_000);
    state2.set_balance("charlie", "udgt", 25_000);
    
    let mut results2 = Vec::new();
    for (i, tx) in transactions.iter().enumerate() {
        let result = execute_transaction(tx, &mut state2, 100, i as u32, &gas_schedule);
        results2.push(result);
    }
    
    // Results must be identical
    for (r1, r2) in results1.iter().zip(results2.iter()) {
        assert_eq!(r1.success, r2.success);
        assert_eq!(r1.gas_used, r2.gas_used);
        assert_eq!(r1.receipt.status, r2.receipt.status);
    }
    
    // Final states must be identical
    assert_eq!(state1.balance_of("alice", "udgt"), state2.balance_of("alice", "udgt"));
    assert_eq!(state1.balance_of("bob", "udgt"), state2.balance_of("bob", "udgt"));
    assert_eq!(state1.balance_of("charlie", "udgt"), state2.balance_of("charlie", "udgt"));
}

#[test]
fn test_state_isolation_between_transactions() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();
    
    state.set_balance("alice", "udgt", 50_000);
    
    // First transaction that will fail due to OOM
    let tx_fail = Transaction::with_gas(
        "tx_fail".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        5_000,
        0,
        Some("sig".to_string()),
        50, // Very low gas
        1_000,
    );
    
    let initial_balance = state.balance_of("alice", "udgt");
    let result_fail = execute_transaction(&tx_fail, &mut state, 100, 0, &gas_schedule);
    assert!(!result_fail.success);
    
    // Bob should not have received any money due to revert
    assert_eq!(state.balance_of("bob", "udgt"), 0);
    
    // Alice should only have lost the gas fee (gas_limit * gas_price)
    let gas_fee = 50u128 * 1_000u128;
    assert_eq!(state.balance_of("alice", "udgt"), initial_balance - gas_fee);
    
    // Second transaction that will succeed
    let tx_success = Transaction::with_gas(
        "tx_success".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        5_000,
        1, // Incremented nonce
        Some("sig".to_string()),
        25_000, // Sufficient gas
        1_000,
    );
    
    let result_success = execute_transaction(&tx_success, &mut state, 100, 1, &gas_schedule);
    assert!(result_success.success);
    
    // Now bob should have received the money
    assert_eq!(state.balance_of("bob", "udgt"), 1_000);
}

#[test]
fn test_comprehensive_block_replay_determinism() {
    let gas_schedule = GasSchedule::default();
    
    // Create a comprehensive set of transactions with different outcomes
    let transactions = vec![
        // Successful transfer
        Transaction::with_gas("tx1".to_string(), "alice".to_string(), "bob".to_string(), 1_000, 5_000, 0, Some("sig1".to_string()), 25_000, 1_000),
        // Failed due to insufficient funds
        Transaction::with_gas("tx2".to_string(), "charlie".to_string(), "bob".to_string(), 100_000, 5_000, 0, Some("sig2".to_string()), 25_000, 1_000),
        // Out of gas transaction
        Transaction::with_gas("tx3".to_string(), "bob".to_string(), "alice".to_string(), 500, 5_000, 0, Some("sig3".to_string()), 100, 1_000),
        // Another successful transfer
        Transaction::with_gas("tx4".to_string(), "alice".to_string(), "bob".to_string(), 500, 5_000, 1, Some("sig4".to_string()), 30_000, 800),
        // Failed due to wrong nonce
        Transaction::with_gas("tx5".to_string(), "bob".to_string(), "charlie".to_string(), 200, 5_000, 5, Some("sig5".to_string()), 25_000, 1_000),
    ];
    
    // Execute the block multiple times and ensure identical results
    let mut all_results = Vec::new();
    let mut all_final_states = Vec::new();
    
    for run in 0..3 {
        let mut state = create_test_state();
        
        // Setup identical initial conditions
        state.set_balance("alice", "udgt", 100_000);
        state.set_balance("bob", "udgt", 50_000);
        state.set_balance("charlie", "udgt", 1_000); // Insufficient for tx2
        
        let mut run_results = Vec::new();
        
        for (i, tx) in transactions.iter().enumerate() {
            let result = execute_transaction(tx, &mut state, 100 + run as u64, i as u32, &gas_schedule);
            run_results.push(result);
        }
        
        all_results.push(run_results);
        all_final_states.push((
            state.balance_of("alice", "udgt"),
            state.balance_of("bob", "udgt"), 
            state.balance_of("charlie", "udgt"),
            state.nonce_of("alice"),
            state.nonce_of("bob"),
            state.nonce_of("charlie"),
        ));
    }
    
    // Verify all runs produced identical results
    let first_results = &all_results[0];
    let first_state = &all_final_states[0];
    
    for (run_idx, results) in all_results.iter().enumerate().skip(1) {
        assert_eq!(results.len(), first_results.len(), "Run {} has different number of results", run_idx);
        
        for (tx_idx, (result, first_result)) in results.iter().zip(first_results.iter()).enumerate() {
            assert_eq!(result.success, first_result.success, "Run {} tx {} success differs", run_idx, tx_idx);
            assert_eq!(result.gas_used, first_result.gas_used, "Run {} tx {} gas_used differs", run_idx, tx_idx);
            assert_eq!(result.receipt.status, first_result.receipt.status, "Run {} tx {} status differs", run_idx, tx_idx);
            assert_eq!(result.receipt.gas_used, first_result.receipt.gas_used, "Run {} tx {} receipt gas_used differs", run_idx, tx_idx);
            assert_eq!(result.receipt.error, first_result.receipt.error, "Run {} tx {} error differs", run_idx, tx_idx);
        }
        
        let final_state = &all_final_states[run_idx];
        assert_eq!(final_state, first_state, "Run {} final state differs", run_idx);
    }
}

#[test]
fn test_state_root_determinism() {
    use sha2::{Sha256, Digest};
    let gas_schedule = GasSchedule::default();
    
    let transactions = vec![
        Transaction::with_gas("tx1".to_string(), "alice".to_string(), "bob".to_string(), 1_000, 5_000, 0, Some("sig1".to_string()), 25_000, 1_000),
        Transaction::with_gas("tx2".to_string(), "bob".to_string(), "charlie".to_string(), 500, 3_000, 0, Some("sig2".to_string()), 20_000, 800),
        Transaction::with_gas("tx3".to_string(), "alice".to_string(), "charlie".to_string(), 2_000, 4_000, 1, Some("sig3".to_string()), 30_000, 1_200),
    ];
    
    let mut state_hashes = Vec::new();
    
    // Execute the same block multiple times
    for run in 0..3 {
        let mut state = create_test_state();
        
        // Setup identical initial conditions
        state.set_balance("alice", "udgt", 100_000);
        state.set_balance("bob", "udgt", 50_000);
        state.set_balance("charlie", "udgt", 25_000);
        
        // Execute all transactions
        for (i, tx) in transactions.iter().enumerate() {
            execute_transaction(tx, &mut state, 100, i as u32, &gas_schedule);
        }
        
        // Calculate state hash based on final balances and nonces
        let mut hasher = Sha256::new();
        hasher.update(state.balance_of("alice", "udgt").to_le_bytes());
        hasher.update(state.balance_of("bob", "udgt").to_le_bytes());
        hasher.update(state.balance_of("charlie", "udgt").to_le_bytes());
        hasher.update(state.nonce_of("alice").to_le_bytes());
        hasher.update(state.nonce_of("bob").to_le_bytes());
        hasher.update(state.nonce_of("charlie").to_le_bytes());
        
        let state_hash = hasher.finalize();
        state_hashes.push(state_hash);
    }
    
    // All state hashes must be identical
    let first_hash = &state_hashes[0];
    for (i, hash) in state_hashes.iter().enumerate().skip(1) {
        assert_eq!(hash, first_hash, "State hash for run {} differs from first run", i);
    }
}

#[test]
fn test_receipt_hash_determinism() {
    use sha2::{Sha256, Digest};
    let gas_schedule = GasSchedule::default();
    
    let tx = Transaction::with_gas(
        "deterministic_test".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        10_000,
        0,
        Some("sig".to_string()),
        25_000,
        1_000,
    );
    
    let mut receipt_hashes = Vec::new();
    
    // Execute same transaction multiple times
    for _ in 0..5 {
        let mut state = create_test_state();
        state.set_balance("alice", "udgt", 100_000);
        
        let result = execute_transaction(&tx, &mut state, 100, 0, &gas_schedule);
        
        // Calculate receipt hash
        let mut hasher = Sha256::new();
        hasher.update(&result.receipt.tx_hash);
        hasher.update(&result.receipt.from);
        hasher.update(&result.receipt.to);
        hasher.update(result.receipt.amount.to_le_bytes());
        hasher.update(result.receipt.gas_limit.to_le_bytes());
        hasher.update(result.receipt.gas_price.to_le_bytes());
        hasher.update(result.receipt.gas_used.to_le_bytes());
        hasher.update(&[if result.receipt.status == TxStatus::Success { 1u8 } else { 0u8 }]);
        
        let receipt_hash = hasher.finalize();
        receipt_hashes.push(receipt_hash);
    }
    
    // All receipt hashes must be identical
    let first_hash = &receipt_hashes[0];
    for (i, hash) in receipt_hashes.iter().enumerate().skip(1) {
        assert_eq!(hash, first_hash, "Receipt hash for execution {} differs from first", i);
    }
}

#[test]
fn test_transaction_ordering_determinism() {
    let gas_schedule = GasSchedule::default();
    
    // Test that transaction order affects final state deterministically
    let transactions = vec![
        Transaction::with_gas("tx1".to_string(), "alice".to_string(), "bob".to_string(), 1_000, 5_000, 0, Some("sig1".to_string()), 25_000, 1_000),
        Transaction::with_gas("tx2".to_string(), "bob".to_string(), "charlie".to_string(), 500, 3_000, 0, Some("sig2".to_string()), 20_000, 800),
        Transaction::with_gas("tx3".to_string(), "charlie".to_string(), "alice".to_string(), 200, 2_000, 0, Some("sig3".to_string()), 15_000, 1_200),
    ];
    
    // Execute in order A -> B -> C
    let mut state1 = create_test_state();
    state1.set_balance("alice", "udgt", 100_000);
    state1.set_balance("bob", "udgt", 50_000);
    state1.set_balance("charlie", "udgt", 25_000);
    
    let mut results1 = Vec::new();
    for (i, tx) in transactions.iter().enumerate() {
        let result = execute_transaction(tx, &mut state1, 100, i as u32, &gas_schedule);
        results1.push(result);
    }
    
    // Execute in same order on fresh state (should be identical)
    let mut state2 = create_test_state();
    state2.set_balance("alice", "udgt", 100_000);
    state2.set_balance("bob", "udgt", 50_000);
    state2.set_balance("charlie", "udgt", 25_000);
    
    let mut results2 = Vec::new();
    for (i, tx) in transactions.iter().enumerate() {
        let result = execute_transaction(tx, &mut state2, 100, i as u32, &gas_schedule);
        results2.push(result);
    }
    
    // Results must be identical when order is the same
    for (r1, r2) in results1.iter().zip(results2.iter()) {
        assert_eq!(r1.success, r2.success);
        assert_eq!(r1.gas_used, r2.gas_used);
        assert_eq!(r1.receipt.status, r2.receipt.status);
    }
    
    // Final states must be identical
    assert_eq!(state1.balance_of("alice", "udgt"), state2.balance_of("alice", "udgt"));
    assert_eq!(state1.balance_of("bob", "udgt"), state2.balance_of("bob", "udgt"));
    assert_eq!(state1.balance_of("charlie", "udgt"), state2.balance_of("charlie", "udgt"));
}

#[test]
fn test_gas_metering_consistency() {
    let gas_schedule = GasSchedule::default();
    
    // Test that identical operations consume identical gas across runs
    let identical_txs = vec![
        Transaction::with_gas("tx1".to_string(), "alice".to_string(), "bob".to_string(), 1_000, 5_000, 0, Some("sig1".to_string()), 25_000, 1_000),
        Transaction::with_gas("tx2".to_string(), "alice".to_string(), "bob".to_string(), 1_000, 5_000, 0, Some("sig2".to_string()), 25_000, 1_000),
        Transaction::with_gas("tx3".to_string(), "alice".to_string(), "bob".to_string(), 1_000, 5_000, 0, Some("sig3".to_string()), 25_000, 1_000),
    ];
    
    let mut gas_consumptions = Vec::new();
    
    for tx in identical_txs {
        let mut state = create_test_state();
        state.set_balance("alice", "udgt", 100_000);
        
        let result = execute_transaction(&tx, &mut state, 100, 0, &gas_schedule);
        gas_consumptions.push(result.gas_used);
    }
    
    // All gas consumptions must be identical for identical operations
    let first_consumption = gas_consumptions[0];
    for (i, consumption) in gas_consumptions.iter().enumerate().skip(1) {
        assert_eq!(*consumption, first_consumption, "Gas consumption {} differs from first", i);
    }
}