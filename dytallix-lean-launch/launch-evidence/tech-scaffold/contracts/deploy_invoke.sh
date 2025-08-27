#!/bin/bash

# Contract Deployment and Invocation Script
# Automates contract storage, instantiation, execution, and gas reporting

set -euo pipefail

# Configuration with defaults
DY_BINARY="${DY_BINARY:-dytallixd}"
DY_LCD="${DY_LCD:-http://localhost:1317}"
DY_RPC="${DY_RPC:-http://localhost:26657}"
DY_DENOM="${DY_DENOM:-uDRT}"
CONTRACT_DEPLOYER="${CONTRACT_DEPLOYER:-deployer}"
INITIAL_COUNT="${INITIAL_COUNT:-0}"

# Files and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WASM_FILE="$SCRIPT_DIR/counter_contract.wasm"
DEPLOY_TX_FILE="$SCRIPT_DIR/deploy_tx.json"
INVOKE_TX_FILE="$SCRIPT_DIR/invoke_tx.json"
GAS_REPORT_FILE="$SCRIPT_DIR/gas_report.json"

# Global variables for contract info
CODE_ID=""
CONTRACT_ADDRESS=""
CHAIN_ID=""

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
    if [[ -f "$SCRIPT_DIR/instantiate_temp.json" ]]; then
        rm -f "$SCRIPT_DIR/instantiate_temp.json"
    fi
    if [[ -f "$SCRIPT_DIR/execute_temp.json" ]]; then
        rm -f "$SCRIPT_DIR/execute_temp.json"
    fi
}
trap cleanup EXIT

# Validate deployment environment
validate_environment() {
    log_info "Validating deployment environment..."

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

    # Get chain ID
    CHAIN_ID=$("$DY_BINARY" status --node "$DY_RPC" | jq -r '.NodeInfo.network')
    log_info "Connected to chain: $CHAIN_ID"

    # Check deployer key
    if ! "$DY_BINARY" keys show "$CONTRACT_DEPLOYER" &> /dev/null; then
        log_error "Deployer key '$CONTRACT_DEPLOYER' not found in keyring"
        exit 1
    fi

    local deployer_addr
    deployer_addr=$("$DY_BINARY" keys show "$CONTRACT_DEPLOYER" -a)
    log_info "Deployer address: $deployer_addr"

    # Check WASM file
    if [[ ! -f "$WASM_FILE" ]]; then
        log_error "WASM file not found: $WASM_FILE"
        log_error "Run ./build.sh first to compile the contract"
        exit 1
    fi

    local wasm_size
    wasm_size=$(stat -c%s "$WASM_FILE")
    log_info "WASM file size: $wasm_size bytes"

    log_success "Environment validation passed"
}

# Store contract code on chain
store_contract() {
    log_info "Storing contract code on chain..."

    local store_output
    store_output=$("$DY_BINARY" tx wasm store "$WASM_FILE" \
        --from "$CONTRACT_DEPLOYER" \
        --gas auto \
        --gas-adjustment 1.3 \
        --fees 2000uDRT \
        --chain-id "$CHAIN_ID" \
        --node "$DY_RPC" \
        --yes \
        --output json)

    local tx_hash
    tx_hash=$(echo "$store_output" | jq -r '.txhash')
    log_info "Store transaction hash: $tx_hash"

    # Wait for transaction confirmation
    log_info "Waiting for transaction confirmation..."
    sleep 6

    # Get transaction details and extract code_id
    local tx_result
    tx_result=$("$DY_BINARY" query tx "$tx_hash" --node "$DY_RPC" --output json)
    
    CODE_ID=$(echo "$tx_result" | jq -r '.logs[0].events[] | select(.type=="store_code") | .attributes[] | select(.key=="code_id") | .value')

    if [[ -z "$CODE_ID" || "$CODE_ID" == "null" ]]; then
        log_error "Failed to extract code_id from transaction"
        echo "$tx_result" | jq '.'
        exit 1
    fi

    log_success "Contract stored with code_id: $CODE_ID"

    # Save storage transaction details
    local wasm_size
    wasm_size=$(stat -c%s "$WASM_FILE")
    
    # Extract gas info
    local gas_used gas_wanted
    gas_used=$(echo "$tx_result" | jq -r '.gas_used // "0"')
    gas_wanted=$(echo "$tx_result" | jq -r '.gas_wanted // "0"')

    cat > "$SCRIPT_DIR/store_tx.json" << EOF
{
  "operation": "store_code",
  "transaction_hash": "$tx_hash",
  "code_id": "$CODE_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$CONTRACT_DEPLOYER",
  "wasm_size_bytes": $wasm_size,
  "gas_info": {
    "gas_used": "$gas_used",
    "gas_wanted": "$gas_wanted",
    "fee_amount": "2000",
    "fee_denom": "$DY_DENOM"
  },
  "transaction_details": $tx_result
}
EOF

    log_info "Storage transaction saved to store_tx.json"
}

# Instantiate contract
instantiate_contract() {
    log_info "Instantiating contract with initial count: $INITIAL_COUNT"

    # Create instantiate message
    local init_msg="{\"count\": $INITIAL_COUNT}"
    
    local instantiate_output
    instantiate_output=$("$DY_BINARY" tx wasm instantiate "$CODE_ID" "$init_msg" \
        --from "$CONTRACT_DEPLOYER" \
        --label "Counter Contract" \
        --gas auto \
        --gas-adjustment 1.3 \
        --fees 1000uDRT \
        --chain-id "$CHAIN_ID" \
        --node "$DY_RPC" \
        --yes \
        --output json)

    local tx_hash
    tx_hash=$(echo "$instantiate_output" | jq -r '.txhash')
    log_info "Instantiate transaction hash: $tx_hash"

    # Wait for confirmation
    sleep 6

    # Get contract address from transaction
    local tx_result
    tx_result=$("$DY_BINARY" query tx "$tx_hash" --node "$DY_RPC" --output json)
    
    CONTRACT_ADDRESS=$(echo "$tx_result" | jq -r '.logs[0].events[] | select(.type=="instantiate") | .attributes[] | select(.key=="_contract_address") | .value')

    if [[ -z "$CONTRACT_ADDRESS" || "$CONTRACT_ADDRESS" == "null" ]]; then
        log_error "Failed to extract contract address from transaction"
        echo "$tx_result" | jq '.'
        exit 1
    fi

    log_success "Contract instantiated at address: $CONTRACT_ADDRESS"

    # Extract gas info
    local gas_used gas_wanted
    gas_used=$(echo "$tx_result" | jq -r '.gas_used // "0"')
    gas_wanted=$(echo "$tx_result" | jq -r '.gas_wanted // "0"')

    # Save instantiation details to deploy_tx.json
    cat > "$DEPLOY_TX_FILE" << EOF
{
  "operation": "instantiate",
  "transaction_hash": "$tx_hash",
  "code_id": "$CODE_ID",
  "contract_address": "$CONTRACT_ADDRESS",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$CONTRACT_DEPLOYER",
  "init_msg": $init_msg,
  "gas_info": {
    "gas_used": "$gas_used",
    "gas_wanted": "$gas_wanted",
    "fee_amount": "1000",
    "fee_denom": "$DY_DENOM"
  },
  "transaction_details": $tx_result
}
EOF

    log_info "Deployment transaction saved to deploy_tx.json"
}

# Query contract state
query_contract() {
    local query_msg="$1"
    local description="$2"
    
    log_info "Querying contract: $description"
    
    local result
    result=$("$DY_BINARY" query wasm contract-state smart "$CONTRACT_ADDRESS" "$query_msg" \
        --node "$DY_RPC" --output json)
    
    echo "$result"
}

# Execute contract function
execute_contract() {
    local execute_msg="$1"
    local description="$2"
    local fee_amount="${3:-500}"
    
    log_info "Executing contract: $description"
    
    local execute_output
    execute_output=$("$DY_BINARY" tx wasm execute "$CONTRACT_ADDRESS" "$execute_msg" \
        --from "$CONTRACT_DEPLOYER" \
        --gas auto \
        --gas-adjustment 1.3 \
        --fees "${fee_amount}uDRT" \
        --chain-id "$CHAIN_ID" \
        --node "$DY_RPC" \
        --yes \
        --output json)

    local tx_hash
    tx_hash=$(echo "$execute_output" | jq -r '.txhash')
    log_info "Execute transaction hash: $tx_hash"

    # Wait for confirmation
    sleep 5

    # Get transaction details
    local tx_result
    tx_result=$("$DY_BINARY" query tx "$tx_hash" --node "$DY_RPC" --output json)
    
    # Check for errors
    local code
    code=$(echo "$tx_result" | jq -r '.code // 0')
    if [[ "$code" != "0" ]]; then
        log_error "Contract execution failed with code: $code"
        echo "$tx_result" | jq '.raw_log'
        exit 1
    fi

    log_success "Contract execution completed: $description"
    
    # Return transaction result for gas analysis
    echo "$tx_result"
}

# Test contract functionality
test_contract() {
    log_info "Testing contract functionality..."

    # Query initial state
    log_info "Querying initial count..."
    local initial_query
    initial_query=$(query_contract '{"get_count":{}}' "get initial count")
    local initial_count
    initial_count=$(echo "$initial_query" | jq -r '.data.count')
    log_info "Initial count: $initial_count"

    # Execute increment
    log_info "Executing increment operation..."
    local increment_tx
    increment_tx=$(execute_contract '{"increment":{}}' "increment counter")
    
    # Query after increment
    local after_increment_query
    after_increment_query=$(query_contract '{"get_count":{}}' "get count after increment")
    local after_increment_count
    after_increment_count=$(echo "$after_increment_query" | jq -r '.data.count')
    log_info "Count after increment: $after_increment_count"

    # Verify increment worked
    if [[ $((initial_count + 1)) -ne $after_increment_count ]]; then
        log_error "Increment operation failed: expected $((initial_count + 1)), got $after_increment_count"
        exit 1
    fi

    # Execute decrement
    log_info "Executing decrement operation..."
    local decrement_tx
    decrement_tx=$(execute_contract '{"decrement":{}}' "decrement counter")

    # Query after decrement  
    local after_decrement_query
    after_decrement_query=$(query_contract '{"get_count":{}}' "get count after decrement")
    local after_decrement_count
    after_decrement_count=$(echo "$after_decrement_query" | jq -r '.data.count')
    log_info "Count after decrement: $after_decrement_count"

    # Verify decrement worked
    if [[ $initial_count -ne $after_decrement_count ]]; then
        log_error "Decrement operation failed: expected $initial_count, got $after_decrement_count"
        exit 1
    fi

    log_success "Contract functionality test passed"

    # Save invocation transaction details
    local increment_gas_used increment_gas_wanted
    increment_gas_used=$(echo "$increment_tx" | jq -r '.gas_used // "0"')
    increment_gas_wanted=$(echo "$increment_tx" | jq -r '.gas_wanted // "0"')
    
    local decrement_gas_used decrement_gas_wanted
    decrement_gas_used=$(echo "$decrement_tx" | jq -r '.gas_used // "0"')
    decrement_gas_wanted=$(echo "$decrement_tx" | jq -r '.gas_wanted // "0"')

    cat > "$INVOKE_TX_FILE" << EOF
{
  "contract_address": "$CONTRACT_ADDRESS",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_sequence": [
    {
      "operation": "query_initial",
      "result": $initial_query,
      "count": $initial_count
    },
    {
      "operation": "increment",
      "transaction_hash": "$(echo "$increment_tx" | jq -r '.txhash')",
      "gas_used": "$increment_gas_used",
      "gas_wanted": "$increment_gas_wanted",
      "transaction_details": $increment_tx
    },
    {
      "operation": "query_after_increment", 
      "result": $after_increment_query,
      "count": $after_increment_count
    },
    {
      "operation": "decrement",
      "transaction_hash": "$(echo "$decrement_tx" | jq -r '.txhash')",
      "gas_used": "$decrement_gas_used",
      "gas_wanted": "$decrement_gas_wanted",
      "transaction_details": $decrement_tx
    },
    {
      "operation": "query_after_decrement",
      "result": $after_decrement_query,
      "count": $after_decrement_count
    }
  ]
}
EOF

    log_info "Invocation transaction saved to invoke_tx.json"
}

# Generate comprehensive gas report
generate_gas_report() {
    log_info "Generating gas consumption report..."

    # Load transaction data
    local store_data deploy_data invoke_data
    store_data=$(cat "$SCRIPT_DIR/store_tx.json")
    deploy_data=$(cat "$DEPLOY_TX_FILE") 
    invoke_data=$(cat "$INVOKE_TX_FILE")

    # Extract gas information
    local store_gas_used store_gas_wanted
    store_gas_used=$(echo "$store_data" | jq -r '.gas_info.gas_used')
    store_gas_wanted=$(echo "$store_data" | jq -r '.gas_info.gas_wanted')

    local deploy_gas_used deploy_gas_wanted
    deploy_gas_used=$(echo "$deploy_data" | jq -r '.gas_info.gas_used')
    deploy_gas_wanted=$(echo "$deploy_data" | jq -r '.gas_info.gas_wanted')

    local increment_gas_used increment_gas_wanted
    increment_gas_used=$(echo "$invoke_data" | jq -r '.test_sequence[1].gas_used')
    increment_gas_wanted=$(echo "$invoke_data" | jq -r '.test_sequence[1].gas_wanted')

    local decrement_gas_used decrement_gas_wanted
    decrement_gas_used=$(echo "$invoke_data" | jq -r '.test_sequence[3].gas_used')
    decrement_gas_wanted=$(echo "$invoke_data" | jq -r '.test_sequence[3].gas_wanted')

    # Calculate costs (assuming 1 gas = 1 unit of denom for fees)
    local wasm_size
    wasm_size=$(echo "$store_data" | jq -r '.wasm_size_bytes')

    cat > "$GAS_REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contract_info": {
    "code_id": "$CODE_ID",
    "contract_address": "$CONTRACT_ADDRESS",
    "wasm_size_bytes": $wasm_size,
    "deployer": "$CONTRACT_DEPLOYER"
  },
  "gas_usage": {
    "storage": {
      "operation": "store_code",
      "gas_used": $store_gas_used,
      "gas_wanted": $store_gas_wanted,
      "efficiency_percent": $(echo "scale=2; $store_gas_used * 100 / $store_gas_wanted" | bc -l),
      "cost_uDRT": "2000"
    },
    "instantiation": {
      "operation": "instantiate",
      "gas_used": $deploy_gas_used,
      "gas_wanted": $deploy_gas_wanted,
      "efficiency_percent": $(echo "scale=2; $deploy_gas_used * 100 / $deploy_gas_wanted" | bc -l),
      "cost_uDRT": "1000"
    },
    "execution": {
      "increment": {
        "gas_used": $increment_gas_used,
        "gas_wanted": $increment_gas_wanted,
        "efficiency_percent": $(echo "scale=2; $increment_gas_used * 100 / $increment_gas_wanted" | bc -l),
        "cost_uDRT": "500"
      },
      "decrement": {
        "gas_used": $decrement_gas_used,
        "gas_wanted": $decrement_gas_wanted,
        "efficiency_percent": $(echo "scale=2; $decrement_gas_used * 100 / $decrement_gas_wanted" | bc -l),
        "cost_uDRT": "500"
      }
    }
  },
  "summary": {
    "total_gas_used": $((store_gas_used + deploy_gas_used + increment_gas_used + decrement_gas_used)),
    "total_cost_uDRT": "4000",
    "gas_per_byte": $(echo "scale=2; $store_gas_used / $wasm_size" | bc -l),
    "operations_tested": 4
  }
}
EOF

    log_success "Gas report generated: $GAS_REPORT_FILE"

    # Display summary
    echo ""
    echo "=== GAS USAGE SUMMARY ==="
    echo "Storage:       $store_gas_used gas (WASM: $wasm_size bytes)"
    echo "Instantiation: $deploy_gas_used gas"  
    echo "Increment:     $increment_gas_used gas"
    echo "Decrement:     $decrement_gas_used gas"
    echo "Total:         $((store_gas_used + deploy_gas_used + increment_gas_used + decrement_gas_used)) gas"
    echo "=========================="
}

# Main execution flow
main() {
    log_info "Starting contract deployment and testing..."

    validate_environment
    store_contract
    instantiate_contract
    test_contract
    generate_gas_report

    log_success "Contract deployment and testing completed successfully!"
    echo ""
    echo "Generated artifacts:"
    echo "  - store_tx.json (code storage transaction)"
    echo "  - deploy_tx.json (contract instantiation)"
    echo "  - invoke_tx.json (contract execution tests)"
    echo "  - gas_report.json (comprehensive gas analysis)"
    echo ""
    echo "Contract deployed at: $CONTRACT_ADDRESS"
    echo "Code ID: $CODE_ID"
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi