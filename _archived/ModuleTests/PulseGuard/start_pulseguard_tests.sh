#!/usr/bin/env zsh
set -euo pipefail

# Start the PulseGuard API (if needed) and run the synthetic test pipeline.
# Optional: launch dashboard.
#
# Usage:
#   ./start_pulseguard_tests.sh [-d duration] [-r rate] [-s seed] [--ci] [--dashboard] [--no-api] [--continuous] [--dash-port <port>]
#
# Examples:
#   ./start_pulseguard_tests.sh -d 30 -r 5 -s 42
#   ./start_pulseguard_tests.sh --ci --no-api
#   PULSEGUARD_API=http://localhost:8091 ./start_pulseguard_tests.sh

BASE_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$BASE_DIR"

# Load shared env if present
if [[ -f "../config/env.local" ]]; then
  source ../config/env.local
elif [[ -f "../config/env.example" ]]; then
  source ../config/env.example
fi

: ${PULSEGUARD_API:=http://localhost:8090}
# Encourage visible alerts during tests unless user overrides
: ${ALERT_THRESHOLD:=0.5}

DURATION=30
RATE=5
SEED=42
CI=0
DASHBOARD=0
NO_API=0
CONTINUOUS=0
KEEP_DASH=1  # default: keep dashboard alive after pipeline (non-continuous)
DASHBOARD_PORT=${DASHBOARD_PORT:-8501}

print_usage() {
  cat <<USAGE
Start PulseGuard test system

Options:
  -d <seconds>          Duration (default: $DURATION; use --continuous to run until interrupted)
  -r <rate>             Events per second (default: $RATE)
  -s <seed>             RNG seed (default: $SEED)
  --ci                  CI-friendly short run (suppresses table)
  --dashboard           Open Streamlit dashboard (runs concurrently)
  --no-keep-dashboard   (Default now keeps it) Exit after pipeline instead of keeping dashboard running
  --keep-dashboard      (Backward compat) Explicitly keep dashboard (default behavior)
  --no-api              Do not start local API (assumes PULSEGUARD_API is reachable)
  -c, --continuous      Run indefinitely until Ctrl-C
  -p, --dash-port       Dashboard port (default: $DASHBOARD_PORT)
USAGE
}

zparseopts -D -E \
  d:=_d r:=_r s:=_s \
  -ci=_ci -dashboard=_dash -keep-dashboard=_keepdash -no-keep-dashboard=_nokeepdash -no-api=_noapi -help=_help -continuous=_cont c=_conts \
  p:=_dport -dash-port:=_dport || true

if [[ -n "${_help:-}" ]]; then
  print_usage
  exit 0
fi
[[ -n "${_d:-}" ]] && DURATION=${_d[2]}
[[ -n "${_r:-}" ]] && RATE=${_r[2]}
[[ -n "${_s:-}" ]] && SEED=${_s[2]}
[[ -n "${_ci:-}" ]] && CI=1
[[ -n "${_dash:-}" ]] && DASHBOARD=1
[[ -n "${_keepdash:-}" ]] && KEEP_DASH=1
[[ -n "${_nokeepdash:-}" ]] && KEEP_DASH=0
[[ -n "${_noapi:-}" ]] && NO_API=1
[[ -n "${_cont:-}" || -n "${_conts:-}" ]] && CONTINUOUS=1
[[ -n "${_dport:-}" ]] && DASHBOARD_PORT=${_dport[2]}

find_free_port() {
  local p=${1:-8501}
  for i in {0..20}; do
    if ! lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
      echo $p; return 0
    fi
    p=$((p+1))
  done
  return 1
}

# Python venv and deps
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -U pip wheel >/dev/null
pip install -r requirements.txt >/dev/null

# Start API if needed
API_PID=""
if [[ $NO_API -eq 0 ]]; then
  START_LOCAL=0
  if curl -sf "${PULSEGUARD_API}/health" >/dev/null 2>&1; then
    # Preflight a minimal /score request; some stale servers return 200 on /health but 500 on /score
    if ! curl -sf -X POST "${PULSEGUARD_API}/score" \
        -H 'Content-Type: application/json' \
        -d '{"tx":{"value":1,"gas":21000}}' >/dev/null 2>&1; then
      echo "[PulseGuard] Existing API failed /score preflight; launching local API on a free port."
      START_LOCAL=1
    else
      echo "[PulseGuard] API is reachable and passed /score preflight at ${PULSEGUARD_API}"
    fi
  else
    START_LOCAL=1
  fi

  if [[ $START_LOCAL -eq 1 ]]; then
    # Choose a free port near requested one to avoid clashes
    REQ_PORT=${PULSEGUARD_API##*:}
    [[ "$REQ_PORT" == "$PULSEGUARD_API" ]] && REQ_PORT=8090
    PORT=$(find_free_port "$REQ_PORT" || echo "$REQ_PORT")
    export PORT
    export ALERT_THRESHOLD  # propagate chosen threshold
    export PULSEGUARD_API="http://localhost:${PORT}"
    echo "[PulseGuard] Starting local API on port $PORT (PULSEGUARD_API=$PULSEGUARD_API)..."
    python run_local_api.py >/dev/null 2>&1 &
    API_PID=$!
    # Wait for health
    for i in {1..60}; do
      if curl -sf "${PULSEGUARD_API}/health" >/dev/null 2>&1; then
        # Validate /score too
        if curl -sf -X POST "${PULSEGUARD_API}/score" -H 'Content-Type: application/json' -d '{"tx":{"value":1,"gas":21000}}' >/dev/null 2>&1; then
          echo "[PulseGuard] Local API is up at ${PULSEGUARD_API}"
          break
        fi
      fi
      sleep 0.5
    done
  fi
fi

DASH_PID=""
cleanup() {
  if [[ -n "${DASH_PID}" ]]; then
    kill "${DASH_PID}" 2>/dev/null || true
  fi
  if [[ -n "${API_PID}" ]]; then
    kill "${API_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Run unit tests briefly (optional)
if command -v pytest >/dev/null 2>&1; then
  PYTHONPATH=. pytest -q --maxfail=1 || true
fi

# Launch dashboard (concurrently) if requested
if [[ $DASHBOARD -eq 1 ]]; then
  mkdir -p logs
  # Ensure streamlit is available
  if ! python - <<'PY' >/dev/null 2>&1
import importlib, sys
sys.exit(0 if importlib.util.find_spec('streamlit') else 1)
PY
  then
    echo "[PulseGuard] Streamlit not found in venv; installing..."
    pip install streamlit >/dev/null
  fi
  # Resolve port (fallback to free port if requested one is busy)
  SEL_PORT=$(find_free_port "$DASHBOARD_PORT" || echo "$DASHBOARD_PORT")
  if [[ "$SEL_PORT" != "$DASHBOARD_PORT" ]]; then
    echo "[PulseGuard] Requested port $DASHBOARD_PORT busy; using $SEL_PORT"
  fi
  export STREAMLIT_BROWSER_GATHER_USAGE_STATS=false
  export STREAMLIT_SERVER_HEADLESS=true
  export PYTHONUNBUFFERED=1
  echo "[PulseGuard] Launching dashboard at http://localhost:$SEL_PORT ..."
  python -m streamlit run dashboard/app.py \
    --server.port "$SEL_PORT" \
    --server.address localhost \
    --server.headless true \
    --browser.gatherUsageStats false >> logs/dashboard.out 2>&1 &
  DASH_PID=$!
  # Wait for port readiness
  READY=0
  for i in {1..80}; do
    if lsof -nP -iTCP:$SEL_PORT -sTCP:LISTEN >/dev/null 2>&1; then
      READY=1
      break
    fi
    sleep 0.25
  done
  if [[ $READY -eq 1 ]]; then
    echo "[PulseGuard] Dashboard is up at http://localhost:$SEL_PORT (pid $DASH_PID)"
    if [[ $CI -eq 0 ]] && command -v open >/dev/null 2>&1; then
      open "http://localhost:$SEL_PORT" || true
    fi
  else
    echo "[PulseGuard] Dashboard failed to start. See logs/dashboard.out"
    tail -n 80 logs/dashboard.out || true
  fi
fi

# Run pipeline
CMD=(python pipeline_runner.py --rate "$RATE" --seed "$SEED")
if [[ $CONTINUOUS -eq 1 ]]; then
  CMD+=(--duration 0)
else
  CMD+=(--duration "$DURATION")
fi
if [[ $CI -eq 1 ]]; then CMD+=(--ci); fi

echo "[PulseGuard] Running: ${CMD[@]}"
"${CMD[@]}"

# Show latest artifact dir (won't be reached until exit in continuous mode)
LATEST=$(ls -1dt artifacts/*(/N) 2>/dev/null | head -1 || true)
if [[ -n "$LATEST" ]]; then
  echo "[PulseGuard] Latest artifacts: $LATEST"
fi

# In non-continuous mode, if dashboard requested but not started earlier, you could
# start it here; however we already launch it before the pipeline when requested.

# After pipeline run, optionally keep dashboard alive
if [[ $KEEP_DASH -eq 1 && $DASHBOARD -eq 1 && $CONTINUOUS -eq 0 ]]; then
  if [[ -n "${DASH_PID}" ]]; then
    echo "[PulseGuard] Pipeline finished; keeping dashboard (pid $DASH_PID) running. Use --no-keep-dashboard to auto-exit. Ctrl-C to quit." 
    wait $DASH_PID || true
  fi
fi
