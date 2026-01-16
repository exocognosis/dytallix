# AI Risk Oracle Report

Generated: 2025-10-04T13:59:31Z

## Overview

The AI risk pipeline provides real-time transaction risk scoring with strict latency SLOs. This report demonstrates the integration, performance, and fallback mechanisms.

## Architecture

```
Transaction → API Server → AI Oracle → Risk Score
                  ↓             ↓
              Timeout        Model
              Handler      Inference
                  ↓
              Fallback
              Heuristic
```

## Latency Performance

### SLO Targets

- **p50 latency**: < 500ms (target)
- **p95 latency**: < 1000ms (SLO)
- **p99 latency**: < 2000ms (max acceptable)
- **Timeout**: 1000ms (with fallback)

### Measured Performance

| Metric | Value | Status |
|--------|-------|--------|
| Min latency | 156ms | ✓ |
| Mean latency | 247ms | ✓ |
| p50 latency | 234ms | ✓ PASS (target: 500ms) |
| p95 latency | 445ms | ✓ PASS (SLO: 1000ms) |
| p99 latency | 445ms | ✓ PASS (max: 2000ms) |

**SLO Status**: ✅ PASS (p95: 445ms < 1000ms SLO)

### Sample Results

Evidence: `launch-evidence/ai/latency_samples.json`

10 sample transactions tested with measured latencies and risk scores.

## Risk Scoring

### Example Transaction

Evidence: `launch-evidence/ai/sample_risk.json`

```json
{
  "tx_hash": "tx...0005",
  "risk_score": 0.89,
  "risk_level": "high",
  "confidence": 0.95,
  "factors": {
    "gas_usage": 0.7,
    "value_transfer": 0.9,
    "contract_interaction": 0.95,
    "pattern_anomaly": 0.85
  },
  "latency_ms": 278,
  "model_version": "pulseguard-v1.2.0"
}
```

Risk levels:
- `0.0 - 0.3`: Low risk (green)
- `0.3 - 0.6`: Medium risk (yellow)
- `0.6 - 1.0`: High risk (red)

## Explorer Integration

### Risk Badge Display

The explorer displays risk scores on:
1. Transaction detail pages
2. Transaction list rows
3. Account activity summaries

### UI States

| State | Display | Condition |
|-------|---------|-----------|
| Success | Risk badge with score | Score received within timeout |
| Fallback | "Risk: estimated" | Timeout, fallback heuristic used |
| Error | "Risk: unavailable" | Service down, no fallback |
| Loading | Spinner | Request in progress |

### Fallback Mechanism

When AI Oracle is unavailable or times out:

1. **Timeout handling**: Request cancelled after 1000ms
2. **Fallback heuristic**: Simple rule-based scoring
   - Gas usage > 100k: +0.3 risk
   - Contract execution: +0.4 risk
   - Contract deploy: +0.3 risk
   - Base risk: 0.1
3. **UI indication**: Badge shows "estimated" label
4. **Metrics**: Fallback rate tracked in Prometheus

### Backend Integration

Server endpoint: `/api/ai/risk/transaction/:hash`

```javascript
// Timeout protection
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), AI_ORACLE_TIMEOUT_MS)

try {
  const response = await fetch(AI_ORACLE_URL, { 
    signal: controller.signal,
    ...
  })
  // Process response
} catch (err) {
  if (err.name === 'AbortError') {
    // Use fallback heuristic
    return calculateFallbackRisk(transaction)
  }
  throw err
} finally {
  clearTimeout(timeout)
}
```

## Monitoring

### Prometheus Metrics

- `dyt_oracle_request_latency_seconds` - Request latency histogram
- `dyt_oracle_latency_seconds` - Legacy latency metric
- `ai_oracle_requests_total` - Total requests counter
- `ai_oracle_failures_total` - Failed requests counter
- `ai_oracle_latency_seconds` - Request duration histogram

### Alerts

- **AILatencyDegraded**: p95 > 1000ms for 2 minutes
- **AIOracleDown**: Service unreachable for 2 minutes

See: `ops/grafana/alerts/dytallix-alerts.yml`

## Evidence Artifacts

| File | Description |
|------|-------------|
| `launch-evidence/ai/latency_samples.json` | 10 sample requests with latencies |
| `launch-evidence/ai/sample_risk.json` | Detailed risk score example |
| `readiness_out/report_ai_oracle.md` | This summary report |

## Deployment Checklist

- [x] AI Oracle deployed and accessible
- [x] Timeout protection (1000ms) implemented
- [x] Fallback heuristic working
- [x] Explorer UI displays risk badges
- [x] Error states handled gracefully
- [x] Latency SLO met (p95 < 1000ms)
- [x] Prometheus metrics exported
- [x] Alerts configured
- [x] Documentation complete

## Conclusion

The AI risk pipeline is production-ready:
- ✓ Latency SLO met (p95: 445ms < 1000ms target)
- ✓ Fallback mechanism validated
- ✓ Explorer integration complete
- ✓ Monitoring and alerts configured

The system provides reliable risk scoring with graceful degradation when the AI service is unavailable.

