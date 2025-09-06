# Runbook (MVP)

- Start node RPC: see `dytallix-lean-launch/node` README; ensure `DYT_ENABLE_GOVERNANCE=1`.
- Start server: `node server/index.js` (port 8787). Set `RPC_HTTP_URL` to node URL.
- Explorer UI: open frontend (Vite) and navigate to Explorer.

- Governance:
  - Submit: POST server `/api/governance/submit` or CLI `dytx gov propose`.
  - Deposit: server `/api/governance/deposit`.
  - Vote: server `/api/governance/vote` or CLI `dytx gov vote`.
  - Evidence auto-writes under `launch-evidence/governance/`.

- WASM contracts:
  - Deploy via server `/api/contracts/deploy` with hex code.
  - Execute via `/api/contracts/:address/execute` (increment/get).
  - Evidence per-contract under `launch-evidence/wasm/<address>/`.

- Emissions:
  - Engine runs in node runtime; query `/api/rewards`.
  - Evidence: run `scripts/evidence/generate_emissions_evidence.sh`.

- Ops:
  - Metrics: node `/metrics`, server `/metrics`.
  - Alerts: node `/ops/pause` and `/ops/resume` to test.
  - Evidence: run `scripts/evidence/generate_ops_evidence.sh`.

