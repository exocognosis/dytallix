#!/bin/bash
# Dytallix API Quick Validation Scripts using cURL
# This script provides quick command-line testing of all API endpoints

set -e

# Configuration
BASE_URL=${DYTALLIX_API_URL:-"http://localhost:3030"}
VERBOSE=${VERBOSE:-false}
OUTPUT_DIR=${OUTPUT_DIR:-"/tmp/dytallix_curl_tests"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a curl test
run_curl_test() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    local description="$6"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log "Running test: $test_name"
    if [ -n "$description" ]; then
        echo "  Description: $description"
    fi
    
    local output_file="$OUTPUT_DIR/${test_name}_${TIMESTAMP}.json"
    local curl_args=(-s -w "%{http_code}:%{time_total}:%{size_download}" -o "$output_file")
    
    if [ "$VERBOSE" = "true" ]; then
        curl_args+=(-v)
    fi
    
    # Build curl command based on method
    case "$method" in
        "GET")
            curl_args+=(-X GET)
            ;;
        "POST")
            curl_args+=(-X POST -H "Content-Type: application/json")
            if [ -n "$data" ]; then
                curl_args+=(-d "$data")
            fi
            ;;
        *)
            curl_args+=(-X "$method")
            ;;
    esac
    
    # Add URL
    curl_args+=("$BASE_URL$endpoint")
    
    # Execute curl command
    local result
    result=$(curl "${curl_args[@]}" 2>/dev/null)
    
    # Parse result
    local http_code time_total size_download
    IFS=':' read -r http_code time_total size_download <<< "$result"
    
    # Convert time to milliseconds
    local time_ms
    time_ms=$(echo "$time_total * 1000" | bc -l | cut -d'.' -f1)
    
    # Check status
    local status="UNKNOWN"
    if [ "$http_code" -eq "$expected_status" ]; then
        status="PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "$test_name - HTTP $http_code (${time_ms}ms, ${size_download} bytes)"
    else
        status="FAIL"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log_error "$test_name - Expected HTTP $expected_status, got $http_code (${time_ms}ms)"
    fi
    
    # Validate JSON if expected
    if [ "$expected_status" -eq 200 ] && [ "$status" = "PASS" ]; then
        if ! jq empty "$output_file" 2>/dev/null; then
            log_warning "$test_name - Response is not valid JSON"
        else
            # Check for success field in JSON
            local success_field
            success_field=$(jq -r '.success // empty' "$output_file" 2>/dev/null)
            if [ "$success_field" = "false" ]; then
                log_warning "$test_name - API returned success=false"
            fi
        fi
    fi
    
    echo "    Status: $status | HTTP: $http_code | Time: ${time_ms}ms | Size: ${size_download}B"
    echo ""
}

# Function to test health endpoints
test_health_endpoints() {
    echo "=== Testing Health & Status Endpoints ==="
    
    run_curl_test \
        "health_check" \
        "GET" \
        "/health" \
        "" \
        200 \
        "Basic health check"
    
    run_curl_test \
        "system_status" \
        "GET" \
        "/status" \
        "" \
        200 \
        "System status and metrics"
    
    run_curl_test \
        "blockchain_stats" \
        "GET" \
        "/stats" \
        "" \
        200 \
        "Blockchain statistics"
}

# Function to test block endpoints
test_block_endpoints() {
    echo "=== Testing Block Endpoints ==="
    
    run_curl_test \
        "blocks_list" \
        "GET" \
        "/blocks?limit=5" \
        "" \
        200 \
        "Get list of blocks with pagination"
    
    run_curl_test \
        "latest_block" \
        "GET" \
        "/blocks/latest" \
        "" \
        200 \
        "Get latest block"
    
    run_curl_test \
        "specific_block" \
        "GET" \
        "/blocks/1234" \
        "" \
        200 \
        "Get specific block by number"
    
    run_curl_test \
        "invalid_block" \
        "GET" \
        "/blocks/invalid" \
        "" \
        400 \
        "Test invalid block ID handling"
}

# Function to test transaction endpoints
test_transaction_endpoints() {
    echo "=== Testing Transaction Endpoints ==="
    
    run_curl_test \
        "transactions_list" \
        "GET" \
        "/transactions?limit=5" \
        "" \
        200 \
        "Get list of transactions"
    
    run_curl_test \
        "specific_transaction" \
        "GET" \
        "/transaction/0x1234567890abcdef" \
        "" \
        200 \
        "Get specific transaction"
    
    local tx_payload='{
        "from": "dyt1test_sender",
        "to": "dyt1test_receiver",
        "amount": 1000000,
        "fee": 1000,
        "nonce": 42
    }'
    
    run_curl_test \
        "submit_transaction" \
        "POST" \
        "/submit" \
        "$tx_payload" \
        200 \
        "Submit new transaction"
}

# Function to test network endpoints
test_network_endpoints() {
    echo "=== Testing Network Endpoints ==="
    
    run_curl_test \
        "peers_list" \
        "GET" \
        "/peers" \
        "" \
        200 \
        "Get network peers"
    
    run_curl_test \
        "account_balance" \
        "GET" \
        "/balance/dyt1test123456789" \
        "" \
        200 \
        "Get account balance"
}

# Function to test security
test_security() {
    echo "=== Testing Security ==="
    
    # SQL Injection test
    run_curl_test \
        "sql_injection_test" \
        "GET" \
        "/balance/'; DROP TABLE users; --" \
        "" \
        400 \
        "SQL injection protection test"
    
    # XSS test
    local xss_payload='{
        "from": "<script>alert(\"xss\")</script>",
        "to": "dyt1test_receiver",
        "amount": 1000,
        "fee": 100
    }'
    
    run_curl_test \
        "xss_protection_test" \
        "POST" \
        "/submit" \
        "$xss_payload" \
        400 \
        "XSS protection test"
    
    # Invalid JSON test
    run_curl_test \
        "invalid_json_test" \
        "POST" \
        "/submit" \
        "{invalid json" \
        400 \
        "Invalid JSON handling test"
}

# Function to test performance
test_performance() {
    echo "=== Testing Performance ==="
    
    log "Running 10 rapid health checks..."
    local start_time end_time total_time
    start_time=$(date +%s.%N)
    
    for i in {1..10}; do
        curl -s "$BASE_URL/health" > /dev/null
    done
    
    end_time=$(date +%s.%N)
    total_time=$(echo "$end_time - $start_time" | bc -l)
    avg_time=$(echo "scale=2; $total_time / 10" | bc -l)
    
    log_success "Completed 10 requests in ${total_time}s (avg: ${avg_time}s per request)"
}

# Function to test WebSocket connectivity (basic check)
test_websocket() {
    echo "=== Testing WebSocket Connectivity ==="
    
    # Check if wscat is available
    if command -v wscat &> /dev/null; then
        local ws_url
        ws_url=$(echo "$BASE_URL" | sed 's/http/ws/')/ws
        
        log "Testing WebSocket connection to $ws_url"
        
        # Try to connect with timeout
        if timeout 5s wscat -c "$ws_url" -w 1 <<< '{"action":"ping"}' &>/dev/null; then
            log_success "WebSocket connection successful"
        else
            log_warning "WebSocket connection failed or not available"
        fi
    else
        log_warning "wscat not available, skipping WebSocket test"
        log "To install wscat: npm install -g wscat"
    fi
}

# Function to generate summary report
generate_summary() {
    echo ""
    echo "================================================================"
    echo "                    DYTALLIX API TEST SUMMARY"
    echo "================================================================"
    echo "Base URL: $BASE_URL"
    echo "Timestamp: $(date)"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    
    local pass_rate
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        pass_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc -l)
        echo "Pass Rate: ${pass_rate}%"
    else
        echo "Pass Rate: N/A"
    fi
    
    echo ""
    if [ "$FAILED_TESTS" -eq 0 ]; then
        log_success "All tests passed! 🎉"
    else
        log_error "$FAILED_TESTS tests failed"
        echo "Check individual test outputs in: $OUTPUT_DIR"
    fi
    echo "================================================================"
}

# Function to clean up old test files
cleanup() {
    if [ -d "$OUTPUT_DIR" ]; then
        # Remove files older than 24 hours
        find "$OUTPUT_DIR" -name "*.json" -mtime +1 -delete 2>/dev/null || true
    fi
}

# Main execution
main() {
    echo "🚀 Dytallix API Quick Validation Tests"
    echo "Base URL: $BASE_URL"
    echo "Output Directory: $OUTPUT_DIR"
    echo ""
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found. JSON validation will be skipped."
        log "To install jq: apt-get install jq (Ubuntu) or brew install jq (macOS)"
    fi
    
    # Check if bc is available
    if ! command -v bc &> /dev/null; then
        log_error "bc (calculator) not found. This is required for time calculations."
        exit 1
    fi
    
    # Cleanup old files
    cleanup
    
    # Test API availability first
    log "Testing API availability..."
    if ! curl -s --max-time 10 "$BASE_URL/health" >/dev/null 2>&1; then
        log_error "API is not accessible at $BASE_URL"
        log "Please ensure the Dytallix API server is running"
        exit 1
    fi
    log_success "API is accessible"
    echo ""
    
    # Run all test suites
    test_health_endpoints
    test_block_endpoints
    test_transaction_endpoints
    test_network_endpoints
    test_security
    test_performance
    test_websocket
    
    # Generate summary
    generate_summary
}

# Script usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL          Set base URL (default: http://localhost:3030)"
    echo "  -v, --verbose          Enable verbose output"
    echo "  -o, --output DIR       Set output directory (default: /tmp/dytallix_curl_tests)"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DYTALLIX_API_URL       Base URL for API"
    echo "  VERBOSE                Enable verbose mode (true/false)"
    echo "  OUTPUT_DIR             Output directory for test results"
    echo ""
    echo "Examples:"
    echo "  $0                               # Test against localhost:3030"
    echo "  $0 -u http://api.dytallix.com    # Test against remote API"
    echo "  $0 -v                            # Run with verbose output"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Run main function
main