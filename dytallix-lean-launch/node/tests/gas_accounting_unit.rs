/*
Unit tests for gas accounting in the deterministic execution engine.

Tests upfront fee deduction, out-of-gas handling, receipt creation,
and other core gas accounting functionality.
*/

use dytallix_lean_node::execution::{execute_transaction, ExecutionContext};
use dytallix_lean_node::gas::{GasError, GasSchedule};
use dytallix_lean_node::state::State;
use dytallix_lean_node::storage::receipts::{TxStatus, RECEIPT_FORMAT_VERSION};
use dytallix_lean_node::storage::state::Storage;
use dytallix_lean_node::storage::tx::Transaction;
use std::path::PathBuf;
use std::sync::Arc;

fn create_test_state() -> State {
    let storage = Arc::new(Storage::open(PathBuf::from(":memory:")).unwrap());
    State::new(storage)
}

#[test]
fn test_upfront_fee_deduction_success() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();

    // Setup sufficient balance
    state.set_balance("alice", "udgt", 100_000);

    let tx = Transaction::with_gas(
        "test_hash".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        10_000, // Legacy fee field
        0,
        Some("sig".to_string()),
        25_000, // gas_limit
        1_000,  // gas_price
    );

    let result = execute_transaction(&tx, &mut state, 100, 0, &gas_schedule);

    assert!(result.success);
    assert_eq!(result.receipt.status, TxStatus::Success);
    assert_eq!(result.receipt.gas_limit, 25_000);
    assert_eq!(result.receipt.gas_price, 1_000);
    assert_eq!(result.receipt.receipt_version, RECEIPT_FORMAT_VERSION);

    // Verify upfront fee was charged
    let upfront_fee = 25_000u128 * 1_000u128; // gas_limit * gas_price
    let expected_balance = 100_000 - upfront_fee - 1_000; // initial - fee - amount
    assert_eq!(state.balance_of("alice", "udgt"), expected_balance);
}

#[test]
fn test_upfront_fee_deduction_failure_insufficient() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();

    // Setup insufficient balance
    state.set_balance("alice", "udgt", 1_000); // Not enough for gas fee

    let tx = Transaction::with_gas(
        "test_hash".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        500,
        10_000, // Legacy fee
        0,
        Some("sig".to_string()),
        25_000, // gas_limit
        1_000,  // gas_price -> 25M total fee needed
    );

    let result = execute_transaction(&tx, &mut state, 100, 0, &gas_schedule);

    assert!(!result.success);
    assert_eq!(result.receipt.status, TxStatus::Failed);
    assert!(result
        .receipt
        .error
        .as_ref()
        .unwrap()
        .contains("InsufficientFunds"));
    assert_eq!(result.gas_used, 0);

    // Balance should be unchanged since no fee was deducted
    assert_eq!(state.balance_of("alice", "udgt"), 1_000);
}

#[test]
fn test_oom_full_revert() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();

    // Setup balance
    state.set_balance("alice", "udgt", 100_000);
    state.set_balance("bob", "udgt", 50_000);

    // Create transaction with very low gas limit to trigger OOM
    let tx = Transaction::with_gas(
        "test_hash".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        10_000,
        0,
        Some("sig".to_string()),
        100, // Very low gas limit - should cause OOM
        1_000,
    );

    let initial_alice_balance = state.balance_of("alice", "udgt");
    let initial_bob_balance = state.balance_of("bob", "udgt");

    let result = execute_transaction(&tx, &mut state, 100, 0, &gas_schedule);

    // Transaction should fail due to out of gas
    assert!(!result.success);
    assert_eq!(result.receipt.status, TxStatus::Failed);
    assert!(result.receipt.error.as_ref().unwrap().contains("OutOfGas"));
    assert!(result.gas_used > 0); // Some gas was consumed before failure

    // State should be reverted except for the gas fee
    let upfront_fee = 100u128 * 1_000u128; // gas_limit * gas_price
    assert_eq!(
        state.balance_of("alice", "udgt"),
        initial_alice_balance - upfront_fee
    );
    assert_eq!(state.balance_of("bob", "udgt"), initial_bob_balance); // No change to bob
}

#[test]
fn test_receipt_fields() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();

    state.set_balance("alice", "udgt", 100_000);

    let tx = Transaction::with_gas(
        "test_hash_123".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        2_000,
        5_000,
        42, // nonce
        Some("signature_data".to_string()),
        30_000,
        500,
    );

    let result = execute_transaction(&tx, &mut state, 150, 3, &gas_schedule);

    // Check all receipt fields are properly set
    let receipt = &result.receipt;
    assert_eq!(receipt.receipt_version, RECEIPT_FORMAT_VERSION);
    assert_eq!(receipt.tx_hash, "test_hash_123");
    assert_eq!(receipt.block_height, Some(150));
    assert_eq!(receipt.index, Some(3));
    assert_eq!(receipt.from, "alice");
    assert_eq!(receipt.to, "bob");
    assert_eq!(receipt.amount, 2_000);
    assert_eq!(receipt.fee, 5_000);
    assert_eq!(receipt.nonce, 42);
    assert_eq!(receipt.gas_limit, 30_000);
    assert_eq!(receipt.gas_price, 500);
    assert_eq!(receipt.gas_refund, 0); // Always 0 as per spec
    assert!(receipt.gas_used > 0);
    assert_eq!(receipt.success, result.success);

    if result.success {
        assert!(receipt.error.is_none());
        assert_eq!(receipt.status, TxStatus::Success);
    } else {
        assert!(receipt.error.is_some());
        assert_eq!(receipt.status, TxStatus::Failed);
    }
}

#[test]
fn test_legacy_transaction_compatibility() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();

    state.set_balance("alice", "udgt", 100_000);

    // Legacy transaction with gas_limit=0, gas_price=0
    let tx = Transaction::new(
        "legacy_hash".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        5_000, // fee
        0,
        Some("sig".to_string()),
    );

    let result = execute_transaction(&tx, &mut state, 100, 0, &gas_schedule);

    assert!(result.success);
    assert_eq!(result.receipt.gas_limit, 5_000); // fee used as gas_limit
    assert_eq!(result.receipt.gas_price, 1); // gas_price=1
}

#[test]
fn test_execution_context_fee_calculation() {
    let ctx = ExecutionContext::new(25_000, 1_500);
    let fee = ctx.calculate_upfront_fee().unwrap();
    assert_eq!(fee, 37_500_000); // 25000 * 1500
}

#[test]
fn test_execution_context_fee_overflow() {
    let ctx = ExecutionContext::new(u64::MAX, u64::MAX);
    assert!(ctx.calculate_upfront_fee().is_err());
}

#[test]
fn test_invalid_nonce_handling() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();

    state.set_balance("alice", "udgt", 100_000);
    // Nonce is 0 initially, but transaction has nonce 5

    let tx = Transaction::with_gas(
        "test_hash".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        10_000,
        5, // Wrong nonce
        Some("sig".to_string()),
        25_000,
        1_000,
    );

    let result = execute_transaction(&tx, &mut state, 100, 0, &gas_schedule);

    assert!(!result.success);
    assert_eq!(result.receipt.status, TxStatus::Failed);
    assert!(result
        .receipt
        .error
        .as_ref()
        .unwrap()
        .contains("InvalidNonce"));
    assert_eq!(result.gas_used, 0);
}
