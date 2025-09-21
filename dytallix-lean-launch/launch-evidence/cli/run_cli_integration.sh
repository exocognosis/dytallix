#!/usr/bin/env bash
set -euo pipefail

# Config
RPC_URL="${DYTALLIX_RPC_URL:-http://127.0.0.1:8545}"
CLI_BIN="dytx"
OUT_DIR="launch-evidence/cli"
CONTRACT_LOG="launch-evidence/contracts/counter_demo.log"
mkdir -p "$OUT_DIR" "$(dirname "$CONTRACT_LOG")"

jq --version >/dev/null 2>&1 || { echo "jq is required" >&2; exit 1; }

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

# Locate contract artifact
WASM="examples/counter.wasm"
if [[ ! -f "$WASM" ]]; then
  ALT="dytallix-lean-launch/artifacts/counter.wasm"
  if [[ -f "$ALT" ]]; then WASM="$ALT"; fi
fi

if [[ ! -f "$WASM" ]]; then
  echo "WASM example not found at examples/counter.wasm or $ALT; skipping deploy" >&2
  exit 0
fi

# Clear previous log
: > "$CONTRACT_LOG"

# Deploy
DEPLOY_JSON=$($CLI_BIN --rpc "$RPC_URL" --output json contract deploy --wasm "$WASM")
echo "$DEPLOY_JSON" | jq -c . >> "$CONTRACT_LOG"
ADDR=$(echo "$DEPLOY_JSON" | jq -r .address)
CODE_HASH=$(echo "$DEPLOY_JSON" | jq -r .code_hash 2>/dev/null || echo null)
TX_DEPLOY=$(echo "$DEPLOY_JSON" | jq -r .tx_hash 2>/dev/null || echo null)
echo "Contract deployed: $ADDR"

# Exec increment twice
for i in 1 2; do
  EXEC_JSON=$($CLI_BIN --rpc "$RPC_URL" --output json contract exec --address "$ADDR" --method increment)
  echo "$EXEC_JSON" | jq -c . >> "$CONTRACT_LOG"
  echo "Exec #$i ok"
  sleep 0.2
done

# Query
QUERY_JSON=$($CLI_BIN --rpc "$RPC_URL" --output json contract query --address "$ADDR")
echo "$QUERY_JSON" | jq -c . >> "$CONTRACT_LOG"
COUNT=$(echo "$QUERY_JSON" | jq -r '.parsed.count // .count // .data.value // .value // "unknown"')
echo "Final count: $COUNT"

echo "Artifacts written under $OUT_DIR and contract log at $CONTRACT_LOG"

