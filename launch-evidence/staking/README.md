# Staking & Rewards Evidence Collection

This directory contains a Rust emission script and configuration for collecting staking system evidence including balance snapshots, reward distribution, and claim transaction verification.

## Overview

The staking evidence collection demonstrates:

1. **Pre-State Capture**: Balance snapshots of delegators before reward distribution
2. **Emission Mechanics**: Automated reward distribution across configured blocks
3. **Post-State Verification**: Balance snapshots after reward accrual
4. **Claim Processing**: Automated reward claiming and transaction recording

## Files

- `README.md` - This documentation
- `Cargo.toml` - Rust project manifest for emission script
- `src/main.rs` - Main emission script implementation
- `sample_config.example.toml` - Example configuration with delegator addresses
- `.keep` - Directory tracking placeholder

## Generated Artifacts

After successful execution:

- `before_balances.json` - Delegator balances before reward distribution
- `after_balances.json` - Delegator balances after reward accrual
- `claim_tx.json` - Reward claim transaction details and confirmations

## Configuration

### Environment Variables

```bash
# Chain binary and endpoints
export DY_BINARY="dytallixd"          # Chain binary name
export DY_LCD="http://localhost:1317" # LCD/REST endpoint
export DY_RPC="http://localhost:26657" # RPC endpoint
export DY_GRPC="localhost:9090"       # gRPC endpoint

# Base denomination
export DY_DENOM="uDRT"                # Staking denomination

# Emission configuration
export EMISSION_WAIT_BLOCKS=5         # Blocks to wait for reward accrual
export MIN_REWARD_DELTA=1000          # Minimum expected reward increase (uDRT)
```

### Configuration File

Copy and customize `sample_config.example.toml`:

```toml
# Emission script configuration
[emission]
wait_blocks = 5
min_reward_delta = 1000
enable_auto_claim = true

# Chain configuration
[chain]
binary = "dytallixd"
lcd_endpoint = "http://localhost:1317"
rpc_endpoint = "http://localhost:26657"
grpc_endpoint = "localhost:9090"
denom = "uDRT"

# Delegator addresses to monitor
[[delegators]]
address = "dy1delegator1address..."
label = "Delegator 1"

[[delegators]]
address = "dy1delegator2address..."
label = "Delegator 2"

[[delegators]]
address = "dy1delegator3address..."
label = "Delegator 3"
```

## Usage

### Prerequisites

```bash
# Install Rust if not available
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install required dependencies
cargo build
```

### Basic Execution

```bash
cd staking/
cargo run
```

### Custom Configuration

```bash
# Use custom config file
cargo run -- --config my_config.toml

# Override specific parameters
EMISSION_WAIT_BLOCKS=10 cargo run

# Verbose logging
RUST_LOG=debug cargo run
```

## Script Workflow

The emission script performs the following steps:

1. **Initialization**
   - Load configuration from file or environment
   - Validate chain connectivity and endpoints
   - Verify delegator addresses exist

2. **Pre-State Capture**
   - Query current balances for all configured delegators
   - Query delegation amounts and validator information
   - Record current block height and timestamp
   - Save `before_balances.json`

3. **Emission Wait Period**
   - Monitor block height progression
   - Wait for configured number of blocks
   - Track reward index changes on validators

4. **Post-State Verification**
   - Query updated balances for all delegators
   - Calculate pending rewards for each delegation
   - Record new block height and timestamp
   - Save `after_balances.json`

5. **Reward Claiming** (Optional)
   - Execute reward withdrawal commands for each delegator
   - Capture transaction hashes and confirmation details
   - Save `claim_tx.json` with all claim transactions

6. **Validation**
   - Compare before/after balances
   - Verify minimum reward delta was achieved
   - Report success/failure with detailed metrics

## Implementation Details

### Rust Dependencies

The emission script uses the following key dependencies:

- `tokio` - Async runtime for concurrent operations
- `reqwest` - HTTP client for LCD/REST API calls
- `tonic` - gRPC client for native chain queries
- `serde` - JSON serialization/deserialization
- `clap` - Command-line argument parsing
- `tracing` - Structured logging and instrumentation

### Query Methods

The script supports multiple query methods for maximum compatibility:

1. **gRPC Queries** (Preferred)
   - Native protobuf messages
   - Better performance and type safety
   - Direct access to all chain modules

2. **LCD/REST Queries** (Fallback)
   - JSON-based HTTP endpoints
   - More compatible across different setups
   - Easier debugging and manual verification

3. **CLI Fallback**
   - Uses chain binary directly via subprocess
   - Guaranteed compatibility with any chain configuration
   - Used for transaction submission

### Error Handling

- Graceful degradation between query methods
- Comprehensive retry logic for network operations
- Detailed error reporting with context
- Clean shutdown on configuration errors

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Verify endpoints are accessible and chain is running
   - Check firewall settings for gRPC port (9090)
   - Test connectivity with manual CLI queries

2. **No Rewards Generated**
   - Ensure validators are actively producing blocks
   - Check delegation amounts meet minimum requirements
   - Verify reward distribution is enabled in chain config

3. **Build Failures**
   - Update Rust toolchain: `rustup update`
   - Install required system dependencies
   - Check network connectivity for crate downloads

4. **Permission Errors**
   - Ensure delegator keys exist in keyring for claiming
   - Verify sufficient balance for transaction fees
   - Check key permissions and unlock status

### Manual Verification

```bash
# Check delegator balance
$DY_BINARY query bank balance dy1delegator... uDRT --node $DY_RPC

# Check delegation info
$DY_BINARY query staking delegation dy1delegator... dy1validator... --node $DY_RPC

# Check pending rewards
$DY_BINARY query distribution rewards dy1delegator... --node $DY_RPC

# Manual reward claim
$DY_BINARY tx distribution withdraw-all-rewards --from delegator_key --node $DY_RPC
```

## Performance Considerations

- Concurrent queries for multiple delegators
- Efficient gRPC connection pooling
- Batched balance queries where supported
- Minimal polling interval to reduce chain load

## Security Notes

- Delegator private keys are only used for optional reward claiming
- Read-only operations use public query endpoints
- Configuration files should not contain sensitive information
- Transaction signing requires explicit user consent

---

**Note**: This script is designed for testnet evidence collection. Production usage should include additional monitoring and alerting mechanisms.