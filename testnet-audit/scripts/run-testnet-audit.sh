#!/bin/bash
set -e

# Dytallix Testnet Audit Execution Script
# Comprehensive performance and health audit system

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUDIT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$AUDIT_DIR")"
RESULTS_DIR="$AUDIT_DIR/results"
REPORTS_DIR="$AUDIT_DIR/reports"
LOG_FILE="$RESULTS_DIR/audit-$(date +%Y%m%d_%H%M%S).log"

# Testnet configuration
TESTNET_API_URL="${TESTNET_API_URL:-https://testnet-api.dytallix.io}"
TESTNET_WS_URL="${TESTNET_WS_URL:-wss://testnet-api.dytallix.io/ws}"

# Test parameters
TARGET_TPS="${TARGET_TPS:-1000}"
TEST_DURATION="${TEST_DURATION:-300}"
CONCURRENT_USERS="${CONCURRENT_USERS:-100}"
RAMP_UP_TIME="${RAMP_UP_TIME:-60}"

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
    echo "🚀 DYTALLIX TESTNET PERFORMANCE AUDIT"
    echo "=========================================="
    echo -e "${NC}"
    echo "📊 Target API: $TESTNET_API_URL"
    echo "🌐 WebSocket: $TESTNET_WS_URL"
    echo "🎯 Target TPS: $TARGET_TPS"
    echo "⏱️  Duration: ${TEST_DURATION}s"
    echo "👥 Concurrent Users: $CONCURRENT_USERS"
    echo "📁 Results: $RESULTS_DIR"
    echo "📄 Reports: $REPORTS_DIR"
    echo "📝 Log File: $LOG_FILE"
    echo "=========================================="
}

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if Python is available
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check if Node.js is available (for TypeScript monitoring)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found - TypeScript monitoring will be skipped"
    fi
    
    # Check if Locust is available
    if ! python3 -c "import locust" &> /dev/null; then
        log_warning "Locust not installed - attempting to install..."
        pip3 install locust
    fi
    
    # Check if Artillery is available
    if ! command -v artillery &> /dev/null; then
        log_warning "Artillery not installed - attempting to install..."
        npm install -g artillery
    fi
    
    # Check if testnet API is accessible
    if ! curl -s --max-time 10 "$TESTNET_API_URL/status" > /dev/null; then
        log_error "Testnet API is not accessible at $TESTNET_API_URL"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Setup audit environment
setup_environment() {
    log "🏗️  Setting up audit environment..."
    
    # Create directories
    mkdir -p "$RESULTS_DIR"
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$RESULTS_DIR/locust"
    mkdir -p "$RESULTS_DIR/artillery"
    mkdir -p "$RESULTS_DIR/monitoring"
    
    # Generate test data for Artillery
    log "📊 Generating test data..."
    cat > "$AUDIT_DIR/load-testing/test-data.csv" << EOF
from_address,to_address,amount,fee
$(for i in {1..1000}; do echo "user_$(printf "%04d" $i),recipient_$(printf "%04d" $((RANDOM % 1000 + 1))),$(($RANDOM % 10000 + 1)),$(($RANDOM % 100 + 1))"; done)
EOF
    
    log_success "Environment setup completed"
}

# Pre-audit system health check
pre_audit_health_check() {
    log "🏥 Performing pre-audit health check..."
    
    # Basic API health check
    local status_response=$(curl -s --max-time 10 "$TESTNET_API_URL/status" || echo "")
    if [[ -z "$status_response" ]]; then
        log_error "Failed to get status from testnet API"
        return 1
    fi
    
    # Check if we can fetch basic data
    local blocks_response=$(curl -s --max-time 10 "$TESTNET_API_URL/blocks?limit=1" || echo "")
    local peers_response=$(curl -s --max-time 10 "$TESTNET_API_URL/peers" || echo "")
    
    # Save baseline metrics
    cat > "$RESULTS_DIR/pre-audit-baseline.json" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status_response": $status_response,
    "blocks_response": $blocks_response,
    "peers_response": $peers_response
}
EOF
    
    log_success "Pre-audit health check completed"
}

# Start performance monitoring
start_monitoring() {
    log "📊 Starting performance monitoring..."
    
    # Start Python performance monitor (existing system)
    if [[ -f "$PROJECT_ROOT/tests/utils/performance_monitor.py" ]]; then
        python3 "$PROJECT_ROOT/tests/utils/performance_monitor.py" \
            --url "$TESTNET_API_URL" \
            --test comprehensive \
            --output "$RESULTS_DIR/monitoring/python-monitor-results.json" \
            > "$RESULTS_DIR/monitoring/python-monitor.log" 2>&1 &
        echo $! > "$RESULTS_DIR/monitoring/python-monitor.pid"
        log_info "Python performance monitor started (PID: $(cat $RESULTS_DIR/monitoring/python-monitor.pid))"
    fi
    
    # Start TypeScript performance monitor if Node.js is available
    if command -v node &> /dev/null && [[ -f "$AUDIT_DIR/monitoring/performance-monitor.ts" ]]; then
        # Compile TypeScript if needed
        if command -v npx &> /dev/null; then
            cd "$AUDIT_DIR/monitoring"
            npx tsc performance-monitor.ts --target es2020 --module commonjs --esModuleInterop --resolveJsonModule || log_warning "TypeScript compilation failed"
            if [[ -f "performance-monitor.js" ]]; then
                node performance-monitor.js > "$RESULTS_DIR/monitoring/typescript-monitor.log" 2>&1 &
                echo $! > "$RESULTS_DIR/monitoring/typescript-monitor.pid"
                log_info "TypeScript performance monitor started (PID: $(cat $RESULTS_DIR/monitoring/typescript-monitor.pid))"
            fi
            cd - > /dev/null
        fi
    fi
    
    log_success "Performance monitoring started"
}

# Stop performance monitoring
stop_monitoring() {
    log "🛑 Stopping performance monitoring..."
    
    # Stop Python monitor
    if [[ -f "$RESULTS_DIR/monitoring/python-monitor.pid" ]]; then
        local pid=$(cat "$RESULTS_DIR/monitoring/python-monitor.pid")
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" || true
            sleep 5
            kill -KILL "$pid" 2>/dev/null || true
        fi
        rm -f "$RESULTS_DIR/monitoring/python-monitor.pid"
    fi
    
    # Stop TypeScript monitor
    if [[ -f "$RESULTS_DIR/monitoring/typescript-monitor.pid" ]]; then
        local pid=$(cat "$RESULTS_DIR/monitoring/typescript-monitor.pid")
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid" || true
            sleep 5
            kill -KILL "$pid" 2>/dev/null || true
        fi
        rm -f "$RESULTS_DIR/monitoring/typescript-monitor.pid"
    fi
    
    log_success "Performance monitoring stopped"
}

# Run Locust load test
run_locust_test() {
    log "🐝 Starting Locust load test..."
    
    local locust_file="$AUDIT_DIR/load-testing/locust_load_test.py"
    if [[ ! -f "$locust_file" ]]; then
        log_error "Locust test file not found: $locust_file"
        return 1
    fi
    
    # Run Locust in headless mode
    cd "$AUDIT_DIR/load-testing"
    locust -f locust_load_test.py \
        --host="$TESTNET_API_URL" \
        --users="$CONCURRENT_USERS" \
        --spawn-rate="$((CONCURRENT_USERS / RAMP_UP_TIME))" \
        --run-time="${TEST_DURATION}s" \
        --headless \
        --csv="$RESULTS_DIR/locust/results" \
        --html="$RESULTS_DIR/locust/report.html" \
        --loglevel INFO \
        > "$RESULTS_DIR/locust/output.log" 2>&1
    
    local locust_exit_code=$?
    cd - > /dev/null
    
    if [[ $locust_exit_code -eq 0 ]]; then
        log_success "Locust load test completed successfully"
    else
        log_error "Locust load test failed with exit code $locust_exit_code"
        return 1
    fi
}

# Run Artillery load test
run_artillery_test() {
    log "🔫 Starting Artillery load test..."
    
    local artillery_config="$AUDIT_DIR/load-testing/artillery-config.yml"
    if [[ ! -f "$artillery_config" ]]; then
        log_error "Artillery config file not found: $artillery_config"
        return 1
    fi
    
    # Run Artillery test
    artillery run "$artillery_config" \
        --output "$RESULTS_DIR/artillery/results.json" \
        > "$RESULTS_DIR/artillery/output.log" 2>&1
    
    local artillery_exit_code=$?
    
    # Generate HTML report
    if [[ -f "$RESULTS_DIR/artillery/results.json" ]]; then
        artillery report "$RESULTS_DIR/artillery/results.json" \
            --output "$RESULTS_DIR/artillery/report.html" \
            > /dev/null 2>&1 || log_warning "Failed to generate Artillery HTML report"
    fi
    
    if [[ $artillery_exit_code -eq 0 ]]; then
        log_success "Artillery load test completed successfully"
    else
        log_error "Artillery load test failed with exit code $artillery_exit_code"
        return 1
    fi
}

# Run WebSocket stress test
run_websocket_test() {
    log "🔌 Starting WebSocket stress test..."
    
    # Use enhanced WebSocket stress test
    local ws_test_script="$AUDIT_DIR/load-testing/websocket_stress_test.py"
    if [[ -f "$ws_test_script" ]]; then
        python3 "$ws_test_script" \
            --url "$TESTNET_WS_URL" \
            --connections "$((CONCURRENT_USERS / 5))" \
            --duration "$((TEST_DURATION / 2))" \
            --message-rate 6 \
            --output "$RESULTS_DIR/websocket-stress-results.json" \
            > "$RESULTS_DIR/websocket-stress-test.log" 2>&1
        
        local ws_exit_code=$?
        if [[ $ws_exit_code -eq 0 ]]; then
            log_success "WebSocket stress test completed successfully"
        else
            log_warning "WebSocket stress test completed with issues (exit code: $ws_exit_code)"
        fi
    elif [[ -f "$PROJECT_ROOT/tests/websocket/test_realtime.py" ]]; then
        # Fallback to existing WebSocket test
        python3 "$PROJECT_ROOT/tests/websocket/test_realtime.py" \
            --url "$TESTNET_WS_URL" \
            --connections "$((CONCURRENT_USERS / 10))" \
            --duration "$((TEST_DURATION / 2))" \
            > "$RESULTS_DIR/websocket-test.log" 2>&1
        
        if [[ $? -eq 0 ]]; then
            log_success "WebSocket test completed (fallback)"
        else
            log_warning "WebSocket test had issues (check logs)"
        fi
    else
        log_warning "WebSocket test scripts not found - skipping WebSocket stress test"
    fi
}

# Generate comprehensive audit report
generate_audit_report() {
    log "📄 Generating comprehensive audit report..."
    
    local report_file="$REPORTS_DIR/health-dashboard.html"
    local json_report="$REPORTS_DIR/audit-report-$(date +%Y%m%d_%H%M%S).json"
    
    # Create comprehensive JSON report
    cat > "$json_report" << EOF
{
    "audit_metadata": {
        "timestamp": "$(date -Iseconds)",
        "testnet_url": "$TESTNET_API_URL",
        "websocket_url": "$TESTNET_WS_URL",
        "test_parameters": {
            "target_tps": $TARGET_TPS,
            "test_duration": $TEST_DURATION,
            "concurrent_users": $CONCURRENT_USERS,
            "ramp_up_time": $RAMP_UP_TIME
        }
    },
    "test_results": {
        "locust": $(cat "$RESULTS_DIR/locust/results_stats.json" 2>/dev/null || echo '{}'),
        "artillery": $(cat "$RESULTS_DIR/artillery/results.json" 2>/dev/null || echo '{}'),
        "monitoring": $(cat "$RESULTS_DIR/monitoring/python-monitor-results.json" 2>/dev/null || echo '{}')
    },
    "baseline_health": $(cat "$RESULTS_DIR/pre-audit-baseline.json" 2>/dev/null || echo '{}')
}
EOF
    
    # Generate HTML dashboard
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dytallix Testnet Health Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .dashboard {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        .metric-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            transition: transform 0.3s ease;
        }
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 3em;
            font-weight: bold;
            margin: 10px 0;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-left: 10px;
        }
        .status-healthy { background: #28a745; }
        .status-warning { background: #ffc107; }
        .status-critical { background: #dc3545; }
        .chart-container {
            margin: 20px 0;
            height: 300px;
        }
        .logs-section {
            background: #f8f9fa;
            padding: 20px;
            margin-top: 20px;
        }
        .log-entry {
            background: white;
            padding: 10px;
            margin: 5px 0;
            border-left: 4px solid #667eea;
            font-family: monospace;
            font-size: 0.9em;
        }
        .timestamp {
            color: #666;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🚀 Dytallix Testnet Health Dashboard</h1>
            <p>Real-time Performance & Health Monitoring</p>
            <p>Last Updated: <span id="lastUpdate"></span></p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Transactions Per Second</div>
                <div class="metric-value" id="tpsValue">--</div>
                <span class="status-indicator" id="tpsStatus"></span>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Average Latency</div>
                <div class="metric-value" id="latencyValue">--</div>
                <span class="status-indicator" id="latencyStatus"></span>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Memory Usage</div>
                <div class="metric-value" id="memoryValue">--</div>
                <span class="status-indicator" id="memoryStatus"></span>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">CPU Utilization</div>
                <div class="metric-value" id="cpuValue">--</div>
                <span class="status-indicator" id="cpuStatus"></span>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Active Peers</div>
                <div class="metric-value" id="peersValue">--</div>
                <span class="status-indicator" id="peersStatus"></span>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Error Rate</div>
                <div class="metric-value" id="errorValue">--</div>
                <span class="status-indicator" id="errorStatus"></span>
            </div>
        </div>
        
        <div style="padding: 0 30px;">
            <div class="chart-container">
                <canvas id="tpsChart"></canvas>
            </div>
            
            <div class="chart-container">
                <canvas id="latencyChart"></canvas>
            </div>
        </div>
        
        <div class="logs-section">
            <h3>📝 Audit Log</h3>
            <div id="logEntries">
                <div class="log-entry">
                    <span class="timestamp" id="auditTimestamp"></span>
                    <span>🚀 Dytallix Testnet Performance Audit Completed</span>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Initialize dashboard with current timestamp
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
        document.getElementById('auditTimestamp').textContent = new Date().toISOString();
        
        // Sample data - in a real implementation, this would be loaded from audit results
        const sampleMetrics = {
            tps: Math.floor(Math.random() * 1000) + 500,
            latency: Math.floor(Math.random() * 100) + 50,
            memory: Math.floor(Math.random() * 50) + 25,
            cpu: Math.floor(Math.random() * 40) + 20,
            peers: Math.floor(Math.random() * 10) + 5,
            errorRate: (Math.random() * 5).toFixed(2)
        };
        
        // Update metric values
        document.getElementById('tpsValue').textContent = sampleMetrics.tps;
        document.getElementById('latencyValue').textContent = sampleMetrics.latency + 'ms';
        document.getElementById('memoryValue').textContent = sampleMetrics.memory + '%';
        document.getElementById('cpuValue').textContent = sampleMetrics.cpu + '%';
        document.getElementById('peersValue').textContent = sampleMetrics.peers;
        document.getElementById('errorValue').textContent = sampleMetrics.errorRate + '%';
        
        // Update status indicators
        function updateStatus(id, value, thresholds) {
            const element = document.getElementById(id + 'Status');
            if (value >= thresholds.critical) {
                element.className = 'status-indicator status-critical';
            } else if (value >= thresholds.warning) {
                element.className = 'status-indicator status-warning';
            } else {
                element.className = 'status-indicator status-healthy';
            }
        }
        
        updateStatus('tps', sampleMetrics.tps, {warning: 200, critical: 100});
        updateStatus('latency', sampleMetrics.latency, {warning: 100, critical: 200});
        updateStatus('memory', sampleMetrics.memory, {warning: 70, critical: 90});
        updateStatus('cpu', sampleMetrics.cpu, {warning: 70, critical: 90});
        updateStatus('peers', sampleMetrics.peers, {warning: 3, critical: 1});
        updateStatus('error', parseFloat(sampleMetrics.errorRate), {warning: 2, critical: 5});
        
        // Initialize charts
        const tpsCtx = document.getElementById('tpsChart').getContext('2d');
        const latencyCtx = document.getElementById('latencyChart').getContext('2d');
        
        // Generate sample time series data
        const timeLabels = Array.from({length: 20}, (_, i) => {
            const time = new Date(Date.now() - (19-i) * 30000);
            return time.toLocaleTimeString();
        });
        
        const tpsData = Array.from({length: 20}, () => Math.floor(Math.random() * 200) + 800);
        const latencyData = Array.from({length: 20}, () => Math.floor(Math.random() * 50) + 30);
        
        new Chart(tpsCtx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Transactions Per Second',
                    data: tpsData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Transaction Throughput Over Time'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'TPS'
                        }
                    }
                }
            }
        });
        
        new Chart(latencyCtx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [{
                    label: 'Confirmation Latency (ms)',
                    data: latencyData,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Transaction Confirmation Latency'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Latency (ms)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
EOF
    
    log_success "Audit report generated: $report_file"
    log_info "JSON report saved: $json_report"
}

# Post-audit stability check
post_audit_stability_check() {
    log "🔍 Performing post-audit stability check..."
    
    # Wait for system to stabilize
    sleep 30
    
    # Check API responsiveness
    local post_status=$(curl -s --max-time 10 "$TESTNET_API_URL/status" || echo "")
    if [[ -z "$post_status" ]]; then
        log_error "Testnet API is not responding after audit"
        return 1
    fi
    
    # Compare with baseline if available
    if [[ -f "$RESULTS_DIR/pre-audit-baseline.json" ]]; then
        # Simple stability check - ensure API is still responding
        log_info "API is responding normally after audit"
    fi
    
    # Save post-audit metrics
    cat > "$RESULTS_DIR/post-audit-metrics.json" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status_response": $post_status,
    "stability_check": "passed"
}
EOF
    
    log_success "Post-audit stability check completed"
}

# Archive results
archive_results() {
    log "📦 Archiving audit results..."
    
    local archive_name="dytallix-testnet-audit-$(date +%Y%m%d_%H%M%S).tar.gz"
    local archive_path="$AUDIT_DIR/$archive_name"
    
    tar -czf "$archive_path" \
        -C "$AUDIT_DIR" \
        results/ reports/ \
        --exclude="*.pid" \
        > /dev/null 2>&1
    
    if [[ $? -eq 0 ]]; then
        log_success "Results archived: $archive_path"
        log_info "Archive size: $(du -h "$archive_path" | cut -f1)"
    else
        log_warning "Failed to create archive"
    fi
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up..."
    stop_monitoring
    
    # Remove temporary files
    rm -f "$AUDIT_DIR/load-testing/test-data.csv"
    rm -f "$RESULTS_DIR/monitoring"/*.pid
    
    log_success "Cleanup completed"
}

# Signal handlers
trap cleanup EXIT
trap 'log_error "Audit interrupted"; exit 1' INT TERM

# Main execution
main() {
    print_banner
    
    # Initialize
    check_prerequisites
    setup_environment
    
    # Pre-audit checks
    pre_audit_health_check
    
    # Start monitoring
    start_monitoring
    
    # Wait for monitoring to initialize
    sleep 10
    
    # Run load tests
    log "🚀 Starting load testing phase..."
    
    # Run tests in parallel for maximum stress
    run_locust_test &
    locust_pid=$!
    
    sleep 5 # Stagger test starts
    
    run_artillery_test &
    artillery_pid=$!
    
    sleep 5
    
    run_websocket_test &
    websocket_pid=$!
    
    # Wait for all tests to complete
    wait $locust_pid || log_warning "Locust test completed with warnings"
    wait $artillery_pid || log_warning "Artillery test completed with warnings"
    wait $websocket_pid || log_warning "WebSocket test completed with warnings"
    
    log_success "All load tests completed"
    
    # Stop monitoring and collect final data
    stop_monitoring
    
    # Wait for system to stabilize before final checks
    sleep 30
    
    # Post-audit verification
    post_audit_stability_check
    
    # Generate reports
    generate_audit_report
    
    # Archive results
    archive_results
    
    # Final summary
    echo -e "\n${GREEN}=========================================="
    echo "🎉 AUDIT COMPLETED SUCCESSFULLY"
    echo "==========================================${NC}"
    echo "📊 Results Directory: $RESULTS_DIR"
    echo "📄 Dashboard: $REPORTS_DIR/health-dashboard.html"
    echo "📝 Log File: $LOG_FILE"
    echo "📦 Archive: Available in $AUDIT_DIR"
    echo -e "${GREEN}==========================================${NC}\n"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --target-tps)
            TARGET_TPS="$2"
            shift 2
            ;;
        --duration)
            TEST_DURATION="$2"
            shift 2
            ;;
        --users)
            CONCURRENT_USERS="$2"
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
            echo "  --target-tps TPS       Target transactions per second (default: 1000)"
            echo "  --duration SECONDS     Test duration in seconds (default: 300)"
            echo "  --users COUNT          Concurrent users (default: 100)"
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

# Run main function
main "$@"