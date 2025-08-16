# Dytallix Lean Launch – Pre-Testnet Public Launch Checklist

Mark each item with [x] when complete. All MUST be satisfied for a Go decision.

## 1. Infrastructure / Environment
- [ ] RPC endpoint reachable: `curl $VITE_RPC_HTTP_URL/status` returns HTTP 200.
- [ ] LCD endpoint reachable (if used): `curl $VITE_LCD_HTTP_URL/node_info` (or equivalent) OK.
- [ ] WebSocket connects (dev tool network shows successful `101` upgrade to `$VITE_RPC_WS_URL`).
- [ ] Chain ID in `.env` (`VITE_CHAIN_ID`) matches `node_info.network` exactly.
- [ ] Time synchronization (NTP) validated on validator / RPC host(s).
- [ ] Genesis file hash recorded & archived (sha256).
- [ ] Minimum peer set connected (>= configured quorum / 1 validator for lean launch).

## 2. Chain Health
- [ ] Block height > 0 (post-genesis) and increasing over 5+ consecutive intervals.
- [ ] Average block interval ≈ expected (~5.2s) within tolerance.
- [ ] No consensus evidence of missed blocks / validator downtime in logs.
- [ ] Application state queries succeed (simple balance query works via LCD / RPC).

## 3. Faucet & Funds Flow
- [ ] Faucet account funded with adequate DGT & DRT (>= 1000x single request limit).
- [ ] `POST /api/faucet` returns 200 with tx hash.
- [ ] Funds appear in target address within 2 blocks.
- [ ] Rate limiting (cooldown) enforced on repeated rapid requests.
- [ ] Faucet mnemonic NOT present in repo or build artifacts.

## 4. Wallet / Vault
- [ ] Vault creation + unlock flow works (Argon2id timing acceptable on target hardware).
- [ ] Export/import encrypted vault tested (no data loss, secrets remain encrypted at rest).
- [ ] Auto-lock & zeroization observed (secrets inaccessible after lock/inactivity).
- [ ] Signing / broadcast success path verified (transfer between two test addresses).

## 5. PQC Integrity & WASM
- [ ] All PQC WASM files hash-match manifest (Integrity OK banner).
- [ ] Manifest signature verification (if enabled) passes (no signature errors).
- [ ] Tamper test (locally corrupt one WASM) triggers Failure state & disables signing.
- [ ] CI artifact manifest stored with build logs.

## 6. Tests & CI
- [ ] `npm test` green (unit/component tests pass).
- [ ] `npm run security:audit` produces report with no High/Critical unresolved vulns.
- [ ] WASM deterministic build job passed (hash set stable vs previous approved build).
- [ ] Linting passes (`npm run lint`).
- [ ] (Optional) Load test: basic concurrent faucet requests remain within latency SLO.

## 7. Monitoring & Observability
- [ ] Block height progression dashboard accessible (internal or external tool).
- [ ] Alerting configured for: node downtime / height stall / API 5xx spike.
- [ ] Log retention policy documented (duration & storage location).
- [ ] Integrity failure rate (if any) monitored (manual sampling acceptable for lean phase).

## 8. Security Controls
- [ ] CSP enabled in staging (`ENABLE_SEC_HEADERS=1` + `ENABLE_CSP=1`).
- [ ] No unexpected external origins in `connect-src`.
- [ ] HTTPS/TLS termination configured (HSTS optionally enabled) for public endpoints.
- [ ] Secrets (mnemonics, signing keys) provided via env/secret store; not in images.
- [ ] Dependency audit reviewed for newly introduced packages since last approval.

## 9. Documentation
- [ ] `README.md` updated (quick start, wallet, faucet, PQC integrity, troubleshooting).
- [ ] `SECURITY.md` updated (vault/KDF, zeroization, threat model, supply chain).
- [ ] This checklist reviewed & tailored for any last-minute config diffs.
- [ ] Rollback steps documented & tested (can revert to last stable build quickly).

## 10. Rollback Preparedness
- [ ] Previous production-ready build artifact ID recorded.
- [ ] Procedure to redeploy previous build tested within < 5 minutes.
- [ ] Cache invalidation (CDN) steps scripted / documented.

## 11. Go / No-Go Triage
| Area | Status | Notes |
|------|--------|-------|
| Infrastructure | ☐ | |
| Chain Health | ☐ | |
| Faucet Flow | ☐ | |
| Wallet/Vault | ☐ | |
| PQC Integrity | ☐ | |
| Tests & CI | ☐ | |
| Monitoring | ☐ | |
| Security Controls | ☐ | |
| Docs | ☐ | |
| Rollback | ☐ | |

Go Decision (all boxes checked): __YES__ / __NO__

Sign-off:
- Technical Lead: __________________ Date: __________
- Security Reviewer: ______________ Date: __________
- Operations: _____________________ Date: __________
