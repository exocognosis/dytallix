#!/bin/bash

# Faucet Claim Script
# Requests tokens from faucet service and records transaction details

set -euo pipefail

# Configuration with defaults
DY_BINARY="${DY_BINARY:-dytallixd}"
DY_LCD="${DY_LCD:-http://localhost:1317}"
DY_RPC="${DY_RPC:-http://localhost:26657}"
DY_DENOM="${DY_DENOM:-uDRT}"
CURL_FAUCET_URL="${CURL_FAUCET_URL:-http://localhost:8080/faucet}"
KEY_NAME="${KEY_NAME:-pqc_test_key}"
KEYRING_BACKEND="${KEYRING_BACKEND:-test}"
FAUCET_AMOUNT="${FAUCET_AMOUNT:-1000000uDRT}"

# Script directory for output files
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FAUCET_TX_FILE="$SCRIPT_DIR/faucet_tx.json"

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
    log_info "Validating environment for faucet claim..."

    # Check binary availability
    if ! command -v "$DY_BINARY" &> /dev/null; then
        log_error "Chain binary '$DY_BINARY' not found in PATH"
        exit 1
    fi

    # Check curl availability
    if ! command -v curl &> /dev/null; then
        log_error "curl not found in PATH"
        exit 1
    fi

    # Check jq availability  
    if ! command -v jq &> /dev/null; then
        log_error "jq not found in PATH"
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

    log_success "Environment validation passed"
}

# Get account address
get_account_address() {
    local address
    address=$("$DY_BINARY" keys show "$KEY_NAME" -a --keyring-backend "$KEYRING_BACKEND")
    echo "$address"
}

# Get current account balance
get_balance() {
    local address="$1"
    local balance_output
    balance_output=$(curl -s "$DY_LCD/cosmos/bank/v1beta1/balances/$address" || echo '{"balances":[]}')
    
    # Extract balance for our denomination
    local amount="0"
    if echo "$balance_output" | jq -e '.balances' >/dev/null 2>&1; then
        amount=$(echo "$balance_output" | jq -r ".balances[] | select(.denom==\"$DY_DENOM\") | .amount // \"0\"")
    fi
    
    echo "$amount"
}

# Test faucet endpoint
test_faucet_connectivity() {
    log_info "Testing faucet connectivity..."

    # Try to reach faucet endpoint
    local faucet_response
    if faucet_response=$(curl -s --max-time 10 "$CURL_FAUCET_URL" 2>&1); then
        log_info "Faucet endpoint reachable"
        
        # Check if it looks like a faucet service
        if echo "$faucet_response" | grep -i "faucet\|address\|tokens" >/dev/null 2>&1; then
            log_success "Faucet service appears active"
        else
            log_info "Faucet response: $faucet_response"
        fi
    else
        log_error "Cannot reach faucet at $CURL_FAUCET_URL"
        log_error "Response: $faucet_response"
        exit 1
    fi
}

# Request tokens from faucet
request_faucet_tokens() {
    local address="$1"
    log_info "Requesting tokens from faucet for address: $address"

    # Try different faucet request formats
    local faucet_response
    local success=false

    # Format 1: POST with JSON body
    log_info "Trying POST request with JSON body..."
    faucet_response=$(curl -s --max-time 30 \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{\"address\":\"$address\",\"amount\":\"$FAUCET_AMOUNT\"}" \
        "$CURL_FAUCET_URL" 2>&1 || echo "POST request failed")

    if echo "$faucet_response" | jq -e '.txhash // .hash // .transaction_hash' >/dev/null 2>&1; then
        log_success "Faucet request successful (POST JSON)"
        success=true
    else
        log_info "POST JSON failed, trying GET request..."
        
        # Format 2: GET with query parameters
        faucet_response=$(curl -s --max-time 30 \
            "$CURL_FAUCET_URL?address=$address&amount=$FAUCET_AMOUNT" 2>&1 || echo "GET request failed")

        if echo "$faucet_response" | jq -e '.txhash // .hash // .transaction_hash' >/dev/null 2>&1; then
            log_success "Faucet request successful (GET query)"
            success=true
        else
            log_info "GET query failed, trying POST form data..."
            
            # Format 3: POST with form data
            faucet_response=$(curl -s --max-time 30 \
                -X POST \
                -d "address=$address" \
                -d "amount=$FAUCET_AMOUNT" \
                "$CURL_FAUCET_URL" 2>&1 || echo "POST form failed")

            if echo "$faucet_response" | jq -e '.txhash // .hash // .transaction_hash' >/dev/null 2>&1; then
                log_success "Faucet request successful (POST form)"
                success=true
            fi
        fi
    fi

    if [[ "$success" == "false" ]]; then
        log_error "All faucet request formats failed"
        log_error "Response: $faucet_response"
        
        # Create failure record
        cat > "$FAUCET_TX_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "recipient_address": "$address",
  "requested_amount": "$FAUCET_AMOUNT",
  "faucet_url": "$CURL_FAUCET_URL",
  "status": "failed",
  "error": "Faucet request failed",
  "faucet_response": $(echo "$faucet_response" | jq -R .)
}
EOF
        exit 1
    fi

    echo "$faucet_response"
}

# Wait for transaction confirmation
wait_for_confirmation() {
    local tx_hash="$1"
    local max_attempts=30
    local attempt=0

    log_info "Waiting for transaction confirmation: $tx_hash"

    while [[ $attempt -lt $max_attempts ]]; do
        local tx_result
        if tx_result=$("$DY_BINARY" query tx "$tx_hash" --node "$DY_RPC" --output json 2>/dev/null); then
            local code
            code=$(echo "$tx_result" | jq -r '.code // 0')
            
            if [[ "$code" == "0" ]]; then
                log_success "Transaction confirmed successfully"
                echo "$tx_result"
                return 0
            else
                log_error "Transaction failed with code: $code"
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

# Main faucet claim process
claim_from_faucet() {
    local address
    address=$(get_account_address)
    log_info "Account address: $address"

    # Get initial balance
    local initial_balance
    initial_balance=$(get_balance "$address")
    log_info "Initial balance: $initial_balance $DY_DENOM"

    # Test faucet connectivity
    test_faucet_connectivity

    # Request tokens from faucet
    local faucet_response
    faucet_response=$(request_faucet_tokens "$address")

    # Extract transaction hash from response
    local tx_hash
    tx_hash=$(echo "$faucet_response" | jq -r '.txhash // .hash // .transaction_hash')

    if [[ -z "$tx_hash" || "$tx_hash" == "null" ]]; then
        log_error "Could not extract transaction hash from faucet response"
        log_error "Response: $faucet_response"
        exit 1
    fi

    log_info "Faucet transaction hash: $tx_hash"

    # Wait for confirmation
    local tx_result
    tx_result=$(wait_for_confirmation "$tx_hash")

    # Get final balance
    sleep 3  # Allow balance to update
    local final_balance
    final_balance=$(get_balance "$address")
    log_info "Final balance: $final_balance $DY_DENOM"

    # Calculate received amount
    local received_amount=$((final_balance - initial_balance))
    log_success "Received: $received_amount $DY_DENOM"

    # Create transaction record
    cat > "$FAUCET_TX_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "recipient_address": "$address",
  "key_name": "$KEY_NAME",
  "requested_amount": "$FAUCET_AMOUNT",
  "received_amount": "$received_amount",
  "transaction_hash": "$tx_hash",
  "faucet_url": "$CURL_FAUCET_URL",
  "balances": {
    "initial": "$initial_balance",
    "final": "$final_balance"
  },
  "status": "success",
  "faucet_response": $faucet_response,
  "transaction_details": $tx_result
}
EOF

    log_success "Faucet claim transaction saved to: $FAUCET_TX_FILE"
}

# Verify claim was successful
verify_claim() {
    log_info "Verifying faucet claim was successful..."

    if [[ ! -f "$FAUCET_TX_FILE" ]]; then
        log_error "Faucet transaction file not found"
        exit 1
    fi

    local claim_data
    claim_data=$(cat "$FAUCET_TX_FILE")

    local status
    status=$(echo "$claim_data" | jq -r '.status')

    if [[ "$status" == "success" ]]; then
        local received
        received=$(echo "$claim_data" | jq -r '.received_amount')
        local tx_hash
        tx_hash=$(echo "$claim_data" | jq -r '.transaction_hash')
        
        log_success "Claim verification passed"
        log_info "Amount received: $received $DY_DENOM"
        log_info "Transaction: $tx_hash"
    else
        log_error "Claim verification failed"
        local error
        error=$(echo "$claim_data" | jq -r '.error // "Unknown error"')
        log_error "Error: $error"
        exit 1
    fi
}

# Main execution flow
main() {
    log_info "Starting faucet claim process..."

    validate_environment
    claim_from_faucet
    verify_claim

    log_success "Faucet claim evidence collection completed!"
    echo ""
    echo "=== FAUCET CLAIM COMPLETE ==="
    
    if [[ -f "$FAUCET_TX_FILE" ]]; then
        local address received tx_hash
        address=$(jq -r '.recipient_address' "$FAUCET_TX_FILE")
        received=$(jq -r '.received_amount' "$FAUCET_TX_FILE")
        tx_hash=$(jq -r '.transaction_hash' "$FAUCET_TX_FILE")
        
        echo "Address: $address"
        echo "Received: $received $DY_DENOM"
        echo "Transaction: $tx_hash"
    fi
    
    echo "Details: $FAUCET_TX_FILE"
    echo "============================="
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi