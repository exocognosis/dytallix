# Dytallix Fast Launch - Mission Critical Deployment

**Bare-bones, production-ready deployment package for Dytallix blockchain.**

## 🎯 What's Included

This package contains **only** the mission-critical components needed to launch Dytallix:

1. **Frontend Web Presence** - Explains what/why/how Dytallix works
2. **Blockchain Node** - Core node runtime and RPC
3. **API/Faucet Server** - Token distribution backend with server-side signing
4. **Developer Documentation** - Build guides and API references
5. **Evidence Generation** - Proof of capabilities (PQC, dual-token, telemetry)

## Directory Overview
```
dytallix-lean-launch/
├── node/        # Chain node configuration, genesis, local devnet scripts
├── faucet/      # Faucet service (backend signer, rate limiting)
├── explorer/    # (Placeholder) Block & tx explorer UI/service
├── web/         # Future relocated end-user web dApp / marketing site
├── src/         # Current React dashboard source (to be migrated into web/)
├── server/      # API + faucet (will converge with faucet/ structure)
├── ops/         # Operational runbooks, infra manifests, security hardening
├── scripts/     # Automation: build, deploy, integrity, audits, PQC build
├── docs/        # Protocol & product documentation (tokenomics, bridge, PQC)
├── reports/     # Generated reports, changelog summaries
├── artifacts/   # Integrity manifests, audit logs, reproducible build outputs
├── package.json
├── .env.example
└── README.md
```

## Branching Strategy
- `mv-testnet` (long-lived integration branch for MV(T) readiness)
- Feature branches: `feat/<scope>-<desc>` from `mv-testnet`
- Refactor / chores: `chore/<scope>-<desc>`; Hotfix: `fix/<issue>`
- PRs target `mv-testnet`; periodically merged into `main` at milestones

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ and npm
- Rust 1.78+ (for blockchain node)
- Git

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix/dytallix-fast-launch

# 2. Setup environment configuration
cp .env.example .env
# Edit .env to customize port numbers and other settings (see Environment Configuration below)

# 3. Install dependencies
npm install

# 4. Start all services with unified port configuration
./start-all-services.sh

# Alternatively, start services individually:
# npm run server &    # Backend API (PORT from .env, default: 3001)
# npm run dev         # Frontend (FRONTEND_PORT from .env, default: 3000)
```

### Access Points
After starting services, you can access:
- **Frontend Dashboard**: http://localhost:3000
- **Backend / Faucet API**: http://localhost:3001
- **Blockchain Node RPC**: http://localhost:3003
- **QuantumVault API**: http://localhost:3002

### Stopping Services
```bash
# Stop all running services
./stop-services.sh

# Stop all services and clean log files
./stop-services.sh --clean-logs
```

## ⚙️ Environment Configuration

### Port Configuration (SINGLE SOURCE OF TRUTH)
All port assignments are defined in `.env`. The default port scheme is:

| Service | Port | Environment Variable | Description |
|---------|------|---------------------|-------------|
| Frontend | 3000 | `FRONTEND_PORT` | React/Vite development server |
| Backend API | 3001 | `BACKEND_API_PORT` | Faucet + Dashboard API |
| QuantumVault | 3002 | `QUANTUMVAULT_API_PORT` | Encrypted storage service |
| Blockchain Node | 3003 | `BLOCKCHAIN_NODE_PORT` | Primary blockchain JSON-RPC |
| WebSocket | 3004 | `WEBSOCKET_PORT` | Real-time updates |
| Faucet | 3005 | `FAUCET_PORT` | Token distribution service |

**📝 Note**: To change ports, edit `.env` file. All scripts automatically load port configuration from `.env`.

### Essential Environment Variables
Key variables you need to configure (see `.env.example` for complete list):

#### **Port Configuration**
```bash
# All services use these ports (defined in .env)
FRONTEND_PORT=3000
BACKEND_API_PORT=3001
QUANTUMVAULT_API_PORT=3002
BLOCKCHAIN_NODE_PORT=3003
WEBSOCKET_PORT=3004
FAUCET_PORT=3005
```

#### **Cosmos Chain Configuration**
```bash
VITE_LCD_HTTP_URL=http://localhost:1317
VITE_RPC_HTTP_URL=http://localhost:26657
VITE_RPC_WS_URL=ws://localhost:26657/websocket
VITE_CHAIN_ID=dytallix-local
CHAIN_PREFIX=dytallix
```

#### **API & Faucet Configuration**
```bash
VITE_API_URL=http://localhost:3001              # Required: Base API endpoint
VITE_QUANTUMVAULT_API_URL=http://localhost:3002 # QuantumVault API
VITE_BLOCKCHAIN_URL=http://localhost:3003       # Blockchain RPC
VITE_WEBSOCKET_URL=ws://localhost:3004          # WebSocket endpoint
```

#### **Faucet Backend Settings**
```bash
# FAUCET_MNEMONIC="your test mnemonic here"  # NEVER commit real mnemonics!
FAUCET_GAS_PRICE=0.025uDRT
FAUCET_MAX_PER_REQUEST_DGT=2
FAUCET_MAX_PER_REQUEST_DRT=50
FAUCET_COOLDOWN_MINUTES=60
```

#### **Security Feature Flags**
```bash
ENABLE_SEC_HEADERS=1
ENABLE_CSP=1
```

### 🔧 Troubleshooting

#### Port Conflicts
If you encounter "port already in use" errors:
```bash
# Check what's using a port
lsof -i :3000

# Stop all Dytallix services
./stop-services.sh

# If issues persist, kill specific port
lsof -ti :3000 | xargs kill -9
```

#### Service Won't Start
1. Check logs in `logs/` directory: `tail -f logs/[service].log`
2. Verify .env configuration is correct
3. Ensure all dependencies are installed: `npm install`
4. Check if ports are available: `./check-service-ports.sh` (if available)

#### Environment Variable Issues
1. Ensure `.env` file exists (copy from `.env.example`)
2. Check that port variables are set correctly
3. Restart services after changing `.env`: `./stop-services.sh && ./start-all-services.sh`

### Environment Variable Migration (v1.1.1+)
The faucet configuration has been unified for better consistency:

**Removed variables**:
- `FAUCET_URL` (unprefixed legacy)
- `VITE_FAUCET_API_URL` (deprecated)

**Current standard**:
- `VITE_API_URL` - **Required** base API endpoint
- `VITE_FAUCET_URL` - **Optional** explicit faucet endpoint override

**⚠️ Important**: Never commit real mnemonics or secrets. Keep `.env`, `.env.staging`, and production secrets untracked.

## Features
- Multi-page dashboard (Home, Faucet, Tech Specs, AI Modules, Roadmap, Developer Resources)
- Dual-token faucet with bech32 address validation (`dytallix1...`)
- **Post-quantum cryptography (PQC) wallet system** with Dilithium, Falcon, SPHINCS+ support
- Cosmos integration via CosmJS (LCD / RPC / WebSocket placeholders)
- PQC WASM integrity manifest & facade (`src/crypto/pqc`)
- **Gas accounting system** with deterministic fee calculation and CLI support
- **Smart Contract Security Scanner** with Slither + Mythril integration
- Responsive UI with modular component structure

## PQC Wallet System

Dytallix provides native post-quantum cryptography wallet functionality:

### Web SDK
```typescript
import { DytallixWalletProvider } from './lib/wallet/provider'

const wallet = new DytallixWalletProvider()
const account = await wallet.createKey({
  algo: 'dilithium',
  label: 'My PQC Wallet',
  passphrase: 'secure_passphrase'
})
```

### CLI (dytx)
```bash
cd cli/dytx && npm install && npm run build

# Generate new key
dytx keygen --algo dilithium --label "dev-key"

# Check balances
dytx balances dytallix1abc123...

# Transfer tokens
dytx transfer --from addr1 --to addr2 --amount 1.5 --denom udgt
```

### Supported Algorithms
- **Dilithium**: NIST standardized, balanced security/performance
- **Falcon**: Compact signatures, faster verification
- **SPHINCS+**: Conservative choice, hash-based security

For detailed integration guide, see [`docs/wallet-migration.md`](docs/wallet-migration.md) and [`docs/cli.md`](docs/cli.md).

## Smart Contract Security Scanner

The integrated security scanner provides comprehensive analysis of Solidity smart contracts:

- **Static Analysis**: Slither integration for AST-based vulnerability detection
- **Symbolic Execution**: Mythril integration for runtime vulnerability discovery
- **Vulnerability Classification**: Automatic severity classification (critical/high/medium/low)
- **Source Annotation**: Line-level vulnerability mapping with inline markers
- **API Endpoint**: `/api/contract/scan` with rate limiting and validation
- **Security Hardening**: Input validation, timeouts, concurrency limits

For detailed documentation, see [`docs/security-scanner.md`](docs/security-scanner.md).

## Gas System Overview

Dytallix implements a deterministic gas accounting system:

- **Fee unit**: `datt` (1 DGT = 1,000,000,000 datt)
- **Gas calculation**: `fee = gas_limit * gas_price`
- **CLI integration**: `--gas` and `--gas-price` flags with automatic estimation
- **Out-of-gas handling**: Full revert with deterministic gas usage tracking

For detailed information, see [`docs/GAS.md`](docs/GAS.md).

## Scripts
- `npm run dev` – Frontend development server
- `npm run server` – Backend / faucet server
- `npm run build` – Production build (outputs `dist/`)
- `npm run preview` – Preview built assets locally
- `npm run lint` – ESLint

## Deployment (High Level)
1. Prepare `node/` genesis & configuration (align with authoritative chain params).
2. Build: `npm ci && npm run build` → `dist/` static assets.
3. Containerize / publish images (CI) excluding secrets.
4. Provision infra (Terraform/Ansible in `ops/`).
5. Configure reverse proxy / CDN pointing to frontend + API.

## Security & Integrity
- PQC modules loaded with integrity checks; unsigned / mismatched hashes rejected.
- Strict ignore rules to prevent secret leakage (.env*, build caches, artifacts tmp).
- Rate-limited faucet with configurable per-request caps & cooldown.

## Security Policy
See [SECURITY.md](SECURITY.md) for coordinated vulnerability disclosure guidelines.

## Contribution Workflow
```bash
# From mv-testnet
git checkout mv-testnet && git pull origin mv-testnet
# Create feature branch
git checkout -b feat/<scope>-<short>
# Commit & push
git push -u origin feat/<scope>-<short>
# Open PR: feat/<scope>-<short> -> mv-testnet
```

## Development Guidelines
- Functional React components with hooks
- Keep components focused & composable
- Enforce linting before PR merge
- Gradual migration of legacy `REACT_APP_` env vars → `VITE_` naming

## Troubleshooting
- Port conflicts: adjust PORT / Vite port via env or config
- Faucet errors: ensure mnemonic funded on local devnet; check cooldown values
- Cosmos RPC issues: verify node running (26657 / 1317 endpoints)

## License
MIT (see `LICENSE`).

---

## Running the Governance Demo

Dytallix provides an end-to-end governance demonstration that showcases the complete proposal lifecycle from submission to execution.

### Overview

The governance demo demonstrates:
1. **Proposal Submission**: Create a parameter change proposal (gas_limit)
2. **Deposit Period**: Meet minimum deposit requirements
3. **Voting Period**: Validators cast votes with their voting power
4. **Proposal Execution**: Automatically execute approved proposals
5. **State Verification**: Confirm parameter changes are applied

### Running the Demo

```bash
# From the repository root
./scripts/demo/governance_demo.sh
```

### Demo Flow

The script simulates a complete governance cycle:

**Step 1: Submit Proposal**
- Creates proposal to change gas_limit from 21,000 to 50,000
- Initial deposit of 1,000 DGT from proposer
- Proposal enters deposit period (height 1000-1100)

**Step 2: Meet Deposit**
- Minimum deposit threshold met
- Proposal transitions to voting period (height 1100-1200)

**Step 3: Validator Voting**
- Validator 1: YES vote with 3,000 DGT voting power
- Validator 2: YES vote with 2,500 DGT voting power
- Validator 3: YES vote with 2,000 DGT voting power
- Total: 7,500 DGT YES (75% turnout, 100% approval)

**Step 4: Tally & Execute**
- Quorum met: 75% > 33.4% required ✅
- Threshold met: 100% YES > 50% required ✅
- Proposal executes at height 1200
- Parameter change applied: gas_limit = 50,000

**Step 5: State Verification**
- New parameter value confirmed in chain state
- Historical change record maintained
- Deposits refunded to proposer

### Evidence Artifacts

The demo generates comprehensive evidence files in `launch-evidence/governance/`:

- **`proposal.json`**: Full proposal details including parameter change specification
- **`votes.json`**: Complete voting record with tally results
- **`exec.log`**: Detailed execution log with validation steps and state changes
- **`final_state.json`**: Updated chain parameters with verification data

### Use Cases

This demo validates:
- ✅ On-chain governance parameter changes
- ✅ Voting power calculation and quorum logic
- ✅ Proposal execution with state persistence
- ✅ Deposit refund mechanism
- ✅ Event emission for governance actions

### CI/CD Integration

The governance demo is integrated into the launch evidence pack. Run the evidence orchestrator to include governance validation:

```bash
make evidence-all
```

---

## Faucet (Prod)

The production Dytallix testnet faucet provides dual-token dispensing capabilities with robust server-side rate limiting and PQC wallet integration.

### Features

- **Dual-Token Support**: Request both DGT (Governance) and DRT (Reward) tokens in a single request
- **Server-Side Rate Limiting**: Redis-backed rate limiting with in-memory fallback
- **PQC Wallet Integration**: Automatic address population from local PQC wallet storage
- **Standardized API**: RESTful endpoints with strict TypeScript DTO types
- **Enhanced UX**: Real-time feedback with toast notifications and cooldown tracking

### API Endpoints

#### POST `/api/faucet` - Request Tokens
Dispense tokens to a specified address.

**New Format (Dual-Token):**
```bash
curl -X POST http://localhost:8787/api/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "dytallix1example123456789012345678901234567890",
    "tokens": ["DGT", "DRT"]
  }'
```

**Legacy Format (Single Token):**
```bash
curl -X POST http://localhost:8787/api/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "dytallix1example123456789012345678901234567890",
    "token": "DGT"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "dispensed": [
    {
      "symbol": "DGT",
      "amount": "2",
      "txHash": "0x..."
    },
    {
      "symbol": "DRT",
      "amount": "50",
      "txHash": "0x..."
    }
  ],
  "message": "Successfully dispensed DGT + DRT tokens"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "RATE_LIMIT",
  "message": "Rate limit exceeded. Please wait 3600 seconds before trying again.",
  "retryAfterSeconds": 3600
}
```

#### GET `/api/status` - Service Health
Check faucet service status and configuration.

```bash
curl http://localhost:8787/api/status
```

**Response:**
```json
{
  "ok": true,
  "network": "dytallix-testnet-1",
  "redis": false,
  "rateLimit": {
    "windowSeconds": 3600,
    "maxRequests": 1
  },
  "uptime": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET `/api/balance?address=<address>` - Check Balances
Query token balances for an address.

```bash
curl "http://localhost:8787/api/balance?address=dytallix1example123456789012345678901234567890"
```

**Response:**
```json
{
  "address": "dytallix1example123456789012345678901234567890",
  "balances": [
    {
      "symbol": "DGT",
      "amount": "10",
      "denom": "udgt"
    },
    {
      "symbol": "DRT",
      "amount": "100",
      "denom": "udrt"
    }
  ]
}
```

### Rate Limiting

The faucet implements dual-layer rate limiting:
- **Per Address**: Prevents same address from requesting too frequently
- **Per IP**: Prevents IP-based abuse
- **Per Token**: Independent cooldowns for DGT (24h) and DRT (6h)

#### Configuration
```bash
# Rate limiting window (seconds)
FAUCET_RATE_WINDOW_SECONDS=3600

# Max requests per window
FAUCET_RATE_MAX_REQUESTS=1

# Redis for distributed rate limiting (optional)
FAUCET_REDIS_URL=redis://localhost:6379

# Token-specific cooldowns
FAUCET_COOLDOWN_MINUTES=60
```

#### Redis Support
When `FAUCET_REDIS_URL` is set, the faucet uses Redis for distributed rate limiting. This enables:
- Shared rate limits across multiple faucet instances
- Persistent rate limit state across server restarts
- Better scalability for high-traffic scenarios

If Redis is unavailable, the system automatically falls back to in-memory rate limiting.

### Environment Variables

```bash
# ============================
# Faucet Configuration
# ============================
FAUCET_PRIVATE_KEY=              # Signing key for transactions
FAUCET_MAX_PER_REQUEST_DGT=2     # DGT tokens per request
FAUCET_MAX_PER_REQUEST_DRT=50    # DRT tokens per request
FAUCET_COOLDOWN_MINUTES=60       # Default cooldown period

# Rate limiting
FAUCET_RATE_WINDOW_SECONDS=3600  # Rate limit window
FAUCET_RATE_MAX_REQUESTS=1       # Max requests per window
FAUCET_REDIS_URL=                # Optional Redis URL

# Token addresses
DGT_TOKEN_ADDRESS=               # DGT token contract address
DRT_TOKEN_ADDRESS=               # DRT token contract address
```

### Development

```bash
# Start faucet server
npm run server

# Start frontend with faucet integration
npm run dev

# Run faucet tests
npm run test src/__tests__/faucet-dual-token.test.js

# Run e2e tests (requires Cypress)
npm install --save-dev cypress
npx cypress run --spec "cypress/e2e/faucet-dual-token.cy.js"
```

### Architecture

The production faucet follows a clean architecture:

```
Types (TypeScript DTOs)
├── types/faucet.ts          # Shared request/response types
└── types/index.ts           # Barrel exports

Server (Backend API)
├── server/index.js          # Express app with faucet endpoints
├── server/rateLimit.js      # Pluggable rate limiting (Redis/Memory)
├── server/transfer.js       # Token transfer logic
└── server/logger.js         # Structured logging

Frontend (React)
├── src/components/FaucetForm.jsx  # Dual-token faucet UI
├── src/lib/api.js                 # API client functions
└── src/utils/faucet.ts            # Legacy compatibility layer

Tests
├── src/__tests__/faucet-dual-token.test.js  # Backend unit tests
└── cypress/e2e/faucet-dual-token.cy.js      # E2E integration tests
```

### Security Notes

- ⚠️ **Never expose `FAUCET_PRIVATE_KEY` to clients**
- ✅ **All rate limiting enforced server-side only**
- ✅ **Address validation performed on backend**
- ✅ **Structured error responses prevent information leakage**
- ✅ **CORS and security headers configured in production**

### Migration from Legacy Faucets

Previous faucet implementations in `frontend/` and `dytallix-lean-launch-1/` have been consolidated into this production system. Key improvements:

- **Single Source of Truth**: No more duplicate faucet UIs
- **Enhanced Features**: Dual-token support, better rate limiting
- **Better Architecture**: Shared types, comprehensive testing
- **Improved UX**: Wallet integration, real-time feedback

For migration details, see `FAUCET_CONSOLIDATION_MIGRATION.md`.

---

## Next Steps
- Migrate `src/` dashboard into `web/` directory
- ~~Converge faucet logic into dedicated `faucet/` service~~ ✅ **COMPLETED**
- Implement explorer indexing & UI expansion
- Extend AI module integrations (anomaly detection, transaction classification)

## Launch Evidence Pack

The [launch-evidence](launch-evidence) directory provides a centralized audit-friendly "proof binder" that aggregates launch evidence artifacts across all critical system components. This evidence pack contains placeholder files organized by domain (governance, staking, contracts, AI risk, monitoring, PQC, rollback, onboarding, wallet, security) that can be populated with actual audit artifacts as they are generated during the launch process.

### E2E PQC User Journey Test

A comprehensive end-to-end test for PQC-compliant token transfers is available:

```bash
# Run the full E2E test (creates timestamped evidence directory)
make evidence-e2e-pqc

# Run unit tests only
make test-e2e-pqc

# Run integration verification
make verify-e2e-pqc
```

The test generates tamper-evident artifacts under `launch-evidence/e2e-user-journey/<timestamp>/` including:
- Wallet creation (Dilithium3 PQC)
- Dual token transfers (DGT + DRT)
- Transaction receipts and confirmations
- AI risk analysis (if PulseGuard available)
- Complete audit logs and summary

See [scripts/e2e/USER_JOURNEY_README.md](scripts/e2e/USER_JOURNEY_README.md) for detailed documentation.

To regenerate or initialize the evidence pack structure, run:
```bash
scripts/init-launch-evidence.sh
```

The script is idempotent and will not overwrite existing evidence files, making it safe to run multiple times. All files start as placeholders and should be replaced with actual evidence during the launch preparation process.

## Changelog
See `CHANGELOG.md` for unified history (mv-testnet + releases).
