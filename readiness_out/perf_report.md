# Performance SLO Report

**Generated:** 2025-09-26T11:36:00Z  
**Test Duration:** 5s  
**Target RPS:** 5  
**Concurrency:** 64  

## Latency Distribution

| Metric | Value |
|--------|-------|
| P50 | 230ms |
| P95 | 295ms |
| P99 | 297ms |

## Throughput Analysis

| Metric | Value |
|--------|-------|
| Actual TPS | 0 |
| Target TPS | 5 |
| Achievement Rate | 0% |
| Success Rate | 0% |

## SLO Compliance

- **Confirmation Latency**: ✅ PASS (P95 < 2s target)
- **Throughput**: ❌ FAIL (>50% of target TPS)
- **Confirmations**: ❌ FAIL (Non-zero successful confirmations)

## Artifacts

- **Raw Results**: [raw_results.jsonl](perf/raw_results.jsonl)
- **Latency Histogram**: [latency_hist.json](perf/latency_hist.json)
- **Summary Metrics**: [summary.json](perf/summary.json)
