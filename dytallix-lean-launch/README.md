# Dytallix Lean Launch MV(T) Monorepo

This directory hosts the standardized minimum viable public testnet (MV(T)) environment: frontend dashboard, faucet/backend, explorer placeholder, node configs, scripts, docs, and security/audit artifacts.

## Purpose
- Cosmos-focused testnet frontend & services (no EVM / Hardhat remnants)
- Dual-token (DGT governance / DRT reward) faucet integration
- PQC (post-quantum cryptography) groundwork & integrity validation
- **Deterministic gas accounting system** for all transaction types
- Foundation for AI modules, explorer expansion, and deployment automation

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

## Quick Start (Local Devnet)
```bash
# Clone
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix/dytallix-lean-launch

# Setup environment
cp .env.example .env
# Edit .env values as needed

# Install deps
npm install

# Start backend (faucet/API)
npm run server &   # expected PORT=8787

# Start frontend (Vite dev server)
npm run dev        # default 5173
```
Access:
- Frontend Dashboard: http://localhost:5173
- Backend / Faucet API: http://localhost:8787

## Environment Configuration
Key variables (see `.env.example`):
- Cosmos: `VITE_LCD_HTTP_URL`, `VITE_RPC_HTTP_URL`, `VITE_RPC_WS_URL`, `VITE_CHAIN_ID`, `CHAIN_PREFIX`
- Faucet: `FAUCET_MNEMONIC` (dev only), `FAUCET_MAX_PER_REQUEST_DGT`, `FAUCET_MAX_PER_REQUEST_DRT`, `FAUCET_COOLDOWN_MINUTES`, `FAUCET_GAS_PRICE`
- Security: `ENABLE_SEC_HEADERS`, `ENABLE_CSP`
- Legacy React compatibility vars: `REACT_APP_*` (phase-out; prefer `VITE_` prefix)

Never commit real mnemonics or secrets. `.env`, `.env.staging`, production secrets remain untracked.

## Features
- Multi-page dashboard (Home, Faucet, Tech Specs, AI Modules, Roadmap, Developer Resources)
- Dual-token faucet with bech32 address validation (`dytallix1...`)
- Cosmos integration via CosmJS (LCD / RPC / WebSocket placeholders)
- PQC WASM integrity manifest & facade (`src/crypto/pqc`)
- **Gas accounting system** with deterministic fee calculation and CLI support
- Responsive UI with modular component structure

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

## Next Steps
- Migrate `src/` dashboard into `web/` directory
- Converge faucet logic into dedicated `faucet/` service (deprecate legacy server/ duplication)
- Implement explorer indexing & UI expansion
- Extend AI module integrations (anomaly detection, transaction classification)

## Changelog
See `CHANGELOG.md` for unified history (mv-testnet + releases).
