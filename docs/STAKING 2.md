# Staking System Implementation

This document describes the staking, validator registry, delegation, reward accrual, and validator lifecycle operations system implemented for the Dytallix blockchain.

## Overview

The staking system implements a Proof-of-Stake (PoS) mechanism with the following key components:

1. **Validator Registry** - On-chain state for validator management
2. **Delegation System** - DGT staking toward validators
3. **Reward Accrual Engine** - Per-block reward distribution
4. **Validator Lifecycle Operations** - Join/leave, uptime tracking, slashing
5. **Evidence Handling** - Double-sign detection and slashing
6. **Events System** - Validator lifecycle events and notifications

## Architecture

### Core Components

#### 1. Validator Registry (`blockchain-core/src/staking.rs`)

**Validator Structure:**
```rust
pub struct Validator {
    pub address: Address,
    pub consensus_pubkey: Vec<u8>,
    pub total_stake: u128,
    pub status: ValidatorStatus,  // Pending, Active, Inactive, Leaving, Slashed, Jailed
    pub reward_index: u128,       // Fixed-point for proportional rewards
    pub accumulated_unpaid: u128,
    pub commission_rate: u16,     // Basis points (e.g., 500 = 5%)
    pub self_stake: u128,
    // New lifecycle fields
    pub missed_blocks: u64,       // Consecutive missed blocks
    pub last_seen_height: BlockNumber, // Last active block
    pub slash_count: u32,         // Number of times slashed
    pub total_slashed: u128,      // Total amount slashed
}
```

**Key Functions:**
- `register_validator()` - Register new validator with Pending status
- `validator_leave()` - Initiate graceful validator exit
- `get_active_validators()` - List validators participating in consensus
- `slash_validator()` - Apply slashing penalties for misbehavior
- `record_missed_block()` - Track validator downtime
- `record_validator_present()` - Reset missed block counters
- `handle_evidence()` - Process evidence of validator misbehavior
- `unjail_validator()` - Administrative function to unjail validators

#### 2. Delegation System

**Delegation Structure:**
```rust
pub struct Delegation {
    pub delegator_address: Address,
    pub validator_address: Address,
    pub stake_amount: u128,
    pub reward_cursor_index: u128,  // Tracks last reward claim
}
```

**Key Functions:**
- `delegate()` - Lock DGT tokens toward a validator
- `undelegate()` - Placeholder for token unlocking (TODO)
- Prevention of duplicate delegations per delegator-validator pair

#### 3. Enhanced Reward Accrual Engine

**NEW: Global Reward Index System (v2.0)**

The staking system now implements a global cumulative reward index for more efficient and accurate per-delegator reward tracking:

**Core Concept:**
```rust
pub struct StakingState {
    // ... existing fields
    pub global_reward_index: u128,  // Scaled by REWARD_SCALE (1e12)
}

pub struct DelegatorRewards {
    pub accrued_unclaimed: u128,     // uDRT rewards ready to claim
    pub total_claimed: u128,         // Lifetime uDRT claimed
    pub last_index: u128,            // Last global reward_index snapshot
}
```

**Global Index Update (per block):**
```rust
reward_index += (block_staking_emission * REWARD_SCALE) / total_active_stake
```

**Lazy Settlement (before stake changes or claims):**
```rust
pending = stake * (global_reward_index - last_index) / REWARD_SCALE
accrued_unclaimed += pending
last_index = global_reward_index
```

**Key Advantages:**
- **O(1) Reward Calculation**: Constant time complexity regardless of delegation count
- **Precise Tracking**: Eliminates rounding errors from per-validator calculations
- **Lazy Settlement**: Rewards computed only when needed (claims/stake changes)
- **Multi-Validator Support**: Efficient claiming across all validator positions
- **Backward Compatibility**: Existing delegations migrate seamlessly

**Per-Block Processing:**
```rust
pub fn process_block_rewards(&mut self, block_height: BlockNumber) -> Result<(), StakingError>
```

**Reward Calculation Functions:**
- `settle_delegator()` - Lazy reward settlement before stake mutations
- `calculate_pending_rewards_global()` - Compute current pending rewards
- `claim_rewards()` - Claim from specific validator with uDRT credit
- `claim_all_rewards()` - Claim from all validators in single operation
- `get_delegator_rewards_summary()` - Comprehensive reward overview

**Reward Lifecycle:**
1. **Delegation Created** → `last_index = current_global_index`
2. **Blocks Processed** → `global_index` increments proportionally
3. **Settlement Triggered** → Pending rewards → `accrued_unclaimed`
4. **Claim Executed** → `accrued_unclaimed` → user balance, increment `total_claimed`

#### 3. Legacy Reward Accrual Engine

**Per-Block Processing:**
```rust
pub fn process_block_rewards(&mut self, block_height: BlockNumber) -> Result<(), StakingError>
```

**Reward Calculation:**
- Uses fixed-point arithmetic with `REWARD_SCALE = 1e12`
- Formula: `reward_index += emissions_per_block * SCALE / total_active_stake`
- Individual rewards: `(validator.reward_index - delegation.reward_cursor_index) * stake_amount / SCALE`

#### 4. Emissions Provider Interface

```rust
pub trait EmissionsProvider {
    fn emission_per_block(&self) -> u128;
}
```

Simple implementation provides constant 1 DRT per block.

#### 5. Validator Lifecycle Operations

**Lifecycle Management:**
- `validator_leave()` - Graceful validator exit with immediate stake return (MVP)
- Auto-activation when minimum self-stake requirements are met
- Status transitions: Pending → Active → Leaving/Jailed/Slashed

**Uptime Tracking:**
- `missed_blocks` counter for consecutive missed blocks
- `last_seen_height` tracking for validator activity
- Configurable downtime threshold for automatic jailing
- `record_missed_block()` and `record_validator_present()` functions

**Slashing System:**
```rust
pub enum SlashType {
    DoubleSign,    // 5% slash rate (default)
    Downtime,      // 1% slash rate (default)
}
```

**Evidence Handling:**
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

#### 6. Events System

**Validator Events:**
```rust
pub enum ValidatorEvent {
    ValidatorJoined { validator_address, self_stake, commission_rate, block_height },
    ValidatorLeft { validator_address, final_stake, block_height },
    ValidatorSlashed { validator_address, slash_type, slash_amount, block_height },
    ValidatorStatusChanged { validator_address, old_status, new_status, block_height },
    ValidatorJailed { validator_address, reason, block_height },
}
```

## Integration Points

### Runtime Integration (`blockchain-core/src/runtime/mod.rs`)

Extended `RuntimeState` with:
```rust
pub struct RuntimeState {
    // ... existing fields
    pub drt_balances: HashMap<String, u128>,  // DRT token balances
    pub staking: StakingState,                // Staking state
}
```

**Enhanced Runtime Methods (v2.0):**
- `register_validator()` - Validator registration
- `validator_leave()` - Initiate validator exit
- `delegate()` - DGT delegation with balance locking
- `claim_rewards()` - DRT reward claiming (specific validator)
- `claim_all_rewards()` - DRT reward claiming (all validators)
- `get_delegator_rewards_summary()` - Comprehensive reward overview
- `get_delegator_validator_rewards()` - Per-validator reward details
- `process_block_rewards()` - Called during block processing
- `get_active_validators()` - Query active validator set
- `record_missed_block()` - Track validator downtime
- `record_validator_present()` - Reset uptime counters
- `handle_evidence()` - Process misbehavior evidence
- `slash_validator()` - Apply slashing penalties
- `unjail_validator()` - Administrative unjailing

### CLI Integration (`cli/src/cmd/stake.rs`)

**Enhanced Commands (v2.0):**
```bash
# Validator operations
dcli stake register-validator --address <addr> --pubkey <key> --commission <rate> --self-stake <amount>
dcli stake delegate --from <delegator> --validator <validator> --amount <amount>
dcli stake leave --validator <validator>
dcli stake show --address <address>
dcli stake validators [--status <active|pending|jailed|slashed>]

# NEW: Enhanced reward operations
dcli stake rewards --delegator <addr> [--json]         # Comprehensive reward summary
dcli stake claim --delegator <addr> --validator <val>  # Claim from specific validator
dcli stake claim --delegator <addr> --all              # Claim from all validators

# Legacy commands (maintained for compatibility)
dcli stake claim-rewards --delegator <addr> --validator <addr>
dcli stake show-rewards --address <addr>

# Administrative operations
dcli stake stats
dcli stake unjail --validator <validator>
dcli stake slash --validator <validator> --type <double-sign|downtime>
```

### API Integration (`blockchain-core/src/api/mod.rs`)

**Enhanced RPC Methods (v2.0):**
- `staking_register_validator`
- `staking_validator_leave`
- `staking_delegate`
- `staking_claim_rewards` (specific validator)
- `staking_claim_all_rewards` (NEW: all validators)
- `staking_get_validator`
- `staking_get_validators`
- `staking_get_validator_stats`

**NEW: REST Endpoints:**
```http
GET /staking/rewards/{delegator}    # Comprehensive reward summary
POST /staking/claim                 # Claim rewards (validator optional)
```

**Example API Responses:**

*GET /staking/rewards/dyt1delegator...*
```json
{
  "delegator": "dyt1delegator...",
  "height": 12345,
  "global_reward_index": "456789012345",
  "summary": {
    "total_stake": "600000000000",
    "pending_rewards": "150000",
    "accrued_unclaimed": "150000",
    "total_claimed": "5000000"
  },
  "positions": [
    {
      "validator": "dyt1validator...",
      "stake": "100000000000",
      "pending": "25000",
      "accrued_unclaimed": "25000",
      "total_claimed": "1000000",
      "last_index": "456789000000"
    }
  ]
}
```

*POST /staking/claim {"delegator": "dyt1..."}*
```json
{
  "delegator": "dyt1delegator...",
  "claimed": "150000",
  "new_balance": "51500000",
  "height": 12345
}
```
- `staking_claim_rewards`
- `staking_get_stats`
- `staking_record_missed_block`
- `staking_record_validator_present`
- `staking_handle_evidence`
- `staking_slash_validator`
- `staking_unjail_validator`
- `staking_get_events`
- `staking_clear_events`

## Configuration

### Staking Parameters
```rust
pub struct StakingParams {
    pub max_validators: u32,         // Default: 100
    pub min_self_stake: u128,        // Default: 1M DGT (1e12 uDGT)
    pub slash_double_sign: u16,      // Default: 500 (5%)
    pub slash_downtime: u16,         // Default: 100 (1%)
    pub emission_per_block: u128,    // Default: 1e6 uDRT (1 DRT)
    // New lifecycle parameters
    pub downtime_threshold: u64,     // Default: 100 (consecutive missed blocks)
    pub signed_blocks_window: u64,   // Default: 10000 (sliding window size)
    pub min_signed_per_window: u64,  // Default: 5000 (50% minimum)
}
```

### Genesis Integration
Staking parameters are included in the genesis configuration via existing `StakingConfig`.

## Token Economics

### DGT (Governance Token)
- **Purpose**: Staking, governance, transaction fees
- **Behavior**: Locked when delegated, unlocked when undelegated
- **Denominations**: Base unit is uDGT (micro-DGT)

### DRT (Reward Token)
- **Purpose**: Staking rewards, emissions
- **Behavior**: Minted as rewards, distributed to delegators
- **Denominations**: Base unit is uDRT (micro-DRT)

## Security Features

### Validator Requirements
- Minimum self-stake requirement prevents frivolous registrations
- Maximum validator limit maintains network decentralization
- Commission rate transparency
- Uptime tracking prevents inactive validators
- Configurable slashing penalties deter misbehavior

### Delegation Protection
- Prevents duplicate delegations to same validator
- Balance checks before delegation
- Atomic delegation operations

### Reward Security
- Fixed-point arithmetic prevents precision loss
- Overflow protection in calculations
- Reward cursor prevents double-claiming

### Slashing & Evidence Security
- Multiple evidence types with validation
- Configurable slash rates in basis points
- Automatic jailing for downtime violations
- Administrative unjail function for recovery
- Event logging for all validator lifecycle changes

## Testing

Comprehensive test suite covers:
- Validator registration and activation
- Validator lifecycle operations (leave, jail, unjail)
- Delegation mechanics and constraints
- Reward calculation accuracy
- Uptime tracking and missed block detection
- Slashing system with configurable penalties
- Evidence handling and validation
- Events system for lifecycle notifications
- Query functions and validator statistics
- Edge cases and error conditions

**Run tests:**
```bash
cd blockchain-core
cargo test staking

# Run integration tests
cd ../tests
cargo test integration_staking
```

## Future Enhancements

### Phase 2 Features (Not in MVP)
- **Undelegation**: Token unbonding with time delay
- **Commission**: Validator fee collection
- **Governance Integration**: Stake-weighted voting
- **Advanced Rewards**: Variable emission schedules
- **Sliding Window Uptime**: Replace consecutive missed blocks with sliding window
- **Full Evidence Verification**: Cryptographic signature validation
- **Delegator Slashing**: Proportional slashing of delegated stakes
- **Token Burning/Redistribution**: Economic penalties for slashed tokens

### Optimization Opportunities
- Batch reward processing
- Validator power caching
- Efficient delegation queries

## Migration from Legacy System

The implementation builds upon existing types:
- Extends `ValidatorInfo` from `types.rs`
- Integrates with existing `StakeTransaction`
- Uses existing `StakingConfig` from genesis
- Compatible with existing CLI structure

## API Documentation

### Staking RPC Methods

#### Register Validator
```json
{
  "jsonrpc": "2.0",
  "method": "staking_register_validator",
  "params": ["validator_address", "consensus_pubkey_hex", commission_rate],
  "id": 1
}
```

#### Delegate Tokens
```json
{
  "jsonrpc": "2.0",
  "method": "staking_delegate",
  "params": ["delegator_address", "validator_address", amount],
  "id": 1
}
```

#### Claim Rewards
```json
{
  "jsonrpc": "2.0",
  "method": "staking_claim_rewards",
  "params": ["delegator_address", "validator_address"],
  "id": 1
}
```

#### Get Validator Info
```json
{
  "jsonrpc": "2.0",
  "method": "staking_get_validator",
  "params": ["validator_address"],
  "id": 1
}
```

#### Get All Validators
```json
{
  "jsonrpc": "2.0",
  "method": "staking_get_validators",
  "params": [],
  "id": 1
}
```

#### Get Staking Statistics
```json
{
  "jsonrpc": "2.0",
  "method": "staking_get_stats",
  "params": [],
  "id": 1
}
```

### REST API Endpoints

- `GET /staking/stats` - Get staking statistics
- `GET /staking/validators` - List active validators

### Validator Registration
```bash
curl -X POST http://localhost:8545/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_register_validator",
    "params": ["validator_address", "consensus_pubkey", 500],
    "id": 1
  }'
```

### Delegation
```bash
curl -X POST http://localhost:8545/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_delegate",
    "params": ["delegator_address", "validator_address", "1000000000000"],
    "id": 1
  }'
```

### Query Validators
```bash
curl -X POST http://localhost:8545/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_get_validators",
    "params": [],
    "id": 1
  }'
```

### Validator Leave
```bash
curl -X POST http://localhost:8545/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_validator_leave",
    "params": ["validator_address"],
    "id": 1
  }'
```

### Query Validator Stats
```bash
curl -X POST http://localhost:8545/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_get_validator_stats",
    "params": ["validator_address"],
    "id": 1
  }'
```

### Handle Evidence
```bash
curl -X POST http://localhost:8545/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_handle_evidence",
    "params": [{
      "DoubleSign": {
        "validator_address": "validator1",
        "height": 100,
        "signature_1": [1,2,3],
        "signature_2": [4,5,6],
        "block_hash_1": [7,8,9],
        "block_hash_2": [10,11,12]
      }
    }],
    "id": 1
  }'
```

## Implementation Status

- [x] Core staking module with validator registry
- [x] Delegation system with DGT locking
- [x] Reward accrual engine with fixed-point math
- [x] **Validator lifecycle operations (validator_leave, graceful exit)**
- [x] **Uptime tracking with missed block counters**
- [x] **Slashing system with configurable penalties**
- [x] **Evidence handling scaffold for double-sign detection**
- [x] **Events system for validator lifecycle notifications**
- [x] **Query functions for validator statistics and status**
- [x] Runtime integration with state management
- [x] CLI commands for staking operations
- [x] API endpoints for RPC integration
- [x] **NEW: Complete RPC method integration with all staking functions**
- [x] **NEW: Block processing integration with automatic reward distribution**
- [x] **NEW: Validator set commitment in block headers for consensus**
- [x] Comprehensive test suite (15+ new test cases)
- [x] Updated documentation with new features
- [ ] Full RPC server integration (requires server implementation)
- [ ] WebSocket event streaming for real-time notifications
- [ ] Sliding window uptime tracking (using consecutive blocks for MVP)
- [ ] Full cryptographic evidence verification (basic validation in place)
- [ ] Undelegation mechanism (deferred)
- [ ] Commission distribution (deferred)
- [ ] Delegator slashing and token burning/redistribution (deferred)

## Notes

This implementation provides a comprehensive foundation for the Dytallix staking system with full validator lifecycle operations, uptime tracking, evidence handling, and slashing capabilities. The implementation includes:

**MVP Features Completed:**
- Complete validator lifecycle (join/leave operations)
- Uptime tracking with configurable downtime thresholds
- Slashing system with configurable penalty rates
- Evidence handling scaffold for double-sign detection
- Events system for real-time validator lifecycle notifications
- Query interfaces for validator statistics and status
- Comprehensive test coverage for all new functionality

**Design Decisions:**
- Immediate validator removal on leave (no unbonding delay for MVP)
- Consecutive missed block tracking (sliding window planned for future)
- Basic evidence validation (full cryptographic verification placeholder)
- Configurable slashing rates using basis points for precision
- Event-driven architecture for integration with external systems

The modular design allows for easy extension and future feature additions while maintaining compatibility with the existing codebase.