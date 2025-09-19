Governance Parameter Change Evidence — Executed Flow

Artifacts
- launch-evidence/governance/proposal.json: Final proposal snapshot from `/gov/proposal/{id}` (status Executed).
- launch-evidence/governance/votes.json: Vote records collected from `/api/governance/proposals/{id}/votes`.
- launch-evidence/governance/execution.log: JSON summary with `Executed` status and gas limit values (jq-ready).
- launch-evidence/governance/final_params.json: `/gov/config` after execution showing updated `gas_limit`.
- launch-evidence/governance/target_gas_limit: Cached target used for idempotent reruns.

Flow Overview
- `scripts/evidence/governance_demo.sh` drives the governance flow end-to-end.
- On first run it delegates to `scripts/e2e/govern_gas_limit.sh` to submit the ParameterChange, deposit, vote "Yes", and poll until status `Executed`.
- After execution it refreshes proposal/votes/config directly from the RPC layer and writes the evidence bundle.
- Subsequent runs detect that the stored target gas limit already matches on-chain state and only refresh the artifacts (idempotent).
- The target gas limit defaults to the prior value +5000 unless `GOV_NEW_GAS_LIMIT` is provided; the chosen value is persisted for later runs.

Verification
- Double-run check: `scripts/evidence/governance_demo.sh && scripts/evidence/governance_demo.sh` exits 0 both times.
- Status proof: `jq -e '.status=="Executed"' launch-evidence/governance/execution.log`.
- Parameter proof: `jq -r '.gas_limit' launch-evidence/governance/final_params.json` matches the requested gas limit.

How to Reproduce
- Ensure a local node is running with governance enabled (`DYT_ENABLE_GOVERNANCE=1`) and RPC at `${API_BASE:-http://localhost:3030}`.
- Fund `dyt1senderdev000000` with ≥1,000 DGT (default min deposit) for both deposit and vote weight.
- Optional overrides: export `GOV_NEW_GAS_LIMIT`, `GOV_DEPOSITOR`, `GOV_VOTER`, or `API_BASE` before executing the script.
- Run `scripts/evidence/governance_demo.sh` from the repo root. Artifacts land in `launch-evidence/governance/` and can be committed as launch evidence.

Notes
- The helper script retains per-run traces under `launch-evidence/governance/run_<timestamp>/` for troubleshooting.
- If the node rejects deposits or votes, confirm the account has sufficient `udgt` balance and the voting/deposit periods configured by `/gov/config` are long enough for the polling window.

