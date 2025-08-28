# Staking Reward Refactor Migration Guide
## Migration: Global Reward Index Implementation (2025-08-staking-reward-refactor)

### Overview

This migration introduces a comprehensive refactor of the staking reward system, transitioning from per-validator reward indices to a global cumulative reward index for improved efficiency and accuracy.

### Changes Summary

#### Data Model Changes

**Enhanced Delegation Structure:**
```rust
// BEFORE: Basic delegation
pub struct Delegation {
    pub delegator_address: Address,
    pub validator_address: Address,
    pub stake_amount: u128,
    pub reward_cursor_index: u128,
    pub accrued_rewards: u128,  // Simple accrued tracking
}

// AFTER: Enhanced delegation with comprehensive reward tracking
pub struct Delegation {
    pub delegator_address: Address,
    pub validator_address: Address,
    pub stake_amount: u128,
    pub reward_cursor_index: u128,      // Legacy (maintained for compatibility)
    pub accrued_rewards: u128,          // Legacy (maintained for compatibility)
    pub rewards: DelegatorRewards,      // NEW: Enhanced reward tracking
}

pub struct DelegatorRewards {
    pub accrued_unclaimed: u128,        // uDRT rewards ready to claim
    pub total_claimed: u128,            // Lifetime uDRT claimed
    pub last_index: u128,               // Last global reward_index snapshot
}
```

**Enhanced Staking State:**
```rust
// BEFORE: Per-validator tracking
pub struct StakingState {
    // ... existing fields
}

// AFTER: Global index tracking
pub struct StakingState {
    // ... existing fields
    pub global_reward_index: u128,     // NEW: Global cumulative reward index
}
```

#### Reward Calculation Changes

**BEFORE: Per-validator calculation**
```rust
// Calculate rewards per validator independently
validator.reward_index += (emission_per_block * SCALE) / validator.total_stake
pending = (validator.reward_index - delegation.cursor) * stake / SCALE
```

**AFTER: Global index calculation**
```rust
// Single global index updated per block
global_reward_index += (emission_per_block * SCALE) / total_active_stake
pending = stake * (global_reward_index - last_index) / SCALE
```

### Migration Strategy

#### Automatic Migration (Zero Downtime)

The migration is designed to be backward compatible with zero downtime:

1. **Existing Delegations**: All existing delegation records will automatically work
   - New `rewards` field uses `#[serde(default)]` annotation
   - Legacy `accrued_rewards` field is maintained for compatibility
   - New delegations initialize with current `global_reward_index`

2. **Global Index Initialization**:
   - Starts at 0 for new deployments
   - For existing deployments, initializes from current validator reward indices

3. **Settlement Process**:
   - First settlement for existing delegations uses legacy calculation
   - Subsequent settlements use new global index system
   - Gradual transition ensures no reward loss

#### Migration Steps for Existing Deployments

**Step 1: Initialize Global Index**
```rust
// On upgrade, initialize global_reward_index from existing validator indices
let avg_validator_index = validators.values()
    .filter(|v| v.status == Active)
    .map(|v| v.reward_index)
    .sum::<u128>() / active_count;

staking_state.global_reward_index = avg_validator_index;
```

**Step 2: Initialize Delegator Rewards**
```rust
// For each existing delegation, initialize with current state
for delegation in delegations.values_mut() {
    if delegation.rewards.last_index == 0 {  // Uninitialized
        delegation.rewards = DelegatorRewards {
            accrued_unclaimed: delegation.accrued_rewards,  // Preserve existing
            total_claimed: 0,                               // Start fresh
            last_index: staking_state.global_reward_index,  // Current index
        };
    }
}
```

**Step 3: Verify Migration**
```rust
// Verify all delegations have proper initialization
assert!(delegations.values().all(|d| d.rewards.last_index > 0));
```

### New Functionality

#### Enhanced CLI Commands
```bash
# NEW: Comprehensive reward queries
dcli staking rewards --delegator dyt1... [--json]

# NEW: Enhanced claiming options
dcli staking claim --delegator dyt1... --all
dcli staking claim --delegator dyt1... --validator val1...
```

#### New REST Endpoints
```http
GET /staking/rewards/{delegator}    # Comprehensive reward summary
POST /staking/claim                 # Flexible claim endpoint
```

#### New RPC Methods
```json
{"method": "staking_claim_all_rewards", "params": ["delegator_address"]}
```

### Benefits

1. **Performance**: O(1) reward calculations vs O(n) per validator
2. **Accuracy**: Eliminates rounding errors from per-validator calculations
3. **Functionality**: Multi-validator claiming in single transaction
4. **Scalability**: Efficient reward tracking regardless of validator count
5. **Precision**: Global index provides consistent reward distribution

### Testing Migration

#### Verification Steps

1. **Backward Compatibility Test**:
   ```rust
   // Verify old delegation JSON deserializes correctly
   let old_json = r#"{"delegator_address": "...", "stake_amount": 1000}"#;
   let delegation: Delegation = serde_json::from_str(old_json).unwrap();
   assert_eq!(delegation.rewards.accrued_unclaimed, 0);  // Default
   ```

2. **Reward Continuity Test**:
   ```bash
   # Before migration: claim rewards
   dcli staking claim-rewards --delegator addr1 --validator val1

   # After migration: verify same functionality
   dcli staking claim --delegator addr1 --validator val1
   ```

3. **Multi-validator Test**:
   ```bash
   # NEW: Test bulk claiming
   dcli staking claim --delegator addr1 --all
   ```

#### Rollback Plan

If issues are detected:

1. **State Preservation**: Legacy fields (`accrued_rewards`, `reward_cursor_index`) are maintained
2. **Fallback Logic**: Can temporarily disable new global index calculations
3. **Data Recovery**: All original reward data is preserved in legacy fields

### Security Considerations

1. **Reward Integrity**: Migration preserves all existing reward balances
2. **Double-claiming Prevention**: New system maintains claim tracking
3. **Settlement Accuracy**: Lazy settlement prevents reward loss during transitions
4. **Index Consistency**: Global index prevents reward calculation discrepancies

### Performance Impact

- **Memory**: Minimal increase due to `DelegatorRewards` struct
- **CPU**: Significant improvement in reward calculation performance
- **Storage**: Backward-compatible storage format
- **Network**: More efficient multi-validator operations

### Troubleshooting

#### Common Issues

**Issue**: Old delegations showing zero rewards after migration
**Solution**: Check `last_index` initialization - should equal current `global_reward_index`

**Issue**: Inconsistent reward calculations
**Solution**: Verify global index is being updated correctly in `process_block_rewards`

**Issue**: CLI commands not working
**Solution**: Ensure new CLI commands are available and endpoints are responding

#### Debug Commands

```bash
# Check global index state
dcli staking stats

# Verify specific delegation state
dcli staking show --address delegator_address

# Test claim functionality
dcli staking rewards --delegator delegator_address --json
```

### Support

For migration assistance or issues:
1. Check migration logs for initialization errors
2. Verify all delegation records have `last_index > 0`
3. Test reward calculations with small amounts first
4. Monitor global index progression across blocks

This migration maintains full backward compatibility while providing significant improvements to the staking reward system's efficiency and functionality.