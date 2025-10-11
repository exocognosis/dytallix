# 🚀 Dytallix Explorer Setup Guide

## Making the Explorer Work with Real Blockchain Data

The Explorer currently shows "Mock Mode (No RPC configured)" because it needs a running blockchain node to query real data. Here's how to set it up:

## Prerequisites

- Rust and Cargo installed (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Node.js 18+ and npm
- 4GB RAM minimum

## Quick Start (3 Steps)

### 1. Build the Blockchain Node

```bash
npm run node:build
```

This will compile the Dytallix blockchain node. First build takes 5-10 minutes.

### 2. Start Everything

```bash
npm run dev:complete
```

This starts:
- **Blockchain Node** (Port 3030) - Stores blocks, transactions, accounts
- **API Server** (Port 8787) - Faucet and additional endpoints
- **Frontend** (Port 5173) - React explorer UI

### 3. Verify It's Working

Open http://localhost:5173 and:
1. Go to **Explorer** page
2. The yellow "Mock Mode" banner should be gone
3. You should see "Connected to dyt-local-1"

## What You Can Search Now

With the node running, you can search:

### 🏦 Addresses
- Format: `dyt1...` (Bech32 format)
- Example: `dyt1valoper000000000001`
- Shows: Balance (DGT/DRT), transaction history, nonce

### 📦 Blocks
- By height: `0`, `1`, `123`
- By hash: `0x...` (64 hex characters)
- Shows: Timestamp, transactions, producer, gas used

### 🔄 Transactions
- By hash: `0x...` (64 hex characters)
- Shows: From/to addresses, amount, status, fee, confirmations

## API Endpoints Available

Once the node is running on port 3030:

```bash
# Get latest stats
curl http://localhost:3030/stats

# Get a specific block
curl http://localhost:3030/block/0

# Check an address balance
curl http://localhost:3030/balance/dyt1valoper000000000001

# Get transaction
curl http://localhost:3030/tx/TX_HASH

# List recent blocks
curl http://localhost:3030/blocks?limit=10
```

## Genesis Accounts

The blockchain starts with these test accounts (from `genesis.json`):

| Address | Role | DGT Balance | DRT Balance |
|---------|------|-------------|-------------|
| `dyt1valoper000000000001` | Validator | 2,000 | 100 |
| `dyt1valoper000000000002` | Validator | 2,000 | 100 |
| `dyt1valoper000000000003` | Validator | 2,000 | 100 |
| `dyt1userstake0000000001` | Delegator | 500 | 0 |

## Troubleshooting

### "Mock Mode" Still Shows

1. Check if node is running: `curl http://localhost:3030/stats`
2. Verify `.env` file has: `VITE_DYT_NODE=http://localhost:3030`
3. Restart the frontend: Stop dev server and run `npm run dev` again

### Node Won't Start

```bash
# Clean data directory
rm -rf node/data

# Rebuild
npm run node:build

# Try starting again
npm run node:dev
```

### Port Already in Use

```bash
# Kill process on port 3030
lsof -ti:3030 | xargs kill -9

# Or change port in .env
# DYT_NODE_PORT=3031
```

## Manual Start (Alternative)

If you want to start components separately:

```bash
# Terminal 1 - Blockchain Node
cd node
cargo run --release

# Terminal 2 - API Server
npm run server

# Terminal 3 - Frontend
npm run dev
```

## Environment Configuration

Key variables in `.env`:

```bash
# REQUIRED for Explorer to work
VITE_DYT_NODE=http://localhost:3030
VITE_RPC_HTTP_URL=http://localhost:3030
VITE_CHAIN_ID=dyt-local-1

# Node configuration
DYT_DATA_DIR=./node/data
DYT_BLOCK_INTERVAL_MS=2000
DYT_EMPTY_BLOCKS=true
```

## Data Persistence

The blockchain data is stored in `node/data/` using RocksDB:
- Survives restarts
- Can be backed up by copying the directory
- To reset: Delete `node/data/` and restart

## WebSocket Support

Real-time updates via WebSocket at `ws://localhost:3030/ws`:

Events:
- `new_transaction` - Emitted when tx submitted
- `new_block` - Emitted every ~2 seconds

## Next Steps

1. **Create Wallets**: Use the Wallet page to generate PQC addresses
2. **Request Tokens**: Use the Faucet to get DGT/DRT tokens
3. **Send Transactions**: Transfer between addresses
4. **Explore Data**: Search for blocks, txs, addresses in Explorer

## Performance Notes

- **Block Time**: ~2 seconds (configurable via `DYT_BLOCK_INTERVAL_MS`)
- **TPS**: ~50 transactions per block
- **Storage**: ~1MB per 1000 blocks
- **RAM Usage**: ~200MB (node) + ~100MB (server) + ~100MB (frontend)

## Production Deployment

For production:
1. Set `RUNTIME_MOCKS=false` (default)
2. Configure proper genesis with real validator addresses
3. Set `DYT_CHAIN_ID` to production value
4. Enable CORS restrictions with `FRONTEND_ORIGIN`
5. Use persistent volumes for `DYT_DATA_DIR`

## Support

- Issues: Check `node/node.log` for blockchain errors
- API Docs: See `node/README_RPC.md`
- Architecture: See `FAST_LAUNCH_SUMMARY.md`
