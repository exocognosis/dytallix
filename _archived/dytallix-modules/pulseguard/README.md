PulseGuard: Anomaly & Fraud Detector (Self‑Hosted)

Version: v0.1.0

Overview
- Self-hosted real-time anomaly/fraud detector with graph analytics over address–contract DAG, streaming features, and hybrid ML (anomaly + ensemble classifiers).
- Prioritized alerts with explainability metadata and PQC-signed integrity attestations.
- Inputs supported: file batch (API), conceptual RPC poller + external metadata (stubs provided).

Quick Start (Local)
- Prereqs: Python 3.11+, optional: Docker, Helm, cosign, syft
- Run locally:
  - PORT=8090 RPC_URL=http://localhost:8545 ALERT_THRESHOLD=0.8 FEATURE_WINDOW=200 \
    bash scripts/run_local.sh
  - Health: curl -sS http://localhost:8090/health
  - Score one tx:
    - curl -sS -X POST http://localhost:8090/score -H 'content-type: application/json' \
        -d '{"tx":{"hash":"0x1","from":"0xabc","to":"0xdef","value":123.45,"gas":21000}}' | jq .
    - Response includes {score,label,reasons,explainability{top_features,dag_paths,graph_metrics},attestation{alg,checksum,signature?}}

Docker
- Build: bash scripts/build.sh v0.1.0
- Run: docker run --rm -p 8090:8090 \
    -e PORT=8090 -e RPC_URL=http://localhost:8545 \
    -e ALERT_THRESHOLD=0.8 -e FEATURE_WINDOW=200 -e SINK_URL=http://localhost:9000/hook \
    ghcr.io/<org>/dytallix-pulseguard:v0.1.0
- Test: curl -sS http://localhost:8090/health

Helm (Kubernetes)
- Template: bash scripts/helm_install.sh --template
- Dry-run: bash scripts/helm_install.sh --dry-run
- Example install:
  - helm upgrade --install pulseguard deploy/helm/pulseguard \
    --set image.repository=ghcr.io/<org>/dytallix-pulseguard \
    --set image.tag=v0.1.0 \
    --set env.RPC_URL=http://your-rpc:8545 \
    --set env.ALERT_THRESHOLD=0.8 \
    --set env.FEATURE_WINDOW=200

API Overview
- POST /score → body accepts single tx or batch. Returns { score: 0..1, label, reasons[], explainability, attestation }.
- POST /stream/webhook → register an alert sink URL (stored in-memory). Also uses env SINK_URL if set.
- GET /health → readiness probe.

Configuration (ENV)
- PORT: service port (default 8090)
- RPC_URL: upstream RPC endpoint for optional poller (unused in v0.1.0 server flow)
- FEATURE_WINDOW: rolling window size for stats (default 200)
- ALERT_THRESHOLD: score threshold for alert label (default 0.8)
- SINK_URL: optional default webhook sink for alerts

Build & Security
- Docker image target: ghcr.io/<org>/dytallix-pulseguard:<semver>
- scripts/build.sh builds image, packages Helm chart, emits SBOM (CycloneDX) + SHA256SUMS
- scripts/sign_artifacts.sh signs artifacts with cosign
- Pinned dependencies; slim runtime image

Performance
- Scoring path is lightweight (stream features + rolling stats + simple ensemble). p95 goal < 100ms/tx on 1 vCPU; typical local runs are sub-50ms.

Notes
- This initial release keeps state in-memory; scale-out would externalize state and sinks.
- Start at v0.1.0; see CHANGELOG.md for release notes.
