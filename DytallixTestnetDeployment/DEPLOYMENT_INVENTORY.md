# Dytallix Testnet Deployment Inventory

This inventory is derived from the Dytallix Testnet MVP plan and maps each mission‑critical asset to a deployable location in this folder. Items marked with 🟢➜ are copied and deployment ready in this package.

Notes:
- Excluded heavy build outputs (not included in this package):
  - node_modules/
  - dist/ and build/
  - target/ (Rust)
  - .next/ (Next.js)
  - coverage/
  - logs/
  - tmp/ or .tmp/
  - .git/
- Required environment files to provide per environment (e.g., devnet, testnet-hetzner, prod):
  - .env at repository root (copy from .env.example)
  - node/.env or node/.env.testnet
  - server/.env or server/.env.testnet
  - faucet/.env or faucet/.env.testnet
  - frontend/.env.local or frontend/.env.testnet
  - explorer/.env or explorer/.env.testnet
  - cli/dytx/.env
  - helm/values-testnet.yaml (override for values.yaml)

## Core blockchain node and runtime
- 🟢➜ dytallix-lean-launch/Dockerfile → node/Dockerfile
- 🟢➜ dytallix-lean-launch/Dockerfile.node → node/Dockerfile.node
- 🟢➜ dytallix-lean-launch/docker-compose.yml → node/docker-compose.yml
- 🟢➜ dytallix-lean-launch/genesis.json → node/genesis.json
- 🟢➜ dytallix-lean-launch/config/ → node/config/

## Bank, staking, and rewards (DRT emissions)
- 🟢➜ dytallix-lean-launch/scripts/emissions_cron.sh → scripts/emissions_cron.sh
- 🟢➜ dytallix-lean-launch/server/tokenomics.json → server/tokenomics.json (via server/)

## Governance (DAO)
- 🟢➜ dytallix-lean-launch/scripts/governance-demo.sh → scripts/governance-demo.sh
- 🟢➜ dytallix-lean-launch/scripts/gov_param_change.sh → scripts/gov_param_change.sh
- 🟢➜ dytallix-lean-launch/scripts/proposal.sh → scripts/proposal.sh

## WASM smart contracts
- 🟢➜ dytallix-lean-launch/contracts/ → contracts/
- 🟢➜ dytallix-lean-launch/artifacts/ → artifacts/
- 🟢➜ dytallix-lean-launch/scripts/build_pqc_wasm.sh → scripts/build_pqc_wasm.sh
- 🟢➜ dytallix-lean-launch/scripts/pqc_build_wasm.sh → scripts/pqc_build_wasm.sh
- 🟢➜ dytallix-lean-launch/scripts/build_counter_wasm.sh → scripts/build_counter_wasm.sh
- 🟢➜ dytallix-lean-launch/scripts/deploy_contract.sh → scripts/deploy_contract.sh

## PQC keys and signing
- 🟢➜ dytallix-lean-launch/cli/ → cli/
- 🟢➜ dytallix-lean-launch/scripts/pqc_runtime_check.sh → scripts/pqc_runtime_check.sh
- 🟢➜ dytallix-lean-launch/scripts/gen-pqc-mnemonic.cjs → scripts/gen-pqc-mnemonic.cjs
- 🟢➜ dytallix-lean-launch/scripts/gen-mnemonic.cjs → scripts/gen-mnemonic.cjs

## AI-integrated services (Oracle)
- 🟢➜ dytallix-lean-launch/server/ → server/
- 🟢➜ dytallix-lean-launch/scripts/test_ai_oracle.sh → scripts/test_ai_oracle.sh

## Wallet, faucet, and funding
- 🟢➜ dytallix-lean-launch/faucet/ → faucet/
- 🟢➜ dytallix-lean-launch/docker-compose.faucet.yml → faucet/docker-compose.faucet.yml

## Frontend and Explorer
- 🟢➜ dytallix-lean-launch/frontend/ → frontend/
  - 🟢➜ frontend/src/pages/ (synced):
    - Block.jsx, Changelog.jsx, CodeShield.jsx, Contracts.jsx, Dashboard.jsx, Deploy.jsx,
      DevResources.jsx, Documentation.jsx, Explorer.jsx, Faucet.jsx, FlowRate.jsx,
      Governance.jsx, Home.jsx, Modules.jsx, Monitor.jsx, NetFlux.jsx, NotFound.jsx,
      PulseGuard.jsx, Roadmap.jsx, StakeBalancer.jsx, StakingRewardsPage.jsx, TechStack.jsx,
      Tx.jsx, Wallet.jsx
    - Subfolders: accounts/, contracts/, governance/, staking/, transactions/
- 🟢➜ dytallix-lean-launch/explorer/ → explorer/

## Observability and soak testing
- 🟢➜ dytallix-lean-launch/scripts/evidence/soak_run.sh → observability/soak_run.sh

## Runbooks and deployment docs
- 🟢➜ dytallix-lean-launch/LAUNCH-RUNBOOK.sh → docs/LAUNCH-RUNBOOK.sh
- 🟢➜ dytallix-lean-launch/LAUNCH-CHECKLIST.md → docs/LAUNCH-CHECKLIST.md
- 🟢➜ dytallix-lean-launch/JOIN-TESTNET.md → docs/JOIN-TESTNET.md
- 🟢➜ dytallix-lean-launch/README.md → docs/README.md

## Helm / Kubernetes (optional)
- 🟢➜ dytallix-lean-launch/helm/ → helm/

---

Validation
- Ensure secrets and environment variables are configured (Vault or .env files) before starting services.
- Review server/.env*, faucet configs, and RPC endpoints to match Hetzner environment.
- Use docs/LAUNCH-RUNBOOK.sh to drive the deployment sequence.
