# QuantumVault MVP

A production-ready Post-Quantum Cryptography (PQC) asset management platform that discovers non-PQC crypto usage, computes quantum risk, wraps assets with PQC envelope encryption, and proves remediation with blockchain attestations.

## Features

- **Real TLS Scanning**: Automated discovery of TLS endpoints, certificate chain extraction, and PQC compliance assessment
- **Risk Scoring**: Deterministic 0-100 risk scores with intelligent classification based on exposure, sensitivity, and cryptographic algorithms
- **PQC Wrapping**: Envelope encryption using Kyber KEM + HKDF-SHA256 + AES-256-GCM
- **HashiCorp Vault Integration**: Secure storage of sensitive key material with fail-fast validation
- **Blockchain Attestation**: Immutable proof of remediation on EVM-compatible blockchain
- **Policy Engine**: Rule-based asset evaluation and bulk remediation workflows
- **Dashboard & Analytics**: Real-time KPIs, trends, and migration timeline visualization
- **RBAC**: Role-based access control (ADMIN, SECURITY_ENGINEER, VIEWER) with comprehensive audit logging

## Architecture

```
├── backend/          # NestJS + Fastify API server
├── frontend/         # React + TypeScript SPA
├── contracts/        # Solidity smart contracts (Hardhat)
├── infra/            # Docker Compose & deployment configs
├── docs/             # Documentation
├── scripts/          # Automation & acceptance tests
└── dist/             # Distribution bundle
```

## Tech Stack

### Backend
- **Framework**: NestJS with Fastify adapter
- **Language**: TypeScript (Node.js 20+)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Queue**: BullMQ + Redis for asynchronous job processing
- **Auth**: JWT with bcrypt password hashing, RBAC middleware
- **Vault**: HashiCorp Vault for secrets management
- **Blockchain**: Ethers.js v6 for EVM transactions

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite or Next.js
- **UI Components**: shadcn/ui
- **Charts**: Recharts
- **Styling**: Tailwind CSS

### Smart Contracts
- **Platform**: EVM (Ethereum Virtual Machine)
- **Language**: Solidity ^0.8.24
- **Framework**: Hardhat
- **Network**: Configurable (Hardhat local, Sepolia, or custom)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Secrets**: HashiCorp Vault
- **Blockchain Node**: Geth (dev mode) or external RPC

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- npm or yarn

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
cd QuantumVaultMVP

# Start all services
cd infra
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Deploy smart contract
cd ../contracts
npm install
npm run deploy

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000/api/v1
# Vault UI: http://localhost:8200 (token: root)
```

### Option 2: Local Development

```bash
# 1. Start infrastructure services
cd infra
docker-compose up -d postgres redis vault blockchain

# 2. Set up backend
cd ../backend
cp .env.example .env
# Edit .env with your configuration
npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev

# 3. Deploy contracts
cd ../contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
# Copy the contract address to backend .env

# 4. Set up frontend
cd ../frontend
npm install
npm run dev
```

## Default Credentials

**Admin User** (created via seed):
- Email: `admin@quantumvault.local`
- Password: `QuantumVault2024!`

**Security Engineer** (for testing):
- Email: `engineer@quantumvault.local`
- Password: `Engineer2024!`

## API Documentation

The backend exposes a RESTful API under `/api/v1`:

### Authentication
- `POST /api/v1/auth/login` - Login with email/password
- `GET /api/v1/auth/me` - Get current user profile
- `POST /api/v1/auth/logout` - Logout and invalidate session

### Scan Targets
- `GET /api/v1/scans/targets` - List scan targets
- `POST /api/v1/scans/targets` - Create a new scan target
- `POST /api/v1/scans/trigger/:targetId` - Trigger a scan
- `GET /api/v1/scans/status/:scanId` - Get scan status
- `GET /api/v1/scans/history` - Get scan history

### Assets
- `GET /api/v1/assets` - List assets (with filters)
- `GET /api/v1/assets/:id` - Get asset details
- `PUT /api/v1/assets/:id/metadata` - Update asset metadata
- `POST /api/v1/assets/:id/key-material` - Ingest key material
- `POST /api/v1/assets/bulk-action` - Perform bulk actions

### Policies
- `GET /api/v1/policies` - List policies
- `POST /api/v1/policies` - Create policy
- `POST /api/v1/policies/:id/activate` - Activate policy
- `POST /api/v1/policies/:id/evaluate` - Evaluate policy

### Anchors
- `GET /api/v1/anchors` - List PQC anchors
- `POST /api/v1/anchors` - Create new anchor
- `POST /api/v1/anchors/:id/rotate` - Rotate anchor keys

### Wrapping
- `POST /api/v1/wrapping/wrap` - Wrap single asset
- `POST /api/v1/wrapping/bulk-wrap-by-policy/:policyId` - Bulk wrap assets
- `GET /api/v1/wrapping/job-status/:jobId` - Get wrapping job status

### Attestation
- `POST /api/v1/attestation/create-job` - Create attestation job
- `GET /api/v1/attestation/job-status/:jobId` - Get attestation job status
- `GET /api/v1/attestation/asset/:assetId` - Get asset attestations

### Dashboard
- `GET /api/v1/dashboard/kpis` - Get KPI aggregates
- `GET /api/v1/dashboard/trends?days=30` - Get trend data
- `GET /api/v1/dashboard/migration-timeline` - Get migration timeline
- `POST /api/v1/dashboard/snapshot` - Capture current snapshot

For detailed API documentation, see [docs/API.md](docs/API.md)

## Environment Variables

See `.env.example` files in `backend/` and `frontend/` directories for all configuration options.

### Critical Configuration

**Backend:**
- `DATABASE_URL`: PostgreSQL connection string (required)
- `VAULT_ADDR`: HashiCorp Vault address (required)
- `VAULT_TOKEN`: Vault authentication token (required)
- `BLOCKCHAIN_RPC_URL`: Ethereum RPC endpoint
- `ATTESTATION_CONTRACT_ADDRESS`: Deployed contract address
- `JWT_SECRET`: Secret for JWT signing (change in production!)

**Frontend:**
- `VITE_API_URL`: Backend API URL

## Security Notes

⚠️ **IMPORTANT**: This MVP includes default credentials and tokens for development purposes. **DO NOT USE IN PRODUCTION** without changing:

1. Database passwords
2. JWT secrets
3. Vault tokens
4. Blockchain private keys
5. Admin user credentials

See [docs/SECURITY.md](docs/SECURITY.md) for comprehensive security guidance.

## Testing

### Run Acceptance Tests

```bash
cd scripts
./e2e.sh
```

This will:
1. Start the full stack
2. Create test users
3. Add a real TLS target
4. Run a scan and verify evidence
5. Create and evaluate a policy
6. Ingest key material
7. Perform PQC wrapping
8. Submit blockchain attestation
9. Query dashboard KPIs
10. Report pass/fail

## Documentation

- [INSTALL.md](docs/INSTALL.md) - Detailed installation instructions
- [RUNBOOK.md](docs/RUNBOOK.md) - Operations runbook
- [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) - Administrator guide
- [SECURITY.md](docs/SECURITY.md) - Security considerations
- [API.md](docs/API.md) - Complete API reference

## Project Structure

```
QuantumVaultMVP/
├── backend/
│   ├── src/
│   │   ├── auth/              # Authentication & RBAC
│   │   ├── assets/            # Asset management
│   │   ├── scans/             # TLS scanning
│   │   ├── policies/          # Policy engine
│   │   ├── anchors/           # PQC anchor management
│   │   ├── wrapping/          # PQC wrapping service
│   │   ├── attestation/       # Blockchain attestation
│   │   ├── dashboard/         # Analytics & KPIs
│   │   ├── vault/             # HashiCorp Vault client
│   │   ├── blockchain/        # Blockchain integration
│   │   ├── risk/              # Risk scoring engine
│   │   ├── tls-scanner/       # Real TLS scanner
│   │   ├── database/          # Prisma service
│   │   └── queue/             # BullMQ configuration
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/             # React pages
│   │   ├── components/        # Reusable components
│   │   ├── api/               # API client
│   │   └── styles/            # Styling
│   ├── public/
│   │   ├── QuantumVault.png   # Brand logo
│   │   ├── QuantumVaultLogin.png
│   │   └── DytallixLogo.png
│   ├── Dockerfile
│   └── package.json
├── contracts/
│   ├── contracts/
│   │   └── QuantumVaultAttestation.sol
│   ├── scripts/
│   │   └── deploy.js
│   └── hardhat.config.js
├── infra/
│   ├── docker-compose.yml     # Full stack orchestration
│   └── helm/                  # Kubernetes charts (optional)
├── docs/
│   ├── INSTALL.md
│   ├── RUNBOOK.md
│   ├── ADMIN_GUIDE.md
│   ├── SECURITY.md
│   └── API.md
├── scripts/
│   └── e2e.sh                 # End-to-end acceptance tests
└── dist/                      # Distribution bundle
```

## License

MIT

## Support

For issues, questions, or contributions, please open an issue on the GitHub repository.

## Roadmap

- [ ] Real PQC KEM integration (liboqs bindings)
- [ ] Multi-chain support (Polygon, Arbitrum, etc.)
- [ ] Enhanced policy DSL
- [ ] Advanced analytics & reporting
- [ ] SSO/SAML integration
- [ ] Mobile app
- [ ] API rate limiting & throttling
- [ ] Automated backup & disaster recovery
