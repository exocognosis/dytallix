#!/bin/bash
# Debug signature verification between CLI and node

set -euo pipefail

echo "🔍 Signature Verification Debugging"
echo "===================================="
echo

# Setup
WALLETS_DIR="./test-wallets"
CLI_BIN="./cli/dytx/dist/index.js"
NODE_URL="${NODE_URL:-http://localhost:3030}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure wallets directory exists
mkdir -p "$WALLETS_DIR"

echo "📁 Creating test wallet..."
WALLET_PATH="$WALLETS_DIR/debug-wallet.json"

# Remove old wallet if exists
rm -f "$WALLET_PATH"

# Generate wallet
node "$CLI_BIN" keygen \
  --label debug-wallet \
  --algo dilithium \
  --out "$WALLET_PATH" \
  --passphrase "testpass123" 2>&1 > /dev/null

# Wait a moment for file to be written
sleep 1

# Check if wallet was created
if [ ! -f "$WALLET_PATH" ]; then
  echo -e "${RED}❌ Failed to create wallet${NC}"
  exit 1
fi

# Extract address
WALLET_ADDR=$(jq -r '.address' "$WALLET_PATH")
echo -e "${GREEN}✓ Wallet created: $WALLET_ADDR${NC}"
echo

# Request tokens
echo "💰 Requesting tokens from faucet..."
FAUCET_RESPONSE=$(curl -s -X POST "$NODE_URL/dev/faucet" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$WALLET_ADDR\", \"amount\": \"1000000\"}")

echo "Faucet response: $FAUCET_RESPONSE"
echo

# Wait for token distribution
sleep 2

# Check balance
echo "💵 Checking balance..."
BALANCE=$(curl -s "$NODE_URL/api/account/$WALLET_ADDR" | jq -r '.balance // "0"')
echo -e "${BLUE}Balance: $BALANCE${NC}"
echo

# Now prepare a transaction and capture all debug info
echo "🔧 Preparing test transaction..."
RECIPIENT="dyt1debugrecipientaddress00000000000"

# Enable detailed logging in the CLI by setting DEBUG env var
export DEBUG=dytx:*

# Capture the transaction attempt with verbose output
echo -e "${YELLOW}Attempting transaction with full debug output...${NC}"
echo "From: $WALLET_ADDR"
echo "To: $RECIPIENT"
echo "Amount: 100 udgt"
echo

# Run the transaction and capture output
set +e
TX_OUTPUT=$(node "$CLI_BIN" transfer \
  --from "$WALLET_ADDR" \
  --to "$RECIPIENT" \
  --amount 100 \
  --denom udgt \
  --memo "debug-test" \
  --keystore "$WALLET_PATH" \
  --passphrase "testpass123" \
  --output json 2>&1)
TX_EXIT_CODE=$?
set -e

echo "Transaction output:"
echo "$TX_OUTPUT"
echo
echo "Exit code: $TX_EXIT_CODE"
echo

# Now let's manually extract and compare the signing process
echo -e "${YELLOW}Manual Signature Verification Check${NC}"
echo "===================================="
echo

# Extract keys from wallet
PK_B64=$(jq -r '.pubkey_b64' "$WALLET_PATH")
SK_B64=$(jq -r '.seckey_b64' "$WALLET_PATH")

echo "Public Key (base64): ${PK_B64:0:40}..."
echo "Public Key Length: $(echo -n "$PK_B64" | base64 -d 2>/dev/null | wc -c || echo "N/A")"
echo

# Get account nonce
ACCOUNT_INFO=$(curl -s "$NODE_URL/api/account/$WALLET_ADDR")
NONCE=$(echo "$ACCOUNT_INFO" | jq -r '.nonce // "0"')
echo "Account nonce: $NONCE"
echo

# Get chain ID
STATS=$(curl -s "$NODE_URL/api/stats")
CHAIN_ID=$(echo "$STATS" | jq -r '.chain_id')
echo "Chain ID: $CHAIN_ID"
echo

# Create canonical transaction structure (matching what CLI does)
cat > /tmp/test_tx.json <<EOF
{
  "chain_id": "$CHAIN_ID",
  "fee": "1000",
  "memo": "debug-test",
  "msgs": [
    {
      "amount": "100",
      "denom": "DGT",
      "from": "$WALLET_ADDR",
      "to": "$RECIPIENT",
      "type": "send"
    }
  ],
  "nonce": $NONCE
}
EOF

echo "Canonical transaction structure:"
cat /tmp/test_tx.json | jq .
echo

# Compute canonical JSON (stable sort keys)
CANONICAL=$(cat /tmp/test_tx.json | jq -cS .)
echo "Canonical JSON: $CANONICAL"
echo

# Compute SHA3-256 hash
HASH=$(echo -n "$CANONICAL" | openssl dgst -sha3-256 -binary | xxd -p -c 256)
echo "SHA3-256 Hash: $HASH"
echo

# Extract raw secret key to temp file for signing
echo "$SK_B64" | base64 -d > /tmp/sk.bin

# Extract hash bytes to temp file
echo -n "$CANONICAL" | openssl dgst -sha3-256 -binary > /tmp/hash.bin

# Try to sign using the PQC binary if available
echo "Attempting to sign with PQC binary..."
PQC_SIGN_BIN=""
for candidate in \
  "../../target/release/sign" \
  "../../target/debug/sign" \
  "../pqc-crypto/target/release/sign" \
  "../pqc-crypto/target/debug/sign"; do
  if [ -f "$candidate" ]; then
    PQC_SIGN_BIN="$candidate"
    break
  fi
done

if [ -n "$PQC_SIGN_BIN" ]; then
  echo "Found PQC binary: $PQC_SIGN_BIN"
  
  # Sign the hash
  SIG_HEX=$("$PQC_SIGN_BIN" /tmp/sk.bin /tmp/hash.bin)
  echo "Signature (hex): ${SIG_HEX:0:80}..."
  
  # Convert to base64
  SIG_B64=$(echo -n "$SIG_HEX" | xxd -r -p | base64)
  echo "Signature (base64): ${SIG_B64:0:60}..."
  echo "Signature Length: $(echo -n "$SIG_B64" | base64 -d 2>/dev/null | wc -c || echo "N/A")"
  echo
  
  # Create signed transaction
  cat > /tmp/signed_tx.json <<EOF
{
  "tx": $(cat /tmp/test_tx.json),
  "public_key": "$PK_B64",
  "signature": "$SIG_B64",
  "algorithm": "dilithium5",
  "version": 1
}
EOF
  
  echo "Signed transaction:"
  cat /tmp/signed_tx.json | jq .
  echo
  
  # Submit to node
  echo "Submitting manually crafted transaction to node..."
  SUBMIT_RESPONSE=$(curl -s -X POST "$NODE_URL/api/tx" \
    -H "Content-Type: application/json" \
    -d @/tmp/signed_tx.json)
  
  echo "Node response:"
  echo "$SUBMIT_RESPONSE" | jq .
  echo
  
  if echo "$SUBMIT_RESPONSE" | jq -e '.error' > /dev/null; then
    echo -e "${RED}❌ Transaction failed with error${NC}"
  else
    echo -e "${GREEN}✅ Transaction succeeded!${NC}"
  fi
else
  echo -e "${YELLOW}⚠ PQC binary not found, skipping manual signing test${NC}"
  echo "Build it with: cd ../pqc-crypto && cargo build --release --bin pqc-sign"
fi

echo
echo "🔍 Summary"
echo "=========="
echo "- Wallet address: $WALLET_ADDR"
echo "- Chain ID: $CHAIN_ID"
echo "- Nonce: $NONCE"
echo "- Public key length: $(echo -n "$PK_B64" | base64 -d 2>/dev/null | wc -c || echo "N/A") bytes"
echo "- Algorithm: dilithium5"
echo

# Cleanup
rm -f /tmp/test_tx.json /tmp/signed_tx.json /tmp/sk.bin /tmp/hash.bin

echo -e "${BLUE}Debug session complete${NC}"
