# ModuleTests

Top-level test framework for AI modules in Dytallix.

Structure:
- PulseGuard/ — anomaly detection test suite
- CodeShield/ — code risk analysis test suite
- config/ — shared environment, dataset paths, and logging config

Directory tree (key parts):
- ModuleTests/
  - config/.env.example
  - test_all.sh
  - CodeShield/
    - fixtures/contracts/{vulnerable,safe,upgradeable}
    - tools/{make_corpus.py,gas_profiles.py,retention.py}
    - runner/{pipeline.py,injector.py,config.yaml}
    - verify/{sarif_check.py,signature_check.sh}
    - smoke/{test_smoke.py,test_negatives.py,test_latency.py}
    - scenarios/{ast_cfg_ssa,taint_flow,symexec,gas_hints,api,storage_diff,rules}
    - dashboard/app.py
    - artifacts/{results.csv,errors.csv,latency.json,reports/,logs/}

How to run:
- Test all modules: ./test_all.sh
- CodeShield quick start:
  1) make -C ModuleTests/CodeShield setup
  2) make -C ModuleTests/CodeShield corpus
  3) make -C ModuleTests/CodeShield run
  4) make -C ModuleTests/CodeShield verify
  5) make -C ModuleTests/CodeShield smoke
  6) make -C ModuleTests/CodeShield scenarios
  7) make -C ModuleTests/CodeShield dashboard

Artifacts & retention:
- Each module writes to its own artifacts/ and logs/ under ModuleTests/<Module>/
- Results retained by default. Rotate by date and prune with `make -C ModuleTests/CodeShield retention` or `make clean`.
- CSV, JSON, SARIF, and NDJSON logs stored per run. Checksums/signatures can be added; see verify/signature_check.sh.
- Data retention policy: keep last N logs/reports (configurable via CODESHIELD_RETAIN_* env) and archive older runs to .tgz from the dashboard export.

Environment:
- Copy config/.env.example to config/.env and customize
- Shared vars: SOLC_VERSION, SAMPLESET_PATH, RESULTS_DIR, COSIGN_PUBKEY, CODESHIELD_* and PULSEGUARD_*

Reproducibility:
- Tests accept a --seed option or TEST_SEED env where applicable (e.g., corpus generation)
- Inputs/outputs/manifests recorded under artifacts/
- CI smoke and scenarios run via .github/workflows/module_tests.yml

GAN Mode (PulseGuard):
- PulseGuard now includes a GAN-based adversarial stream generator (CPU-friendly, optional PyTorch).
- See ModuleTests/PulseGuard/README.md for prepare/train/generate/run/eval commands.
