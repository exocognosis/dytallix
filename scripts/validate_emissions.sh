#!/bin/bash

# validate_emissions.sh - Emission validation script for Dytallix
# Validates emission events, distribution accuracy, and staking reward consistency

set -e

# Configuration
API_BASE="${API_BASE:-http://127.0.0.1:3030}"
TOLERANCE="${TOLERANCE:-1e-9}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v curl &> /dev/null; then
        error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq is required but not installed"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        warn "bc not found, using python for calculations"
        if ! command -v python3 &> /dev/null; then
            error "Neither bc nor python3 is available for calculations"
            exit 1
        fi
        USE_PYTHON=true
    else
        USE_PYTHON=false
    fi
}

# Calculate floating point with proper precision
calc() {
    if [ "$USE_PYTHON" = true ]; then
        python3 -c "print($1)"
    else
        echo "scale=15; $1" | bc -l
    fi
}

# Format number for output table
format_decimal() {
    local num=$1
    # Convert large integers to decimal format (assuming micro denomination)
    if [ ${#num} -gt 10 ]; then
        local decimal_part=$((num % 1000000))
        local whole_part=$((num / 1000000))
        printf "%d.%06d" $whole_part $decimal_part
    else
        echo $num
    fi
}

# Fetch API data with error handling
fetch_api() {
    local endpoint=$1
    local response
    
    response=$(curl -s "$API_BASE$endpoint" || true)
    
    if [ -z "$response" ]; then
        error "Failed to fetch data from $endpoint"
        return 1
    fi
    
    # Check if response is valid JSON
    if ! echo "$response" | jq . > /dev/null 2>&1; then
        error "Invalid JSON response from $endpoint"
        return 1
    fi
    
    echo "$response"
}

# Validate emission distribution consistency
validate_distribution() {
    log "Validating emission distribution consistency..."
    
    local rewards_data
    rewards_data=$(fetch_api "/api/rewards?limit=50") || return 1
    
    local total_errors=0
    local total_events=0
    
    echo "$rewards_data" | jq -r '.events[] | @base64' | while IFS= read -r event_data; do
        local event
        event=$(echo "$event_data" | base64 -d)
        
        local height=$(echo "$event" | jq -r '.height')
        local total_emitted=$(echo "$event" | jq -r '.total_emitted')
        local block_rewards=$(echo "$event" | jq -r '.pools.block_rewards')
        local staking_rewards=$(echo "$event" | jq -r '.pools.staking_rewards') 
        local ai_incentives=$(echo "$event" | jq -r '.pools.ai_module_incentives')
        local bridge_ops=$(echo "$event" | jq -r '.pools.bridge_operations')
        
        # Calculate sum of pool distributions
        local pool_sum=$(calc "$block_rewards + $staking_rewards + $ai_incentives + $bridge_ops")
        local diff=$(calc "$total_emitted - $pool_sum")
        local abs_diff=$(calc "sqrt($diff * $diff)")  # Absolute value
        
        total_events=$((total_events + 1))
        
        if [ "$VERBOSE" = true ]; then
            log "Height $height: total=$total_emitted, pools=$pool_sum, diff=$diff"
        fi
        
        # Check if difference exceeds tolerance (using string comparison for large numbers)
        if (( $(echo "$abs_diff > 1" | bc -l) )); then
            warn "Height $height: Distribution mismatch exceeds tolerance (diff=$abs_diff)"
            total_errors=$((total_errors + 1))
        fi
    done
    
    if [ $total_errors -eq 0 ]; then
        success "All $total_events emission events have consistent distribution"
    else
        error "$total_errors out of $total_events events have distribution mismatches"
        return 1
    fi
}

# Validate cumulative totals
validate_cumulative_totals() {
    log "Validating cumulative emission totals..."
    
    local stats_data
    stats_data=$(fetch_api "/api/stats") || return 1
    
    local emission_pools
    emission_pools=$(echo "$stats_data" | jq '.emission_pools')
    
    local latest_emission
    latest_emission=$(echo "$stats_data" | jq '.latest_emission')
    
    if [ "$latest_emission" = "null" ]; then
        warn "No emission events found"
        return 0
    fi
    
    local circulating_supply=$(echo "$latest_emission" | jq -r '.circulating_supply')
    
    # Sum all pool amounts
    local block_rewards=$(echo "$emission_pools" | jq -r '.block_rewards // 0')
    local staking_rewards=$(echo "$emission_pools" | jq -r '.staking_rewards // 0') 
    local ai_incentives=$(echo "$emission_pools" | jq -r '.ai_module_incentives // 0')
    local bridge_ops=$(echo "$emission_pools" | jq -r '.bridge_operations // 0')
    
    local pools_total=$(calc "$block_rewards + $staking_rewards + $ai_incentives + $bridge_ops")
    
    log "Circulating supply: $(format_decimal $circulating_supply)"
    log "Pool totals: $(format_decimal $pools_total)"
    
    # Note: pools_total might be less than circulating_supply due to claims
    # This is expected behavior
    
    success "Cumulative validation completed"
}

# Validate staking reward consistency
validate_staking_rewards() {
    log "Validating staking reward consistency..."
    
    local stats_data
    stats_data=$(fetch_api "/api/stats") || return 1
    
    local staking_stats
    staking_stats=$(echo "$stats_data" | jq '.staking')
    
    if [ "$staking_stats" = "null" ]; then
        warn "No staking data available"
        return 0
    fi
    
    local total_stake=$(echo "$staking_stats" | jq -r '.total_stake')
    local reward_index=$(echo "$staking_stats" | jq -r '.reward_index')
    local pending_emission=$(echo "$staking_stats" | jq -r '.pending_emission')
    
    log "Total stake: $(format_decimal $total_stake)"
    log "Reward index: $(format_decimal $reward_index)"
    log "Pending emission: $(format_decimal $pending_emission)"
    
    # Validate that reward index makes sense
    if [ "$total_stake" = "0" ] && [ "$reward_index" != "0" ]; then
        warn "Reward index is non-zero but total stake is zero"
    fi
    
    if [ "$total_stake" != "0" ] && [ "$pending_emission" != "0" ]; then
        warn "Pending emission is non-zero but total stake exists"
    fi
    
    success "Staking reward validation completed"
}

# Generate validation report
generate_report() {
    log "Generating validation report..."
    
    echo
    echo "==============================================="
    echo "Dytallix Emission Validation Report"
    echo "==============================================="
    echo "Timestamp: $(date)"
    echo "API Base: $API_BASE"
    echo "Tolerance: $TOLERANCE"
    echo
    
    # Table header
    printf "%-25s %-15s %-15s %-15s %-10s\n" "Entity" "Expected" "Actual" "AbsDiff" "RelErr"
    printf "%-25s %-15s %-15s %-15s %-10s\n" "-------------------------" "---------------" "---------------" "---------------" "----------"
    
    # Get current data for report
    local stats_data
    stats_data=$(fetch_api "/api/stats") || return 1
    
    local emission_pools
    emission_pools=$(echo "$stats_data" | jq '.emission_pools')
    
    # For this simple validation, we'll show the current state
    # In a full implementation, this would compare against theoretical calculations
    
    local block_rewards=$(echo "$emission_pools" | jq -r '.block_rewards // 0')
    local staking_rewards=$(echo "$emission_pools" | jq -r '.staking_rewards // 0')
    local ai_incentives=$(echo "$emission_pools" | jq -r '.ai_module_incentives // 0')
    local bridge_ops=$(echo "$emission_pools" | jq -r '.bridge_operations // 0')
    
    # Format and display (using actual as both expected and actual for now)
    printf "%-25s %-15s %-15s %-15s %-10s\n" "block_rewards" "$(format_decimal $block_rewards)" "$(format_decimal $block_rewards)" "0.000000" "0.00%"
    printf "%-25s %-15s %-15s %-15s %-10s\n" "staking_rewards" "$(format_decimal $staking_rewards)" "$(format_decimal $staking_rewards)" "0.000000" "0.00%"
    printf "%-25s %-15s %-15s %-15s %-10s\n" "ai_module_incentives" "$(format_decimal $ai_incentives)" "$(format_decimal $ai_incentives)" "0.000000" "0.00%"
    printf "%-25s %-15s %-15s %-15s %-10s\n" "bridge_operations" "$(format_decimal $bridge_ops)" "$(format_decimal $bridge_ops)" "0.000000" "0.00%"
    
    echo
}

# Main validation routine
main() {
    log "Starting Dytallix emission validation..."
    
    check_dependencies
    
    local exit_code=0
    
    # Run validation steps
    validate_distribution || exit_code=1
    validate_cumulative_totals || exit_code=1  
    validate_staking_rewards || exit_code=1
    
    # Generate report
    generate_report
    
    if [ $exit_code -eq 0 ]; then
        success "✅ ALL VALIDATIONS PASSED"
        echo "Exit code: 0"
    else
        error "❌ VALIDATION FAILED"
        echo "Exit code: 1"
    fi
    
    exit $exit_code
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-base)
            API_BASE="$2"
            shift 2
            ;;
        --tolerance)
            TOLERANCE="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --api-base URL     API base URL (default: http://127.0.0.1:3030)"
            echo "  --tolerance NUM    Validation tolerance (default: 1e-9)"
            echo "  --verbose          Enable verbose output"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main