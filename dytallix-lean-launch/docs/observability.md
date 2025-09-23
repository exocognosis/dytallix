# Observability: Prometheus for Dytallix Testnet

This guide shows how to run Prometheus to scrape the three Dytallix testnet nodes' metrics.

Prerequisites
- Prometheus installed and accessible in PATH (prometheus --version)
- Dytallix nodes exposing metrics on localhost:26660, :26661, :26662

Config location
- File: ops/prometheus.yml

Run Prometheus
```bash
prometheus --config.file=ops/prometheus.yml
```
Notes
- If launching from a different working directory, use the absolute path, e.g.:
  ```bash
  prometheus --config.file="$(pwd)/ops/prometheus.yml"
  ```
- Default Prometheus UI: http://localhost:9090

Confirm targets are healthy
1) Open the Prometheus Targets page:
   - http://localhost:9090/targets
2) Verify all three targets show as UP under job dytallix-nodes:
   - localhost:26660, localhost:26661, localhost:26662
3) Click a target to see last scrape status and error details (should be none).

Quick query checks
- Check any metric exists (example):
  - Search: up{job="dytallix-nodes"}
  - Expect three time series with value 1
- If your nodes export a distinct metric, e.g. process_cpu_seconds_total, query it by target:
  - process_cpu_seconds_total{instance="localhost:26660"}

Troubleshooting
- Ports not listening: ensure nodes are running with metrics enabled.
- Firewall/local security tools: allow inbound connections to 9090 (Prometheus UI) if accessing from another host.
- Config reload: edit ops/prometheus.yml and restart Prometheus, or enable --web.enable-lifecycle and POST to /-/reload.
