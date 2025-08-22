# Dytallix Explorer

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