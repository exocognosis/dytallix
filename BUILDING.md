# Building and Running Dytallix

This guide covers building the Dytallix blockchain node from source and running it locally or on a testnet.

## Prerequisites

- **Rust**: 1.70+ ([install rustup](https://rustup.rs))
- **Cargo**: Included with Rust
- **WASM target**: For contract development
  ```bash
  rustup target add wasm32-unknown-unknown
  ```

## Building the Node

### 1. Clone the Repository

```bash
git clone https://github.com/DytallixHQ/Dytallix.git
cd Dytallix
```

### 2. Build the Node Binary

```bash
cargo build --release -p dytallix-fast-node \
  --features "contracts,metrics"
```

This builds an optimized node binary to `target/release/dytallix-fast-node`.

**Build time**: ~5-10 minutes on modern hardware (first build longer due to dependencies).

### 3. Verify the Build

```bash
./target/release/dytallix-fast-node --version
```

## Running a Local Node

### Start a Single Node

```bash
./target/release/dytallix-fast-node \
  --chain-id dytallix-testnet-1 \
  --bind-addr 127.0.0.1:26656 \
  --rpc-addr 127.0.0.1:26657 \
  --data-dir ./data \
  --log-level info
```

**Output:**
```
2026-01-07 10:30:45 INFO  Dytallix Node Starting...
2026-01-07 10:30:45 INFO  Chain ID: dytallix-testnet-1
2026-01-07 10:30:45 INFO  P2P: 127.0.0.1:26656
2026-01-07 10:30:45 INFO  RPC: http://127.0.0.1:26657
```

### Test the Node

In another terminal:

```bash
# Check node status
curl http://127.0.0.1:26657/status

# Expected response:
# {"jsonrpc":"2.0","id":"","result":{"node_info":{"chain_id":"dytallix-testnet-1"},...}}
```

### Run Node with Metrics

```bash
./target/release/dytallix-fast-node \
  --chain-id dytallix-testnet-1 \
  --bind-addr 0.0.0.0:26656 \
  --rpc-addr 0.0.0.0:26657 \
  --metrics-port 9100 \
  --data-dir ./data
```

Prometheus metrics available at `http://localhost:9100/metrics`.

## Running a Testnet Cluster

### Quick 3-Node Testnet

```bash
# Terminal 1: Node 1
./target/release/dytallix-fast-node \
  --chain-id dytallix-testnet-1 \
  --node-key node1.key \
  --bind-addr 127.0.0.1:26656 \
  --rpc-addr 127.0.0.1:26657 \
  --data-dir ./data1

# Terminal 2: Node 2
./target/release/dytallix-fast-node \
  --chain-id dytallix-testnet-1 \
  --node-key node2.key \
  --bind-addr 127.0.0.1:26666 \
  --rpc-addr 127.0.0.1:26667 \
  --peers "127.0.0.1:26656" \
  --data-dir ./data2

# Terminal 3: Node 3
./target/release/dytallix-fast-node \
  --chain-id dytallix-testnet-1 \
  --node-key node3.key \
  --bind-addr 127.0.0.1:26676 \
  --rpc-addr 127.0.0.1:26677 \
  --peers "127.0.0.1:26656,127.0.0.1:26666" \
  --data-dir ./data3
```

## Docker Deployment

### Build Docker Image

```bash
docker build -t dytallix-node:latest \
  --build-arg FEATURES="contracts,metrics" \
  -f Dockerfile .
```

### Run Node in Docker

```bash
docker run -d \
  --name dytallix-node \
  -p 26656:26656 \
  -p 26657:26657 \
  -p 9100:9100 \
  -v dytallix-data:/app/data \
  dytallix-node:latest \
  --chain-id dytallix-testnet-1 \
  --bind-addr 0.0.0.0:26656 \
  --rpc-addr 0.0.0.0:26657 \
  --metrics-port 9100
```

### Docker Compose (Multi-Node Testnet)

```bash
docker-compose up -d
```

See `docker-compose.yml` for testnet configuration.

## Configuration

### Environment Variables

```bash
# Logging
export RUST_LOG=dytallix=debug,info

# Network
export DYTALLIX_CHAIN_ID=dytallix-testnet-1
export DYTALLIX_BIND_ADDR=0.0.0.0:26656
export DYTALLIX_RPC_ADDR=0.0.0.0:26657

# Database
export DYTALLIX_DB_PATH=/var/lib/dytallix

# Secrets (use proper secret manager in production)
export DYTALLIX_VALIDATOR_KEY=/etc/dytallix/validator.key
```

### CLI Options

```bash
./target/release/dytallix-fast-node --help
```

**Key options:**
- `--chain-id`: Network identifier (default: dytallix-testnet-1)
- `--bind-addr`: P2P bind address (default: 0.0.0.0:26656)
- `--rpc-addr`: RPC server address (default: 0.0.0.0:26657)
- `--peers`: Comma-separated list of peer addresses
- `--data-dir`: Data directory for blockchain state
- `--log-level`: Logging level (trace, debug, info, warn, error)
- `--metrics-port`: Prometheus metrics port (default: disabled)

## Testing

### Run All Tests

```bash
cargo test --all
```

### Run Node Tests

```bash
cargo test -p dytallix-fast-node
```

### Run Integration Tests

```bash
cargo test --test '*' -- --nocapture
```

## Troubleshooting

### Port Already in Use

If ports 26656/26657 are already in use, bind to different ports:

```bash
./target/release/dytallix-fast-node \
  --bind-addr 127.0.0.1:26666 \
  --rpc-addr 127.0.0.1:26667
```

### Database Corruption

If the node fails to start, reset the data directory:

```bash
rm -rf ./data
./target/release/dytallix-fast-node ...
```

### Sync Issues

If the node can't sync with peers:

1. Check network connectivity: `ping <peer-address>`
2. Verify peer format: `<ip>:<port>` (no `http://`)
3. Check firewall rules: Ensure 26656 (P2P) is open
4. Check logs: Set `--log-level debug`

### Performance

If node is slow:

1. Increase thread pool: `--worker-threads 8`
2. Increase DB cache: `--db-cache-mb 2000`
3. Monitor metrics: `curl http://localhost:9100/metrics`

## Production Deployment

### Security Checklist

- [ ] Use proper secret manager (HashiCorp Vault, AWS Secrets Manager)
- [ ] Run behind firewall/VPN for P2P port (26656)
- [ ] Enable rate limiting on RPC port (26657)
- [ ] Use TLS for RPC connections
- [ ] Monitor node health and metrics
- [ ] Set up log aggregation
- [ ] Regular backups of validator keys and database

### Validator Setup

To run as a validator node:

1. Build with validator features:
   ```bash
   cargo build --release -p dytallix-fast-node \
     --features "contracts,metrics,validator"
   ```

2. Generate validator keys:
   ```bash
   ./target/release/dytallix-fast-node \
     --generate-validator-key \
     --key-file validator.key
   ```

3. Run with validator mode enabled

4. Stake DGT tokens to activate validator

See `CONTRIBUTING.md` for validator requirements and expectations.

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/DytallixHQ/Dytallix/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DytallixHQ/Dytallix/discussions)
- **Discord**: [Community Server](https://discord.gg/N8Q4A2KE)
- **Documentation**: [docs/](docs/) folder

## License

Apache-2.0
