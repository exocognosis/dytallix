#!/usr/bin/env bash
# save as bootstrap_env.sh; run: bash bootstrap_env.sh 178.156.187.81
set -euo pipefail

HOST="${1:-178.156.187.81}"
ENV_FILE="./dytallix-lean-launch/.env.staging"

# Try to read chain-id via RPC first, else from genesis
CHAIN_ID="$(curl -s http://$HOST:26657/status | jq -r '.result.node_info.network' 2>/dev/null || true)"
if [ -z "$CHAIN_ID" ] || [ "$CHAIN_ID" = "null" ]; then
  # try local genesis (if running on the server)
  if [ -f "$HOME/.dytallix/config/genesis.json" ]; then
    CHAIN_ID="$(grep -m1 '"chain_id"' "$HOME/.dytallix/config/genesis.json" | cut -d'"' -f4 || true)"
  fi
fi

# Prompt for any missing values
echo "Detected CHAIN_ID: ${CHAIN_ID:-<unknown>}"
read -r -p "Confirm/enter CHAIN_ID: " INPUT_CHAIN_ID || true
CHAIN_ID="${INPUT_CHAIN_ID:-$CHAIN_ID}"

# API base URL (required for new pattern)
read -r -p "Enter VITE_API_URL (e.g., http://$HOST:8787/api): " VITE_API_URL || true
if [ -z "$VITE_API_URL" ]; then
  echo "Warning: VITE_API_URL not set. Using legacy fallback."
  VITE_API_URL="http://$HOST:8787/api"
fi

# Optional explicit faucet URL (leave blank to use API_URL + /faucet)
read -r -p "Enter VITE_FAUCET_URL (optional, defaults to API_URL/faucet): " VITE_FAUCET_URL || true

# Test mnemonic prompt (DO NOT use prod keys)
read -r -p "Paste TEST_MNEMONIC (24 or 12 words; leave blank to skip): " TEST_MNEMONIC || true

mkdir -p "$(dirname "$ENV_FILE")"
cat > "$ENV_FILE" <<EOF
VITE_LCD_HTTP_URL=http://$HOST:1317
VITE_RPC_HTTP_URL=http://$HOST:26657
VITE_RPC_WS_URL=ws://$HOST:26657/websocket
VITE_CHAIN_ID=$CHAIN_ID
VITE_API_URL=$VITE_API_URL
EOF

# Add VITE_FAUCET_URL only if provided
if [ -n "$VITE_FAUCET_URL" ]; then
  echo "VITE_FAUCET_URL=$VITE_FAUCET_URL" >> "$ENV_FILE"
fi

cat >> "$ENV_FILE" <<EOF
TEST_MNEMONIC="$TEST_MNEMONIC"

# optional flags
VITE_PQC_ENABLED=true
VITE_PQC_ALGO=dilithium
VITE_LOG_LEVEL=info
EOF

echo "Wrote $ENV_FILE"
echo "Sanity checks:"
echo "- LCD: $(curl -s http://$HOST:1317/node_info | jq -r .default_node_info.network 2>/dev/null || echo fail)"
echo "- RPC: $(curl -s http://$HOST:26657/status | jq -r .result.node_info.network 2>/dev/null || echo fail)"
node -e "try{const W=require('ws');const ws=new W('ws://$HOST:26657/websocket');ws.on('open',()=>{console.log('WS open');ws.close()});ws.on('error',e=>console.error('WS error',e.message))}catch(e){console.log('WS test skipped (node ws not installed)')}" || true
