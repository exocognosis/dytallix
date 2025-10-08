#!/usr/bin/env bash
# Build, deploy counter.wasm, exec twice, query final state; save evidence
# Outputs under launch-evidence/wasm/
# - deploy_tx.json
# - exec_txs.json
# - final_state.json
# - wasm_demo.log
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EVID_DIR="$ROOT_DIR/launch-evidence/wasm"
CLI_DIR="$ROOT_DIR/cli/dytx"
NODE_URL="${NODE_URL:-http://localhost:3030}"
RPC="${DYTX_RPC:-${RPC_URL:-$NODE_URL}}"
CHAIN_ID="${DYTX_CHAIN_ID:-dytallix-testnet-1}"
LOG="$EVID_DIR/wasm_demo.log"

mkdir -p "$EVID_DIR"

run() { echo "+ $*" | tee -a "$LOG"; "$@" 2>&1 | tee -a "$LOG"; }

# Build CLI if needed
if [ ! -x "$CLI_DIR/dist/index.js" ] && [ -f "$CLI_DIR/package.json" ]; then
  echo "[build] Building dytx CLI" | tee -a "$LOG"
  (cd "$CLI_DIR" && npm ci >/dev/null 2>&1 && npm run -s build) | tee -a "$LOG"
fi

# Build counter wasm
if [ ! -f "$ROOT_DIR/artifacts/counter.wasm" ]; then
  run "$ROOT_DIR/scripts/build_counter_wasm.sh"
fi

WASM="$ROOT_DIR/artifacts/counter.wasm"
[ -f "$WASM" ] || { echo "ERROR: counter.wasm missing" | tee -a "$LOG"; exit 1; }

# Deploy via CLI client which hits server API facade
DEPLOY_JSON="$EVID_DIR/deploy_tx.json"
run node "$CLI_DIR/dist/index.js" contract deploy --wasm "$WASM" --gas 200000 --rpc "$RPC" --output json | tee "$DEPLOY_JSON"
ADDR=$(jq -r '.address // .contract_address // .result.address // empty' "$DEPLOY_JSON")
if [ -z "$ADDR" ] || [ "$ADDR" = "null" ]; then
  echo "ERROR: failed to get contract address" | tee -a "$LOG"; exit 1; fi

echo "Contract: $ADDR" | tee -a "$LOG"

# Execute increment twice
EXEC1_JSON=$(mktemp)
EXEC2_JSON=$(mktemp)
run node "$CLI_DIR/dist/index.js" contract exec --address "$ADDR" --method increment --gas 100000 --rpc "$RPC" --output json | tee "$EXEC1_JSON"
run node "$CLI_DIR/dist/index.js" contract exec --address "$ADDR" --method increment --gas 100000 --rpc "$RPC" --output json | tee "$EXEC2_JSON"

jq -s 'map({gas_used: (.gas_used // .result.gas_used), events: (.events // .result.events), return_value: (.return_value // .result.return_value)})' "$EXEC1_JSON" "$EXEC2_JSON" > "$EVID_DIR/exec_txs.json"

# Query final state
QUERY_JSON="$EVID_DIR/final_state.json"
run node "$CLI_DIR/dist/index.js" contract query --address "$ADDR" --method get --rpc "$RPC" --output json | tee "$QUERY_JSON"
COUNT=$(jq -r '.parsed.count // .result.parsed.count // empty' "$QUERY_JSON")
if [ -z "$COUNT" ]; then COUNT=$(jq -r '.parsed // .result.parsed // empty' "$QUERY_JSON" | jq -r '.count'); fi

if [ -z "$COUNT" ]; then echo "ERROR: could not parse final count" | tee -a "$LOG"; exit 1; fi

echo "Final count: $COUNT" | tee -a "$LOG"

ls -l "$EVID_DIR" | tee -a "$LOG"
