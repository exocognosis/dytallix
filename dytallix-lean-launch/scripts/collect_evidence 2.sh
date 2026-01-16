#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EVID_DIR="$ROOT_DIR/launch-evidence/metrics-dashboard"
mkdir -p "$EVID_DIR"
TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)

log(){ echo "[evidence][$TS] $*"; }

log "Running smoke metrics script"
if [ -f "$ROOT_DIR/../scripts/smoke_metrics.sh" ]; then
  bash "$ROOT_DIR/../scripts/smoke_metrics.sh" || true
fi

log "Capturing WebSocket messages"
node "$ROOT_DIR/scripts/ws_capture.js" || true

log "Running UI tests"
UI_REPORT="$EVID_DIR/test_report_${TS}.txt"
( cd "$ROOT_DIR" && npm run test --silent ) > "$UI_REPORT" 2>&1 || true

REQUIRED=(curl_health curl_overview curl_timeseries_tps)
MISSING=0
for base in "${REQUIRED[@]}"; do
  f=$(ls "$EVID_DIR"/${base}_*.json 2>/dev/null | head -n1 || true)
  if [ -z "$f" ]; then
    log "Missing artifact: ${base}_*.json"
    MISSING=1
  fi
done

if [ ! -s "$UI_REPORT" ]; then
  log "Missing UI test report"; MISSING=1
fi

RUN_LOG="$EVID_DIR/run_log_${TS}.txt"
echo "Run log placeholder. Attach process supervisor logs if needed." > "$RUN_LOG"

if [ $MISSING -ne 0 ]; then
  log "Evidence collection completed with missing artifacts" >&2
  exit 1
fi

log "Evidence collection complete -> $EVID_DIR"
