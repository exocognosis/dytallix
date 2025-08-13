# Dytallix Lean Launch Frontend

A React-based frontend application for the Dytallix post-quantum blockchain lean launch. This developer-focused website showcases the platform's capabilities, provides access to testnet resources, and demonstrates AI-enhanced security features.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix/dytallix-lean-launch
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
- Copy `.env.example` to `.env` and set Cosmos LCD/RPC/WS and faucet mnemonic.
- Or use `.env.staging` for the provided testnet endpoints.

4. Start the development servers:
```bash
# Start API (faucet + proxy)
npm run server
# In a separate terminal, start the frontend	npm run dev
```
Then open `http://localhost:5173`.

## 📦 Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm test` - Run unit tests (vitest)

## 🔌 Cosmos Configuration

Set these environment variables (see `.env.example`):

- `VITE_LCD_HTTP_URL` — Cosmos LCD HTTP endpoint
- `VITE_RPC_HTTP_URL` — Tendermint RPC HTTP endpoint
- `VITE_RPC_WS_URL` — Tendermint RPC WebSocket endpoint
- `VITE_CHAIN_ID` — Chain ID
- `CHAIN_PREFIX` — Bech32 address prefix (default: `dytallix`)
- `RPC_HTTP_URL` — Optional explicit alias for API server to call RPC (falls back to VITE_RPC_HTTP_URL)
- `FAUCET_MNEMONIC` — Mnemonic for faucet signer (fund this account)
- `FAUCET_GAS_PRICE` — Gas price string (e.g., `0.025uDRT`)
- `FAUCET_MAX_PER_REQUEST_DGT` — Amount in display units (6 decimals)
- `FAUCET_MAX_PER_REQUEST_DRT` — Amount in display units (6 decimals)
- `FAUCET_COOLDOWN_MINUTES` — Per-IP+address cooldown

## 📊 Dashboard API (server)

The dev API now exposes minimal Cosmos-backed endpoints used by the dashboard:
- `GET /api/status/height` — Returns `{ ok, height }` from `${RPC_HTTP_URL}/status`.
- `GET /api/status/node` — Returns `{ ok, status }` raw Tendermint status JSON.

These are proxied via Vite in dev (see `vite.config.js`) and can be fronted by nginx in production.

## 🧪 Tests

Vitest is used for unit tests and component tests. EVM/Hardhat tests and configs have been removed.

## 🧹 Migration Notes

This codebase was migrated from an EVM/Hardhat prototype to Cosmos SDK:
- Removed Hardhat configs, artifacts, and scripts.
- Replaced `ethers` faucet logic with CosmJS (`SigningStargateClient`).
- Frontend faucet now validates bech32 addresses and autofills from the local PQC wallet.
- All runtime network calls use Cosmos LCD/RPC/WS endpoints.

See `docs/evm_migration/MATCHES.md` for a full audit log of EVM/Hardhat artifacts and actions.
