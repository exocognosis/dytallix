# Dytallix Telemetry Analysis

Place telemetry archives (dytallix-telemetry-*.tgz) in this directory or reference them with --archive.

Output artifacts from running the pipeline will be stored in per-run subdirectories under `output/`:

Example:
```
telemetry_analysis/
  dytallix-telemetry-202508231754.tgz
  output/
    20250823_1754/
      manifest.parquet
      fact_blocks.parquet
      fact_transactions.parquet
      top_errors.parquet
      anomalies.parquet
      kpi_summary.json
      address_concentration.csv
      report.md
```

Run:
```
python ../scripts/telemetry/telemetry_pipeline.py \
  --archive dytallix-telemetry-202508231754.tgz \
  --out output/20250823_1754
```
