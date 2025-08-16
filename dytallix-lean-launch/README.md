# Dytallix Lean Launch MV(T) Monorepo Layout

This directory standardizes the minimum viable public testnet (MV(T)) structure.

## Directory Overview
- `node/` – Chain node configuration, genesis, scripts to start local devnet.
- `faucet/` – Dedicated faucet service (Express or lightweight server) for DGT / DRT.
- `explorer/` – (Placeholder) Block & tx explorer UI/service.
- `web/` – End-user web dApp or marketing site (separate from developer dashboard).
- `src/` – React dashboard application source (legacy location retained until migrated into `web/`).
- `server/` – API + faucet implementation backing the dashboard (will converge with `faucet/`).
- `ops/` – Operational runbooks, deployment manifests, infra-as-code snippets, security hardening docs.
- `docs/` – Protocol & product documentation (tokenomics, bridge, PQC, audits summaries).
- `scripts/` – Automation scripts (build, deploy, integrity, audits) invoked by CI/CD.
- `artifacts/` – Build outputs, integrity manifests, audit logs (non-source, reproducible).
- `reports/` – Changelog & generated reports summarizing PR merges for mv-testnet.

## Branching Strategy
- `mv-testnet` (long-lived) – Integration branch for public MV(T) testnet readiness.
- Feature branches: `feat/<scope>-<short-desc>` from `mv-testnet`.
- Chore/refactor: `chore/<scope>-<short>`; Hotfixes: `fix/<issue>`.
- PRs target `mv-testnet`, then periodically merged into `main` once milestones complete.

## Environment Files
Copy `.env.example` to `.env`. Never commit real mnemonics or secrets. `.env.staging` may exist locally but is ignored.

## Devnet Quick Start
```bash
# From repo root (this folder)
cp .env.example .env
npm install
npm run server &        # API + faucet (port 8787)
npm run dev             # Frontend (port 5173)
```

## Testnet Deployment (High Level)
1. Prepare `node/` genesis & config (copy from authoritative genesis source).
2. Build artifacts: `npm ci && npm run build` (outputs to `dist/`).
3. Publish container/images (CI) – exclude secrets.
4. Apply infra (Terraform/Ansible) stored under `ops/`.
5. Point DNS / reverse proxy → web + API.

## Changelog
See `reports/CHANGELOG.md` for mv-testnet scoped changes.

## Security & Integrity
- PQC WASM integrity manifest validated on load (see `src/crypto/pqc`).
- Security headers opt-in via env flags. See `server/` README (future) for details.

## Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

## 🏗️ Project Structure (Frontend App)
```
dytallix-lean-launch/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── pages/
│   ├── components/
│   ├── styles/
│   ├── lib/
│   ├── data/
│   ├── assets/
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
└── README.md
```
(See inline codebase for full component list.)

## 🎯 Features
- Home, Faucet, Tech Specs, AI Modules, Roadmap, Developer Resources pages
- AI demos: anomaly detection placeholder, smart contract scanner placeholder
- Cosmos integration via CosmJS (LCD/RPC/WebSocket)
- Dual-token faucet (DGT governance, DRT reward)
- Environment-driven configuration
- Responsive design with CSS Modules

## 🔧 Configuration
Environment variables (see `.env.staging`):
- `VITE_LCD_HTTP_URL`, `VITE_RPC_HTTP_URL`, `VITE_RPC_WS_URL`, `VITE_CHAIN_ID`
- `VITE_FAUCET_API_URL` for faucet backend
- `VITE_DEV_MODE` enables mock fallback logic

## 🔌 Cosmos Integration
- Bech32 address validation (`dytallix1...`)
- Real-time websocket capable configuration (future events streaming)

## 🚀 Deployment
`npm run build` → `dist/` static assets deployable to any CDN / static host.

## 🤝 Contributing
1. Fork
2. Branch (`feat/`, `fix/`)
3. PR to integration branch

## 📝 Development Guidelines
- Functional React components w/ hooks
- Keep components focused & composable
- Strict linting & type hints (where TS adopted)

## 🐛 Troubleshooting
- Port conflicts: adjust in `vite.config.js`
- API errors: verify backend running (`npm run server`)

## 📄 License
MIT (see LICENSE)

## 🔗 Links
- Website: https://dytallix.com
- Docs: https://docs.dytallix.com
- Explorer (testnet placeholder): https://testnet.dytallix.com

## Next Steps
- Relocate `server/` → `faucet/` + `node/` separation
- Migrate dashboard `src/` → `web/`
- Implement explorer service or external indexer integration
