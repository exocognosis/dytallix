PY?=python3
VENV?=.venv
BIN=$(VENV)/bin
PIP=$(BIN)/pip
PYTHON=$(BIN)/python
STREAMLIT=$(BIN)/streamlit
PYTEST=$(BIN)/pytest

APP_PORT?=8090

.PHONY: venv install test-pulseguard dashboard run clean export-ci unit \
	gan-prepare gan-train gan-generate gan-run gan-eval gan-dashboard

venv:
	@test -d $(VENV) || python3 -m venv $(VENV)
	@$(PIP) install -U pip wheel
	@$(PIP) install -r requirements.txt

install: venv

run:
	@echo "Starting PulseGuard API (if not already)..."
	@PG_PORT=$(APP_PORT) $(PYTHON) run_local_api.py || true

unit: install
	@PYTHONPATH=. $(PYTEST) -q --maxfail=1

# Execute unit tests then the synthetic pipeline and write artifacts
test-pulseguard: unit
	@TEST_RUN=1 $(PYTHON) pipeline_runner.py --duration 30 --rate 5 --seed 42

# Launch the dashboard
dashboard: install
	@PYTHONPATH=. $(STREAMLIT) run dashboard/app.py --server.port 8501

clean:
	@rm -rf $(VENV) __pycache__ *.pyc artifacts/* logs/*

export-ci: install
	@echo "Exporting minimal smoke test for CI"
	@TEST_RUN=1 $(PYTHON) pipeline_runner.py --duration 5 --rate 2 --seed 1 --ci

# --- GAN mode targets ---
GAN_ART=artifacts/gan

gan-prepare: install
	@echo "[GAN] Building dataset and scaler"
	@PYTHONPATH=. $(PYTHON) - <<'PY'
from generator.dataset import DatasetConfig, build_and_save
cfg = DatasetConfig(total_steps=1024, window=64, stride=8)
paths = build_and_save(cfg)
print("Saved:", paths)
PY

gan-train: install gan-prepare
	@echo "[GAN] Training (lightweight)"
	@PYTHONPATH=. $(PYTHON) - <<'PY'
from pathlib import Path
import numpy as np
from generator.gan_mode import TimeSeriesGAN, TrainConfig
from generator.utils import FeatureScaler
art = Path('$(GAN_ART)')
scaler = FeatureScaler.load(art / 'scaler.pkl')
data = np.load(art / 'dataset.npz')
Xtr, Xv = data['X_train'], data['X_val']
gan = TimeSeriesGAN(scaler, window=Xtr.shape[1], device='cpu', prefer_torch=True, seed=42)
metrics, ckpt = gan.train(Xtr, Xv, TrainConfig(epochs=2, batch_size=64, lr=1e-3, window=Xtr.shape[1], device='cpu', seed=42, out_dir=art))
print('Saved checkpoint at', ckpt)
PY

gan-generate: install gan-prepare
	@echo "[GAN] Generating sequences: N=$(N) MODE=$(MODE) SEED=$(SEED)"
	@PYTHONPATH=. $(PYTHON) - <<'PY'
import os, json
from pathlib import Path
from generator.gan_mode import TimeSeriesGAN
from generator.utils import FeatureScaler
N = int(os.getenv('N', '1000'))
MODE = os.getenv('MODE', 'adversarial')
SEED = int(os.getenv('SEED', '42'))
art = Path('artifacts/gan')
art.mkdir(parents=True, exist_ok=True)
scaler = FeatureScaler.load(art / 'scaler.pkl')
gan = TimeSeriesGAN.load_from_artifacts(art, window=64, device='cpu')
seqs = gan.generate_sequences(N, mode=MODE, seed=SEED)
out = art / 'generated_sequences.jsonl'
with open(out, 'w') as fh:
    for s in seqs:
        fh.write(json.dumps({'mode': MODE, 'seed': SEED, 'sequence': s.tolist()})+'\n')
print('Wrote', out)
PY

gan-run: install
	@echo "[GAN] Running pipeline with GAN mixing"
	@GAN_MODE?=adversarial
	@GAN_MIX?=0.3
	@PYTHONPATH=. $(PYTHON) pipeline_runner.py --duration 20 --rate 5 --seed 7 --ci --gan-mode $${GAN_MODE} --gan-mix-ratio $${GAN_MIX}

gan-eval: install
	@echo "[GAN] Evaluating quick benchmarks"
	@PYTHONPATH=. $(PYTHON) eval/gan_eval.py --quick --seed 42

gan-dashboard: dashboard
