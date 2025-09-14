#!/usr/bin/env bash
set -euo pipefail

# Dytallix Lean Launch – Golden Path E2E
# keygen → faucet → transfer → contract deploy → contract exec → gov submit → vote → AI risk → Explorer screenshot

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVID_DIR="$ROOT_DIR/launch-evidence/e2e"
CLI_DIR="$ROOT_DIR/dytallix-lean-launch/cli/dytx"
APP_DIR="$ROOT_DIR/dytallix-lean-launch"
NODE_DIR="$ROOT_DIR/dytallix-lean-launch/node"

mkdir -p "$EVID_DIR"

RPC_BASE="http://localhost:3030"
API_BASE="http://localhost:8787"
FRONT_BASE="http://localhost:5173"

echo "[1/12] Build + start Rust node (3030)" | tee "$EVID_DIR/run.log"
(
  cd "$NODE_DIR"
  cargo build -q
  RUST_LOG=info target/debug/dytallix-lean-node >"$EVID_DIR/node.log" 2>&1 &
  NODE_PID=$!
  echo $NODE_PID >"$EVID_DIR/node.pid"
)

# Wait for node
for i in {1..60}; do
  if curl -fsS "$RPC_BASE/stats" >/dev/null 2>&1; then break; fi
  sleep 1
  if [ "$i" -eq 60 ]; then echo "Node failed to start" | tee -a "$EVID_DIR/run.log"; exit 1; fi
done

echo "[2/12] Start API/Faucet server (8787)" | tee -a "$EVID_DIR/run.log"
(
  cd "$APP_DIR"
  PORT=8787 VITE_RPC_HTTP_URL="$RPC_BASE" VITE_API_URL="$API_BASE/api" npm run -s server >"$EVID_DIR/server.log" 2>&1 &
  SRV_PID=$!
  echo $SRV_PID >"$EVID_DIR/server.pid"
)

# Wait for server
for i in {1..60}; do
  if curl -fsS "$API_BASE/api/status" >/dev/null 2>&1; then break; fi
  sleep 1
  if [ "$i" -eq 60 ]; then echo "Server failed to start" | tee -a "$EVID_DIR/run.log"; exit 1; fi
done

echo "[3/12] Build dytx CLI" | tee -a "$EVID_DIR/run.log"
(
  cd "$CLI_DIR"
  npm install -s
  npm run -s build
)
export PATH="$CLI_DIR/node_modules/.bin:$PATH"

PASSPHRASE="testpass123"
export DYTX_PASSPHRASE="$PASSPHRASE"

echo "[4/12] Create keystores (sender/recipient)" | tee -a "$EVID_DIR/run.log"
SENDER_JSON="$EVID_DIR/sender_keystore.json"
RECIP_JSON="$EVID_DIR/recipient_keystore.json"
(
  cd "$CLI_DIR"
  # sender
  OUT=$(node dist/index.js keys add --name sender --algo dilithium --passphrase "$PASSPHRASE")
  SENDER_ADDR=$(printf '%s' "$OUT" | sed -n 's/^Address: \(.*\)$/\1/p' | tail -n1)
  # copy keystore to evidence
  cp "$HOME/.dytx/keystore/sender.json" "$SENDER_JSON" 2>/dev/null || true
  # recipient
  OUT2=$(node dist/index.js keys add --name recipient --algo dilithium --passphrase "$PASSPHRASE")
  RECIP_ADDR=$(printf '%s' "$OUT2" | sed -n 's/^Address: \(.*\)$/\1/p' | tail -n1)
  cp "$HOME/.dytx/keystore/recipient.json" "$RECIP_JSON" 2>/dev/null || true
)
echo "$SENDER_ADDR" > "$EVID_DIR/sender.address"
echo "$RECIP_ADDR" > "$EVID_DIR/recipient.address"

echo "[5/12] Faucet fund sender (dev faucet: udgt+udrt)" | tee -a "$EVID_DIR/run.log"
curl -fsS -X POST "$RPC_BASE/dev/faucet" -H 'content-type: application/json' \
  -d "{\"address\":\"$SENDER_ADDR\",\"udgt\":2000000,\"udrt\":100000000}" \
  | tee "$EVID_DIR/faucet_response.json" >/dev/null

echo "[6/12] Transfer 1.0 uDGT from sender → recipient" | tee -a "$EVID_DIR/run.log"
TX_JSON="$EVID_DIR/transfer_receipt.json"
(
  cd "$CLI_DIR"
  node dist/index.js --rpc "$RPC_BASE" --output json transfer \
    --from "$SENDER_ADDR" --to "$RECIP_ADDR" --amount 1 --denom udgt --keystore sender --passphrase "$PASSPHRASE" \
    | tee "$TX_JSON"
)
TX_HASH=$(jq -r '.hash' < "$TX_JSON")

echo "[7/12] Deploy mock contract" | tee -a "$EVID_DIR/run.log"
WASM_FILE="$EVID_DIR/dummy.wasm"
echo -n '00asm_mock' > "$WASM_FILE"
DEPLOY_JSON="$EVID_DIR/contract_deploy.json"
(
  cd "$CLI_DIR"
  node dist/index.js --rpc "$RPC_BASE" --output json contract deploy --wasm "$WASM_FILE" \
    | tee "$DEPLOY_JSON"
)
CONTRACT_ADDR=$(jq -r '.address' < "$DEPLOY_JSON")

echo "[8/12] Execute contract increment + query state" | tee -a "$EVID_DIR/run.log"
EXEC_JSON="$EVID_DIR/contract_exec.json"
QUERY_JSON="$EVID_DIR/contract_query.json"
(
  cd "$CLI_DIR"
  node dist/index.js --rpc "$RPC_BASE" --output json contract exec --address "$CONTRACT_ADDR" --method increment \
    | tee "$EXEC_JSON"
  node dist/index.js --rpc "$RPC_BASE" --output json contract query --address "$CONTRACT_ADDR" --method get \
    | tee "$QUERY_JSON"
)

echo "[9/12] Governance: submit + vote + tally" | tee -a "$EVID_DIR/run.log"
GOV_SUB="$EVID_DIR/gov_submit.json"
GOV_TAL="$EVID_DIR/gov_tally.json"
(
  cd "$CLI_DIR"
  node dist/index.js --rpc "$RPC_BASE" --output json gov submit \
    --title "Adjust gas limit" --description "E2E Golden Path" --key gas_limit --value "200000" \
    | tee "$GOV_SUB"
)
PROPOSAL_ID=$(jq -r '.proposal_id' < "$GOV_SUB")
(
  cd "$CLI_DIR"
  node dist/index.js --rpc "$RPC_BASE" --output json gov vote --proposal "$PROPOSAL_ID" --from "$SENDER_ADDR" --option yes \
    | tee "$EVID_DIR/gov_vote.json"
  node dist/index.js --rpc "$RPC_BASE" --output json gov tally --proposal "$PROPOSAL_ID" \
    | tee "$GOV_TAL"
)

echo "[10/12] AI risk: score + fetch" | tee -a "$EVID_DIR/run.log"
AI_REQ="$EVID_DIR/ai_request.json"
AI_TX="$EVID_DIR/ai_tx.json"
printf '{"tx":{"hash":"%s"},"model_id":"risk-v1"}\n' "$TX_HASH" | tee "$AI_REQ" >/dev/null
curl -fsS -X POST "$RPC_BASE/ai/score" -H 'content-type: application/json' -d @"$AI_REQ" >/dev/null || true
sleep 1
curl -fsS "$RPC_BASE/tx/$TX_HASH" | tee "$AI_TX" >/dev/null

echo "[11/12] Build frontend and start preview (5173)" | tee -a "$EVID_DIR/run.log"
(
  cd "$APP_DIR"
  VITE_RPC_HTTP_URL="$RPC_BASE" VITE_API_URL="$API_BASE/api" npm run -s build
  npx -y vite preview --port 5173 >"$EVID_DIR/frontend.log" 2>&1 &
  FE_PID=$!
  echo $FE_PID >"$EVID_DIR/frontend.pid"
)
# Wait for frontend
for i in {1..60}; do
  if curl -fsS "$FRONT_BASE" >/dev/null 2>&1; then break; fi
  sleep 1
  if [ "$i" -eq 60 ]; then echo "Frontend failed to start" | tee -a "$EVID_DIR/run.log"; exit 1; fi
done

echo "[12/12] Screenshot Explorer TX page with AI risk" | tee -a "$EVID_DIR/run.log"
(
  cd "$APP_DIR"
  npm install -s puppeteer >/dev/null 2>&1 || true
)
SCREENSHOT="$EVID_DIR/explorer_ai_risk.png"
node "$APP_DIR/scripts/e2e/screenshot.js" "$FRONT_BASE/tx/$TX_HASH" "$SCREENSHOT"

# Generate GOLDEN_PATH.md
cat > "$EVID_DIR/GOLDEN_PATH.md" <<EOF
# Golden Path Evidence – Lean Launch

This run demonstrates end-to-end functionality:

1. Keygen: sender/recipient created
   - Keystores: sender (keystore) – $(basename "$SENDER_JSON"), recipient – $(basename "$RECIP_JSON")
   - Addresses:
     - Sender: $(cat "$EVID_DIR/sender.address")
     - Recipient: $(cat "$EVID_DIR/recipient.address")

2. Faucet funding:
   - Request/receipt: faucet_response.json

3. Transfer:
   - Receipt: transfer_receipt.json (tx hash: $TX_HASH)

4. Contract deploy & exec (counter):
   - Deploy: contract_deploy.json (address: $CONTRACT_ADDR)
   - Exec: contract_exec.json
   - Query: contract_query.json

5. Governance:
   - Submit: gov_submit.json (proposal: $PROPOSAL_ID)
   - Vote: gov_vote.json
   - Tally: gov_tally.json

6. AI Risk:
   - Request: ai_request.json
   - Tx with risk: ai_tx.json (contains ai_risk_score)
   - Explorer UI screenshot: explorer_ai_risk.png

All artifacts are under launch-evidence/e2e/.

EOF

echo "Golden path completed successfully." | tee -a "$EVID_DIR/run.log"
exit 0
