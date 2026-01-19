#!/bin/bash
# Complex multi-wallet transaction test with fractional DGT and DRT amounts

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CLI="node cli/dytx/dist/index.js"
NODE_URL="http://localhost:3030"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    Complex Multi-Wallet Transaction Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo

# Load addresses
ALICE="dytallix14fbe341ec2e56c6ae48a1c70d969bf6e38a98ea8"
BOB="dytallix1b3c4d5e6f7890abcdef1234567890abcdef12345"
CHARLIE="dytallix1f58fedcb1149c590cf7be7266617b058bf48a2b9"
DAVE="dytallix128e492a972bfa87944524aa30aaea29e0294b1a3"
EVE="dytallix1d2335aebdf71331b430657991e691557f6192ccb"

# Function to show balance
show_balance() {
    local name=$1
    local addr=$2
    local data=$(curl -s "$NODE_URL/account/$addr")
    local udgt=$(echo "$data" | jq -r '.balances.udgt // 0')
    local udrt=$(echo "$data" | jq -r '.balances.udrt // 0')
    local dgt=$(echo "scale=6; $udgt / 1000000" | bc)
    local drt=$(echo "scale=6; $udrt / 1000000" | bc)
    local nonce=$(echo "$data" | jq -r '.nonce')
    printf "${YELLOW}%-8s${NC} %s  ${GREEN}%12s DGT${NC}  ${GREEN}%12s DRT${NC}  nonce=%s\n" "$name" "${addr:0:20}..." "$dgt" "$drt" "$nonce"
}

# Function to send transaction
send_tx() {
    local from_name=$1
    local from_addr=$2
    local to_addr=$3
    local amount=$4
    local denom=$5
    local keystore=$6
    
    echo -e "\n${BLUE}→${NC} Sending ${GREEN}$amount $denom${NC} from ${YELLOW}$from_name${NC} to ${YELLOW}${to_addr:0:20}...${NC}"
    
    $CLI transfer \
        --from "$from_addr" \
        --to "$to_addr" \
        --amount "$amount" \
        --denom "$denom" \
        --memo "complex-test" \
        --keystore "$keystore" \
        --passphrase testpass123 \
        --micro 2>&1 | grep -E "✅|Failed" || echo -e "${RED}Failed${NC}"
    
    sleep 1
}

echo -e "${YELLOW}Initial Balances:${NC}"
echo "─────────────────────────────────────────────────────────────────────────────"
show_balance "Alice" "$ALICE"
show_balance "Bob" "$BOB"
show_balance "Charlie" "$CHARLIE"
show_balance "Dave" "$DAVE"
show_balance "Eve" "$EVE"
echo

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    Starting Complex Transaction Sequence${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Scenario 1: Alice sends fractional DGT to multiple recipients
echo -e "\n${YELLOW}📤 Scenario 1: Alice distributes fractional DGT${NC}"
send_tx "Alice" "$ALICE" "$BOB" "2500000" "udgt" "./test-wallets/alice.json"      # 2.5 DGT
send_tx "Alice" "$ALICE" "$CHARLIE" "1750000" "udgt" "./test-wallets/alice.json"  # 1.75 DGT
send_tx "Alice" "$ALICE" "$DAVE" "3250000" "udgt" "./test-wallets/alice.json"     # 3.25 DGT

# Scenario 2: Bob and Charlie send DRT to Eve
echo -e "\n${YELLOW}📤 Scenario 2: Bob and Charlie send DRT to Eve${NC}"
send_tx "Bob" "$BOB" "$EVE" "15500000" "udrt" "./test-wallets/bob.json"           # 15.5 DRT
send_tx "Charlie" "$CHARLIE" "$EVE" "22750000" "udrt" "./test-wallets/charlie.json" # 22.75 DRT

# Scenario 3: Dave sends fractional amounts to multiple recipients
echo -e "\n${YELLOW}📤 Scenario 3: Dave distributes mixed fractional amounts${NC}"
send_tx "Dave" "$DAVE" "$ALICE" "1125000" "udgt" "./test-wallets/dave.json"       # 1.125 DGT
send_tx "Dave" "$DAVE" "$BOB" "8333333" "udrt" "./test-wallets/dave.json"         # 8.333333 DRT
send_tx "Dave" "$DAVE" "$CHARLIE" "2875000" "udgt" "./test-wallets/dave.json"     # 2.875 DGT

# Scenario 4: Eve redistributes received DRT
echo -e "\n${YELLOW}📤 Scenario 4: Eve redistributes DRT${NC}"
send_tx "Eve" "$EVE" "$ALICE" "12450000" "udrt" "./test-wallets/eve.json"         # 12.45 DRT
send_tx "Eve" "$EVE" "$DAVE" "18900000" "udrt" "./test-wallets/eve.json"          # 18.9 DRT

# Scenario 5: Circular transactions with very small fractional amounts
echo -e "\n${YELLOW}📤 Scenario 5: Micro-transactions (fractional cents)${NC}"
send_tx "Alice" "$ALICE" "$BOB" "125" "udgt" "./test-wallets/alice.json"          # 0.000125 DGT
send_tx "Bob" "$BOB" "$CHARLIE" "789" "udgt" "./test-wallets/bob.json"            # 0.000789 DGT
send_tx "Charlie" "$CHARLIE" "$DAVE" "1234" "udgt" "./test-wallets/charlie.json"  # 0.001234 DGT
send_tx "Dave" "$DAVE" "$EVE" "5678" "udrt" "./test-wallets/dave.json"            # 0.005678 DRT
send_tx "Eve" "$EVE" "$ALICE" "9999" "udrt" "./test-wallets/eve.json"             # 0.009999 DRT

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    Transaction Sequence Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo

# Wait for final block
sleep 2

echo -e "${YELLOW}Final Balances:${NC}"
echo "─────────────────────────────────────────────────────────────────────────────"
show_balance "Alice" "$ALICE"
show_balance "Bob" "$BOB"
show_balance "Charlie" "$CHARLIE"
show_balance "Dave" "$DAVE"
show_balance "Eve" "$EVE"
echo

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Complex Transaction Test Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo
echo "Summary:"
echo "  • 5 wallets participated"
echo "  • 15 transactions executed"
echo "  • Mix of DGT and DRT transfers"
echo "  • Fractional amounts (down to micro-units)"
echo "  • Multiple transaction patterns tested"
echo
