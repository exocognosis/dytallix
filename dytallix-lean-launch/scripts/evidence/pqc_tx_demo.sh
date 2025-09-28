#!/usr/bin/env bash
# Demonstrate live PQC-signed transfer inclusion and capture evidence
# Outputs under launch-evidence/pqc/
# - live_tx.json            (signed tx with hash)
# - live_receipt.json       (tx receipt with height/status)
# - pqc_tx_demo.log         (CLI log transcript)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
EVID_DIR="$ROOT_DIR/launch-evidence/pqc"
CLI_DIR="$ROOT_DIR/cli/dytx"
NODE_URL="${NODE_URL:-http://localhost:3030}"
RPC="${DYTX_RPC:-${RPC_URL:-$NODE_URL}}"
CHAIN_ID="${DYTX_CHAIN_ID:-dytallix-testnet-1}"
LOG="$EVID_DIR/pqc_tx_demo.log"
# Prefer mounted secret file; fallback to env to create one
PASS_FILE="${DYTX_PASSPHRASE_FILE:-/run/secrets/dytx_demo_passphrase}"
# If /run/secrets is unavailable, fall back to evidence-local path
if ! mkdir -p "$(dirname "$PASS_FILE")" 2>/dev/null; then
  PASS_FILE="$EVID_DIR/.passphrase"
fi

mkdir -p "$EVID_DIR"

run() { echo "+ $*" | tee -a "$LOG"; "$@" 2>&1 | tee -a "$LOG"; }
node_up() { curl -fsS "$RPC/status" >/dev/null 2>&1 || curl -fsS "$RPC/api/status" >/dev/null 2>&1; }

# Ensure CLI is built
if [ ! -x "$CLI_DIR/dist/index.js" ] && [ -f "$CLI_DIR/package.json" ]; then
  echo "[build] Building dytx CLI" | tee -a "$LOG"
  (cd "$CLI_DIR" && npm ci >/dev/null 2>&1 && npm run -s build) | tee -a "$LOG"
fi

if ! node -e "require('fs').accessSync('$CLI_DIR/dist/index.js')" 2>/dev/null; then
  echo "ERROR: dytx CLI not built" | tee -a "$LOG" >&2
  exit 1
fi

# Prepare passphrase file securely
if [ ! -f "$PASS_FILE" ]; then
  if [ -n "${DYTX_PASSPHRASE:-}" ]; then
    umask 177
    printf '%s\n' "$DYTX_PASSPHRASE" >"$PASS_FILE"
  else
    # Generate a strong random passphrase for local demo use
    umask 177
    if command -v openssl >/dev/null 2>&1; then
      openssl rand -base64 32 | tr '+/' '-_' | tr -d '=' >"$PASS_FILE"
    else
      head -c 32 /dev/urandom | base64 | tr '+/' '-_' | tr -d '=' >"$PASS_FILE"
    fi
  fi
fi

# 1) Key: create or reuse default
ADDR_FILE="$EVID_DIR/signer.addr"
if [ -f "$ADDR_FILE" ]; then
  ADDRESS="$(cat "$ADDR_FILE")"
else
  # Ensure JSON-only output: put global --output before subcommand, and use --out for file
  ADDRESS=$(node "$CLI_DIR/dist/index.js" --output json keygen --label demo --out "$EVID_DIR/demo.json" \
    --passphrase-file "$PASS_FILE" | jq -r '.address')
  echo "$ADDRESS" > "$ADDR_FILE"
fi

echo "Signer: $ADDRESS" | tee -a "$LOG"

# 2) Prepare payload for sign
cat > "$EVID_DIR/payload.json" <<JSON
{ "to": "dyt1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq9u9u9u", "amount": "0.000001", "denom": "udgt", "memo": "pqc-demo" }
JSON

# 3) Sign
run node "$CLI_DIR/dist/index.js" --output json sign --address "$ADDRESS" --payload "$EVID_DIR/payload.json" \
  --out "$EVID_DIR/live_tx.json" --rpc "$RPC" --chain-id "$CHAIN_ID" --passphrase-file "$PASS_FILE" \
  --keystore "$EVID_DIR/demo.json"

# Extract hash
TX_HASH=$(jq -r '.hash // .signed_tx.hash // empty' "$EVID_DIR/live_tx.json" | sed 's/\"//g')
if [ -z "$TX_HASH" ]; then
  # compute hash from tx body if printed nested
  TX_HASH=$(jq -r '.signed_tx.tx_hash // .tx_hash // empty' "$EVID_DIR/live_tx.json")
fi

# 4) Broadcast
run node "$CLI_DIR/dist/index.js" --output json broadcast --file "$EVID_DIR/live_tx.json" --rpc "$RPC" | tee "$EVID_DIR/broadcast_response.json"

# Capture canonical hash after broadcast
if [ -z "$TX_HASH" ]; then TX_HASH=$(jq -r '.hash // empty' "$EVID_DIR/broadcast_response.json"); fi
if [ -z "$TX_HASH" ]; then echo "ERROR: could not determine tx hash" | tee -a "$LOG"; exit 1; fi

echo "tx_hash=$TX_HASH" | tee -a "$LOG"

# 5) Poll for inclusion
ATTEMPTS=40
SLEEP=3
ok=0
for i in $(seq 1 $ATTEMPTS); do
  # try explorer facade first
  if curl -fsS "$RPC/api/transactions/$TX_HASH" -o "$EVID_DIR/live_receipt.json" 2>/dev/null; then
    STATUS=$(jq -r '.status // .tx_status // .result // empty' "$EVID_DIR/live_receipt.json")
    H=$(jq -r '.height // .block_height // .result.height // empty' "$EVID_DIR/live_receipt.json")
    if [ "$STATUS" != "unknown" ] && [ -n "$H" ]; then ok=1; break; fi
  fi
  # fallback raw
  if curl -fsS "$RPC/tx/$TX_HASH" -o "$EVID_DIR/live_receipt.json" 2>/dev/null; then
    H=$(jq -r '.height // .block_height // empty' "$EVID_DIR/live_receipt.json")
    ST=$(jq -r '.status // .code // 0' "$EVID_DIR/live_receipt.json")
    if [ -n "$H" ]; then ok=1; break; fi
  fi
  sleep $SLEEP
  echo "waiting inclusion... ($i)" | tee -a "$LOG"
done

if [ "$ok" -ne 1 ]; then
  echo "ERROR: receipt not found for $TX_HASH" | tee -a "$LOG"
  exit 1
fi

echo "✅ PQC inclusion captured at $(date -u +%FT%TZ)" | tee -a "$LOG"
ls -l "$EVID_DIR" | tee -a "$LOG"
