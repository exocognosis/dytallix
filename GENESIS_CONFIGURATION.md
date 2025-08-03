# Dytallix Mainnet Genesis Block Configuration

This document describes the genesis block configuration for the Dytallix Layer 1 blockchain mainnet launch.

## Overview

The Dytallix blockchain implements a dual-token system with post-quantum cryptography and AI-enhanced consensus. The genesis configuration establishes the initial state for mainnet launch.

## Network Parameters

- **Network Name**: `dytallix-mainnet`
- **Chain ID**: `dytallix-mainnet-1`
- **Genesis Time**: `2025-08-03T19:00:26.000000000Z`
- **Block Time**: ~12 seconds
- **Consensus**: Proof of Stake with AI-enhanced validation

## Token Economics

### DGT (Dytallix Governance Token)
- **Type**: Fixed supply governance token
- **Total Supply**: 1,000,000,000 DGT (1 billion)
- **Decimals**: 18
- **Purpose**: Governance voting, validator staking, protocol fees

#### Initial Allocation Breakdown

| Recipient | Amount | Percentage | Vesting Schedule |
|-----------|--------|------------|------------------|
| Community Treasury | 400M DGT | 40% | Unlocked |
| Staking Rewards | 250M DGT | 25% | 4-year linear vesting |
| Dev Team | 150M DGT | 15% | 1-year cliff + 3-year linear vesting |
| Validators | 100M DGT | 10% | 6-month cliff + 2-year linear vesting |
| Ecosystem Fund | 100M DGT | 10% | 5-year linear vesting |

### DRT (Dytallix Reward Token)
- **Type**: Inflationary reward token
- **Initial Supply**: 0 DRT
- **Annual Inflation**: ~5%
- **Purpose**: Block rewards, staking incentives, AI module rewards

#### Emission Distribution

| Category | Percentage | Purpose |
|----------|------------|---------|
| Block Rewards | 60% | Validator rewards for block production |
| Staking Rewards | 25% | Delegator and validator staking rewards |
| AI Module Incentives | 10% | Rewards for AI service providers |
| Bridge Operations | 5% | Cross-chain bridge operator rewards |

## Burn Mechanisms

To maintain token economic health, various fees are burned:

| Fee Type | Burn Rate | Remaining |
|----------|-----------|-----------|
| Transaction Fees | 100% | 0% (all burned) |
| AI Service Fees | 50% | 50% to service providers |
| Bridge Fees | 75% | 25% to bridge operators |

## Governance Parameters

- **Proposal Threshold**: 1,000,000 DGT (0.1% of supply)
- **Voting Period**: 50,400 blocks (~7 days at 12s blocks)
- **Quorum Requirement**: 33.33% of circulating supply
- **Pass Threshold**: 50% majority of votes cast

## Staking and Validation

### Validator Requirements
- **Minimum Stake**: 32,000,000 DGT (3.2% of supply)
- **Maximum Validators**: 100
- **Commission Range**: 0-100%
- **Post-Quantum Keys**: Dilithium5 signature algorithm

### Slashing Conditions
- **Double Signing**: 5% slash rate
- **Downtime**: 1% slash rate
- **Offline Threshold**: 300 blocks (~1 hour)

## Vesting Implementation

The genesis configuration implements linear vesting with optional cliff periods:

```rust
pub struct VestingSchedule {
    pub total_amount: Amount,
    pub cliff_duration: u64,      // Seconds until vesting starts
    pub vesting_duration: u64,    // Total vesting period in seconds
    pub start_time: Timestamp,    // Genesis timestamp
}
```

### Vesting Examples

1. **Community Treasury**: Immediate unlock
   - Cliff: 0 years
   - Vesting: 0 years (fully liquid)

2. **Dev Team**: Conservative vesting
   - Cliff: 1 year (no tokens available)
   - Vesting: 3 years after cliff (linear release)

3. **Staking Rewards**: Gradual release
   - Cliff: 0 years
   - Vesting: 4 years (linear from genesis)

## Initial Validators

The genesis block includes 3 placeholder validators:

```json
{
  "address": "dyt1validator1000000000000000000000000000",
  "stake": 32000000000000000000000000,
  "public_key": [...],
  "signature_algorithm": "Dilithium5",
  "active": true,
  "commission": 500
}
```

> **Note**: Placeholder keys will be replaced with real validator keys before mainnet launch.

## File Structure

- `genesisBlock.json` - Complete genesis configuration
- `blockchain-core/src/genesis.rs` - Genesis types and validation logic
- `blockchain-core/src/genesis_integration.rs` - Consensus engine integration

## Validation

The genesis configuration includes comprehensive validation:

- ✅ Total DGT supply equals exactly 1 billion tokens
- ✅ Emission breakdown percentages sum to 100%
- ✅ Burn rates do not exceed 100%
- ✅ Governance thresholds are within valid ranges
- ✅ Validator stakes meet minimum requirements
- ✅ Vesting schedules are mathematically sound

## Security Considerations

1. **Post-Quantum Cryptography**: All signatures use Dilithium5
2. **AI Integration**: Oracle responses are cryptographically signed
3. **Vesting Enforcement**: Smart contract logic prevents early token access
4. **Slashing Protection**: Multiple layers of validation prevent malicious behavior

## Future Upgrades

The genesis configuration is designed to support future protocol upgrades through governance:

- Parameter adjustments via governance proposals
- New validator admission through staking
- Emission rate modifications (within bounds)
- Additional burn mechanisms as needed

## Implementation Status

- [x] Genesis configuration structure
- [x] Token allocation and vesting logic
- [x] Validator set initialization
- [x] Governance parameter setup
- [x] Burn rule implementation
- [x] JSON configuration export
- [x] Consensus engine integration
- [ ] Full test suite (in progress)
- [ ] Mainnet validator key generation
- [ ] Final security audit

---

*This configuration represents the initial state for Dytallix mainnet. All parameters are subject to governance once the network is live.*