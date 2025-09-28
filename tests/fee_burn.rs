/*
Fee Burn Testing - Verifies fee burning mechanism in dual-token economy

Tests various scenarios:
- Basic fee burning with default configuration
- Fee burning with different burn rates
- Minimum threshold enforcement
- Token supply reduction validation
- Governance parameter changes
*/

use dytallix_lean_launch::execution::{execute_transaction, ExecutionResult};
use dytallix_lean_launch::gas::GasSchedule;
use dytallix_lean_launch::runtime::fee_burn::{FeeBurnEngine, FeeBurnConfig};
use dytallix_lean_launch::state::State;
use dytallix_lean_launch::storage::state::Storage;
use dytallix_lean_launch::storage::tx::Transaction;
use std::sync::Arc;
use tempfile;

fn create_test_state() -> State {
    let dir = tempfile::tempdir().expect("tempdir");
    let storage = Arc::new(Storage::open(dir.path().join("state.db")).unwrap());
    State::new(storage)
}

#[test]
fn test_basic_fee_burn() {
    let mut state = create_test_state();
    let mut fee_burn_engine = FeeBurnEngine::new();
    let gas_schedule = GasSchedule::default();

    // Setup initial state
    state.set_balance("alice", "udgt", 100_000);
    state.set_balance("bob", "udgt", 50_000);

    // Create transaction with 10,000 fee
    let tx = Transaction::new(
        "test_tx_1".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        0, // legacy fee field
        0,
        Some("sig".to_string()),
    )
    .with_gas(10_000, 1); // 10,000 gas at 1 unit price = 10,000 total fee

    let result = execute_transaction(
        &tx,
        &mut state,
        100,
        0,
        &gas_schedule,
        Some(&mut fee_burn_engine),
    );

    assert!(result.success);
    
    // Check that fee burning occurred
    // Default burn rate is 25%, so 2,500 should be burned from 10,000 fee
    assert_eq!(fee_burn_engine.get_total_burned("udgt"), 2500);
    
    // Check burn event was recorded
    let events = fee_burn_engine.get_recent_events(10);
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].burn_amount, 2500);
    assert_eq!(events[0].tx_hash, "test_tx_1");
}

#[test]
fn test_fee_burn_different_rates() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();

    // Test with 50% burn rate
    let high_burn_config = FeeBurnConfig {
        burn_rate_bps: 5000, // 50%
        min_burn_threshold: 1000,
        burn_token: "udgt".to_string(),
        enabled: true,
    };
    let mut fee_burn_engine = FeeBurnEngine::with_config(high_burn_config);

    // Setup initial state
    state.set_balance("alice", "udgt", 100_000);

    let tx = Transaction::new(
        "test_tx_2".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        0,
        0,
        Some("sig".to_string()),
    )
    .with_gas(20_000, 1); // 20,000 total fee

    let result = execute_transaction(
        &tx,
        &mut state,
        100,
        0,
        &gas_schedule,
        Some(&mut fee_burn_engine),
    );

    assert!(result.success);
    
    // 50% of 20,000 = 10,000 should be burned
    assert_eq!(fee_burn_engine.get_total_burned("udgt"), 10_000);
}

#[test]
fn test_fee_burn_below_threshold() {
    let mut state = create_test_state();
    let mut fee_burn_engine = FeeBurnEngine::new();
    let gas_schedule = GasSchedule::default();

    // Setup initial state
    state.set_balance("alice", "udgt", 100_000);

    // Create transaction with fee below threshold (default threshold is 1000)
    let tx = Transaction::new(
        "test_tx_3".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        0,
        0,
        Some("sig".to_string()),
    )
    .with_gas(500, 1); // 500 total fee (below 1000 threshold)

    let result = execute_transaction(
        &tx,
        &mut state,
        100,
        0,
        &gas_schedule,
        Some(&mut fee_burn_engine),
    );

    assert!(result.success);
    
    // No burning should occur due to threshold
    assert_eq!(fee_burn_engine.get_total_burned("udgt"), 0);
    
    // No events should be recorded
    let events = fee_burn_engine.get_recent_events(10);
    assert_eq!(events.len(), 0);
}

#[test]
fn test_fee_burn_disabled() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();

    // Create disabled fee burn configuration
    let disabled_config = FeeBurnConfig {
        enabled: false,
        ..Default::default()
    };
    let mut fee_burn_engine = FeeBurnEngine::with_config(disabled_config);

    // Setup initial state
    state.set_balance("alice", "udgt", 100_000);

    let tx = Transaction::new(
        "test_tx_4".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        0,
        0,
        Some("sig".to_string()),
    )
    .with_gas(10_000, 1); // 10,000 total fee

    let result = execute_transaction(
        &tx,
        &mut state,
        100,
        0,
        &gas_schedule,
        Some(&mut fee_burn_engine),
    );

    assert!(result.success);
    
    // No burning should occur when disabled
    assert_eq!(fee_burn_engine.get_total_burned("udgt"), 0);
}

#[test]
fn test_fee_burn_drt_token() {
    let mut state = create_test_state();
    let gas_schedule = GasSchedule::default();

    // Configure to burn DRT instead of DGT
    let drt_burn_config = FeeBurnConfig {
        burn_rate_bps: 3000, // 30%
        min_burn_threshold: 1000,
        burn_token: "udrt".to_string(),
        enabled: true,
    };
    let mut fee_burn_engine = FeeBurnEngine::with_config(drt_burn_config);

    // Setup initial state
    state.set_balance("alice", "udgt", 100_000);

    let tx = Transaction::new(
        "test_tx_5".to_string(),
        "alice".to_string(),
        "bob".to_string(),
        1_000,
        0,
        0,
        Some("sig".to_string()),
    )
    .with_gas(15_000, 1); // 15,000 total fee

    let result = execute_transaction(
        &tx,
        &mut state,
        100,
        0,
        &gas_schedule,
        Some(&mut fee_burn_engine),
    );

    assert!(result.success);
    
    // 30% of 15,000 = 4,500 should be burned from DRT
    assert_eq!(fee_burn_engine.get_total_burned("udrt"), 4_500);
    assert_eq!(fee_burn_engine.get_total_burned("udgt"), 0); // No DGT burned
}

#[test]
fn test_fee_burn_multiple_transactions() {
    let mut state = create_test_state();
    let mut fee_burn_engine = FeeBurnEngine::new();
    let gas_schedule = GasSchedule::default();

    // Setup initial state with enough balance for multiple transactions
    state.set_balance("alice", "udgt", 1_000_000);

    // Execute multiple transactions
    for i in 1..=5 {
        let tx = Transaction::new(
            format!("test_tx_{}", i),
            "alice".to_string(),
            "bob".to_string(),
            1_000,
            0,
            i - 1, // Increment nonce
            Some("sig".to_string()),
        )
        .with_gas(10_000, 1); // 10,000 total fee each

        let result = execute_transaction(
            &tx,
            &mut state,
            100,
            i - 1,
            &gas_schedule,
            Some(&mut fee_burn_engine),
        );

        assert!(result.success);
    }

    // Total burned should be 5 * 2,500 = 12,500 (25% of 5 * 10,000)
    assert_eq!(fee_burn_engine.get_total_burned("udgt"), 12_500);
    
    // Should have 5 burn events
    let events = fee_burn_engine.get_recent_events(10);
    assert_eq!(events.len(), 5);
    
    // Check burn stats
    let stats = fee_burn_engine.get_burn_stats();
    assert_eq!(stats.total_events, 5);
    assert_eq!(stats.total_fees_processed, 50_000);
    assert_eq!(stats.total_burned_all, 12_500);
    assert_eq!(stats.effective_burn_rate_bps, 2500); // 25%
}

#[test]
fn test_fee_burn_configuration_update() {
    let mut fee_burn_engine = FeeBurnEngine::new();
    
    // Initial configuration should be default
    assert_eq!(fee_burn_engine.config.burn_rate_bps, 2500); // 25%
    assert_eq!(fee_burn_engine.config.burn_token, "udgt");
    assert!(fee_burn_engine.config.enabled);

    // Update configuration
    let new_config = FeeBurnConfig {
        burn_rate_bps: 1000, // 10%
        min_burn_threshold: 5000,
        burn_token: "udrt".to_string(),
        enabled: true,
    };

    assert!(fee_burn_engine.update_config(new_config).is_ok());
    
    // Verify configuration was updated
    assert_eq!(fee_burn_engine.config.burn_rate_bps, 1000);
    assert_eq!(fee_burn_engine.config.burn_token, "udrt");
    assert_eq!(fee_burn_engine.config.min_burn_threshold, 5000);
}

#[test]
fn test_fee_burn_invalid_configuration() {
    let mut fee_burn_engine = FeeBurnEngine::new();
    
    // Test invalid burn rate (>100%)
    let invalid_config = FeeBurnConfig {
        burn_rate_bps: 15000, // 150% - invalid
        ..Default::default()
    };

    assert!(fee_burn_engine.update_config(invalid_config).is_err());

    // Test invalid token
    let invalid_token_config = FeeBurnConfig {
        burn_token: "invalid_token".to_string(),
        ..Default::default()
    };

    assert!(fee_burn_engine.update_config(invalid_token_config).is_err());
}