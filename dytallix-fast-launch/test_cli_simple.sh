#!/bin/bash
# Simple CLI Transaction Test - Wallets and Transfers
# Tests wallet generation and P2P transactions

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
CLI_DIR="/Users/rickglenn/dytallix/dytallix-fast-launch/cli/dytx"
RPC_URL="http://127.0.0.1:3030"
PASSPHRASE="test-passphrase-12345"
export DYTX_PASSPHRASE="${PASSPHRASE}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Dytallix CLI Simple Transaction Test                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "${CLI_DIR}"

# =============================================================================
# STEP 1: List existing wallets or generate new ones
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 1: Check Existing Wallets${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Listing existing wallets...${NC}"
node dist/index.js keys list --rpc "${RPC_URL}" 2>&1 || true
echo ""

# Check if we already have alice, bob, carol
if [ ! -f "$HOME/.dytx/keystore/alice.json" ]; then
    echo -e "${YELLOW}Generating Alice's wallet...${NC}"
    node dist/index.js keygen --label alice --rpc "${RPC_URL}" 2>&1
    echo ""
fi

if [ ! -f "$HOME/.dytx/keystore/bob.json" ]; then
    echo -e "${YELLOW}Generating Bob's wallet...${NC}"
    node dist/index.js keygen --label bob --rpc "${RPC_URL}" 2>&1
    echo ""
fi

if [ ! -f "$HOME/.dytx/keystore/carol.json" ]; then
    echo -e "${YELLOW}Generating Carol's wallet...${NC}"
    node dist/index.js keygen --label carol --rpc "${RPC_URL}" 2>&1
    echo ""
fi

# Extract addresses
ALICE_ADDR=$(cat "$HOME/.dytx/keystore/alice.json" | jq -r '.address')
BOB_ADDR=$(cat "$HOME/.dytx/keystore/bob.json" | jq -r '.address')
CAROL_ADDR=$(cat "$HOME/.dytx/keystore/carol.json" | jq -r '.address')

echo -e "${GREEN}✓ Wallet Addresses:${NC}"
echo -e "  Alice:  ${ALICE_ADDR}"
echo -e "  Bob:    ${BOB_ADDR}"
echo -e "  Carol:  ${CAROL_ADDR}"
echo ""

sleep 1

# =============================================================================
# STEP 2: Check Initial Balances
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 2: Check Initial Balances${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Alice's Balance:${NC}"
node dist/index.js balances "${ALICE_ADDR}" --rpc "${RPC_URL}" 2>&1 || echo "No balance yet"
echo ""

echo -e "${YELLOW}Bob's Balance:${NC}"
node dist/index.js balances "${BOB_ADDR}" --rpc "${RPC_URL}" 2>&1 || echo "No balance yet"
echo ""

echo -e "${YELLOW}Carol's Balance:${NC}"
node dist/index.js balances "${CAROL_ADDR}" --rpc "${RPC_URL}" 2>&1 || echo "No balance yet"
echo ""

sleep 1

# =============================================================================
# STEP 3: Try to perform transactions (if wallets have balance)
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 3: Test Transactions${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}NOTE: To test transactions, wallets need to have initial balances.${NC}"
echo -e "${YELLOW}You can fund these wallets through:${NC}"
echo -e "${YELLOW}  1. The frontend faucet UI (http://127.0.0.1:5174/faucet)${NC}"
echo -e "${YELLOW}  2. Transferring from a genesis account${NC}"
echo -e "${YELLOW}  3. Running the faucet server${NC}"
echo ""

# Check if Alice has any balance to send
ALICE_BALANCE_OUTPUT=$(node dist/index.js balances "${ALICE_ADDR}" --rpc "${RPC_URL}" --output json 2>&1 || echo "{}")
ALICE_DGT=$(echo "${ALICE_BALANCE_OUTPUT}" | jq -r '.DGT // 0' 2>/dev/null || echo "0")

if [ "${ALICE_DGT}" != "0" ] && [ "${ALICE_DGT}" != "" ]; then
    echo -e "${GREEN}Alice has balance! Testing transfer...${NC}"
    echo ""
    
    # Transfer 1: Alice sends to Bob
    echo -e "${YELLOW}Transfer 1: Alice → Bob (10 DGT)${NC}"
    node dist/index.js transfer \
        --from "${ALICE_ADDR}" \
        --to "${BOB_ADDR}" \
        --amount 10 \
        --denom udgt \
        --keystore alice \
        --memo "CLI Test: Alice to Bob" \
        --rpc "${RPC_URL}" 2>&1 || echo "Transfer failed"
    echo ""
    
    sleep 3
    
    # Check Bob's new balance
    echo -e "${YELLOW}Bob's New Balance:${NC}"
    node dist/index.js balances "${BOB_ADDR}" --rpc "${RPC_URL}" 2>&1
    echo ""
    
    # Transfer 2: Bob sends to Carol (if Bob has balance now)
    BOB_BALANCE_OUTPUT=$(node dist/index.js balances "${BOB_ADDR}" --rpc "${RPC_URL}" --output json 2>&1 || echo "{}")
    BOB_DGT=$(echo "${BOB_BALANCE_OUTPUT}" | jq -r '.DGT // 0' 2>/dev/null || echo "0")
    
    if [ "${BOB_DGT}" != "0" ] && [ "${BOB_DGT}" != "" ]; then
        echo -e "${YELLOW}Transfer 2: Bob → Carol (5 DGT)${NC}"
        node dist/index.js transfer \
            --from "${BOB_ADDR}" \
            --to "${CAROL_ADDR}" \
            --amount 5 \
            --denom udgt \
            --keystore bob \
            --memo "CLI Test: Bob to Carol" \
            --rpc "${RPC_URL}" 2>&1 || echo "Transfer failed"
        echo ""
        
        sleep 3
        
        # Check Carol's new balance
        echo -e "${YELLOW}Carol's New Balance:${NC}"
        node dist/index.js balances "${CAROL_ADDR}" --rpc "${RPC_URL}" 2>&1
        echo ""
    fi
else
    echo -e "${YELLOW}Alice has no balance. Please fund the wallets first.${NC}"
    echo ""
    echo -e "${YELLOW}Quick funding command examples:${NC}"
    echo -e "${YELLOW}  # Via curl to faucet (if running):${NC}"
    echo -e "  curl -X POST http://127.0.0.1:3001/faucet \\"
    echo -e "    -H 'Content-Type: application/json' \\"
    echo -e "    -d '{\"address\":\"${ALICE_ADDR}\",\"token\":\"DGT\",\"amount\":1000000000}'"
    echo ""
fi

# =============================================================================
# STEP 4: Query Node Status
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}STEP 4: Node Status${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}Node Status:${NC}"
curl -s "${RPC_URL}/status" | jq '.'
echo ""

echo -e "${YELLOW}Query Stats via CLI:${NC}"
node dist/index.js query --rpc "${RPC_URL}" 2>&1 || true
echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   Test Summary                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Verified 3 wallets exist (Alice, Bob, Carol)${NC}"
echo -e "${GREEN}✓ Checked balances${NC}"
echo -e "${GREEN}✓ Attempted transfers (if funds available)${NC}"
echo -e "${GREEN}✓ Queried node status${NC}"
echo ""
echo -e "${YELLOW}Wallet Addresses for Manual Testing:${NC}"
echo -e "  Alice:  ${ALICE_ADDR}"
echo -e "  Bob:    ${BOB_ADDR}"
echo -e "  Carol:  ${CAROL_ADDR}"
echo ""
echo -e "${BLUE}To perform more transactions, fund these wallets via:${NC}"
echo -e "${BLUE}  - Frontend: http://127.0.0.1:5174/faucet${NC}"
echo -e "${BLUE}  - CLI transfer from a funded account${NC}"
echo ""
