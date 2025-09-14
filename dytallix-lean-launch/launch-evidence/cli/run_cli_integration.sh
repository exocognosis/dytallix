#!/usr/bin/env bash
set -euo pipefail

# Config
RPC_URL="${DYTALLIX_RPC_URL:-http://127.0.0.1:8545}"
OUT_DIR="launch-evidence/cli"
mkdir -p "$OUT_DIR"

echo "Using RPC: $RPC_URL"

# 1) Governance: submit -> vote -> tally
echo "Submitting governance proposal..."
SUBMIT_JSON=$(dytx --rpc "$RPC_URL" --output json gov submit \
  --title "Raise max gas" \
  --description "Increase max gas per block to 20M" \
  --key max_gas_per_block \
  --value 20000000)
echo "$SUBMIT_JSON" | jq . >"$OUT_DIR/proposal.json"
PID=$(echo "$SUBMIT_JSON" | jq -r .proposal_id)
echo "Proposal ID: $PID"

echo "Casting vote..."
dytx --rpc "$RPC_URL" --output json gov vote \
  --proposal "$PID" \
  --from dytallix1testvoter000000000000000000000000000000000 \
  --option yes | jq . > /dev/null

echo "Tallying..."
dytx --rpc "$RPC_URL" --output json gov tally --proposal "$PID" | jq . >"$OUT_DIR/tally.json"

# 2) WASM: deploy -> exec twice -> query

if [[ -f "examples/counter.wasm" ]]; then
  WASM=examples/counter.wasm
else
  # Minimal placeholder wasm; this path may not exist in all repos
  echo "WASM example not found at examples/counter.wasm; skipping deploy"
  exit 0
fi

ADDR=$(dytx --rpc "$RPC_URL" --output json contract deploy --wasm "$WASM" | jq -r .address)
echo "Contract: $ADDR"

dytx --rpc "$RPC_URL" contract exec --address "$ADDR" --method increment
dytx --rpc "$RPC_URL" contract exec --address "$ADDR" --method increment

dytx --rpc "$RPC_URL" --output json contract query --address "$ADDR" | jq . >"$OUT_DIR/query_result.json"
COUNT=$(jq -r .parsed.count "$OUT_DIR/query_result.json" 2>/dev/null || echo "unknown")
echo "Query count: $COUNT"

echo "Artifacts written under $OUT_DIR"

