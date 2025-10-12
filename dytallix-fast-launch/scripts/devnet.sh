#!/usr/bin/env bash
# Dual-token context: Node currently agnostic; client tooling (dcli) enforces DGT/DRT denoms.

set -euo pipefail

# Devnet script for Rust node proving end-to-end flow: block production, tx inclusion, persistence.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$(mktemp -d /tmp/dyt-node-XXXX)"
CHAIN_ID="${DYT_CHAIN_ID:-dytallix-testnet-1}"
export DYT_DATA_DIR="$DATA_DIR"
export DYT_BLOCK_INTERVAL_MS="${DYT_BLOCK_INTERVAL_MS:-15000}"  # 15 second block time
export DYT_EMPTY_BLOCKS="${DYT_EMPTY_BLOCKS:-true}"
export BLOCK_MAX_TX="${BLOCK_MAX_TX:-100}"
export DYT_WS_ENABLED="${DYT_WS_ENABLED:-true}"
RPC="http://localhost:3030"
ART_DIR="$ROOT_DIR/artifacts"
LOG="$ART_DIR/devnet_log.txt"
mkdir -p "$ART_DIR"
: > "$LOG"
log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

log "Launching node (data dir $DATA_DIR)"
(
  cd "$ROOT_DIR/node"
  cargo run --quiet &
  NODE_PID=$!
  trap 'kill $NODE_PID || true' EXIT

  for i in {1..30}; do if curl -fsS "$RPC/stats" >/dev/null 2>&1; then break; fi; sleep 1; done
  [ "$i" = 30 ] && log "Node not responding" && exit 1

  TARGET=2
  for i in {1..40}; do H=$(curl -fsS "$RPC/stats" | jq -r '.height // 0'); [ "$H" -ge "$TARGET" ] && break; sleep 1; done
  [ "$H" -lt "$TARGET" ] && log "Block production stalled" && exit 1
  log "Reached height $H"

  ADDR_A="dyt1senderdev000000" # faucet (from)
  ADDR_B="dyt1receiverdev000"  # receiver
  BAL_A0=$(curl -fsS "$RPC/balance/$ADDR_A" | jq -r '.balance')
  BAL_B0=$(curl -fsS "$RPC/balance/$ADDR_B" | jq -r '.balance')
  NONCE_B0=$(curl -fsS "$RPC/tx/doesnotexist" || true) # placeholder (no nonce endpoint yet) -> assume 0
  log "Initial balances A=$BAL_A0 B=$BAL_B0"

  AMT=10
  FEE=1
  TX=$(jq -n --arg from "$ADDR_A" --arg to "$ADDR_B" --argjson amount $AMT --argjson fee $FEE '{from:$from,to:$to,amount:$amount,fee:$fee}')
  SUB=$(curl -fsS -X POST "$RPC/submit" -H 'Content-Type: application/json' -d "$TX") || { log "Submit failed"; exit 1; }
  HASH=$(echo "$SUB" | jq -r '.hash')
  [ -z "$HASH" ] && log "Submit failed: $SUB" && exit 1
  log "Submitted tx $HASH"

  for i in {1..60}; do R=$(curl -fsS "$RPC/tx/$HASH" || true); ST=$(echo "$R" | jq -r '.status // empty'); if [ "$ST" = Success ] || [ "$ST" = success ]; then BH=$(echo "$R" | jq -r '.block_height'); log "Inclusion at block $BH"; BLOCK_JSON=$(curl -fsS "$RPC/block/$BH"); echo "$BLOCK_JSON" | jq '.' >/dev/null || { log "Block fetch failed"; exit 1; }; break; fi; sleep 1; done
  [ "$ST" != Success ] && [ "$ST" != success ] && log "Tx not included" && exit 1

  BAL_A1=$(curl -fsS "$RPC/balance/$ADDR_A" | jq -r '.balance')
  BAL_B1=$(curl -fsS "$RPC/balance/$ADDR_B" | jq -r '.balance')
  log "Post-transfer balances A=$BAL_A1 B=$BAL_B1"
  EXPECT_A1=$((BAL_A0 - AMT - FEE))
  EXPECT_B1=$((BAL_B0 + AMT))
  [ "$BAL_A1" -eq "$EXPECT_A1" ] || { log "Unexpected sender balance after transfer: got $BAL_A1 expected $EXPECT_A1"; exit 1; }
  [ "$BAL_B1" -eq "$EXPECT_B1" ] || { log "Unexpected receiver balance after transfer: got $BAL_B1 expected $EXPECT_B1"; exit 1; }

  kill $NODE_PID || true
  sleep 2
  cargo run --quiet &
  NODE_PID=$!
  for i in {1..30}; do if curl -fsS "$RPC/tx/$HASH" >/dev/null 2>&1; then break; fi; sleep 1; done
  R2=$(curl -fsS "$RPC/tx/$HASH")
  ST2=$(echo "$R2" | jq -r '.status // empty')
  [ "$ST2" != Success ] && [ "$ST2" != success ] && log "Receipt missing after restart" && exit 1
  BAL_A2=$(curl -fsS "$RPC/balance/$ADDR_A" | jq -r '.balance')
  BAL_B2=$(curl -fsS "$RPC/balance/$ADDR_B" | jq -r '.balance')
  [ "$BAL_A2" -eq "$EXPECT_A1" ] || { log "Sender balance not persisted: $BAL_A2 vs $EXPECT_A1"; exit 1; }
  [ "$BAL_B2" -eq "$EXPECT_B1" ] || { log "Receiver balance not persisted: $BAL_B2 vs $EXPECT_B1"; exit 1; }
  BH2=$(echo "$R2" | jq -r '.block_height')
  BLOCK_JSON2=$(curl -fsS "$RPC/block/$BH2")
  echo "$BLOCK_JSON2" | jq '.' >/dev/null || { log "Block fetch after restart failed"; exit 1; }
  log "Persistence verified"
) || { log "Devnet failed"; exit 1; }

log "Devnet success. Log at $LOG"
