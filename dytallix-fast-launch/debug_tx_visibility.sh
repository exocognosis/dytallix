#!/bin/bash
# Transaction Visibility Debug Script
# Diagnoses why transactions aren't appearing in the Explorer

set -e

echo "🔍 Dytallix Transaction Visibility Diagnostics"
echo "=============================================="
echo ""

NODE_URL="${NODE_URL:-http://localhost:3030}"
WALLET_ADDR="${1:-}"

if [ -z "$WALLET_ADDR" ]; then
    echo "Usage: $0 <wallet_address>"
    echo "  or set NODE_URL environment variable"
    exit 1
fi

echo "📡 Node URL: $NODE_URL"
echo "👛 Wallet: $WALLET_ADDR"
echo ""

# 1. Check node health
echo "1️⃣  Checking node health..."
STATUS=$(curl -s "$NODE_URL/status")
echo "$STATUS" | jq '.'
MEMPOOL_SIZE=$(echo "$STATUS" | jq -r '.mempool_size')
LATEST_HEIGHT=$(echo "$STATUS" | jq -r '.latest_height')
echo "   ✓ Latest height: $LATEST_HEIGHT"
echo "   ✓ Mempool size: $MEMPOOL_SIZE"
echo ""

# 2. Check recent blocks for transactions
echo "2️⃣  Checking last 20 blocks for transactions..."
BLOCKS=$(curl -s "$NODE_URL/blocks?limit=20")
BLOCKS_WITH_TXS=$(echo "$BLOCKS" | jq '[.blocks[] | select(.txs | length > 0)]')
TX_COUNT=$(echo "$BLOCKS_WITH_TXS" | jq 'length')
echo "   Blocks with transactions: $TX_COUNT / 20"

if [ "$TX_COUNT" -gt "0" ]; then
    echo "   📦 Blocks with transactions:"
    echo "$BLOCKS_WITH_TXS" | jq -r '.[] | "      Height \(.height): \(.txs | length) tx(s)"'
    echo ""
    
    # Show a sample transaction
    SAMPLE_TX_HASH=$(echo "$BLOCKS_WITH_TXS" | jq -r '.[0].txs[0]' 2>/dev/null || echo "")
    if [ -n "$SAMPLE_TX_HASH" ] && [ "$SAMPLE_TX_HASH" != "null" ]; then
        echo "   📝 Sample transaction:"
        curl -s "$NODE_URL/tx/$SAMPLE_TX_HASH" | jq '.'
    fi
else
    echo "   ⚠️  No transactions found in recent blocks!"
fi
echo ""

# 3. Check wallet balance
echo "3️⃣  Checking wallet balance..."
BALANCE=$(curl -s "$NODE_URL/account/$WALLET_ADDR")
echo "$BALANCE" | jq '.'
DGT_BALANCE=$(echo "$BALANCE" | jq -r '.balances.udgt // 0')
DRT_BALANCE=$(echo "$BALANCE" | jq -r '.balances.udrt // 0')
NONCE=$(echo "$BALANCE" | jq -r '.nonce // 0')
echo "   DGT: $((DGT_BALANCE / 1000000)) (micro: $DGT_BALANCE)"
echo "   DRT: $((DRT_BALANCE / 1000000)) (micro: $DRT_BALANCE)"
echo "   Nonce: $NONCE"
echo ""

# 4. Test transaction submission
echo "4️⃣  Testing transaction submission capability..."
echo "   (This would require wallet keys - skipping actual submission)"
echo "   To submit a test transaction, use the wallet UI"
echo ""

# 5. Check Explorer API
echo "5️⃣  Checking Explorer API (via backend server)..."
BACKEND_URL="${BACKEND_URL:-http://localhost:5001}"
echo "   Backend URL: $BACKEND_URL"

# Check if backend is running
if curl -s -f "$BACKEND_URL/api/status" >/dev/null 2>&1; then
    echo "   ✓ Backend server is running"
    
    # Check transaction endpoint
    TX_LIST=$(curl -s "$BACKEND_URL/api/transactions?limit=10")
    TX_API_COUNT=$(echo "$TX_LIST" | jq '.transactions | length')
    echo "   ✓ Transaction API returned $TX_API_COUNT transactions"
    
    if [ "$TX_API_COUNT" -gt "0" ]; then
        echo "   Recent transactions from API:"
        echo "$TX_LIST" | jq -r '.transactions[] | "      \(.hash) - \(.from) -> \(.to) (\(.amount))"' | head -5
    fi
else
    echo "   ⚠️  Backend server not reachable at $BACKEND_URL"
fi
echo ""

# 6. Diagnosis
echo "📊 DIAGNOSIS"
echo "============"
echo ""

if [ "$TX_COUNT" -eq "0" ]; then
    echo "❌ ISSUE DETECTED: No transactions in blocks"
    echo ""
    echo "Possible causes:"
    echo "  1. Block producer is not pulling transactions from mempool"
    echo "  2. Transactions are being rejected before mempool insertion"
    echo "  3. Mempool is being cleared but transactions aren't making it to blocks"
    echo ""
    echo "🔧 Recommended fixes:"
    echo "  1. Check node logs for errors: tail -f /path/to/node.log"
    echo "  2. Verify block production logic includes mempool transactions"
    echo "  3. Test transaction submission with proper nonce and signatures"
    echo "  4. Ensure gas limits and fees are sufficient"
elif [ "$MEMPOOL_SIZE" -gt "0" ]; then
    echo "⚠️  PENDING: Transactions in mempool but not in blocks"
    echo "   Mempool has $MEMPOOL_SIZE transactions waiting"
    echo "   Block producer may not be including them"
else
    echo "✅ System appears healthy"
    echo "   Blocks are being produced and transactions are being processed"
fi

echo ""
echo "📝 Next steps:"
echo "  1. Send a test transaction from the wallet"
echo "  2. Watch for it in the mempool: watch -n 1 'curl -s $NODE_URL/status | jq .mempool_size'"
echo "  3. Check if it appears in the next block: curl -s $NODE_URL/block/latest"
echo "  4. Verify transaction receipt: curl -s $NODE_URL/tx/<hash>"
