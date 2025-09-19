# Monitoring Evidence Summary

Artifacts generated on 2025-09-15:

- prometheus_targets.json: Prometheus active targets, includes jobs prometheus, node-exporter, loki, pulsescan-api, pulsescan-infer, dytallix-explorer, and dytallix-lean-node-local.
- grafana_dashboard.json: Export of Grafana dashboards (API export or static validators.json copy).
- alert_test_output.log: Output of pause-induced alert test, including ALERTS vector and alerts snapshots before/after.
- rollback_dry_run.log: Build-and-stage of previous commit binary via git worktree (dry run).
- metrics_probe.txt: Non-empty samples from /metrics for node (3030), API (3001), and AI (9091).
- node.out: Continuous block production logs during the window.

Test confirmations:
- Prometheus scrapes are non-empty:
  - pulsescan-api (3001): UP
  - pulsescan-infer (9091): UP
  - node-exporter (9100): UP
  - loki (3100): UP
  - dytallix-lean-node-local (3030): added to config
- Alert firing: LeanNodeDown/BlockProductionStall expected within 60–75s during pause; see alert_test_output.log snapshots.
- Rollback dry-run: previous commit built with cargo; artifact hash recorded.

Screenshots to add:
- Grafana Targets (Prometheus -> Status -> Targets) showing UP states.
- Validators dashboard panel during induced stall.

Follow-ups:
- Expose or remove stale targets (dytallix-node:26680, faucet) or bring services up.
- Configure alert contact points and notification policies in Grafana or Alertmanager.

