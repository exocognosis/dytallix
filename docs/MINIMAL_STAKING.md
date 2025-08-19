# Minimal Staking Implementation

This document describes the minimal staking implementation added to the Dytallix lean launch node.

## Overview

The staking system implements basic validator registration, delegation, and constant block rewards while maintaining backward compatibility with existing systems.

## Features

### Core Functionality
- **Stake/Unstake Messages**: New message types for staking operations
- **Validator Registry**: Auto-creation of validators on first stake
- **Deterministic Validator Set**: Ordered by stake (desc) then address (asc)
- **Block Rewards**: Constant 10,000 uDRT per block to proposer
- **Validator Set Hash**: SHA256 hash included in block headers

### Message Types

#### Stake Message
```json
{
  "type": "stake",
  "delegator": "dyt1...",
  "validator": "dyt1...", 
  "amount": "1000000"
}
```

#### Unstake Message
```json
{
  "type": "unstake",
  "delegator": "dyt1...",
  "validator": "dyt1...",
  "amount": "500000" 
}
```

## API Endpoints

### Validators
- `GET /staking/validators` - List all validators
- `GET /staking/validator/{address}` - Get single validator
- `GET /staking/active_validators` - Get current active validator set

### Delegations  
- `GET /staking/delegations/{delegator}` - Get delegations for delegator
- `GET /staking/delegation/{delegator}/{validator}` - Get specific delegation

### System
- `GET /staking/validator_set_hash` - Get current validator set hash
- `GET /staking/params` - Get staking parameters
- `GET /staking/stats` - Get staking statistics

## Technical Details

### Validator Set Hash
The validator set hash is computed using SHA256 over the concatenation of:
```
for each active validator (ordered by stake desc, address asc):
  validator.address || validator.consensus_pk || validator.stake (big-endian u128)
```

### Block Header Extension
```rust
pub struct BlockHeader {
    // ... existing fields
    pub validator_set_hash: [u8; 32], // Added for staking
}
```

### State Integration
The staking state is integrated into the main state manager:
```rust
pub struct State {
    // ... existing fields
    pub staking: StakingState,
}
```

## MVP Limitations

- **No Unbonding Period**: Unstaking is immediate
- **No Slashing**: No penalties for misbehavior  
- **Simple Delegation Model**: One delegation per delegator-validator pair
- **Fixed Proposer**: Uses hardcoded proposer address for rewards
- **Auto Validator Creation**: Validators created automatically on first stake

## Error Codes

- `ERR_STAKE_INSUFFICIENT_FUNDS` - Insufficient uDGT balance
- `ERR_STAKE_ZERO_AMOUNT` - Cannot stake/unstake zero amount
- `ERR_UNSTAKE_EXCEEDS_DELEGATION` - Unstake amount exceeds delegation
- `ERR_VALIDATOR_NOT_FOUND` - Validator does not exist
- `ERR_DELEGATION_ALREADY_EXISTS` - Delegation already exists
- `ERR_DELEGATION_NOT_FOUND` - Delegation does not exist

## Future Enhancements

- Unbonding periods with time delays
- Slashing for validator misbehavior
- Commission rates for validators
- Multiple delegations per validator
- Dynamic reward calculations
- Governance integration
- WebSocket events for real-time updates

## Testing

Unit tests are provided in `tests/staking_unit.rs` and integration tests in `tests/staking_integration.rs`.

Run tests with:
```bash
cargo test staking
```

## Backward Compatibility

All changes are additive and maintain backward compatibility:
- Message enum extended with new variants
- Block header extended with new field
- Transaction struct extended with optional message data
- Existing RPC endpoints unchanged