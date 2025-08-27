# Launch Evidence Pack

This directory contains verifiable, reproducible launch-evidence artifacts for core chain functionality required prior to public testnet launch.

## Overview

The launch evidence pack provides automated scripts and templates to generate comprehensive evidence artifacts demonstrating:

- **Governance**: Parameter change proposals, voting, and execution
- **Staking & Rewards**: Emission mechanics, balance tracking, and reward claiming
- **WASM Contracts**: Smart contract deployment, instantiation, and execution
- **Wallet/CLI**: PQC key generation, faucet integration, and transaction broadcasting

## Quick Start

### Prerequisites

- Dytallix chain binary (`dytallixd`) running locally or accessible via RPC
- Rust toolchain for emission scripts and contract compilation
- Basic CLI tools: `curl`, `jq`, `bash`

### Environment Configuration

```bash
# Chain configuration (defaults shown)
export DY_BINARY="dytallixd"
export DY_LCD="http://localhost:1317"
export DY_RPC="http://localhost:26657" 
export DY_GRPC="localhost:9090"

# Base denomination
export DY_DENOM="uDRT"

# Governance voter keys (comma-separated)
export VOTER_KEYS="validator1,validator2,validator3"

# Faucet endpoint for wallet tests
export CURL_FAUCET_URL="http://localhost:8080/faucet"
```

### End-to-End Execution

Run all evidence collection scripts in sequence:

```bash
# 1. Governance evidence
cd governance/
./capture_governance.sh

# 2. Staking & rewards evidence  
cd ../staking/
cargo run

# 3. Contract deployment evidence
cd ../contracts/
./build.sh
./deploy_invoke.sh

# 4. Wallet & PQC evidence
cd ../wallet/
./pqc_keygen.sh
./faucet_claim.sh
./send_tx.sh
```

## Directory Structure

### governance/
Contains scripts and templates for governance parameter change proposals, voting automation, and execution verification.

### staking/
Contains Rust emission script for capturing delegator balances before/after reward distribution and claim transaction automation.

### contracts/
Contains CosmWasm counter contract example with build automation and deployment/invocation scripts.

### wallet/
Contains PQC key generation, faucet claiming, and transaction broadcasting scripts for wallet functionality verification.

## Generated Artifacts

Upon successful execution, the following evidence artifacts will be generated:

```
launch-evidence/
├── governance/
│   ├── proposal_tx.json
│   ├── vote_tx.json
│   ├── execution_log.json
│   └── screenshots/*.png
├── staking/
│   ├── before_balances.json
│   ├── after_balances.json
│   └── claim_tx.json
├── contracts/
│   ├── counter_contract.wasm
│   ├── deploy_tx.json
│   ├── invoke_tx.json
│   └── gas_report.json
└── wallet/
    ├── keygen_log.txt
    ├── faucet_tx.json
    └── broadcast_tx.json
```

## Chain Assumptions

- **Binary**: `dytallixd` (customizable via `DY_BINARY`)
- **Denomination**: `uDRT` for staking and governance
- **Endpoints**: Standard Cosmos SDK REST/RPC/gRPC ports
- **Governance**: Cosmos SDK parameter change proposal format
- **WASM**: CosmWasm-compatible smart contracts
- **PQC**: Post-quantum cryptography support (placeholder if not yet implemented)

## Troubleshooting

### Common Issues

1. **Chain not running**: Ensure `dytallixd` is running and accessible at configured endpoints
2. **Permission denied**: Ensure all `.sh` scripts have executable permissions
3. **Missing dependencies**: Install Rust, Cargo, and wasm compilation targets
4. **Governance failures**: Verify voter keys have sufficient stake and governance is enabled
5. **Contract compilation**: Ensure `wasm32-unknown-unknown` target is installed

### Validation

Each script includes validation steps and will report success/failure. Check individual README files in each subdirectory for detailed troubleshooting steps.

---

**Note**: This evidence pack generates proof-of-functionality artifacts for testnet launch readiness. Artifacts should be collected on a clean testnet environment for maximum credibility.