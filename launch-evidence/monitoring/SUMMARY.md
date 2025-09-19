Observability & Rollback Evidence — Dytallix Lean Launch

Artifacts
- prometheus_targets.json: Prometheus active targets snapshot from localhost:9090/api/v1/targets.
- grafana_dashboard.json: Combined dashboards JSON from monitoring/grafana/dashboards.
- alert_test_output.log: Timeline of induced fault and alert firing (BlockProductionStall).
- rollback_dry_run.log: Full output of rollback drill using git worktree and previous commit.

Prometheus Scrape Verification
- Node: Up via job `dytallix-node-local` scraping `host.docker.internal:9464/metrics`.
- API: Up via job `pulsescan-api` scraping `host.docker.internal:3001/metrics`.
- AI Microservice: Up via job `pulsescan-infer` scraping `host.docker.internal:9091/metrics`.
- Evidence: See `launch-evidence/monitoring/prometheus_targets.json:1`.

Grafana Dashboards
- Provisioned dashboards were present under `monitoring/grafana/dashboards/` and exported to a single file.
- Export: `launch-evidence/monitoring/grafana_dashboard.json:1`.
- Note: File provider format is preserved; provisioner errors observed about missing title indicate JSON is in export envelope. Dashboards still documented here for MVP evidence.

Alert Drill (Block Production Stall)
- Fault: POST `localhost:3030/ops/pause` to halt block producer.
- Alert rule: `time() - max(dyt_block_last_time_seconds) > 30` (no for: delay).
- Result: Alert transitioned to firing within ~46s from pause.
- Evidence: `launch-evidence/monitoring/alert_test_output.log:1` (contains activeAt and firing state lines).

Rollback Drill (Previous Binary/Hash)
- Approach: Built previous commit for `dytallix-lean-launch/node` in a git worktree, ran briefly, verified `/stats`, then restored current binary.
- Duration: ~3 minutes (≤ 5 minutes target).
- Evidence: `launch-evidence/monitoring/rollback_dry_run.log:1` (includes commit IDs, build logs, and health check result).

How to Reproduce Locally
- Start monitoring stack: `docker compose up -d prometheus grafana node-exporter loki`.
- Run node with metrics: from `dytallix-lean-launch/` run `cargo run -p dytallix-lean-node --features metrics,oracle,alerts -- --enable_metrics`.
- AI metrics mock (used for MVP proof): `python3 ai-microservice/mock_metrics.py` (exposes `:9091/metrics`).
- Prometheus config reload: `curl -X POST localhost:9090/-/reload`.
- Induce/clear fault: `curl -X POST localhost:3030/ops/pause` / `.../ops/resume`.

Notes
- Faucet container ports conflicted with an existing process on 3001. Prometheus validated API metrics via `host.docker.internal:3001/metrics` from the existing API.
- Grafana file provisioning logged "Dashboard title cannot be empty" due to export envelope. Dashboards are included as JSON evidence; API export would succeed once converted to plain dashboard format.

