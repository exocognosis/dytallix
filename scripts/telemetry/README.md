Telemetry Analysis Pipeline (Prototype)
=====================================

Purpose: Rapid, high-ROI analysis of a Dytallix telemetry tarball (dytallix-telemetry-*.tgz) to extract core KPIs, anomalies, and summaries.

Workflow Stages
---------------
1. Ingest & Catalog
2. Normalize & Curate (Parquet layer)
3. KPI Computation
4. Anomaly & Error Pattern Detection
5. Reporting (JSON + CSV + Markdown)

Quick Start
-----------
python telemetry_pipeline.py --archive ../../dytallix-telemetry-202508231754.tgz --out ./output

Dependencies (minimal first):
- polars
- duckdb
- tqdm
- orjson (optional speed)
- rich (progress / pretty)

Extended (optional later):
- scikit-learn (IsolationForest / clustering)
- matplotlib / seaborn (basic charts)

Outputs
-------
- manifest.parquet
- fact_blocks.parquet
- fact_transactions.parquet
- kpi_summary.json
- anomalies.csv
- top_errors.csv
- address_concentration.csv
- report.md

Design Notes
------------
- Lazy scan where possible (polars.scan_* / duckdb external scan) to avoid loading entire dataset.
- Narrow early: select only required columns for each KPI.
- Timezone: normalize all timestamps to UTC (epoch ms internally).
- Idempotent: safe to re-run; output directory can be cleared or overwritten.
- Extensible: add stage functions without altering main control flow.
