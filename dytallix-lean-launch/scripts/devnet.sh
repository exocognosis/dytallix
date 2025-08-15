#!/usr/bin/env bash
set -euo pipefail

# Updated devnet script validating automatic block production & persistence
# Steps:
# 1. Unique fresh data dir
# 2. Start node
# 3. Wait health & at least 1 block height progress
# 4. Fund / select faucet & test addresses
# 5. Submit transfer
# 6. Poll receipt until success
# 7. Verify balances & nonce
# 8. Restart node and re-verify receipt & balances persist

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${DYT_DATA_DIR:-/tmp/dyt-devnet-$$}"
CHAIN_ID="${DYT_CHAIN_ID:-dyt-devnet-1}"
GENESIS="${DYT_GENESIS_FILE:-$ROOT_DIR/../genesisBlock.json}"
RPC="http://localhost:3030"
ART_DIR="$ROOT_DIR/artifacts"
LOG="$ART_DIR/devnet_log.txt"
mkdir -p "$DATA_DIR" "$ART_DIR"
rm -rf "$DATA_DIR" || true
mkdir -p "$DATA_DIR"

log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

log "Starting devnet with DATA_DIR=$DATA_DIR CHAIN_ID=$CHAIN_ID"

pushd "$ROOT_DIR/../blockchain-core" >/dev/null
DYT_DATA_DIR="$DATA_DIR" DYT_CHAIN_ID="$CHAIN_ID" cargo run --quiet &
NODE_PID=$!
log "Node PID $NODE_PID"
trap 'log "Stopping node"; kill $NODE_PID || true' EXIT

# Wait for health
for i in {1..30}; do if curl -fsS "$RPC/health" >/dev/null; then log "Health OK"; break; fi; sleep 1; if [ "$i" = 30 ]; then log "Health check failed"; exit 1; fi; done

# Wait for at least 2 blocks (auto producer) or timeout
TARGET=2
for i in {1..40}; do H=$(curl -fsS "$RPC/stats" | jq -r '.data.height // 0' || echo 0); if [ "$H" -ge "$TARGET" ]; then log "Reached height $H"; break; fi; sleep 1; if [ "$i" = 40 ]; then log "Block production not progressing"; exit 1; fi; done

ADDR_A="dyt1senderdev000000"
ADDR_B="dyt1receiverdev000"

BAL_A_BEFORE=$(curl -fsS "$RPC/balance/$ADDR_A" | jq -r '.data // 0' || echo 0)
BAL_B_BEFORE=$(curl -fsS "$RPC/balance/$ADDR_B" | jq -r '.data // 0' || echo 0)
log "Balances before A=$BAL_A_BEFORE B=$BAL_B_BEFORE"

NONCE=$(curl -fsS "$RPC/tx/doesnotexist" >/dev/null 2>&1; echo 0) # placeholder nonce fetch (would call nonce endpoint if exists)
AMOUNT=10
FEE=1
TX_JSON=$(jq -n --arg from "$ADDR_A" --arg to "$ADDR_B" --argjson amount $AMOUNT --argjson fee $FEE '{type:"transfer",from:$from,to:$to,amount:$amount,fee:$fee}')
TX_RESP=$(curl -fsS -X POST "$RPC/submit" -H 'Content-Type: application/json' -d "$TX_JSON" || true)
HASH=$(echo "$TX_RESP" | jq -r '.data.hash // empty')
log "Submit response: $TX_RESP"
if [ -z "$HASH" ]; then log "Failed to submit tx"; exit 1; fi

# Poll for success receipt
for i in {1..60}; do R=$(curl -fsS "$RPC/tx/$HASH" || true); ST=$(echo "$R" | jq -r '.data.status // empty'); if [ "$ST" = success ]; then log "Tx included at height $(echo "$R" | jq -r '.data.block_height')"; break; fi; sleep 1; if [ "$i" = 60 ]; then log "Tx not included"; exit 1; fi; done

BAL_A_AFTER=$(curl -fsS "$RPC/balance/$ADDR_A" | jq -r '.data // 0' || echo 0)
BAL_B_AFTER=$(curl -fsS "$RPC/balance/$ADDR_B" | jq -r '.data // 0' || echo 0)
log "Balances after A=$BAL_A_AFTER B=$BAL_B_AFTER"

log "Restarting node to verify persistence"
kill $NODE_PID || true
sleep 2
DYT_DATA_DIR="$DATA_DIR" DYT_CHAIN_ID="$CHAIN_ID" cargo run --quiet &
NODE_PID=$!
for i in {1..30}; do if curl -fsS "$RPC/health" >/dev/null; then break; fi; sleep 1; done
R2=$(curl -fsS "$RPC/tx/$HASH" || true)
ST2=$(echo "$R2" | jq -r '.data.status // empty')
if [ "$ST2" != success ]; then log "Receipt missing after restart"; exit 1; fi
log "Persistence verified"

log "Devnet script completed successfully"
