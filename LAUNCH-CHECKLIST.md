## Launch Checklist — Faucet Alignment

- PQC Policy: MVP requires PQC for all transactions.
  - [x] Documented exception: Faucet backend does not perform on-chain signing and thus is not PQC-signed.
  - [ ] Future item: switch faucet to PQC once PQC signer/RPC is available to services.

- Faucet Behavior
  - [x] Rate limits enforced (per-IP and short-term cooldown).
  - [x] Evidence logging added for funding success and rate-limit events.
  - [x] Evidence log path: `launch-evidence/faucet/funding_and_rate_limit.log`

- Validation Steps
  - [x] First request to `/api/faucet` succeeds (simulated funding).
  - [x] Second rapid request is rejected (rate-limited or cooldown).
  - [x] Log shows balance increment on first request (before -> after) and a RATE_LIMIT/IP_COOLDOWN entry on second.

- Operational Docs
  - [x] `LAUNCH-RUNBOOK.sh` updated with faucet exception and evidence procedure.

Notes
-----
- Current faucet is an off-chain simulator. No secp256k1 or PQC signing performed.
- Node/validator transaction paths remain PQC-aligned per MVP.
- This exception remains only until PQC service-side signing flow is available.

