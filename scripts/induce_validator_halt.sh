#!/bin/bash

# Dytallix Validator Halt Inducer
# This script temporarily stops a validator to test alerting and recovery

set -euo pipefail

# Configuration
VALIDATOR_INDEX="${1:-0}"
HALT_DURATION="${2:-30}"  # seconds
TEST_NAME="${3:-validator-halt-test}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to find validator container or process
find_validator() {
    local validator_name="dyt-validator-${VALIDATOR_INDEX}"
    
    # Try Docker container first
    if docker ps --format "table {{.Names}}" | grep -q "^${validator_name}$"; then
        echo "docker:${validator_name}"
        return 0
    fi
    
    # Try process by name pattern
    local pid=$(pgrep -f "dytallix.*validator.*${VALIDATOR_INDEX}" | head -n1)
    if [[ -n "$pid" ]]; then
        echo "process:${pid}"
        return 0
    fi
    
    return 1
}

# Function to stop validator
stop_validator() {
    local validator_target="$1"
    
    if [[ "$validator_target" == docker:* ]]; then
        local container_name="${validator_target#docker:}"
        log_step "Stopping Docker container: $container_name"
        docker stop "$container_name"
        return 0
    elif [[ "$validator_target" == process:* ]]; then
        local pid="${validator_target#process:}"
        log_step "Stopping process: $pid"
        kill -TERM "$pid"
        return 0
    fi
    
    return 1
}

# Function to start validator
start_validator() {
    local validator_target="$1"
    
    if [[ "$validator_target" == docker:* ]]; then
        local container_name="${validator_target#docker:}"
        log_step "Starting Docker container: $container_name"
        docker start "$container_name"
        return 0
    elif [[ "$validator_target" == process:* ]]; then
        log_warn "Cannot automatically restart process. Manual intervention required."
        log_info "Please restart the validator process manually"
        return 1
    fi
    
    return 1
}

# Function to check validator status
check_validator_status() {
    local validator_target="$1"
    
    if [[ "$validator_target" == docker:* ]]; then
        local container_name="${validator_target#docker:}"
        if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
            echo "running"
        else
            echo "stopped"
        fi
    elif [[ "$validator_target" == process:* ]]; then
        local pid="${validator_target#process:}"
        if kill -0 "$pid" 2>/dev/null; then
            echo "running"
        else
            echo "stopped"
        fi
    fi
}

# Function to check metrics endpoint
check_metrics_endpoint() {
    local port="$((9464 + VALIDATOR_INDEX))"
    local url="http://localhost:${port}/metrics"
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

# Function to run the halt test
run_halt_test() {
    log_step "Starting validator halt test: $TEST_NAME"
    log_info "Target validator: $VALIDATOR_INDEX"
    log_info "Halt duration: ${HALT_DURATION}s"
    
    # Find the validator
    log_step "Finding validator..."
    if ! validator_target=$(find_validator); then
        log_error "Could not find validator $VALIDATOR_INDEX"
        log_info "Available containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(dyt-validator|dytallix)"
        exit 1
    fi
    
    log_info "Found validator: $validator_target"
    
    # Check initial status
    initial_status=$(check_validator_status "$validator_target")
    initial_metrics=$(check_metrics_endpoint)
    
    log_info "Initial status: $initial_status"
    log_info "Initial metrics endpoint: $initial_metrics"
    
    if [[ "$initial_status" != "running" ]]; then
        log_error "Validator is not running. Cannot perform halt test."
        exit 1
    fi
    
    # Record test start time
    test_start_time=$(date +%s)
    
    # Stop the validator
    log_step "Stopping validator..."
    if ! stop_validator "$validator_target"; then
        log_error "Failed to stop validator"
        exit 1
    fi
    
    log_info "Validator stopped. Waiting ${HALT_DURATION}s..."
    
    # Monitor during halt period
    halt_start_time=$(date +%s)
    while (( $(date +%s) - halt_start_time < HALT_DURATION )); do
        sleep 5
        elapsed=$(($(date +%s) - halt_start_time))
        remaining=$((HALT_DURATION - elapsed))
        
        validator_status=$(check_validator_status "$validator_target")
        metrics_status=$(check_metrics_endpoint)
        
        log_info "Halt progress: ${elapsed}s/${HALT_DURATION}s (${remaining}s remaining) - Status: $validator_status, Metrics: $metrics_status"
        
        # If validator somehow came back online, note it
        if [[ "$validator_status" == "running" ]]; then
            log_warn "Validator came back online unexpectedly!"
        fi
    done
    
    # Restart the validator
    log_step "Restarting validator..."
    if ! start_validator "$validator_target"; then
        log_error "Failed to restart validator - manual intervention required"
        exit 1
    fi
    
    # Wait for validator to be fully online
    log_step "Waiting for validator to come online..."
    recovery_start_time=$(date +%s)
    max_recovery_time=60  # 60 seconds max recovery time
    
    while (( $(date +%s) - recovery_start_time < max_recovery_time )); do
        sleep 2
        validator_status=$(check_validator_status "$validator_target")
        metrics_status=$(check_metrics_endpoint)
        
        if [[ "$validator_status" == "running" && "$metrics_status" == "healthy" ]]; then
            recovery_time=$(($(date +%s) - recovery_start_time))
            log_info "Validator recovered in ${recovery_time}s"
            break
        fi
        
        elapsed=$(($(date +%s) - recovery_start_time))
        log_info "Recovery progress: ${elapsed}s - Status: $validator_status, Metrics: $metrics_status"
    done
    
    # Final status check
    final_status=$(check_validator_status "$validator_target")
    final_metrics=$(check_metrics_endpoint)
    total_test_time=$(($(date +%s) - test_start_time))
    
    log_step "Test completed in ${total_test_time}s"
    log_info "Final status: $final_status"
    log_info "Final metrics endpoint: $final_metrics"
    
    # Generate test report
    generate_test_report "$test_start_time" "$total_test_time" "$final_status" "$final_metrics"
    
    if [[ "$final_status" == "running" && "$final_metrics" == "healthy" ]]; then
        log_info "✅ Validator halt test completed successfully"
        exit 0
    else
        log_error "❌ Validator halt test failed - validator did not recover properly"
        exit 1
    fi
}

# Function to generate a test report
generate_test_report() {
    local start_time="$1"
    local duration="$2" 
    local final_status="$3"
    local final_metrics="$4"
    
    local report_file="/tmp/validator-halt-test-$(date +%Y%m%d-%H%M%S).log"
    
    cat > "$report_file" << EOF
Dytallix Validator Halt Test Report
===================================

Test Name: $TEST_NAME
Validator Index: $VALIDATOR_INDEX
Start Time: $(date -d "@$start_time" '+%Y-%m-%d %H:%M:%S')
Duration: ${duration}s
Halt Duration: ${HALT_DURATION}s

Results:
- Final Validator Status: $final_status
- Final Metrics Status: $final_metrics
- Test Result: $(if [[ "$final_status" == "running" && "$final_metrics" == "healthy" ]]; then echo "PASS"; else echo "FAIL"; fi)

Expected Alerts:
- ValidatorDown should have triggered after 2 minutes
- BlockProductionStall may have triggered if quorum was lost

Next Steps:
1. Check Prometheus alerts at http://localhost:9090/alerts
2. Check Grafana dashboards at http://localhost:3000
3. Verify alert notifications were sent
4. Review validator logs for any issues during recovery

EOF

    log_info "Test report generated: $report_file"
    cat "$report_file"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [validator_index] [halt_duration] [test_name]

Parameters:
  validator_index  - Index of validator to halt (default: 0)
  halt_duration    - Duration to halt validator in seconds (default: 30)
  test_name        - Name for this test run (default: validator-halt-test)

Examples:
  $0                           # Halt validator 0 for 30 seconds
  $0 1 60                      # Halt validator 1 for 60 seconds  
  $0 2 120 "extended-test"     # Halt validator 2 for 2 minutes

Notes:
  - This script can work with Docker containers or processes
  - Validator containers should be named: dyt-validator-{index}
  - Metrics endpoints are expected at ports 9464 + validator_index
  - Alerts should trigger: ValidatorDown (after 2min), possibly BlockProductionStall

EOF
}

# Main function
main() {
    if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
        show_usage
        exit 0
    fi
    
    # Validate parameters
    if ! [[ "$VALIDATOR_INDEX" =~ ^[0-9]+$ ]]; then
        log_error "Validator index must be a number"
        exit 1
    fi
    
    if ! [[ "$HALT_DURATION" =~ ^[0-9]+$ ]]; then
        log_error "Halt duration must be a number"
        exit 1
    fi
    
    if (( HALT_DURATION < 5 )); then
        log_error "Halt duration must be at least 5 seconds"
        exit 1
    fi
    
    run_halt_test
}

main "$@"