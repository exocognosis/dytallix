#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3030}" # node RPC/API
EVID_DIR="${EVID_DIR:-$(dirname "${BASH_SOURCE[0]}")/../../launch-evidence/monitoring}"
LOG="$EVID_DIR/alert_test_output.log"
mkdir -p "$EVID_DIR"

echo "[sim_height_stall] $(date -Is) starting" | tee -a "$LOG"
echo "Pausing block producer..." | tee -a "$LOG"
curl -s -X POST "$API_BASE/ops/pause" >/dev/null || true

H0=$(curl -sf "$API_BASE/stats" | jq -r '.height // 0' 2>/dev/null || echo 0)
echo "Initial height: $H0" | tee -a "$LOG"

sleep 10
H1=$(curl -sf "$API_BASE/stats" | jq -r '.height // 0' 2>/dev/null || echo 0)
echo "Height after 10s: $H1" | tee -a "$LOG"

sleep 10
H2=$(curl -sf "$API_BASE/stats" | jq -r '.height // 0' 2>/dev/null || echo 0)
echo "Height after 20s: $H2" | tee -a "$LOG"

if [[ "$H0" -eq "$H1" && "$H1" -eq "$H2" ]]; then
  echo "ALERT: Height stall detected (no change for 20s)" | tee -a "$LOG"
else
  echo "No stall: height progressed" | tee -a "$LOG"
fi

echo "Resuming block producer..." | tee -a "$LOG"
curl -s -X POST "$API_BASE/ops/resume" >/dev/null || true

echo "[sim_height_stall] $(date -Is) done" | tee -a "$LOG"

