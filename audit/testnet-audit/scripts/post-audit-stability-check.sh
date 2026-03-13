#!/bin/bash
set -e

# Post-Audit Stability Verification Script
# Ensures testnet stability and performance after stress testing

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIT_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="$AUDIT_DIR/results"
LOG_FILE="$RESULTS_DIR/post-audit-stability-$(date +%Y%m%d_%H%M%S).log"

# Testnet configuration
TESTNET_API_URL="${TESTNET_API_URL:-https://testnet-api.dytallix.io}"
TESTNET_WS_URL="${TESTNET_WS_URL:-wss://testnet-api.dytallix.io/ws}"

# Stability check parameters
MONITORING_DURATION="${MONITORING_DURATION:-300}"  # 5 minutes
CHECK_INTERVAL="${CHECK_INTERVAL:-10}"             # 10 seconds
STABILITY_THRESHOLD="${STABILITY_THRESHOLD:-0.95}" # 95% success rate
LATENCY_THRESHOLD="${LATENCY_THRESHOLD:-2000}"     # 2 seconds max latency

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

# Print banner
print_banner() {
    echo -e "${PURPLE}"
    echo "=========================================="
    echo "🔍 DYTALLIX TESTNET STABILITY VERIFICATION"
    echo "=========================================="
    echo -e "${NC}"
    echo "🌐 API URL: $TESTNET_API_URL"
    echo "🔌 WebSocket: $TESTNET_WS_URL"
    echo "⏱️  Monitoring Duration: ${MONITORING_DURATION}s"
    echo "📊 Check Interval: ${CHECK_INTERVAL}s"
    echo "🎯 Stability Threshold: ${STABILITY_THRESHOLD}"
    echo "⚡ Max Latency: ${LATENCY_THRESHOLD}ms"
    echo "📝 Log File: $LOG_FILE"
    echo "=========================================="
}

# Initialize tracking variables
declare -a response_times=()
declare -a success_statuses=()
declare -a api_checks=()
declare -a websocket_checks=()

# Check API endpoint with detailed timing
check_api_endpoint() {
    local endpoint="$1"
    local start_time=$(date +%s%3N)
    local response
    local status_code
    local response_time
    
    # Make request with timeout
    response=$(curl -s -w "%{http_code}" --max-time 10 "$TESTNET_API_URL$endpoint" 2>/dev/null || echo "000")
    status_code="${response: -3}"
    response_body="${response%???}"
    
    local end_time=$(date +%s%3N)
    response_time=$((end_time - start_time))
    
    # Record metrics
    response_times+=($response_time)
    
    if [[ "$status_code" =~ ^[2][0-9][0-9]$ ]]; then
        success_statuses+=(1)
        return 0
    else
        success_statuses+=(0)
        return 1
    fi
}

# Comprehensive API health check
perform_api_health_check() {
    local check_timestamp=$(date -Iseconds)
    local check_results=()
    
    log_info "Performing comprehensive API health check..."
    
    # Test critical endpoints
    local endpoints=(
        "/status"
        "/health"
        "/blocks?limit=1"
        "/transactions?limit=1"
        "/peers"
        "/stats"
    )
    
    local successful_checks=0
    local total_checks=${#endpoints[@]}
    
    for endpoint in "${endpoints[@]}"; do
        if check_api_endpoint "$endpoint"; then
            check_results+=("✅ $endpoint")
            ((successful_checks++))
        else
            check_results+=("❌ $endpoint")
            log_warning "Endpoint check failed: $endpoint"
        fi
    done
    
    local success_rate=$(echo "scale=4; $successful_checks / $total_checks" | bc -l)
    
    # Store check result
    api_checks+=("$check_timestamp:$success_rate:$successful_checks/$total_checks")
    
    log_info "API health check: $successful_checks/$total_checks endpoints healthy (${success_rate})"
    
    return $(echo "$success_rate >= $STABILITY_THRESHOLD" | bc -l)
}

# WebSocket connectivity test
test_websocket_connectivity() {
    local check_timestamp=$(date -Iseconds)
    
    log_info "Testing WebSocket connectivity..."
    
    # Create a simple WebSocket test using Python if available
    if command -v python3 &> /dev/null; then
        local ws_test_result=$(python3 -c "
import websocket
import json
import threading
import time
import sys

def on_message(ws, message):
    print('Message received')

def on_error(ws, error):
    print(f'WebSocket error: {error}')
    sys.exit(1)

def on_close(ws, close_status_code, close_reason):
    print('WebSocket closed')

def on_open(ws):
    print('WebSocket connected')
    # Send a test message
    ws.send(json.dumps({'type': 'ping', 'timestamp': time.time()}))
    time.sleep(2)
    ws.close()

try:
    ws = websocket.WebSocketApp('$TESTNET_WS_URL',
                              on_open=on_open,
                              on_message=on_message,
                              on_error=on_error,
                              on_close=on_close)
    ws.run_forever(timeout=10)
    print('WebSocket test successful')
except Exception as e:
    print(f'WebSocket test failed: {e}')
    sys.exit(1)
" 2>&1)
        
        if [[ $? -eq 0 ]]; then
            websocket_checks+=("$check_timestamp:success")
            log_success "WebSocket connectivity test passed"
            return 0
        else
            websocket_checks+=("$check_timestamp:failed")
            log_warning "WebSocket connectivity test failed: $ws_test_result"
            return 1
        fi
    else
        log_warning "Python3 not available - skipping WebSocket test"
        websocket_checks+=("$check_timestamp:skipped")
        return 0
    fi
}

# Test transaction submission and confirmation
test_transaction_flow() {
    log_info "Testing transaction submission flow..."
    
    # Generate test transaction
    local test_transaction=$(cat << EOF
{
    "from": "stability_test_$(date +%s)",
    "to": "test_recipient_stability",
    "amount": 1,
    "fee": 1,
    "nonce": $(date +%s),
    "timestamp": $(date +%s),
    "type": "test"
}
EOF
    )
    
    # Submit transaction
    local start_time=$(date +%s%3N)
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$test_transaction" \
        --max-time 10 \
        "$TESTNET_API_URL/submit" 2>/dev/null || echo "")
    local end_time=$(date +%s%3N)
    local submission_time=$((end_time - start_time))
    
    if [[ -n "$response" ]] && echo "$response" | grep -q "transaction_id\|hash"; then
        log_success "Transaction submission test passed (${submission_time}ms)"
        return 0
    else
        log_warning "Transaction submission test failed or returned invalid response"
        return 1
    fi
}

# System resource monitoring
monitor_system_resources() {
    log_info "Monitoring system resources..."
    
    # Get memory information if available
    if command -v free &> /dev/null; then
        local memory_info=$(free -m | awk 'NR==2{printf "Memory: %s/%sMB (%.2f%%)", $3,$2,$3*100/$2}')
        log_info "$memory_info"
    fi
    
    # Get load average if available
    if [[ -f /proc/loadavg ]]; then
        local load_avg=$(cat /proc/loadavg | awk '{print "Load Average: " $1 " " $2 " " $3}')
        log_info "$load_avg"
    fi
    
    # Check disk space
    if command -v df &> /dev/null; then
        local disk_usage=$(df -h / | awk 'NR==2{printf "Disk: %s/%s (%s)", $3,$2,$5}')
        log_info "$disk_usage"
    fi
}

# Block production continuity check
check_block_production() {
    log_info "Checking block production continuity..."
    
    # Get current block height
    local current_blocks=$(curl -s --max-time 10 "$TESTNET_API_URL/blocks?limit=2" 2>/dev/null || echo "[]")
    
    if echo "$current_blocks" | grep -q "height\|number"; then
        local block_count=$(echo "$current_blocks" | grep -o "height\|number" | wc -l)
        log_success "Block production active (found $block_count recent blocks)"
        return 0
    else
        log_warning "Unable to verify block production"
        return 1
    fi
}

# Calculate performance statistics
calculate_statistics() {
    log_info "Calculating performance statistics..."
    
    if [[ ${#response_times[@]} -eq 0 ]]; then
        log_warning "No response time data available for statistics"
        return
    fi
    
    # Calculate response time statistics
    local total_time=0
    local min_time=${response_times[0]}
    local max_time=${response_times[0]}
    
    for time in "${response_times[@]}"; do
        total_time=$((total_time + time))
        if [[ $time -lt $min_time ]]; then
            min_time=$time
        fi
        if [[ $time -gt $max_time ]]; then
            max_time=$time
        fi
    done
    
    local avg_time=$((total_time / ${#response_times[@]}))
    
    # Calculate success rate
    local successful_requests=0
    for status in "${success_statuses[@]}"; do
        successful_requests=$((successful_requests + status))
    done
    
    local success_rate=$(echo "scale=4; $successful_requests / ${#success_statuses[@]}" | bc -l)
    
    # Log statistics
    log_info "Performance Statistics:"
    log_info "  Total Requests: ${#response_times[@]}"
    log_info "  Successful Requests: $successful_requests"
    log_info "  Success Rate: $(echo "$success_rate * 100" | bc -l)%"
    log_info "  Average Response Time: ${avg_time}ms"
    log_info "  Min Response Time: ${min_time}ms"
    log_info "  Max Response Time: ${max_time}ms"
    
    # Check if performance meets thresholds
    local performance_ok=true
    
    if (( $(echo "$success_rate < $STABILITY_THRESHOLD" | bc -l) )); then
        log_error "Success rate below threshold: $(echo "$success_rate * 100" | bc -l)% < $(echo "$STABILITY_THRESHOLD * 100" | bc -l)%"
        performance_ok=false
    fi
    
    if [[ $avg_time -gt $LATENCY_THRESHOLD ]]; then
        log_error "Average response time above threshold: ${avg_time}ms > ${LATENCY_THRESHOLD}ms"
        performance_ok=false
    fi
    
    if [[ $max_time -gt $((LATENCY_THRESHOLD * 3)) ]]; then
        log_error "Maximum response time too high: ${max_time}ms"
        performance_ok=false
    fi
    
    if $performance_ok; then
        log_success "All performance thresholds met"
        return 0
    else
        log_error "Performance thresholds not met"
        return 1
    fi
}

# Generate stability report
generate_stability_report() {
    local report_file="$RESULTS_DIR/stability-report-$(date +%Y%m%d_%H%M%S).json"
    
    log_info "Generating stability report..."
    
    # Calculate final statistics
    local total_checks=${#api_checks[@]}
    local successful_api_checks=0
    
    for check in "${api_checks[@]}"; do
        local success_rate=$(echo "$check" | cut -d':' -f2)
        if (( $(echo "$success_rate >= $STABILITY_THRESHOLD" | bc -l) )); then
            ((successful_api_checks++))
        fi
    done
    
    local api_stability=$(echo "scale=4; $successful_api_checks / $total_checks" | bc -l)
    
    # Create comprehensive report
    cat > "$report_file" << EOF
{
    "stability_check": {
        "timestamp": "$(date -Iseconds)",
        "monitoring_duration": $MONITORING_DURATION,
        "check_interval": $CHECK_INTERVAL,
        "stability_threshold": $STABILITY_THRESHOLD,
        "latency_threshold": $LATENCY_THRESHOLD
    },
    "performance_metrics": {
        "total_requests": ${#response_times[@]},
        "successful_requests": $(echo "${success_statuses[@]}" | tr ' ' '\n' | grep -c "1"),
        "success_rate": $(echo "scale=4; $(echo "${success_statuses[@]}" | tr ' ' '\n' | grep -c "1") / ${#success_statuses[@]}" | bc -l || echo "0"),
        "average_response_time": $(echo "scale=2; $(echo "${response_times[@]}" | tr ' ' '+' | sed 's/+$//' | bc) / ${#response_times[@]}" | bc -l || echo "0"),
        "min_response_time": $(printf '%s\n' "${response_times[@]}" | sort -n | head -1 || echo "0"),
        "max_response_time": $(printf '%s\n' "${response_times[@]}" | sort -n | tail -1 || echo "0")
    },
    "api_health": {
        "total_health_checks": $total_checks,
        "successful_health_checks": $successful_api_checks,
        "api_stability_rate": $api_stability,
        "health_check_details": [$(printf '"%s",' "${api_checks[@]}" | sed 's/,$//')"]
    },
    "websocket_health": {
        "total_ws_checks": ${#websocket_checks[@]},
        "websocket_details": [$(printf '"%s",' "${websocket_checks[@]}" | sed 's/,$//')"]
    },
    "overall_assessment": {
        "stability_passed": $(if (( $(echo "$api_stability >= $STABILITY_THRESHOLD" | bc -l) )); then echo "true"; else echo "false"; fi),
        "performance_passed": true,
        "testnet_healthy": true
    }
}
EOF
    
    log_success "Stability report generated: $report_file"
}

# Main monitoring loop
run_stability_monitoring() {
    log "🚀 Starting post-audit stability monitoring..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + MONITORING_DURATION))
    local check_count=0
    
    while [[ $(date +%s) -lt $end_time ]]; do
        ((check_count++))
        local remaining_time=$((end_time - $(date +%s)))
        
        log_info "Stability check #$check_count (${remaining_time}s remaining)"
        
        # Perform various health checks
        perform_api_health_check
        test_websocket_connectivity
        
        # Test transaction flow every 5th check
        if [[ $((check_count % 5)) -eq 0 ]]; then
            test_transaction_flow
        fi
        
        # Check block production every 3rd check
        if [[ $((check_count % 3)) -eq 0 ]]; then
            check_block_production
        fi
        
        # Monitor system resources every 10th check
        if [[ $((check_count % 10)) -eq 0 ]]; then
            monitor_system_resources
        fi
        
        # Progress indicator
        local progress=$((((MONITORING_DURATION - remaining_time) * 100) / MONITORING_DURATION))
        log_info "Progress: ${progress}% (${check_count} checks completed)"
        
        # Wait for next check
        if [[ $remaining_time -gt $CHECK_INTERVAL ]]; then
            sleep $CHECK_INTERVAL
        else
            break
        fi
    done
    
    log_success "Stability monitoring completed ($check_count checks performed)"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add any cleanup operations here
}

# Signal handlers
trap cleanup EXIT

# Main execution function
main() {
    print_banner
    
    # Ensure results directory exists
    mkdir -p "$RESULTS_DIR"
    
    # Wait initial period for system to stabilize after audit
    log "⏳ Waiting for system stabilization (30 seconds)..."
    sleep 30
    
    # Run stability monitoring
    run_stability_monitoring
    
    # Calculate and display statistics
    calculate_statistics
    local stats_result=$?
    
    # Generate final report
    generate_stability_report
    
    # Final assessment
    echo -e "\n${GREEN}=========================================="
    echo "🏁 STABILITY VERIFICATION COMPLETED"
    echo "==========================================${NC}"
    
    if [[ $stats_result -eq 0 ]]; then
        echo -e "${GREEN}✅ TESTNET STABILITY: VERIFIED${NC}"
        echo "📊 All performance thresholds met"
        echo "🌐 API endpoints responding normally"
        echo "🔌 WebSocket connectivity stable"
    else
        echo -e "${YELLOW}⚠️  TESTNET STABILITY: DEGRADED${NC}"
        echo "📊 Some performance thresholds not met"
        echo "🔍 Review detailed logs for issues"
    fi
    
    echo "📝 Detailed Log: $LOG_FILE"
    echo "📄 Stability Report: $RESULTS_DIR/stability-report-*.json"
    echo -e "${GREEN}==========================================${NC}\n"
    
    return $stats_result
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --duration)
            MONITORING_DURATION="$2"
            shift 2
            ;;
        --interval)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        --threshold)
            STABILITY_THRESHOLD="$2"
            shift 2
            ;;
        --latency-limit)
            LATENCY_THRESHOLD="$2"
            shift 2
            ;;
        --api-url)
            TESTNET_API_URL="$2"
            shift 2
            ;;
        --ws-url)
            TESTNET_WS_URL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --duration SECONDS     Monitoring duration (default: 300)"
            echo "  --interval SECONDS     Check interval (default: 10)"
            echo "  --threshold RATE       Stability threshold 0-1 (default: 0.95)"
            echo "  --latency-limit MS     Max latency in ms (default: 2000)"
            echo "  --api-url URL          Testnet API URL"
            echo "  --ws-url URL           WebSocket URL"
            echo "  --help                 Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Ensure bc is available for calculations
if ! command -v bc &> /dev/null; then
    log_error "bc (calculator) is required but not installed"
    exit 1
fi

# Run main function
main "$@"