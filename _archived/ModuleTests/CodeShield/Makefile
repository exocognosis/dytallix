.PHONY: corpus run verify smoke dashboard clean setup verify-sig scenarios test

PY=python3
PIP=pip
ART=artifacts
REPORTS=$(ART)/reports

# Dedicated dashboard port to avoid conflict with PulseGuard (which uses 8501)
DASHBOARD_PORT ?= 8512
# API port for health checks (can be overridden: make health API_PORT=7082)
API_PORT ?= 7081

requirements.txt:
	@echo "httpx\npydantic\njsonschema\nstreamlit\nplotly\npytest\npandas" > requirements.txt

setup: requirements.txt
	$(PIP) install -r requirements.txt

corpus:
	$(PY) tools/make_corpus.py
	$(PY) tools/gas_profiles.py

run:
	$(PY) runner/pipeline.py || true
	$(PY) runner/injector.py || true

verify:
	@echo "Validating SARIF..." && true
	@if ls $(REPORTS)/*.sarif >/dev/null 2>&1; then $(PY) verify/sarif_check.py $(REPORTS)/*.sarif; else echo "No SARIF files"; fi
	@$(MAKE) verify-sig || true

verify-sig:
	@if ls $(REPORTS)/*.sig >/dev/null 2>&1; then \
	  for f in $(REPORTS)/*.json $(REPORTS)/*.sarif; do \
	    if [ -f "$$f.sig" ]; then ./verify/signature_check.sh "$$f"; fi; \
	  done; \
	else echo "No signatures found"; fi

smoke: corpus run
	pytest -q smoke/test_smoke.py smoke/test_negatives.py smoke/test_latency.py || true

scenarios: corpus run
	pytest -q scenarios || true

# alias
test: scenarios

dashboard:
	streamlit run dashboard/app.py --server.port $(DASHBOARD_PORT)

retention:
	python3 tools/retention.py || true

clean:
	rm -rf $(ART)/*.csv $(ART)/*.json $(ART)/*.parquet $(REPORTS) $(ART)/logs || true
	mkdir -p $(REPORTS)
	$(MAKE) retention || true

start:
	bash start.sh

health:
	@echo "Checking /health (mock server) on :$(API_PORT)" && curl -sfL http://127.0.0.1:$(API_PORT)/health | jq . || echo "health check failed"
