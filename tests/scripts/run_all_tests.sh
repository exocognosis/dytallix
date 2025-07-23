#!/bin/bash
# Comprehensive Test Runner for Dytallix API Testing Suite
# This script orchestrates all available testing tools

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$TESTS_DIR")"

# Default configuration
BASE_URL=${DYTALLIX_API_URL:-"http://localhost:3030"}
WS_URL=${DYTALLIX_WS_URL:-"ws://localhost:3030/ws"}
OUTPUT_DIR="${TESTS_DIR}/reports/$(date +%Y%m%d_%H%M%S)"
PYTHON_TESTS=true
CURL_TESTS=true
POSTMAN_TESTS=false
METRICS_COLLECTION=false
GENERATE_REPORTS=true
QUICK_MODE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
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

log_info() {
    echo -e "${PURPLE}[INFO]${NC} $1"
}

# Function to check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    local missing_deps=()
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("python3")
    fi
    
    # Check required Python packages
    if [ "$PYTHON_TESTS" = true ]; then
        if ! python3 -c "import requests" 2>/dev/null; then
            missing_deps+=("python3-requests")
        fi
        if ! python3 -c "import websockets" 2>/dev/null; then
            missing_deps+=("python3-websockets")
        fi
    fi
    
    # Check curl
    if [ "$CURL_TESTS" = true ] && ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found - JSON processing will be limited"
    fi
    
    # Check Newman for Postman tests
    if [ "$POSTMAN_TESTS" = true ] && ! command -v newman &> /dev/null; then
        log_warning "Newman not found - Postman tests will be skipped"
        POSTMAN_TESTS=false
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log "Please install missing dependencies and try again"
        exit 1
    fi
    
    log_success "All required dependencies found"
}

# Function to check API availability
check_api_availability() {
    log "Checking API availability at $BASE_URL..."
    
    local max_retries=3
    local retry_delay=5
    
    for ((i=1; i<=max_retries; i++)); do
        if curl -s --max-time 10 "$BASE_URL/health" >/dev/null 2>&1; then
            log_success "API is accessible"
            return 0
        fi
        
        if [ $i -lt $max_retries ]; then
            log_warning "API not accessible (attempt $i/$max_retries), retrying in ${retry_delay}s..."
            sleep $retry_delay
        fi
    done
    
    log_error "API is not accessible at $BASE_URL after $max_retries attempts"
    log "Please ensure the Dytallix API server is running"
    return 1
}

# Function to setup output directory
setup_output_directory() {
    log "Setting up output directory: $OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR"
    
    # Create subdirectories
    mkdir -p "$OUTPUT_DIR/python_tests"
    mkdir -p "$OUTPUT_DIR/curl_tests"
    mkdir -p "$OUTPUT_DIR/postman_tests"
    mkdir -p "$OUTPUT_DIR/metrics"
    mkdir -p "$OUTPUT_DIR/reports"
    
    log_success "Output directory created"
}

# Function to run Python tests
run_python_tests() {
    if [ "$PYTHON_TESTS" != true ]; then
        return 0
    fi
    
    log "Running Python test suite..."
    
    local python_output="$OUTPUT_DIR/python_tests/comprehensive_results.json"
    
    cd "$TESTS_DIR"
    
    if [ "$QUICK_MODE" = true ]; then
        # Run a subset of tests for quick validation
        log_info "Quick mode: Running essential tests only"
        python3 utils/test_runner.py \
            --url "$BASE_URL" \
            --ws-url "$WS_URL" \
            --output "$python_output" \
            --suites "Status API Tests" "Blocks API Tests" "Unauthorized Access Security Tests"
    else
        # Run comprehensive test suite
        python3 utils/test_runner.py \
            --url "$BASE_URL" \
            --ws-url "$WS_URL" \
            --output "$python_output"
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Python tests completed"
        return 0
    else
        log_error "Python tests failed"
        return 1
    fi
}

# Function to run cURL tests
run_curl_tests() {
    if [ "$CURL_TESTS" != true ]; then
        return 0
    fi
    
    log "Running cURL validation tests..."
    
    # Set output directory for curl tests
    export OUTPUT_DIR="$OUTPUT_DIR/curl_tests"
    
    if "$SCRIPT_DIR/curl_tests.sh" -u "$BASE_URL"; then
        log_success "cURL tests completed"
        return 0
    else
        log_error "cURL tests failed"
        return 1
    fi
}

# Function to run Postman tests
run_postman_tests() {
    if [ "$POSTMAN_TESTS" != true ]; then
        return 0
    fi
    
    log "Running Postman collection tests..."
    
    local collection_file="$TESTS_DIR/postman/dytallix_api_collection.json"
    local output_file="$OUTPUT_DIR/postman_tests/results.json"
    
    # Create environment variables for Newman
    local env_vars="{
        \"values\": [
            {\"key\": \"base_url\", \"value\": \"$BASE_URL\"},
            {\"key\": \"test_address\", \"value\": \"dyt1test123456789\"},
            {\"key\": \"tx_hash\", \"value\": \"0x1234567890abcdef\"}
        ]
    }"
    
    echo "$env_vars" > "$OUTPUT_DIR/postman_tests/environment.json"
    
    if newman run "$collection_file" \
        --environment "$OUTPUT_DIR/postman_tests/environment.json" \
        --reporters json \
        --reporter-json-export "$output_file"; then
        log_success "Postman tests completed"
        return 0
    else
        log_error "Postman tests failed"
        return 1
    fi
}

# Function to collect metrics
collect_metrics() {
    if [ "$METRICS_COLLECTION" != true ]; then
        return 0
    fi
    
    log "Collecting performance metrics..."
    
    local metrics_output="$OUTPUT_DIR/metrics/performance_metrics.json"
    local duration=60
    
    if [ "$QUICK_MODE" = true ]; then
        duration=30
    fi
    
    cd "$TESTS_DIR"
    
    if python3 utils/metrics_collector.py \
        --url "$BASE_URL" \
        --duration "$duration" \
        --output "$metrics_output"; then
        log_success "Metrics collection completed"
        return 0
    else
        log_error "Metrics collection failed"
        return 1
    fi
}

# Function to generate reports
generate_reports() {
    if [ "$GENERATE_REPORTS" != true ]; then
        return 0
    fi
    
    log "Generating comprehensive reports..."
    
    local python_results="$OUTPUT_DIR/python_tests/comprehensive_results.json"
    
    if [ -f "$python_results" ]; then
        cd "$TESTS_DIR"
        
        # Generate both HTML and Markdown reports
        python3 utils/report_generator.py \
            "$python_results" \
            --both "$OUTPUT_DIR/reports/dytallix_test_report"
        
        if [ $? -eq 0 ]; then
            log_success "Reports generated:"
            log_info "  HTML: $OUTPUT_DIR/reports/dytallix_test_report.html"
            log_info "  Markdown: $OUTPUT_DIR/reports/dytallix_test_report.md"
        else
            log_error "Report generation failed"
            return 1
        fi
    else
        log_warning "No Python test results found, skipping report generation"
    fi
}

# Function to display summary
display_summary() {
    log "Generating test execution summary..."
    
    echo ""
    echo "================================================================"
    echo "             DYTALLIX COMPREHENSIVE TEST SUMMARY"
    echo "================================================================"
    echo "Execution Time: $(date)"
    echo "Base URL: $BASE_URL"
    echo "WebSocket URL: $WS_URL"
    echo "Output Directory: $OUTPUT_DIR"
    echo ""
    
    # Check which tests were run and their status
    local tests_run=0
    local tests_passed=0
    
    if [ "$PYTHON_TESTS" = true ]; then
        tests_run=$((tests_run + 1))
        if [ -f "$OUTPUT_DIR/python_tests/comprehensive_results.json" ]; then
            tests_passed=$((tests_passed + 1))
            echo "✅ Python Test Suite: COMPLETED"
            
            # Extract key metrics from Python tests
            local python_results="$OUTPUT_DIR/python_tests/comprehensive_results.json"
            if command -v jq &> /dev/null && [ -f "$python_results" ]; then
                local overall_pass_rate
                overall_pass_rate=$(jq -r '.overall_statistics.overall_pass_rate // "N/A"' "$python_results")
                local total_tests
                total_tests=$(jq -r '.overall_statistics.total_individual_tests // "N/A"' "$python_results")
                local passed_tests
                passed_tests=$(jq -r '.overall_statistics.total_passed // "N/A"' "$python_results")
                echo "   - Individual Tests: $passed_tests/$total_tests passed ($overall_pass_rate%)"
            fi
        else
            echo "❌ Python Test Suite: FAILED"
        fi
    fi
    
    if [ "$CURL_TESTS" = true ]; then
        tests_run=$((tests_run + 1))
        if [ -d "$OUTPUT_DIR/curl_tests" ] && [ "$(ls -A "$OUTPUT_DIR/curl_tests")" ]; then
            tests_passed=$((tests_passed + 1))
            echo "✅ cURL Tests: COMPLETED"
        else
            echo "❌ cURL Tests: FAILED"
        fi
    fi
    
    if [ "$POSTMAN_TESTS" = true ]; then
        tests_run=$((tests_run + 1))
        if [ -f "$OUTPUT_DIR/postman_tests/results.json" ]; then
            tests_passed=$((tests_passed + 1))
            echo "✅ Postman Tests: COMPLETED"
        else
            echo "❌ Postman Tests: FAILED"
        fi
    fi
    
    if [ "$METRICS_COLLECTION" = true ]; then
        if [ -f "$OUTPUT_DIR/metrics/performance_metrics.json" ]; then
            echo "✅ Metrics Collection: COMPLETED"
        else
            echo "❌ Metrics Collection: FAILED"
        fi
    fi
    
    echo ""
    echo "Test Suites: $tests_passed/$tests_run completed successfully"
    
    if [ -f "$OUTPUT_DIR/reports/dytallix_test_report.html" ]; then
        echo "📊 Reports Generated:"
        echo "   - HTML Report: $OUTPUT_DIR/reports/dytallix_test_report.html"
        echo "   - Markdown Report: $OUTPUT_DIR/reports/dytallix_test_report.md"
    fi
    
    echo ""
    if [ "$tests_passed" -eq "$tests_run" ] && [ "$tests_run" -gt 0 ]; then
        log_success "All test suites completed successfully! 🎉"
    else
        log_warning "Some test suites failed. Check individual results for details."
    fi
    echo "================================================================"
}

# Function to show usage
usage() {
    echo "Dytallix Comprehensive Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL              Set API base URL (default: http://localhost:3030)"
    echo "  -w, --ws-url URL           Set WebSocket URL (default: ws://localhost:3030/ws)"
    echo "  -o, --output DIR           Set output directory"
    echo "  -q, --quick                Run in quick mode (subset of tests)"
    echo "  --no-python                Skip Python tests"
    echo "  --no-curl                  Skip cURL tests"
    echo "  --enable-postman           Enable Postman tests (requires Newman)"
    echo "  --enable-metrics           Enable metrics collection"
    echo "  --no-reports               Skip report generation"
    echo "  --api-only                 Test API endpoints only (no WebSocket)"
    echo "  --security-only            Run security tests only"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DYTALLIX_API_URL           API base URL"
    echo "  DYTALLIX_WS_URL            WebSocket URL"
    echo ""
    echo "Examples:"
    echo "  $0                         # Run all default tests"
    echo "  $0 -q                      # Quick validation"
    echo "  $0 --enable-metrics        # Include performance metrics"
    echo "  $0 --security-only         # Security tests only"
    echo "  $0 -u http://remote.api    # Test remote API"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -w|--ws-url)
            WS_URL="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -q|--quick)
            QUICK_MODE=true
            shift
            ;;
        --no-python)
            PYTHON_TESTS=false
            shift
            ;;
        --no-curl)
            CURL_TESTS=false
            shift
            ;;
        --enable-postman)
            POSTMAN_TESTS=true
            shift
            ;;
        --enable-metrics)
            METRICS_COLLECTION=true
            shift
            ;;
        --no-reports)
            GENERATE_REPORTS=false
            shift
            ;;
        --api-only)
            # Skip WebSocket tests
            WS_URL=""
            shift
            ;;
        --security-only)
            QUICK_MODE=true
            CURL_TESTS=false
            # This will be handled in the Python test runner
            shift
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

# Main execution
main() {
    echo "🚀 Dytallix Comprehensive Test Runner"
    echo "======================================"
    
    # Check dependencies
    check_dependencies
    
    # Setup output directory
    setup_output_directory
    
    # Check API availability
    if ! check_api_availability; then
        exit 1
    fi
    
    local start_time
    start_time=$(date +%s)
    
    # Run test suites
    run_python_tests
    run_curl_tests
    run_postman_tests
    collect_metrics
    generate_reports
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Display summary
    display_summary
    
    echo ""
    log_success "Test execution completed in ${duration} seconds"
    log_info "All results saved to: $OUTPUT_DIR"
}

# Run main function
main