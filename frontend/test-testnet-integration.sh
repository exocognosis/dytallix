#!/bin/bash

# Dytallix Frontend Testnet Integration Test Automation Script
# This script runs comprehensive tests for testnet integration

set -euo pipefail

# Configuration
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$FRONTEND_DIR/testnet-integration-test.log"
REPORT_FILE="$FRONTEND_DIR/testnet-integration-report.json"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Initialize test results
TEST_RESULTS='{
  "timestamp": "'$TIMESTAMP'",
  "environment": "testnet",
  "tests": {
    "build": {"status": "pending", "duration": 0, "error": null},
    "unit_tests": {"status": "pending", "duration": 0, "error": null},
    "integration_tests": {"status": "pending", "duration": 0, "error": null},
    "lint": {"status": "pending", "duration": 0, "error": null},
    "type_check": {"status": "pending", "duration": 0, "error": null}
  },
  "summary": {
    "total": 5,
    "passed": 0,
    "failed": 0,
    "duration": 0
  }
}'

# Function to update test results
update_test_result() {
    local test_name="$1"
    local status="$2"
    local duration="$3"
    local error="$4"
    
    TEST_RESULTS=$(echo "$TEST_RESULTS" | jq ".tests.$test_name.status = \"$status\" | .tests.$test_name.duration = $duration | .tests.$test_name.error = \"$error\"")
    
    if [ "$status" = "passed" ]; then
        TEST_RESULTS=$(echo "$TEST_RESULTS" | jq '.summary.passed += 1')
    elif [ "$status" = "failed" ]; then
        TEST_RESULTS=$(echo "$TEST_RESULTS" | jq '.summary.failed += 1')
    fi
}

# Function to run a test with timing
run_test() {
    local test_name="$1"
    local test_command="$2"
    local description="$3"
    
    log_step "$description"
    
    local start_time=$(date +%s)
    
    if eval "$test_command" >> "$LOG_FILE" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_info "✅ $description - PASSED (${duration}s)"
        update_test_result "$test_name" "passed" "$duration" "null"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        local error="Test failed after ${duration}s"
        
        log_error "❌ $description - FAILED (${duration}s)"
        update_test_result "$test_name" "failed" "$duration" "$error"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if jq is installed for JSON processing
    if ! command -v jq &> /dev/null; then
        log_warn "jq is not installed - installing via npm"
        npm install -g jq || {
            log_error "Failed to install jq"
            exit 1
        }
    fi
    
    log_info "✅ Prerequisites check passed"
}

# Function to setup test environment
setup_test_environment() {
    log_step "Setting up test environment..."
    
    # Navigate to frontend directory
    cd "$FRONTEND_DIR"
    
    # Clean previous builds
    rm -rf dist dist-* node_modules/.cache
    log_info "Cleaned previous builds and cache"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm ci
    fi
    
    # Create log directory
    mkdir -p logs
    
    log_info "✅ Test environment setup complete"
}

# Function to run comprehensive tests
run_comprehensive_tests() {
    log_step "Running comprehensive testnet integration tests..."
    
    local overall_start_time=$(date +%s)
    local failed_tests=0
    
    # Test 1: TypeScript Type Checking
    if ! run_test "type_check" "npx tsc --noEmit" "TypeScript type checking"; then
        ((failed_tests++))
    fi
    
    # Test 2: ESLint Code Quality
    if ! run_test "lint" "npm run lint" "ESLint code quality check"; then
        ((failed_tests++))
    fi
    
    # Test 3: Build for Development
    if ! run_test "build" "npm run build:testnet" "Testnet build compilation"; then
        ((failed_tests++))
    fi
    
    # Test 4: Unit Tests
    if ! run_test "unit_tests" "npm run test -- --run --reporter=verbose" "Unit tests execution"; then
        ((failed_tests++))
    fi
    
    # Test 5: Integration Tests
    if ! run_test "integration_tests" "npm run test:integration" "Integration tests execution"; then
        ((failed_tests++))
    fi
    
    local overall_end_time=$(date +%s)
    local total_duration=$((overall_end_time - overall_start_time))
    
    # Update summary
    TEST_RESULTS=$(echo "$TEST_RESULTS" | jq ".summary.duration = $total_duration")
    
    log_info "📊 Test execution completed in ${total_duration}s"
    
    return $failed_tests
}

# Function to generate detailed report
generate_report() {
    log_step "Generating test report..."
    
    # Save JSON report
    echo "$TEST_RESULTS" | jq '.' > "$REPORT_FILE"
    
    # Generate human-readable summary
    local passed=$(echo "$TEST_RESULTS" | jq -r '.summary.passed')
    local failed=$(echo "$TEST_RESULTS" | jq -r '.summary.failed')
    local total=$(echo "$TEST_RESULTS" | jq -r '.summary.total')
    local duration=$(echo "$TEST_RESULTS" | jq -r '.summary.duration')
    
    cat << EOF | tee -a "$LOG_FILE"

======================================================================
                    DYTALLIX TESTNET INTEGRATION TEST REPORT
======================================================================
Timestamp: $TIMESTAMP
Environment: testnet
Total Duration: ${duration}s

SUMMARY:
  ✅ Passed: $passed/$total
  ❌ Failed: $failed/$total
  📊 Success Rate: $(echo "scale=1; $passed * 100 / $total" | bc -l)%

TEST DETAILS:
EOF

    # Print individual test results
    echo "$TEST_RESULTS" | jq -r '.tests | to_entries[] | "  " + .key + ": " + .value.status + " (" + (.value.duration | tostring) + "s)"' | tee -a "$LOG_FILE"
    
    echo "" | tee -a "$LOG_FILE"
    echo "Full report saved to: $REPORT_FILE" | tee -a "$LOG_FILE"
    echo "Detailed logs saved to: $LOG_FILE" | tee -a "$LOG_FILE"
    echo "======================================================================"
}

# Function to run testnet connectivity tests
test_testnet_connectivity() {
    log_step "Testing testnet connectivity..."
    
    # Test if testnet endpoints are reachable (if they exist)
    local endpoints=(
        "https://testnet-api.dytallix.io/health"
        "https://testnet-ai.dytallix.io/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s --max-time 10 "$endpoint" > /dev/null 2>&1; then
            log_info "✅ Endpoint reachable: $endpoint"
        else
            log_warn "⚠️ Endpoint not reachable (expected for local testing): $endpoint"
        fi
    done
}

# Function to validate build artifacts
validate_build_artifacts() {
    log_step "Validating build artifacts..."
    
    local build_dir="dist-testnet"
    
    if [ -d "$build_dir" ]; then
        # Check if index.html exists
        if [ -f "$build_dir/index.html" ]; then
            log_info "✅ index.html found in build"
        else
            log_error "❌ index.html missing from build"
            return 1
        fi
        
        # Check if assets directory exists
        if [ -d "$build_dir/assets" ]; then
            log_info "✅ Assets directory found in build"
            
            # Count asset files
            local js_files=$(find "$build_dir/assets" -name "*.js" | wc -l)
            local css_files=$(find "$build_dir/assets" -name "*.css" | wc -l)
            
            log_info "📊 Build contains $js_files JS files and $css_files CSS files"
            
            if [ "$js_files" -gt 0 ] && [ "$css_files" -gt 0 ]; then
                log_info "✅ Build artifacts validation passed"
                return 0
            else
                log_error "❌ Missing JS or CSS files in build"
                return 1
            fi
        else
            log_error "❌ Assets directory missing from build"
            return 1
        fi
    else
        log_error "❌ Build directory $build_dir not found"
        return 1
    fi
}

# Function to check environment configuration
check_environment_config() {
    log_step "Checking environment configuration..."
    
    local env_files=(".env.development" ".env.testnet" ".env.production")
    
    for env_file in "${env_files[@]}"; do
        if [ -f "$env_file" ]; then
            log_info "✅ Environment file found: $env_file"
            
            # Check if required variables are present
            local required_vars=("VITE_ENVIRONMENT" "VITE_BLOCKCHAIN_API_URL" "VITE_AI_API_URL" "VITE_WEBSOCKET_URL")
            
            for var in "${required_vars[@]}"; do
                if grep -q "^$var=" "$env_file"; then
                    log_info "  ✅ $var configured in $env_file"
                else
                    log_warn "  ⚠️ $var missing from $env_file"
                fi
            done
        else
            log_warn "⚠️ Environment file missing: $env_file"
        fi
    done
}

# Main execution
main() {
    echo "🚀 Starting Dytallix Frontend Testnet Integration Tests"
    echo "================================================"
    
    # Initialize log file
    echo "Dytallix Frontend Testnet Integration Test Log - $TIMESTAMP" > "$LOG_FILE"
    
    # Run test phases
    check_prerequisites
    setup_test_environment
    check_environment_config
    test_testnet_connectivity
    
    # Run main test suite
    local test_failures=0
    if ! run_comprehensive_tests; then
        test_failures=$?
    fi
    
    # Validate build if it exists
    if ! validate_build_artifacts; then
        ((test_failures++))
    fi
    
    # Generate final report
    generate_report
    
    # Exit with appropriate code
    if [ $test_failures -eq 0 ]; then
        log_info "🎉 All tests passed! Testnet integration is ready."
        exit 0
    else
        log_error "💥 $test_failures test(s) failed. Please check the report for details."
        exit 1
    fi
}

# Run main function
main "$@"