#!/bin/bash
# E2E test for PQC signature verification

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_DIR="$SCRIPT_DIR/dytallix-lean-launch/node"
CLI_DIR="$SCRIPT_DIR/dytallix-lean-launch/cli/dytx"

echo "=== E2E PQC Signature Test ==="
echo ""

# Step 1: Build the node
echo "[1/6] Building node..."
cd "$NODE_DIR"
cargo build --release --quiet 2>&1 | tail -5 || true

# Step 2: Build CLI
echo "[2/6] Building CLI..."
cd "$CLI_DIR"
npm run build >/dev/null 2>&1

# Step 3: Generate a test wallet
echo "[3/6] Generating test wallet..."
WALLET_OUTPUT=$(node dist/cli.js wallet new 2>&1 | grep -A 10 "Generated new wallet")
ADDRESS=$(echo "$WALLET_OUTPUT" | grep "Address:" | awk '{print $2}')
WALLET_FILE=$(echo "$WALLET_OUTPUT" | grep "Saved to:" | awk '{print $3}')

echo "  Address: $ADDRESS"
echo "  Wallet file: $WALLET_FILE"

# Step 4: Start the node
echo "[4/6] Starting node in background..."
cd "$NODE_DIR"
RUST_LOG=warn "$NODE_DIR/target/release/dytallix-lean-node" --http-port 8545 --p2p-port 9000 --data-dir /tmp/dytallix-test-node --dev > /tmp/dytallix-node.log 2>&1 &
NODE_PID=$!
echo "  Node PID: $NODE_PID"

# Wait for node to start
echo "  Waiting for node to start..."
for i in {1..10}; do
  if curl -s http://localhost:8545/health >/dev/null 2>&1; then
    echo "  ✓ Node is ready"
    break
  fi
  if [ $i -eq 10 ]; then
    echo "  ✗ Node failed to start"
    cat /tmp/dytallix-node.log
    kill $NODE_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Step 5: Send a transaction
echo "[5/6] Sending test transaction..."
cd "$CLI_DIR"
TX_RESULT=$(node dist/cli.js tx send $ADDRESS dyt1recipient 100 DGT \
  --rpc http://localhost:8545 \
  --wallet "$WALLET_FILE" \
  --memo "E2E PQC test" 2>&1) || true

echo "$TX_RESULT"

# Check if transaction was accepted
if echo "$TX_RESULT" | grep -q "INVALID_SIGNATURE"; then
  echo ""
  echo "❌ FAILED: Signature verification failed (INVALID_SIGNATURE)"
  echo ""
  echo "Node logs:"
  tail -50 /tmp/dytallix-node.log
elif echo "$TX_RESULT" | grep -q "Transaction accepted" || echo "$TX_RESULT" | grep -q "0x"; then
  echo ""
  echo "✅ SUCCESS: Transaction accepted!"
else
  echo ""
  echo "⚠️  UNKNOWN: Unable to determine transaction status"
  echo ""
  echo "Node logs:"
  tail -50 /tmp/dytallix-node.log
fi

# Step 6: Clean up
echo "[6/6] Cleaning up..."
kill $NODE_PID 2>/dev/null || true
rm -f "$WALLET_FILE"
rm -rf /tmp/dytallix-test-node
rm -f /tmp/dytallix-node.log

echo ""
echo "=== Test Complete ==="
