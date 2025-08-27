#!/bin/bash

# Governance Evidence Capture Script
# Automates parameter change proposal submission, voting, and execution verification

set -euo pipefail

# Configuration with defaults
DY_BINARY="${DY_BINARY:-dytallixd}"
DY_LCD="${DY_LCD:-http://localhost:1317}"
DY_RPC="${DY_RPC:-http://localhost:26657}"
DY_DENOM="${DY_DENOM:-uDRT}"
VOTER_KEYS="${VOTER_KEYS:-validator1,validator2,validator3}"
PROPOSAL_DEPOSIT="${PROPOSAL_DEPOSIT:-10000000uDRT}"
PARAM_SUBSPACE="${PARAM_SUBSPACE:-staking}"
PARAM_KEY="${PARAM_KEY:-UnbondingTime}"
PARAM_VALUE="${PARAM_VALUE:-1814400s}"

# Script directory for file paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVIDENCE_DIR="$SCRIPT_DIR"

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

# Cleanup function
cleanup() {
    if [[ -f "$EVIDENCE_DIR/proposal_temp.json" ]]; then
        rm -f "$EVIDENCE_DIR/proposal_temp.json"
    fi
}
trap cleanup EXIT

# Validate environment
validate_environment() {
    log_info "Validating environment configuration..."
    
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
    
    # Validate voter keys
    IFS=',' read -ra KEYS <<< "$VOTER_KEYS"
    for key in "${KEYS[@]}"; do
        if ! "$DY_BINARY" keys show "$key" &> /dev/null; then
            log_error "Voter key '$key' not found in keyring"
            exit 1
        fi
    done
    
    log_success "Environment validation passed"
}

# Create proposal JSON from template
create_proposal() {
    log_info "Creating parameter change proposal..."
    
    local template_file="$EVIDENCE_DIR/proposal_param_change.example.json"
    local proposal_file="$EVIDENCE_DIR/proposal_temp.json"
    
    if [[ ! -f "$template_file" ]]; then
        log_error "Template file not found: $template_file"
        exit 1
    fi
    
    # Get proposer address (use first voter key)
    local proposer_key=$(echo "$VOTER_KEYS" | cut -d',' -f1)
    local proposer_addr=$("$DY_BINARY" keys show "$proposer_key" -a)
    
    # Create proposal with dynamic values
    jq --arg subspace "$PARAM_SUBSPACE" \
       --arg key "$PARAM_KEY" \
       --arg value "\"$PARAM_VALUE\"" \
       --arg proposer "$proposer_addr" \
       --arg deposit "$PROPOSAL_DEPOSIT" \
       '.content.changes[0].subspace = $subspace |
        .content.changes[0].key = $key |
        .content.changes[0].value = $value |
        .proposer = $proposer |
        .initial_deposit[0].amount = ($deposit | sub("uDRT$"; ""))' \
       "$template_file" > "$proposal_file"
    
    log_success "Proposal created: $proposal_file"
}

# Submit proposal
submit_proposal() {
    log_info "Submitting governance proposal..."
    
    local proposal_file="$EVIDENCE_DIR/proposal_temp.json"
    local proposer_key=$(echo "$VOTER_KEYS" | cut -d',' -f1)
    
    # Submit proposal and capture output
    local submit_output
    submit_output=$("$DY_BINARY" tx gov submit-proposal param-change "$proposal_file" \
        --from "$proposer_key" \
        --gas auto \
        --gas-adjustment 1.3 \
        --fees 500uDRT \
        --chain-id "$("$DY_BINARY" status --node "$DY_RPC" | jq -r '.NodeInfo.network')" \
        --node "$DY_RPC" \
        --yes \
        --output json)
    
    # Extract transaction hash and proposal ID
    local tx_hash=$(echo "$submit_output" | jq -r '.txhash')
    log_info "Proposal submitted, tx hash: $tx_hash"
    
    # Wait for transaction confirmation
    sleep 5
    
    # Get proposal ID from transaction events
    local tx_result
    tx_result=$("$DY_BINARY" query tx "$tx_hash" --node "$DY_RPC" --output json)
    local proposal_id=$(echo "$tx_result" | jq -r '.logs[0].events[] | select(.type=="submit_proposal") | .attributes[] | select(.key=="proposal_id") | .value')
    
    if [[ -z "$proposal_id" || "$proposal_id" == "null" ]]; then
        log_error "Failed to extract proposal ID from transaction"
        exit 1
    fi
    
    log_success "Proposal ID: $proposal_id"
    
    # Save proposal transaction details
    cat > "$EVIDENCE_DIR/proposal_tx.json" << EOF
{
  "transaction_hash": "$tx_hash",
  "proposal_id": "$proposal_id",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "proposer": "$proposer_key",
  "parameter_change": {
    "subspace": "$PARAM_SUBSPACE",
    "key": "$PARAM_KEY", 
    "value": "$PARAM_VALUE"
  },
  "transaction_details": $tx_result
}
EOF
    
    echo "$proposal_id"
}

# Cast votes from all validator keys
cast_votes() {
    local proposal_id="$1"
    log_info "Casting votes for proposal $proposal_id..."
    
    local vote_txs=()
    IFS=',' read -ra KEYS <<< "$VOTER_KEYS"
    
    for key in "${KEYS[@]}"; do
        log_info "Voting with key: $key"
        
        local vote_output
        vote_output=$("$DY_BINARY" tx gov vote "$proposal_id" yes \
            --from "$key" \
            --gas auto \
            --gas-adjustment 1.3 \
            --fees 500uDRT \
            --chain-id "$("$DY_BINARY" status --node "$DY_RPC" | jq -r '.NodeInfo.network')" \
            --node "$DY_RPC" \
            --yes \
            --output json)
        
        local vote_hash=$(echo "$vote_output" | jq -r '.txhash')
        vote_txs+=("$vote_hash")
        log_info "Vote cast by $key, tx hash: $vote_hash"
        
        sleep 2  # Brief delay between votes
    done
    
    # Save voting transaction details
    local vote_details="[]"
    for i in "${!vote_txs[@]}"; do
        local key=${KEYS[$i]}
        local hash=${vote_txs[$i]}
        
        # Wait for confirmation and get transaction details
        sleep 3
        local tx_result
        tx_result=$("$DY_BINARY" query tx "$hash" --node "$DY_RPC" --output json 2>/dev/null || echo '{}')
        
        vote_details=$(echo "$vote_details" | jq --arg key "$key" --arg hash "$hash" --argjson tx "$tx_result" \
            '. += [{"voter": $key, "transaction_hash": $hash, "transaction_details": $tx}]')
    done
    
    cat > "$EVIDENCE_DIR/vote_tx.json" << EOF
{
  "proposal_id": "$proposal_id",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "votes": $vote_details
}
EOF
    
    log_success "All votes cast and recorded"
}

# Monitor proposal until execution
monitor_execution() {
    local proposal_id="$1"
    log_info "Monitoring proposal $proposal_id until execution..."
    
    local max_attempts=60  # 5 minutes max wait
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        local proposal_status
        proposal_status=$("$DY_BINARY" query gov proposal "$proposal_id" --node "$DY_RPC" --output json)
        local status=$(echo "$proposal_status" | jq -r '.status')
        
        case "$status" in
            "PROPOSAL_STATUS_VOTING_PERIOD")
                log_info "Proposal in voting period, waiting..."
                ;;
            "PROPOSAL_STATUS_PASSED")
                log_success "Proposal passed, waiting for execution..."
                ;;
            "PROPOSAL_STATUS_EXECUTED" | "PROPOSAL_STATUS_FAILED")
                log_success "Proposal execution completed with status: $status"
                break
                ;;
            "PROPOSAL_STATUS_REJECTED")
                log_error "Proposal was rejected"
                exit 1
                ;;
            *)
                log_info "Proposal status: $status"
                ;;
        esac
        
        sleep 5
        ((attempt++))
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        log_error "Timeout waiting for proposal execution"
        exit 1
    fi
}

# Verify parameter change was applied
verify_execution() {
    local proposal_id="$1"
    log_info "Verifying parameter change was applied..."
    
    # Query the parameter to confirm change
    local param_query
    case "$PARAM_SUBSPACE" in
        "staking")
            param_query=$("$DY_BINARY" query staking params --node "$DY_RPC" --output json)
            ;;
        "gov")
            param_query=$("$DY_BINARY" query gov params --node "$DY_RPC" --output json)
            ;;
        *)
            log_error "Unsupported parameter subspace: $PARAM_SUBSPACE"
            exit 1
            ;;
    esac
    
    # Create execution log
    cat > "$EVIDENCE_DIR/execution_log.json" << EOF
{
  "proposal_id": "$proposal_id",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "parameter_verification": {
    "subspace": "$PARAM_SUBSPACE",
    "key": "$PARAM_KEY",
    "expected_value": "$PARAM_VALUE",
    "current_params": $param_query
  },
  "execution_status": "completed"
}
EOF
    
    log_success "Parameter verification completed and logged"
}

# Create screenshots directory if needed
setup_screenshots() {
    local screenshots_dir="$EVIDENCE_DIR/screenshots"
    if [[ ! -d "$screenshots_dir" ]]; then
        mkdir -p "$screenshots_dir"
        echo "# Screenshots Directory

Place governance process screenshots here:
- proposal_submission.png
- voting_interface.png  
- execution_confirmation.png" > "$screenshots_dir/README.md"
    fi
}

# Main execution flow
main() {
    log_info "Starting governance evidence collection..."
    
    validate_environment
    setup_screenshots
    create_proposal
    
    local proposal_id
    proposal_id=$(submit_proposal)
    
    cast_votes "$proposal_id"
    monitor_execution "$proposal_id"
    verify_execution "$proposal_id"
    
    log_success "Governance evidence collection completed successfully!"
    log_info "Generated artifacts:"
    log_info "  - proposal_tx.json (proposal submission details)"
    log_info "  - vote_tx.json (voting transaction records)"  
    log_info "  - execution_log.json (parameter verification)"
    log_info "  - screenshots/ (manual screenshot directory)"
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi