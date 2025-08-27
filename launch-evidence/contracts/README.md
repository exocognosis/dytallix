# Smart Contract Evidence Collection

This directory contains scripts and a sample CosmWasm contract for collecting smart contract deployment and execution evidence.

## Overview

The contract evidence collection demonstrates:

1. **Contract Compilation**: Deterministic WASM binary generation
2. **Contract Deployment**: Code storage and instantiation on-chain
3. **Contract Execution**: Function invocation and state modification
4. **Gas Analysis**: Gas consumption reporting for deployment and execution

## Files

- `README.md` - This documentation
- `build.sh` - Contract compilation script with rust-optimizer support
- `deploy_invoke.sh` - Deployment and invocation automation script
- `counter/` - Sample CosmWasm counter contract
  - `Cargo.toml` - Contract manifest
  - `src/lib.rs` - Contract implementation
  - `schema/` - Contract schema directory (populated after build)
- `.keep` - Directory tracking placeholder

## Generated Artifacts

After successful execution:

- `counter_contract.wasm` - Compiled contract binary
- `deploy_tx.json` - Contract deployment transaction details
- `invoke_tx.json` - Contract execution transaction records  
- `gas_report.json` - Gas consumption analysis for all operations

## Prerequisites

### Rust and WASM Target

```bash
# Install Rust if not available
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-strip for optimization
cargo install wasm-strip
```

### Docker (Optional for Reproducible Builds)

```bash
# Install Docker for rust-optimizer (recommended)
docker --version

# Pull rust-optimizer image
docker pull cosmwasm/rust-optimizer:0.12.13
```

## Configuration

### Environment Variables

```bash
# Chain binary and endpoints
export DY_BINARY="dytallixd"          # Chain binary name
export DY_LCD="http://localhost:1317" # LCD/REST endpoint  
export DY_RPC="http://localhost:26657" # RPC endpoint

# Contract deployment configuration
export DY_DENOM="uDRT"                # Fee denomination
export CONTRACT_DEPLOYER="deployer"   # Key name for contract deployment
export INITIAL_COUNT=0                # Initial counter value

# Build configuration
export USE_RUST_OPTIMIZER=true        # Use Docker rust-optimizer
export WASM_OUTPUT_DIR="."           # Output directory for WASM files
```

## Usage

### Quick Start

```bash
cd contracts/

# Build contract
./build.sh

# Deploy and test contract
./deploy_invoke.sh
```

### Advanced Usage

```bash
# Build without Docker optimization
USE_RUST_OPTIMIZER=false ./build.sh

# Deploy with custom initial value
INITIAL_COUNT=42 ./deploy_invoke.sh

# Use different deployer key
CONTRACT_DEPLOYER="mykey" ./deploy_invoke.sh
```

## Contract Details

### Counter Contract

The included counter contract is a minimal CosmWasm smart contract that demonstrates:

- **State Management**: Persistent counter value storage
- **Execute Messages**: Increment and decrement operations
- **Query Messages**: Read current counter value
- **Error Handling**: Input validation and error responses

#### Contract Interface

**Instantiate Message:**
```json
{
  "count": 0
}
```

**Execute Messages:**
```json
// Increment counter
{
  "increment": {}
}

// Decrement counter  
{
  "decrement": {}
}

// Reset to specific value
{
  "reset": {
    "count": 42
  }
}
```

**Query Messages:**
```json
// Get current count
{
  "get_count": {}
}
```

## Script Workflows

### Build Script (`build.sh`)

1. **Environment Validation**
   - Check Rust toolchain and WASM target
   - Verify Docker availability for rust-optimizer
   - Validate contract source code

2. **Contract Compilation**
   - Option 1: Docker rust-optimizer (recommended)
     - Produces deterministic, optimized WASM
     - Generates reproducible builds
     - Automatic size optimization
   - Option 2: Standard cargo compilation
     - Fast local builds for testing
     - Manual wasm-strip optimization

3. **Post-Build Processing**
   - Copy WASM binary to output directory
   - Generate schema files
   - Validate WASM format and size

### Deploy & Invoke Script (`deploy_invoke.sh`)

1. **Pre-Deployment**
   - Validate chain connectivity
   - Check deployer key availability
   - Verify WASM binary exists

2. **Contract Storage**
   - Upload WASM code to chain
   - Capture code_id and transaction hash
   - Record deployment transaction details

3. **Contract Instantiation**
   - Instantiate contract with initial parameters
   - Capture contract address
   - Record instantiation transaction

4. **Contract Execution**
   - Execute increment operation
   - Query contract state before/after
   - Record execution transaction details

5. **Gas Analysis**
   - Parse gas consumption from all transactions
   - Generate comprehensive gas report
   - Compare against expected benchmarks

## Gas Reporting

The gas report includes detailed analysis of:

- **Storage Gas**: Code upload gas consumption
- **Instantiation Gas**: Contract instantiation costs
- **Execution Gas**: Message execution costs per operation
- **Query Gas**: State query costs (typically minimal)

Example gas report structure:
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "contract_info": {
    "code_id": 1,
    "contract_address": "dy1contract...",
    "wasm_size_bytes": 150000
  },
  "gas_usage": {
    "storage": {
      "gas_used": 1500000,
      "gas_wanted": 2000000,
      "cost_uDRT": "1500"
    },
    "instantiation": {
      "gas_used": 150000,
      "gas_wanted": 200000,
      "cost_uDRT": "150"
    },
    "execution": {
      "increment": {
        "gas_used": 120000,
        "gas_wanted": 150000,
        "cost_uDRT": "120"
      }
    }
  }
}
```

## Troubleshooting

### Common Build Issues

1. **Missing WASM Target**
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

2. **Docker Not Available**
   - Set `USE_RUST_OPTIMIZER=false`
   - Ensure `wasm-strip` is installed

3. **Large WASM Size**
   - Use rust-optimizer for better compression
   - Review dependencies for unnecessary bloat
   - Enable LTO and optimization flags

### Common Deployment Issues

1. **Insufficient Funds**
   - Ensure deployer key has adequate balance
   - Check fee estimation and gas limits

2. **WASM Validation Errors**
   - Verify WASM binary format
   - Check for unsupported WASM features
   - Validate contract exports

3. **Execution Failures**
   - Check contract instantiation success
   - Verify message format and parameters
   - Review contract error logs

### Manual Verification

```bash
# Check code upload
$DY_BINARY query wasm code 1 --node $DY_RPC

# Check contract info  
$DY_BINARY query wasm contract dy1contract... --node $DY_RPC

# Query contract state
$DY_BINARY query wasm contract-state smart dy1contract... '{"get_count":{}}' --node $DY_RPC

# Check transaction details
$DY_BINARY query tx $TX_HASH --node $DY_RPC
```

## Security Considerations

- Contract code should be reviewed for vulnerabilities
- Use official rust-optimizer for production builds
- Validate all user inputs in contract logic  
- Test thoroughly on testnet before mainnet deployment
- Monitor gas consumption for DoS attack vectors

## Performance Benchmarks

Target performance metrics for the counter contract:

- **WASM Size**: < 200KB optimized
- **Storage Gas**: < 2M gas units
- **Instantiation Gas**: < 200K gas units  
- **Execution Gas**: < 150K gas units per operation

---

**Note**: This contract is designed for evidence collection and testing. Production contracts should include additional security audits and comprehensive testing.