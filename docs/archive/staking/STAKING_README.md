# Dytallix Staking System

A comprehensive Proof-of-Stake implementation for the Dytallix blockchain featuring validator registry, delegation mechanics, and proportional reward distribution.

## 🎯 Overview

The Dytallix staking system enables:
- **Validator Registration**: Become a block producer by staking DGT tokens
- **Delegation**: Stake DGT tokens to validators and earn DRT rewards
- **Reward Accrual**: Automatic proportional reward distribution per block
- **Governance Ready**: Foundation for stake-weighted governance (future)

## 🚀 Quick Start

### For Validators

```bash
# Register as a validator
dcli stake register-validator \
  --address validator1 \
  --pubkey "0x1234..." \
  --commission 500 \
  --self-stake 1000000000000

# Check validator status
dcli stake show --address validator1
```

### For Delegators

```bash
# Delegate DGT to a validator
dcli stake delegate \
  --from delegator1 \
  --validator validator1 \
  --amount 500000000000

# Claim DRT rewards
dcli stake claim-rewards \
  --delegator delegator1 \
  --validator validator1
```

### For Everyone

```bash
# List all validators
dcli stake validators

# View staking statistics
dcli stake stats
```

## 📋 Features

### ✅ Implemented (MVP)
- [x] **Validator Registry** - On-chain validator state management
- [x] **Delegation System** - DGT token locking with duplicate prevention
- [x] **Reward Engine** - Per-block proportional DRT distribution
- [x] **CLI Interface** - Complete command set for staking operations
- [x] **Fixed-Point Math** - Precise reward calculations (1e12 scale)
- [x] **Genesis Integration** - Validator set initialization
- [x] **Runtime Integration** - State persistence and querying
- [x] **Comprehensive Tests** - Full test coverage with edge cases

### 🔄 Future Enhancements
- [ ] **Undelegation** - Token unbonding with time delays
- [ ] **Slashing** - Punishment for validator misbehavior
- [ ] **Commission** - Validator fee collection from rewards
- [ ] **Governance** - Stake-weighted proposal voting
- [ ] **Advanced Rewards** - Variable emission schedules

## 🏗️ Architecture

### Core Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Validator     │    │    Delegation    │    │  Reward Engine  │
│   Registry      │    │     System       │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Registration  │    │ • DGT Locking    │    │ • Per-block     │
│ • Activation    │    │ • Duplicate      │    │ • Fixed-point   │
│ • Status Mgmt   │    │   Prevention     │    │ • Proportional  │
│ • Power Calc    │    │ • Balance Check  │    │ • Auto-compound │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Data Structures

#### Validator
```rust
pub struct Validator {
    pub address: Address,           // Validator identifier
    pub consensus_pubkey: Vec<u8>,  // Public key for consensus
    pub total_stake: u128,          // Total delegated DGT
    pub status: ValidatorStatus,    // Pending/Active/Inactive/Slashed
    pub reward_index: u128,         // Scaled reward accumulator
    pub commission_rate: u16,       // Basis points (500 = 5%)
    pub self_stake: u128,           // Self-delegated amount
}
```

#### Delegation
```rust
pub struct Delegation {
    pub delegator_address: Address,  // Who delegated
    pub validator_address: Address,  // Target validator
    pub stake_amount: u128,          // Amount in uDGT
    pub reward_cursor_index: u128,   // Last reward claim point
}
```

## 💰 Token Economics

### DGT (Governance Token)
- **Total Supply**: 1 billion (fixed)
- **Use Cases**: Staking, governance, transaction fees
- **Staking Behavior**: Locked when delegated, released when undelegated
- **Minimum Validator Stake**: 1 million DGT
- **Unit**: uDGT (1 DGT = 1,000,000 uDGT)

### DRT (Reward Token)
- **Total Supply**: Variable (inflationary ~6% annually)
- **Use Cases**: Staking rewards, AI service payments
- **Distribution**: Block rewards to validators/delegators
- **Emission Rate**: 1 DRT per block (configurable)
- **Unit**: uDRT (1 DRT = 1,000,000 uDRT)

## 🔢 Reward Mathematics

### Fixed-Point Precision
```rust
const REWARD_SCALE: u128 = 1_000_000_000_000; // 1e12 for precision
```

### Per-Block Calculation
```rust
// Update validator reward index
reward_index += (emission_per_block * SCALE) / total_active_stake;

// Calculate delegator rewards
pending_rewards = (validator.reward_index - delegation.cursor) * delegation.stake / SCALE;
```

### Example Calculation
```
Block Emission: 1,000,000 uDRT (1 DRT)
Total Stake: 10,000,000,000,000 uDGT (10M DGT)
Your Stake: 1,000,000,000,000 uDGT (1M DGT = 10%)

Your Rewards: 1,000,000 * 10% = 100,000 uDRT (0.1 DRT)
```

## 🛡️ Security Features

### Validator Requirements
- **Minimum Self-Stake**: Prevents frivolous registrations
- **Maximum Validators**: Maintains decentralization (100 limit)
- **Commission Transparency**: Rates visible to delegators

### Delegation Protection
- **Duplicate Prevention**: One delegation per delegator-validator pair
- **Balance Verification**: Sufficient DGT required before delegation
- **Atomic Operations**: All-or-nothing delegation/reward claiming

### Reward Security
- **Overflow Protection**: SafeMath operations throughout
- **Precision Preservation**: Fixed-point arithmetic prevents rounding errors
- **Double-Claim Prevention**: Reward cursor tracking

## 🧪 Testing

### Run Tests
```bash
cd blockchain-core
cargo test staking

# Integration tests
cargo test --test integration_staking

# Example usage
cargo run --example staking_example
```

### Test Coverage
- Validator registration and activation
- Delegation mechanics and constraints
- Reward calculation accuracy
- Multi-validator scenarios
- Edge cases and error conditions
- Performance under load

## 📱 CLI Usage

### Validator Operations
```bash
# Register and self-stake
dcli stake register-validator \
  --address my_validator \
  --pubkey $(cat validator_key.pub) \
  --commission 500 \
  --self-stake 1000000000000

# Check validator status
dcli stake show --address my_validator
```

### Delegation Operations
```bash
# Delegate to validator
dcli stake delegate \
  --from my_address \
  --validator target_validator \
  --amount 500000000000

# View delegation info
dcli stake show --address my_address
```

### Reward Operations
```bash
# Claim accumulated rewards
dcli stake claim-rewards \
  --delegator my_address \
  --validator target_validator

# View staking statistics
dcli stake stats
```

### Query Operations
```bash
# List all validators
dcli stake validators

# Show specific validator
dcli stake show --address validator_address
```

## 🔧 Configuration

### Genesis Parameters
```toml
[staking]
minimum_validator_stake = 1000000000000  # 1M DGT
max_validators = 100
double_sign_slash_rate = 500             # 5%
downtime_slash_rate = 100                # 1%
emission_per_block = 1000000             # 1 DRT
```

### Runtime Parameters
```rust
pub struct StakingParams {
    pub max_validators: u32,       // Default: 100
    pub min_self_stake: u128,      // Default: 1M DGT
    pub slash_double_sign: u16,    // Default: 500 (5%)
    pub slash_downtime: u16,       // Default: 100 (1%)
    pub emission_per_block: u128,  // Default: 1 DRT
}
```

## 🚀 Integration Guide

### For DApp Developers
```javascript
// Query validator list
const validators = await dytallix.staking.getValidators();

// Delegate tokens
await dytallix.staking.delegate({
  validator: "validator_address",
  amount: "1000000000000" // 1M DGT in uDGT
});

// Claim rewards
const rewards = await dytallix.staking.claimRewards({
  validator: "validator_address"
});
```

### For Infrastructure Providers
```rust
// Initialize with genesis
let genesis = GenesisConfig::mainnet();
let runtime = DytallixRuntime::new_with_genesis(storage, Some(&genesis))?;

// Process block rewards
runtime.process_block_rewards(block_height).await?;

// Query staking state
let validators = runtime.get_active_validators().await;
```

## 📚 Resources

- **[Full Documentation](docs/STAKING.md)** - Detailed technical specification
- **[Integration Tests](tests/integration_staking.rs)** - Complete test suite
- **[Usage Examples](examples/staking_example.rs)** - Working code examples
- **[CLI Reference](cli/src/cmd/stake.rs)** - Command implementation

## 🤝 Contributing

1. Review the [staking module](blockchain-core/src/staking.rs)
2. Run existing tests: `cargo test staking`
3. Add new tests for your changes
4. Update documentation as needed
5. Submit PR with detailed description

## 📄 License

This staking implementation is part of the Dytallix blockchain project and follows the same licensing terms.

---

**Built with ❤️ for the Dytallix ecosystem**