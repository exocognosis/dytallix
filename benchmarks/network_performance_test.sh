#!/bin/bash
# 
# NETWORK PERFORMANCE MEASUREMENT SUITE
#
# This script provides comprehensive network performance testing for Dytallix,
# including latency testing between components, throughput analysis under 
# various loads, and integration with existing load testing tools.
#

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/benchmarks/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Test configuration
TEST_DURATION=60
CONCURRENT_CONNECTIONS=50
PACKET_SIZE=1024
REQUEST_RATE_PER_SEC=100

# Network endpoints to test
declare -A ENDPOINTS=(
    ["blockchain_rpc"]="http://localhost:3030"
    ["ai_services"]="http://localhost:8000"
    ["bridge_api"]="http://localhost:8080"
    ["monitoring"]="http://localhost:9090"
    ["database"]="localhost:5432"
    ["redis_cache"]="localhost:6379"
)

# Network interfaces to monitor
INTERFACES=("eth0" "lo" "docker0")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${level}[${timestamp}]${NC} $message"
}

log_info() { log "${GREEN}[INFO]" "$@"; }
log_warn() { log "${YELLOW}[WARN]" "$@"; }
log_error() { log "${RED}[ERROR]" "$@"; }
log_step() { log "${BLUE}[STEP]" "$@"; }

# Create results directory
setup_environment() {
    log_step "Setting up network performance testing environment..."
    
    mkdir -p "$RESULTS_DIR"
    
    # Check required tools
    local required_tools=("curl" "nc" "ping" "iperf3" "wrk" "ss")
    local missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_warn "Missing tools: ${missing_tools[*]}"
        log_info "Installing missing tools..."
        
        # Install missing tools based on the system
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -qq
            for tool in "${missing_tools[@]}"; do
                case $tool in
                    "wrk") sudo apt-get install -y wrk ;;
                    "iperf3") sudo apt-get install -y iperf3 ;;
                    "ss") sudo apt-get install -y iproute2 ;;
                    *) sudo apt-get install -y "$tool" ;;
                esac
            done
        elif command -v yum &> /dev/null; then
            for tool in "${missing_tools[@]}"; do
                sudo yum install -y "$tool"
            done
        else
            log_error "Package manager not found. Please install: ${missing_tools[*]}"
            exit 1
        fi
    fi
    
    log_info "Environment setup completed"
}

# Test network latency between components
test_network_latency() {
    log_step "Testing network latency between components..."
    
    local latency_results="$RESULTS_DIR/network_latency_${TIMESTAMP}.json"
    echo '{"timestamp": "'$(date -Iseconds)'", "latency_tests": [' > "$latency_results"
    
    local first_test=true
    
    for name in "${!ENDPOINTS[@]}"; do
        local endpoint="${ENDPOINTS[$name]}"
        
        # Extract host and port from endpoint
        local host=$(echo "$endpoint" | sed -E 's|^https?://||' | cut -d':' -f1)
        local port=$(echo "$endpoint" | sed -E 's|^https?://||' | cut -d':' -f2)
        
        # Default ports for protocols
        if [[ "$port" == "$host" ]]; then
            if [[ "$endpoint" == https://* ]]; then
                port=443
            elif [[ "$endpoint" == http://* ]]; then
                port=80
            fi
        fi
        
        log_info "Testing latency to $name ($host:$port)..."
        
        # Add comma separator for JSON
        if [[ "$first_test" == false ]]; then
            echo ',' >> "$latency_results"
        fi
        first_test=false
        
        # Ping test for ICMP latency
        local ping_results=$(ping -c 10 -W 1 "$host" 2>/dev/null | tail -1)
        local ping_avg=0
        if [[ $ping_results =~ rtt\ min/avg/max/mdev\ =\ [0-9.]+/([0-9.]+)/[0-9.]+/[0-9.]+\ ms ]]; then
            ping_avg=${BASH_REMATCH[1]}
        fi
        
        # TCP connection test
        local tcp_latency=0
        if [[ "$port" != "$host" ]]; then
            local start_time=$(date +%s%3N)
            if timeout 5 bash -c "</dev/tcp/$host/$port" 2>/dev/null; then
                local end_time=$(date +%s%3N)
                tcp_latency=$((end_time - start_time))
            fi
        fi
        
        # HTTP latency test (if HTTP endpoint)
        local http_latency=0
        if [[ "$endpoint" == http* ]]; then
            local start_time=$(date +%s%3N)
            if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$endpoint/health" &>/dev/null; then
                local end_time=$(date +%s%3N)
                http_latency=$((end_time - start_time))
            fi
        fi
        
        # Write results to JSON
        cat >> "$latency_results" << EOF
{
  "service": "$name",
  "endpoint": "$endpoint",
  "host": "$host",
  "port": "$port",
  "ping_avg_ms": $ping_avg,
  "tcp_connect_ms": $tcp_latency,
  "http_request_ms": $http_latency,
  "timestamp": "$(date -Iseconds)"
}
EOF
        
        log_info "$name: ping=${ping_avg}ms, tcp=${tcp_latency}ms, http=${http_latency}ms"
    done
    
    echo ']}' >> "$latency_results"
    log_info "Latency test results saved to $latency_results"
}

# Test network throughput using various tools
test_network_throughput() {
    log_step "Testing network throughput..."
    
    local throughput_results="$RESULTS_DIR/network_throughput_${TIMESTAMP}.json"
    echo '{"timestamp": "'$(date -Iseconds)'", "throughput_tests": [' > "$throughput_results"
    
    local first_test=true
    
    # Test HTTP endpoints with wrk
    for name in "${!ENDPOINTS[@]}"; do
        local endpoint="${ENDPOINTS[$name]}"
        
        if [[ "$endpoint" == http* ]]; then
            log_info "Testing HTTP throughput for $name..."
            
            # Add comma separator for JSON
            if [[ "$first_test" == false ]]; then
                echo ',' >> "$throughput_results"
            fi
            first_test=false
            
            # Run wrk load test
            local wrk_output=$(wrk -t4 -c$CONCURRENT_CONNECTIONS -d${TEST_DURATION}s -s <(cat << 'EOF'
wrk.method = "GET"
wrk.path = "/health"
EOF
) "$endpoint" 2>&1 | tee /tmp/wrk_output.txt)
            
            # Parse wrk output
            local requests_per_sec=$(grep "Requests/sec:" /tmp/wrk_output.txt | awk '{print $2}' || echo "0")
            local transfer_per_sec=$(grep "Transfer/sec:" /tmp/wrk_output.txt | awk '{print $2}' || echo "0")
            local avg_latency=$(grep "Latency" /tmp/wrk_output.txt | awk '{print $2}' || echo "0")
            local total_requests=$(grep "requests in" /tmp/wrk_output.txt | awk '{print $1}' || echo "0")
            
            # Convert transfer rate to bytes/sec
            local transfer_bytes_sec=0
            if [[ "$transfer_per_sec" =~ ([0-9.]+)([KMGT]B) ]]; then
                local value=${BASH_REMATCH[1]}
                local unit=${BASH_REMATCH[2]}
                case $unit in
                    "KB") transfer_bytes_sec=$(echo "$value * 1024" | bc -l) ;;
                    "MB") transfer_bytes_sec=$(echo "$value * 1024 * 1024" | bc -l) ;;
                    "GB") transfer_bytes_sec=$(echo "$value * 1024 * 1024 * 1024" | bc -l) ;;
                    *) transfer_bytes_sec=$value ;;
                esac
            fi
            
            cat >> "$throughput_results" << EOF
{
  "service": "$name",
  "endpoint": "$endpoint",
  "test_type": "http_load_test",
  "duration_seconds": $TEST_DURATION,
  "concurrent_connections": $CONCURRENT_CONNECTIONS,
  "requests_per_second": $requests_per_sec,
  "transfer_bytes_per_second": ${transfer_bytes_sec%.*},
  "average_latency_ms": "$avg_latency",
  "total_requests": $total_requests,
  "timestamp": "$(date -Iseconds)"
}
EOF
            
            log_info "$name: ${requests_per_sec} req/s, ${transfer_per_sec}/s, ${avg_latency} latency"
        fi
    done
    
    echo ']}' >> "$throughput_results"
    log_info "Throughput test results saved to $throughput_results"
}

# Test bandwidth using iperf3 (if iperf3 servers are available)
test_bandwidth() {
    log_step "Testing network bandwidth with iperf3..."
    
    local bandwidth_results="$RESULTS_DIR/network_bandwidth_${TIMESTAMP}.json"
    echo '{"timestamp": "'$(date -Iseconds)'", "bandwidth_tests": [' > "$bandwidth_results"
    
    # Check if iperf3 server is running locally
    if ss -tuln | grep -q ":5201"; then
        log_info "Found iperf3 server on localhost:5201"
        
        # TCP bandwidth test
        local tcp_result=$(iperf3 -c localhost -p 5201 -t 10 -J 2>/dev/null || echo '{"error": "connection_failed"}')
        
        cat >> "$bandwidth_results" << EOF
{
  "test_type": "tcp_bandwidth",
  "server": "localhost:5201",
  "duration_seconds": 10,
  "result": $tcp_result,
  "timestamp": "$(date -Iseconds)"
}
EOF
    else
        log_warn "No iperf3 server found, skipping bandwidth test"
        cat >> "$bandwidth_results" << EOF
{
  "test_type": "tcp_bandwidth",
  "server": "localhost:5201",
  "status": "server_not_available",
  "timestamp": "$(date -Iseconds)"
}
EOF
    fi
    
    echo ']}' >> "$bandwidth_results"
    log_info "Bandwidth test results saved to $bandwidth_results"
}

# Monitor network interface statistics
monitor_network_interfaces() {
    log_step "Monitoring network interface statistics..."
    
    local interface_stats="$RESULTS_DIR/interface_stats_${TIMESTAMP}.json"
    echo '{"timestamp": "'$(date -Iseconds)'", "interface_stats": [' > "$interface_stats"
    
    local first_interface=true
    
    for interface in "${INTERFACES[@]}"; do
        if [[ -d "/sys/class/net/$interface" ]]; then
            log_info "Collecting stats for interface: $interface"
            
            # Add comma separator for JSON
            if [[ "$first_interface" == false ]]; then
                echo ',' >> "$interface_stats"
            fi
            first_interface=false
            
            # Read interface statistics
            local rx_bytes=$(cat "/sys/class/net/$interface/statistics/rx_bytes" 2>/dev/null || echo "0")
            local tx_bytes=$(cat "/sys/class/net/$interface/statistics/tx_bytes" 2>/dev/null || echo "0")
            local rx_packets=$(cat "/sys/class/net/$interface/statistics/rx_packets" 2>/dev/null || echo "0")
            local tx_packets=$(cat "/sys/class/net/$interface/statistics/tx_packets" 2>/dev/null || echo "0")
            local rx_errors=$(cat "/sys/class/net/$interface/statistics/rx_errors" 2>/dev/null || echo "0")
            local tx_errors=$(cat "/sys/class/net/$interface/statistics/tx_errors" 2>/dev/null || echo "0")
            local rx_dropped=$(cat "/sys/class/net/$interface/statistics/rx_dropped" 2>/dev/null || echo "0")
            local tx_dropped=$(cat "/sys/class/net/$interface/statistics/tx_dropped" 2>/dev/null || echo "0")
            
            # Get interface speed and status
            local speed=$(cat "/sys/class/net/$interface/speed" 2>/dev/null || echo "unknown")
            local operstate=$(cat "/sys/class/net/$interface/operstate" 2>/dev/null || echo "unknown")
            local mtu=$(cat "/sys/class/net/$interface/mtu" 2>/dev/null || echo "unknown")
            
            cat >> "$interface_stats" << EOF
{
  "interface": "$interface",
  "status": "$operstate",
  "speed_mbps": "$speed",
  "mtu": $mtu,
  "rx_bytes": $rx_bytes,
  "tx_bytes": $tx_bytes,
  "rx_packets": $rx_packets,
  "tx_packets": $tx_packets,
  "rx_errors": $rx_errors,
  "tx_errors": $tx_errors,
  "rx_dropped": $rx_dropped,
  "tx_dropped": $tx_dropped,
  "timestamp": "$(date -Iseconds)"
}
EOF
            
            log_info "$interface: ${operstate}, ${speed}Mbps, RX: ${rx_bytes} bytes, TX: ${tx_bytes} bytes"
        fi
    done
    
    echo ']}' >> "$interface_stats"
    log_info "Interface statistics saved to $interface_stats"
}

# Test connection pooling and concurrent connections
test_concurrent_connections() {
    log_step "Testing concurrent connection handling..."
    
    local concurrent_results="$RESULTS_DIR/concurrent_connections_${TIMESTAMP}.json"
    echo '{"timestamp": "'$(date -Iseconds)'", "concurrent_tests": [' > "$concurrent_results"
    
    local first_test=true
    
    # Test different concurrency levels
    local concurrency_levels=(1 5 10 25 50 100)
    
    for name in "${!ENDPOINTS[@]}"; do
        local endpoint="${ENDPOINTS[$name]}"
        
        if [[ "$endpoint" == http* ]]; then
            log_info "Testing concurrent connections for $name..."
            
            # Add comma separator for JSON
            if [[ "$first_test" == false ]]; then
                echo ',' >> "$concurrent_results"
            fi
            first_test=false
            
            echo "{\"service\": \"$name\", \"endpoint\": \"$endpoint\", \"concurrency_results\": [" >> "$concurrent_results"
            
            local first_concurrency=true
            
            for concurrency in "${concurrency_levels[@]}"; do
                log_info "Testing $concurrency concurrent connections to $name..."
                
                # Add comma separator for JSON
                if [[ "$first_concurrency" == false ]]; then
                    echo ',' >> "$concurrent_results"
                fi
                first_concurrency=false
                
                # Use curl to test concurrent connections
                local start_time=$(date +%s%3N)
                local success_count=0
                local total_time=0
                
                # Create temporary file for curl results
                local temp_results="/tmp/curl_results_$$"
                
                # Launch concurrent curl processes
                for ((i=1; i<=concurrency; i++)); do
                    (
                        local curl_start=$(date +%s%3N)
                        if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$endpoint/health" &>/dev/null; then
                            local curl_end=$(date +%s%3N)
                            echo "success $((curl_end - curl_start))" >> "$temp_results"
                        else
                            echo "failure 0" >> "$temp_results"
                        fi
                    ) &
                done
                
                # Wait for all curl processes to complete
                wait
                
                local end_time=$(date +%s%3N)
                local total_duration=$((end_time - start_time))
                
                # Analyze results
                if [[ -f "$temp_results" ]]; then
                    success_count=$(grep -c "success" "$temp_results" || echo "0")
                    local avg_response_time=0
                    if [[ $success_count -gt 0 ]]; then
                        total_time=$(grep "success" "$temp_results" | awk '{sum+=$2} END {print sum}' || echo "0")
                        avg_response_time=$((total_time / success_count))
                    fi
                fi
                
                local success_rate=0
                if [[ $concurrency -gt 0 ]]; then
                    success_rate=$(( (success_count * 100) / concurrency ))
                fi
                
                cat >> "$concurrent_results" << EOF
{
  "concurrency_level": $concurrency,
  "successful_connections": $success_count,
  "total_connections": $concurrency,
  "success_rate_percent": $success_rate,
  "total_duration_ms": $total_duration,
  "average_response_time_ms": $avg_response_time,
  "timestamp": "$(date -Iseconds)"
}
EOF
                
                # Cleanup
                rm -f "$temp_results"
                
                log_info "$concurrency connections: ${success_count}/${concurrency} success (${success_rate}%), avg: ${avg_response_time}ms"
                
                # Brief pause between tests
                sleep 1
            done
            
            echo "]}" >> "$concurrent_results"
        fi
    done
    
    echo ']}' >> "$concurrent_results"
    log_info "Concurrent connection test results saved to $concurrent_results"
}

# Generate network performance summary report
generate_network_summary() {
    log_step "Generating network performance summary..."
    
    local summary_file="$RESULTS_DIR/network_performance_summary_${TIMESTAMP}.md"
    
    cat > "$summary_file" << EOF
# Network Performance Benchmark Report

**Generated:** $(date)
**Test Duration:** ${TEST_DURATION} seconds
**Concurrent Connections Tested:** ${CONCURRENT_CONNECTIONS}

## Test Results Summary

### Service Endpoints Tested
EOF
    
    for name in "${!ENDPOINTS[@]}"; do
        echo "- **${name}**: ${ENDPOINTS[$name]}" >> "$summary_file"
    done
    
    cat >> "$summary_file" << EOF

### Network Latency Results

$(if [[ -f "$RESULTS_DIR/network_latency_${TIMESTAMP}.json" ]]; then
    echo "Latency test results available in: \`network_latency_${TIMESTAMP}.json\`"
else
    echo "Latency test results not available"
fi)

### Throughput Test Results

$(if [[ -f "$RESULTS_DIR/network_throughput_${TIMESTAMP}.json" ]]; then
    echo "Throughput test results available in: \`network_throughput_${TIMESTAMP}.json\`"
else
    echo "Throughput test results not available"
fi)

### Interface Statistics

$(if [[ -f "$RESULTS_DIR/interface_stats_${TIMESTAMP}.json" ]]; then
    echo "Interface statistics available in: \`interface_stats_${TIMESTAMP}.json\`"
else
    echo "Interface statistics not available"
fi)

### Concurrent Connection Tests

$(if [[ -f "$RESULTS_DIR/concurrent_connections_${TIMESTAMP}.json" ]]; then
    echo "Concurrent connection test results available in: \`concurrent_connections_${TIMESTAMP}.json\`"
else
    echo "Concurrent connection test results not available"
fi)

## Files Generated

- Summary: \`$(basename "$summary_file")\`
- Latency Results: \`network_latency_${TIMESTAMP}.json\`
- Throughput Results: \`network_throughput_${TIMESTAMP}.json\`
- Interface Stats: \`interface_stats_${TIMESTAMP}.json\`
- Concurrent Tests: \`concurrent_connections_${TIMESTAMP}.json\`

## Recommendations

Based on the network performance tests:

1. **Latency Optimization**: Review services with >100ms latency
2. **Throughput Analysis**: Ensure adequate bandwidth for peak loads
3. **Connection Pooling**: Optimize concurrent connection handling
4. **Interface Monitoring**: Check for dropped packets or errors

For detailed analysis, review the JSON result files.
EOF
    
    log_info "Network performance summary saved to $summary_file"
    
    # Display summary
    echo
    log_info "=== NETWORK PERFORMANCE SUMMARY ==="
    cat "$summary_file"
    echo
}

# Main function
main() {
    echo -e "${BLUE}🌐 DYTALLIX NETWORK PERFORMANCE TESTING${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo
    
    log_info "Starting network performance tests..."
    log_info "Test duration: ${TEST_DURATION} seconds"
    log_info "Concurrent connections: ${CONCURRENT_CONNECTIONS}"
    log_info "Results directory: $RESULTS_DIR"
    echo
    
    # Setup environment
    setup_environment
    echo
    
    # Run tests
    test_network_latency
    echo
    
    test_network_throughput
    echo
    
    test_bandwidth
    echo
    
    monitor_network_interfaces
    echo
    
    test_concurrent_connections
    echo
    
    # Generate summary
    generate_network_summary
    
    log_info "🎉 Network performance testing completed successfully!"
    log_info "Results saved in: $RESULTS_DIR"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --duration)
            TEST_DURATION="$2"
            shift 2
            ;;
        --concurrent)
            CONCURRENT_CONNECTIONS="$2"
            shift 2
            ;;
        --help|-h)
            echo "Network Performance Testing Suite"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --duration SECONDS    Test duration (default: $TEST_DURATION)"
            echo "  --concurrent NUM      Concurrent connections (default: $CONCURRENT_CONNECTIONS)"
            echo "  --help               Show this help message"
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

# Run main function
main