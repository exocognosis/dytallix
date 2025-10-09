#!/usr/bin/env bash
# Dytallix Fast Launch - Multi-Wallet CLI
# Manage multiple PQC wallets for testing

set -e

WALLETS_DIR="${HOME}/.dytallix/wallets"
ACTIVE_WALLET_FILE="${HOME}/.dytallix/active_wallet"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ensure wallets directory exists
mkdir -p "$WALLETS_DIR"

# Helper functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  Dytallix Multi-Wallet CLI${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Generate a random PQC address
generate_address() {
    local algo="$1"
    local prefix="pqc1"
    
    if [ "$algo" = "ML-DSA" ] || [ "$algo" = "mldsa" ]; then
        prefix="pqc1ml"
    elif [ "$algo" = "SLH-DSA" ] || [ "$algo" = "slhdsa" ]; then
        prefix="pqc1slh"
    fi
    
    # Generate random suffix
    local random1=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 10 | head -n 1)
    local random2=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 6 | head -n 1)
    
    echo "${prefix}${random1}${random2}"
}

# Create a new wallet
cmd_create() {
    local name="$1"
    local algo="${2:-ML-DSA}"
    
    if [ -z "$name" ]; then
        print_error "Wallet name is required"
        echo "Usage: $0 create <name> [algorithm]"
        echo "  algorithm: ML-DSA (default) or SLH-DSA"
        exit 1
    fi
    
    # Check if wallet already exists
    if [ -f "$WALLETS_DIR/$name.json" ]; then
        print_error "Wallet '$name' already exists"
        exit 1
    fi
    
    # Generate address
    local address=$(generate_address "$algo")
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Create wallet JSON
    cat > "$WALLETS_DIR/$name.json" <<EOF
{
  "name": "$name",
  "address": "$address",
  "algorithm": "$algo",
  "created_at": "$timestamp",
  "balances": {
    "DGT": 0,
    "DRT": 0
  }
}
EOF
    
    print_success "Created wallet: $name"
    print_info "Algorithm: $algo"
    print_info "Address: $address"
    print_info "File: $WALLETS_DIR/$name.json"
    echo ""
    print_warning "Remember to get testnet tokens from the faucet!"
}

# List all wallets
cmd_list() {
    local active_wallet=""
    if [ -f "$ACTIVE_WALLET_FILE" ]; then
        active_wallet=$(cat "$ACTIVE_WALLET_FILE")
    fi
    
    echo "Wallets:"
    echo ""
    
    local count=0
    for wallet_file in "$WALLETS_DIR"/*.json; do
        if [ -f "$wallet_file" ]; then
            local wallet_name=$(basename "$wallet_file" .json)
            local address=$(jq -r '.address' "$wallet_file")
            local algo=$(jq -r '.algorithm' "$wallet_file")
            local dgt=$(jq -r '.balances.DGT // 0' "$wallet_file")
            local drt=$(jq -r '.balances.DRT // 0' "$wallet_file")
            
            if [ "$wallet_name" = "$active_wallet" ]; then
                echo -e "  ${GREEN}●${NC} ${BLUE}$wallet_name${NC} (active)"
            else
                echo -e "    $wallet_name"
            fi
            echo -e "      Address:   $address"
            echo -e "      Algorithm: $algo"
            echo -e "      Balances:  ${GREEN}${dgt} DGT${NC} / ${YELLOW}${drt} DRT${NC}"
            echo ""
            
            count=$((count + 1))
        fi
    done
    
    if [ $count -eq 0 ]; then
        print_info "No wallets found. Create one with: $0 create <name>"
    else
        echo "Total: $count wallet(s)"
    fi
}

# Show wallet details
cmd_show() {
    local name="$1"
    
    if [ -z "$name" ]; then
        print_error "Wallet name is required"
        echo "Usage: $0 show <name>"
        exit 1
    fi
    
    if [ ! -f "$WALLETS_DIR/$name.json" ]; then
        print_error "Wallet '$name' not found"
        exit 1
    fi
    
    echo "Wallet: $name"
    echo ""
    jq '.' "$WALLETS_DIR/$name.json"
}

# Switch active wallet
cmd_switch() {
    local name="$1"
    
    if [ -z "$name" ]; then
        print_error "Wallet name is required"
        echo "Usage: $0 switch <name>"
        exit 1
    fi
    
    if [ ! -f "$WALLETS_DIR/$name.json" ]; then
        print_error "Wallet '$name' not found"
        exit 1
    fi
    
    echo "$name" > "$ACTIVE_WALLET_FILE"
    print_success "Switched to wallet: $name"
    
    local address=$(jq -r '.address' "$WALLETS_DIR/$name.json")
    print_info "Address: $address"
}

# Delete a wallet
cmd_delete() {
    local name="$1"
    
    if [ -z "$name" ]; then
        print_error "Wallet name is required"
        echo "Usage: $0 delete <name>"
        exit 1
    fi
    
    if [ ! -f "$WALLETS_DIR/$name.json" ]; then
        print_error "Wallet '$name' not found"
        exit 1
    fi
    
    read -p "Are you sure you want to delete wallet '$name'? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$WALLETS_DIR/$name.json"
        print_success "Deleted wallet: $name"
        
        # Clear active wallet if it was deleted
        if [ -f "$ACTIVE_WALLET_FILE" ]; then
            local active=$(cat "$ACTIVE_WALLET_FILE")
            if [ "$active" = "$name" ]; then
                rm "$ACTIVE_WALLET_FILE"
                print_info "Cleared active wallet"
            fi
        fi
    else
        print_info "Cancelled"
    fi
}

# Get active wallet
cmd_active() {
    if [ ! -f "$ACTIVE_WALLET_FILE" ]; then
        print_info "No active wallet set"
        echo "Set one with: $0 switch <name>"
        exit 0
    fi
    
    local active=$(cat "$ACTIVE_WALLET_FILE")
    
    if [ ! -f "$WALLETS_DIR/$active.json" ]; then
        print_error "Active wallet '$active' not found"
        rm "$ACTIVE_WALLET_FILE"
        exit 1
    fi
    
    print_success "Active wallet: $active"
    local address=$(jq -r '.address' "$WALLETS_DIR/$active.json")
    print_info "Address: $address"
}

# Show help
cmd_help() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create <name> [algorithm]  Create a new wallet"
    echo "                             algorithm: ML-DSA (default) or SLH-DSA"
    echo "  list                       List all wallets"
    echo "  show <name>                Show wallet details (JSON)"
    echo "  switch <name>              Set active wallet"
    echo "  active                     Show active wallet"
    echo "  delete <name>              Delete a wallet"
    echo "  help                       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 create alice              # Create wallet named 'alice' with ML-DSA"
    echo "  $0 create bob SLH-DSA        # Create wallet named 'bob' with SLH-DSA"
    echo "  $0 list                      # List all wallets"
    echo "  $0 switch alice              # Set alice as active wallet"
    echo "  $0 show alice                # Show alice wallet details"
    echo ""
    echo "Wallets are stored in: $WALLETS_DIR"
}

# Main
print_header

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
    create)
        cmd_create "$@"
        ;;
    list|ls)
        cmd_list
        ;;
    show)
        cmd_show "$@"
        ;;
    switch|use)
        cmd_switch "$@"
        ;;
    active|current)
        cmd_active
        ;;
    delete|rm)
        cmd_delete "$@"
        ;;
    help|--help|-h)
        cmd_help
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        cmd_help
        exit 1
        ;;
esac
