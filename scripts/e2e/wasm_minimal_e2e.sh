#!/usr/bin/env bash
set -euo pipefail

# Minimal WASM deploy/execute/query determinism check via dashboard server
# Prereqs: node listening on 3030; server listening on 8787

ROOT_DIR=$(cd "$(dirname "$0")/../.." && pwd)
SERVER_URL=${SERVER_URL:-"http://localhost:8787"}
EVID_DIR="$ROOT_DIR/dytallix-lean-launch/launch-evidence/wasm"
mkdir -p "$EVID_DIR"

echo "[e2e] Building counter.wasm…"
"$ROOT_DIR/dytallix-lean-launch/scripts/build_counter_wasm.sh"

function deploy() {
  curl -sSf -X POST "$SERVER_URL/contract/deploy" -H 'content-type: application/json' -d '{}' | jq -r '.address'
}

function call_inc() {
  local addr=$1
  curl -sSf -X POST "$SERVER_URL/contract/call" -H 'content-type: application/json' \
    -d "$(jq -n --arg a "$addr" '{address:$a, method:"increment"}')" | jq -r '.gas_used'
}

function query_get() {
  local addr=$1
  curl -sSf "$SERVER_URL/contract/state/$addr/get" | jq -r '.value_hex'
}

function hex2json() { python3 - << 'PY'
import sys, json, binascii
h=sys.stdin.read().strip()
try:
  b=binascii.unhexlify(h)
  print(json.loads(b.decode('utf-8'))['count'])
except Exception as e:
  print(f"ERR:{e}")
PY
}

function run_sequence() {
  local run_id=$1
  local addr=$(deploy)
  echo "[e2e] Run ${run_id}: deployed $addr"
  local g1=$(call_inc "$addr")
  local g2=$(call_inc "$addr")
  local val_hex=$(query_get "$addr")
  local count=$(printf "%s" "$val_hex" | hex2json)
  local gas_sum=$(( ${g1:-0} + ${g2:-0} ))
  echo "$run_id $addr $gas_sum $count"
}

echo "[e2e] Running sequence A…"
R1=$(run_sequence A)
echo "[e2e] Running sequence B…"
R2=$(run_sequence B)

ADDR1=$(echo "$R1" | awk '{print $2}')
ADDR2=$(echo "$R2" | awk '{print $2}')
GAS1=$(echo  "$R1" | awk '{print $3}')
GAS2=$(echo  "$R2" | awk '{print $3}')
CNT1=$(echo  "$R1" | awk '{print $4}')
CNT2=$(echo  "$R2" | awk '{print $4}')

PASS=1
[[ "$GAS1" == "$GAS2" ]] || PASS=0
[[ "$CNT1" == "$CNT2" ]] || PASS=0
[[ "$CNT1" == "2" ]] || PASS=0

{
  echo "timestamp: $(date -Iseconds)"
  echo "server_url: $SERVER_URL"
  echo "address_run1: $ADDR1"
  echo "address_run2: $ADDR2"
  echo "gas_used_run1: $GAS1"
  echo "gas_used_run2: $GAS2"
  echo "count_run1: $CNT1"
  echo "count_run2: $CNT2"
  if [[ $PASS -eq 1 ]]; then
    echo "RESULT: PASS (gas and state identical; count==2)"
  else
    echo "RESULT: FAIL"
  fi
} | tee "$EVID_DIR/determinism_test.log"

echo "[e2e] Evidence written to $EVID_DIR"

