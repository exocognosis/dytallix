# Staking Demo Documentation

This document describes how to enable and use the staking demo feature in Dytallix.

## Overview

The staking demo provides a complete delegate → accrue → claim workflow with:
- REST API endpoints for staking operations
- CLI commands for easy interaction
- Feature flag control for enabling/disabling
- Demo-friendly parameters for testing

## Quick Start

### 1. Enable Staking Feature

```bash
export DYT_ENABLE_STAKING=true
```

### 2. Start Node

```bash
cd dytallix-lean-launch/node
cargo run --bin dytallix-lean-node
```

### 3. Use CLI Commands

```bash
cd cli

# Check staking balance (staked, liquid, rewards)
cargo run --bin dcli -- stake balance --delegator dyt1alice123

# Delegate tokens to a validator
cargo run --bin dcli -- stake delegate \
    --from dyt1alice123 \
    --validator dyt1validator456 \
    --amount 1000000000000

# Claim all rewards
cargo run --bin dcli -- stake claim --delegator dyt1alice123 --all

# Check accrued rewards
cargo run --bin dcli -- stake show-rewards --address dyt1alice123
```

## API Endpoints

All staking endpoints are always exposed but return 501 Not Implemented when `DYT_ENABLE_STAKING` is not set.

### POST /api/staking/delegate
Delegate tokens to a validator.

**Request:**
```json
{
  "delegator_addr": "dyt1alice123",
  "validator_addr": "dyt1validator456", 
  "amount_udgt": "1000000000000"
}
```

**Response:**
```json
{
  "status": "success",
  "delegator_addr": "dyt1alice123",
  "validator_addr": "dyt1validator456",
  "amount_udgt": "1000000000000"
}
```

### POST /api/staking/claim
Claim accumulated staking rewards.

**Request:**
```json
{
  "address": "dyt1alice123"
}
```

**Response:**
```json
{
  "address": "dyt1alice123",
  "claimed": "150000",
  "new_balance": "150000",
  "reward_index": "2500000"
}
```

### GET /api/staking/balance/:delegator
Get complete staking balance information.

**Response:**
```json
{
  "delegator": "dyt1alice123",
  "staked": "1000000000000",
  "liquid": "5000000000000", 
  "rewards": "150000"
}
```

### GET /api/staking/accrued/:address
Get accrued but unclaimed rewards.

**Response:**
```json
{
  "address": "dyt1alice123",
  "accrued_rewards": "150000",
  "reward_index": "2500000"
}
```

## Demo Parameters

The system uses demo-friendly parameters by default:

- **Min Self Stake**: 1M DGT (1,000,000,000,000 uDGT)
- **Emission per Block**: 1 DRT (1,000,000 uDRT)
- **Block Interval**: 2 seconds (configurable via `DYT_BLOCK_INTERVAL_MS`)

## Environment Variables

- `DYT_ENABLE_STAKING`: Set to "true" or "1" to enable staking transactions and reward accrual
- `DYT_DATA_DIR`: Database directory (default: "./data")
- `DYT_BLOCK_INTERVAL_MS`: Block production interval in milliseconds (default: 2000)

## Testing

### Manual Testing

1. Run the demo script:
```bash
./staking_demo.sh
```

2. Or test API endpoints directly:
```bash
# Fund an account
curl -X POST http://localhost:3030/dev/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"dyt1alice123","udgt":100000000000000}'

# Check balance
curl http://localhost:3030/api/staking/balance/dyt1alice123

# Delegate (requires validator to exist)
curl -X POST http://localhost:3030/api/staking/delegate \
  -H "Content-Type: application/json" \
  -d '{"delegator_addr":"dyt1alice123","validator_addr":"dyt1validator456","amount_udgt":"1000000000000"}'

# Claim rewards
curl -X POST http://localhost:3030/api/staking/claim \
  -H "Content-Type: application/json" \
  -d '{"address":"dyt1alice123"}'
```

### Integration Testing

Run the integration test:
```bash
# Compile and run test
rustc /tmp/staking_demo_test.rs --extern reqwest --extern serde_json --extern tokio
./staking_demo_test
```

## Explorer Parity

The staking endpoints provide data compatible with blockchain explorers:

- Balance information includes both staked and liquid amounts
- Reward data shows both accrued and total claimed amounts
- Transaction endpoints return structured responses with transaction hashes
- All amounts are returned as strings to handle large numbers safely

## Production Considerations

- In production, set appropriate minimum stake amounts via environment variables
- Configure proper block intervals for network requirements
- Ensure validator registration before allowing delegations
- Monitor reward accrual and emission parameters
- Set up proper authentication for sensitive endpoints

## Troubleshooting

**Staking endpoints return 501**: Ensure `DYT_ENABLE_STAKING=true` is set

**Delegation fails**: Verify the validator exists and is registered

**No rewards accruing**: Check that blocks are being produced and emission is configured

**CLI connection fails**: Verify node is running on http://localhost:3030