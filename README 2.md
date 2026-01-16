# Dytallix

Post-quantum secure blockchain with AI-enhanced transaction processing. Dytallix uses ML-DSA (FIPS 204, formerly Dilithium) for quantum-resistant cryptographic signatures, protecting assets against future quantum computing threats.

## Features

- **Post-Quantum Cryptography**: ML-DSA (FIPS 204) signatures protect against quantum attacks
- **Smart Contracts**: Deploy and execute WASM contracts on-chain
- **Dual Token System**: DGT (governance) + DRT (utility/rewards)
- **Staking & Rewards**: Earn rewards by staking DGT tokens
- **Cross-chain Bridge**: Bridge assets between Dytallix and EVM chains
- **AI-Enhanced Processing**: Optimized transaction ordering and validation

## Quick Start

### Get Testnet Tokens

```bash
# Request tokens from faucet
curl -X POST https://dytallix.com/rpc/faucet/claim \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_ADDRESS"}'
```

### Check Balance

```bash
curl https://dytallix.com/rpc/accounts/YOUR_ADDRESS
```

## SDKs

### TypeScript SDK

```bash
cd sdk/typescript
npm install
npm run build
npm test                           # Run tests
node examples/e2e_test.js          # Full E2E test
node examples/deploy_contract.js   # Deploy a contract
```

**Features:**
- PQC wallet generation (ML-DSA)
- Account queries and transfers
- Smart contract deployment
- Faucet requests
- Message signing/verification

See [sdk/typescript/README.md](sdk/typescript/README.md) for full documentation.

### Rust SDK

```bash
cd sdk/rust
cargo build
cargo test
cargo run --example e2e_test       # Full E2E test
cargo run --example deploy_contract # Deploy a contract
```

**Features:**
- PQC wallet generation (ML-DSA)
- Account queries and transfers
- Smart contract deployment
- Faucet requests
- Message signing/verification

See [sdk/rust/README.md](sdk/rust/README.md) for full documentation.

## Smart Contracts

Dytallix supports WASM smart contracts. See [contracts/](contracts/) for examples.

### Deploy a Contract

```bash
# Build contract
cd contracts/counter
cargo build --release --target wasm32-unknown-unknown

# Deploy via curl
WASM_HEX=$(xxd -p target/wasm32-unknown-unknown/release/counter_contract.wasm | tr -d '\n')
curl -X POST https://dytallix.com/rpc/contracts/deploy \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$WASM_HEX\",\"deployer\":\"YOUR_ADDRESS\"}"
```

### Call a Contract

```bash
curl -X POST https://dytallix.com/rpc/contracts/call \
  -H "Content-Type: application/json" \
  -d '{"address":"CONTRACT_ADDRESS","method":"increment","args":""}'
```

### Example Contracts

| Contract | Size | Description |
|----------|------|-------------|
| [counter](contracts/counter/) | 504 bytes | Minimal counter (no_std) |
| [hello-world](contracts/hello-world/) | 16 KB | Full-featured example |

## Network

| Network | RPC Endpoint | Chain ID |
|---------|--------------|----------|
| Testnet | `https://dytallix.com/rpc` | `dytallix-testnet-1` |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Network status & block height |
| `/accounts/{address}` | GET | Account balance |
| `/faucet/claim` | POST | Request testnet tokens |
| `/contracts/deploy` | POST | Deploy WASM contract |
| `/contracts/call` | POST | Execute contract method |
| `/tx/submit` | POST | Submit signed transaction |

## Tokens

| Token | Symbol | Purpose |
|-------|--------|---------|
| DGT | Dytallix Governance Token | Staking & governance |
| DRT | Dytallix Reward Token | Transaction fees & rewards |

### Faucet Limits

- **DGT**: 1 token per request
- **DRT**: 50 tokens per request
- **Cooldown**: 24 hours per address

## Run Your Own Node

```bash
# Clone and build
git clone https://github.com/DytallixHQ/Dytallix.git
cd Dytallix/dytallix-fast-launch
cargo build --release -p dytallix-fast-node --features "contracts,metrics"

# Run
./target/release/dytallix-fast-node \
  --chain-id dytallix-testnet-1 \
  --data-dir ./data \
  --metrics-port 9100
```

## Development

### Project Structure

```
Dytallix/
├── sdk/
│   ├── typescript/     # TypeScript SDK
│   └── rust/          # Rust SDK
├── contracts/
│   ├── counter/       # Minimal contract example
│   └── hello-world/   # Full-featured example
├── dytallix-fast-launch/
│   └── node/          # Node implementation
└── blockchain-core/   # Core blockchain logic
```

### Building Contracts

```bash
# Install WASM target
rustup target add wasm32-unknown-unknown

# Build
cd contracts/counter
cargo build --release --target wasm32-unknown-unknown
```

## License

Apache-2.0
