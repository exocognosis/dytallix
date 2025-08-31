# PulseGuard Audit Gaps (Phase 3 Progress)

Spec Items vs Implementation (initial pass):

- Module Layout: ✅ directories created (api, ingest, graph, features, models, explain, alerts, pqc, bench, usecases, ops, tests)
- Processing Engine: ✅ initial event->features->ensemble->alerts pipeline
- Integrity Manifest: ▶ generator + signing implemented (need wiring & evidence write)
- Ingest fusion: placeholder enrichment; channel buffering present
- Dynamic Graph: minimal + path heuristic
- Temporal Features: ✅ basic velocity windows
- Structural Features: minimal
- Models: ✅ stub GBM + anomaly + ensemble; ❌ real model loading, threshold config
- API: SSE streaming; pending engine wiring (score path not yet using engine)
- Explainability: ▶ actual path extraction from DAG heuristic
- Ensemble: ▶ graph-aware inference path
- Usecases: only flash_loan stub
- PQC Security: response signing + manifest signing; need verification path
- Alerts: queue + suppression + stdout sink; need webhook/on-chain/Kafka optional sinks
- Bench: stub only
- Explorer signal: ❌ not implemented
- Evidence & Docs: ✅ initial docs, audit; ❌ comprehensive artifacts
- Config: no update yet
- Tests: ✅ latency unit test; ❌ feature/model/pqc/integration/e2e tests
- Performance target: ❌ unmeasured end-to-end

Next: integrate manifest generation into build/evidence pipeline, wire API to engine, add structural metrics, benchmarks, more usecases & tests.
