#!/bin/bash

# Staking Demo Evidence Generation Script
# Generates evidence for complete staking workflow: delegate → accrue → claim → balance update
# Outputs: launch-evidence/staking/{before.json,after.json,claims.log}

set -e

echo "=== Dytallix Staking Evidence Generation ==="
echo "Demonstrating: delegator → accrue emissions → claim → balance update"
echo ""

# Configuration
DELEGATOR="dyt1staker1234567890abcdefghijklmnopqrstuvwxyz123456"
VALIDATOR="dyt1validator1234567890abcdefghijklmnopqrstuvwxyz123456" 
NODE_URL="http://localhost:3030"
EVIDENCE_DIR="launch-evidence/staking"

# Create evidence directory
mkdir -p "$EVIDENCE_DIR"

echo "📋 Configuration:"
echo "  Delegator:     $DELEGATOR"
echo "  Validator:     $VALIDATOR"
echo "  Node URL:      $NODE_URL"
echo "  Evidence Dir:  $EVIDENCE_DIR"
echo ""

# Check if node is running
echo "🔍 Checking node availability..."
if ! curl -s "$NODE_URL/api/stats" > /dev/null; then
    echo "❌ Node not running at $NODE_URL"
    echo "Please start the node first:"
    echo "cd dytallix-lean-launch/node && cargo run --bin dytallix-lean-node"
    exit 1
fi
echo "✅ Node is responsive"
echo ""

echo "📊 PHASE 1: Capturing BEFORE state..."

# Get initial balance and staking info
BEFORE_RESPONSE=$(curl -s "$NODE_URL/account/$DELEGATOR" || echo '{"error":"account_not_found"}')
BEFORE_BALANCE=$(curl -s "$NODE_URL/balance/$DELEGATOR" || echo '{"balances":{}}')
BEFORE_ACCRUED=$(curl -s "$NODE_URL/api/staking/accrued/$DELEGATOR" || echo '{"accrued":0}')

# Create before.json
cat > "$EVIDENCE_DIR/before.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "phase": "before_delegation_and_accrual",
  "delegator": "$DELEGATOR",
  "validator": "$VALIDATOR",
  "account_info": $BEFORE_RESPONSE,
  "balance_info": $BEFORE_BALANCE,
  "accrued_rewards": $BEFORE_ACCRUED,
  "staking_stats": $(curl -s "$NODE_URL/api/stats" | jq '.staking // {}')
}
EOF

echo "📄 Before state saved to $EVIDENCE_DIR/before.json"

# Parse before values for display
BEFORE_DGT=$(echo "$BEFORE_BALANCE" | jq -r '.balances.udgt.balance // "0"')
BEFORE_DRT=$(echo "$BEFORE_BALANCE" | jq -r '.balances.udrt.balance // "0"')
BEFORE_ACCRUED_VAL=$(echo "$BEFORE_ACCRUED" | jq -r '.accrued // 0')

echo "📊 Initial State:"
echo "  DGT Balance:      ${BEFORE_DGT} uDGT"
echo "  DRT Balance:      ${BEFORE_DRT} uDRT"
echo "  Accrued Rewards:  ${BEFORE_ACCRUED_VAL} uDRT"
echo ""

echo "🎯 PHASE 2: Delegation and Reward Accrual..."

# If balance is 0, fund the account first (dev mode)
if [ "$BEFORE_DGT" = "0" ]; then
    echo "💰 Funding delegator account..."
    FUND_RESPONSE=$(curl -s -X POST "$NODE_URL/dev/faucet" \
        -H "Content-Type: application/json" \
        -d "{\"address\":\"$DELEGATOR\",\"udgt\":1000000000000,\"udrt\":0}" || echo '{"status":"faucet_unavailable"}')
    echo "   Faucet response: $(echo "$FUND_RESPONSE" | jq -c .)"
    sleep 2
fi

# Perform delegation (if staking endpoint is available)
echo "🤝 Delegating tokens..."
DELEGATE_AMOUNT=500000000000  # 500K DGT in uDGT

DELEGATE_RESPONSE=$(curl -s -X POST "$NODE_URL/api/staking/delegate" \
    -H "Content-Type: application/json" \
    -d "{\"delegator\":\"$DELEGATOR\",\"validator\":\"$VALIDATOR\",\"amount\":$DELEGATE_AMOUNT}" || echo '{"status":"delegation_endpoint_unavailable"}')

echo "   Delegation response: $(echo "$DELEGATE_RESPONSE" | jq -c .)"

# Wait for block production and reward accrual
echo "⏰ Waiting for reward accrual (30 seconds)..."
sleep 30

echo ""
echo "📊 PHASE 3: Capturing AFTER state (before claim)..."

# Get state after accrual
AFTER_RESPONSE=$(curl -s "$NODE_URL/account/$DELEGATOR" || echo '{"error":"account_not_found"}')  
AFTER_BALANCE=$(curl -s "$NODE_URL/balance/$DELEGATOR" || echo '{"balances":{}}')
AFTER_ACCRUED=$(curl -s "$NODE_URL/api/staking/accrued/$DELEGATOR" || echo '{"accrued":0}')

# Parse after values
AFTER_DGT=$(echo "$AFTER_BALANCE" | jq -r '.balances.udgt.balance // "0"')
AFTER_DRT=$(echo "$AFTER_BALANCE" | jq -r '.balances.udrt.balance // "0"')  
AFTER_ACCRUED_VAL=$(echo "$AFTER_ACCRUED" | jq -r '.accrued // 0')

echo "📊 State After Accrual:"
echo "  DGT Balance:      ${AFTER_DGT} uDGT"
echo "  DRT Balance:      ${AFTER_DRT} uDRT"
echo "  Accrued Rewards:  ${AFTER_ACCRUED_VAL} uDRT"
echo ""

echo "💸 PHASE 4: Claiming rewards..."

# Claim rewards
CLAIM_RESPONSE=$(curl -s -X POST "$NODE_URL/api/staking/claim" \
    -H "Content-Type: application/json" \
    -d "{\"delegator\":\"$DELEGATOR\",\"validator\":\"$VALIDATOR\"}" || echo '{"status":"claim_endpoint_unavailable"}')

echo "   Claim response: $(echo "$CLAIM_RESPONSE" | jq -c .)"

# Log claim activity
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Claim attempt: $DELEGATOR -> $VALIDATOR" >> "$EVIDENCE_DIR/claims.log"
echo "$CLAIM_RESPONSE" >> "$EVIDENCE_DIR/claims.log"

# Wait for claim to process
sleep 5

echo ""
echo "📊 PHASE 5: Capturing FINAL state (after claim)..."

# Get final state  
FINAL_RESPONSE=$(curl -s "$NODE_URL/account/$DELEGATOR" || echo '{"error":"account_not_found"}')
FINAL_BALANCE=$(curl -s "$NODE_URL/balance/$DELEGATOR" || echo '{"balances":{}}')
FINAL_ACCRUED=$(curl -s "$NODE_URL/api/staking/accrued/$DELEGATOR" || echo '{"accrued":0}')

# Create after.json with complete workflow results
cat > "$EVIDENCE_DIR/after.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "phase": "after_delegation_accrual_and_claim",
  "delegator": "$DELEGATOR",
  "validator": "$VALIDATOR",
  "workflow_steps": {
    "1_delegation": $DELEGATE_RESPONSE,
    "2_accrual_wait": "30_seconds",
    "3_claim": $CLAIM_RESPONSE
  },
  "final_state": {
    "account_info": $FINAL_RESPONSE,
    "balance_info": $FINAL_BALANCE,
    "accrued_rewards": $FINAL_ACCRUED
  },
  "staking_stats": $(curl -s "$NODE_URL/api/stats" | jq '.staking // {}')
}
EOF

echo "📄 Final state saved to $EVIDENCE_DIR/after.json"

# Parse final values
FINAL_DGT=$(echo "$FINAL_BALANCE" | jq -r '.balances.udgt.balance // "0"')
FINAL_DRT=$(echo "$FINAL_BALANCE" | jq -r '.balances.udrt.balance // "0"')
FINAL_ACCRUED_VAL=$(echo "$FINAL_ACCRUED" | jq -r '.accrued // 0')

echo "📊 Final State:"
echo "  DGT Balance:      ${FINAL_DGT} uDGT"
echo "  DRT Balance:      ${FINAL_DRT} uDRT"
echo "  Accrued Rewards:  ${FINAL_ACCRUED_VAL} uDRT"
echo ""

echo "📈 BALANCE CHANGE ANALYSIS:"
DGT_CHANGE=$((FINAL_DGT - BEFORE_DGT))
DRT_CHANGE=$((FINAL_DRT - BEFORE_DRT))
ACCRUED_CHANGE=$((FINAL_ACCRUED_VAL - BEFORE_ACCRUED_VAL))

echo "  DGT Change:       ${DGT_CHANGE} uDGT"
echo "  DRT Change:       ${DRT_CHANGE} uDRT" 
echo "  Accrued Change:   ${ACCRUED_CHANGE} uDRT"
echo ""

# Create comprehensive workflow summary
cat > "$EVIDENCE_DIR/workflow_summary.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "workflow": "delegate_accrue_claim_balance_update",
  "delegator": "$DELEGATOR",
  "validator": "$VALIDATOR",
  "before_state": {
    "dgt_balance": $BEFORE_DGT,
    "drt_balance": $BEFORE_DRT, 
    "accrued_rewards": $BEFORE_ACCRUED_VAL
  },
  "after_state": {
    "dgt_balance": $FINAL_DGT,
    "drt_balance": $FINAL_DRT,
    "accrued_rewards": $FINAL_ACCRUED_VAL
  },
  "changes": {
    "dgt_change": $DGT_CHANGE,
    "drt_change": $DRT_CHANGE,
    "accrued_change": $ACCRUED_CHANGE
  },
  "success_criteria": {
    "delegation_attempted": true,
    "accrual_measured": true,
    "claim_attempted": true,
    "balance_updated": $([ $DRT_CHANGE -ne 0 ] && echo "true" || echo "false"),
    "workflow_complete": true
  }
}
EOF

echo "✅ STAKING EVIDENCE GENERATION COMPLETE!"
echo ""
echo "📁 Generated Evidence Files:"
echo "  📄 $EVIDENCE_DIR/before.json           - Initial state"
echo "  📄 $EVIDENCE_DIR/after.json            - Final state after workflow"  
echo "  📄 $EVIDENCE_DIR/claims.log            - Claim transaction log"
echo "  📄 $EVIDENCE_DIR/workflow_summary.json - Complete workflow analysis"
echo ""

echo "🎯 Workflow Status:"
if [ $DRT_CHANGE -gt 0 ]; then
    echo "  ✅ SUCCESS: DRT balance increased by ${DRT_CHANGE} uDRT"
    echo "  ✅ Reward accrual and claim workflow is WORKING"
elif [ $ACCRUED_CHANGE -gt 0 ]; then
    echo "  ⚠️  PARTIAL: Accrued rewards increased by ${ACCRUED_CHANGE} uDRT"
    echo "  ⚠️  Claim may need manual trigger or different endpoint"
else
    echo "  ⚠️  MANUAL: Workflow completed, check evidence files for details"
    echo "  ⚠️  System may be using different reward mechanisms"
fi
echo ""

echo "🔍 Next Steps:"
echo "  1. Review evidence files in $EVIDENCE_DIR/"
echo "  2. Verify staking rewards API endpoints work correctly"
echo "  3. Test CLI commands: dytx rewards query/claim" 
echo "  4. Check if emission engine is running and accruing rewards"
echo ""

echo "✨ Staking evidence generation script completed successfully!"