# AI Oracle Integration Readiness

## Execution summary
- `docker compose -f ops/ai-oracle-compose.yml up` builds the node with the oracle feature enabled and launches the FastAPI scoring service on `localhost:8080/api/ai/risk`.
- `scripts/test_ai_oracle.sh` drives 10 scoring requests (reusing on-chain hashes when available and synthesising the remainder) and records latency/fallback data under `readiness_out/`.
- Prometheus metrics from both the Express proxy (`/metrics`) and the microservice (`http://localhost:8080/metrics`) expose request counts, latency histograms, and failure tallies for observability.

## Latency validation (< 1 second target)
Sample output captured via `scripts/test_ai_oracle.sh` while both services were healthy:

```text
[2025-02-19T15:22:03Z] hash=0x9b5c...45 source=ledger   latency_ms=384 score=0.42
[2025-02-19T15:22:04Z] hash=0x83de...aa source=ledger   latency_ms=421 score=0.37
[2025-02-19T15:22:05Z] hash=0x0f74...1c source=ledger   latency_ms=398 score=0.51
[2025-02-19T15:22:05Z] hash=0xa47c...e9 source=synthetic latency_ms=407 score=0.46
[2025-02-19T15:22:06Z] hash=0xb210...98 source=synthetic latency_ms=433 score=0.39
[2025-02-19T15:22:06Z] hash=0xe530...b2 source=synthetic latency_ms=412 score=0.44
[2025-02-19T15:22:07Z] hash=0xc1a9...0f source=synthetic latency_ms=426 score=0.41
[2025-02-19T15:22:08Z] hash=0xd910...72 source=synthetic latency_ms=478 score=0.35
[2025-02-19T15:22:09Z] hash=0xf81d...cb source=synthetic latency_ms=389 score=0.47
[2025-02-19T15:22:09Z] hash=0x1bb4...63 source=synthetic latency_ms=405 score=0.43
```

Aggregated statistics from the same run:

| Metric | Value |
| --- | --- |
| Samples | 10 |
| Median latency | **0.41 s** |
| P95 latency | **0.48 s** |
| Max latency | **0.48 s** |

## Fallback behaviour
After stopping the AI container (`docker compose -f ops/ai-oracle-compose.yml stop ai-oracle`) the proxy returned the configured fallback payload without crashing:

```json
{
  "hash": "0x9b5c...45",
  "risk_status": "unavailable",
  "ai_risk_score": null
}
```

The script logged the event to `readiness_out/ai_oracle_fallback.log`:

```text
[2025-02-19T15:36:22Z] hash=0x9b5c...45 source=ledger risk_status=unavailable latency_ms=1003
```

## Metrics verification
- `ai_oracle_requests_total{result="success"}` increments with every enriched response; `result="failure"` tracks fallbacks.
- `ai_oracle_latency_seconds_bucket` shows all requests landing in the sub-second buckets during healthy runs.
- `ai_oracle_failures_total{reason="timeout"}` increments only when the microservice is offline or exceeds the 1s timeout.
- Microservice-side metrics (`ai_oracle_microservice_requests_total`, `ai_oracle_microservice_latency_seconds_bucket`) mirror the proxy counts and confirm end-to-end visibility.

## Next steps
1. Run `scripts/test_ai_oracle.sh` after each deployment to refresh the latency/fallback logs.
2. Wire the new metrics into the existing Prometheus/Grafana dashboards for alerting (<1s SLO, failure spikes).
3. Keep the FastAPI service behind the compose stack so CI/CD can exercise the same setup used in this validation.
