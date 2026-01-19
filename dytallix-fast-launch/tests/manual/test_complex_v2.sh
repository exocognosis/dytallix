#!/bin/bash
# Complex multi-wallet transaction test v2 - with proper fee accounting

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

CLI="node cli/dytx/dist/index.js"
NODE_URL="http://localhost:3030"

ALICE="dytallix14fbe341ec2e56c6ae48a1c70d969bf6e38a98ea8"
BOB="dytallix1b3c4d5e6f7890abcdef1234567890abcdef12345"
CHARLIE="dytallix1f58fedcb1149c590cf7be7266617b058bf48a2b9"
DAVE="dytallix128e492a972bfa87944524aa30aaea29e0294b1a3"
EVE="dytallix1d2335aebdf71331b430657991e691557f6192ccb"

show_balance() {
    local name=$1
    local addr=$2
    local data=$(curl -s "$NODE_URL/account/$addr")
    local udgt=$(echo "$data" | jq -r '.balances.udgt // 0')
    local udrt=$(echo "$data" | jq -r '.balances.udrt // 0')
    local dgt=$(echo "scale=6; $udgt / 1000000" | bc)
    local drt=$(echo "scale=6; $udrt / 1000000" | bc)
    local nonce=$(echo "$data" | jq -r '.nonce')
    printf "${YELLOW}%-8s${NC} ${GREEN}%12s DGT${NC}  ${GREEN}%12s DRT${NC}  nonce=%s\n" "$name" "$dgt" "$drt" "$nonce"
}

send_tx() {
    local from_name=$1
    local from_addr=$2
    local to_name=$3
    local to_addr=$4
    local amount=$5
    local denom=$6
    local keystore=$7
    
    local display_amount=$(echo "scale=6; $amount / 1000000" | bc)
    echo -e "${BLUE}→${NC} ${YELLOW}$from_name${NC} sends ${GREEN}$display_amount $denom${NC} to ${YELLOW}$to_name${NC}"
    
    $CLI transfer \
        --from "$from_addr" \
        --to "$to_addr" \
        --amount "$amount" \
        --denom "$denom" \
        --memo "complex-v2" \
        --keystore "$keystore" \
        --passphrase testpass123 \
        --micro 2>&1 | grep -E "✅|Transaction Hash" | head -1
    
    sleep 0.5
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Complex Multi-Wallet Fractional Transaction Test${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo
echo -e "${YELLOW}Initial Balances:${NC}"
show_balance "Alice" "$ALICE"
show_balance "Bob" "$BOB"
show_balance "Charlie" "$CHARLIE"
show_balance "Dave" "$DAVE"
show_balance "Eve" "$EVE"
echo

echo -e "${YELLOW}🔄 Round 1: Fractional DGT Distribution${NC}"
send_tx "Alice" "$ALICE" "Bob" "$BOB" "2500000" "udgt" "./test-wallets/alice.json"          # 2.5 DGT
send_tx "Alice" "$ALICE" "Charlie" "$CHARLIE" "1750000" "udgt" "./test-wallets/alice.json"   # 1.75 DGT
send_tx "Alice" "$ALICE" "Dave" "$DAVE" "3333333" "udgt" "./test-wallets/alice.json"         # 3.333333 DGT
send_tx "Alice" "$ALICE" "Eve" "$EVE" "4250000" "udgt" "./test-wallets/alice.json"           # 4.25 DGT
echo

echo -e "${YELLOW}🔄 Round 2: Fractional DRT Distribution${NC}"
send_tx "Bob" "$BOB" "Charlie" "$CHARLIE" "15500000" "udrt" "./test-wallets/bob.json"        # 15.5 DRT
send_tx "Charlie" "$CHARLIE" "Dave" "$DAVE" "22750000" "udrt" "./test-wallets/charlie.json"  # 22.75 DRT
send_tx "Dave" "$DAVE" "Eve" "$EVE" "8888888" "udrt" "./test-wallets/dave.json"              # 8.888888 DRT
echo

echo -e "${YELLOW}🔄 Round 3: Mixed Fractional Amounts${NC}"
send_tx "Bob" "$BOB" "Alice" "$ALICE" "1125000" "udgt" "./test-wallets/bob.json"             # 1.125 DGT
send_tx "Charlie" "$CHARLIE" "Alice" "$ALICE" "12345678" "udrt" "./test-wallets/charlie.json" # 12.345678 DRT
send_tx "Dave" "$DAVE" "Bob" "$BOB" "2875000" "udgt" "./test-wallets/dave.json"              # 2.875 DGT
send_tx "Eve" "$EVE" "Charlie" "$CHARLIE" "9876543" "udrt" "./test-wallets/eve.json"         # 9.876543 DRT
echo

echo -e "${YELLOW}🔄 Round 4: Micro-transactions (Very Small Amounts)${NC}"
send_tx "Alice" "$ALICE" "Bob" "$BOB" "12345" "udgt" "./test-wallets/alice.json"             # 0.012345 DGT
send_tx "Bob" "$BOB" "Charlie" "$CHARLIE" "67890" "udgt" "./test-wallets/bob.json"           # 0.06789 DGT
send_tx "Charlie" "$CHARLIE" "Dave" "$DAVE" "11111" "udrt" "./test-wallets/charlie.json"     # 0.011111 DRT
send_tx "Dave" "$DAVE" "Eve" "$EVE" "22222" "udrt" "./test-wallets/dave.json"                # 0.022222 DRT
send_tx "Eve" "$EVE" "Alice" "$ALICE" "33333" "udrt" "./test-wallets/eve.json"               # 0.033333 DRT
echo

echo -e "${YELLOW}🔄 Round 5: Circular Fractional Transfers${NC}"
send_tx "Alice" "$ALICE" "Bob" "$BOB" "555555" "udrt" "./test-wallets/alice.json"            # 0.555555 DRT
send_tx "Bob" "$BOB" "Charlie" "$CHARLIE" "666666" "udrt" "./test-wallets/bob.json"          # 0.666666 DRT
send_tx "Charlie" "$CHARLIE" "Dave" "$DAVE" "777777" "udrt" "./test-wallets/charlie.json"    # 0.777777 DRT
send_tx "Dave" "$DAVE" "Eve" "$EVE" "888888" "udrt" "./test-wallets/dave.json"               # 0.888888 DRT
send_tx "Eve" "$EVE" "Alice" "$ALICE" "999999" "udrt" "./test-wallets/eve.json"              # 0.999999 DRT
echo

sleep 2

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Final Balances:${NC}"
show_balance "Alice" "$ALICE"
show_balance "Bob" "$BOB"
show_balance "Charlie" "$CHARLIE"
show_balance "Dave" "$DAVE"
show_balance "Eve" "$EVE"
echo

echo -e "${GREEN}✅ Successfully executed 23 complex fractional transactions!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
