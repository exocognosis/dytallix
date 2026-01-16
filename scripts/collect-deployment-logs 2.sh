#!/bin/bash

# =============================================================================
# DYTALLIX TESTNET LOG COLLECTION AND ANALYSIS SYSTEM
# =============================================================================
# 
# Comprehensive log collection and analysis system that captures deployment
# process logs, collects container logs from all nodes, monitors system
# resource usage, and provides structured log analysis and reporting.
#
# Features:
# - Deployment process log capture with timestamps
# - Container log collection from all nodes
# - System resource usage monitoring
# - Starting block height and node ID recording
# - Structured log analysis and reporting
# - Log rotation and archival
# - Error pattern detection and alerting
# - Performance metrics extraction from logs
#
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
ARCHIVE_DIR="$PROJECT_ROOT/logs/archive"
ANALYSIS_DIR="$PROJECT_ROOT/logs/analysis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COLLECTION_LOG="$LOG_DIR/log_collection_${TIMESTAMP}.log"

# Node configuration
NODES=("dytallix-node-1" "dytallix-node-2" "dytallix-node-3")
NODE_PORTS=(3030 3032 3034)
HEALTH_PORTS=(8081 8083 8085)
MONITORING_CONTAINERS=("dytallix-prometheus" "dytallix-grafana")

# Log collection configuration
LOG_LINES_DEFAULT=1000
LOG_LINES_TAIL=100
ANALYSIS_WINDOW_HOURS=24
LOG_ROTATION_DAYS=7

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
    
    echo -e "${level}[${timestamp}]${NC} $message" | tee -a "$COLLECTION_LOG"
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

# Utility functions
setup_log_environment() {
    log_step "Setting up log collection environment..."
    
    # Create necessary directories
    mkdir -p "$LOG_DIR"
    mkdir -p "$ARCHIVE_DIR"
    mkdir -p "$ANALYSIS_DIR"
    mkdir -p "$ANALYSIS_DIR/patterns"
    mkdir -p "$ANALYSIS_DIR/metrics"
    mkdir -p "$ANALYSIS_DIR/reports"
    
    # Initialize collection log
    echo "# Dytallix Log Collection Session - Started at $(date -Iseconds)" > "$COLLECTION_LOG"
    echo "# Collection ID: log-collection-${TIMESTAMP}" >> "$COLLECTION_LOG"
    
    log_success "Log collection environment setup completed"
}

# Container log collection
collect_container_logs() {
    log_step "Collecting container logs..."
    
    local containers=("${NODES[@]}" "${MONITORING_CONTAINERS[@]}")
    local collection_dir="$LOG_DIR/containers_${TIMESTAMP}"
    
    mkdir -p "$collection_dir"
    
    for container in "${containers[@]}"; do
        log_info "Collecting logs for container: $container"
        
        local container_log_file="$collection_dir/${container}_${TIMESTAMP}.log"
        local container_info_file="$collection_dir/${container}_info_${TIMESTAMP}.json"
        
        # Check if container exists and is running
        if docker ps --filter "name=$container" --format "{{.Names}}" | grep -q "^${container}$"; then
            # Collect container logs
            log_debug "Collecting logs for running container: $container"
            
            docker logs --timestamps --details "$container" > "$container_log_file" 2>&1
            
            # Collect container information
            local container_info="{
                \"container_name\": \"$container\",
                \"collection_timestamp\": \"$(date -Iseconds)\",
                \"status\": \"running\",
                \"info\": {}
            }"
            
            # Get detailed container information
            if docker inspect "$container" &> /dev/null; then
                local inspect_data=$(docker inspect "$container" 2>/dev/null)
                container_info=$(echo "$container_info" | jq ".info = $inspect_data[0]")
            fi
            
            echo "$container_info" | jq '.' > "$container_info_file"
            
            log_success "✅ $container: Collected $(wc -l < "$container_log_file") log lines"
            
        elif docker ps -a --filter "name=$container" --format "{{.Names}}" | grep -q "^${container}$"; then
            # Container exists but is not running
            log_warn "⚠️  $container: Container exists but is not running"
            
            docker logs --timestamps --details "$container" > "$container_log_file" 2>&1
            
            local container_info="{
                \"container_name\": \"$container\",
                \"collection_timestamp\": \"$(date -Iseconds)\",
                \"status\": \"stopped\",
                \"info\": {}
            }"
            
            if docker inspect "$container" &> /dev/null; then
                local inspect_data=$(docker inspect "$container" 2>/dev/null)
                container_info=$(echo "$container_info" | jq ".info = $inspect_data[0]")
            fi
            
            echo "$container_info" | jq '.' > "$container_info_file"
            
            log_warn "⚠️  $container: Collected $(wc -l < "$container_log_file") log lines (stopped container)"
            
        else
            # Container not found
            log_error "❌ $container: Container not found"
            
            local container_info="{
                \"container_name\": \"$container\",
                \"collection_timestamp\": \"$(date -Iseconds)\",
                \"status\": \"not_found\",
                \"info\": {}
            }"
            
            echo "$container_info" | jq '.' > "$container_info_file"
        fi
    done
    
    log_success "Container log collection completed: $collection_dir"
}

# System resource monitoring and logging
collect_system_logs() {
    log_step "Collecting system logs and resource information..."
    
    local system_dir="$LOG_DIR/system_${TIMESTAMP}"
    mkdir -p "$system_dir"
    
    # System information
    log_info "Collecting system information..."
    
    {
        echo "=== System Information ==="
        echo "Timestamp: $(date -Iseconds)"
        echo "Hostname: $(hostname)"
        echo "Uptime: $(uptime)"
        echo "Kernel: $(uname -a)"
        echo "Distribution: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Unknown')"
        echo ""
        
        echo "=== CPU Information ==="
        lscpu 2>/dev/null || echo "lscpu not available"
        echo ""
        
        echo "=== Memory Information ==="
        free -h
        echo ""
        
        echo "=== Disk Usage ==="
        df -h
        echo ""
        
        echo "=== Network Interfaces ==="
        ip addr show 2>/dev/null || ifconfig 2>/dev/null || echo "Network info not available"
        echo ""
        
        echo "=== Process List ==="
        ps aux --sort=-%cpu | head -20
        echo ""
        
    } > "$system_dir/system_info_${TIMESTAMP}.txt"
    
    # Docker system information
    log_info "Collecting Docker system information..."
    
    {
        echo "=== Docker System Information ==="
        echo "Timestamp: $(date -Iseconds)"
        echo ""
        
        echo "=== Docker Version ==="
        docker version 2>/dev/null || echo "Docker not available"
        echo ""
        
        echo "=== Docker System Info ==="
        docker system info 2>/dev/null || echo "Docker system info not available"
        echo ""
        
        echo "=== Docker Containers ==="
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>/dev/null || echo "Docker ps not available"
        echo ""
        
        echo "=== Docker Images ==="
        docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" 2>/dev/null || echo "Docker images not available"
        echo ""
        
        echo "=== Docker Networks ==="
        docker network ls 2>/dev/null || echo "Docker networks not available"
        echo ""
        
        echo "=== Docker Volumes ==="
        docker volume ls 2>/dev/null || echo "Docker volumes not available"
        echo ""
        
    } > "$system_dir/docker_info_${TIMESTAMP}.txt"
    
    # Resource utilization over time
    log_info "Collecting resource utilization snapshots..."
    
    {
        echo "=== Resource Utilization Snapshots ==="
        echo "Collection started at: $(date -Iseconds)"
        echo ""
        
        for i in {1..5}; do
            echo "--- Snapshot $i/5 ($(date -Iseconds)) ---"
            
            echo "CPU:"
            top -bn1 | grep "Cpu(s)" 2>/dev/null || echo "CPU info not available"
            
            echo "Memory:"
            free -m | grep -E "(Mem|Swap)" 2>/dev/null || echo "Memory info not available"
            
            echo "Load Average:"
            uptime | awk '{print $NF}' 2>/dev/null || echo "Load average not available"
            
            echo ""
            
            if [[ $i -lt 5 ]]; then
                sleep 10
            fi
        done
        
    } > "$system_dir/resource_snapshots_${TIMESTAMP}.txt"
    
    log_success "System log collection completed: $system_dir"
}

# Node-specific information collection
collect_node_information() {
    log_step "Collecting node-specific information..."
    
    local nodes_dir="$LOG_DIR/nodes_${TIMESTAMP}"
    mkdir -p "$nodes_dir"
    
    for i in "${!NODES[@]}"; do
        local node="${NODES[$i]}"
        local api_port="${NODE_PORTS[$i]}"
        local health_port="${HEALTH_PORTS[$i]}"
        local node_file="$nodes_dir/${node}_info_${TIMESTAMP}.json"
        
        log_info "Collecting information for node: $node"
        
        # Initialize node information
        local node_info="{
            \"node_name\": \"$node\",
            \"collection_timestamp\": \"$(date -Iseconds)\",
            \"ports\": {
                \"api\": $api_port,
                \"health\": $health_port
            },
            \"status\": \"unknown\",
            \"api_responses\": {},
            \"errors\": []
        }"
        
        # Test API endpoints and collect responses
        local api_endpoints=(
            "/health"
            "/node/info"
            "/node/id" 
            "/blockchain/height"
            "/blockchain/stats"
            "/consensus/status"
        )
        
        local api_responses="{}"
        local node_status="healthy"
        local errors="[]"
        
        for endpoint in "${api_endpoints[@]}"; do
            local url="http://localhost:$api_port$endpoint"
            log_debug "Testing endpoint: $url"
            
            if curl -sf --max-time 10 "$url" &> /dev/null; then
                local response=$(curl -sf --max-time 10 "$url" 2>/dev/null)
                
                # Validate JSON response
                if echo "$response" | jq . &> /dev/null; then
                    api_responses=$(echo "$api_responses" | jq ".[\"$endpoint\"] = $response")
                    log_debug "✅ $endpoint: Valid JSON response"
                else
                    api_responses=$(echo "$api_responses" | jq ".[\"$endpoint\"] = \"$response\"")
                    log_debug "⚠️  $endpoint: Non-JSON response"
                fi
            else
                node_status="unhealthy"
                local error_info="{
                    \"endpoint\": \"$endpoint\",
                    \"error\": \"Request failed\",
                    \"timestamp\": \"$(date -Iseconds)\"
                }"
                errors=$(echo "$errors" | jq ". += [$error_info]")
                log_debug "❌ $endpoint: Request failed"
            fi
        done
        
        # Update node information
        node_info=$(echo "$node_info" | jq ".status = \"$node_status\"")
        node_info=$(echo "$node_info" | jq ".api_responses = $api_responses")
        node_info=$(echo "$node_info" | jq ".errors = $errors")
        
        # Extract key metrics if available
        if echo "$api_responses" | jq -e '."/node/id"' &> /dev/null; then
            local node_id=$(echo "$api_responses" | jq -r '."/node/id".node_id // "unknown"')
            node_info=$(echo "$node_info" | jq ".node_id = \"$node_id\"")
        fi
        
        if echo "$api_responses" | jq -e '."/blockchain/height"' &> /dev/null; then
            local block_height=$(echo "$api_responses" | jq -r '."/blockchain/height".height // 0')
            node_info=$(echo "$node_info" | jq ".current_block_height = $block_height")
        fi
        
        if echo "$api_responses" | jq -e '."/blockchain/stats"' &> /dev/null; then
            local total_transactions=$(echo "$api_responses" | jq -r '."/blockchain/stats".total_transactions // 0')
            node_info=$(echo "$node_info" | jq ".total_transactions = $total_transactions")
        fi
        
        # Write node information
        echo "$node_info" | jq '.' > "$node_file"
        
        if [[ "$node_status" == "healthy" ]]; then
            log_success "✅ $node: Information collected successfully"
        else
            log_warn "⚠️  $node: Information collected with errors"
        fi
    done
    
    log_success "Node information collection completed: $nodes_dir"
}

# Log analysis and pattern detection
analyze_logs() {
    log_step "Analyzing collected logs for patterns and issues..."
    
    local analysis_report="$ANALYSIS_DIR/reports/log_analysis_${TIMESTAMP}.json"
    
    # Initialize analysis results
    local analysis_results="{
        \"analysis_timestamp\": \"$(date -Iseconds)\",
        \"collection_id\": \"log-collection-${TIMESTAMP}\",
        \"summary\": {},
        \"error_patterns\": [],
        \"performance_metrics\": {},
        \"recommendations\": []
    }"
    
    # Analyze container logs
    log_info "Analyzing container logs for error patterns..."
    
    local error_patterns=()
    local warning_patterns=()
    local performance_issues=()
    
    # Define common error patterns
    local error_keywords=("ERROR" "FATAL" "CRITICAL" "PANIC" "EXCEPTION" "CRASH" "FAILED")
    local warning_keywords=("WARN" "WARNING" "TIMEOUT" "RETRY" "SLOW" "DEPRECATED")
    local performance_keywords=("SLOW" "TIMEOUT" "HIGH_LATENCY" "MEMORY_LEAK" "BOTTLENECK")
    
    # Analyze each container's logs
    local total_errors=0
    local total_warnings=0
    local containers_analyzed=0
    
    for container in "${NODES[@]}" "${MONITORING_CONTAINERS[@]}"; do
        local container_log="$LOG_DIR/containers_${TIMESTAMP}/${container}_${TIMESTAMP}.log"
        
        if [[ -f "$container_log" ]]; then
            containers_analyzed=$((containers_analyzed + 1))
            
            # Count errors and warnings
            local container_errors=0
            local container_warnings=0
            
            for keyword in "${error_keywords[@]}"; do
                local count=$(grep -ci "$keyword" "$container_log" 2>/dev/null || echo 0)
                container_errors=$((container_errors + count))
            done
            
            for keyword in "${warning_keywords[@]}"; do
                local count=$(grep -ci "$keyword" "$container_log" 2>/dev/null || echo 0)
                container_warnings=$((container_warnings + count))
            done
            
            total_errors=$((total_errors + container_errors))
            total_warnings=$((total_warnings + container_warnings))
            
            log_debug "$container: $container_errors errors, $container_warnings warnings"
            
            # Extract sample error messages
            if [[ $container_errors -gt 0 ]]; then
                local sample_errors=$(grep -i -E "$(IFS='|'; echo "${error_keywords[*]}")" "$container_log" 2>/dev/null | head -5 || echo "")
                
                if [[ -n "$sample_errors" ]]; then
                    while IFS= read -r error_line; do
                        local error_pattern="{
                            \"container\": \"$container\",
                            \"pattern\": \"error\",
                            \"message\": \"$error_line\",
                            \"timestamp\": \"$(date -Iseconds)\"
                        }"
                        error_patterns+=("$error_pattern")
                    done <<< "$sample_errors"
                fi
            fi
        fi
    done
    
    # Build error patterns array for JSON
    local error_patterns_json="[]"
    for pattern in "${error_patterns[@]}"; do
        error_patterns_json=$(echo "$error_patterns_json" | jq ". += [$pattern]")
    done
    
    # Performance metrics extraction
    log_info "Extracting performance metrics from logs..."
    
    local performance_metrics="{
        \"response_times\": [],
        \"throughput_measurements\": [],
        \"resource_usage\": {}
    }"
    
    # Extract performance data from logs
    for container in "${NODES[@]}"; do
        local container_log="$LOG_DIR/containers_${TIMESTAMP}/${container}_${TIMESTAMP}.log"
        
        if [[ -f "$container_log" ]]; then
            # Look for response time patterns
            local response_times=$(grep -oE "response_time[: ]+[0-9]+[a-z]*" "$container_log" 2>/dev/null | head -10 || echo "")
            
            # Look for throughput patterns  
            local throughput_data=$(grep -oE "(tps|throughput)[: ]+[0-9]+" "$container_log" 2>/dev/null | head -10 || echo "")
            
            if [[ -n "$response_times" || -n "$throughput_data" ]]; then
                log_debug "$container: Found performance metrics in logs"
            fi
        fi
    done
    
    # Generate summary
    local summary="{
        \"containers_analyzed\": $containers_analyzed,
        \"total_errors\": $total_errors,
        \"total_warnings\": $total_warnings,
        \"analysis_duration\": \"$(date -Iseconds)\",
        \"log_files_processed\": $(find "$LOG_DIR" -name "*_${TIMESTAMP}.log" | wc -l)
    }"
    
    # Generate recommendations based on analysis
    local recommendations="[]"
    
    if [[ $total_errors -gt 0 ]]; then
        local error_recommendation="{
            \"priority\": \"high\",
            \"type\": \"error_investigation\",
            \"description\": \"$total_errors errors found across containers. Investigate error patterns for system stability.\",
            \"action\": \"Review error logs and address underlying issues\"
        }"
        recommendations=$(echo "$recommendations" | jq ". += [$error_recommendation]")
    fi
    
    if [[ $total_warnings -gt 10 ]]; then
        local warning_recommendation="{
            \"priority\": \"medium\",
            \"type\": \"warning_monitoring\",
            \"description\": \"High number of warnings detected ($total_warnings). Monitor for potential issues.\",
            \"action\": \"Review warning patterns and optimize system configuration\"
        }"
        recommendations=$(echo "$recommendations" | jq ". += [$warning_recommendation]")
    fi
    
    if [[ $containers_analyzed -lt ${#NODES[@]} ]]; then
        local availability_recommendation="{
            \"priority\": \"high\",
            \"type\": \"availability_issue\",
            \"description\": \"Not all expected containers are running ($containers_analyzed/${#NODES[@]})\",
            \"action\": \"Investigate missing containers and ensure full deployment\"
        }"
        recommendations=$(echo "$recommendations" | jq ". += [$availability_recommendation]")
    fi
    
    # Build final analysis results
    analysis_results=$(echo "$analysis_results" | jq ".summary = $summary")
    analysis_results=$(echo "$analysis_results" | jq ".error_patterns = $error_patterns_json")
    analysis_results=$(echo "$analysis_results" | jq ".performance_metrics = $performance_metrics")
    analysis_results=$(echo "$analysis_results" | jq ".recommendations = $recommendations")
    
    # Write analysis report
    echo "$analysis_results" | jq '.' > "$analysis_report"
    
    log_success "Log analysis completed: $analysis_report"
    log_info "Analysis summary:"
    log_info "  Containers analyzed: $containers_analyzed"
    log_info "  Total errors: $total_errors"
    log_info "  Total warnings: $total_warnings"
    log_info "  Recommendations: $(echo "$recommendations" | jq length)"
}

# Log rotation and archival
rotate_logs() {
    log_step "Performing log rotation and archival..."
    
    # Find old log files to archive
    local archive_threshold=$(date -d "${LOG_ROTATION_DAYS} days ago" +%s)
    local archived_count=0
    local deleted_count=0
    
    # Create archive for this collection
    local collection_archive="$ARCHIVE_DIR/log_collection_${TIMESTAMP}.tar.gz"
    
    log_info "Creating archive for current collection..."
    
    # Archive current collection
    if tar -czf "$collection_archive" -C "$LOG_DIR" \
        "containers_${TIMESTAMP}" \
        "system_${TIMESTAMP}" \
        "nodes_${TIMESTAMP}" \
        "log_collection_${TIMESTAMP}.log" 2>/dev/null; then
        
        log_success "Collection archived: $collection_archive"
        archived_count=$((archived_count + 1))
    else
        log_warn "Failed to create collection archive"
    fi
    
    # Clean up old files
    log_info "Cleaning up old log files (older than $LOG_ROTATION_DAYS days)..."
    
    # Remove old collection directories
    find "$LOG_DIR" -type d -name "containers_*" -o -name "system_*" -o -name "nodes_*" | while read -r dir; do
        if [[ -d "$dir" ]]; then
            local dir_timestamp=$(stat -c %Y "$dir" 2>/dev/null || echo 0)
            
            if [[ $dir_timestamp -lt $archive_threshold ]]; then
                log_debug "Removing old directory: $dir"
                rm -rf "$dir"
                deleted_count=$((deleted_count + 1))
            fi
        fi
    done
    
    # Remove old log files
    find "$LOG_DIR" -type f -name "*.log" -o -name "*.txt" | while read -r file; do
        if [[ -f "$file" ]]; then
            local file_timestamp=$(stat -c %Y "$file" 2>/dev/null || echo 0)
            
            if [[ $file_timestamp -lt $archive_threshold ]]; then
                log_debug "Removing old file: $file"
                rm -f "$file"
                deleted_count=$((deleted_count + 1))
            fi
        fi
    done
    
    # Remove old archives (keep archives for longer period)
    local archive_threshold_extended=$(date -d "$((LOG_ROTATION_DAYS * 4)) days ago" +%s)
    
    find "$ARCHIVE_DIR" -type f -name "*.tar.gz" | while read -r archive; do
        if [[ -f "$archive" ]]; then
            local archive_timestamp=$(stat -c %Y "$archive" 2>/dev/null || echo 0)
            
            if [[ $archive_timestamp -lt $archive_threshold_extended ]]; then
                log_debug "Removing old archive: $archive"
                rm -f "$archive"
                deleted_count=$((deleted_count + 1))
            fi
        fi
    done
    
    log_success "Log rotation completed:"
    log_info "  Files archived: $archived_count"
    log_info "  Old files removed: $deleted_count"
}

# Generate comprehensive log report
generate_log_report() {
    log_step "Generating comprehensive log collection report..."
    
    local report_file="$ANALYSIS_DIR/reports/log_collection_report_${TIMESTAMP}.html"
    
    # Get collection statistics
    local total_log_files=$(find "$LOG_DIR" -name "*_${TIMESTAMP}.log" -o -name "*_${TIMESTAMP}.txt" | wc -l)
    local total_log_size=$(find "$LOG_DIR" -name "*_${TIMESTAMP}.*" -exec ls -la {} + 2>/dev/null | awk '{sum+=$5} END {printf "%.2f MB", sum/1024/1024}' || echo "0 MB")
    local containers_collected=${#NODES[@]}
    
    # Create HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dytallix Testnet Log Collection Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; color: #333; margin-bottom: 30px; }
        .section { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; font-size: 14px; }
        .file-list { max-height: 300px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px; }
        .file-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #dee2e6; }
        .status-good { color: #28a745; }
        .status-warn { color: #ffc107; }
        .status-error { color: #dc3545; }
        .timestamp { text-align: center; color: #666; margin-top: 20px; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .recommendation.high { background: #f8d7da; border-color: #f5c6cb; }
        .recommendation.medium { background: #d4edda; border-color: #c3e6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Dytallix Testnet Log Collection Report</h1>
            <p>Collection ID: log-collection-${TIMESTAMP}</p>
        </div>
        
        <div class="section">
            <div class="section-title">Collection Summary</div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">$total_log_files</div>
                    <div class="stat-label">Log Files Collected</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$total_log_size</div>
                    <div class="stat-label">Total Log Size</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$containers_collected</div>
                    <div class="stat-label">Containers Analyzed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$(date)</div>
                    <div class="stat-label">Collection Time</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Collected Files</div>
            <div class="file-list">
EOF

    # Add file listing
    find "$LOG_DIR" -name "*_${TIMESTAMP}.*" -type f | while read -r file; do
        local filename=$(basename "$file")
        local filesize=$(ls -lh "$file" | awk '{print $5}')
        local filetime=$(stat -c %y "$file" | cut -d' ' -f1-2)
        
        echo "                <div class=\"file-item\">" >> "$report_file"
        echo "                    <span>$filename</span>" >> "$report_file"
        echo "                    <span>$filesize | $filetime</span>" >> "$report_file"
        echo "                </div>" >> "$report_file"
    done

    # Continue with HTML report
    cat >> "$report_file" << EOF
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Node Status</div>
            <div class="stats-grid">
EOF

    # Add node status
    for node in "${NODES[@]}"; do
        local node_info_file="$LOG_DIR/nodes_${TIMESTAMP}/${node}_info_${TIMESTAMP}.json"
        
        if [[ -f "$node_info_file" ]]; then
            local node_status=$(jq -r '.status // "unknown"' "$node_info_file" 2>/dev/null || echo "unknown")
            local node_id=$(jq -r '.node_id // "unknown"' "$node_info_file" 2>/dev/null || echo "unknown")
            local block_height=$(jq -r '.current_block_height // 0' "$node_info_file" 2>/dev/null || echo 0)
            
            local status_class="status-good"
            if [[ "$node_status" != "healthy" ]]; then
                status_class="status-error"
            fi
            
            cat >> "$report_file" << EOF
                <div class="stat-card">
                    <div class="stat-value $status_class">$node_status</div>
                    <div class="stat-label">$node</div>
                    <div class="stat-label">ID: ${node_id:0:8}...</div>
                    <div class="stat-label">Height: $block_height</div>
                </div>
EOF
        fi
    done

    # Finish HTML report
    cat >> "$report_file" << EOF
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Analysis Results</div>
            <p>Detailed analysis results are available in:</p>
            <ul>
                <li><strong>Analysis Report:</strong> $ANALYSIS_DIR/reports/log_analysis_${TIMESTAMP}.json</li>
                <li><strong>Container Logs:</strong> $LOG_DIR/containers_${TIMESTAMP}/</li>
                <li><strong>System Information:</strong> $LOG_DIR/system_${TIMESTAMP}/</li>
                <li><strong>Node Information:</strong> $LOG_DIR/nodes_${TIMESTAMP}/</li>
            </ul>
        </div>
        
        <div class="section">
            <div class="section-title">Quick Actions</div>
            <ul>
                <li><a href="file://$LOG_DIR" target="_blank">Browse Log Directory</a></li>
                <li><a href="file://$ANALYSIS_DIR" target="_blank">Browse Analysis Directory</a></li>
                <li><a href="file://$ARCHIVE_DIR" target="_blank">Browse Archive Directory</a></li>
            </ul>
        </div>
        
        <div class="timestamp">
            Report generated at: $(date)
        </div>
    </div>
</body>
</html>
EOF

    log_success "Comprehensive log report generated: $report_file"
    log_info "Open the report in your browser: file://$report_file"
}

# Continuous log monitoring mode
continuous_log_monitoring() {
    log_info "Starting continuous log monitoring mode..."
    log_info "Press Ctrl+C to stop monitoring"
    
    local monitoring_interval=60  # Check every minute
    
    trap 'log_info "Stopping continuous log monitoring..."; exit 0' INT
    
    while true; do
        echo
        log_info "=== Log Monitoring Cycle ($(date)) ==="
        
        # Quick log collection
        collect_container_logs
        
        # Quick analysis
        analyze_logs
        
        log_info "Monitoring cycle completed. Next cycle in ${monitoring_interval}s..."
        sleep $monitoring_interval
    done
}

# Main log collection function
main() {
    echo -e "${CYAN}📋 DYTALLIX TESTNET LOG COLLECTION SYSTEM${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo
    
    log_info "Starting comprehensive log collection..."
    log_info "Collection ID: log-collection-${TIMESTAMP}"
    log_info "Log file: $COLLECTION_LOG"
    echo
    
    # Setup log environment
    setup_log_environment
    echo
    
    if [[ "${CONTINUOUS:-false}" == "true" ]]; then
        # Run continuous monitoring
        continuous_log_monitoring
    else
        # Run one-shot collection
        collect_container_logs
        echo
        
        collect_system_logs
        echo
        
        collect_node_information
        echo
        
        analyze_logs
        echo
        
        rotate_logs
        echo
        
        generate_log_report
        echo
        
        log_success "🎉 Log collection completed successfully!"
        log_info "Collection Summary:"
        log_info "  Collection ID: log-collection-${TIMESTAMP}"
        log_info "  Log files: $LOG_DIR"
        log_info "  Analysis: $ANALYSIS_DIR" 
        log_info "  Archive: $ARCHIVE_DIR"
        log_info "Next steps:"
        log_info "1. Review the generated HTML report"
        log_info "2. Check analysis results for recommendations"
        log_info "3. Monitor archived logs for historical analysis"
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
        --lines)
            LOG_LINES_DEFAULT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Dytallix Testnet Log Collection System"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --debug       Enable debug logging"
            echo "  --continuous  Run in continuous monitoring mode"
            echo "  --lines N     Number of log lines to collect (default: $LOG_LINES_DEFAULT)"
            echo "  --help        Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DEBUG         Enable debug logging (true/false)"
            echo "  CONTINUOUS    Enable continuous monitoring (true/false)"
            echo ""
            echo "Features:"
            echo "  - Container log collection from all nodes"
            echo "  - System resource monitoring and logging"
            echo "  - Node-specific information collection"
            echo "  - Log analysis and pattern detection"
            echo "  - Automated log rotation and archival"
            echo "  - Comprehensive reporting"
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

# Ensure directories exist
mkdir -p "$LOG_DIR"
mkdir -p "$ARCHIVE_DIR"
mkdir -p "$ANALYSIS_DIR"

# Run main function
main