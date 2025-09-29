# DytallixLiteLaunch

**Deployment-ready, lightweight testnet for the Dytallix ecosystem**

A complete, self-contained testnet deployment package that includes everything needed to build and run a local or single-VM testnet with DGT and DRT tokens, governance, staking, WASM contracts, PQC operations, and comprehensive web interfaces.

## Quick Start

```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Install dependencies
make install

# 3. Build all services
make build

# 4. Start the complete testnet
make up
```

Access the services:
- **Frontend**: http://localhost:3001 (Wallet, Dashboard, Governance)
- **Explorer**: http://localhost:3000 (Blockchain Explorer)  
- **Faucet**: http://localhost:8787 (Get testnet tokens)
- **Node RPC**: http://localhost:26657 (Blockchain RPC)
- **AI Oracle**: http://localhost:8080 (AI services & metrics)

## Architecture

### Core Components

- **Node**: Dytallix blockchain node with DGT/DRT dual-token system
- **Server**: AI Oracle and metrics service with tokenomics APIs
- **Faucet**: DGT/DRT token faucet with rate limiting
- **Frontend**: React web application (wallet, dashboard, governance)
- **Explorer**: Blockchain explorer and transaction verification
- **CLI**: Command-line tools for transactions, governance, and PQC operations

### Token System

- **DGT (Dytallix Governance Token)**
  - Fixed supply: 1,000,000,000 DGT
  - Used for governance voting, staking, and protocol fees
  - Micro-denomination: `udgt` (1 DGT = 1,000,000 udgt)

- **DRT (Dytallix Reward Token)**
  - Inflationary: 5% annual inflation
  - Used for staking rewards, AI service payments, and incentives
  - Micro-denomination: `udrt` (1 DRT = 1,000,000 udrt)

## Services

### Blockchain Node
- **Ports**: 26657 (RPC), 26656 (P2P), 1317 (REST), 9090 (gRPC)
- **Features**: Governance, staking, WASM contracts, PQC support
- **Configuration**: `node/genesis.json`, `node/config/config.toml`

### AI Oracle & Metrics Server
- **Port**: 8080
- **Endpoints**: 
  - `POST /oracle` - AI model requests
  - `GET /metrics` - Prometheus metrics
  - `GET /tokenomics` - Token economics data
  - `POST /emissions/calculate` - DRT emissions calculation

### Token Faucet
- **Port**: 8787
- **Features**: Rate limiting, IP/address tracking, DGT/DRT dispensing
- **Limits**: 1 request/hour per address, 10 requests/hour per IP

### Web Frontend
- **Port**: 3001
- **Pages**: Home, Wallet, Faucet, Explorer, Dashboard, Governance
- **Features**: Token management, transaction history, network monitoring

## Development

### Prerequisites

- **Node.js** 18+ (for services and frontend)
- **Rust** 1.75+ (for blockchain node and CLI)
- **Docker** & Docker Compose (for containerized deployment)
- **jq** (for JSON processing in scripts)

### Building from Source

```bash
# Build blockchain node and CLI
make wasm-build

# Build services
cd server && npm install && npm run build
cd ../faucet && npm install && npm run build
cd ../frontend && npm install && npm run build

# Build contracts
./scripts/build_counter_wasm.sh
./scripts/build_pqc_wasm.sh
```

### Running Tests

```bash
# Test all services
make test

# Test individual components
cd server && npm test
cd ../faucet && npm test
cd ../frontend && npm test
```

## Usage Examples

### CLI Operations

```bash
# Check network status
./cli/dytx/target/release/dytx status

# Query balance
./cli/dytx/target/release/dytx balance --address dytallix1...

# Send tokens
./cli/dytx/target/release/dytx send \
  --from dytallix1... \
  --to dytallix1... \
  --amount 1000000 \
  --denom udgt

# Submit governance proposal
./cli/dytx/target/release/dytx gov-propose \
  --title "Increase Block Size" \
  --description "Proposal to increase block size limit" \
  --deposit 10000000 \
  --proposer dytallix1...

# Generate PQC keypair
./cli/dytx/target/release/dytx pqc-keygen --algorithm dilithium3
```

### WASM Contracts

```bash
# Build contracts
make wasm-build

# Deploy counter contract
./cli/dytx/target/release/dytx wasm-deploy \
  --wasm-file /tmp/wasm_artifacts/counter.wasm \
  --deployer dytallix1...

# Execute contract method
./cli/dytx/target/release/dytx wasm-execute \
  --contract-address dytallix1contract... \
  --method increment \
  --caller dytallix1...
```

### Governance Demo

```bash
# Run complete governance demonstration
./scripts/governance-demo.sh

# Run DRT emissions calculation
./scripts/emissions_cron.sh
```

## Deployment

### Local Development

```bash
make up    # Start all services
make logs  # View logs
make down  # Stop all services
make reset # Reset blockchain state
```

### Single VM Deployment

```bash
# On Ubuntu/Debian server
git clone <repository>
cd DytallixLiteLaunch

# Install dependencies
sudo apt update
sudo apt install -y docker.io docker-compose nodejs npm jq

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Deploy
make install
make build
make up
```

### Kubernetes (Helm)

```bash
# Install with Helm
helm install dytallix-testnet ./helm \
  --namespace dytallix \
  --create-namespace \
  --values helm/values-testnet.yaml
```

## Monitoring

### Health Checks

```bash
# Check all services
make health

# Individual service health
curl http://localhost:26657/status  # Node
curl http://localhost:8080/health   # Server
curl http://localhost:8787/health   # Faucet
curl http://localhost:3001/         # Frontend
```

### Metrics

- **Prometheus**: Node metrics available at `:9464/metrics`
- **Server metrics**: Available at `:8080/metrics`
- **Dashboard**: Real-time metrics at http://localhost:3001/dashboard

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 26657, 8080, 8787, 3001 are free
2. **Docker permissions**: Add user to docker group: `sudo usermod -aG docker $USER`
3. **Node sync issues**: Reset with `make reset` and restart
4. **WASM build failures**: Install Rust and add wasm32 target

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
export ENABLE_DEBUG_LOGS=true

# View detailed logs
make logs
```

### Reset Everything

```bash
# Complete reset (WARNING: destroys all data)
make down
make clean
docker system prune -f
make reset
make up
```

## Contributing

See the main repository for contribution guidelines. This LiteLaunch package is designed to be self-contained and lightweight for easy deployment and testing.

## License

Apache-2.0 License. See LICENSE file for details.

---

**DytallixLiteLaunch** - Ready-to-deploy testnet for the Dytallix ecosystem