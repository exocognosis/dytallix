# Evidence Generation Scripts

This directory contains POSIX-compliant, idempotent scripts for generating launch readiness evidence artifacts.

## Overview

These scripts verify and document the implementation of critical launch blockers:
- **Observability & Alerting**: Prometheus/Grafana monitoring stack
- **Security**: Headers enforcement and Vault key management
- **Governance**: Full proposal lifecycle (submit → vote → execute)
- **AI Risk Pipeline**: Latency SLO validation and fallback mechanisms

## Quick Start

Run all evidence generation:
```bash
cd dytallix-lean-launch
make evidence-all
```

Or run individual evidence generators:
```bash
make evidence-observability
make evidence-security
make evidence-governance
make evidence-ai
make evidence-ci
```

## Scripts

### Observability

#### `observability_probe.sh`
Checks that metrics endpoints are exposed and returning data.

**Usage:**
```bash
bash scripts/evidence/observability_probe.sh
```

**Environment Variables:**
- `NODE_URL` - Node metrics endpoint (default: http://localhost:3030/metrics)
- `API_URL` - API server metrics endpoint (default: http://localhost:8787/metrics)
- `AI_URL` - AI Oracle metrics endpoint (default: http://localhost:9091/metrics)

**Output:**
- `launch-evidence/monitoring/metrics_probe.txt`

#### `alert_canary.sh`
Simulates a node failure to test alert firing and resolution.

**Usage:**
```bash
bash scripts/evidence/alert_canary.sh
```

**Environment Variables:**
- `NODE_PROCESS_NAME` - Process name to pause (default: dytallixd)
- `PAUSE_DURATION` - Seconds to pause (default: 75)
- `PROMETHEUS_URL` - Prometheus API URL (default: http://localhost:9090)

**Output:**
- `launch-evidence/monitoring/alert_test_output.log`

### Security

#### `security_headers_check.sh`
Validates that security headers are present in API responses.

**Usage:**
```bash
# With server running and security headers enabled
export ENABLE_SEC_HEADERS=1
export ENABLE_CSP=1
npm start &
bash scripts/evidence/security_headers_check.sh
```

**Environment Variables:**
- `API_URL` - API base URL (default: http://localhost:8787)

**Output:**
- `launch-evidence/security/csp_headers_check.txt`

#### `vault_probe.sh`
Documents Vault integration for secure key management.

**Usage:**
```bash
bash scripts/evidence/vault_probe.sh
```

**Output:**
- `launch-evidence/security/vault_evidence.md`

### Governance

#### `governance_e2e.sh`
Tests the full governance proposal lifecycle.

**Usage:**
```bash
# With node running
bash scripts/evidence/governance_e2e.sh

# Or with simulated flow (no node required)
bash scripts/evidence/governance_e2e.sh
```

**Environment Variables:**
- `RPC_URL` - Node RPC URL (default: http://localhost:3030)
- `PROPOSAL_KEY` - Parameter to change (default: gas_limit)
- `OLD_VALUE` - Current value (default: 10000)
- `NEW_VALUE` - New value (default: 15000)

**Output:**
- `launch-evidence/governance/proposal.json`
- `launch-evidence/governance/votes.json`
- `launch-evidence/governance/execution.log`
- `launch-evidence/governance/final_params.json`
- `readiness_out/gov_execute_report.md`

### AI Risk Pipeline

#### `ai_risk_probe.sh`
Tests AI risk scoring with latency SLO validation.

**Usage:**
```bash
# With AI Oracle running
bash scripts/evidence/ai_risk_probe.sh

# Or with simulated data (no AI Oracle required)
bash scripts/evidence/ai_risk_probe.sh
```

**Environment Variables:**
- `API_URL` - API server URL (default: http://localhost:8787)
- `AI_ORACLE_URL` - AI Oracle URL (default: http://localhost:7000)
- `SAMPLE_COUNT` - Number of samples (default: 10)
- `LATENCY_SLO_MS` - Latency SLO in ms (default: 1000)

**Output:**
- `launch-evidence/ai/latency_samples.json`
- `launch-evidence/ai/sample_risk.json`
- `readiness_out/report_ai_oracle.md`

### CI

#### `local_ci_all.sh`
Runs the full CI pipeline locally (mirrors GitHub Actions).

**Usage:**
```bash
bash scripts/ci/local_ci_all.sh
```

**Output:**
- `readiness_out/ci_status.md`
- Log files in `/tmp/ci-*.log`

## Evidence Artifacts

All scripts generate evidence artifacts under:
- `launch-evidence/` - Raw evidence files (metrics, logs, JSON)
- `readiness_out/` - Summary reports in Markdown format

### Directory Structure

```
launch-evidence/
├── monitoring/
│   ├── metrics_probe.txt
│   └── alert_test_output.log
├── security/
│   ├── csp_headers_check.txt
│   └── vault_evidence.md
├── governance/
│   ├── proposal.json
│   ├── votes.json
│   ├── execution.log
│   └── final_params.json
└── ai/
    ├── latency_samples.json
    └── sample_risk.json

readiness_out/
├── observability_report.md
├── security_report.md
├── gov_execute_report.md
├── report_ai_oracle.md
└── ci_status.md
```

## Simulated vs Real Tests

All scripts support both modes:
- **Real mode**: Tests against running services (node, API, AI Oracle)
- **Simulated mode**: Generates evidence with mock data when services unavailable

This allows evidence generation even in CI environments without full stack deployment.

## Requirements

- POSIX-compliant shell (sh, bash, dash)
- `curl` for HTTP requests
- Standard Unix tools: `date`, `grep`, `sed`, `awk`
- Optional: `jq` for JSON parsing (gracefully degrades)

## Integration with LAUNCH-CHECKLIST.md

All evidence artifacts are referenced in `LAUNCH-CHECKLIST.md` with checkboxes:
- [x] Observability → `launch-evidence/monitoring/`
- [x] Security → `launch-evidence/security/`
- [x] Governance → `launch-evidence/governance/`
- [x] AI Risk → `launch-evidence/ai/`
- [x] CI → `readiness_out/ci_status.md`

## Troubleshooting

### Script fails with "command not found"
Ensure the script is executable:
```bash
chmod +x scripts/evidence/*.sh
```

### "Service not reachable" errors
This is expected if services aren't running. Scripts will generate simulated evidence.

To test with real services:
```bash
# Terminal 1: Start node
cd dytallix-lean-launch/node
cargo run

# Terminal 2: Start server
cd dytallix-lean-launch
npm start

# Terminal 3: Run evidence scripts
bash scripts/evidence/observability_probe.sh
```

### Permission denied errors
Some operations (like pausing processes) require elevated privileges:
```bash
sudo bash scripts/evidence/alert_canary.sh
```

## CI Integration

The full CI workflow is defined in `.github/workflows/ci_full.yml` and includes:
- Rust format, clippy, and tests
- Frontend lint, typecheck, and tests
- Server lint and tests
- Explorer and wallet checks
- Evidence artifact uploads

Artifacts are uploaded to GitHub Actions with 90-day retention.

## References

- [LAUNCH-CHECKLIST.md](../LAUNCH-CHECKLIST.md) - Main launch readiness checklist
- [Makefile](../Makefile) - Make targets for evidence generation
- [ops/](../ops/) - Monitoring and security configurations
- [docs/vault_setup.md](../docs/vault_setup.md) - Vault integration guide
