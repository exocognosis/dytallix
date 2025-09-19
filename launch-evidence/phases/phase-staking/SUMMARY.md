Staking & Emissions Evidence — Accrual, Claim, and 7‑Day Projection

Artifacts
- `launch-evidence/staking/before_balances.json`: uDRT balances for Delegator A and B before claim.
- `launch-evidence/staking/after_balances.json`: uDRT balances for Delegator A and B after claim (A claimed, B did not).
- `launch-evidence/staking/claims.log`: Human‑readable summary of claims and balance deltas.
- `launch-evidence/staking/emission_config.json`: Runtime parameters and stats snapshot used to produce the evidence.
- `launch-evidence/staking/execution.json`: Idempotency state for refresh-only reruns.
- `launch-evidence/staking/7d_report.csv`: Network‑level 7‑day emission projection based on live `block_time_seconds` and `emission_per_block`.
- `launch-evidence/staking/validators.json` (best‑effort): Validator set snapshot if endpoint available.
- `launch-evidence/staking/7d_accruals.csv`: Per‑delegator accrued rewards snapshot for the configured delegators.
- Per‑run traces in `launch-evidence/staking/run_<timestamp>/` for troubleshooting.

How to Reproduce
- Ensure a local node is running with staking enabled (`DYT_ENABLE_STAKING=1`) and RPC at `${API_BASE:-http://localhost:3030}`.
- Run accrual + claim evidence:
  - `scripts/evidence/staking_emissions_demo.sh`
  - Optional overrides: `DELEGATOR_A`, `DELEGATOR_B`, `VALIDATOR_ADDR`, `DELEGATE_AMOUNT_A`, `DELEGATE_AMOUNT_B`, `WAIT_POLLS`, `SLEEP_SECS`, `API_BASE`.
  - Optional deterministic ticks (if supported by the node): `DEV_EMIT_TICKS=<n>`.
- Generate 7‑day projection:
  - `scripts/evidence/staking_emissions_7d.sh`
  - Optional: `DAYS=<n>`; provide delegators via `launch-evidence/staking/emission_config.json`, or `STAKE_DELEGATORS=addr1,addr2`, or env `DELEGATOR_A/DELEGATOR_B`.

Verification
- Positive claim and exact balance delta:
  - `jq -r '.claim.claimed' launch-evidence/staking/execution.json` is `> 0`.
  - `jq -r '.claim.balance_delta' launch-evidence/staking/execution.json` equals claimed.
- Idempotency:
  - Re-run `scripts/evidence/staking_emissions_demo.sh` to refresh artifacts without re-claiming.
  - `execution.json.status == "Complete"` and `last_verified_at` updates on refresh.
- Sanity checks:
  - `7d_report.csv` totals align with current `block_time_seconds` and `emission_per_block` from `/api/stats`.
  - `7d_accruals.csv` per‑delegator values reflect `/api/staking/accrued/:address` at time of capture.

Notes
- The script safely pauses/resumes block production using `/ops/pause` and `/ops/resume` to stabilize snapshots; it auto‑resumes on exit.
- Delegations are attempted idempotently; existing delegations are tolerated without failure.
