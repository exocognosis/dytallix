# CodeShield (CodeGuard) Test Harness

This suite lives outside the module code and exercises CodeShield end-to-end: parser/AST/CFG/SSA, taint/flow, bounded symbolic execution, rules & ranking, storage-layout diff, gas/complexity hints, and API endpoints.

Quick start:
1) cp ../config/.env.example ../config/.env
2) python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
3) make corpus
4) make run
5) make verify
6) make smoke
7) make dashboard

Artifacts
- artifacts/results.csv — per contract summary
- artifacts/errors.csv — negative tests
- artifacts/latency.json — percentile metrics
- artifacts/reports/*.sarif and *.json — raw reports
- artifacts/logs/*.ndjson — pipeline logs

Prereqs
- Python 3.10+
- pip install -r requirements.txt
- cosign, jq
- solc (optional; corpus uses pragma guards)

Scenarios coverage
- Parsing/AST/CFG/SSA: scenarios/ast_cfg_ssa/test_parsing_ast_cfg_ssa.py
- Taint/flow: scenarios/taint_flow/test_taint_flow_signals.py
- Symbolic execution: scenarios/symexec/test_symexec_presence.py
- Rules & ranking: scenarios/rules/test_rules_and_ranking.py
- Storage layout diff: scenarios/storage_diff/test_storage_diff.py
- Gas/complexity hints: scenarios/gas_hints/test_gas_hints.py
- API endpoints: scenarios/api/test_api_endpoints.py

Make targets
- setup: install dependencies
- corpus: generate synthetic contract variants and gas profiles
- run: invoke pipeline + negative injector, writing artifacts
- verify: SARIF schema check and optional signature verification
- smoke: quick CI-friendly assertions (uses CODESHIELD_MOCK by default in CI)
- scenarios: run full scenario tests against latest artifacts
- dashboard: Streamlit dashboard for metrics and export
- clean: prune artifacts (keeps directories)

Mock vs real API
- Mock mode: set CODESHIELD_MOCK=1 to generate synthetic findings/signals without hitting the API (default in CI). Useful for fast, deterministic checks.
- Real mode: unset CODESHIELD_MOCK and set CODESHIELD_API=http://host:port to run live scans. The pipeline will POST /scan and poll /report/{id}. Place COSIGN_PUBKEY to enable signature verification.

Typical flows
- Local mock smoke: make setup corpus run smoke
- Local full scenarios: make setup corpus run scenarios
- Real backend run: CODESHIELD_MOCK=0 CODESHIELD_API=http://localhost:7081 make corpus run verify scenarios
- Dashboard: make dashboard (view artifacts in browser)

Troubleshooting
- No results.csv: ensure `make run` completed; check artifacts/logs/run_*.ndjson
- Import errors: run `make setup` or activate your virtualenv
- Signature check fails: verify COSIGN_PUBKEY and that .sig files are present
- Latency test fails: adjust CODESHIELD_P50_MAX_MS or investigate backend performance

Data retention
- Artifacts are timestamped via logs and grouped under artifacts/. Use `make clean` to prune CSV/JSON/Parquet; dashboard export can archive all artifacts into a .tgz.
