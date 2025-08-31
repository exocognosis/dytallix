# PulseGuard Architecture (Initial Skeleton)

Dataflow: Ingest (mempool, finalized) -> Fusion -> Dynamic DAG -> Feature Engines (temporal, structural) -> Models (GBM + Anomaly) -> Ensemble -> Explainability -> Alerts -> API / Evidence.

Components created: minimal stubs for ingest, graph, features, models, api, explain, alerts, pqc signer.

Next iterations: enrichment joins, advanced structural queries, path tracing, SHAP-lite, streaming API & sinks, benchmarks, integrity manifest.
