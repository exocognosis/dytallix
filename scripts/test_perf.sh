#!/usr/bin/env bash
set -euo pipefail

# Simple performance benchmarking script for Dytallix chain
# Requirements:
#  - curl, jq
#  - runs sustained load for >= 1h (default 3600s) generating transactions and sampling block metrics
#  - produces JSON report launch-evidence/perf/perf_report_<UTC>.json
#  Metrics: avgTPS, avgBlockTime, variance (percent), errorRate, duration (seconds)

DURATION_SECONDS=${DURATION_SECONDS:-3600}
RPC_ENDPOINT=${RPC_ENDPOINT:-"http://localhost:26657"}
WALLET_ADDR=${WALLET_ADDR:-"dyt1perfaddrxyz"}
SLEEP_BETWEEN_TX=${SLEEP_BETWEEN_TX:-0.2}   # seconds between tx submissions per worker
WORKERS=${WORKERS:-4}
REPORT_DIR="launch-evidence/perf"
START_TS=$(date -u +%s)
START_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
REPORT_FILE="${REPORT_DIR}/perf_report_$(date -u +%Y%m%dT%H%M%SZ).json"
TMP_DIR=$(mktemp -d)

mkdir -p "$REPORT_DIR"

echo "Starting performance test: duration=${DURATION_SECONDS}s endpoint=${RPC_ENDPOINT} workers=${WORKERS}" >&2

echo "{}" > "${TMP_DIR}/tx_counts.json" # placeholder
TX_SUCCESS=0
TX_ERROR=0

# Shared files
BLOCK_TIMES_FILE="${TMP_DIR}/block_times.log"
TX_RESULT_FILE="${TMP_DIR}/tx_results.log"
: > "$BLOCK_TIMES_FILE"
: > "$TX_RESULT_FILE"

stop_flag=0
trap 'stop_flag=1' INT TERM

# Function: submit a lightweight tx (placeholder uses /broadcast_tx_commit)
submit_tx() {
  local nonce rand payload resp ok
  nonce=$(date +%s%N)
  rand=$RANDOM
  payload="{\"type\":\"perf\",\"nonce\":${nonce},\"rand\":${rand}}"
  # base64 or hex encode minimal payload - using plain for placeholder
  resp=$(curl -sS -X POST "${RPC_ENDPOINT}/broadcast_tx_commit?tx=${payload}" || true)
  if echo "$resp" | jq -e '.error | not' >/dev/null 2>&1; then
    echo 1 >> "$TX_RESULT_FILE"
  else
    echo 0 >> "$TX_RESULT_FILE"
  fi
}

# Worker loop
worker() {
  while [ $(( $(date -u +%s) - START_TS )) -lt $DURATION_SECONDS ] && [ $stop_flag -eq 0 ]; do
    submit_tx || true
    sleep "$SLEEP_BETWEEN_TX"
  done
}

# Block sampler: poll latest block time & height
sample_blocks() {
  local last_height=0
  while [ $(( $(date -u +%s) - START_TS )) -lt $DURATION_SECONDS ] && [ $stop_flag -eq 0 ]; do
    local status json height time
    status=$(curl -sS "${RPC_ENDPOINT}/status" || true)
    if [ -n "$status" ]; then
      height=$(echo "$status" | jq -r '.result.sync_info.latest_block_height' 2>/dev/null || echo 0)
      time=$(echo "$status" | jq -r '.result.sync_info.latest_block_time' 2>/dev/null || echo null)
      if [ "$height" != "null" ] && [ "$time" != "null" ] && [ "$height" -gt 0 ] && [ "$height" -ne "$last_height" ]; then
        echo "$height $time" >> "$BLOCK_TIMES_FILE"
        last_height=$height
      fi
    fi
    sleep 1
  done
}

# Launch workers
for i in $(seq 1 $WORKERS); do
  worker &
  pids+="$! "
  sleep 0.05
end
# Launch sampler
sample_blocks &
pids+="$!"

# Wait for duration
while [ $(( $(date -u +%s) - START_TS )) -lt $DURATION_SECONDS ] && [ $stop_flag -eq 0 ]; do
  sleep 2
done

stop_flag=1
# Wait processes
for p in $pids; do
  wait $p 2>/dev/null || true
done

END_TS=$(date -u +%s)
DURATION_ACTUAL=$(( END_TS - START_TS ))

# Compute tx stats
TOTAL_TX=$(wc -l < "$TX_RESULT_FILE" | tr -d ' ')
SUCCESS_TX=$(grep -c '^1$' "$TX_RESULT_FILE" || true)
ERROR_TX=$(( TOTAL_TX - SUCCESS_TX ))
ERROR_RATE=0
if [ "$TOTAL_TX" -gt 0 ]; then
  ERROR_RATE=$(awk -v e=$ERROR_TX -v t=$TOTAL_TX 'BEGIN{printf("%.4f", (e/t))}')
fi
AVG_TPS=0
if [ $DURATION_ACTUAL -gt 0 ]; then
  AVG_TPS=$(awk -v s=$SUCCESS_TX -v d=$DURATION_ACTUAL 'BEGIN{printf("%.4f", (s/d))}')
fi

# Compute block time stats
BLOCK_COUNT=$(wc -l < "$BLOCK_TIMES_FILE" | tr -d ' ')
AVG_BLOCK_TIME=0
VARIANCE_PCT=0
if [ "$BLOCK_COUNT" -gt 2 ]; then
  # Convert times to epoch and diff consecutive
  awk '{print $2}' "$BLOCK_TIMES_FILE" | while read -r t; do
    date -u -j -f '%Y-%m-%dT%H:%M:%S%z' "$t" +%s 2>/dev/null || date -u -j -f '%Y-%m-%dT%H:%M:%S.%N%z' "$t" +%s 2>/dev/null
  done | awk 'NR>1{diff=$1-prev; if(diff>0){print diff}}{prev=$1}' > "${TMP_DIR}/block_diffs.txt"
  COUNT_DIFF=$(wc -l < "${TMP_DIR}/block_diffs.txt" | tr -d ' ')
  if [ "$COUNT_DIFF" -gt 0 ]; then
    SUM=$(awk '{s+=$1}END{print s}' "${TMP_DIR}/block_diffs.txt")
    AVG_BLOCK_TIME=$(awk -v s=$SUM -v c=$COUNT_DIFF 'BEGIN{printf("%.4f", s/c)}')
    # variance percent = (stddev / avg) * 100
    STD=$(awk -v avg=$AVG_BLOCK_TIME '{d=($1-avg);s+=d*d}END{if(NR>0){printf("%.6f", sqrt(s/NR))}else{print 0}}' "${TMP_DIR}/block_diffs.txt")
    VARIANCE_PCT=$(awk -v std=$STD -v avg=$AVG_BLOCK_TIME 'BEGIN{if(avg>0){printf("%.2f", (std/avg)*100)}else{print 0}}')
  fi
fi

cat > "$REPORT_FILE" <<JSON
{
  "rpcEndpoint": "${RPC_ENDPOINT}",
  "startTime": "${START_ISO}",
  "endTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "duration": $DURATION_ACTUAL,
  "avgTPS": $AVG_TPS,
  "avgBlockTime": $AVG_BLOCK_TIME,
  "variance": $VARIANCE_PCT,
  "totalTx": $TOTAL_TX,
  "successTx": $SUCCESS_TX,
  "errorTx": $ERROR_TX,
  "errorRate": $ERROR_RATE,
  "blockSamples": $BLOCK_COUNT,
  "targetDuration": $DURATION_SECONDS,
  "workers": $WORKERS,
  "sleepBetweenTx": $SLEEP_BETWEEN_TX
}
JSON

echo "Performance report written to $REPORT_FILE" >&2
cat "$REPORT_FILE"

# Basic pass/fail output (not altering JSON)
if awk -v e=$ERROR_RATE 'BEGIN{exit !(e < 0.05)}'; then
  echo "Error rate within threshold (<5%)" >&2
else
  echo "WARNING: Error rate exceeds 5%" >&2
fi

if awk -v v=$VARIANCE_PCT 'BEGIN{exit !(v <= 15)}'; then
  echo "Block time variance within threshold (<=15%)" >&2
else
  echo "WARNING: Block time variance exceeds 15%" >&2
fi

exit 0
