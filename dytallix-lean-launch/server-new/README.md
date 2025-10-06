# Dytallix Backend/API Server

Production-lean backend/API service layer for Dytallix lean launch.

## Features

- ✅ **Secure Faucet**: Server-side transaction signing with rate limiting
- ✅ **REST API**: Status, balance, faucet, RPC proxy, governance, contracts
- ✅ **Admin Controls**: Pause/resume, key rotation, top-up tracking
- ✅ **Rate Limiting**: Per-IP and per-address limits with SQLite persistence
- ✅ **Security**: CORS, request size limits, RPC method allowlisting, replay protection
- ✅ **Observability**: Health checks, Prometheus metrics, structured logging
- ✅ **Database**: SQLite with WAL mode for persistence and migrations

## Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
cd server-new
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
# Edit .env with your settings
```

**Important**: Never commit real private keys or secrets!

### Database Setup

```bash
npm run migrate
npm run seed
```

### Development

```bash
npm run dev
```

Server will start on port 8787 (configurable via `PORT` env var).

### Production

```bash
npm run build
npm start
```

## API Endpoints

### Health & Metrics

- `GET /healthz` - Basic health check
- `GET /readyz` - Readiness check (includes database)
- `GET /metrics` - Prometheus metrics

### Public API

- `GET /api/status` - Node and faucet status
- `GET /api/balance?address=<addr>` - Get address balance
- `POST /api/faucet` - Request faucet drip
  ```json
  { "address": "0x..." }
  ```
- `POST /api/rpc` - RPC proxy (allowlisted methods only)
  ```json
  { "method": "eth_blockNumber", "params": [] }
  ```

### Governance (Stubs)

- `POST /api/governance/vote` - Vote on proposal (501 Not Implemented)
- `POST /api/governance/propose` - Create proposal (501 Not Implemented)
- `GET /api/governance/proposals` - List proposals (501 Not Implemented)

### Contracts

- `POST /api/contracts/call` - Read-only contract call
- `POST /api/contracts/send` - State-changing contract call (requires auth)

### Admin (Requires Authorization)

- `POST /api/admin/pause` - Pause faucet
- `POST /api/admin/resume` - Resume faucet
- `POST /api/admin/rotate-key` - Rotate signing key
  ```json
  { "newKey": "..." }
  ```
- `POST /api/admin/topup` - Record top-up metadata
  ```json
  { "amount": 1000, "note": "..." }
  ```

Admin endpoints require:
- `Authorization: Bearer <ADMIN_TOKEN>` header
- IP must be in `ADMIN_ALLOWED_IPS` list

## Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with initial data
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run typecheck` - Type check without emitting
- `npm run backup` - Backup database

Or use Makefile:
```bash
make dev
make test
make backup
```

## Testing

Run all tests:
```bash
npm test
```

### Manual Testing

1. **Health check**:
   ```bash
   curl http://localhost:8787/healthz
   ```

2. **Status**:
   ```bash
   curl http://localhost:8787/api/status
   ```

3. **Faucet request**:
   ```bash
   curl -X POST http://localhost:8787/api/faucet \
     -H 'Content-Type: application/json' \
     -d '{"address":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
   ```

4. **RPC proxy**:
   ```bash
   curl -X POST http://localhost:8787/api/rpc \
     -H 'Content-Type: application/json' \
     -d '{"method":"eth_blockNumber","params":[]}'
   ```

5. **Admin pause** (requires token):
   ```bash
   curl -X POST http://localhost:8787/api/admin/pause \
     -H "Authorization: Bearer your_admin_token"
   ```

## Architecture

### Directory Structure

```
server-new/
├── src/
│   ├── routes/          # API route handlers
│   ├── signer/          # Transaction signing abstraction
│   ├── util/            # Utilities (logger, validators, etc.)
│   ├── migrations/      # Database migrations
│   ├── evidence/        # Evidence hashing scripts
│   ├── config.ts        # Configuration loader
│   ├── db.ts            # Database management
│   ├── rpc.ts           # RPC client
│   ├── limits.ts        # Rate limiting logic
│   └── index.ts         # Main server
├── data/                # SQLite database files
├── backups/             # Database backups
├── test/                # Tests
├── package.json
├── tsconfig.json
└── Makefile
```

### Database Schema

- `faucet_grants` - Record of all faucet requests
- `request_fingerprints` - Request metadata for abuse detection
- `nonces` - Nonce tracking for replay protection
- `admin_state` - Faucet pause/resume state
- `kv` - Key-value store for configuration

### Security Features

1. **CORS**: Only allows frontend origin
2. **Rate Limiting**: Global + per-IP + per-address limits
3. **Request Size Limits**: Prevents DoS via large payloads
4. **RPC Method Allowlisting**: Only safe methods permitted
5. **Admin Authorization**: Token + IP allowlist
6. **Replay Protection**: Nonce tracking
7. **Chain ID Binding**: Transactions locked to specific chain

### Observability

- **Structured Logging**: JSON logs with pino
- **Prometheus Metrics**:
  - `http_requests_total`
  - `http_request_duration_seconds`
  - `dytallix_faucet_balance`
  - `dytallix_block_lag`
- **Health Checks**: `/healthz`, `/readyz`

## Production Deployment

### Environment Variables

See `.env.example` for all options. Critical ones:

- `FAUCET_PRIVATE_KEY` - **NEVER use dev key in production!**
- `ADMIN_TOKEN` - Use strong random token
- `ADMIN_ALLOWED_IPS` - Restrict admin access
- `RPC_URL` - Point to production node
- `CHAIN_ID` - Must match network

### Key Management

The `LocalPrivateKeySigner` is for **development only**. For production:

1. Implement `KMSSigner` with your KMS provider (AWS KMS, GCP KMS, Azure Key Vault, etc.)
2. Or use HSM integration
3. Update `createSigner()` in `src/signer/index.ts`

### Backup

Run daily backups:
```bash
npm run backup
```

This creates timestamped archives in `backups/` and retains last 7.

For production, copy backups to secure remote storage.

### Monitoring

- **Logs**: Pipe to centralized logging (ELK, Datadog, etc.)
- **Metrics**: Scrape `/metrics` with Prometheus
- **Alerts**: Set up alerts on:
  - Faucet balance low
  - High error rate
  - RPC timeouts
  - Rate limit abuse

## Troubleshooting

### Database locked

If you see "database is locked":
- Check if another process is using the DB
- WAL mode should prevent most locking issues
- Restart server

### RPC timeouts

- Check `NODE_TIMEOUT_MS` setting
- Verify node is responsive
- Check network connectivity

### Rate limit errors

- Check `RATE_LIMIT_PER_IP_PER_DAY` and `RATE_LIMIT_PER_ADDRESS_PER_DAY`
- Query `faucet_grants` table to see recent requests
- Use admin pause if under attack

## License

See main repository LICENSE file.
