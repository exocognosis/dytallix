#!/bin/bash

# Governance Happy Path Demo Script
# This script demonstrates the complete governance flow using the dytx CLI

set -e

echo "🏛️ Dytallix Governance Happy Path Demo"
echo "======================================="

# Configuration
RPC_URL="http://localhost:3030"
CLI_DIR="$(dirname "$0")/../cli/dytx"

# Check if node is running
if ! curl -s "$RPC_URL/stats" > /dev/null; then
    echo "❌ Error: Dytallix node is not running at $RPC_URL"
    echo "Please start the node with governance enabled:"
    echo "  cd node && DYT_ENABLE_GOVERNANCE=true cargo run"
    exit 1
fi

echo "✅ Node is running at $RPC_URL"

# Build CLI if needed
if [ ! -f "$CLI_DIR/dist/index.js" ]; then
    echo "📦 Building CLI..."
    cd "$CLI_DIR"
    npm install
    npm run build
    cd -
fi

CLI="node $CLI_DIR/dist/index.js --rpc $RPC_URL"

echo ""
echo "Step 1: Submit governance proposal"
echo "--------------------------------"
RESULT=$($CLI gov submit \
    --title "Gas Limit Increase Demo" \
    --description "Increase gas limit from 21,000 to 50,000 for better UX" \
    --key "gas_limit" \
    --value "50000" \
    --output json)

PROPOSAL_ID=$(echo "$RESULT" | jq -r '.proposal_id')
echo "✅ Proposal submitted with ID: $PROPOSAL_ID"

echo ""
echo "Step 2: Deposit on proposal"
echo "-------------------------"
$CLI gov deposit \
    --proposal "$PROPOSAL_ID" \
    --from "depositor1" \
    --amount 1000000000

echo "✅ Deposit successful"

echo ""
echo "Step 3: Vote on proposal"
echo "----------------------"
$CLI gov vote \
    --proposal "$PROPOSAL_ID" \
    --from "voter1" \
    --option "yes"

$CLI gov vote \
    --proposal "$PROPOSAL_ID" \
    --from "voter2" \
    --option "yes"

echo "✅ Votes cast"

echo ""
echo "Step 4: Check proposal tally"
echo "---------------------------"
$CLI gov tally --proposal "$PROPOSAL_ID"

echo ""
echo "Step 5: Get current configuration"
echo "-------------------------------"
INITIAL_CONFIG=$(curl -s "$RPC_URL/gov/config")
INITIAL_GAS_LIMIT=$(echo "$INITIAL_CONFIG" | jq -r '.gas_limit')
echo "Current gas_limit: $INITIAL_GAS_LIMIT"

echo ""
echo "Step 6: Execute proposal"
echo "----------------------"
$CLI gov execute --proposal "$PROPOSAL_ID"

echo "✅ Proposal executed"

echo ""
echo "Step 7: Verify parameter change"
echo "-----------------------------"
FINAL_CONFIG=$(curl -s "$RPC_URL/gov/config")
FINAL_GAS_LIMIT=$(echo "$FINAL_CONFIG" | jq -r '.gas_limit')
echo "Updated gas_limit: $FINAL_GAS_LIMIT"

if [ "$FINAL_GAS_LIMIT" != "$INITIAL_GAS_LIMIT" ]; then
    echo "✅ Parameter change successful: $INITIAL_GAS_LIMIT → $FINAL_GAS_LIMIT"
else
    echo "❌ Parameter change failed - values are the same"
    exit 1
fi

echo ""
echo "Step 8: List all proposals"
echo "------------------------"
$CLI gov proposals

echo ""
echo "🎉 Governance happy path demo completed successfully!"
echo ""
echo "Summary:"
echo "- Proposal submitted and deposited ✅"
echo "- Votes cast and proposal passed ✅"
echo "- Proposal executed via CLI ✅"
echo "- Parameter changed and reflected in state ✅"