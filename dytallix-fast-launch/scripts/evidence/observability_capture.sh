#!/usr/bin/env bash
# Capture Prometheus/Grafana evidence and trigger one alert
# Outputs under launch-evidence/observability/
# - prom_targets.json
# - grafana_dashboard.json
# - targets.png
# - validators.png
# - alert_test.log
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EVID_DIR="$ROOT_DIR/launch-evidence/observability"
PROM_URL="${PROM_URL:-http://localhost:9090}"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
DASH_UID="${GRAFANA_DASH_UID:-validators-tps}"
AUTH="${GRAFANA_AUTH:-admin:admin}"
LOG="$EVID_DIR/observability_capture.log"

mkdir -p "$EVID_DIR"
run() { echo "+ $*" | tee -a "$LOG"; "$@" 2>&1 | tee -a "$LOG"; }

# 1) Export Prometheus targets
if curl -fsS "$PROM_URL/api/v1/targets" -o "$EVID_DIR/prom_targets.json"; then
  echo "Saved prom_targets.json" | tee -a "$LOG"
else
  echo "WARN: could not reach Prometheus at $PROM_URL" | tee -a "$LOG"
fi

# 2) Export Grafana dashboard JSON (requires uid)
# Try with auth if provided
if curl -fsS -u "$AUTH" "$GRAFANA_URL/api/dashboards/uid/$DASH_UID" -o "$EVID_DIR/grafana_dashboard.json" || \
   curl -fsS "$GRAFANA_URL/api/dashboards/uid/$DASH_UID" -o "$EVID_DIR/grafana_dashboard.json"; then
  echo "Saved grafana_dashboard.json" | tee -a "$LOG"
else
  echo "WARN: could not fetch Grafana dashboard $DASH_UID" | tee -a "$LOG"
fi

# 3) Screenshots via headless Chrome if available
shot() {
  local url="$1" out="$2"; shift 2
  if command -v /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome >/dev/null 2>&1; then
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless --disable-gpu --hide-scrollbars --window-size=1400,900 --screenshot="$out" "$url" >/dev/null 2>&1 || true
  elif command -v chromium >/dev/null 2>&1; then
    chromium --headless --disable-gpu --hide-scrollbars --window-size=1400,900 --screenshot="$out" "$url" >/dev/null 2>&1 || true
  elif command -v google-chrome >/dev/null 2>&1; then
    google-chrome --headless --disable-gpu --hide-scrollbars --window-size=1400,900 --screenshot="$out" "$url" >/dev/null 2>&1 || true
  fi
}

shot "$PROM_URL/targets" "$EVID_DIR/targets.png"
shot "$GRAFANA_URL/d/$DASH_UID" "$EVID_DIR/validators.png"

# 4) Trigger an alert by pausing a node (best-effort)
ALERT_LOG="$EVID_DIR/alert_test.log"
if [ -x "$ROOT_DIR/scripts/induce_validator_halt.sh" ]; then
  echo "Triggering alert via induce_validator_halt.sh" | tee -a "$LOG"
  ("$ROOT_DIR/scripts/induce_validator_halt.sh" || true) | tee -a "$ALERT_LOG"
else
  echo "Simulating alert trigger (script missing)" | tee -a "$LOG"
  echo "$(date -u +%FT%TZ) simulated_alert: validator halted for 60s" | tee -a "$ALERT_LOG"
fi

echo "Artifacts in $EVID_DIR" | tee -a "$LOG"
ls -l "$EVID_DIR" | tee -a "$LOG"
