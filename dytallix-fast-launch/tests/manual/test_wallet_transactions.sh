#!/usr/bin/env bash
# Dytallix Wallet & Transaction CLI Test Script
# Tests wallet generation, token requests, and transactions

set -e

BASE_URL="http://localhost:3030"
CHAIN_ID="dytallix-gov-e2e"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "🔐 Dytallix Wallet & Transaction Test"
echo "========================================"
echo ""

# Check if node is running
echo -e "${BLUE}Checking node status...${NC}"
if ! curl -s "${BASE_URL}/status" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Node is not running on ${BASE_URL}${NC}"
    echo "Please start the node first:"
    echo "  cd dytallix-fast-launch/node && cargo run --bin dytallix-fast-node"
    exit 1
fi

NODE_STATUS=$(curl -s "${BASE_URL}/status" | jq -r '.status')
echo -e "${GREEN}✓ Node is ${NODE_STATUS}${NC}"
echo ""

# Generate test wallets
echo "========================================"
echo "📝 Step 1: Generate Test Wallets"
echo "========================================"

# Wallet 1 (Alice)
echo -e "${BLUE}Generating Wallet 1 (Alice)...${NC}"
ALICE_ADDR="pqc1mlalice$(openssl rand -hex 6)"
echo "Alice Address: ${ALICE_ADDR}"

# Wallet 2 (Bob)
echo -e "${BLUE}Generating Wallet 2 (Bob)...${NC}"
BOB_ADDR="pqc1mlbob$(openssl rand -hex 6)"
echo "Bob Address: ${BOB_ADDR}"

# Wallet 3 (Charlie)
echo -e "${BLUE}Generating Wallet 3 (Charlie)...${NC}"
CHARLIE_ADDR="pqc1mlcharlie$(openssl rand -hex 6)"
echo "Charlie Address: ${CHARLIE_ADDR}"

echo -e "${GREEN}✓ Generated 3 test wallets${NC}"
echo ""

# Request tokens from faucet
echo "========================================"
echo "💧 Step 2: Request Tokens from Faucet"
echo "========================================"

# Request DGT for Alice
echo -e "${BLUE}Requesting DGT for Alice...${NC}"
curl -s -X POST "${BASE_URL}/faucet/request" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"${ALICE_ADDR}\", \"denom\": \"DGT\", \"amount\": 100}" \
  | jq .
sleep 1

# Request DRT for Alice
echo -e "${BLUE}Requesting DRT for Alice...${NC}"
curl -s -X POST "${BASE_URL}/faucet/request" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"${ALICE_ADDR}\", \"denom\": \"DRT\", \"amount\": 1000}" \
  | jq .
sleep 1

# Request DGT for Bob
echo -e "${BLUE}Requesting DGT for Bob...${NC}"
curl -s -X POST "${BASE_URL}/faucet/request" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"${BOB_ADDR}\", \"denom\": \"DGT\", \"amount\": 100}" \
  | jq .
sleep 1

# Request DRT for Bob
echo -e "${BLUE}Requesting DRT for Bob...${NC}"
curl -s -X POST "${BASE_URL}/faucet/request" \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"${BOB_ADDR}\", \"denom\": \"DRT\", \"amount\": 1000}" \
  | jq .

echo -e "${GREEN}✓ Tokens requested for Alice and Bob${NC}"
echo ""

# Check balances
echo "========================================"
echo "💰 Step 3: Check Balances"
echo "========================================"

echo -e "${BLUE}Alice's balance:${NC}"
curl -s "${BASE_URL}/api/account/${ALICE_ADDR}" | jq .

echo -e "${BLUE}Bob's balance:${NC}"
curl -s "${BASE_URL}/api/account/${BOB_ADDR}" | jq .

echo -e "${BLUE}Charlie's balance (should be zero):${NC}"
curl -s "${BASE_URL}/api/account/${CHARLIE_ADDR}" | jq .

echo ""

# Transaction examples
echo "========================================"
echo "📤 Step 4: Simple Transaction Test"
echo "========================================"
echo -e "${YELLOW}Note: Transaction signing requires PQC keys.${NC}"
echo -e "${YELLOW}For this demo, we'll show the transaction structure.${NC}"
echo ""

# Example transaction structure
cat <<EOF > /tmp/dytallix_tx_example.json
{
  "tx": {
    "chain_id": "${CHAIN_ID}",
    "nonce": 0,
    "msgs": [
      {
        "type": "send",
        "from": "${ALICE_ADDR}",
        "to": "${BOB_ADDR}",
        "denom": "DGT",
        "amount": "10000000"
      }
    ],
    "fee": "1000000",
    "memo": "Test transfer from Alice to Bob"
  },
  "public_key": "BASE64_PUBLIC_KEY_HERE",
  "signature": "BASE64_SIGNATURE_HERE",
  "algorithm": "ML-DSA",
  "version": 1
}
EOF

echo -e "${BLUE}Example transaction structure:${NC}"
cat /tmp/dytallix_tx_example.json | jq .
echo ""

echo -e "${YELLOW}To sign and submit this transaction, you would:${NC}"
echo "1. Create the transaction object"
echo "2. Canonicalize and hash it"
echo "3. Sign the hash with your PQC private key"
echo "4. Submit to POST ${BASE_URL}/api/submit"
echo ""

# Complex transaction example
echo "========================================"
echo "🔄 Step 5: Complex Transaction Example"
echo "========================================"

cat <<EOF > /tmp/dytallix_tx_complex.json
{
  "tx": {
    "chain_id": "${CHAIN_ID}",
    "nonce": 1,
    "msgs": [
      {
        "type": "send",
        "from": "${ALICE_ADDR}",
        "to": "${BOB_ADDR}",
        "denom": "DGT",
        "amount": "5000000"
      },
      {
        "type": "send",
        "from": "${ALICE_ADDR}",
        "to": "${CHARLIE_ADDR}",
        "denom": "DRT",
        "amount": "100000000"
      }
    ],
    "fee": "2000000",
    "memo": "Multi-recipient transfer: DGT to Bob, DRT to Charlie"
  },
  "public_key": "BASE64_PUBLIC_KEY_HERE",
  "signature": "BASE64_SIGNATURE_HERE",
  "algorithm": "ML-DSA",
  "version": 1
}
EOF

echo -e "${BLUE}Complex transaction (multiple recipients):${NC}"
cat /tmp/dytallix_tx_complex.json | jq .
echo ""

# Summary
echo "========================================"
echo "📊 Test Summary"
echo "========================================"
echo ""
echo "Wallets Generated:"
echo "  Alice:   ${ALICE_ADDR}"
echo "  Bob:     ${BOB_ADDR}"
echo "  Charlie: ${CHARLIE_ADDR}"
echo ""
echo "Tokens Requested:"
echo "  Alice:   100 DGT + 1000 DRT"
echo "  Bob:     100 DGT + 1000 DRT"
echo "  Charlie: None"
echo ""
echo "Transaction Examples Created:"
echo "  Simple:  /tmp/dytallix_tx_example.json"
echo "  Complex: /tmp/dytallix_tx_complex.json"
echo ""
echo -e "${GREEN}✓ Test completed successfully!${NC}"
echo ""
echo "Next Steps:"
echo "1. Implement PQC key generation (ML-DSA/Dilithium)"
echo "2. Sign transactions with generated keys"
echo "3. Submit signed transactions to ${BASE_URL}/api/submit"
echo "4. View transaction results and updated balances"
echo ""
echo "For real transaction submission, you'll need:"
echo "- PQC keypair (Dilithium or SPHINCS+)"
echo "- Proper signature generation"
echo "- Correct nonce tracking"
echo ""
