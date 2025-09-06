# Rollback (MVP)

- Governance parameter changes are recorded in `launch-evidence/governance/execution.log` and `final_params.json`.
- To rollback a bad parameter change, submit a new proposal restoring prior values (see `final_params.json` history in VCS or logs).
- For WASM contracts, redeploy previous code hash and update callers. Evidence directories are per-address.
- Emission changes are runtime-configured; switch schedule via config and restart node, preserving DB.
- If alerts misfire, disable alerts in config or reduce sensitivity.

Evidence references:
- Governance: `launch-evidence/governance/*`
- WASM: `launch-evidence/wasm/<address>/*`
- Emissions: `launch-evidence/emissions/*`
- Ops: `launch-evidence/ops/*`
