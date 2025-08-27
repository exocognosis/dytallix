#!/bin/bash

# Transaction Broadcasting Script
# Creates, signs, and broadcasts test transactions using PQC keys

set -euo pipefail

# Configuration with defaults
DY_BINARY="${DY_BINARY:-dytallixd}"
DY_RPC="${DY_RPC:-http://localhost:26657}"
DY_DENOM="${DY_DENOM:-uDRT}"
KEY_NAME="${KEY_NAME:-pqc_test_key}"
KEYRING_BACKEND="${KEYRING_BACKEND:-test}"
SEND_AMOUNT="${SEND_AMOUNT:-1000uDRT}"
RECIPIENT_ADDRESS="${RECIPIENT_ADDRESS:-}"

# Script directory for output files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BROADCAST_TX_FILE="$SCRIPT_DIR/broadcast_tx.json"

# Logging functions
log_info() {
    echo "[INFO] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo "[ERROR] $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

log_success() {
    echo "[SUCCESS] $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Validate environment
validate_environment() {
    log_info "Validating environment for transaction broadcast..."

    # Check binary availability
    if ! command -v "$DY_BINARY" &> /dev/null; then
        log_error "Chain binary '$DY_BINARY' not found in PATH"
        exit 1
    fi

    # Test chain connectivity
    if ! "$DY_BINARY" status --node "$DY_RPC" &> /dev/null; then
        log_error "Cannot connect to chain at $DY_RPC"
        exit 1
    fi

    # Check key exists
    if ! "$DY_BINARY" keys show "$KEY_NAME" --keyring-backend "$KEYRING_BACKEND" &> /dev/null; then
        log_error "Key '$KEY_NAME' not found. Run pqc_keygen.sh first."
        exit 1
    fi

    # Determine recipient address if not provided
    if [[ -z "$RECIPIENT_ADDRESS" ]]; then
        # Use same address (self-send) for testing
        RECIPIENT_ADDRESS=$("$DY_BINARY" keys show "$KEY_NAME" -a --keyring-backend "$KEYRING_BACKEND")
        log_info "No recipient specified, using self-send to: $RECIPIENT_ADDRESS"
    fi

    # Validate recipient address format
    if [[ ! "$RECIPIENT_ADDRESS" =~ ^dy1[a-z0-9]{38}$ ]]; then
        log_error "Invalid recipient address format: $RECIPIENT_ADDRESS"
        exit 1
    fi

    log_success "Environment validation passed"
}

# Get chain ID
get_chain_id() {
    local chain_id
    chain_id=$("$DY_BINARY" status --node "$DY_RPC" | jq -r '.NodeInfo.network')
    echo "$chain_id"
}

# Get account balance
get_balance() {
    local address="$1"
    local balance_query
    balance_query=$("$DY_BINARY" query bank balance "$address" "$DY_DENOM" --node "$DY_RPC" --output json)
    local amount
    amount=$(echo "$balance_query" | jq -r '.amount // "0"')
    echo "$amount"
}

# Check account has sufficient balance
check_balance() {
    local sender_address
    sender_address=$("$DY_BINARY" keys show "$KEY_NAME" -a --keyring-backend "$KEYRING_BACKEND")
    
    local current_balance
    current_balance=$(get_balance "$sender_address")
    
    log_info "Sender address: $sender_address"
    log_info "Current balance: $current_balance $DY_DENOM"

    # Extract numeric amount from SEND_AMOUNT (remove denomination)
    local send_amount_numeric
    send_amount_numeric=$(echo "$SEND_AMOUNT" | sed 's/[^0-9]//g')
    
    # Estimate fees (rough calculation)
    local estimated_fees=200000  # 200k units for fees
    local required_total=$((send_amount_numeric + estimated_fees))

    if [[ $current_balance -lt $required_total ]]; then
        log_error "Insufficient balance: $current_balance < $required_total (send + fees)"
        log_error "Run faucet_claim.sh to get tokens first"
        exit 1
    fi

    log_success "Balance check passed: $current_balance >= $required_total"
}

# Create and broadcast transaction
broadcast_transaction() {
    local chain_id
    chain_id=$(get_chain_id)
    log_info "Chain ID: $chain_id"
    
    local sender_address
    sender_address=$("$DY_BINARY" keys show "$KEY_NAME" -a --keyring-backend "$KEYRING_BACKEND")

    log_info "Creating transaction..."
    log_info "From: $sender_address"
    log_info "To: $RECIPIENT_ADDRESS" 
    log_info "Amount: $SEND_AMOUNT"

    # Get initial balances
    local sender_initial_balance recipient_initial_balance
    sender_initial_balance=$(get_balance "$sender_address")
    recipient_initial_balance=$(get_balance "$RECIPIENT_ADDRESS")

    # Create and broadcast transaction
    local tx_output
    tx_output=$("$DY_BINARY" tx bank send "$sender_address" "$RECIPIENT_ADDRESS" "$SEND_AMOUNT" \
        --from "$KEY_NAME" \
        --keyring-backend "$KEYRING_BACKEND" \
        --gas auto \
        --gas-adjustment 1.3 \
        --fees 200000uDRT \
        --chain-id "$chain_id" \
        --node "$DY_RPC" \
        --yes \
        --output json)

    local tx_hash
    tx_hash=$(echo "$tx_output" | jq -r '.txhash')

    if [[ -z "$tx_hash" || "$tx_hash" == "null" ]]; then
        log_error "Failed to extract transaction hash"
        log_error "Transaction output: $tx_output"
        exit 1
    fi

    log_info "Transaction broadcast successful"
    log_info "Transaction hash: $tx_hash"

    # Wait for confirmation
    log_info "Waiting for transaction confirmation..."
    local confirmation_result
    confirmation_result=$(wait_for_confirmation "$tx_hash")

    # Get final balances
    sleep 3  # Allow balances to update
    local sender_final_balance recipient_final_balance
    sender_final_balance=$(get_balance "$sender_address")
    recipient_final_balance=$(get_balance "$RECIPIENT_ADDRESS")

    # Calculate amounts
    local amount_sent fee_paid
    amount_sent=$((sender_initial_balance - sender_final_balance))
    fee_paid=$((amount_sent - $(echo "$SEND_AMOUNT" | sed 's/[^0-9]//g')))

    log_success "Transaction confirmed!"
    log_info "Amount sent: $amount_sent $DY_DENOM"
    log_info "Fee paid: $fee_paid $DY_DENOM"

    # Save transaction details
    local block_height
    block_height=$(echo "$confirmation_result" | jq -r '.height // "unknown"')

    cat > "$BROADCAST_TX_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "transaction_hash": "$tx_hash",
  "block_height": "$block_height",
  "chain_id": "$chain_id",
  "sender": {
    "address": "$sender_address",
    "key_name": "$KEY_NAME",
    "keyring_backend": "$KEYRING_BACKEND"
  },
  "recipient": {
    "address": "$RECIPIENT_ADDRESS"
  },
  "amount": {
    "requested": "$SEND_AMOUNT",
    "actual_sent": "$amount_sent",
    "fee_paid": "$fee_paid",
    "denomination": "$DY_DENOM"
  },
  "balances": {
    "sender": {
      "initial": "$sender_initial_balance",
      "final": "$sender_final_balance"
    },
    "recipient": {
      "initial": "$recipient_initial_balance", 
      "final": "$recipient_final_balance"
    }
  },
  "status": "confirmed",
  "broadcast_response": $tx_output,
  "confirmation_details": $confirmation_result
}
EOF

    log_success "Transaction details saved to: $BROADCAST_TX_FILE"
}

# Wait for transaction confirmation
wait_for_confirmation() {
    local tx_hash="$1"
    local max_attempts=30
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        local tx_result
        if tx_result=$("$DY_BINARY" query tx "$tx_hash" --node "$DY_RPC" --output json 2>/dev/null); then
            local code
            code=$(echo "$tx_result" | jq -r '.code // 0')
            
            if [[ "$code" == "0" ]]; then
                echo "$tx_result"
                return 0
            else
                log_error "Transaction failed with code: $code"
                local raw_log
                raw_log=$(echo "$tx_result" | jq -r '.raw_log // "Unknown error"')
                log_error "Error: $raw_log"
                echo "$tx_result"
                return 1
            fi
        fi

        sleep 2
        ((attempt++))
        
        if [[ $((attempt % 5)) -eq 0 ]]; then
            log_info "Still waiting for confirmation... (attempt $attempt/$max_attempts)"
        fi
    done

    log_error "Transaction confirmation timeout"
    return 1
}

# Verify transaction was successful
verify_transaction() {
    log_info "Verifying transaction success..."

    if [[ ! -f "$BROADCAST_TX_FILE" ]]; then
        log_error "Broadcast transaction file not found"
        exit 1
    fi

    local tx_data
    tx_data=$(cat "$BROADCAST_TX_FILE")

    local status
    status=$(echo "$tx_data" | jq -r '.status')

    if [[ "$status" == "confirmed" ]]; then
        local tx_hash amount_sent fee_paid block_height
        tx_hash=$(echo "$tx_data" | jq -r '.transaction_hash')
        amount_sent=$(echo "$tx_data" | jq -r '.amount.actual_sent')
        fee_paid=$(echo "$tx_data" | jq -r '.amount.fee_paid')
        block_height=$(echo "$tx_data" | jq -r '.block_height')
        
        log_success "Transaction verification passed"
        log_info "Hash: $tx_hash"
        log_info "Block: $block_height"
        log_info "Sent: $amount_sent $DY_DENOM"
        log_info "Fee: $fee_paid $DY_DENOM"
    else
        log_error "Transaction verification failed"
        local error
        error=$(echo "$tx_data" | jq -r '.error // "Unknown error"')
        log_error "Error: $error"
        exit 1
    fi
}

# Display transaction summary
display_summary() {
    if [[ -f "$BROADCAST_TX_FILE" ]]; then
        local tx_data
        tx_data=$(cat "$BROADCAST_TX_FILE")
        
        echo ""
        echo "=== TRANSACTION SUMMARY ==="
        echo "Hash: $(echo "$tx_data" | jq -r '.transaction_hash')"
        echo "Block: $(echo "$tx_data" | jq -r '.block_height')"
        echo "From: $(echo "$tx_data" | jq -r '.sender.address')"
        echo "To: $(echo "$tx_data" | jq -r '.recipient.address')"
        echo "Amount: $(echo "$tx_data" | jq -r '.amount.actual_sent') $DY_DENOM"
        echo "Fee: $(echo "$tx_data" | jq -r '.amount.fee_paid') $DY_DENOM"
        echo "Status: $(echo "$tx_data" | jq -r '.status')"
        echo "Details: $BROADCAST_TX_FILE"
        echo "==========================="
    fi
}

# Main execution flow
main() {
    log_info "Starting transaction broadcast process..."

    validate_environment
    check_balance
    broadcast_transaction
    verify_transaction

    log_success "Transaction broadcast evidence collection completed!"
    display_summary
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi