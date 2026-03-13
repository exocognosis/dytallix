# PulseGuard Module Tests

This suite validates the PulseGuard anomaly detection module with synthetic streams, attack injections, and telemetry.

Setup:
- make install
- Optionally start the API locally: make run (uses dytallix-modules/pulseguard/src/server.py)

Run tests:
- make test-pulseguard
- Streamlit dashboard: make dashboard

Artifacts:
- Stored under artifacts/<timestamp>/ with results.csv, summary_report.md, and manifest.json
- Logs stored under logs/

Reproducibility:
- Use --seed to fix RNG. All parameters stored in manifest.json.

GAN mode:
- New adversarial data generator that produces near-normal and adversarial time-series sequences.
- Files under generator/: utils.py, dataset.py, gan_mode.py (PyTorch optional; falls back to statistical sampler).
- Artifacts under artifacts/gan/: scaler.pkl, model_checkpoint/best.ckpt|best.json, train_metrics.json, generated_sequences.jsonl, eval_report.md, eval_metrics.json.

Usage:
- Prepare scaler/dataset: make gan-prepare
- Train GAN (CPU-friendly by default): make gan-train
- Generate sequences: make gan-generate N=1000 MODE=adversarial SEED=42
- Run pipeline with GAN mixing: make gan-run (respects env GAN_* and pipeline flags)
- Evaluate quick benchmarks: make gan-eval
- Dashboard with GAN controls: make gan-dashboard
