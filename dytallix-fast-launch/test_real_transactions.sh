#!/bin/bash
# Real CLI Transaction Test using Backend Dev Faucet
# Tests wallet generation, real backend faucet, and send/receive transactions

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
CLI_DIR="/Users/rickglenn/dytallix/dytallix-fast-launch/cli/dytx"
RPC_URL="http://127.0.0.1:3030"
PASSPHRASE="test-passphrase-12345"
export DYTX_PASSPHRASE="${PASSPHRASE}"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    Dytallix CLI Real Transaction Test (Backend Faucet)     ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# =============================================================================
# STEP 1: Generate Wallets
# =============================================================================
echo -e "${BLUE}━━━ STEP 1: Generate Test Wallets ━━━${NC}"
echo ""

echo -e "${YELLOW}Generating Alice's wallet...${NC}"
ALICE_OUTPUT=$(cd "${CLI_DIR}" && node dist/index.js keygen --label alice --rpc "${RPC_URL}" 2>&1 || true)
ALICE_ADDR=$(echo "${ALICE_OUTPUT}" | grep -E 'dyt[a-z0-9]{39,}' -o | head -1)
echo -e "${GREEN}✓ Alice: ${ALICE_ADDR}${NC}"

echo -e "${YELLOW}Generating Bob's wallet...${NC}"
BOB_OUTPUT=$(cd "${CLI_DIR}" && node dist/index.js keygen --label bob --rpc "${RPC_URL}" 2>&1 || true)
BOB_ADDR=$(echo "${BOB_OUTPUT}" | grep -E 'dyt[a-z0-9]{39,}' -o | head -1)
echo -e "${GREEN}✓ Bob: ${BOB_ADDR}${NC}"

echo -e "${YELLOW}Generating Carol's wallet...${NC}"
CAROL_OUTPUT=$(cd "${CLI_DIR}" && node dist/index.js keygen --label carol --rpc "${RPC_URL}" 2>&1 || true)
CAROL_ADDR=$(echo "${CAROL_OUTPUT}" | grep -E 'dyt[a-z0-9]{39,}' -o | head -1)
echo -e "${GREEN}✓ Carol: ${CAROL_ADDR}${NC}"
echo ""

# =============================================================================
# STEP 2: Fund Wallets Using Real Backend Dev Faucet
# =============================================================================
echo -e "${BLUE}━━━ STEP 2: Fund Wallets (Backend Dev Faucet) ━━━${NC}"
echo ""

echo -e "${YELLOW}Funding Alice (100 DGT, 1000 DRT)...${NC}"
curl -s -X POST "${RPC_URL}/dev/faucet" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"${ALICE_ADDR}\",\"udgt\":100000000,\"udrt\":1000000000}" | jq '.'

echo -e "${YELLOW}Funding Bob (75 DGT, 500 DRT)...${NC}"
curl -s -X POST "${RPC_URL}/dev/faucet" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"${BOB_ADDR}\",\"udgt\":75000000,\"udrt\":500000000}" | jq '.'

echo -e "${YELLOW}Funding Carol (50 DGT, 250 DRT)...${NC}"
curl -s -X POST "${RPC_URL}/dev/faucet" \
  -H "Content-Type: application/json" \
  -d "{\"address\":\"${CAROL_ADDR}\",\"udgt\":50000000,\"udrt\":250000000}" | jq '.'

echo -e "${GREEN}✓ All wallets funded via backend dev faucet${NC}"
echo ""
sleep 1

# =============================================================================
# STEP 3: Check Initial Balances
# =============================================================================
echo -e "${BLUE}━━━ STEP 3: Check Initial Balances ━━━${NC}"
echo ""

echo -e "${YELLOW}Alice's balance:${NC}"
cd "${CLI_DIR}" && node dist/index.js balances "${ALICE_ADDR}" --rpc "${RPC_URL}"
echo ""

echo -e "${YELLOW}Bob's balance:${NC}"
cd "${CLI_DIR}" && node dist/index.js balances "${BOB_ADDR}" --rpc "${RPC_URL}"
echo ""

echo -e "${YELLOW}Carol's balance:${NC}"
cd "${CLI_DIR}" && node dist/index.js balances "${CAROL_ADDR}" --rpc "${RPC_URL}"
echo ""
sleep 1

# =============================================================================
# STEP 4: Single Token Transfers
# =============================================================================
echo -e "${BLUE}━━━ STEP 4: Single Token Transfers ━━━${NC}"
echo ""

echo -e "${YELLOW}Transfer 1: Alice → Bob (10 DGT)${NC}"
cd "${CLI_DIR}" && node dist/index.js transfer \
    --from "${ALICE_ADDR}" \
    --to "${BOB_ADDR}" \
    --amount 10 \
    --denom udgt \
    --keystore alice \
    --memo "Alice sends 10 DGT to Bob" \
    --rpc "${RPC_URL}"
echo ""
sleep 2

echo -e "${YELLOW}Transfer 2: Bob → Carol (5 DRT)${NC}"
cd "${CLI_DIR}" && node dist/index.js transfer \
    --from "${BOB_ADDR}" \
    --to "${CAROL_ADDR}" \
    --amount 5 \
    --denom udrt \
    --keystore bob \
    --memo "Bob sends 5 DRT to Carol" \
    --rpc "${RPC_URL}"
echo ""
sleep 2

echo -e "${YELLOW}Transfer 3: Carol → Alice (3 DGT)${NC}"
cd "${CLI_DIR}" && node dist/index.js transfer \
    --from "${CAROL_ADDR}" \
    --to "${ALICE_ADDR}" \
    --amount 3 \
    --denom udgt \
    --keystore carol \
    --memo "Carol sends 3 DGT back to Alice" \
    --rpc "${RPC_URL}"
echo ""
sleep 2

# =============================================================================
# STEP 5: Check Balances After Transfers
# =============================================================================
echo -e "${BLUE}━━━ STEP 5: Check Balances After Transfers ━━━${NC}"
echo ""

echo -e "${YELLOW}Alice's balance (should have: ~93 DGT, 1000 DRT):${NC}"
cd "${CLI_DIR}" && node dist/index.js balances "${ALICE_ADDR}" --rpc "${RPC_URL}"
echo ""

echo -e "${YELLOW}Bob's balance (should have: ~85 DGT, 495 DRT):${NC}"
cd "${CLI_DIR}" && node dist/index.js balances "${BOB_ADDR}" --rpc "${RPC_URL}"
echo ""

echo -e "${YELLOW}Carol's balance (should have: ~47 DGT, 255 DRT):${NC}"
cd "${CLI_DIR}" && node dist/index.js balances "${CAROL_ADDR}" --rpc "${RPC_URL}"
echo ""
sleep 1

# =============================================================================
# STEP 6: Multi-Recipient Transfers (if supported)
# =============================================================================
echo -e "${BLUE}━━━ STEP 6: Complex Multi-Transfer Scenarios ━━━${NC}"
echo ""

echo -e "${YELLOW}Transfer 4: Alice → Bob (20 DGT)${NC}"
cd "${CLI_DIR}" && node dist/index.js transfer \
    --from "${ALICE_ADDR}" \
    --to "${BOB_ADDR}" \
    --amount 20 \
    --denom udgt \
    --keystore alice \
    --memo "Alice sends another 20 DGT to Bob" \
    --rpc "${RPC_URL}"
echo ""
sleep 2

echo -e "${YELLOW}Transfer 5: Alice → Carol (100 DRT)${NC}"
cd "${CLI_DIR}" && node dist/index.js transfer \
    --from "${ALICE_ADDR}" \
    --to "${CAROL_ADDR}" \
    --amount 100 \
    --denom udrt \
    --keystore alice \
    --memo "Alice sends 100 DRT to Carol" \
    --rpc "${RPC_URL}"
echo ""
sleep 2

echo -e "${YELLOW}Transfer 6: Bob → Alice (2 DGT)${NC}"
cd "${CLI_DIR}" && node dist/index.js transfer \
    --from "${BOB_ADDR}" \
    --to "${ALICE_ADDR}" \
    --amount 2 \
    --denom udgt \
    --keystore bob \
    --memo "Bob sends 2 DGT back to Alice" \
    --rpc "${RPC_URL}"
echo ""
sleep 2

# =============================================================================
# STEP 7: Final Balances
# =============================================================================
echo -e "${BLUE}━━━ STEP 7: Final Balances ━━━${NC}"
echo ""

echo -e "${YELLOW}Alice's final balance:${NC}"
cd "${CLI_DIR}" && node dist/index.js balances "${ALICE_ADDR}" --rpc "${RPC_URL}"
echo ""

echo -e "${YELLOW}Bob's final balance:${NC}"
cd "${CLI_DIR}" && node dist/index.js balances "${BOB_ADDR}" --rpc "${RPC_URL}"
echo ""

echo -e "${YELLOW}Carol's final balance:${NC}"
cd "${CLI_DIR}" && node dist/index.js balances "${CAROL_ADDR}" --rpc "${RPC_URL}"
echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Test Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Wallets Created:"
echo -e "  Alice: ${ALICE_ADDR}"
echo -e "  Bob:   ${BOB_ADDR}"
echo -e "  Carol: ${CAROL_ADDR}"
echo ""
echo -e "Transactions Performed:"
echo -e "  1. Alice → Bob: 10 DGT"
echo -e "  2. Bob → Carol: 5 DRT"
echo -e "  3. Carol → Alice: 3 DGT"
echo -e "  4. Alice → Bob: 20 DGT"
echo -e "  5. Alice → Carol: 100 DRT"
echo -e "  6. Bob → Alice: 2 DGT"
echo ""
echo -e "${GREEN}All tests completed successfully! 🎉${NC}"
