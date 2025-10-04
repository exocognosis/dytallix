# Quick Start Guide - Launch Readiness

This guide helps you quickly validate the launch readiness implementation.

## Prerequisites

- Rust toolchain (stable)
- Node.js LTS
- Docker & Docker Compose (for monitoring stack)
- curl (for testing)

## 1. Generate All Evidence (2 minutes)

Run all evidence generation scripts:

```bash
cd dytallix-lean-launch
make evidence-all
```

This will:
- ✅ Test observability endpoints
- ✅ Validate security headers configuration
- ✅ Run governance E2E simulation
- ✅ Test AI risk scoring with latency SLO
- ✅ Run local CI checks

**Expected Output**: Evidence artifacts in `launch-evidence/` and reports in `readiness_out/`

## 2. Review Evidence Artifacts (1 minute)

Check generated artifacts:

```bash
# List all evidence
ls -la launch-evidence/monitoring/
ls -la launch-evidence/security/
ls -la launch-evidence/governance/
ls -la launch-evidence/ai/

# Read summary reports
cat readiness_out/gov_execute_report.md
cat readiness_out/report_ai_oracle.md
```

## 3. Deploy Monitoring Stack (1 minute)

Start Prometheus and Grafana:

```bash
docker-compose -f docker-compose.observability.yml up -d
```

**Access**:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

## 4. Start Services with Security Headers (2 minutes)

Enable security headers and start the API server:

```bash
export ENABLE_SEC_HEADERS=1
export ENABLE_CSP=1
npm ci
npm start
```

In another terminal, test security headers:

```bash
bash scripts/evidence/security_headers_check.sh
```

## 5. Test with Live Node (Optional, 5 minutes)

If you have a running node:

```bash
# Terminal 1: Start node
cd node
cargo run

# Terminal 2: Run observability probe
cd ..
bash scripts/evidence/observability_probe.sh

# Check metrics
curl http://localhost:3030/metrics
```

## 6. Review Monitoring Dashboard (2 minutes)

1. Open Grafana: http://localhost:3000
2. Login: admin/admin
3. Import dashboard: `ops/grafana/dashboards/dytallix-overview.json`
4. Select Prometheus datasource
5. View metrics panels

## 7. Review Implementation (5 minutes)

Read the comprehensive reports:

```bash
# Executive summary
cat IMPLEMENTATION_SUMMARY.md

# Detailed final report
cat FINAL_REPORT.md

# Launch checklist status
cat LAUNCH-CHECKLIST.md | grep "✅"
```

## 8. Run Local CI (Optional, 5 minutes)

Validate all code changes:

```bash
bash scripts/ci/local_ci_all.sh
```

This runs:
- `cargo fmt --check`
- `cargo clippy -- -D warnings`
- `cargo test`
- `npm run lint`
- `npm run typecheck`
- `npm test`

## Verification Checklist

After completing the quick start, verify:

- [ ] Evidence artifacts generated in `launch-evidence/`
- [ ] Summary reports created in `readiness_out/`
- [ ] Prometheus running on port 9090
- [ ] Grafana running on port 3000
- [ ] Security headers validated
- [ ] All make targets execute successfully
- [ ] CI status report shows passing tests

## Troubleshooting

### "Service not reachable" errors

This is expected if services aren't running. Scripts will generate simulated evidence.

### Docker compose fails

Check Docker is running:
```bash
docker ps
docker-compose version
```

### npm ci fails

Clear cache and retry:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Rust compilation errors

Update Rust:
```bash
rustup update stable
cargo clean
cargo build
```

## Next Steps

1. Review `FINAL_REPORT.md` for complete implementation details
2. Check `LAUNCH-CHECKLIST.md` for remaining tasks
3. See `docs/vault_setup.md` for production Vault configuration
4. See `ops/README.md` for monitoring stack details
5. See `scripts/evidence/README.md` for script documentation

## Quick Reference

### Make Targets

```bash
make evidence-observability  # Observability evidence
make evidence-security      # Security evidence  
make evidence-governance    # Governance E2E
make evidence-ai           # AI risk probe
make evidence-ci           # Local CI
make evidence-all          # All evidence
```

### Key Files

```
ops/
├── prometheus/prometheus.yml          # Prometheus config
├── grafana/dashboards/*.json          # Dashboards
├── grafana/alerts/*.yml               # Alert rules
└── vault/*.hcl                        # Vault config

scripts/
├── evidence/*.sh                      # Evidence generators
└── ci/local_ci_all.sh                 # Local CI runner

docs/
└── vault_setup.md                     # Vault guide

readiness_out/                         # Summary reports
launch-evidence/                       # Raw evidence
```

## Success Criteria

All evidence generation should complete with:
- ✅ No script failures
- ✅ Evidence files created
- ✅ Summary reports generated
- ✅ Monitoring stack running
- ✅ Security headers validated

**Estimated Time**: 10-20 minutes for full validation

---

For detailed information, see:
- `FINAL_REPORT.md` - Complete implementation report
- `IMPLEMENTATION_SUMMARY.md` - Executive summary
- `LAUNCH-CHECKLIST.md` - Launch readiness checklist
