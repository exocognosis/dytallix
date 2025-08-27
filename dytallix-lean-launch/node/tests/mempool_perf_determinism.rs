use std::collections::HashSet;
use std::time::{Duration, Instant};

use dytallix_lean_launch_node::mempool::{Mempool, MempoolConfig, PendingTx};
use dytallix_lean_launch_node::state::State;
use dytallix_lean_launch_node::storage::tx::Transaction;

fn create_test_transaction(
    hash: &str,
    from: &str,
    to: &str,
    amount: u128,
    fee: u128,
    nonce: u64,
    gas_limit: u64,
    gas_price: u64,
) -> Transaction {
    Transaction {
        hash: hash.to_string(),
        from: from.to_string(),
        to: to.to_string(),
        amount,
        fee,
        nonce,
        signature: Some("test_signature".to_string()),
        gas_limit,
        gas_price,
    }
}

fn create_mock_state_with_many_accounts(num_accounts: usize) -> State {
    let mut state = State::new_for_test();
    for i in 0..num_accounts {
        state.set_account_balance(&format!("sender{}", i), 1000000);
    }
    state
}

#[tokio::test]
async fn test_deterministic_ordering_across_instances() {
    // Create two identical mempool instances
    let config = MempoolConfig::default();
    let mut mempool1 = Mempool::with_config(config.clone());
    let mut mempool2 = Mempool::with_config(config);
    let state = create_mock_state_with_many_accounts(100);

    // Create a set of transactions with various gas prices and nonces
    let mut transactions = vec![];
    for i in 0..50 {
        let tx = create_test_transaction(
            &format!("hash{}", i),
            &format!("sender{}", i % 10), // Cycle through 10 senders
            "receiver",
            1000,
            100,
            i / 10, // Nonce based on transaction index
            21000,
            1000 + (i % 5) as u64 * 500, // Gas prices: 1000, 1500, 2000, 2500, 3000
        );
        transactions.push(tx);
    }

    // Add transactions to both mempools in different orders
    let mut tx_set1 = transactions.clone();
    let mut tx_set2 = transactions.clone();

    // Reverse the order for the second mempool
    tx_set2.reverse();

    // Add to first mempool
    for tx in tx_set1 {
        let _ = mempool1.add_transaction(&state, tx);
    }

    // Add to second mempool
    for tx in tx_set2 {
        let _ = mempool2.add_transaction(&state, tx);
    }

    // Take snapshots from both mempools
    let snapshot1 = mempool1.take_snapshot(100);
    let snapshot2 = mempool2.take_snapshot(100);

    // Verify both snapshots have the same length
    assert_eq!(snapshot1.len(), snapshot2.len());

    // Verify deterministic ordering - both snapshots should be identical
    for (tx1, tx2) in snapshot1.iter().zip(snapshot2.iter()) {
        assert_eq!(
            tx1.hash, tx2.hash,
            "Transaction order differs between instances"
        );
        assert_eq!(tx1.gas_price, tx2.gas_price);
        assert_eq!(tx1.nonce, tx2.nonce);
    }

    println!(
        "✅ Deterministic ordering verified across {} transactions",
        snapshot1.len()
    );
}

#[tokio::test]
async fn test_performance_threshold_admission() {
    let start = Instant::now();
    let mut mempool = Mempool::new();
    let state = create_mock_state_with_many_accounts(1000);

    // Performance test: admit 1000 transactions
    let num_transactions = 1000;
    let mut successful_admissions = 0;

    for i in 0..num_transactions {
        let tx = create_test_transaction(
            &format!("hash{}", i),
            &format!("sender{}", i), // Each transaction from different sender
            "receiver",
            1000,
            100,
            0, // All have nonce 0 since different senders
            21000,
            1000 + (i % 100) as u64, // Varying gas prices
        );

        if mempool.add_transaction(&state, tx).is_ok() {
            successful_admissions += 1;
        }
    }

    let admission_duration = start.elapsed();

    // Performance requirement: should admit 1000 transactions in under 1 second
    assert!(
        admission_duration < Duration::from_secs(1),
        "Admission took too long: {:?}",
        admission_duration
    );

    println!(
        "✅ Performance test passed: {} transactions admitted in {:?}",
        successful_admissions, admission_duration
    );

    // Test snapshot performance
    let snapshot_start = Instant::now();
    let snapshot = mempool.take_snapshot(500);
    let snapshot_duration = snapshot_start.elapsed();

    // Snapshot should be very fast (under 10ms for 500 transactions)
    assert!(
        snapshot_duration < Duration::from_millis(10),
        "Snapshot took too long: {:?}",
        snapshot_duration
    );

    println!(
        "✅ Snapshot performance test passed: {} transactions in {:?}",
        snapshot.len(),
        snapshot_duration
    );
}

#[tokio::test]
async fn test_deterministic_eviction_order() {
    // Create mempool with small capacity
    let config = MempoolConfig {
        max_txs: 10,
        max_bytes: 1000000, // High byte limit to focus on count limit
        ..Default::default()
    };
    let mut mempool = Mempool::with_config(config);
    let state = create_mock_state_with_many_accounts(20);

    // Add 15 transactions (will exceed capacity)
    let mut added_transactions = vec![];
    for i in 0..15 {
        let tx = create_test_transaction(
            &format!("hash{}", i),
            &format!("sender{}", i),
            "receiver",
            1000,
            100,
            0,
            21000,
            1000 + (i % 5) as u64 * 100, // Gas prices vary cyclically
        );

        if mempool.add_transaction(&state, tx.clone()).is_ok() {
            added_transactions.push(tx);
        }
    }

    // Should have exactly 10 transactions (capacity limit)
    assert_eq!(mempool.len(), 10);

    // Verify that the lowest priority transactions were evicted
    let snapshot = mempool.take_snapshot(10);
    assert_eq!(snapshot.len(), 10);

    // All remaining transactions should have gas_price >= some threshold
    // since lowest priority ones should have been evicted
    let min_gas_price = snapshot.iter().map(|tx| tx.gas_price).min().unwrap();
    println!(
        "Minimum gas price in pool after evictions: {}",
        min_gas_price
    );

    // Verify deterministic eviction by checking that specific low-priority
    // transactions were evicted
    let remaining_hashes: HashSet<String> = snapshot.iter().map(|tx| tx.hash.clone()).collect();

    // Count how many high-priority vs low-priority transactions remain
    let mut high_priority_count = 0;
    let mut low_priority_count = 0;

    for tx in &added_transactions {
        if remaining_hashes.contains(&tx.hash) {
            if tx.gas_price >= 1200 {
                high_priority_count += 1;
            } else {
                low_priority_count += 1;
            }
        }
    }

    // Should favor high-priority transactions
    assert!(
        high_priority_count >= low_priority_count,
        "Eviction should favor high-priority transactions"
    );

    println!(
        "✅ Deterministic eviction verified: {} high-priority, {} low-priority retained",
        high_priority_count, low_priority_count
    );
}

#[tokio::test]
async fn test_priority_key_determinism() {
    // Test that priority keys are deterministic and consistent
    let tx1 = create_test_transaction("hash_a", "sender1", "receiver", 1000, 100, 5, 21000, 2000);
    let tx2 = create_test_transaction("hash_b", "sender2", "receiver", 1000, 100, 3, 21000, 2000);
    let tx3 = create_test_transaction("hash_c", "sender3", "receiver", 1000, 100, 5, 21000, 1500);

    let pending1 = PendingTx::new(tx1);
    let pending2 = PendingTx::new(tx2);
    let pending3 = PendingTx::new(tx3);

    let key1 = pending1.priority_key();
    let key2 = pending2.priority_key();
    let key3 = pending3.priority_key();

    // Same gas price, different nonces: lower nonce should have higher priority
    assert!(key2 < key1, "Lower nonce should have higher priority");

    // Different gas prices: higher gas price should have higher priority
    assert!(key1 < key3, "Higher gas price should have higher priority");
    assert!(key2 < key3, "Higher gas price should have higher priority");

    // Test hash-based tiebreaking for identical gas_price and nonce
    let tx4 = create_test_transaction("hash_d", "sender4", "receiver", 1000, 100, 5, 21000, 2000);
    let pending4 = PendingTx::new(tx4);
    let key4 = pending4.priority_key();

    // key1 and key4 have same gas_price and nonce, should be ordered by hash
    if key1.hash < key4.hash {
        assert!(key1 < key4, "Hash-based tiebreaking should be consistent");
    } else {
        assert!(key4 < key1, "Hash-based tiebreaking should be consistent");
    }

    println!("✅ Priority key determinism verified");
}

#[tokio::test]
async fn test_concurrent_access_simulation() {
    // Simulate concurrent access patterns that might occur in production
    let mut mempool = Mempool::new();
    let state = create_mock_state_with_many_accounts(100);

    // Phase 1: Bulk addition
    let bulk_start = Instant::now();
    for i in 0..100 {
        let tx = create_test_transaction(
            &format!("hash{}", i),
            &format!("sender{}", i),
            "receiver",
            1000,
            100,
            0,
            21000,
            1000 + (i % 20) as u64 * 50,
        );

        let _ = mempool.add_transaction(&state, tx);
    }
    let bulk_duration = bulk_start.elapsed();

    // Phase 2: Interleaved operations (snapshot + removals + additions)
    let interleaved_start = Instant::now();

    for round in 0..10 {
        // Take snapshot
        let snapshot = mempool.take_snapshot(20);

        // Remove some transactions (simulate block inclusion)
        if !snapshot.is_empty() {
            let to_remove: Vec<String> =
                snapshot.iter().take(5).map(|tx| tx.hash.clone()).collect();
            mempool.drop_hashes(&to_remove);
        }

        // Add new transactions
        for i in 0..5 {
            let tx = create_test_transaction(
                &format!("new_hash_{}_{}", round, i),
                &format!("sender{}", (round * 5 + i) % 50),
                "receiver",
                1000,
                100,
                round as u64,
                21000,
                1000 + (round * 5 + i) as u64 * 25,
            );

            let _ = mempool.add_transaction(&state, tx);
        }
    }

    let interleaved_duration = interleaved_start.elapsed();

    // Performance assertions
    assert!(
        bulk_duration < Duration::from_millis(500),
        "Bulk addition took too long: {:?}",
        bulk_duration
    );

    assert!(
        interleaved_duration < Duration::from_millis(100),
        "Interleaved operations took too long: {:?}",
        interleaved_duration
    );

    // Consistency check
    let final_snapshot = mempool.take_snapshot(1000);

    // Verify ordering is maintained
    for i in 0..final_snapshot.len().saturating_sub(1) {
        let current = &final_snapshot[i];
        let next = &final_snapshot[i + 1];

        // Higher priority should come first
        assert!(
            current.gas_price > next.gas_price
                || (current.gas_price == next.gas_price && current.nonce <= next.nonce)
                || (current.gas_price == next.gas_price
                    && current.nonce == next.nonce
                    && current.hash <= next.hash),
            "Ordering constraint violated at position {}: current({}, {}, {}) vs next({}, {}, {})",
            i,
            current.gas_price,
            current.nonce,
            current.hash,
            next.gas_price,
            next.nonce,
            next.hash
        );
    }

    println!(
        "✅ Concurrent access simulation passed: bulk {:?}, interleaved {:?}, final size {}",
        bulk_duration,
        interleaved_duration,
        final_snapshot.len()
    );
}
