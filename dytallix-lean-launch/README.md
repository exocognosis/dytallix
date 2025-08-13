# Dytallix Lean Launch Frontend

A React-based frontend application for the Dytallix post-quantum blockchain lean launch. This developer-focused website showcases the platform's capabilities, provides access to testnet resources, and demonstrates AI-enhanced security & integrity verification.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm (or yarn / pnpm)

### 1. Clone & Install
```bash
git clone https://github.com/HisMadRealm/dytallix.git
cd dytallix/dytallix-lean-launch
npm install
```

### 2. Environment Configuration
Copy `.env.example` to one of:
- `.env` (local dev against a local node)
- `.env.staging` (provided staging/testnet endpoints) then copy/rename to `.env` OR export `NODE_ENV=staging` in your process manager.

Key variables (strings unless noted):
- `VITE_LCD_HTTP_URL`, `VITE_RPC_HTTP_URL`, `VITE_RPC_WS_URL` – Cosmos / Tendermint endpoints.
- `VITE_CHAIN_ID` – Chain ID string (e.g. `dytallix-testnet-1`). Do NOT coerce to number.
- `CHAIN_PREFIX` – Bech32 prefix (default `dytallix`).
- `FAUCET_URL` – POST endpoint for faucet (`/api/faucet`).
- `FAUCET_MNEMONIC` – (Server side only) funded mnemonic for faucet signer (never commit).

Never commit `.env*` or mnemonics.

### 3A. Local Development (Dev Node or External Testnet)
Terminal 1 (API + Faucet + proxy):
```bash
npm run server
```
Terminal 2 (Frontend with HMR):
```bash
npm run dev
```
Open http://localhost:5173.

### 3B. Staging Preview (Prod Build locally)
```bash
npm run build
npm run preview   # Serves dist/ on http://localhost:4173
```
Ensure `.env` points at the staging chain RPC/LCD.

### 3C. Container (Example)
```bash
npm ci && npm run build
# serve dist/ with nginx or any static server; run faucet/API separately
```

## 🔐 Wallet / Vault Flow
1. Launch site: integrity banner performs WASM manifest hash verification (see Integrity section).  
2. Create vault: set a strong password (never transmitted). PQC keypairs (Dilithium3, Falcon-512, SPHINCS+) generated client-side.
3. Unlock: password is run through Argon2id (memory-hard) → derived key decrypts encrypted keystore blob.
4. Import (optional): If you exported an encrypted blob previously you can paste/import; raw mnemonics for faucet should NOT be imported into the browser vault.
5. Auto-lock: inactivity triggers in-memory zeroization; unlock again to resume.

## 💧 Faucet Usage
1. Ensure vault is unlocked (address auto-populates).  
2. Open Faucet panel → select token (DGT / DRT).  
3. Submit request (respects cooldown `FAUCET_COOLDOWN_MINUTES`).  
4. Success shows tx hash / acknowledgement. Funds appear after ≥1 block.

## 💸 Send Transaction
1. Open Transfer panel.  
2. Enter recipient Bech32 address (validated).  
3. Enter amount (UI enforces decimals).  
4. Sign & broadcast: CosmJS builds, signs with unlocked PQC-derived wallet (hybrid path if applicable), broadcasts via LCD/RPC.  
5. Activity stream updates once block height increases and tx indexed.

## 📜 Activity & Monitoring
- Recent transactions & blocks stream (real when RPC reachable; simulated fallback otherwise).  
- Integrity / connection badges: green (live), amber (degraded), red (simulated).  
- Console (dev): networkStatus service logs redacted diagnostic info.

## 🧪 PQC Demo & Integrity Behavior
On load the app:
- Fetches WASM files for PQ schemes & computes SHA-256 over each.  
- Compares against a manifest (optionally Ed25519 signed).  
- Displays:  
  - ✅ "Integrity OK" if all match (actions enabled).  
  - ⚠️ "Degraded – using fallback" if manifest fetch temporarily fails (retry loop).  
  - ❌ "Integrity Failure" if any hash mismatch (signing & high-risk actions disabled until resolved).  
- You can open DevTools → Network to view `*.wasm` loads & `manifest.json`.

Demo Ideas:
- Intentionally tamper a local WASM file → observe failure banner.  
- Compare timings of Argon2id parameters (tunable via env) for UX vs security tradeoff.

## 🆘 Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| Faucet requests fail (CORS) | Missing `Access-Control-Allow-Origin` on API or wrong origin in proxy | Start `npm run server` before `npm run dev`; ensure proxy config in `vite.config.js` matches `/api` base. |
| No live blocks (simulated data message) | RPC URL unreachable / wrong port / firewall | `curl $VITE_RPC_HTTP_URL/status`; verify container networking & that Tendermint port 26657 exposed. |
| WebSocket errors / stuck height | `VITE_RPC_WS_URL` wrong scheme or port | Use `ws://` (dev) or `wss://` (TLS) + correct :26657 path. |
| Chain ID mismatch error in signing | `VITE_CHAIN_ID` not equal to node's `network` field | Inspect `curl $VITE_RPC_HTTP_URL/status | jq .result.node_info.network` and set env accordingly. |
| Integrity Failure banner | Corrupted or stale cached WASM / manifest | Hard refresh (Ctrl+Shift+R), clear cache; redeploy with matching manifest; verify build hashes in CI. |
| Unlock very slow | Argon2id mem/ops limits too high for device | Lower KDF params (trade-off), keep >32MB memory where possible. |

## 📦 Available Scripts
- `npm run dev` – Vite dev server
- `npm run server` – Faucet + status API (Express)
- `npm run build` – Production build
- `npm run preview` – Serve built assets
- `npm run lint` – ESLint
- `npm test` – Unit tests (vitest)
- `npm run security:audit` – Dependency & license audit

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
- `FAUCET_MAX_PER_REQUEST_DGT` / `FAUCET_MAX_PER_REQUEST_DRT` — Amounts (display units)
- `FAUCET_COOLDOWN_MINUTES` — Per-IP+address cooldown

## 📊 Dashboard API (server)
The dev API exposes Cosmos-backed endpoints:
- `GET /api/status/height` – `{ ok, height }`.
- `GET /api/status/node` – `{ ok, network, chain_id, height, status }`.
- `POST /api/faucet` – Faucet request.

Proxied via Vite in dev (see `vite.config.js`) / fronted by nginx in production.

### Local status endpoints
```bash
curl -s http://localhost:8787/api/status/height | jq
curl -s http://localhost:8787/api/status/node | jq
```

## 🛠 Operations / Runtime Reference

### Network Ports
| Purpose | Port | Notes |
|---------|------|-------|
| Frontend (Vite dev) | 5173 | Dev only |
| Preview (static) | 4173 | `npm run preview` |
| Backend API / Faucet | 8787 | Express server |
| Tendermint RPC / WS | 26657 | HTTP JSON-RPC + WS |
| Tendermint P2P | 26656 | Peer connections |
| Cosmos LCD (REST) | 1317 | Optional |

### Health / Status Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /api/status/height` | Current block height. |
| `GET /api/status/node` | Network id + raw status. |
| `GET /api/dashboard/overview` | Summary (height/network). |
| `GET /api/dashboard/timeseries?metric=tps&range=1h` | Synthetic metrics placeholder. |
| `POST /api/faucet` | Faucet request. |

### CSP (Summary)
- Dev: Vite sets strict baseline.  
- Prod API: enable with `ENABLE_SEC_HEADERS=1` (+ `ENABLE_CSP=1` for CSP).  
- Static hosting: mirror CSP & remove `'unsafe-inline'` when hashed styles ready.

## 🔐 Logging Policy
- Structured redaction for sensitive fields (mnemonic/private/secret/token/key).  
- Avoid raw `console.log` of secrets server-side.

## ♻️ Rolling Deploy / Roll Back
Roll Forward:
1. `npm ci && npm run build`
2. Smoke test status endpoints & integrity banner.
3. Deploy / flip traffic after ≥1 block stable.
4. Monitor redacted logs + height progression.

Roll Back:
1. Re-point to last healthy artifact / image.
2. Invalidate CDN caches (avoid mixed JS versions).
3. Inspect `artifacts/security/audit.txt` & RPC connectivity.
4. Post-mortem.

## 🧹 Migration Notes
Originally migrated from an EVM/Hardhat prototype → Cosmos SDK. Removed Hardhat artifacts, replaced faucet logic with CosmJS. See `docs/evm_migration/MATCHES.md` for audit trail.

## 🧪 Tests
Vitest for unit/component tests. (Any previous EVM tests removed.)

## 📄 Security Audit Artifacts
Generated via `npm run security:audit` → `artifacts/security/audit.txt` (timestamped list & licenses). Include in launch review.

---

For launch readiness steps see `LAUNCH-CHECKLIST.md`.

## 🧪 AI Module Endpoints (Contract Scanner & Anomaly Detection)
Two secure POST endpoints back the Modules page. Both are rate‑limited (≈12 req/min/IP) and enforce strict validation + size limits.

### POST /api/contract/scan
Static analysis (rule / pattern heuristic) over submitted Solidity source.

Request JSON:
```
{ "code": "string (≤100KB Solidity source)" }
```
Rules enforced server side:
- Reject size >100KB (413 CODE_TOO_LARGE)
- Strips any sourceMappingURL comments
- Parses via solidity-parser-antlr (AST with loc)
- Pattern detection (examples):
  - delegatecall / callcode usage
  - unchecked low-level call (foo.call) when expression value unused
  - tx.origin access
  - selfdestruct / suicide
  - naive reentrancy heuristic: external call before state write in same function

Successful Response (200):
```
{
  "summary": { "total": n, "bySeverity": { "high": n, "medium": n, "low": n } },
  "issues": [
    { "id": "ISSUE_1", "rule": "Delegatecall Usage", "severity": "high", "line": 42, "recommendation": "Avoid delegatecall…" }
  ],
  "meta": { "ranAt": "2025-08-13T12:34:56.000Z", "model": "static-solidity-ruleset:v0" }
}
```
Error Responses:
- 400 INVALID_CODE / PARSE_ERROR
- 413 CODE_TOO_LARGE
- 429 RATE_LIMITED ({ code: 'RATE_LIMITED', message: 'RATE_LIMITED' })

Security Notes:
- Server never echoes full source back (only line numbers & rule meta)
- Input sanitized & size limited

### POST /api/anomaly/run
Heuristic anomaly scoring over recent transaction window (simulated metrics placeholder for now).

Request JSON:
```
{ "txHash": "0x<64 hex chars>", "windowSize": "50tx | 100tx | 24h" }
```
Invalid `windowSize` defaults to `100tx`.

Successful Response (200):
```
{
  "riskScore": 78,
  "anomalies": [ { "id": "ValueSpike_1", "type": "ValueSpike", "severity": "medium", "detail": "Outgoing value exceeds rolling median * 2.7" } ],
  "meta": { "ranAt": "2025-08-13T12:34:56.000Z", "model": "heuristic-anomaly:v0" }
}
```
Errors:
- 400 INVALID_TX_HASH
- 429 RATE_LIMITED

### Frontend Behavior
- Input validation (tx hash regex & code size) before POST
- Disabled buttons + loading spinners while requests in flight
- Inline highlighting of vulnerability lines in scanner
- SARIF export button produces SARIF 2.1.0 report for CI tooling
- Results + last inputs cached in localStorage (namespaced)

### SARIF Export
Filename: `contract-scan.sarif.json`
Structure: single run, rules derived from issues, each issue mapped to a SARIF result with `startLine`.

### PQC Demo Integration
If `VITE_PQC_ENABLED=true` build flag is set:
- WASM integrity preloaded (`preloadPqcIntegrity`)
- User can pick algorithm from `PQC_ALGOS_ALLOWED` (Dilithium/Falcon/SPHINCS+)
- Keygen, Sign, Verify flows use `src/lib/crypto/pqc.js`
