# Dytallix Emission System

## Overview

The Dytallix emission system implements deterministic DRT (Dytallix Reward Token) emission with automatic staking reward accrual. The system is designed to be transparent, auditable, and mathematically verifiable.

## Architecture

### Components

1. **EmissionEngine**: Manages per-block emission calculation and event persistence
2. **StakingModule**: Handles staking reward distribution and accumulation
3. **EmissionEvent**: Auditable per-block emission record
4. **API Endpoints**: RESTful interface for emission data access
5. **Validation Script**: Automated correctness verification

### Data Flow

```
Genesis Config → EmissionEngine → Per-Block Calculation → EmissionEvent Storage
                       ↓
StakingModule ← Staking Rewards (25% of emission)
                       ↓
Reward Index Update → Delegator Rewards
```

## Genesis Configuration

### Parameters

```rust
pub struct EmissionConfig {
    pub annual_inflation_rate: u16,  // Basis points (500 = 5%)
    pub initial_supply: u128,        // Initial DRT supply (0 for bootstrap)
    pub emission_breakdown: EmissionBreakdown,
}

pub struct EmissionBreakdown {
    pub block_rewards: u8,           // 60%
    pub staking_rewards: u8,         // 25%
    pub ai_module_incentives: u8,    // 10%
    pub bridge_operations: u8,       // 5%
}
```

### Default Configuration

- **Annual Inflation Rate**: 5% (500 basis points)
- **Initial Supply**: 0 DRT (bootstrap mode)
- **Block Time**: ~6 seconds (5,256,000 blocks/year)

## Emission Calculation

### Formula

The per-block emission is calculated as:

```
per_block_total = (annual_inflation_rate / 100) * circulating_supply / blocks_per_year
```

Where:
- `annual_inflation_rate`: Genesis parameter in basis points
- `circulating_supply`: Current total DRT in circulation
- `blocks_per_year`: 5,256,000 (assuming 6-second blocks)

### Bootstrap Mode

When `circulating_supply = 0`, the system uses a fixed bootstrap emission:
- **Bootstrap Amount**: 1 DRT per block (1,000,000 uDRT)

### Distribution

Each block's emission is distributed according to the breakdown percentages:

1. **Block Rewards**: 60% - Validator block production rewards
2. **Staking Rewards**: 25% - Delegator and validator staking rewards  
3. **AI Module Incentives**: 10% - AI service provider rewards
4. **Bridge Operations**: 5% - Cross-chain bridge operation rewards

### Remainder Handling

To ensure no emission is lost due to integer division:
- Calculate each pool amount using integer division
- Allocate any remainder to `bridge_operations` pool
- Verify: `sum(pools) = total_emission` (exact equality)

## Staking Reward System

### Reward Index Mechanism

The staking system uses a global reward index to track proportional rewards:

```rust
reward_index += (staking_rewards * REWARD_SCALE) / total_stake
```

Where:
- `staking_rewards`: 25% of block emission
- `REWARD_SCALE`: 1e12 (for precision)
- `total_stake`: Total DGT staked across all validators

### Zero-Stake Carry Logic

When `total_stake = 0`:
- Staking rewards accumulate in `pending_staking_emission`
- When stake first becomes > 0, all pending rewards are applied
- Ensures no rewards are lost during network bootstrap

### Reward Calculation

For a delegator with stake `S`:
```
claimable_rewards = (S * reward_index) / REWARD_SCALE
```

## EmissionEvent Structure

Each block produces an auditable emission event:

```rust
pub struct EmissionEvent {
    pub height: u64,                    // Block height
    pub timestamp: u64,                 // Block timestamp
    pub total_emitted: u128,            // Total DRT emitted this block
    pub pools: HashMap<String, u128>,   // Distribution across pools
    pub reward_index_after: Option<u128>, // Staking reward index after application
    pub circulating_supply: u128,       // Total DRT supply after emission
}
```

### Storage

Events are stored with key pattern: `emission:event:{height}`

## API Endpoints

### GET /api/rewards

Returns recent emission events with pagination.

**Query Parameters:**
- `limit`: Number of events (default: 50, max: 500)
- `start_height`: Starting block height (default: current height)

**Response:**
```json
{
  "events": [
    {
      "height": 12345,
      "timestamp": 1672531200,
      "total_emitted": "1000000",
      "pools": {
        "block_rewards": "600000",
        "staking_rewards": "250000", 
        "ai_module_incentives": "100000",
        "bridge_operations": "50000"
      },
      "reward_index_after": "123456789012",
      "circulating_supply": "100000000000"
    }
  ],
  "pagination": {
    "limit": 50,
    "start_height": 12345,
    "total_available": 12345
  },
  "staking_stats": {
    "total_stake": "50000000000000",
    "reward_index": "123456789012", 
    "pending_emission": "0"
  }
}
```

### GET /api/rewards/:height

Returns emission event for a specific block height.

**Response:** Single emission event object (same format as above)

### GET /api/stats

Enhanced stats endpoint with emission data.

**Response:**
```json
{
  "height": 12345,
  "mempool_size": 5,
  "rolling_tps": 12.5,
  "chain_id": "dytallix-mainnet-1",
  "emission_pools": {
    "block_rewards": "1200000000",
    "staking_rewards": "500000000",
    "ai_module_incentives": "200000000", 
    "bridge_operations": "100000000"
  },
  "latest_emission": {
    "height": 12345,
    "total_emitted": "1000000",
    "circulating_supply": "100000000000"
  },
  "staking": {
    "total_stake": "50000000000000",
    "reward_index": "123456789012",
    "pending_emission": "0"
  }
}
```

## Validation

### Automated Validation Script

The `scripts/validate_emissions.sh` script provides automated validation:

```bash
./scripts/validate_emissions.sh [OPTIONS]

Options:
  --api-base URL     API base URL (default: http://127.0.0.1:3030)
  --tolerance NUM    Validation tolerance (default: 1e-9)
  --verbose          Enable verbose output
```

### Validation Checks

1. **Distribution Consistency**: `sum(pools) = total_emission` for each block
2. **Cumulative Totals**: Pool totals vs circulating supply consistency  
3. **Staking Rewards**: Reward index and pending emission validation
4. **Precision**: Floating-point vs integer calculation differences

### Acceptance Criteria

- All distribution sums must be exact (difference = 0)
- Precision errors must be ≤ 1e-9 tolerance
- No emission loss (all amounts accounted for)
- Reward index calculation errors ≤ 1 unit per block

## Implementation Details

### Persistence

- **EmissionEvents**: `emission:event:{height}` → bincode-serialized EmissionEvent
- **Pool Amounts**: `emission:pool:{pool_name}` → u128 cumulative amount
- **Last Height**: `emission:last_height` → u64 last processed block
- **Circulating Supply**: `emission:circulating_supply` → u128 total supply
- **Staking State**: `staking:*` → various staking-related values

### Thread Safety

- EmissionEngine wrapped in `Arc<Mutex<>>` for concurrent access
- StakingModule wrapped in `Arc<Mutex<>>` for concurrent access
- Storage operations are atomic at the RocksDB level

### Error Handling

- Integer overflow protection using `saturating_add`
- Storage failures are logged but don't halt block production
- Invalid API requests return appropriate HTTP error codes

### Performance Considerations

- Emission calculation is O(1) per block
- Event storage is constant size per block
- API queries use height-based indexing for efficiency
- Validation script processes events in batches

## Testing

### Unit Tests

Located in `tests/emission_schedule_tests.rs`:
- Distribution sum validation
- Remainder allocation stability
- Zero-stake carry logic
- Reward index precision
- Event persistence and idempotency

### Integration Tests

Located in `tests/integration_emission_staking.rs`:
- End-to-end emission → staking flow
- Multiple stake change scenarios
- Precision validation across realistic scales
- Event consistency across many blocks

### Running Tests

```bash
# Unit tests
cargo test emission_schedule_tests

# Integration tests  
cargo test integration_emission_staking

# All emission-related tests
cargo test emission
```

## Monitoring and Observability

### Key Metrics

- Emission rate (DRT/block)
- Circulating supply growth
- Reward index growth rate
- Pool distribution ratios
- Pending emission accumulation

### Alerts

- Distribution sum mismatches
- Reward index calculation errors
- Excessive pending emission accumulation
- API endpoint failures

## Security Considerations

### Determinism

- All calculations use integer arithmetic
- No floating-point operations in critical paths
- Consistent ordering of operations

### Auditability

- Complete per-block emission history
- Immutable event records
- Public API for verification
- Automated validation tools

### Access Control

- Emission engine is read-only via API
- Only block production can trigger emission
- Staking rewards are automatically applied

## Troubleshooting

### Common Issues

1. **Distribution Sum Mismatch**
   - Check integer division remainder handling
   - Verify all pools are included in sum

2. **Reward Index Not Updating**
   - Verify total_stake > 0
   - Check staking rewards > 0
   - Confirm apply_external_emission is called

3. **Pending Emission Accumulation**
   - Normal during bootstrap (total_stake = 0)
   - Should clear when first validator registers

4. **API Precision Issues**
   - All large numbers returned as strings
   - Client should parse as big integers

### Debugging Tools

```bash
# Check emission events
curl "http://localhost:3030/api/rewards?limit=10"

# Validate recent blocks
./scripts/validate_emissions.sh --verbose

# Check staking state
curl "http://localhost:3030/api/stats" | jq '.staking'
```

## Migration and Upgrades

### Backward Compatibility

- Existing emission pools preserved during upgrade
- API endpoints maintain consistent schemas
- Storage format is versioned for future migrations

### Genesis Parameter Updates

- Emission breakdown can be updated via governance
- Annual inflation rate adjustable through proposals
- Changes take effect at specified block heights

### Chain Restarts

- Emission state is fully persisted
- No re-emission on restart (idempotent)
- Validation script can verify consistency post-restart