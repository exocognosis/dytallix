# Dytallix Dual-Token Economic System

A comprehensive dual-token economic system implementation for the Dytallix blockchain, featuring governance tokens (DGT), reward tokens (DRT), staking, vesting, governance, and automated burning mechanisms.

## 🌟 Overview

The Dytallix tokenomics system implements a sophisticated dual-token model designed to support governance, staking, rewards, and sustainable economic incentives. The system is built with modularity, security, and deployability in mind.

### Token System

- **DGT (Dytallix Governance Token)**: Fixed supply governance token with voting and staking capabilities
- **DRT (Dytallix Reward Token)**: Inflationary reward token with automated emission and burning

## 🏗️ Architecture

```
DytallixLeanLaunch/tokenomics/
├── src/
│   ├── lib.rs                  # Main library with common types and errors
│   ├── config/                 # Configuration management
│   │   └── mod.rs             # Tokenomics configuration types and validation
│   ├── tokens/                 # Token implementations
│   │   ├── mod.rs             # Common token traits and events
│   │   ├── dgt_token.rs       # DGT governance token implementation
│   │   └── drt_token.rs       # DRT reward token implementation
│   ├── vesting/               # Vesting and allocation system
│   │   ├── mod.rs             # Vesting module exports
│   │   ├── vesting_schedule.rs # Cliff + linear vesting implementation
│   │   └── allocation_manager.rs # Stakeholder allocation management
│   ├── staking/               # Staking system
│   │   ├── mod.rs             # Staking module exports
│   │   ├── staking_manager.rs # Validator and delegation management
│   │   └── reward_distributor.rs # DRT reward distribution
│   ├── governance/            # Governance system
│   │   ├── mod.rs             # Governance module exports
│   │   ├── voting_system.rs   # Quadratic voting implementation
│   │   └── proposal_manager.rs # Proposal lifecycle management
│   └── burning/               # Burning and emission system
│       ├── mod.rs             # Burning module exports
│       ├── burn_manager.rs    # Automated burning mechanisms
│       └── emission_schedule.rs # DRT emission scheduling
├── tests/                     # Comprehensive test suite
│   ├── integration_tests.rs   # Full system integration tests
│   ├── token_tests.rs         # Token-specific unit tests
│   ├── staking_tests.rs       # Staking system tests
│   ├── governance_tests.rs    # Governance system tests
│   └── burning_tests.rs       # Burning and emission tests
├── configs/                   # Configuration files
│   ├── allocation_config.json # DGT allocation configuration
│   └── network_params.json   # Network and system parameters
├── Cargo.toml                 # Rust package configuration
└── README.md                  # This file
```

## 🪙 Token Specifications

### DGT (Dytallix Governance Token)

- **Supply**: 1,000,000,000 DGT (fixed, no inflation)
- **Decimals**: 18
- **Voting Power**: 1 DGT = 1 vote (with quadratic voting implementation)
- **Utilities**: Governance voting, validator staking, treasury control

#### Allocation Breakdown
- **Community Treasury**: 40% (unlocked immediately)
- **Staking Rewards**: 25% (linear vesting over 4 years)
- **Dev Team**: 15% (1-year cliff, 3-year linear vesting)
- **Initial Validators**: 10% (6-month cliff, 2-year linear vesting)
- **Ecosystem Fund**: 10% (linear vesting over 5 years)

### DRT (Dytallix Reward Token)

- **Supply Model**: Inflationary (~5% annually)
- **Decimals**: 18
- **Distribution**: Fully automated via emission schedule
- **Burning**: Automated based on network usage

#### Emission Schedule
- **Block Rewards**: 60% of emissions
- **Staking Rewards**: 25% of emissions
- **AI Module Incentives**: 10% of emissions
- **Bridge Operations**: 5% of emissions

#### Burn Mechanisms
- **Transaction Fees**: 100% burned
- **AI Service Fees**: 50% burned
- **Bridge Fees**: 75% burned
- **Governance Violations**: 100% penalty burned

## 🔧 Core Features

### Staking System
- Delegate DGT tokens to validators
- Earn DRT rewards proportional to stake
- Slashing for validator misbehavior
- 21-day unbonding period

### Governance System
- Quadratic voting to reduce whale influence
- Proposal deposits and time-locked execution
- Parameter changes, treasury spending, upgrades
- Minimum quorum and approval thresholds

### Vesting System
- Cliff + linear vesting schedules
- Transparent allocation management
- Automated release mechanisms
- Stakeholder group categorization

### Economic Mechanisms
- Automated DRT emission based on inflation rate
- Fee-based burning to control supply
- Reward distribution with validator commissions
- Network usage correlation with burn rates

## 🚀 Usage

### Basic Token Operations

```rust
use dytallix_tokenomics::tokens::*;
use dytallix_tokenomics::config::*;

// Initialize DGT token
let config = DgtConfig::default();
let mut dgt_token = DgtToken::new(config);

// Setup initial allocations
let mut allocations = HashMap::new();
allocations.insert("treasury".to_string(), 400_000_000_000_000_000_000_000_000);
dgt_token.initialize(allocations)?;

// Transfer tokens
dgt_token.transfer(&"treasury".to_string(), &"user1".to_string(), 1000)?;

// Stake tokens
dgt_token.stake(&"user1".to_string(), 500)?;
```

### Staking Operations

```rust
use dytallix_tokenomics::staking::*;

// Create staking manager
let config = StakingConfig::default();
let mut staking_manager = StakingManager::new(config);

// Create validator
staking_manager.create_validator(
    "validator1".to_string(),
    10_000_000_000_000_000_000, // 10 DGT minimum stake
    Decimal::from_str_exact("0.10").unwrap(), // 10% commission
    1, // block number
)?;

// Delegate to validator
staking_manager.delegate(
    "delegator1".to_string(),
    "validator1".to_string(),
    5_000_000_000_000_000_000, // 5 DGT
    2,
)?;
```

### Governance Operations

```rust
use dytallix_tokenomics::governance::*;

// Create proposal manager
let config = GovernanceConfig::default();
let mut proposal_manager = ProposalManager::new(config);

// Create proposal
let proposal_id = proposal_manager.create_proposal(
    "Increase Validator Limit".to_string(),
    "Proposal to increase max validators from 100 to 150".to_string(),
    ProposalType::ParameterChange {
        parameter: "max_validators".to_string(),
        new_value: "150".to_string(),
    },
    "proposer".to_string(),
    50_000_000_000_000_000_000, // 50 DGT deposit
    1,
    1000,
)?;

// Vote on proposal
proposal_manager.vote(
    proposal_id,
    "voter1".to_string(),
    VoteChoice::Yes,
    20_000_000_000_000_000_000, // 20 DGT voting power
    2,
    1500,
)?;
```

### Emission and Burning

```rust
use dytallix_tokenomics::burning::*;

// Setup emission schedule
let targets = EmissionTargets {
    block_reward_recipient: Some("validator1".to_string()),
    staking_reward_pool: "staking_pool".to_string(),
    ai_incentive_pool: "ai_pool".to_string(),
    bridge_operations_pool: "bridge_pool".to_string(),
};

let mut emission_schedule = EmissionSchedule::new(
    emission_config,
    network_config,
    targets,
);

// Process block emission
let emission_result = emission_schedule.process_block_emission(
    &mut drt_token,
    block_number,
    timestamp,
    Some("current_validator".to_string()),
)?;

// Setup burn manager
let mut burn_manager = BurnManager::new(burn_config);
burn_manager.set_fee_collector(BurnReason::TransactionFees, "fee_collector".to_string());

// Burn transaction fees
let burned = burn_manager.burn_transaction_fees(
    &mut drt_token,
    1_000_000_000_000_000_000, // 1 DRT in fees
    block_number,
    timestamp,
    "burn_tx_hash".to_string(),
)?;
```

## 🧪 Testing

The system includes comprehensive test coverage:

```bash
# Run all tests
cargo test

# Run specific test suites
cargo test integration_tests
cargo test token_tests
cargo test staking_tests
cargo test governance_tests
cargo test burning_tests

# Run with output
cargo test -- --nocapture

# Run performance benchmarks
cargo test test_performance_benchmarks -- --nocapture
```

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: Full system interaction testing
- **Performance Tests**: Benchmark critical operations
- **Error Handling**: Comprehensive error condition testing
- **Edge Cases**: Boundary condition validation

## ⚙️ Configuration

### Network Parameters
Configure the tokenomics system via JSON files:

```json
{
  "network": {
    "chain_id": "dytallix-testnet-1",
    "block_time_seconds": 6,
    "blocks_per_year": 5256000,
    "is_testnet": true
  },
  "governance": {
    "minimum_proposal_deposit": "10000000000000000000",
    "voting_period_seconds": 604800,
    "minimum_quorum": 0.15,
    "proposal_threshold": 0.51
  }
}
```

### Allocation Configuration
Define stakeholder allocations and vesting schedules:

```json
{
  "dev_team": {
    "percentage": 0.15,
    "recipients": [
      {
        "address": "dyt1_dev_team_lead",
        "amount": "75000000000000000000000000",
        "description": "Development team lead allocation"
      }
    ],
    "vesting": {
      "immediate_unlock": false,
      "cliff_duration_seconds": 31536000,
      "total_duration_seconds": 126144000
    }
  }
}
```

## 🔒 Security Features

### Testnet Safety
- Maximum allocation limits per address
- Testnet-specific configurations
- Mock data for testing scenarios
- Safety limits on proposals and delegations

### Economic Security
- Slashing mechanisms for validator misbehavior
- Time-locked proposal execution
- Quadratic voting to prevent governance attacks
- Automated burning to control inflation

### Code Security
- Comprehensive error handling
- Overflow protection in all calculations
- Input validation and sanitization
- Audit trail for all operations

## 🚀 Deployment

### Prerequisites
- Rust 1.70+
- Compatible with Substrate-based blockchains
- Integration with Dytallix blockchain core

### Build
```bash
# Build the tokenomics library
cargo build --release

# Build with all features
cargo build --release --all-features

# Check compilation
cargo check --workspace
```

### Integration
Add to your `Cargo.toml`:

```toml
[dependencies]
dytallix-tokenomics = { path = "DytallixLeanLaunch/tokenomics" }
```

## 📚 Documentation

### API Documentation
Generate and view the full API documentation:

```bash
cargo doc --open
```

### Key Types
- `TokenomicsConfig`: Main configuration struct
- `DgtToken`: Governance token implementation
- `DrtToken`: Reward token implementation
- `StakingManager`: Staking system management
- `ProposalManager`: Governance proposal handling
- `BurnManager`: Automated burning mechanisms

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes with comprehensive tests
4. Ensure all tests pass: `cargo test`
5. Submit a pull request

### Development Guidelines
- Follow Rust best practices and conventions
- Add tests for all new functionality
- Update documentation for API changes
- Ensure backwards compatibility when possible

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [Dytallix Website](https://dytallix.com)
- [Documentation](https://docs.dytallix.com)
- [GitHub Repository](https://github.com/HisMadRealm/dytallix)
- [Discord Community](https://discord.gg/dytallix)

## 🏆 Features Summary

✅ **Complete Dual-Token System**  
✅ **Advanced Governance with Quadratic Voting**  
✅ **Sophisticated Staking and Delegation**  
✅ **Automated Emission and Burning**  
✅ **Flexible Vesting Schedules**  
✅ **Comprehensive Testing Suite**  
✅ **Testnet-Ready Configuration**  
✅ **Production-Grade Security**  
✅ **Modular and Extensible Design**  
✅ **Full Documentation and Examples**  

The Dytallix tokenomics system provides a robust foundation for decentralized governance, sustainable economics, and community-driven blockchain evolution.