#!/bin/bash

# Faucet Request Script for Local Testing
# Usage: ./scripts/faucet_request.sh [address] [token] [endpoint]

set -e

# Default configuration
FAUCET_ENDPOINT="${FAUCET_ENDPOINT:-http://localhost:8787/api/faucet}"
FAUCET_ADDRESS="${FAUCET_ADDRESS:-dytallix1test123456789012345678901234567890}"
DEFAULT_TOKEN="DGT"

# Parse command line arguments
ADDRESS="${1:-$FAUCET_ADDRESS}"
TOKEN="${2:-$DEFAULT_TOKEN}"
ENDPOINT="${3:-$FAUCET_ENDPOINT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to validate inputs
validate_inputs() {
    if [[ ! "$ADDRESS" =~ ^dytallix1[a-z0-9]{38}$ ]]; then
        print_error "Invalid address format: $ADDRESS"
        print_error "Address must start with 'dytallix1' and be 46 characters total"
        exit 1
    fi

    if [[ ! "$TOKEN" =~ ^(DGT|DRT|BOTH)$ ]]; then
        print_error "Invalid token: $TOKEN"
        print_error "Token must be DGT, DRT, or BOTH"
        exit 1
    fi

    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed"
        exit 1
    fi
}

# Function to construct request body
construct_request_body() {
    case "$TOKEN" in
        "DGT"|"DRT")
            echo "{\"address\":\"$ADDRESS\",\"token\":\"$TOKEN\"}"
            ;;
        "BOTH")
            echo "{\"address\":\"$ADDRESS\",\"tokens\":[\"DGT\",\"DRT\"]}"
            ;;
    esac
}

# Function to validate response using jq if available
validate_response() {
    local response="$1"
    
    if command -v jq &> /dev/null; then
        print_status "Validating response structure with jq..."
        
        # Check if response has required fields
        local success=$(echo "$response" | jq -r '.success // empty')
        if [[ -z "$success" ]]; then
            print_error "Response missing 'success' field"
            return 1
        fi
        
        if [[ "$success" == "true" ]]; then
            # Validate success response
            local dispensed=$(echo "$response" | jq -r '.dispensed // empty')
            if [[ -z "$dispensed" ]]; then
                print_error "Success response missing 'dispensed' field"
                return 1
            fi
            
            # Validate each dispensed token
            local count=$(echo "$response" | jq -r '.dispensed | length')
            print_status "Validated $count dispensed tokens"
            
            for i in $(seq 0 $((count-1))); do
                local symbol=$(echo "$response" | jq -r ".dispensed[$i].symbol")
                local amount=$(echo "$response" | jq -r ".dispensed[$i].amount")
                local txHash=$(echo "$response" | jq -r ".dispensed[$i].txHash")
                
                if [[ ! "$symbol" =~ ^(DGT|DRT)$ ]]; then
                    print_error "Invalid token symbol: $symbol"
                    return 1
                fi
                
                if [[ ! "$amount" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
                    print_error "Invalid amount format: $amount"
                    return 1
                fi
                
                if [[ ! "$txHash" =~ ^0x[a-fA-F0-9]{64}$ ]]; then
                    print_error "Invalid transaction hash format: $txHash"
                    return 1
                fi
                
                print_success "Token $((i+1)): $symbol ($amount) - $txHash"
            done
        else
            # Validate error response
            local error=$(echo "$response" | jq -r '.error // empty')
            local message=$(echo "$response" | jq -r '.message // empty')
            
            if [[ -z "$error" ]]; then
                print_error "Error response missing 'error' field"
                return 1
            fi
            
            print_warning "Faucet request failed: $error - $message"
        fi
        
        print_success "Response structure validation passed"
        return 0
    else
        print_warning "jq not available - skipping detailed response validation"
        
        # Basic validation without jq
        if echo "$response" | grep -q '"success"'; then
            print_status "Response contains success field"
        else
            print_error "Response missing success field"
            return 1
        fi
        
        return 0
    fi
}

# Function to check server health
check_server_health() {
    print_status "Checking server health..."
    
    local health_endpoint="${ENDPOINT%/faucet}/status"
    local health_response
    
    if health_response=$(curl -s --max-time 5 "$health_endpoint" 2>/dev/null); then
        print_success "Server is responding"
        
        if command -v jq &> /dev/null; then
            local redis_status=$(echo "$health_response" | jq -r '.redis.status // "unknown"')
            local height=$(echo "$health_response" | jq -r '.height // "unknown"')
            print_status "Redis: $redis_status, Block height: $height"
        fi
    else
        print_warning "Server health check failed or endpoint not available"
    fi
}

# Function to make faucet request
make_faucet_request() {
    local request_body=$(construct_request_body)
    
    print_status "Making faucet request..."
    print_status "Endpoint: $ENDPOINT"
    print_status "Address: $ADDRESS"
    print_status "Token(s): $TOKEN"
    print_status "Request body: $request_body"
    
    local response
    local http_code
    
    # Make the request and capture both response and HTTP status code
    response=$(curl -s -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        --max-time 30 \
        "$ENDPOINT" 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to connect to faucet endpoint: $ENDPOINT"
        print_error "Please ensure the server is running and accessible"
        exit 1
    fi
    
    # Split response and status code
    http_code=$(echo "$response" | tail -n1)
    response=$(echo "$response" | head -n -1)
    
    print_status "HTTP Status: $http_code"
    
    # Pretty print JSON if jq is available
    if command -v jq &> /dev/null; then
        echo "$response" | jq .
    else
        echo "$response"
    fi
    
    # Validate response
    if validate_response "$response"; then
        if [[ "$http_code" == "200" ]]; then
            print_success "Faucet request completed successfully!"
        else
            print_warning "Request completed with HTTP $http_code"
        fi
    else
        print_error "Response validation failed"
        exit 1
    fi
    
    # Return status for scripting
    if [[ "$http_code" == "200" ]]; then
        return 0
    else
        return 1
    fi
}

# Main execution
main() {
    echo "🚰 Dytallix Faucet Request Script"
    echo "=================================="
    
    # Validate inputs
    validate_inputs
    
    # Check server health first
    check_server_health
    
    # Make the request
    make_faucet_request
    
    echo ""
    print_success "Script completed successfully!"
}

# Show help if requested
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    cat << EOF
Dytallix Faucet Request Script

Usage: $0 [address] [token] [endpoint]

Arguments:
  address   Dytallix bech32 address (default: $FAUCET_ADDRESS)
  token     Token type: DGT, DRT, or BOTH (default: $DEFAULT_TOKEN)
  endpoint  Faucet API endpoint (default: $FAUCET_ENDPOINT)

Environment Variables:
  FAUCET_ENDPOINT   Override default faucet endpoint
  FAUCET_ADDRESS    Override default test address

Examples:
  $0
  $0 dytallix1abc123... DGT
  $0 dytallix1abc123... BOTH
  $0 dytallix1abc123... DRT http://localhost:8787/api/faucet

Requirements:
  - curl (required)
  - jq (optional, for enhanced validation)

Exit Codes:
  0  Success
  1  Error (validation, network, or server error)
EOF
    exit 0
fi

# Run main function
main "$@"