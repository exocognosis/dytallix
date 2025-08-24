# Dytallix Tokenomics System

The Dytallix tokenomics system implements a sophisticated dual-token model with DAO-controlled adaptive emission, designed to optimize network incentives and governance participation.

## Overview

### Dual-Token Architecture

1. **DGT (Dytallix Governance Token)**
   - Fixed supply governance token
   - Used for DAO voting and governance participation
   - Voting power proportional to token holdings
   - Non-inflationary design

2. **DRT (Dytallix Reward Token)**
   - Adaptive emission reward token
   - Distributed to validators, stakers, and treasury
   - Burnable to control supply
   - Emission controlled by DAO governance

3. **Emission Controller**
   - Smart contract managing DRT emission
   - Implements adaptive emission based on network conditions
   - Integrates with governance system for parameter updates
   - Manages reward pools for different stakeholder groups

## Architecture

### Smart Contracts

The tokenomics system is implemented as WASM-compatible smart contracts:

```
smart-contracts/src/tokenomics/
├── mod.rs                    # Module exports and re-exports
├── types.rs                  # Common types and errors
├── dgt_token.rs              # DGT governance token implementation
├── drt_token.rs              # DRT reward token implementation
└── emission_controller.rs    # Emission management contract
```

### Key Features

#### DGT Token Features
- Fixed total supply (typically 1M tokens)
- Standard ERC-20 functionality (transfer, approve, allowance)
- Voting power calculation
- One-time initial minting by contract owner
- WASM-exported functions for blockchain integration

#### DRT Token Features
- Mintable by emission controller only
- Burnable by token holders
- Adaptive emission processing
- Transfer and allowance functionality
- Integration with emission controller
- WASM-exported functions for all operations

#### Emission Controller Features
- DAO-controlled emission parameters
- Adaptive rate calculation based on network utilization
- Multi-pool reward distribution (validators, stakers, treasury)
- Governance proposal integration
- Configurable emission bounds and adjustment factors

## Governance Integration

### Proposal Types

The governance system supports tokenomics-specific proposals:

```rust
pub enum TokenomicsProposal {
    ChangeEmissionRate { new_rate: EmissionRate },
    UpdateEmissionParameters { new_params: EmissionParameters },
    MintDGT { to: Address, amount: Balance },
    BurnDRT { from: Address, amount: Balance },
}
```

### Governance Flow

1. **Proposal Creation**: Community members create tokenomics proposals
2. **Voting Period**: DGT holders vote on proposals (weighted by holdings)
3. **Execution**: Passed proposals are executed by the emission controller
4. **Parameter Updates**: Emission parameters are updated according to DAO decisions

## Adaptive Emission

### Algorithm

The emission rate adapts based on network utilization:

```rust
fn calculate_adaptive_rate(&self, network_utilization: u32) -> EmissionRate {
    let base_rate = self.emission_params.base_emission_rate;
    let adjustment_factor = self.emission_params.adjustment_factor as u64;
    
    let adjustment = if network_utilization > 5000 {
        // High utilization - increase emission
        base_rate * adjustment_factor / 10000
    } else {
        // Low utilization - decrease emission
        base_rate * adjustment_factor / 20000
    };

    let new_rate = if network_utilization > 5000 {
        base_rate + adjustment
    } else {
        base_rate.saturating_sub(adjustment)
    };

    // Ensure rate stays within bounds
    new_rate.max(self.emission_params.min_emission_rate)
          .min(self.emission_params.max_emission_rate)
}
```

### Parameters

- **Base Emission Rate**: Default emission rate (e.g., 1000 DRT per block)
- **Max Emission Rate**: Upper bound for emission (e.g., 5000 DRT per block)
- **Min Emission Rate**: Lower bound for emission (e.g., 100 DRT per block)
- **Adjustment Factor**: Percentage adjustment for adaptation (e.g., 5% = 500 basis points)

## Reward Distribution

### Distribution Model

Each block's emission is distributed as follows:

- **40%** → Validator rewards
- **30%** → Staker rewards  
- **30%** → Treasury/Development fund

### Staking Reward System

#### Governance vs Reward Token Distinction

- **DGT (Governance Token)**: Used for staking delegation and governance voting. When users delegate DGT to validators, the tokens are locked but not spent.
- **DRT (Reward Token)**: Earned as staking rewards. All staking emissions result in claimable DRT tokens, never DGT tokens.

#### Reward Index Formula

The staking system uses a global reward index to track proportional rewards:

```
reward_index += (staking_rewards * REWARD_SCALE) / total_stake
```

Where:
- `staking_rewards`: 25% of block emission (in uDRT)
- `REWARD_SCALE`: 1e12 (for precision)
- `total_stake`: Total DGT staked across all validators (in uDGT)

#### Accrual Calculation

For a delegator with stake `S`, accrued rewards are calculated as:

```
newly_accrued = (S * (current_reward_index - last_reward_index)) / REWARD_SCALE
total_accrued += newly_accrued
```

**Example walkthrough:**
1. Initial state: `total_stake = 1,000,000 DGT`, `reward_index = 0`
2. Delegator stakes `100,000 DGT` (10% of total)
3. Block emission: `1 DRT` staking rewards → `reward_index += (1,000,000 * 1e12) / 1,000,000,000,000 = 1,000,000`
4. Delegator's accrued: `(100,000,000,000 * 1,000,000) / 1e12 = 100,000 uDRT` (0.1 DRT)

#### Zero-Stake Carry Logic

When `total_stake = 0`:
- Staking rewards accumulate in `pending_staking_emission`
- When stake first becomes > 0, all pending rewards are applied to the reward index
- Ensures no rewards are lost during network bootstrap

### Claiming Process

#### 1. Reward Accrual
- Rewards accrue automatically as blocks are produced
- Each delegator has a `last_reward_index` cursor to track their position
- Accrued rewards are calculated lazily on interaction

#### 2. Claim Workflow

**API Example:**
```bash
# Check accrued rewards
curl -X GET "http://localhost:3030/api/staking/accrued/dyt1delegator"

# Claim rewards
curl -X POST "http://localhost:3030/api/staking/claim" \
  -H "Content-Type: application/json" \
  -d '{"address": "dyt1delegator"}'
```

**CLI Example:**
```bash
# Show accrued rewards
dyt stake show-rewards --address dyt1delegator

# Claim rewards
dyt stake claim --address dyt1delegator
```

**Response:**
```json
{
  "address": "dyt1delegator",
  "claimed": "100000",
  "new_balance": "150000",
  "reward_index": "2000000"
}
```

#### 3. Edge Cases

- **No stake during emission**: Emissions accumulate in pending pool until first stake
- **Delegator with zero stake claiming**: Returns 0, updates last index to current
- **Stake changes mid-stream**: Rewards are settled before stake amount changes to prevent leakage

### Claiming Process

1. **Validators**: Claim rewards from validator pool based on block production
2. **Stakers**: Claim rewards from staker pool based on stake amount and duration  
3. **Treasury**: Automatic allocation for development and ecosystem growth

## WASM Integration

### Exported Functions

All token operations are exported as WASM-compatible C functions:

#### DGT Token Functions
```c
// Balance queries
u64 dgt_balance_of(DGTToken* token, u8* address, usize address_len);
u64 dgt_total_supply(DGTToken* token);
u64 dgt_voting_power(DGTToken* token, u8* address, usize address_len);

// Transfer operations
i32 dgt_transfer(DGTToken* token, u8* from, usize from_len, u8* to, usize to_len, u64 amount);
i32 dgt_approve(DGTToken* token, u8* owner, usize owner_len, u8* spender, usize spender_len, u64 amount);
```

#### DRT Token Functions
```c
// Balance and supply queries
u64 drt_balance_of(DRTToken* token, u8* address, usize address_len);
u64 drt_total_supply(DRTToken* token);
u64 drt_total_burned(DRTToken* token);
u64 drt_emission_rate(DRTToken* token);

// Token operations
i32 drt_transfer(DRTToken* token, u8* from, usize from_len, u8* to, usize to_len, u64 amount);
i32 drt_mint(DRTToken* token, u8* to, usize to_len, u64 amount, u8* caller, usize caller_len);
i32 drt_burn(DRTToken* token, u8* from, usize from_len, u64 amount);
```

#### Emission Controller Functions
```c
// Emission processing
u64 emission_controller_process_emission(EmissionController* controller, u64 current_block, u32 network_utilization);
u64 emission_controller_get_emission_rate(EmissionController* controller);

// Governance integration
i32 emission_controller_submit_proposal(EmissionController* controller, u64 proposal_id, u32 proposal_type, u8* proposal_data, usize proposal_data_len);
i32 emission_controller_execute_proposal(EmissionController* controller, u64 proposal_id);

// Reward claiming
i32 emission_controller_claim_validator_rewards(EmissionController* controller, u8* validator, usize validator_len, u64 amount);
i32 emission_controller_claim_staker_rewards(EmissionController* controller, u8* staker, usize staker_len, u64 amount);
```

## Deployment Guide

### 1. Contract Deployment

Deploy contracts in the following order:

```bash
# Deploy DGT token
dytallix-cli deploy-contract --contract dgt_token --owner dyt1owner

# Deploy DRT token
dytallix-cli deploy-contract --contract drt_token --owner dyt1owner

# Deploy emission controller
dytallix-cli deploy-contract --contract emission_controller --owner dyt1owner
```

### 2. Initial Configuration

```bash
# Set up DGT token with initial supply
dytallix-cli call-contract --address dyt1dgt --method mint_initial_supply --args "dyt1treasury,1000000"

# Configure emission controller
dytallix-cli call-contract --address dyt1emission --method set_drt_token --args "dyt1drt"
dytallix-cli call-contract --address dyt1emission --method set_governance_contract --args "dyt1governance"
dytallix-cli call-contract --address dyt1emission --method set_treasury --args "dyt1treasury"

# Set emission controller in DRT token
dytallix-cli call-contract --address dyt1drt --method set_emission_controller --args "dyt1emission"
```

### 3. Governance Integration

```bash
# Configure governance system to recognize tokenomics proposals
dytallix-cli configure-governance --enable-tokenomics --emission-controller dyt1emission
```

## Usage Examples

### Creating a Governance Proposal

```rust
use dytallix_governance::{DaoGovernance, TokenomicsProposal};

// Create proposal to increase emission rate
let proposal = TokenomicsProposal::ChangeEmissionRate { new_rate: 1500 };

let proposal_id = governance.propose_tokenomics(
    "Increase DRT Emission Rate".to_string(),
    "Increase emission to incentivize network growth".to_string(),
    48, // 48 hours voting period
    proposal,
)?;
```

### Processing Emission

```rust
use dytallix_contracts::tokenomics::EmissionController;

// Process emission for current block
let mut emission_controller = EmissionController::new(owner);
let emitted = emission_controller.process_emission(current_block, network_utilization)?;

println!("Emitted {} DRT for block {}", emitted, current_block);
```

### Claiming Rewards

```rust
// Validator claims rewards
emission_controller.claim_validator_rewards(validator_address, 1000)?;

// Staker claims rewards
emission_controller.claim_staker_rewards(staker_address, 500)?;
```

## Frontend Integration

### TypeScript Types

```typescript
interface TokenomicsState {
  dgtTotalSupply: bigint;
  drtTotalSupply: bigint;
  drtTotalBurned: bigint;
  currentEmissionRate: number;
  validatorPool: bigint;
  stakerPool: bigint;
  emissionParams: EmissionParameters;
}

interface EmissionParameters {
  baseEmissionRate: number;
  maxEmissionRate: number;
  minEmissionRate: number;
  adjustmentFactor: number;
}

interface TokenomicsProposal {
  type: 'ChangeEmissionRate' | 'UpdateEmissionParameters' | 'MintDGT' | 'BurnDRT';
  data: any;
}
```

### Dashboard Components

1. **Token Balances**: Display DGT and DRT balances for connected wallet
2. **Emission Status**: Show current emission rate and network utilization
3. **Governance Proposals**: List active tokenomics proposals with voting interface
4. **Reward Claiming**: Interface for validators and stakers to claim rewards
5. **Burn Interface**: Allow DRT holders to burn tokens

## Wallet CLI Integration

### Token Commands

```bash
# Check balances
dytallix-wallet balance --token dgt
dytallix-wallet balance --token drt

# Transfer tokens
dytallix-wallet transfer --token dgt --to dyt1recipient --amount 100
dytallix-wallet transfer --token drt --to dyt1recipient --amount 500

# Burn DRT tokens
dytallix-wallet burn --token drt --amount 250

# Claim rewards
dytallix-wallet claim-validator-rewards --amount 1000
dytallix-wallet claim-staker-rewards --amount 500

# Governance operations
dytallix-wallet vote --proposal 123 --vote yes
dytallix-wallet create-proposal --type emission-rate --new-rate 1500 --description "Increase emission"
```

## Security Considerations

### Access Control

1. **DGT Token**: Only owner can mint initial supply (one-time only)
2. **DRT Token**: Only emission controller can mint new tokens
3. **Emission Controller**: Only governance contract can approve proposals
4. **Governance**: Voting power based on DGT token holdings

### Validation

1. **Emission Bounds**: Rates are constrained within min/max parameters
2. **Burn Validation**: Users can only burn tokens they own
3. **Proposal Validation**: All proposals are validated before execution
4. **Double-voting Prevention**: Users cannot vote multiple times on same proposal

### Audit Considerations

1. **Mathematical Overflow**: All arithmetic operations use safe math
2. **Reentrancy Protection**: State changes before external calls
3. **Input Validation**: All inputs are validated for correctness
4. **Access Control**: Proper permission checks on all sensitive operations

## Testing

### Contract Tests

The tokenomics system includes comprehensive test coverage:

- **DGT Token Tests**: 6 test cases covering creation, minting, transfers, allowances
- **DRT Token Tests**: 9 test cases covering emission, burning, authorization
- **Emission Controller Tests**: 7 test cases covering governance integration, adaptive rates
- **Integration Tests**: 4 test cases for complete governance scenarios

### Running Tests

```bash
# Run all tokenomics tests
cd smart-contracts && cargo test tokenomics::

# Run governance integration tests
cd governance && cargo test

# Run example scenario tests
cd governance && cargo test --example tokenomics_governance_scenario
```

## Monitoring and Analytics

### Key Metrics

1. **Token Metrics**
   - DGT total supply and distribution
   - DRT total supply, burned amount, and emission rate
   - Token transfer volumes and frequency

2. **Emission Metrics**
   - Daily/weekly emission amounts
   - Network utilization vs emission rate correlation
   - Reward pool balances and claim rates

3. **Governance Metrics**
   - Proposal creation and success rates
   - Voting participation rates
   - Tokenomics proposal impact analysis

4. **Economic Metrics**
   - Token velocity and circulation
   - Burn rate and deflationary pressure
   - Staking participation and reward distribution

## Future Enhancements

### Planned Features

1. **Advanced Emission Models**
   - Time-based emission curves
   - Multi-factor adaptive algorithms
   - Economic activity-based adjustments

2. **Enhanced Governance**
   - Delegation and liquid democracy
   - Quadratic voting mechanisms
   - Time-locked voting periods

3. **Cross-chain Integration**
   - Token bridging capabilities
   - Multi-chain governance coordination
   - Cross-chain emission distribution

4. **Advanced Analytics**
   - Real-time economic modeling
   - Predictive emission forecasting
   - Governance impact simulation

### Research Areas

1. **Economic Optimization**
   - Game-theoretic analysis of incentive structures
   - Long-term sustainability modeling
   - Network effect amplification strategies

2. **Governance Evolution**
   - AI-assisted proposal analysis
   - Automated parameter optimization
   - Dynamic governance mechanism adaptation

## Conclusion

The Dytallix tokenomics system provides a robust, flexible foundation for network incentives and governance. The dual-token model balances governance participation (DGT) with network rewards (DRT), while the adaptive emission system ensures optimal incentive alignment as the network evolves.

The integration with the DAO governance system ensures that the tokenomics parameters can evolve with the community's needs, providing long-term sustainability and adaptability for the Dytallix ecosystem.