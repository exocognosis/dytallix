SHELL := /bin/bash
VERSION ?= v0.1.0
IMAGE_REPO ?= ghcr.io/<org>/dytallix-pulseguard
IMAGE := $(IMAGE_REPO):$(VERSION)
CHART_DIR := deploy/helm/pulseguard
RELEASE_DIR := release

# Python environment
PY?=python3
VENV?=.venv
BIN=$(VENV)/bin
PIP=$(BIN)/pip
PYTHON=$(BIN)/python
PYTEST=$(BIN)/pytest
UVICORN=$(BIN)/uvicorn

# Default ports
API_PORT?=8088
PROMETHEUS_PORT?=9109

.PHONY: all build run helm-package helm-dry-run sbom checksums sign release clean \
        setup install test test-unit bench run-synth run-live lint dev-test help

# Original targets
all: build helm-package sbom checksums

build:
	bash scripts/build.sh $(VERSION)

run:
	PORT=8090 bash scripts/run_local.sh

helm-package:
	bash scripts/helm_install.sh --package

helm-dry-run:
	bash scripts/helm_install.sh --dry-run

sbom:
	bash scripts/build.sh $(VERSION) --sbom-only

checksums:
	bash scripts/build.sh $(VERSION) --checksums-only

sign:
	bash scripts/sign_artifacts.sh $(VERSION)

release: all sign

# New MVP targets
help:
	@echo "PulseGuard MVP Commands:"
	@echo "  setup           - Create virtual environment and install dependencies"
	@echo "  install         - Install dependencies only"
	@echo "  test            - Run all tests"
	@echo "  test-unit       - Run unit tests only"  
	@echo "  bench           - Run latency benchmark"
	@echo "  run-synth       - Run synthetic pipeline + API"
	@echo "  run-live        - Run live connectors + API"
	@echo "  lint            - Run code linting"
	@echo "  dev-test        - Run tests with verbose output"

setup: venv install

venv:
	@test -d $(VENV) || python3 -m venv $(VENV)
	@$(PIP) install -U pip wheel

install: venv
	@$(PIP) install -r requirements.txt

test: install test-unit

test-unit: install
	@echo "Running unit tests..."
	@PYTHONPATH=. $(PYTEST) tests/ -v --tb=short --maxfail=5

bench: install
	@echo "Running latency benchmark (requires API to be running)..."
	@PYTHONPATH=. $(PYTHON) -c "
import time
import requests
import statistics

print('Testing /score endpoint latency...')
latencies = []
for i in range(20):
    start = time.time()
    try:
        resp = requests.post('http://localhost:$(API_PORT)/score', 
                           json={'tx_hash': f'0x{i:064x}'}, 
                           timeout=2)
        latencies.append((time.time() - start) * 1000)
    except Exception as e:
        print(f'Request {i} failed: {e}')

if latencies:
    p95 = statistics.quantiles(latencies, n=20)[18] if len(latencies) > 5 else max(latencies)
    print(f'P95 latency: {p95:.1f}ms (target: <100ms)')
    print(f'Status: {"✓ PASS" if p95 < 100 else "✗ FAIL"}')
else:
    print('No successful requests - is API running on port $(API_PORT)?')
"

run-synth: install
	@echo "Starting PulseGuard in synthetic mode on port $(API_PORT)..."
	@PULSEGUARD_MODE=synthetic API_PORT=$(API_PORT) PYTHONPATH=. $(PYTHON) -m service.api

run-live: install
	@echo "Starting PulseGuard in live mode on port $(API_PORT)..."
	@PULSEGUARD_MODE=live API_PORT=$(API_PORT) PYTHONPATH=. $(PYTHON) -m service.api

lint: install
	@echo "Running linters..."
	@$(PYTHON) -m flake8 --max-line-length=100 --ignore=E203,W503 \
		service/ models/ features/ graph/ connectors/ detectors/ 2>/dev/null || echo "flake8 not available"

dev-test: install
	@PYTHONPATH=. $(PYTEST) tests/ -v --tb=long --durations=10

clean:
	rm -f $(RELEASE_DIR)/*.tgz $(RELEASE_DIR)/SHA256SUMS $(RELEASE_DIR)/SBOM.cyclonedx.json
	@rm -rf $(VENV) __pycache__ .pytest_cache .mypy_cache
	@find . -name "*.pyc" -delete 2>/dev/null || true
	@find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

