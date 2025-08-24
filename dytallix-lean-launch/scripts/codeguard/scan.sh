#!/bin/bash

# CodeGuard Scan Script
# Submit a contract for security scanning

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR_URL="http://localhost:8080"

usage() {
    echo "CodeGuard Security Scanner"
    echo "Usage: $0 [options] <contract_address> <code_hash>"
    echo ""
    echo "Arguments:"
    echo "  contract_address    The contract address to scan"
    echo "  code_hash          The contract code hash"
    echo ""
    echo "Options:"
    echo "  -u, --url URL      Orchestrator URL (default: $ORCHESTRATOR_URL)"
    echo "  -w, --wait         Wait for scan completion"
    echo "  -v, --verbose      Verbose output"
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dytallix1abc123... 0x456def..."
    echo "  $0 --wait --verbose dytallix1abc123... 0x456def..."
}

# Parse command line arguments
WAIT_FOR_COMPLETION=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            ORCHESTRATOR_URL="$2"
            shift 2
            ;;
        -w|--wait)
            WAIT_FOR_COMPLETION=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            break
            ;;
    esac
done

# Check required arguments
if [[ $# -lt 2 ]]; then
    echo "Error: Missing required arguments"
    usage
    exit 1
fi

CONTRACT_ADDRESS="$1"
CODE_HASH="$2"

# Validate inputs
if [[ ! "$CONTRACT_ADDRESS" =~ ^dytallix1[a-z0-9]{38}$ ]]; then
    echo "Warning: Contract address format may be invalid"
fi

if [[ ! "$CODE_HASH" =~ ^0x[a-fA-F0-9]+$ ]]; then
    echo "Warning: Code hash format may be invalid"
fi

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    fi
}

# Check if orchestrator is available
check_orchestrator() {
    log "Checking orchestrator availability..."
    
    if ! curl -s --max-time 5 "$ORCHESTRATOR_URL/health" > /dev/null; then
        echo "❌ Error: Orchestrator not available at $ORCHESTRATOR_URL"
        echo "Make sure CodeGuard services are running: make codeguard.dev-up"
        exit 1
    fi
    
    log "✅ Orchestrator is available"
}

# Submit scan request
submit_scan() {
    log "Submitting scan request..."
    
    local payload=$(cat << EOF
{
  "contractAddress": "$CONTRACT_ADDRESS",
  "codeHash": "$CODE_HASH"
}
EOF
)

    local response=$(curl -s \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$ORCHESTRATOR_URL/scan")
    
    if [[ $? -ne 0 ]]; then
        echo "❌ Error: Failed to submit scan request"
        exit 1
    fi
    
    # Parse response
    local scan_id=$(echo "$response" | grep -o '"scanId":"[^"]*"' | cut -d'"' -f4)
    
    if [[ -z "$scan_id" ]]; then
        echo "❌ Error: Invalid response from orchestrator"
        echo "Response: $response"
        exit 1
    fi
    
    echo "✅ Scan submitted successfully"
    echo "Scan ID: $scan_id"
    
    if [[ "$WAIT_FOR_COMPLETION" == "true" ]]; then
        wait_for_completion "$scan_id"
    else
        echo ""
        echo "To check status: curl $ORCHESTRATOR_URL/scan/$scan_id"
        echo "Or wait for completion: $0 --wait $CONTRACT_ADDRESS $CODE_HASH"
    fi
}

# Wait for scan completion
wait_for_completion() {
    local scan_id="$1"
    local max_attempts=60
    local attempt=0
    
    echo ""
    echo "⏳ Waiting for scan completion..."
    
    while [[ $attempt -lt $max_attempts ]]; do
        attempt=$((attempt + 1))
        log "Attempt $attempt/$max_attempts"
        
        local response=$(curl -s "$ORCHESTRATOR_URL/scan/$scan_id")
        local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        
        case "$status" in
            "completed")
                echo "✅ Scan completed successfully!"
                display_results "$response"
                return 0
                ;;
            "failed")
                echo "❌ Scan failed"
                local error=$(echo "$response" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
                if [[ -n "$error" ]]; then
                    echo "Error: $error"
                fi
                return 1
                ;;
            "scanning"|"analyzing"|"applying_rules"|"submitting_attestation")
                echo "🔄 Status: $status"
                ;;
            *)
                log "Unknown status: $status"
                ;;
        esac
        
        sleep 5
    done
    
    echo "⏰ Timeout waiting for scan completion"
    echo "Check status manually: curl $ORCHESTRATOR_URL/scan/$scan_id"
    return 1
}

# Display scan results
display_results() {
    local response="$1"
    
    echo ""
    echo "📊 Scan Results:"
    echo "=================="
    
    # Extract key information
    local security_score=$(echo "$response" | grep -o '"securityScore":[0-9]*' | cut -d':' -f2)
    local created_at=$(echo "$response" | grep -o '"createdAt":"[^"]*"' | cut -d'"' -f4)
    
    if [[ -n "$security_score" ]]; then
        echo "Security Score: $security_score/100"
        
        if [[ "$security_score" -ge 80 ]]; then
            echo "Overall Rating: ✅ EXCELLENT"
        elif [[ "$security_score" -ge 60 ]]; then
            echo "Overall Rating: ✅ GOOD"
        elif [[ "$security_score" -ge 40 ]]; then
            echo "Overall Rating: ⚠️  MODERATE"
        else
            echo "Overall Rating: ❌ POOR"
        fi
    fi
    
    if [[ -n "$created_at" ]]; then
        echo "Scan Date: $created_at"
    fi
    
    echo ""
    echo "Full results:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
}

# Main execution
main() {
    echo "🔍 CodeGuard Security Scanner"
    echo "Contract: $CONTRACT_ADDRESS"
    echo "Code Hash: $CODE_HASH"
    echo ""
    
    check_orchestrator
    submit_scan
}

main