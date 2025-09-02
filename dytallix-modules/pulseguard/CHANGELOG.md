# Changelog

All notable changes to this project will be documented in this file.

## v0.1.0 - 2025-08-31
- Initial release of PulseGuard (self-hosted).
- FastAPI service with endpoints: POST /score, POST /stream/webhook, GET /health.
- Unsupervised anomaly scoring (rolling stats) + heuristics overlay.
- Dockerfile with multi-stage and pinned deps; slim runtime.
- Helm chart with values for image, env (RPC_URL, FEATURE_WINDOW, ALERT_THRESHOLD, SINK_URL), resources, autoscaling, service, ingress.
- Scripts: build (image, chart, SBOM, checksums), run_local, helm_install, sign_artifacts.
- OpenAPI spec and Quick Start README.

