# Staking Module Implementation

This document provides a comprehensive overview of the validator set staking and reward distribution implementation for Dytallix Lean Launch.

## Overview

The staking module implements a Proof-of-Stake validator system with the following key features:

- **Validator Registration**: Operators can register as validators with commission rates
- **Token Delegation**: Users can delegate DGT tokens to validators
- **Active Set Management**: Deterministic selection of top validators by stake
- **Reward Distribution**: Per-block rewards distributed proportionally to stake
- **Environment Configuration**: All constants configurable via environment variables

## Core Components

### Configuration Constants

All configuration values support environment variable overrides:

```rust
pub struct StakingConfig {
    /// Maximum number of active validators (default: 50)
    /// Environment: DLX_MAX_VALIDATORS
    pub max_validators: u32,
    
    /// Per-block reward emission in uDRT (default: 10,000)
    /// Environment: DLX_R_BLOCK_DRT
    pub r_block_drt: u128,
    
    /// Minimum self-bond required for activation in uDGT (default: 1,000,000)
    /// Environment: DLX_MIN_SELF_BOND_DGT
    pub min_self_bond_dgt: u128,
}
```

### Token Units

- **DRT (Dytallix Reward Token)**: Base reward/fee token
  - 1 DRT = 1,000,000,000 uDRT (micro-DRT)
- **DGT (Dytallix Governance Token)**: Stake token for validator eligibility
  - 1 DGT = 1,000,000 uDGT (micro-DGT)

### Data Structures

#### Validator

```rust
pub struct Validator {
    pub operator_address: String,           // Validator operator address
    pub consensus_pubkey: Vec<u8>,          // Consensus public key
    pub commission_bps: u16,                // Commission rate (0-10,000 basis points)
    pub self_bonded_udgt: u128,             // Self-bonded DGT amount
    pub total_delegated_udgt: u128,         // External delegations
    pub status: ValidatorStatus,            // Current status
    pub accumulated_rewards_udrt: u128,     // Accumulated rewards
    pub metadata: Option<String>,           // Optional metadata
    pub created_height: u64,                // Registration block height
}
```

#### Delegation

```rust
pub struct Delegation {
    pub delegator_address: String,          // Delegator address
    pub validator_operator_address: String, // Target validator
    pub amount_udgt: u128,                  // Delegation amount
    pub nonce: u64,                         // Anti-replay nonce
}
```

#### Validator Status

```rust
pub enum ValidatorStatus {
    Unregistered,  // Not registered
    Registered,    // Registered but not active
    Active,        // Active in consensus
}
```

## Message Types

### MsgRegisterValidator

Registers a new validator:

```rust
pub struct MsgRegisterValidator {
    pub operator: String,           // Operator address
    pub consensus_pk: Vec<u8>,      // Consensus public key
    pub commission_bps: u16,        // Commission rate (0-10,000)
    pub details: Option<String>,    // Optional metadata
}
```

**Validation Rules:**
- Operator must not already be registered (VLD_002)
- Commission rate must be ≤ 10,000 basis points (STK_002)

### MsgDelegate

Delegates tokens to a validator:

```rust
pub struct MsgDelegate {
    pub delegator: String,          // Delegator address
    pub validator: String,          // Validator operator address
    pub amount: u128,               // Amount in token base units
    pub denom: String,              // Token denomination ("uDGT")
    pub nonce: u64,                 // Anti-replay nonce
}
```

**Validation Rules:**
- Validator must be registered (VLD_001)
- Amount must be positive (STK_002)
- Denomination must be "uDGT" (STK_004)
- No existing delegation from same delegator to same validator (STK_005)
- Self-delegations count toward `self_bonded_udgt`

## Active Set Management

### Validator Activation

Validators transition from `Registered` to `Active` when:
1. Self-bonded amount ≥ `MIN_SELF_BOND_DGT`
2. Total validators in active set < `MAX_VALIDATORS`
3. OR validator has enough stake to displace an existing active validator

### Ordering Algorithm

Active validators are ordered by:
1. **Primary**: Total stake (self-bonded + delegated) - descending
2. **Tie-breaker**: Operator address - ascending (lexicographic)

This ensures deterministic validator set selection and ordering.

## Reward Distribution

### Per-Block Distribution

Each block, `R_BLOCK_DRT` uDRT is distributed among active validators proportionally to their total stake.

**Algorithm:**
1. Calculate each validator's reward: `reward_i = floor(R_BLOCK_DRT * stake_i / total_stake)`
2. Distribute any remainder deterministically to validators in order until exhausted

**Example:**
- Block reward: 10,000 uDRT
- Validator stakes: [2M, 1.5M, 1.2M] uDGT
- Total stake: 4.7M uDGT
- Rewards: [4,256, 3,191, 2,553] uDRT (proportional + remainder)

### Reward Accumulation

Rewards accumulate in `Validator.accumulated_rewards_udrt` and can be withdrawn via `MsgWithdrawValidatorRewards`.

## Error Handling

### Error Codes and HTTP Mapping

| Code | Error | HTTP Status | Description |
|------|-------|-------------|-------------|
| STK_001 | InsufficientBalance | 422 | Delegator lacks sufficient balance |
| STK_002 | InvalidAmount | 422 | Invalid amount (zero, negative, or out of bounds) |
| STK_003 | NonceMismatch | 422 | Transaction nonce mismatch |
| STK_004 | InvalidDenom | 422 | Invalid token denomination |
| STK_005 | AlreadyDelegated | 409 | Delegation already exists |
| VLD_001 | NotRegistered | 422 | Validator not registered |
| VLD_002 | AlreadyRegistered | 409 | Validator already registered |
| VLD_003 | BelowMinSelfBond | 422 | Self-bond below minimum requirement |
| VLD_004 | MaxValidatorsReached | 409 | Maximum validator limit reached |

### Error Design Principles

- **422 Unprocessable Entity**: Input validation errors
- **409 Conflict**: State conflicts (duplicates, limits)
- Errors include both human-readable messages and machine-readable codes

## Key Functions

### Core Operations

```rust
impl StakingState {
    // Register a new validator
    pub fn register_validator(&mut self, msg: MsgRegisterValidator) -> Result<(), StakingError>
    
    // Delegate tokens to a validator
    pub fn delegate(&mut self, msg: MsgDelegate) -> Result<(), StakingError>
    
    // Distribute per-block rewards
    pub fn distribute_block_rewards(&mut self, block_height: u64) -> Result<(), StakingError>
    
    // Get active validators in stake order
    pub fn get_active_validators_ordered(&self) -> Vec<&Validator>
    
    // Withdraw validator rewards
    pub fn withdraw_validator_rewards(&mut self, msg: MsgWithdrawValidatorRewards) -> Result<u128, StakingError>
}
```

### Utility Functions

```rust
// Proportional distribution with integer math and deterministic remainder handling
pub fn proportional_split(total: u128, weights: &[u128]) -> Vec<u128>
```

## Integration Points

### Runtime Module

The staking module is integrated into the dytallix-lean-launch runtime at:
- **Path**: `dytallix-lean-launch/node/src/runtime/staking.rs`
- **Export**: Available via `dytallix_lean_node::runtime::staking`

### Future Extensions

The implementation provides placeholders for:
- **Undelegation**: Token unbonding with time delays
- **Commission Distribution**: Validator fee collection
- **Slashing**: Validator penalties for misbehavior
- **Governance Integration**: Stake-weighted voting

## Testing

### Unit Tests

Comprehensive unit tests cover:
- Configuration and defaults
- Validator registration and validation
- Delegation mechanics and error cases
- Active set management and ordering
- Reward distribution and mathematical correctness
- Error code mapping

### Integration Tests

Integration tests demonstrate:
- End-to-end validator lifecycle
- Multi-validator scenarios
- Stake-based ordering changes
- Reward distribution accuracy

## Security Considerations

### Input Validation

- All numeric inputs validated for bounds and overflow
- String inputs sanitized and length-limited
- Cryptographic keys validated for format

### Determinism

- All operations are deterministic and reproducible
- Tie-breaking uses lexicographic ordering
- Remainder distribution follows fixed algorithm

### Anti-Replay Protection

- Nonce-based replay protection for transactions
- State transition validation prevents invalid sequences

## Performance Characteristics

### Time Complexity

- Validator registration: O(1)
- Delegation: O(1)
- Active set ordering: O(n log n) where n = total validators
- Reward distribution: O(k) where k = active validators

### Space Complexity

- Validator storage: O(n) where n = total validators
- Delegation storage: O(d) where d = total delegations
- Minimal additional overhead for computation

## Deployment Configuration

### Environment Variables

Set these environment variables to customize configuration:

```bash
export DLX_MAX_VALIDATORS=50          # Maximum active validators
export DLX_R_BLOCK_DRT=10000         # Per-block reward in uDRT
export DLX_MIN_SELF_BOND_DGT=1000000 # Minimum self-bond in uDGT
```

### Default Values

If environment variables are not set, the system uses these defaults:
- MAX_VALIDATORS: 50
- R_BLOCK_DRT: 10,000 uDRT (0.00001 DRT)
- MIN_SELF_BOND_DGT: 1,000,000 uDGT (1 DGT)

This completes the staking module implementation according to Prompt 14 specifications.