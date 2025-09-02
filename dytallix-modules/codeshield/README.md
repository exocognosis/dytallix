CodeShield: Smart Contract Security Scanner (Self‑Hosted)

Version: v0.1.0

Overview
- Self-hosted API service to scan Solidity/Vyper contracts with semantic graph, flow tracing, bounded symbolic execution, ranked findings, storage diff, and gas hints.
- Static + semantic analysis with optional Slither driver; SARIF and signed JSON reports.
- Deployable via Docker and Helm. Artifacts can be signed with cosign.

Quick Start (Local)
- Prereqs: Python 3.11+, optional: Docker, Helm, cosign, syft.
- Run locally:
  - PORT=8080 bash scripts/run_local.sh
  - Health check: curl -sS http://localhost:8080/health
  - Scan sources (zip):
    - curl -sS -F "file=@examples/demo.zip" http://localhost:8080/scan
    - => {"id":"<scan-id>", "checksum":"..."}
    - curl -sS "http://localhost:8080/report/<scan-id>?format=json"
    - curl -sS "http://localhost:8080/report/<scan-id>?format=sarif"

Docker
- Build: bash scripts/build.sh
- Run: docker run --rm -p 8080:8080 \
    -e PORT=8080 \
    -e MAX_FILE_MB=15 \
    -e TIMEOUT_SEC=60 \
    ghcr.io/<org>/dytallix-codeshield:v0.1.0
- Test: curl -sS http://localhost:8080/health

Helm (Kubernetes)
- Template: bash scripts/helm_install.sh --template
- Dry-run install: bash scripts/helm_install.sh --dry-run
- Real install (example):
  - helm upgrade --install codeshield deploy/helm/codeshield \
    --set image.repository=ghcr.io/<org>/dytallix-codeshield \
    --set image.tag=v0.1.0 \
    --set service.type=ClusterIP \
    --set service.port=8080

API Overview
- POST /scan
  - Accepts multipart form with `file` (zip of sources). Optional JSON: `bytecode_url`, `bytecode`, `storage_diff_old`, `storage_diff_new` (paths inside zip for diffing).
  - Returns: { id, checksum }
- GET /report/{id}
  - Query `format=json|sarif`. JSON returns ranked findings: [ { rule_id, severity, location, snippet, remediation, rank_score } ]
  - SARIF returns SARIF 2.1.0 report for IDE/CI integration.
- GET /health → 200 when ready.

Configuration (ENV)
- PORT: service port (default 8080)
- RULES_PATH: path to rules (default /app/src/scanner/rules)
- MAX_FILE_MB: max upload size (default 15)
- TIMEOUT_SEC: scan timeout (default 60)
- SCAN_DRIVER: basic | slither (default basic)

Build & Security
- Docker image target: ghcr.io/<org>/dytallix-codeshield:<semver>
- scripts/build.sh builds image, packages Helm chart, emits SBOM (CycloneDX JSON) and SHA256SUMS.
- scripts/sign_artifacts.sh signs artifacts with cosign (if installed).
- Image goal: < 400 MB; typical scan < 60s.

Acceptance Hints
- /health responds 200 < 2s via scripts/run_local.sh.
- helm template and dry-run install succeed.
- Demo vulnerable contract with reentrancy + gas inefficiency should be in top findings; storage layout diff flags proxy mismatches.

Notes
- Slither integration is optional; if Slither is present in the image or host PATH, the driver can be switched with SCAN_DRIVER=slither.
- This repository starts at v0.1.0; see CHANGELOG.md for release notes.
