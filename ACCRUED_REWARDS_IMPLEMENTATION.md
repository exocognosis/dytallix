# Per-Delegation Reward Ledger Implementation

This document outlines the implementation of per-delegation reward ledger and new claim/query interfaces.

## Changes Made

### 1. Data Model Enhancement

**File**: `blockchain-core/src/staking.rs`

Extended the `Delegation` struct to include:
```rust
#[serde(default)]
pub accrued_rewards: u128,
```

- Added `accrued_rewards` field to track synced but unclaimed uDRT rewards
- Used `#[serde(default)]` for backward compatibility (old state deserializes with 0)
- Updated delegation creation to initialize `accrued_rewards = 0`

### 2. Reward Sync Helper Method

**File**: `blockchain-core/src/staking.rs`

Added `StakingState::sync_delegation_rewards()` method:
```rust
pub fn sync_delegation_rewards(
    &mut self,
    delegator: &Address,
    validator_address: &Address,
) -> Result<(u128, u128), StakingError>
```

**Functionality**:
- Computes pending rewards: `(validator.reward_index - delegation.reward_cursor_index) * stake_amount / REWARD_SCALE`
- If pending > 0: Updates `delegation.accrued_rewards += pending` and `delegation.reward_cursor_index = validator.reward_index`
- Returns `(pending_added, total_accrued_after)`

### 3. Modified Claim Flow

**File**: `blockchain-core/src/staking.rs`

Updated `claim_rewards()` method:
- First calls `sync_delegation_rewards()` to update accrued rewards
- Transfers `delegation.accrued_rewards` to delegator (via runtime DRT balance crediting)
- Sets `delegation.accrued_rewards = 0` after claiming
- **Note**: Only credits uDRT tokens, not uDGT (as per requirements)

### 4. New Runtime Methods

**File**: `blockchain-core/src/runtime/mod.rs`

Added two new methods:
```rust
pub async fn sync_and_get_accrued_rewards(
    &self,
    delegator: &Address,
    validator: &Address,
) -> Result<u128, StakingError>
```
- Calls `staking.sync_delegation_rewards()` and returns current accrued amount

```rust
pub async fn get_accrued_rewards(
    &self,
    delegator: &Address,
    validator: &Address,
) -> Result<u128, StakingError>
```
- Returns stored accrued rewards without recomputation (for transparency)

### 5. RPC/API Handlers

**File**: `blockchain-core/src/api/mod.rs`

Added JSON-RPC method handlers:

#### `staking_sync_accrued`
- **Params**: `[delegator, validator]`
- **Response**: `{"accrued": <amount>}`
- **Function**: Syncs and returns current accrued rewards

#### `staking_get_accrued`
- **Params**: `[delegator, validator]`
- **Response**: `{"accrued": <amount>}`
- **Function**: Returns stored accrued rewards without sync

## Testing

### Integration Tests

**File**: `tests/integration_staking.rs`

Added comprehensive tests:
1. `test_accrued_rewards_functionality()` - Tests full accrual and claiming workflow
2. `test_backward_compatibility()` - Validates old JSON can be deserialized

### Verification Script

**File**: `verify_accrued_rewards.rs`

Standalone verification script that tests:
- Serialization/deserialization of new structure
- Backward compatibility with old JSON format
- Reward accrual simulation
- Reward claiming simulation

## API Usage Examples

### Sync and Get Accrued Rewards
```bash
curl -X POST http://localhost:3030/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_sync_accrued",
    "params": ["delegator1", "validator1"],
    "id": 1
  }'
```

### Get Stored Accrued Rewards
```bash
curl -X POST http://localhost:3030/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_get_accrued",
    "params": ["delegator1", "validator1"],
    "id": 1
  }'
```

### Claim Rewards (existing method, now updated)
```bash
curl -X POST http://localhost:3030/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "staking_claim_rewards",
    "params": ["delegator1", "validator1"],
    "id": 1
  }'
```

## Key Features

1. **Backward Compatibility**: Old delegation records automatically default to 0 accrued rewards
2. **Precise Tracking**: Rewards are accrued incrementally and tracked per delegation
3. **Transparent Queries**: Can query both synced and stored accrued amounts
4. **uDRT Only**: Only credits uDRT tokens during reward claiming (not uDGT)
5. **Atomic Operations**: Sync and claim operations are atomic within the staking state

## Migration Notes

- Existing deployments will automatically handle old delegation records
- No data migration required due to `#[serde(default)]` annotation
- New functionality is additive and doesn't break existing workflows