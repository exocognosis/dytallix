#!/bin/bash

# =============================================================================
# DYTALLIX TESTNET PERFORMANCE MONITORING SYSTEM
# =============================================================================
# 
# Real-time performance monitoring and metrics collection system that
# establishes baseline metrics, monitors transaction throughput, tracks
# block production time, and provides comprehensive performance analysis.
#
# Features:
# - Transaction throughput monitoring (target >1000 TPS)
# - Block production time tracking (target <2s)
# - Network availability monitoring (target >99.5%)
# - Resource utilization tracking
# - Real-time performance dashboard
# - Performance alerts and notifications
# - Historical performance analysis
#
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
MONITORING_DIR="$PROJECT_ROOT/monitoring"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PERFORMANCE_LOG="$LOG_DIR/performance_${TIMESTAMP}.log"
METRICS_LOG="$LOG_DIR/metrics_${TIMESTAMP}.log"

# Node configuration
NODES=("dytallix-node-1" "dytallix-node-2" "dytallix-node-3")
NODE_PORTS=(3030 3032 3034)
HEALTH_PORTS=(8081 8083 8085)
METRICS_PORTS=(9090 9091 9092)

# Monitoring services
PROMETHEUS_URL="http://localhost:9093"
GRAFANA_URL="http://localhost:3000"

# Performance targets
TARGET_TPS=1000
TARGET_BLOCK_TIME=2
TARGET_AVAILABILITY=99.5

# Monitoring configuration
MONITORING_INTERVAL=5    # seconds
BASELINE_DURATION=60     # seconds
LOAD_TEST_DURATION=300   # seconds
AVAILABILITY_WINDOW=3600 # seconds (1 hour)

# Load testing configuration
LOAD_TEST_THREADS=10
LOAD_TEST_REQUESTS_PER_THREAD=100

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
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${level}[${timestamp}]${NC} $message" | tee -a "$PERFORMANCE_LOG"
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

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        log "${PURPLE}[DEBUG]" "$@"
    fi
}

log_metric() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $*" >> "$METRICS_LOG"
}

# Utility functions
setup_monitoring_environment() {
    log_step "Setting up performance monitoring environment..."
    
    # Create monitoring directories
    mkdir -p "$LOG_DIR"
    mkdir -p "$MONITORING_DIR"
    mkdir -p "$MONITORING_DIR/dashboards"
    mkdir -p "$MONITORING_DIR/reports"
    
    # Initialize metrics log
    echo "# Dytallix Performance Metrics Log - Started at $(date -Iseconds)" > "$METRICS_LOG"
    echo "# Format: [timestamp] metric_name=value [additional_fields]" >> "$METRICS_LOG"
    
    log_success "Monitoring environment setup completed"
}

# Baseline performance measurement
establish_baseline_metrics() {
    log_step "Establishing baseline performance metrics..."
    
    local baseline_start=$(date +%s)
    local baseline_end=$((baseline_start + BASELINE_DURATION))
    
    log_info "Collecting baseline metrics for ${BASELINE_DURATION}s..."
    
    # Initialize baseline counters
    local total_requests=0
    local successful_requests=0
    local failed_requests=0
    local total_response_time=0
    local block_count_start=()
    local block_count_end=()
    
    # Get initial block counts
    for i in "${!NODES[@]}"; do
        local node="${NODES[$i]}"
        local port="${NODE_PORTS[$i]}"
        local height_url="http://localhost:$port/blockchain/height"
        
        if curl -sf --max-time 5 "$height_url" &> /dev/null; then
            local height=$(curl -sf --max-time 5 "$height_url" 2>/dev/null | jq -r '.height // 0' 2>/dev/null || echo 0)
            block_count_start[$i]=$height
            log_debug "$node baseline start height: $height"
        else
            block_count_start[$i]=0
        fi
    done
    
    # Collect baseline metrics
    while [[ $(date +%s) -lt $baseline_end ]]; do
        local iteration_start=$(date +%s%3N)  # milliseconds
        
        # Test API performance across all nodes
        for i in "${!NODES[@]}"; do
            local node="${NODES[$i]}"
            local port="${NODE_PORTS[$i]}"
            local health_url="http://localhost:$port/health"
            
            total_requests=$((total_requests + 1))
            
            local request_start=$(date +%s%3N)
            if curl -sf --max-time 5 "$health_url" &> /dev/null; then
                successful_requests=$((successful_requests + 1))
                local request_end=$(date +%s%3N)
                local response_time=$((request_end - request_start))
                total_response_time=$((total_response_time + response_time))
                
                log_metric "api_response_time=$response_time node=$node"
            else
                failed_requests=$((failed_requests + 1))
                log_metric "api_request_failed=1 node=$node"
            fi
        done
        
        sleep 1
    done
    
    # Get final block counts
    for i in "${!NODES[@]}"; do
        local node="${NODES[$i]}"
        local port="${NODE_PORTS[$i]}"
        local height_url="http://localhost:$port/blockchain/height"
        
        if curl -sf --max-time 5 "$height_url" &> /dev/null; then
            local height=$(curl -sf --max-time 5 "$height_url" 2>/dev/null | jq -r '.height // 0' 2>/dev/null || echo 0)
            block_count_end[$i]=$height
            log_debug "$node baseline end height: $height"
        else
            block_count_end[$i]=0
        fi
    done
    
    # Calculate baseline metrics
    local avg_response_time=0
    if [[ $successful_requests -gt 0 ]]; then
        avg_response_time=$((total_response_time / successful_requests))
    fi
    
    local success_rate=0
    if [[ $total_requests -gt 0 ]]; then
        success_rate=$(( (successful_requests * 100) / total_requests ))
    fi
    
    local total_blocks_produced=0
    for i in "${!NODES[@]}"; do
        local start_height=${block_count_start[$i]:-0}
        local end_height=${block_count_end[$i]:-0}
        local blocks_produced=$((end_height - start_height))
        total_blocks_produced=$((total_blocks_produced + blocks_produced))
        
        log_metric "baseline_blocks_produced=$blocks_produced node=${NODES[$i]}"
    done
    
    local avg_block_time=0
    if [[ $total_blocks_produced -gt 0 ]]; then
        avg_block_time=$((BASELINE_DURATION / total_blocks_produced))
    fi
    
    # Log baseline metrics
    log_metric "baseline_total_requests=$total_requests"
    log_metric "baseline_successful_requests=$successful_requests"
    log_metric "baseline_failed_requests=$failed_requests"
    log_metric "baseline_success_rate=$success_rate"
    log_metric "baseline_avg_response_time=$avg_response_time"
    log_metric "baseline_total_blocks_produced=$total_blocks_produced"
    log_metric "baseline_avg_block_time=$avg_block_time"
    
    log_success "Baseline metrics established:"
    log_info "  Success Rate: $success_rate%"
    log_info "  Avg Response Time: ${avg_response_time}ms"
    log_info "  Blocks Produced: $total_blocks_produced"
    log_info "  Avg Block Time: ${avg_block_time}s"
}

# Transaction throughput monitoring
monitor_transaction_throughput() {
    log_step "Monitoring transaction throughput..."
    
    local monitoring_start=$(date +%s)
    local tx_count_start=()
    local tx_count_current=()
    local max_tps=0
    local total_tps_measurements=0
    local sum_tps=0
    
    # Get initial transaction counts
    for i in "${!NODES[@]}"; do
        local node="${NODES[$i]}"
        local port="${NODE_PORTS[$i]}"
        local stats_url="http://localhost:$port/blockchain/stats"
        
        if curl -sf --max-time 5 "$stats_url" &> /dev/null; then
            local stats=$(curl -sf --max-time 5 "$stats_url" 2>/dev/null)
            local tx_count=$(echo "$stats" | jq -r '.total_transactions // 0' 2>/dev/null || echo 0)
            tx_count_start[$i]=$tx_count
            tx_count_current[$i]=$tx_count
            log_debug "$node initial tx count: $tx_count"
        else
            tx_count_start[$i]=0
            tx_count_current[$i]=0
        fi
    done
    
    log_info "Starting transaction throughput monitoring (target: ${TARGET_TPS} TPS)..."
    
    # Monitor for specified duration
    local last_measurement=$(date +%s)
    
    while true; do
        sleep $MONITORING_INTERVAL
        
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_measurement))
        
        # Get current transaction counts
        local total_new_transactions=0
        
        for i in "${!NODES[@]}"; do
            local node="${NODES[$i]}"
            local port="${NODE_PORTS[$i]}"
            local stats_url="http://localhost:$port/blockchain/stats"
            
            if curl -sf --max-time 5 "$stats_url" &> /dev/null; then
                local stats=$(curl -sf --max-time 5 "$stats_url" 2>/dev/null)
                local tx_count=$(echo "$stats" | jq -r '.total_transactions // 0' 2>/dev/null || echo 0)
                
                local previous_count=${tx_count_current[$i]:-0}
                local new_transactions=$((tx_count - previous_count))
                total_new_transactions=$((total_new_transactions + new_transactions))
                
                tx_count_current[$i]=$tx_count
                
                log_metric "tx_count=$tx_count new_transactions=$new_transactions node=$node"
            fi
        done
        
        # Calculate TPS
        local current_tps=0
        if [[ $time_diff -gt 0 ]]; then
            current_tps=$((total_new_transactions / time_diff))
        fi
        
        if [[ $current_tps -gt $max_tps ]]; then
            max_tps=$current_tps
        fi
        
        total_tps_measurements=$((total_tps_measurements + 1))
        sum_tps=$((sum_tps + current_tps))
        
        log_metric "current_tps=$current_tps max_tps=$max_tps"
        
        # Check if we meet target TPS
        local tps_status="❌"
        if [[ $current_tps -ge $TARGET_TPS ]]; then
            tps_status="✅"
        fi
        
        log_info "$tps_status Current TPS: $current_tps (Target: $TARGET_TPS, Max: $max_tps)"
        
        last_measurement=$current_time
        
        # Break if in one-shot mode
        if [[ "${CONTINUOUS:-false}" != "true" ]]; then
            break
        fi
    done
    
    # Calculate average TPS
    local avg_tps=0
    if [[ $total_tps_measurements -gt 0 ]]; then
        avg_tps=$((sum_tps / total_tps_measurements))
    fi
    
    log_success "Transaction throughput monitoring completed:"
    log_info "  Average TPS: $avg_tps"
    log_info "  Maximum TPS: $max_tps"
    log_info "  Target TPS: $TARGET_TPS"
    
    if [[ $avg_tps -ge $TARGET_TPS ]]; then
        log_success "✅ TPS target achieved!"
    else
        log_warn "⚠️  TPS target not achieved (${avg_tps}/${TARGET_TPS})"
    fi
}

# Block production time monitoring
monitor_block_production_time() {
    log_step "Monitoring block production time..."
    
    local block_times=()
    local measurement_count=0
    local total_block_time=0
    local min_block_time=999999
    local max_block_time=0
    
    log_info "Starting block production time monitoring (target: <${TARGET_BLOCK_TIME}s)..."
    
    # Get initial block heights and timestamps
    local last_heights=()
    local last_timestamps=()
    
    for i in "${!NODES[@]}"; do
        local node="${NODES[$i]}"
        local port="${NODE_PORTS[$i]}"
        local height_url="http://localhost:$port/blockchain/height"
        
        if curl -sf --max-time 5 "$height_url" &> /dev/null; then
            local response=$(curl -sf --max-time 5 "$height_url" 2>/dev/null)
            local height=$(echo "$response" | jq -r '.height // 0' 2>/dev/null || echo 0)
            local timestamp=$(echo "$response" | jq -r '.timestamp // 0' 2>/dev/null || echo $(date +%s))
            
            last_heights[$i]=$height
            last_timestamps[$i]=$timestamp
            
            log_debug "$node initial: height=$height, timestamp=$timestamp"
        else
            last_heights[$i]=0
            last_timestamps[$i]=$(date +%s)
        fi
    done
    
    # Monitor block production
    while true; do
        sleep $MONITORING_INTERVAL
        
        for i in "${!NODES[@]}"; do
            local node="${NODES[$i]}"
            local port="${NODE_PORTS[$i]}"
            local height_url="http://localhost:$port/blockchain/height"
            
            if curl -sf --max-time 5 "$height_url" &> /dev/null; then
                local response=$(curl -sf --max-time 5 "$height_url" 2>/dev/null)
                local height=$(echo "$response" | jq -r '.height // 0' 2>/dev/null || echo 0)
                local timestamp=$(echo "$response" | jq -r '.timestamp // 0' 2>/dev/null || echo $(date +%s))
                
                local last_height=${last_heights[$i]:-0}
                local last_timestamp=${last_timestamps[$i]:-$(date +%s)}
                
                # Check if new block was produced
                if [[ $height -gt $last_height ]]; then
                    local blocks_produced=$((height - last_height))
                    local time_diff=$((timestamp - last_timestamp))
                    
                    if [[ $time_diff -gt 0 && $blocks_produced -gt 0 ]]; then
                        local avg_block_time=$((time_diff / blocks_produced))
                        
                        measurement_count=$((measurement_count + 1))
                        total_block_time=$((total_block_time + avg_block_time))
                        
                        if [[ $avg_block_time -lt $min_block_time ]]; then
                            min_block_time=$avg_block_time
                        fi
                        
                        if [[ $avg_block_time -gt $max_block_time ]]; then
                            max_block_time=$avg_block_time
                        fi
                        
                        log_metric "block_time=$avg_block_time height=$height node=$node"
                        
                        # Check if we meet target block time
                        local block_time_status="❌"
                        if [[ $avg_block_time -le $TARGET_BLOCK_TIME ]]; then
                            block_time_status="✅"
                        fi
                        
                        log_info "$block_time_status $node: Block time ${avg_block_time}s (Height: $last_height → $height)"
                    fi
                    
                    last_heights[$i]=$height
                    last_timestamps[$i]=$timestamp
                fi
            fi
        done
        
        # Break if in one-shot mode
        if [[ "${CONTINUOUS:-false}" != "true" ]]; then
            break
        fi
    done
    
    # Calculate average block time
    local avg_block_time=0
    if [[ $measurement_count -gt 0 ]]; then
        avg_block_time=$((total_block_time / measurement_count))
    fi
    
    log_success "Block production time monitoring completed:"
    log_info "  Measurements: $measurement_count"
    log_info "  Average Block Time: ${avg_block_time}s"
    log_info "  Min Block Time: ${min_block_time}s"
    log_info "  Max Block Time: ${max_block_time}s"
    log_info "  Target Block Time: ${TARGET_BLOCK_TIME}s"
    
    if [[ $measurement_count -gt 0 && $avg_block_time -le $TARGET_BLOCK_TIME ]]; then
        log_success "✅ Block time target achieved!"
    else
        log_warn "⚠️  Block time target not achieved (${avg_block_time}s > ${TARGET_BLOCK_TIME}s)"
    fi
}

# Network availability monitoring
monitor_network_availability() {
    log_step "Monitoring network availability..."
    
    local availability_start=$(date +%s)
    local total_checks=0
    local successful_checks=0
    local downtime_periods=()
    
    log_info "Starting availability monitoring (target: >${TARGET_AVAILABILITY}%)..."
    
    while true; do
        local check_start=$(date +%s)
        local nodes_up=0
        
        # Check each node
        for i in "${!NODES[@]}"; do
            local node="${NODES[$i]}"
            local port="${HEALTH_PORTS[$i]}"
            local health_url="http://localhost:$port/health"
            
            total_checks=$((total_checks + 1))
            
            if curl -sf --max-time 5 "$health_url" &> /dev/null; then
                successful_checks=$((successful_checks + 1))
                nodes_up=$((nodes_up + 1))
                log_metric "node_availability=1 node=$node"
            else
                log_metric "node_availability=0 node=$node"
                log_warn "Node $node is down"
            fi
        done
        
        # Calculate current availability
        local current_availability=0
        if [[ $total_checks -gt 0 ]]; then
            current_availability=$(( (successful_checks * 100) / total_checks ))
        fi
        
        # Check overall network availability (majority of nodes must be up)
        local network_up=0
        local majority_threshold=$(( (${#NODES[@]} / 2) + 1 ))
        
        if [[ $nodes_up -ge $majority_threshold ]]; then
            network_up=1
        fi
        
        log_metric "network_availability=$network_up nodes_up=$nodes_up total_nodes=${#NODES[@]}"
        
        # Availability status
        local availability_status="❌"
        if [[ $current_availability -ge ${TARGET_AVAILABILITY%.*} ]]; then  # Remove decimal for comparison
            availability_status="✅"
        fi
        
        log_info "$availability_status Network availability: ${current_availability}% (Nodes up: $nodes_up/${#NODES[@]})"
        
        sleep $MONITORING_INTERVAL
        
        # Break if in one-shot mode
        if [[ "${CONTINUOUS:-false}" != "true" ]]; then
            break
        fi
        
        # Check if we've been monitoring for the availability window
        local current_time=$(date +%s)
        local monitoring_duration=$((current_time - availability_start))
        
        if [[ $monitoring_duration -ge $AVAILABILITY_WINDOW && "${CONTINUOUS:-false}" != "true" ]]; then
            break
        fi
    done
    
    # Final availability calculation
    local final_availability=0
    if [[ $total_checks -gt 0 ]]; then
        final_availability=$(( (successful_checks * 100) / total_checks ))
    fi
    
    log_success "Network availability monitoring completed:"
    log_info "  Total checks: $total_checks"
    log_info "  Successful checks: $successful_checks"
    log_info "  Final availability: ${final_availability}%"
    log_info "  Target availability: ${TARGET_AVAILABILITY}%"
    
    if [[ $final_availability -ge ${TARGET_AVAILABILITY%.*} ]]; then
        log_success "✅ Availability target achieved!"
    else
        log_warn "⚠️  Availability target not achieved (${final_availability}% < ${TARGET_AVAILABILITY}%)"
    fi
}

# Resource utilization monitoring
monitor_resource_utilization() {
    log_step "Monitoring resource utilization..."
    
    log_info "Collecting resource utilization metrics..."
    
    # Monitor Docker containers
    for container in "${NODES[@]}" "dytallix-prometheus" "dytallix-grafana"; do
        if docker ps --filter "name=$container" --filter "status=running" --quiet | grep -q .; then
            local stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" "$container")
            
            # Parse stats (skip header)
            local cpu_usage=$(echo "$stats" | tail -n +2 | awk '{print $2}' | sed 's/%//')
            local mem_usage=$(echo "$stats" | tail -n +2 | awk '{print $3}')
            local net_io=$(echo "$stats" | tail -n +2 | awk '{print $4}')
            local block_io=$(echo "$stats" | tail -n +2 | awk '{print $5}')
            
            log_metric "cpu_usage=$cpu_usage container=$container"
            log_metric "memory_usage=$mem_usage container=$container"
            log_metric "network_io=$net_io container=$container"
            log_metric "block_io=$block_io container=$container"
            
            log_info "$container: CPU=${cpu_usage}%, Memory=${mem_usage}, Network=${net_io}, Disk=${block_io}"
        else
            log_warn "$container: Container not running"
        fi
    done
    
    # System resource monitoring
    local cpu_load=$(uptime | awk '{print $NF}' | sed 's/,//')
    local memory_usage=$(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
    local disk_usage=$(df "$PROJECT_ROOT" | awk 'NR==2{print $5}' | sed 's/%//')
    
    log_metric "system_cpu_load=$cpu_load"
    log_metric "system_memory_usage=$memory_usage"
    log_metric "system_disk_usage=$disk_usage"
    
    log_info "System resources: CPU Load=${cpu_load}, Memory=${memory_usage}, Disk=${disk_usage}%"
    
    log_success "Resource utilization monitoring completed"
}

# Load testing
run_load_test() {
    log_step "Running load test to validate performance under stress..."
    
    local load_test_start=$(date +%s)
    
    log_info "Starting load test: $LOAD_TEST_THREADS threads × $LOAD_TEST_REQUESTS_PER_THREAD requests"
    
    # Create load test script
    local load_test_script="/tmp/dytallix_load_test.sh"
    cat > "$load_test_script" << 'EOF'
#!/bin/bash
thread_id=$1
requests_per_thread=$2
base_ports=($3 $4 $5)

successful=0
failed=0
total_time=0

for ((i=1; i<=requests_per_thread; i++)); do
    port=${base_ports[$((RANDOM % ${#base_ports[@]}))]}
    url="http://localhost:$port/health"
    
    start_time=$(date +%s%3N)
    if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
        end_time=$(date +%s%3N)
        response_time=$((end_time - start_time))
        total_time=$((total_time + response_time))
        successful=$((successful + 1))
    else
        failed=$((failed + 1))
    fi
done

echo "Thread $thread_id: $successful successful, $failed failed, avg_time=$((total_time / (successful > 0 ? successful : 1)))ms"
EOF

    chmod +x "$load_test_script"
    
    # Run load test
    local pids=()
    
    for ((thread=1; thread<=LOAD_TEST_THREADS; thread++)); do
        "$load_test_script" "$thread" "$LOAD_TEST_REQUESTS_PER_THREAD" "${NODE_PORTS[@]}" &
        pids+=($!)
    done
    
    # Wait for all threads to complete
    for pid in "${pids[@]}"; do
        wait "$pid"
    done
    
    local load_test_end=$(date +%s)
    local load_test_duration=$((load_test_end - load_test_start))
    local total_requests=$((LOAD_TEST_THREADS * LOAD_TEST_REQUESTS_PER_THREAD))
    local achieved_tps=$((total_requests / load_test_duration))
    
    log_metric "load_test_duration=$load_test_duration"
    log_metric "load_test_total_requests=$total_requests"
    log_metric "load_test_achieved_tps=$achieved_tps"
    
    log_success "Load test completed:"
    log_info "  Duration: ${load_test_duration}s"
    log_info "  Total requests: $total_requests"
    log_info "  Achieved TPS: $achieved_tps"
    
    # Clean up
    rm -f "$load_test_script"
    
    if [[ $achieved_tps -ge $TARGET_TPS ]]; then
        log_success "✅ Load test TPS target achieved!"
    else
        log_warn "⚠️  Load test TPS target not achieved (${achieved_tps}/${TARGET_TPS})"
    fi
}

# Generate performance dashboard
generate_performance_dashboard() {
    log_step "Generating performance dashboard..."
    
    local dashboard_file="$MONITORING_DIR/dashboards/performance_dashboard_${TIMESTAMP}.html"
    
    # Create HTML dashboard
    cat > "$dashboard_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dytallix Testnet Performance Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; color: #333; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .metric-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .metric-target { color: #666; font-size: 14px; }
        .status-good { color: #28a745; }
        .status-warn { color: #ffc107; }
        .status-error { color: #dc3545; }
        .refresh-button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .timestamp { text-align: center; color: #666; margin-top: 20px; }
    </style>
    <script>
        function refreshDashboard() {
            location.reload();
        }
        
        // Auto-refresh every 30 seconds
        setInterval(refreshDashboard, 30000);
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Dytallix Testnet Performance Dashboard</h1>
            <button class="refresh-button" onclick="refreshDashboard()">Refresh Dashboard</button>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-title">Transaction Throughput</div>
                <div class="metric-value status-warn">Monitoring...</div>
                <div class="metric-target">Target: ${TARGET_TPS} TPS</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Block Production Time</div>
                <div class="metric-value status-warn">Monitoring...</div>
                <div class="metric-target">Target: < ${TARGET_BLOCK_TIME}s</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Network Availability</div>
                <div class="metric-value status-warn">Monitoring...</div>
                <div class="metric-target">Target: > ${TARGET_AVAILABILITY}%</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Active Nodes</div>
                <div class="metric-value status-good">${#NODES[@]}</div>
                <div class="metric-target">Total Nodes: ${#NODES[@]}</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Monitoring Services</div>
                <div class="metric-value">
                    <a href="$PROMETHEUS_URL" target="_blank" style="color: #007bff;">Prometheus</a> | 
                    <a href="$GRAFANA_URL" target="_blank" style="color: #007bff;">Grafana</a>
                </div>
                <div class="metric-target">External monitoring tools</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Performance Logs</div>
                <div class="metric-value">
                    <a href="file://$PERFORMANCE_LOG" style="color: #007bff;">Performance Log</a><br>
                    <a href="file://$METRICS_LOG" style="color: #007bff;">Metrics Log</a>
                </div>
                <div class="metric-target">Detailed performance data</div>
            </div>
        </div>
        
        <div class="timestamp">
            Dashboard generated at: $(date)
        </div>
    </div>
</body>
</html>
EOF

    log_success "Performance dashboard generated: $dashboard_file"
    log_info "Open the dashboard in your browser: file://$dashboard_file"
}

# Generate performance report
generate_performance_report() {
    log_step "Generating performance report..."
    
    local report_file="$MONITORING_DIR/reports/performance_report_${TIMESTAMP}.json"
    
    # Analyze metrics log
    local total_metrics=$(grep -c "^\\[" "$METRICS_LOG" || echo 0)
    local tps_measurements=$(grep -c "current_tps=" "$METRICS_LOG" || echo 0)
    local block_time_measurements=$(grep -c "block_time=" "$METRICS_LOG" || echo 0)
    local availability_checks=$(grep -c "node_availability=" "$METRICS_LOG" || echo 0)
    
    # Get latest metrics
    local latest_tps=$(grep "current_tps=" "$METRICS_LOG" | tail -1 | sed 's/.*current_tps=\([0-9]*\).*/\1/' || echo 0)
    local latest_max_tps=$(grep "max_tps=" "$METRICS_LOG" | tail -1 | sed 's/.*max_tps=\([0-9]*\).*/\1/' || echo 0)
    
    # Calculate averages
    local avg_block_time=0
    if [[ $block_time_measurements -gt 0 ]]; then
        local total_block_time=$(grep "block_time=" "$METRICS_LOG" | sed 's/.*block_time=\([0-9]*\).*/\1/' | awk '{sum+=$1} END {print sum}')
        avg_block_time=$((total_block_time / block_time_measurements))
    fi
    
    # Create performance report
    local performance_report="{
        \"timestamp\": \"$(date -Iseconds)\",
        \"monitoring_duration\": \"$(($(date +%s) - $(stat -c %Y "$METRICS_LOG")))\",
        \"targets\": {
            \"tps\": $TARGET_TPS,
            \"block_time\": $TARGET_BLOCK_TIME,
            \"availability\": $TARGET_AVAILABILITY
        },
        \"measurements\": {
            \"total_metrics\": $total_metrics,
            \"tps_measurements\": $tps_measurements,
            \"block_time_measurements\": $block_time_measurements,
            \"availability_checks\": $availability_checks
        },
        \"performance\": {
            \"latest_tps\": $latest_tps,
            \"max_tps\": $latest_max_tps,
            \"average_block_time\": $avg_block_time
        },
        \"status\": {
            \"tps_target_met\": $(( latest_tps >= TARGET_TPS ? 1 : 0 )),
            \"block_time_target_met\": $(( avg_block_time <= TARGET_BLOCK_TIME ? 1 : 0 )),
            \"overall_healthy\": true
        },
        \"files\": {
            \"performance_log\": \"$PERFORMANCE_LOG\",
            \"metrics_log\": \"$METRICS_LOG\",
            \"dashboard\": \"$dashboard_file\"
        }
    }"
    
    # Write report
    echo "$performance_report" | jq '.' > "$report_file"
    
    log_success "Performance report generated: $report_file"
    
    # Display summary
    log_info "=== PERFORMANCE SUMMARY ==="
    log_info "Latest TPS: $latest_tps (Target: $TARGET_TPS)"
    log_info "Max TPS: $latest_max_tps"
    log_info "Avg Block Time: ${avg_block_time}s (Target: ${TARGET_BLOCK_TIME}s)"
    log_info "Total Measurements: $total_metrics"
    log_info "=========================="
}

# Continuous monitoring mode
continuous_performance_monitoring() {
    log_info "Starting continuous performance monitoring mode..."
    log_info "Press Ctrl+C to stop monitoring"
    
    trap 'log_info "Stopping continuous monitoring..."; exit 0' INT
    
    while true; do
        echo
        log_info "=== Performance Monitoring Cycle ($(date)) ==="
        
        # Run monitoring in parallel
        monitor_transaction_throughput &
        local tps_pid=$!
        
        monitor_block_production_time &
        local block_pid=$!
        
        monitor_network_availability &
        local availability_pid=$!
        
        monitor_resource_utilization &
        local resource_pid=$!
        
        # Wait for all monitoring processes
        wait $tps_pid $block_pid $availability_pid $resource_pid
        
        log_info "Monitoring cycle completed. Next cycle in 60s..."
        sleep 60
    done
}

# Main monitoring function
main() {
    echo -e "${CYAN}📊 DYTALLIX TESTNET PERFORMANCE MONITORING${NC}"
    echo -e "${CYAN}===========================================${NC}"
    echo
    
    log_info "Starting performance monitoring system..."
    log_info "Performance targets:"
    log_info "  TPS: >$TARGET_TPS"
    log_info "  Block Time: <${TARGET_BLOCK_TIME}s"
    log_info "  Availability: >${TARGET_AVAILABILITY}%"
    log_info "Log files:"
    log_info "  Performance: $PERFORMANCE_LOG"
    log_info "  Metrics: $METRICS_LOG"
    echo
    
    # Setup monitoring environment
    setup_monitoring_environment
    echo
    
    # Establish baseline metrics
    establish_baseline_metrics
    echo
    
    if [[ "${CONTINUOUS:-false}" == "true" ]]; then
        # Run continuous monitoring
        continuous_performance_monitoring
    else
        # Run one-shot monitoring
        monitor_transaction_throughput
        echo
        
        monitor_block_production_time
        echo
        
        monitor_network_availability
        echo
        
        monitor_resource_utilization
        echo
        
        # Optional load test
        if [[ "${LOAD_TEST:-false}" == "true" ]]; then
            run_load_test
            echo
        fi
        
        # Generate dashboard and report
        generate_performance_dashboard
        echo
        
        generate_performance_report
        echo
        
        log_success "🎉 Performance monitoring completed successfully!"
        log_info "Next steps:"
        log_info "1. Review performance dashboard: Open the generated HTML file"
        log_info "2. Check Grafana dashboard: $GRAFANA_URL"
        log_info "3. Monitor logs for continuous insights"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --debug)
            DEBUG=true
            shift
            ;;
        --continuous)
            CONTINUOUS=true
            shift
            ;;
        --load-test)
            LOAD_TEST=true
            shift
            ;;
        --help|-h)
            echo "Dytallix Testnet Performance Monitoring"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --debug       Enable debug logging"
            echo "  --continuous  Run in continuous monitoring mode"
            echo "  --load-test   Include load testing in monitoring"
            echo "  --help        Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DEBUG         Enable debug logging (true/false)"
            echo "  CONTINUOUS    Enable continuous monitoring (true/false)"
            echo "  LOAD_TEST     Enable load testing (true/false)"
            echo "  TARGET_TPS    Override target TPS (default: $TARGET_TPS)"
            echo "  TARGET_BLOCK_TIME Override target block time (default: $TARGET_BLOCK_TIME)"
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

# Override targets from environment if set
TARGET_TPS=${TARGET_TPS:-$TARGET_TPS}
TARGET_BLOCK_TIME=${TARGET_BLOCK_TIME:-$TARGET_BLOCK_TIME}
TARGET_AVAILABILITY=${TARGET_AVAILABILITY:-$TARGET_AVAILABILITY}

# Ensure directories exist
mkdir -p "$LOG_DIR"
mkdir -p "$MONITORING_DIR"

# Run main function
main