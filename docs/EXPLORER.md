# Enhanced Dytallix Explorer Frontend

## Overview

The Enhanced Dytallix Explorer frontend provides comprehensive functionality for interacting with the Dytallix blockchain, including governance participation, smart contract management, staking operations, account monitoring, and AI-powered transaction risk analysis.

## Features

### 🏛️ Governance Module

**List Page (`/governance`)**
- View all governance proposals with real-time tally updates
- Filter by proposal status (active, passed, rejected)
- Live voting statistics with 5-second polling updates
- Quick stats dashboard showing active/passed/rejected counts

**Detail Page (`/governance/:proposalId`)**
- Full proposal details with Markdown description support
- Real-time vote tally visualization with progress bars
- Interactive voting panel for connected wallets
- Proposal metadata and execution logs
- Live updates without page reload

**Key Components:**
- Live tally subscription via polling (WebSocket ready)
- Wallet integration for voting
- Toast notifications for transaction feedback

### ⚡ Smart Contracts Module

**Main Page (`/contracts`)**
- Tabbed interface: Deploy, Execute, Query, Browse
- Contract deployment with WASM file validation
- Interactive contract execution with gas estimation
- Read-only contract querying with JSON syntax highlighting
- Contract browser with recent deployments

**Deploy Tab:**
- File upload with .wasm validation (100KB limit)
- JSON initialization message editor
- Real-time deployment feedback with contract address

**Execute Tab:**
- Contract selection with autocomplete
- Method name and JSON arguments input
- Gas estimation and fee preview
- Transaction result display with events

**Query Tab:**
- Read-only contract state queries
- JSON result formatting with syntax highlighting
- Common query examples and templates

**Browse Tab:**
- List of deployed contracts with creator info
- Quick action buttons for execute/view
- Contract activity metrics

### 🏦 Staking Module

**Main Page (`/staking`)**
- Validators list with voting power and commission rates
- My delegations overview with pending rewards
- Rewards claiming interface

**Validators Tab:**
- Complete validator information including uptime
- Voting power percentages and raw amounts
- Commission rates and validator status
- One-click delegation interface

**Delegations Tab:**
- Active delegations with validator names
- Pending rewards per delegation
- Undelegation interface with unbonding period info

**Rewards Tab:**
- Total pending rewards display
- Per-validator reward breakdown
- Claim all or individual rewards
- Real-time reward accrual simulation

### 📊 Accounts Module

**Account Page (`/accounts/:address`)**
- Comprehensive account overview with portfolio value
- Token balances for DGT/DRT with fiat estimates
- Transaction history with filtering
- Staking positions and governance participation
- AI risk assessment integration

**Features:**
- Portfolio value calculation with USD estimates
- Responsive tabbed interface (Overview, Transactions, Staking, Governance)
- Deep-linked transaction and contract interactions
- Risk scoring display with explanations

### 🔍 Enhanced Transactions Module

**Transactions Page (`/transactions`)**
- AI risk badge integration (Low/Medium/High)
- Advanced filtering by type, risk level, address
- Gas usage visualization with progress bars
- Comprehensive transaction search

**AI Risk Integration:**
- Real-time risk scoring (0-1 scale mapped to levels)
- Risk rationale tooltips
- Graceful handling of missing risk data (404 fallback)
- Bulk risk assessment for transaction lists

## Components Library

### Core Components

**RiskBadge**
```jsx
<RiskBadge 
  level="high" 
  score={0.85} 
  rationale="Unusual transaction pattern detected" 
/>
```
- Color-coded risk levels (green/yellow/red)
- Accessible tooltips with score and rationale
- ARIA labels for screen readers

**Amount**
```jsx
<Amount 
  value={1000000} 
  denom="DGT" 
  showFiat={true} 
/>
```
- Automatic decimal formatting (6 decimals default)
- Thousand separators and adaptive display
- Optional fiat conversion display

**GasTag**
```jsx
<GasTag 
  gasUsed={45000} 
  gasLimit={100000} 
/>
```
- Gas usage display with percentage bars
- Color-coded efficiency indicators
- Responsive design for mobile

**Table**
- Responsive design with mobile card stacking
- Dark mode support
- Sortable columns and row click handlers
- Loading and empty states

**Card**
- Consistent styling with dark mode
- Title, subtitle, and action areas
- Flexible content layout

**Toaster**
- Success, error, loading, and info notifications
- Auto-dismiss with configurable timing
- Loading state management for transactions
- Toast update capabilities

## API Integration

### Service Modules

**Governance Service (`/services/governance/`)**
- `listProposals(options)` - Get proposal list with filtering
- `getProposal(id)` - Get detailed proposal information
- `getProposalTally(id)` - Get current vote tallies
- `submitVote(id, option, voter)` - Submit governance vote
- `subscribeTallies(id, callback)` - Live tally updates

**Contracts Service (`/services/contracts/`)**
- `deployWasm(file, initMsg, deployer)` - Deploy WASM contract
- `execute(address, method, args, sender)` - Execute contract method
- `query(address, method, args)` - Query contract state
- `listContracts(options)` - Browse deployed contracts
- `estimateGas(address, method, args, sender)` - Gas estimation

**Staking Service (`/services/staking/`)**
- `listValidators(options)` - Get validator list
- `delegate(validator, amount, delegator)` - Delegate tokens
- `undelegate(validator, amount, delegator)` - Undelegate tokens
- `getRewards(address)` - Get pending rewards
- `claimRewards(address, validators)` - Claim staking rewards

**Accounts Service (`/services/accounts/`)**
- `getAccountOverview(address)` - Comprehensive account data
- `getBalances(address)` - Token balances
- `getAccountTxs(address, options)` - Transaction history
- `getStakingPositions(address)` - Delegations and rewards

**AI Risk Service (`/services/ai/`)**
- `getTxRisk(txHash)` - Get transaction risk assessment
- `getBulkTxRisk(txHashes)` - Bulk risk assessment
- `getAccountRisk(address)` - Account risk profile
- `getContractRisk(address)` - Contract risk analysis

### Error Handling

All services implement:
- Centralized error mapping
- Retry logic for idempotent operations
- Graceful degradation for missing data
- TypeScript type safety

## User Experience

### Dark Mode Support
- System preference detection (`prefers-color-scheme`)
- localStorage persistence
- Smooth transitions between themes
- All components support dark mode styling

### Responsive Design
- Mobile-first approach
- Breakpoint-based layouts:
  - Mobile (< 768px): Stacked cards
  - Tablet (768px - 1024px): Responsive grids
  - Desktop (> 1024px): Full table layouts

### Loading States
- Skeleton loading for critical content
- Shimmer effects for data tables
- Progressive loading with fallbacks
- Loading state management in Toaster

### Accessibility
- ARIA labels and descriptions
- Screen reader support
- Keyboard navigation
- Focus management for modals
- Color contrast compliance

## Keyboard Shortcuts

Navigate quickly using these hotkeys:

- `g g` - Governance proposals list
- `g c` - Smart contracts interface
- `g s` - Staking dashboard
- `g a` - Account search/overview
- `g t` - Enhanced transactions view

*Implementation: Add event listeners for key combinations in main app component*

## Navigation Structure

```
Enhanced Explorer
├── Governance (/governance)
│   ├── Proposals List
│   └── Proposal Detail (/governance/:id)
├── Contracts (/contracts)
│   ├── Deploy Tab
│   ├── Execute Tab
│   ├── Query Tab
│   └── Browse Tab
├── Staking (/staking)
│   ├── Validators Tab
│   ├── My Delegations Tab
│   └── Rewards Tab
├── Transactions (/transactions)
│   └── Enhanced list with AI risk
└── Accounts (/accounts/:address)
    ├── Overview Tab
    ├── Transactions Tab
    ├── Staking Tab
    └── Governance Tab
```

## Development Setup

### Prerequisites
- Node.js 18+
- npm 8+
- Vite 4+

### Installation
```bash
cd dytallix-lean-launch
npm install
npm run dev
```

### Build
```bash
npm run build
npm run preview
```

### Testing
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Accessibility tests  
npm run test:a11y
```

---

## Legacy Explorer Documentation

The original minimal block and transaction explorer documentation follows below for reference:

# Dytallix Explorer (Legacy)

A minimal block and transaction explorer for the Dytallix blockchain, consisting of an indexer service, API service, and web UI.

## Architecture

The explorer consists of three main components:

1. **Indexer Service** (`explorer/indexer`) - Polls the Dytallix node RPC endpoints to ingest blocks and transactions into SQLite
2. **API Service** (`explorer/api`) - Provides read-only HTTP endpoints for explorer data
3. **Web UI** (`web/pages/explorer/index.html`) - Static HTML page displaying latest blocks and transactions

## Components

### Indexer Service

The indexer service polls the node's RPC endpoints and stores data in a SQLite database.

**Features:**
- Polls `/blocks/latest` and `/blocks?height=X` endpoints
- Backfills recent N blocks (configurable)
- Follows new blocks in real-time
- Persists to SQLite with idempotent inserts
- Optional JSONL logging for transparency
- Basic reorg awareness (logs mismatches)

**Database Schema:**
```sql
blocks(height PRIMARY KEY, hash, time, tx_count)
txs(hash PRIMARY KEY, height, sender, recipient, amount, denom, status, gas_used)
```

### API Service

Provides HTTP endpoints for the explorer UI.

**Endpoints:**
- `GET /explorer/blocks?limit=&offset=` - List blocks with pagination
- `GET /explorer/txs?limit=&offset=` - List transactions with pagination  
- `GET /explorer/tx/{hash}` - Get transaction details by hash

**Features:**
- JSON responses with pagination (default limit 20, max 100)
- CORS enabled for any origin
- Error handling with appropriate HTTP status codes

### Web UI

Static HTML page with JavaScript for displaying explorer data.

**Features:**
- Latest blocks table (height, hash truncated, time, tx count)
- Recent transactions table (hash truncated, height, status color-coded, gas used)
- Transaction detail modal (full JSON)
- Auto-refresh every 5 seconds
- Responsive design

## Environment Variables

All configuration is done via environment variables:

### Indexer Configuration
- `DYT_RPC_BASE` - Node RPC base URL (default: `http://localhost:3030`)
- `DYT_INDEX_DB` - SQLite database path (default: `explorer.db`)
- `DYT_BACKFILL_BLOCKS` - Number of recent blocks to backfill (default: `100`)
- `DYT_POLL_INTERVAL_MS` - Polling interval in milliseconds (default: `5000`)
- `DYT_INDEXER_JSONL` - Optional JSONL log file path for debugging

### API Configuration  
- `DYT_INDEX_DB` - SQLite database path (default: `explorer.db`)
- `DYT_API_PORT` - API server port (default: `8080`)

## Running the Explorer

### Prerequisites

1. Rust toolchain installed
2. Dytallix node running on port 3030 (or configured RPC endpoint)

### Quick Start

Use the convenience script:

```bash
./scripts/run_explorer.sh
```

This script will:
1. Build both services
2. Start the indexer in the background
3. Start the API service in the background
4. Open the web UI in your browser

### Manual Setup

1. **Build the services:**
```bash
cargo build --release -p dytallix-explorer-indexer -p dytallix-explorer-api
```

2. **Start the indexer:**
```bash
# With default configuration
./target/release/indexer

# With custom configuration
DYT_RPC_BASE=http://localhost:3030 \
DYT_INDEX_DB=./data/explorer.db \
DYT_BACKFILL_BLOCKS=50 \
DYT_POLL_INTERVAL_MS=3000 \
./target/release/indexer
```

3. **Start the API service:**
```bash
# With default configuration  
./target/release/dytallix-explorer-api

# With custom configuration
DYT_INDEX_DB=./data/explorer.db \
DYT_API_PORT=8080 \
./target/release/dytallix-explorer-api
```

4. **Open the web UI:**
```bash
# Serve the static file or open directly
open web/pages/explorer/index.html
```

### Development Mode

For development, you can run the services with cargo:

```bash
# Terminal 1 - Indexer
cd explorer/indexer
cargo run

# Terminal 2 - API  
cd explorer/api
cargo run

# Terminal 3 - Serve UI (optional)
cd web/pages/explorer
python3 -m http.server 3000
```

## Testing

### Unit Tests

Run unit tests for individual components:

```bash
# Test indexer
cargo test -p dytallix-explorer-indexer

# Test API
cargo test -p dytallix-explorer-api
```

### Integration Tests

Run integration tests against a live node:

```bash
# Ensure node is running on localhost:3030
cargo test --test integration_test
```

### UI Tests

UI tests are implemented with Cypress:

```bash
# Install Cypress dependencies
npm install

# Run Cypress tests
npm run cypress:run

# Or open Cypress UI
npm run cypress:open
```

## Configuration Examples

### Production Configuration

```bash
# High-frequency polling for real-time updates
export DYT_RPC_BASE="https://rpc.dytallix.com"
export DYT_INDEX_DB="/var/lib/dytallix/explorer.db"  
export DYT_BACKFILL_BLOCKS=1000
export DYT_POLL_INTERVAL_MS=1000
export DYT_API_PORT=8080
```

### Development Configuration

```bash
# Local development with debug logging
export DYT_RPC_BASE="http://localhost:3030"
export DYT_INDEX_DB="./explorer.db"
export DYT_BACKFILL_BLOCKS=50
export DYT_POLL_INTERVAL_MS=5000
export DYT_INDEXER_JSONL="./debug.jsonl"
export DYT_API_PORT=8080
```

## Troubleshooting

### Common Issues

1. **Cannot connect to node RPC**
   - Verify node is running and accessible
   - Check `DYT_RPC_BASE` configuration
   - Ensure firewall allows connections

2. **Database locked errors**
   - Only one indexer instance should run per database
   - Check for zombie processes
   - Ensure proper file permissions

3. **UI shows no data**
   - Verify API service is running on correct port
   - Check browser console for CORS errors
   - Ensure database has been populated by indexer

4. **High memory usage**
   - Reduce `DYT_BACKFILL_BLOCKS` for initial sync
   - Monitor SQLite database size
   - Consider implementing data retention policies

### Logs and Debugging

The services use structured logging with the `tracing` crate. Set log levels:

```bash
export RUST_LOG=debug  # For verbose logging
export RUST_LOG=info   # For normal operation
```

Enable JSONL debugging for the indexer:

```bash
export DYT_INDEXER_JSONL="./debug.jsonl"
tail -f debug.jsonl | jq .
```

## Future Enhancements

### Planned Features
- Full reorg handling with rollback capability
- WebSocket streaming for real-time updates
- Advanced search by address and hash
- Transaction filtering and sorting
- Richer transaction decoding
- Fee breakdown and analysis
- Performance metrics and monitoring
- Database archival and pruning

### Scaling Considerations
- Read replicas for API load balancing
- Caching layer (Redis) for frequent queries
- Rate limiting and API quotas
- Horizontal scaling with message queues
- PostgreSQL migration for production

## API Reference

### GET /explorer/blocks

List blocks with pagination.

**Query Parameters:**
- `limit` (optional) - Number of blocks to return (default: 20, max: 100)
- `offset` (optional) - Number of blocks to skip (default: 0)

**Response:**
```json
{
  "blocks": [
    {
      "height": 12345,
      "hash": "0x1234...",
      "time": "2024-01-01T12:00:00Z",
      "tx_count": 5
    }
  ],
  "limit": 20,
  "offset": 0
}
```

### GET /explorer/txs

List transactions with pagination.

**Query Parameters:**
- `limit` (optional) - Number of transactions to return (default: 20, max: 100)  
- `offset` (optional) - Number of transactions to skip (default: 0)

**Response:**
```json
{
  "transactions": [
    {
      "hash": "0xabcd...",
      "height": 12345,
      "sender": "dyt1...",
      "recipient": "dyt1...",
      "amount": "100",
      "denom": "dyt",
      "status": 1,
      "gas_used": 21000
    }
  ],
  "limit": 20,
  "offset": 0
}
```

### GET /explorer/tx/{hash}

Get transaction details by hash.

**Response:**
```json
{
  "hash": "0xabcd...",
  "height": 12345,
  "sender": "dyt1...",
  "recipient": "dyt1...", 
  "amount": "100",
  "denom": "dyt",
  "status": 1,
  "gas_used": 21000
}
```

**Error Responses:**
- `404 Not Found` - Transaction not found
- `500 Internal Server Error` - Database or server error