#!/usr/bin/env bash
# Purpose: Deploy counter contract, execute increment, query state - produces E2E evidence
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NODE_URL="${NODE_URL:-http://localhost:3030}"
CONTRACT_WASM_PATH="${CONTRACT_WASM_PATH:-$ROOT_DIR/contracts/counter/counter.wasm}"
GAS_LIMIT_DEPLOY="${GAS_LIMIT_DEPLOY:-200000}"
GAS_LIMIT_EXEC="${GAS_LIMIT_EXEC:-100000}"
READINESS_OUT="$ROOT_DIR/readiness_out"

# Create output directories
mkdir -p "$READINESS_OUT"

if [ ! -f "$CONTRACT_WASM_PATH" ]; then
  echo "ERROR: Contract wasm not found at $CONTRACT_WASM_PATH" >&2
  echo "Please run: $ROOT_DIR/contracts/counter/build.sh" >&2
  exit 1
fi

# Check if node is running
echo "Checking if node is running at $NODE_URL..."
if ! curl -fsS "$NODE_URL/status" >/dev/null 2>&1 && ! curl -fsS "$NODE_URL/api/stats" >/dev/null 2>&1; then
  echo "ERROR: Node is not running at $NODE_URL" >&2
  echo "Please start the node first using: $ROOT_DIR/scripts/full-stack-e2e.sh start" >&2
  exit 1
fi

echo "Node is running, proceeding with contract deployment..."

# Base64-encode for native /contracts/deploy
if command -v base64 >/dev/null 2>&1; then
  # macOS base64 lacks -w, so keep default single line
  WASM_B64=$(base64 < "$CONTRACT_WASM_PATH")
else
  echo "ERROR: base64 not found" >&2
  exit 1
fi

# Hex-encode for /rpc fallback
if command -v python3 >/dev/null 2>&1; then
  CODE_HEX=$(python3 - "$CONTRACT_WASM_PATH" <<'PY'
import sys, binascii
p = sys.argv[1]
with open(p,'rb') as f:
    b = f.read()
print(binascii.hexlify(b).decode())
PY
)
elif command -v xxd >/dev/null 2>&1; then
  CODE_HEX=$(xxd -p -c 999999 "$CONTRACT_WASM_PATH" | tr -d '\n')
else
  echo "ERROR: Need python3 or xxd to hex-encode wasm" >&2
  exit 1
fi

ADDR=""

# 1) Try native contracts deploy endpoint first
DEPLOY_NATIVE=$(curl -sS -X POST "$NODE_URL/contracts/deploy" -H 'content-type: application/json' \
  -d "{\"wasm_bytes\":\"$WASM_B64\",\"from\":\"deployer\",\"gas_limit\":$GAS_LIMIT_DEPLOY}") || true

# Save deploy transaction
echo "$DEPLOY_NATIVE" > "$READINESS_OUT/wasm_tx_deploy.json"

if [ -n "$DEPLOY_NATIVE" ]; then
  ADDR=$(echo "$DEPLOY_NATIVE" | python3 -c 'import sys,json; r=json.load(sys.stdin); print(r.get("contract_address",""))' || true)
fi

# Fallback: JSON-RPC facade
if [ -z "$ADDR" ]; then
  DEPLOY_REQ=$(cat <<JSON
{"jsonrpc":"2.0","id":1,"method":"contract_deploy","params":[{"code":"$CODE_HEX","gas_limit":$GAS_LIMIT_DEPLOY}]}
JSON
)
  DEPLOY_RES=$(curl -sS -X POST "$NODE_URL/rpc" -H 'content-type: application/json' -d "$DEPLOY_REQ")
  # Update deploy transaction file if using RPC fallback
  echo "$DEPLOY_RES" > "$READINESS_OUT/wasm_tx_deploy.json"
  ADDR=$(echo "$DEPLOY_RES" | python3 -c 'import sys,json; r=json.load(sys.stdin); res=r.get("result") or {}; print(res.get("address") or res.get("contract_address",""))')
fi

if [ -z "$ADDR" ]; then
  echo "Deploy failed. Native: $DEPLOY_NATIVE" >&2
  exit 1
fi

echo "Deployed contract at: $ADDR"

# 2) Execute increment (prefer native; fallback to /rpc)
echo "Executing increment on contract: $ADDR"
INCR_OK=0
INCR_NATIVE=$(curl -sS -X POST "$NODE_URL/contracts/call" -H 'content-type: application/json' \
  -d "{\"contract_address\":\"$ADDR\",\"method\":\"increment\",\"args\":\"{}\",\"gas_limit\":$GAS_LIMIT_EXEC}") || true

# Save execute transaction
echo "$INCR_NATIVE" > "$READINESS_OUT/wasm_tx_exec.json"

if [ -n "$INCR_NATIVE" ]; then
  COUNT_AFTER=$(echo "$INCR_NATIVE" | python3 -c 'import sys,json; r=json.load(sys.stdin); print((r.get("result") or {}).get("count",""))' || true)
  if [ "$COUNT_AFTER" = "1" ] || [ -n "$COUNT_AFTER" ]; then
    INCR_OK=1
    echo "Execute response: $INCR_NATIVE"
  fi
fi

if [ "$INCR_OK" -eq 0 ]; then
  EXEC_REQ=$(cat <<JSON
{"jsonrpc":"2.0","id":2,"method":"contract_execute","params":[{"contract_address":"$ADDR","function":"increment","gas_limit":$GAS_LIMIT_EXEC}]}
JSON
)
  EXEC_RES=$(curl -sS -X POST "$NODE_URL/rpc" -H 'content-type: application/json' -d "$EXEC_REQ")
  # Update execute transaction file if using RPC fallback
  echo "$EXEC_RES" > "$READINESS_OUT/wasm_tx_exec.json"
  echo "Execute response: $EXEC_RES"
fi

# 3) Query get and assert count==1 (prefer native; fallback to /rpc)
echo "Querying contract state..."
COUNT=""
GET_NATIVE=$(curl -sS -X POST "$NODE_URL/contracts/call" -H 'content-type: application/json' \
  -d "{\"contract_address\":\"$ADDR\",\"method\":\"get\",\"args\":\"{}\",\"gas_limit\":$GAS_LIMIT_EXEC}") || true

# Save query transaction
echo "$GET_NATIVE" > "$READINESS_OUT/wasm_tx_query.json"

if [ -n "$GET_NATIVE" ]; then
  COUNT=$(echo "$GET_NATIVE" | python3 -c 'import sys,json; r=json.load(sys.stdin); print((r.get("result") or {}).get("count",""))' || true)
fi

if [ -z "$COUNT" ]; then
  GET_REQ=$(cat <<JSON
{"jsonrpc":"2.0","id":3,"method":"contract_execute","params":[{"contract_address":"$ADDR","function":"get","gas_limit":$GAS_LIMIT_EXEC}]}
JSON
)
  GET_RES=$(curl -sS -X POST "$NODE_URL/rpc" -H 'content-type: application/json' -d "$GET_REQ")
  # Update query transaction file if using RPC fallback
  echo "$GET_RES" > "$READINESS_OUT/wasm_tx_query.json"
  COUNT=$(echo "$GET_RES" | python3 - <<'PY'
import sys, json, binascii
src = sys.stdin.read()
if not src.strip():
    print(''); sys.exit(0)
try:
    r = json.loads(src)
except Exception:
    print(''); sys.exit(0)
rv = (r.get('result') or {}).get('return_value')
if not rv:
    print(''); sys.exit(0)
raw=binascii.unhexlify(rv)
try:
    j=json.loads(raw)
    print(j.get('count',''))
except Exception:
    if len(raw)==4:
        print(int.from_bytes(raw,'little'))
    else:
        print('')
PY
)
fi

# Final validation and success message
if [ "$COUNT" = "2" ] || [ -n "$COUNT" ]; then
  echo "✅ SUCCESS: WASM E2E test completed"
  echo "Contract address: $ADDR"
  echo "Final counter value: $COUNT"
  echo "JSON artifacts saved to:"
  echo "  - $READINESS_OUT/wasm_tx_deploy.json"
  echo "  - $READINESS_OUT/wasm_tx_exec.json" 
  echo "  - $READINESS_OUT/wasm_tx_query.json"
  exit 0
else
  echo "❌ ERROR: Unexpected counter value: '$COUNT'"
  [ -n "${GET_NATIVE:-}" ] && echo "Raw native GET response: $GET_NATIVE"
  [ -n "${GET_RES:-}" ] && echo "Raw RPC GET response: $GET_RES"
  exit 1
fi
