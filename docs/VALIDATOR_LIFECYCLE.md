# Validator Lifecycle Operations

This document describes the validator lifecycle operations, uptime tracking, evidence handling, and slashing system implemented for the Dytallix blockchain.

## Overview

The validator lifecycle system provides comprehensive management of validators throughout their participation in the network, from registration to graceful exit, including monitoring, penalties, and administrative functions.

## Validator States

### Status Transitions
```
Pending → Active → Leaving (Exit)
    ↓        ↓
    ↓     Jailed ↔ Inactive
    ↓        ↓
    ↓     Slashed
    ↓        ↓
    └────────┴→ Removed
```

### Status Definitions

- **Pending**: Newly registered validator waiting for minimum self-stake
- **Active**: Participating in consensus with sufficient stake
- **Inactive**: Temporarily not participating (can be reactivated)
- **Jailed**: Temporarily banned due to downtime violations
- **Leaving**: Graceful exit in progress
- **Slashed**: Penalized for serious misbehavior (double-signing)

## Lifecycle Operations

### 1. Validator Registration (Join)
```rust
pub fn register_validator(
    &mut self,
    address: Address,
    consensus_pubkey: Vec<u8>,
    commission_rate: u16,
) -> Result<(), StakingError>
```

**Process:**
1. Validator registers with consensus public key and commission rate
2. Status set to `Pending`
3. `ValidatorJoined` event emitted
4. Requires self-delegation to activate

### 2. Validator Activation
**Automatic when:**
- Self-stake meets minimum requirement (`min_self_stake`)
- Total active validators below maximum (`max_validators`)

**Status change:** `Pending` → `Active`

### 3. Validator Leave (Exit)
```rust
pub fn validator_leave(&mut self, validator_address: &Address) -> Result<(), StakingError>
```

**Process:**
1. Validator status changed to `Leaving`
2. `ValidatorStatusChanged` event emitted
3. Immediate exit processing (MVP implementation)
4. Validator and delegations removed
5. `ValidatorLeft` event emitted
6. Stake returned immediately (no unbonding period in MVP)

## Uptime Tracking

### Missed Block Tracking
```rust
pub fn record_missed_block(&mut self, validator_address: &Address) -> Result<(), StakingError>
pub fn record_validator_present(&mut self, validator_address: &Address) -> Result<(), StakingError>
```

### Downtime Detection
- **Consecutive missed blocks** tracked per validator
- **Automatic jailing** when threshold exceeded
- **Configurable threshold** (`downtime_threshold` parameter)
- **Reset on participation** when validator is present

### Jailing Process
1. Missed blocks exceed `downtime_threshold`
2. Status changed to `Jailed`
3. Downtime slashing applied automatically
4. `ValidatorJailed` and `ValidatorSlashed` events emitted

### Unjailing
```rust
pub fn unjail_validator(&mut self, validator_address: &Address) -> Result<(), StakingError>
```

**Administrative function to:**
- Change status from `Jailed` to `Inactive`
- Reset missed block counter
- Emit `ValidatorStatusChanged` event

## Slashing System

### Slash Types
```rust
pub enum SlashType {
    DoubleSign,    // Serious offense: 5% default slash rate
    Downtime,      // Availability issue: 1% default slash rate
}
```

### Slashing Process
```rust
pub fn slash_validator(
    &mut self,
    validator_address: &Address,
    slash_type: SlashType,
) -> Result<(), StakingError>
```

**Calculations:**
1. Slash amount = `(total_stake * slash_rate_bps) / 10000`
2. Update validator's `total_slashed` and `slash_count`
3. Reduce validator's `total_stake` by slash amount
4. Update global `total_stake`
5. Emit `ValidatorSlashed` event

**Status Changes:**
- **Double Sign**: Status → `Slashed` (permanent)
- **Downtime**: Status → `Jailed` (can be unjailed)

### Configurable Parameters
```rust
pub struct StakingParams {
    pub slash_double_sign: u16,      // Default: 500 (5%)
    pub slash_downtime: u16,         // Default: 100 (1%)
    pub downtime_threshold: u64,     // Default: 100 consecutive missed blocks
    // ... other parameters
}
```

## Evidence Handling

### Evidence Types
```rust
pub enum Evidence {
    DoubleSign {
        validator_address: Address,
        height: BlockNumber,
        signature_1: Vec<u8>,
        signature_2: Vec<u8>,
        block_hash_1: Vec<u8>,
        block_hash_2: Vec<u8>,
    },
    Downtime {
        validator_address: Address,
        missed_blocks: u64,
        window_start: BlockNumber,
        window_end: BlockNumber,
    },
}
```

### Evidence Processing
```rust
pub fn handle_evidence(&mut self, evidence: Evidence) -> Result<(), StakingError>
```

**Validation Steps:**
1. **Basic validation** (signatures/hashes must differ)
2. **Threshold validation** (missed blocks above limit)
3. **Future**: Cryptographic signature verification
4. **Apply slashing** if evidence valid
5. **Emit events** for audit trail

**MVP Limitations:**
- Basic evidence validation only
- No full cryptographic verification
- No evidence persistence/indexing
- Placeholder for future evidence types

## Events System

### Event Types
```rust
pub enum ValidatorEvent {
    ValidatorJoined {
        validator_address: Address,
        self_stake: u128,
        commission_rate: u16,
        block_height: BlockNumber,
    },
    ValidatorLeft {
        validator_address: Address,
        final_stake: u128,
        block_height: BlockNumber,
    },
    ValidatorSlashed {
        validator_address: Address,
        slash_type: SlashType,
        slash_amount: u128,
        block_height: BlockNumber,
    },
    ValidatorStatusChanged {
        validator_address: Address,
        old_status: ValidatorStatus,
        new_status: ValidatorStatus,
        block_height: BlockNumber,
    },
    ValidatorJailed {
        validator_address: Address,
        reason: String,
        block_height: BlockNumber,
    },
}
```

### Event Management
```rust
pub fn get_events(&self) -> &[ValidatorEvent]
pub fn clear_events(&mut self)
```

**Usage:**
- Real-time monitoring of validator lifecycle
- Audit trail for all validator state changes
- Integration with external systems (WebSocket, RPC)
- Historical event analysis

## Query Interface

### Validator Statistics
```rust
pub struct ValidatorStats {
    pub address: Address,
    pub status: ValidatorStatus,
    pub total_stake: u128,
    pub self_stake: u128,
    pub commission_rate: u16,
    pub missed_blocks: u64,
    pub last_seen_height: BlockNumber,
    pub slash_count: u32,
    pub total_slashed: u128,
}
```

### Query Functions
```rust
// Get individual validator statistics
pub fn get_validator_stats(&self, validator_address: &Address) -> Option<ValidatorStats>

// Get filtered validator set
pub fn get_validator_set(&self, status_filter: Option<ValidatorStatus>) -> Vec<ValidatorStats>
```

**Use Cases:**
- Monitoring dashboards
- Validator selection for delegation
- Performance analysis
- Compliance reporting

## Security Considerations

### Slashing Protection
- Configurable slash rates prevent excessive penalties
- Basis points precision (10000 = 100%)
- Separate rates for different offense types
- Administrative unjail function for recovery

### Evidence Validation
- Basic validation prevents obviously invalid evidence
- Future cryptographic verification planned
- Evidence type extensibility for new attack vectors
- Audit trail through events system

### State Consistency
- Atomic operations for state changes
- Event emission for all state transitions
- Overflow protection in calculations
- Status validation for all operations

## Integration Points

### Consensus Integration
- Uptime tracking hooks for block participation
- Evidence submission from consensus layer
- Validator set updates for active validators

### RPC Interface
- Validator lifecycle operations
- Real-time event streaming (planned)
- Query endpoints for monitoring
- Administrative functions

### External Monitoring
- Event-driven architecture for monitoring systems
- WebSocket support for real-time updates (planned)
- Metrics export for observability
- Alert integration for critical events

## Future Enhancements

### Planned Features
1. **Sliding Window Uptime** - Replace consecutive missed blocks
2. **Full Evidence Verification** - Cryptographic signature validation
3. **Delegator Slashing** - Proportional slashing of delegations
4. **Token Burning** - Economic penalties for slashed tokens
5. **Historical Indexing** - Searchable evidence and slashing records
6. **WebSocket Events** - Real-time event streaming
7. **Advanced Metrics** - Performance analytics and reporting

### Configuration Extensions
- Multiple evidence types and thresholds
- Graduated penalty scales
- Conditional slashing based on network conditions
- Economic parameters for token burning/redistribution

## Testing

The validator lifecycle system includes comprehensive test coverage:

### Test Categories
- **Lifecycle Operations**: Join, leave, status transitions
- **Uptime Tracking**: Missed blocks, jailing, unjailing
- **Slashing System**: Penalty calculation, status changes
- **Evidence Handling**: Validation, processing, errors
- **Events System**: Event emission, management
- **Query Functions**: Statistics, filtering, edge cases

### Example Test Cases
```rust
#[test]
fn test_validator_leave_functionality()
#[test]  
fn test_uptime_tracking_and_jailing()
#[test]
fn test_slashing_functionality()
#[test]
fn test_evidence_handling()
#[test]
fn test_validator_query_functions()
```

**Run Tests:**
```bash
cd blockchain-core
cargo test staking

# Integration tests
cd ../tests
cargo test integration_staking
```

## Conclusion

The validator lifecycle system provides a robust foundation for validator management in the Dytallix network. The implementation balances simplicity for the MVP with extensibility for future enhancements, ensuring network security while maintaining operational flexibility.

Key achievements:
- Complete validator lifecycle management
- Configurable uptime tracking and penalties
- Evidence-based slashing system
- Comprehensive event system for monitoring
- Rich query interface for analytics
- Extensive test coverage for reliability