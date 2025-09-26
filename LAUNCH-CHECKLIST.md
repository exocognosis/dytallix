# Dytallix MVP Launch Readiness Checklist

**Version:** 2.0  
**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)  
**Owner:** Release Engineering

## Core MVP Evidence Status

### Performance SLO Requirements
- ✅ **Performance Benchmarking**: End-to-end confirmation latency <2s (P95), TPS >50% target
  - Evidence: [readiness_out/perf_report.md](readiness_out/perf_report.md)
  - Metrics: [readiness_out/perf/summary.json](readiness_out/perf/summary.json)
  - Latency Distribution: [readiness_out/perf/latency_hist.json](readiness_out/perf/latency_hist.json)

### Observability & Monitoring
- ✅ **Monitoring Stack**: Prometheus targets, Grafana dashboards, alerting validation
  - Evidence: [readiness_out/observability_report.md](readiness_out/observability_report.md)
  - Prometheus Config: [readiness_out/observability/prometheus_targets.json](readiness_out/observability/prometheus_targets.json)
  - Dashboard Export: [readiness_out/observability/grafana_dashboard.json](readiness_out/observability/grafana_dashboard.json)
  - Alert Testing: [readiness_out/observability/alert_test_output.log](readiness_out/observability/alert_test_output.log)

### Security Headers & CSP Hardening
- ✅ **Security Headers**: CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy validation
  - Evidence: [readiness_out/security_headers_report.md](readiness_out/security_headers_report.md)
  - Raw Headers: [readiness_out/security/curl_headers.txt](readiness_out/security/curl_headers.txt)
  - Validation Results: [readiness_out/security/csp_headers_check.txt](readiness_out/security/csp_headers_check.txt)

### Faucet E2E Testing
- ✅ **Dual-Token Faucet**: Rate limiting, dispense validation, dual-token path testing
  - Evidence: [readiness_out/faucet_e2e_report.md](readiness_out/faucet_e2e_report.md)
  - Test Artifacts: [readiness_out/faucet_e2e/](readiness_out/faucet_e2e/)
  - Request/Response Logs: [readiness_out/faucet_e2e/request1.json](readiness_out/faucet_e2e/request1.json), [readiness_out/faucet_e2e/response1.json](readiness_out/faucet_e2e/response1.json)
  - Balance Verification: [readiness_out/faucet_e2e/balances_after.json](readiness_out/faucet_e2e/balances_after.json)

## Launch Validation Commands

Execute the following commands to generate/verify evidence:

```bash
# Individual evidence packs
make evidence-perf          # Performance SLO validation
make evidence-observability # Monitoring & alerting
make evidence-security      # Security headers/CSP check  
make evidence-faucet        # Faucet E2E dual-token testing

# Complete evidence generation
make evidence-all           # Run all evidence packs + generate index
```

## Go/No-Go Decision Matrix

| Component | Status | Evidence Link | Blocker? |
|-----------|--------|---------------|----------|
| Performance SLO | ✅ PASS | [perf_report.md](readiness_out/perf_report.md) | No |
| Observability | ✅ PASS | [observability_report.md](readiness_out/observability_report.md) | No |
| Security Headers | ✅ PASS | [security_headers_report.md](readiness_out/security_headers_report.md) | No |
| Faucet E2E | ✅ PASS | [faucet_e2e_report.md](readiness_out/faucet_e2e_report.md) | No |
| **OVERALL READINESS** | **✅ GO** | [readiness_out/index.md](readiness_out/index.md) | **LAUNCH READY** |

## Legacy Faucet Alignment Notes

- PQC Policy: MVP requires PQC for all transactions.
  - [x] Documented exception: Faucet backend does not perform on-chain signing and thus is not PQC-signed.
  - [ ] Future item: switch faucet to PQC once PQC signer/RPC is available to services.

- Current faucet is an off-chain simulator. No secp256k1 or PQC signing performed.
- Node/validator transaction paths remain PQC-aligned per MVP.
- This exception remains only until PQC service-side signing flow is available.

---

## Sign-off

- **Release Engineering:** ____________________ Date: _______
- **Security:** ____________________ Date: _______  
- **Operations:** ____________________ Date: _______

*Regenerate upon any material artifact change using `make evidence-all`*

