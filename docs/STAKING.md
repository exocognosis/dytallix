# Staking System Implementation

This document describes the staking, validator registry, delegation, and reward accrual system implemented for the Dytallix blockchain.

## Overview

The staking system implements a Proof-of-Stake (PoS) mechanism with the following key components:

1. **Validator Registry** - On-chain state for validator management
2. **Delegation System** - DGT staking toward validators
3. **Reward Accrual Engine** - Per-block reward distribution
4. **Emissions Integration** - Stub interface for DRT reward distribution

## Architecture

### Core Components

#### 1. Validator Registry (`blockchain-core/src/staking.rs`)

**Validator Structure:**
```rust
pub struct Validator {
    pub address: Address,
    pub consensus_pubkey: Vec<u8>,
    pub total_stake: u128,
    pub status: ValidatorStatus,  // Pending, Active, Inactive, Slashed
    pub reward_index: u128,       // Fixed-point for proportional rewards
    pub accumulated_unpaid: u128,
    pub commission_rate: u16,     // Basis points (e.g., 500 = 5%)
    pub self_stake: u128,
}
```

**Key Functions:**
- `register_validator()` - Register new validator with Pending status
- `activate_validator()` - Auto-activate when minimum self-stake met
- `get_active_validators()` - List validators participating in consensus
- `slash_validator()` - Placeholder for slashing mechanism

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

#### 3. Reward Accrual Engine

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

**New Runtime Methods:**
- `register_validator()` - Validator registration
- `delegate()` - DGT delegation with balance locking
- `claim_rewards()` - DRT reward claiming
- `process_block_rewards()` - Called during block processing
- `get_active_validators()` - Query active validator set

### CLI Integration (`cli/src/cmd/stake.rs`)

**New Commands:**
```bash
dcli stake register-validator --address <addr> --pubkey <key> --commission <rate> --self-stake <amount>
dcli stake delegate --from <delegator> --validator <validator> --amount <amount>
dcli stake show --address <address>
dcli stake validators
dcli stake claim-rewards --delegator <addr> --validator <addr>
dcli stake stats
```

### API Integration (`blockchain-core/src/api/mod.rs`)

**New RPC Methods:**
- `staking_register_validator`
- `staking_delegate`
- `staking_get_validator`
- `staking_get_validators`
- `staking_claim_rewards`
- `staking_get_stats`

## Configuration

### Staking Parameters
```rust
pub struct StakingParams {
    pub max_validators: u32,         // Default: 100
    pub min_self_stake: u128,        // Default: 1M DGT (1e12 uDGT)
    pub slash_double_sign: u16,      // Default: 500 (5%)
    pub slash_downtime: u16,         // Default: 100 (1%)
    pub emission_per_block: u128,    // Default: 1e6 uDRT (1 DRT)
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

### Delegation Protection
- Prevents duplicate delegations to same validator
- Balance checks before delegation
- Atomic delegation operations

### Reward Security
- Fixed-point arithmetic prevents precision loss
- Overflow protection in calculations
- Reward cursor prevents double-claiming

## Testing

Comprehensive test suite covers:
- Validator registration and activation
- Delegation mechanics and constraints
- Reward calculation accuracy
- Edge cases and error conditions

**Run tests:**
```bash
cd blockchain-core
cargo test staking
```

## Future Enhancements

### Phase 2 Features (Not in MVP)
- **Undelegation**: Token unbonding with time delay
- **Slashing**: Actual token burning for misbehavior
- **Commission**: Validator fee collection
- **Governance Integration**: Stake-weighted voting
- **Advanced Rewards**: Variable emission schedules

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

## Implementation Status

- [x] Core staking module with validator registry
- [x] Delegation system with DGT locking
- [x] Reward accrual engine with fixed-point math
- [x] Runtime integration with state management
- [x] CLI commands for staking operations
- [x] API endpoints for RPC integration
- [x] Comprehensive test suite
- [x] Documentation and examples
- [ ] Full RPC server integration (requires server implementation)
- [ ] Undelegation mechanism (deferred)
- [ ] Slashing implementation (deferred)
- [ ] Commission distribution (deferred)

## Notes

This implementation provides a solid foundation for the Dytallix staking system while maintaining compatibility with the existing codebase. The modular design allows for easy extension and future feature additions.