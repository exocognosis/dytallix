#!/bin/bash

# =============================================================================
# DYTALLIX COMPREHENSIVE TESTNET DEPLOYMENT ORCHESTRATOR
# =============================================================================
# 
# Master orchestration script that provides a unified interface for the
# complete testnet deployment, monitoring, and validation workflow.
# This script coordinates all the individual components for a seamless
# end-to-end deployment experience.
#
# Features:
# - Unified workflow orchestration
# - Automated dependency checking
# - Comprehensive deployment validation
# - Real-time monitoring integration
# - Automated reporting and logging
# - Recovery and rollback capabilities
#
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ORCHESTRATION_LOG="$LOG_DIR/orchestration_${TIMESTAMP}.log"

# Workflow configuration
DEPLOYMENT_TIMEOUT=600     # 10 minutes
HEALTH_CHECK_TIMEOUT=300   # 5 minutes
MONITORING_STARTUP_WAIT=60 # 1 minute

# Performance targets
TARGET_TPS=1000
TARGET_BLOCK_TIME=2
TARGET_AVAILABILITY=99.5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Workflow tracking
WORKFLOW_STEPS=(
    "Prerequisites Validation"
    "Environment Setup"
    "Testnet Deployment"
    "Health Validation"
    "Performance Monitoring"
    "Integration Testing"
    "Log Collection"
    "Final Reporting"
)

COMPLETED_STEPS=()
FAILED_STEPS=()

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${level}[${timestamp}]${NC} $message" | tee -a "$ORCHESTRATION_LOG"
}

log_info() {
    log "${GREEN}[INFO]" "$@"
}

log_warn() {
    log "${YELLOW}[WARN]" "$@"
}

log_error() {
    log "${RED}[ERROR]" "$@"
}

log_step() {
    log "${BLUE}[STEP]" "$@"
}

log_success() {
    log "${GREEN}[SUCCESS]" "$@"
}

log_workflow() {
    log "${CYAN}[WORKFLOW]" "$@"
}

# Workflow management
mark_step_completed() {
    local step="$1"
    COMPLETED_STEPS+=("$step")
    log_success "✅ Completed: $step"
}

mark_step_failed() {
    local step="$1"
    local reason="${2:-Unknown failure}"
    FAILED_STEPS+=("$step")
    log_error "❌ Failed: $step - $reason"
}

show_workflow_progress() {
    echo
    log_workflow "=== WORKFLOW PROGRESS ==="
    
    for step in "${WORKFLOW_STEPS[@]}"; do
        if [[ " ${COMPLETED_STEPS[*]} " =~ " ${step} " ]]; then
            log_workflow "✅ $step"
        elif [[ " ${FAILED_STEPS[*]} " =~ " ${step} " ]]; then
            log_workflow "❌ $step"
        else
            log_workflow "⏳ $step"
        fi
    done
    
    log_workflow "========================"
    echo
}

# Setup orchestration environment
setup_orchestration_environment() {
    log_step "Setting up orchestration environment..."
    
    # Create directories
    mkdir -p "$LOG_DIR"
    
    # Initialize orchestration log
    echo "# Dytallix Comprehensive Testnet Deployment Orchestration" > "$ORCHESTRATION_LOG"
    echo "# Started at: $(date -Iseconds)" >> "$ORCHESTRATION_LOG"
    echo "# Orchestration ID: orchestration-${TIMESTAMP}" >> "$ORCHESTRATION_LOG"
    
    log_success "Orchestration environment setup completed"
}

# Prerequisites validation
validate_prerequisites() {
    log_step "Validating prerequisites and dependencies..."
    
    local missing_deps=()
    local missing_scripts=()
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "curl" "jq")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    # Check required scripts
    local required_scripts=(
        "scripts/execute-testnet-deployment.sh"
        "scripts/validate-testnet-health.sh"
        "scripts/monitor-testnet-performance.sh"
        "scripts/collect-deployment-logs.sh"
        "scripts/run-integration-tests.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [[ ! -x "$PROJECT_ROOT/$script" ]]; then
            missing_scripts+=("$script")
        fi
    done
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        missing_deps+=("docker-daemon")
    fi
    
    # Validate results
    if [[ ${#missing_deps[@]} -gt 0 || ${#missing_scripts[@]} -gt 0 ]]; then
        log_error "Prerequisites validation failed!"
        
        if [[ ${#missing_deps[@]} -gt 0 ]]; then
            log_error "Missing dependencies: ${missing_deps[*]}"
        fi
        
        if [[ ${#missing_scripts[@]} -gt 0 ]]; then
            log_error "Missing or non-executable scripts: ${missing_scripts[*]}"
        fi
        
        mark_step_failed "Prerequisites Validation" "Missing dependencies or scripts"
        return 1
    fi
    
    mark_step_completed "Prerequisites Validation"
    return 0
}

# Environment setup
setup_environment() {
    log_step "Setting up deployment environment..."
    
    # Export configuration for child scripts
    export TARGET_TPS
    export TARGET_BLOCK_TIME
    export TARGET_AVAILABILITY
    export DEBUG="${DEBUG:-false}"
    
    # Create deployment directories
    mkdir -p "$PROJECT_ROOT/deployment/docker/secrets"
    mkdir -p "$PROJECT_ROOT/deployment/docker/monitoring"
    
    # Verify configuration files exist
    local config_files=(
        "deployment/docker/docker-compose.testnet.yml"
        "deployment/docker/monitoring/prometheus.yml"
        "deployment/docker/monitoring/alert_rules.yml"
    )
    
    for config_file in "${config_files[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$config_file" ]]; then
            log_error "Missing configuration file: $config_file"
            mark_step_failed "Environment Setup" "Missing configuration files"
            return 1
        fi
    done
    
    mark_step_completed "Environment Setup"
    return 0
}

# Execute testnet deployment
execute_deployment() {
    log_step "Executing testnet deployment..."
    
    local deployment_start=$(date +%s)
    
    # Run deployment script
    if timeout $DEPLOYMENT_TIMEOUT "$PROJECT_ROOT/scripts/execute-testnet-deployment.sh" ${DEBUG:+--debug}; then
        local deployment_end=$(date +%s)
        local deployment_duration=$((deployment_end - deployment_start))
        
        log_success "Testnet deployment completed in ${deployment_duration}s"
        mark_step_completed "Testnet Deployment"
        return 0
    else
        local exit_code=$?
        
        if [[ $exit_code -eq 124 ]]; then
            log_error "Deployment timed out after ${DEPLOYMENT_TIMEOUT}s"
            mark_step_failed "Testnet Deployment" "Deployment timeout"
        else
            log_error "Deployment failed with exit code: $exit_code"
            mark_step_failed "Testnet Deployment" "Deployment script failure"
        fi
        
        return 1
    fi
}

# Validate testnet health
validate_health() {
    log_step "Validating testnet health..."
    
    # Wait for services to stabilize
    log_info "Waiting ${MONITORING_STARTUP_WAIT}s for services to stabilize..."
    sleep $MONITORING_STARTUP_WAIT
    
    # Run health validation
    if timeout $HEALTH_CHECK_TIMEOUT "$PROJECT_ROOT/scripts/validate-testnet-health.sh" ${DEBUG:+--debug}; then
        log_success "Health validation passed"
        mark_step_completed "Health Validation"
        return 0
    else
        local exit_code=$?
        
        if [[ $exit_code -eq 124 ]]; then
            log_error "Health validation timed out after ${HEALTH_CHECK_TIMEOUT}s"
            mark_step_failed "Health Validation" "Health check timeout"
        else
            log_error "Health validation failed with exit code: $exit_code"
            mark_step_failed "Health Validation" "Health check failure"
        fi
        
        return 1
    fi
}

# Start performance monitoring
start_performance_monitoring() {
    log_step "Starting performance monitoring..."
    
    # Start monitoring in background
    if "$PROJECT_ROOT/scripts/monitor-testnet-performance.sh" ${DEBUG:+--debug} &>/dev/null &
    then
        local monitoring_pid=$!
        echo "$monitoring_pid" > "$LOG_DIR/monitoring.pid"
        
        log_success "Performance monitoring started (PID: $monitoring_pid)"
        mark_step_completed "Performance Monitoring"
        return 0
    else
        log_error "Failed to start performance monitoring"
        mark_step_failed "Performance Monitoring" "Monitoring startup failure"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    log_step "Running integration tests..."
    
    # Run integration test suite
    if "$PROJECT_ROOT/scripts/run-integration-tests.sh" ${DEBUG:+--debug} ${LOAD_TEST:+--load-test}; then
        log_success "Integration tests passed"
        mark_step_completed "Integration Testing"
        return 0
    else
        local exit_code=$?
        log_error "Integration tests failed with exit code: $exit_code"
        mark_step_failed "Integration Testing" "Test failures detected"
        return 1
    fi
}

# Collect deployment logs
collect_logs() {
    log_step "Collecting deployment logs..."
    
    # Run log collection
    if "$PROJECT_ROOT/scripts/collect-deployment-logs.sh" ${DEBUG:+--debug}; then
        log_success "Log collection completed"
        mark_step_completed "Log Collection"
        return 0
    else
        local exit_code=$?
        log_error "Log collection failed with exit code: $exit_code"
        mark_step_failed "Log Collection" "Log collection failure"
        return 1
    fi
}

# Generate final report
generate_final_report() {
    log_step "Generating final deployment report..."
    
    local report_file="$LOG_DIR/final_deployment_report_${TIMESTAMP}.json"
    local completed_count=${#COMPLETED_STEPS[@]}
    local failed_count=${#FAILED_STEPS[@]}
    local total_count=${#WORKFLOW_STEPS[@]}
    local success_rate=$(( (completed_count * 100) / total_count ))
    
    # Create comprehensive report
    local final_report="{
        \"orchestration_id\": \"orchestration-${TIMESTAMP}\",
        \"timestamp\": \"$(date -Iseconds)\",
        \"workflow\": {
            \"total_steps\": $total_count,
            \"completed_steps\": $completed_count,
            \"failed_steps\": $failed_count,
            \"success_rate\": $success_rate,
            \"status\": \"$([ $failed_count -eq 0 ] && echo 'success' || echo 'failed')\"
        },
        \"configuration\": {
            \"target_tps\": $TARGET_TPS,
            \"target_block_time\": $TARGET_BLOCK_TIME,
            \"target_availability\": $TARGET_AVAILABILITY
        },
        \"completed_steps\": [],
        \"failed_steps\": [],
        \"artifacts\": {
            \"orchestration_log\": \"$ORCHESTRATION_LOG\",
            \"log_directory\": \"$LOG_DIR\"
        }
    }"
    
    # Add completed steps
    local completed_steps_json="[]"
    for step in "${COMPLETED_STEPS[@]}"; do
        completed_steps_json=$(echo "$completed_steps_json" | jq ". += [\"$step\"]")
    done
    
    # Add failed steps
    local failed_steps_json="[]"
    for step in "${FAILED_STEPS[@]}"; do
        failed_steps_json=$(echo "$failed_steps_json" | jq ". += [\"$step\"]")
    done
    
    # Update report
    final_report=$(echo "$final_report" | jq ".completed_steps = $completed_steps_json")
    final_report=$(echo "$final_report" | jq ".failed_steps = $failed_steps_json")
    
    # Write report
    echo "$final_report" | jq '.' > "$report_file"
    
    log_success "Final deployment report generated: $report_file"
    mark_step_completed "Final Reporting"
    
    # Display summary
    log_info "=== FINAL DEPLOYMENT SUMMARY ==="
    log_info "Orchestration ID: orchestration-${TIMESTAMP}"
    log_info "Total Steps: $total_count"
    log_info "Completed: $completed_count"
    log_info "Failed: $failed_count"
    log_info "Success Rate: $success_rate%"
    log_info "Status: $([ $failed_count -eq 0 ] && echo 'SUCCESS' || echo 'FAILED')"
    log_info "Report: $report_file"
    log_info "==============================="
}

# Cleanup and shutdown
cleanup_on_exit() {
    log_info "Performing cleanup..."
    
    # Stop background monitoring if running
    if [[ -f "$LOG_DIR/monitoring.pid" ]]; then
        local monitoring_pid=$(cat "$LOG_DIR/monitoring.pid")
        if kill -0 "$monitoring_pid" 2>/dev/null; then
            log_info "Stopping background monitoring (PID: $monitoring_pid)..."
            kill "$monitoring_pid" 2>/dev/null || true
        fi
        rm -f "$LOG_DIR/monitoring.pid"
    fi
    
    log_info "Cleanup completed"
}

# Recovery function for failed deployments
attempt_recovery() {
    log_warn "Attempting deployment recovery..."
    
    # Stop any running containers
    if command -v docker-compose &> /dev/null; then
        cd "$PROJECT_ROOT/deployment/docker"
        docker-compose -f docker-compose.testnet.yml down 2>/dev/null || true
        cd - > /dev/null
    fi
    
    # Wait a moment
    sleep 5
    
    log_info "Recovery attempt completed. You may retry deployment."
}

# Main orchestration workflow
main() {
    echo -e "${BOLD}${CYAN}🚀 DYTALLIX COMPREHENSIVE TESTNET DEPLOYMENT ORCHESTRATOR${NC}"
    echo -e "${BOLD}${CYAN}============================================================${NC}"
    echo
    
    log_info "Starting comprehensive testnet deployment orchestration..."
    log_info "Orchestration ID: orchestration-${TIMESTAMP}"
    log_info "Performance Targets:"
    log_info "  TPS: >$TARGET_TPS"
    log_info "  Block Time: <${TARGET_BLOCK_TIME}s"
    log_info "  Availability: >${TARGET_AVAILABILITY}%"
    echo
    
    # Setup orchestration environment
    setup_orchestration_environment
    
    # Setup trap for cleanup
    trap cleanup_on_exit EXIT
    
    # Execute workflow steps
    local workflow_failed=false
    
    # Step 1: Prerequisites Validation
    if ! validate_prerequisites; then
        workflow_failed=true
    fi
    show_workflow_progress
    
    # Step 2: Environment Setup
    if [[ $workflow_failed == false ]] && ! setup_environment; then
        workflow_failed=true
    fi
    show_workflow_progress
    
    # Step 3: Testnet Deployment
    if [[ $workflow_failed == false ]] && ! execute_deployment; then
        workflow_failed=true
        
        if [[ "${RECOVERY:-false}" == "true" ]]; then
            attempt_recovery
        fi
    fi
    show_workflow_progress
    
    # Step 4: Health Validation
    if [[ $workflow_failed == false ]] && ! validate_health; then
        workflow_failed=true
    fi
    show_workflow_progress
    
    # Step 5: Performance Monitoring (optional failure)
    if [[ $workflow_failed == false ]]; then
        start_performance_monitoring || log_warn "Performance monitoring failed but continuing..."
    fi
    show_workflow_progress
    
    # Step 6: Integration Testing
    if [[ $workflow_failed == false ]] && ! run_integration_tests; then
        workflow_failed=true
    fi
    show_workflow_progress
    
    # Step 7: Log Collection (always run)
    collect_logs || log_warn "Log collection failed but continuing..."
    show_workflow_progress
    
    # Step 8: Final Reporting (always run)
    generate_final_report
    show_workflow_progress
    
    # Final status
    echo
    if [[ $workflow_failed == false ]]; then
        log_success "🎉 Comprehensive testnet deployment completed successfully!"
        log_info "Testnet is ready for production use"
        log_info "Access points:"
        log_info "  Grafana Dashboard: http://localhost:3000 (admin/dytallix_testnet_admin)"
        log_info "  Prometheus Metrics: http://localhost:9093"
        log_info "  Node APIs: http://localhost:3030, http://localhost:3032, http://localhost:3034"
        echo
        exit 0
    else
        log_error "❌ Testnet deployment failed with errors"
        log_info "Check the orchestration log for details: $ORCHESTRATION_LOG"
        log_info "Failed steps: ${FAILED_STEPS[*]}"
        echo
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --debug)
            DEBUG=true
            shift
            ;;
        --load-test)
            LOAD_TEST=true
            shift
            ;;
        --recovery)
            RECOVERY=true
            shift
            ;;
        --target-tps)
            TARGET_TPS="$2"
            shift 2
            ;;
        --target-block-time)
            TARGET_BLOCK_TIME="$2"
            shift 2
            ;;
        --help|-h)
            echo "Dytallix Comprehensive Testnet Deployment Orchestrator"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --debug              Enable debug logging"
            echo "  --load-test          Include load testing in workflow"
            echo "  --recovery           Enable automatic recovery on failure"
            echo "  --target-tps N       Set target TPS (default: $TARGET_TPS)"
            echo "  --target-block-time N Set target block time (default: $TARGET_BLOCK_TIME)"
            echo "  --help               Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DEBUG                Enable debug logging (true/false)"
            echo "  LOAD_TEST            Enable load testing (true/false)"
            echo "  RECOVERY             Enable recovery mode (true/false)"
            echo ""
            echo "Workflow Steps:"
            for i in "${!WORKFLOW_STEPS[@]}"; do
                echo "  $((i+1)). ${WORKFLOW_STEPS[$i]}"
            done
            echo ""
            echo "This orchestrator provides a unified interface for complete testnet deployment,"
            echo "including automated validation, monitoring, and reporting."
            echo ""
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Run main orchestration workflow
main