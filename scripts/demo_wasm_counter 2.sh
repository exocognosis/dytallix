#!/usr/bin/env bash
set -euo pipefail

WASM_ARTIFACT=${1:-artifacts/counter.wasm}

echo "🚀 WASM Counter Contract Demo"
echo "============================="

# Deploy the contract
echo "📦 Deploying counter contract..."
DEPLOY_RESULT=$(dcli contract wasm deploy "$WASM_ARTIFACT" --gas 500000)
echo "$DEPLOY_RESULT"

# Extract address from deployment result (assuming JSON output with "Address:" field)
ADDR=$(echo "$DEPLOY_RESULT" | grep -oP 'Address: \K[^,]*' | tr -d ' ')

if [ -z "$ADDR" ]; then
    echo "❌ Failed to extract contract address from deployment result"
    echo "Deployment result was: $DEPLOY_RESULT"
    exit 1
fi

echo "✅ Contract deployed at: $ADDR"
echo ""

# Execute increment function
echo "🔧 Calling increment function..."
EXEC_RESULT=$(dcli contract wasm exec "$ADDR" increment --gas 20000)
echo "$EXEC_RESULT"
echo ""

# Get the counter value
echo "📊 Getting counter value..."
GET_RESULT=$(dcli contract wasm exec "$ADDR" get --gas 20000)
echo "$GET_RESULT"

# Extract the counter value (assuming JSON output with "Result:" field)
VAL=$(echo "$GET_RESULT" | grep -oP 'Result: \K[^,]*' | tr -d ' {}')

echo ""
echo "🎉 Demo completed!"
echo "Counter value: $VAL"
echo "✅ WASM smart contract runtime is working!"