#!/bin/bash

# Dytallix Staking CLI Usage Examples
# This script demonstrates how to use the CLI for staking operations

set -e

echo "🚀 Dytallix Staking CLI Examples"
echo "================================"

# Configuration
VALIDATOR_ADDRESS="dyt1alice123validator456"
DELEGATOR_ADDRESS="dyt1bob789delegator012"
CONSENSUS_PUBKEY="deadbeefcafebabe0123456789abcdef"
COMMISSION_RATE=500  # 5%
SELF_STAKE=1000000000000  # 1M DGT in uDGT
DELEGATION_AMOUNT=500000000000  # 500K DGT in uDGT

echo
echo "Configuration:"
echo "  Validator: $VALIDATOR_ADDRESS"
echo "  Delegator: $DELEGATOR_ADDRESS"
echo "  Commission: $COMMISSION_RATE basis points (5%)"
echo "  Self Stake: $SELF_STAKE uDGT"
echo "  Delegation: $DELEGATION_AMOUNT uDGT"

echo
echo "1. Register Validator and Self-Delegate"
echo "======================================="
echo "dytallix-cli stake register-validator \\"
echo "  --address $VALIDATOR_ADDRESS \\"
echo "  --pubkey $CONSENSUS_PUBKEY \\"
echo "  --commission $COMMISSION_RATE \\"
echo "  --self-stake $SELF_STAKE"
echo
echo "Expected output:"
echo "✓ Validator registered successfully"
echo "✓ Self-delegated $SELF_STAKE uDGT"

echo
echo "2. External Delegation"
echo "====================="
echo "dytallix-cli stake delegate \\"
echo "  --from $DELEGATOR_ADDRESS \\"
echo "  --validator $VALIDATOR_ADDRESS \\"
echo "  --amount $DELEGATION_AMOUNT"
echo
echo "Expected output:"
echo "✓ Delegated $DELEGATION_AMOUNT uDGT from $DELEGATOR_ADDRESS to $VALIDATOR_ADDRESS"

echo
echo "3. List All Validators"
echo "====================="
echo "dytallix-cli stake validators"
echo
echo "Expected output:"
echo "Active Validators (1)"
echo "  1. {\"address\":\"$VALIDATOR_ADDRESS\",\"total_stake\":\"$((SELF_STAKE + DELEGATION_AMOUNT))\",\"status\":\"Active\",\"commission_rate\":$COMMISSION_RATE,\"self_stake\":\"$SELF_STAKE\"}"

echo
echo "4. Show Staking Information"
echo "=========================="
echo "dytallix-cli stake show --address $DELEGATOR_ADDRESS"
echo
echo "Expected output:"
echo "Staking information for: $DELEGATOR_ADDRESS"
echo "  Delegations: [delegation info]"

echo
echo "5. Get Staking Statistics"
echo "========================"
echo "dytallix-cli stake stats"
echo
echo "Expected output:"
echo "Staking Statistics:"
echo "  Total Stake: $((SELF_STAKE + DELEGATION_AMOUNT)) uDGT"
echo "  Total Validators: 1"
echo "  Active Validators: 1"

echo
echo "6. Claim Rewards (after some blocks)"
echo "===================================="
echo "dytallix-cli stake claim-rewards \\"
echo "  --delegator $DELEGATOR_ADDRESS \\"
echo "  --validator $VALIDATOR_ADDRESS"
echo
echo "Expected output:"
echo "✓ Claimed [amount] uDRT rewards"

echo
echo "📝 Notes:"
echo "========="
echo "- All amounts are in micro-units (uDGT/uDRT) with 6 decimal places"
echo "- 1 DGT = 1,000,000 uDGT"
echo "- 1 DRT = 1,000,000 uDRT"
echo "- Commission rate is in basis points (500 = 5%)"
echo "- Validators need minimum self-stake to become active"
echo "- Rewards accrue per block and can be claimed anytime"
echo "- Use --output json for machine-readable output"

echo
echo "🔗 RPC Usage:"
echo "============="
echo "You can also interact via RPC:"
echo
echo "curl -X POST http://localhost:3030/rpc \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"jsonrpc\": \"2.0\","
echo "    \"method\": \"staking_get_stats\","
echo "    \"params\": [],"
echo "    \"id\": 1"
echo "  }'"

echo
echo "🌐 REST API Usage:"
echo "=================="
echo "curl http://localhost:3030/staking/stats"
echo "curl http://localhost:3030/staking/validators"

echo
echo "✅ For more information, see docs/STAKING.md"