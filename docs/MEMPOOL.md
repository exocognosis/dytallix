# Dytallix Mempool System

This document describes the production-grade mempool subsystem implementation for Dytallix, including admission rules, ordering policies, eviction strategies, and gossip protocols.

## Overview

The Dytallix mempool is a priority-ordered transaction pool that enforces strict admission rules, maintains deterministic ordering, and implements intelligent gossip protocols to minimize network overhead while ensuring fast propagation of valid transactions.

## Architecture

### Core Components

1. **Mempool** (`node/src/mempool.rs`) - Main transaction pool with admission and ordering logic
2. **TransactionGossip** (`node/src/p2p/gossip.rs`) - P2P gossip protocol with duplicate suppression
3. **Metrics** (`node/src/metrics.rs`) - Prometheus metrics for monitoring and alerting

### Data Structures

- **BTreeSet**: Maintains deterministic priority ordering of transactions
- **HashMap**: O(1) transaction lookup by hash
- **HashSet**: O(1) duplicate detection
- **Seen Cache**: TTL-based duplicate detection for gossip protocol

## Admission Rules

The mempool enforces the following admission rules for all incoming transactions (local or peer):

### 1. Signature Verification
```rust
fn verify_envelope(tx: &Transaction) -> bool
```
- Verifies transaction signature using PQC cryptography
- Rejects transactions with invalid or missing signatures

### 2. Nonce Equality Check
```rust
if tx.nonce != account_nonce(sender) {
    return Err(RejectionReason::NonceGap { expected, got });
}
```
- Enforces strict nonce ordering: `tx.nonce == account_nonce(sender)`
- Prevents transaction replay and ensures correct ordering

### 3. Balance Validation
```rust
let total_needed = tx.amount + tx.fee + (tx.gas_limit * tx.gas_price) as u128;
if balance < total_needed {
    return Err(RejectionReason::InsufficientFunds);
}
```
- Checks sender has sufficient balance for:
  - Transfer amount (for send messages)
  - Transaction fee
  - Maximum gas cost (gas_limit × gas_price)

### 4. Size Limits
```rust
if tx_size > MAX_TX_BYTES {
    return Err(RejectionReason::OversizedTx { max, got });
}
```
- Rejects transactions exceeding `MAX_TX_BYTES` (default: 1MB)
- Prevents DoS attacks with large transactions

### 5. Minimum Gas Price
```rust
if tx.gas_price < MIN_GAS_PRICE {
    return Err(RejectionReason::UnderpricedGas { min, got });
}
```
- Enforces configurable minimum gas price
- Prevents spam with zero or very low gas prices

### 6. Duplicate Detection
```rust
if self.tx_hashes.contains(&tx.hash) {
    return Err(RejectionReason::Duplicate);
}
```
- Rejects transactions already in the pool
- Uses O(1) hash-based lookup

## Ordering & Priority

### Priority Rules

Transactions are ordered by:
1. **Primary**: Gas price (descending) - higher paying transactions first
2. **Secondary**: Nonce (ascending) - lower nonces first within same gas price
3. **Tertiary**: Transaction hash (ascending) - deterministic tiebreaker

### Implementation

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
struct TxPriorityKey {
    gas_price_neg: i64, // negative for descending order
    nonce: u64,
    hash: String,
}
```

The priority key ensures:
- **Deterministic ordering**: Same input always produces same order
- **Stable sorting**: Transactions maintain relative order across operations
- **Fast lookup**: BTreeSet provides O(log n) insertion and removal

## Eviction Policy

### Capacity Limits

The mempool enforces two capacity limits:
- **Transaction count**: `max_txs` (default: 10,000)
- **Total bytes**: `max_bytes` (default: 100MB)

### Eviction Strategy

When capacity is exceeded, the mempool evicts the **lowest priority** transaction:

```rust
fn evict_lowest_priority(&mut self) -> Result<(), RejectionReason> {
    if let Some(lowest_key) = self.ordered_txs.iter().last().cloned() {
        // Remove lowest priority transaction
        self.ordered_txs.remove(&lowest_key);
        // Update lookup tables and metrics
    }
}
```

### Eviction Guarantees

- **Deterministic**: Same state always evicts the same transaction
- **Optimal**: Always removes the globally lowest priority transaction
- **Efficient**: O(log n) eviction time
- **Logged**: All evictions are logged with reason for metrics

## Gossip Protocol

### Duplicate Suppression

The gossip system prevents redundant network traffic through:

1. **Seen Cache**: TTL-based cache of recently seen transaction hashes
2. **Broadcast Tracking**: Prevents rebroadcast of already-sent transactions
3. **Peer-based Deduplication**: Tracks which peers have seen which transactions

### Throttling

```rust
pub struct PeerQueue {
    pending_txs: VecDeque<String>,
    last_sent: u64,
}
```

- **Per-peer queues**: Separate outbound queue for each peer
- **Rate limiting**: Configurable interval between sends to each peer
- **Capacity limits**: Maximum pending transactions per peer

### Configuration

```rust
pub struct GossipConfig {
    pub seen_ttl_ms: u64,              // How long to remember seen transactions
    pub max_outbound_per_peer: usize,  // Max pending gossip per peer
    pub throttle_interval_ms: u64,     // Minimum interval between sends
}
```

## Configuration

### Environment Variables

All configuration can be overridden via environment variables:

```bash
# Mempool limits
export DYT_MAX_TX_BYTES=1048576        # 1MB max transaction size
export DYT_MIN_GAS_PRICE=1000          # Minimum gas price (wei)
export DYT_MEMPOOL_MAX_TXS=10000       # Maximum transactions in pool
export DYT_MEMPOOL_MAX_BYTES=104857600 # 100MB max pool size

# Gossip configuration
export DYT_MEMPOOL_SEEN_TTL_MS=300000  # 5 minutes seen cache TTL
export DYT_GOSSIP_MAX_OUTBOUND=1000    # Max pending gossip per peer
```

### Default Values

```rust
pub const DEFAULT_MAX_TX_BYTES: usize = 1024 * 1024;        // 1MB
pub const DEFAULT_MIN_GAS_PRICE: u64 = 1000;               // 1000 wei
pub const DEFAULT_MEMPOOL_MAX_TXS: usize = 10000;          // 10k transactions
pub const DEFAULT_MEMPOOL_MAX_BYTES: usize = 100 * 1024 * 1024; // 100MB
pub const DEFAULT_MEMPOOL_SEEN_TTL_MS: u64 = 300_000;      // 5 minutes
pub const DEFAULT_GOSSIP_MAX_OUTBOUND: usize = 1000;       // 1k pending
```

## Metrics & Monitoring

### Prometheus Metrics

The mempool exposes comprehensive Prometheus metrics:

#### Counters
- `dytallix_mempool_admitted_total` - Total admitted transactions
- `dytallix_mempool_rejected_total{reason}` - Total rejections by reason
- `dytallix_mempool_evicted_total{reason}` - Total evictions by reason
- `dytallix_mempool_gossip_duplicates_total` - Total gossip duplicates suppressed

#### Gauges
- `dytallix_mempool_size` - Current transaction count
- `dytallix_mempool_bytes` - Current total bytes
- `dytallix_mempool_current_min_gas_price` - Current minimum gas price in pool

### Rejection Reasons

Rejection metrics include the following reason labels:
- `invalid_signature` - Transaction signature verification failed
- `nonce_gap` - Transaction nonce doesn't match expected account nonce
- `insufficient_funds` - Sender lacks sufficient balance
- `underpriced_gas` - Gas price below minimum threshold
- `oversized_tx` - Transaction size exceeds maximum allowed
- `duplicate` - Transaction hash already exists in pool
- `internal_error` - Internal system error

### Monitoring Alerts

Recommended alert thresholds:

```yaml
# High rejection rate
- alert: MempoolHighRejectionRate
  expr: rate(dytallix_mempool_rejected_total[5m]) > 100
  
# Pool near capacity
- alert: MempoolNearCapacity
  expr: dytallix_mempool_size / 10000 > 0.9
  
# High eviction rate
- alert: MempoolHighEvictionRate
  expr: rate(dytallix_mempool_evicted_total[5m]) > 10
  
# Gas price spike
- alert: MempoolGasPriceSpike
  expr: dytallix_mempool_current_min_gas_price > 10000
```

## DoS Protection

### Rate Limiting
- **Per-peer queues**: Limit outbound gossip rate per peer
- **Size limits**: Prevent large transaction attacks
- **Gas price floors**: Prevent spam with low fees

### Resource Bounds
- **Memory limits**: Total pool size bounded by transaction count and bytes
- **CPU limits**: O(log n) operations for all core mempool functions
- **Network limits**: Gossip throttling and duplicate suppression

### Economic Deterrents
- **Minimum gas price**: Configurable floor prevents free spam
- **Fee requirements**: All transactions must pay network fees
- **Nonce enforcement**: Prevents replay attacks and ensures ordering

## API Reference

### Core Methods

```rust
impl Mempool {
    // Add transaction with full validation
    pub fn add_transaction(&mut self, state: &State, tx: Transaction) 
        -> Result<(), RejectionReason>;
    
    // Get highest priority transactions for block creation
    pub fn take_snapshot(&self, n: usize) -> Vec<Transaction>;
    
    // Remove transactions after block inclusion
    pub fn drop_hashes(&mut self, hashes: &[String]);
    
    // Pool statistics
    pub fn len(&self) -> usize;
    pub fn total_bytes(&self) -> usize;
    pub fn current_min_gas_price(&self) -> u64;
    pub fn is_full(&self) -> bool;
}
```

### Gossip Methods

```rust
impl TransactionGossip {
    // Check if transaction should be gossiped
    pub fn should_gossip(&self, tx_hash: &str, from_peer: Option<&str>) -> bool;
    
    // Queue transaction for gossip to peers
    pub fn queue_for_gossip(&self, tx_hash: &str, peers: &[String]);
    
    // Get pending transactions for specific peer
    pub fn get_pending_for_peer(&self, peer_id: &str, batch_size: usize) -> Vec<String>;
    
    // Periodic cleanup of expired entries
    pub fn cleanup(&self);
}
```

## Testing

### Test Coverage

The implementation includes comprehensive test suites:

1. **Unit Tests** (`tests/mempool_unit.rs`)
   - Admission rule validation
   - Ordering and priority verification
   - Eviction policy correctness

2. **Integration Tests** (`tests/mempool_integration.rs`)
   - End-to-end transaction flow
   - Gossip protocol integration
   - Pool limit enforcement

3. **Performance Tests** (`tests/mempool_perf_determinism.rs`)
   - Deterministic ordering verification
   - Performance threshold validation
   - Concurrent access simulation

4. **Metrics Tests** (`tests/mempool_metrics.rs`)
   - Prometheus metrics correctness
   - Alert threshold validation

### Running Tests

```bash
# Run all mempool tests
cargo test mempool

# Run specific test suites
cargo test mempool_unit
cargo test mempool_integration
cargo test mempool_perf_determinism
cargo test mempool_metrics

# Run with metrics feature
cargo test --features metrics mempool_metrics
```

## Performance Characteristics

### Time Complexity
- **Addition**: O(log n) - BTreeSet insertion
- **Removal**: O(log n) - BTreeSet removal + HashMap cleanup
- **Snapshot**: O(k) where k is snapshot size
- **Duplicate check**: O(1) - HashMap lookup
- **Eviction**: O(log n) - Remove from BTreeSet

### Space Complexity
- **Memory per transaction**: ~200-500 bytes (depends on transaction size)
- **Overhead per transaction**: ~100 bytes (priority key + indices)
- **Total pool memory**: Bounded by `max_bytes` configuration

### Benchmarks
- **1000 transaction additions**: < 1 second
- **500 transaction snapshot**: < 10 milliseconds  
- **Deterministic ordering**: Verified across multiple instances
- **Concurrent operations**: Maintains consistency under load

## Security Considerations

### Cryptographic Security
- **PQC signatures**: Post-quantum cryptographic signature verification
- **Hash integrity**: Transaction hashes prevent tampering
- **Nonce protection**: Prevents replay attacks

### Economic Security
- **Gas pricing**: Market-based fee mechanism
- **Balance verification**: Prevents double-spending attempts
- **Resource limits**: Bounded memory and CPU usage

### Network Security
- **Gossip limits**: Prevents network flooding
- **Peer isolation**: Per-peer rate limiting
- **Duplicate suppression**: Efficient bandwidth usage

## Troubleshooting

### Common Issues

1. **High rejection rates**
   - Check nonce synchronization between clients and node
   - Verify minimum gas price configuration
   - Monitor account balances

2. **Pool reaching capacity**
   - Increase `max_txs` or `max_bytes` limits
   - Check for transaction processing bottlenecks
   - Monitor eviction metrics

3. **Poor gossip performance**
   - Adjust `throttle_interval_ms` for network conditions
   - Increase `max_outbound_per_peer` for high-throughput scenarios
   - Monitor duplicate suppression effectiveness

### Debug Logging

Enable debug logging to troubleshoot issues:

```bash
RUST_LOG=dytallix_lean_launch_node::mempool=debug ./node
```

Logs include:
- Transaction admission/rejection details
- Eviction events with reasons
- Gossip protocol decisions
- Performance metrics

## Future Enhancements

### Planned Features
- **Account-based ordering**: Per-account transaction queues
- **Dynamic gas pricing**: Automatic minimum gas price adjustment
- **Sharded pools**: Horizontal scaling for high transaction volumes
- **Advanced eviction**: Time-based and priority-based hybrid eviction

### Research Areas
- **Layer 2 integration**: Support for rollup and state channel transactions
- **Cross-shard coordination**: Multi-shard transaction dependencies
- **AI-powered spam detection**: Machine learning for advanced DoS protection