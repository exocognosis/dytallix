#!/usr/bin/env bash
set -euo pipefail

NODE_API="${NODE_API:-http://localhost:3030}"
AI_API="${AI_API:-http://localhost:7000}"
EVID_DIR="${EVID_DIR:-$(dirname "${BASH_SOURCE[0]}")/../../launch-evidence/monitoring}"
LOG="$EVID_DIR/alert_test_output.log"
mkdir -p "$EVID_DIR"

echo "[sim_ai_latency_spike] $(date -Is) starting" | tee -a "$LOG"
echo "Injecting 2000ms delay into AI service..." | tee -a "$LOG"
curl -s "$AI_API/ops/set_delay?ms=2000" >/dev/null || true

REQ='{"tx":{"hash":"0xdeadbeef","from":"dyt1senderdev000000","to":"dyt1rcpt000000000","amount":12345,"fee":10,"nonce":1}}'

for i in $(seq 1 3); do
  TS_START=$(date +%s%3N)
  curl -s -X POST "$NODE_API/ai/score" -H 'content-type: application/json' -d "$REQ" >/dev/null || true
  TS_END=$(date +%s%3N)
  echo "ai_score req#$i latency_ms=$((TS_END-TS_START))" | tee -a "$LOG"
done

echo "Sampling AI /metrics for ai_latency_ms..." | tee -a "$LOG"
curl -sf "$AI_API/metrics" | rg '^ai_latency_ms' -n || true | tee -a "$LOG"

echo "Clearing delay..." | tee -a "$LOG"
curl -s "$AI_API/ops/set_delay?ms=0" >/dev/null || true

echo "[sim_ai_latency_spike] $(date -Is) done" | tee -a "$LOG"

