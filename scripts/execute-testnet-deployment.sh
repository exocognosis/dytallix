#!/bin/bash

# =============================================================================
# DYTALLIX ENHANCED TESTNET DEPLOYMENT EXECUTION
# =============================================================================
# 
# Enhanced deployment execution system that automates the testnet deployment
# process with comprehensive error handling, real-time monitoring, and 
# detailed logging and status reporting.
#
# Features:
# - Environment prerequisite validation
# - Real-time deployment progress monitoring
# - Comprehensive error handling and recovery
# - Detailed logging with timestamps
# - Integration with existing infrastructure
#
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOYMENT_DIR="$PROJECT_ROOT/deployment"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOYMENT_LOG="$LOG_DIR/deployment_${TIMESTAMP}.log"

# Docker configuration
COMPOSE_FILE="$DEPLOYMENT_DIR/docker/docker-compose.testnet.yml"
MONITORING_COMPOSE="$DEPLOYMENT_DIR/docker/docker-compose.monitoring.yml"

# Node configuration
NODES=("dytallix-node-1" "dytallix-node-2" "dytallix-node-3")
NODE_PORTS=(3030 3032 3034)
HEALTH_PORTS=(8081 8083 8085)
METRICS_PORTS=(9090 9091 9092)

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
NC='\033[0m' # No Color

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${level}[${timestamp}]${NC} $message" | tee -a "$DEPLOYMENT_LOG"
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

# Error handling
cleanup_on_error() {
    log_error "Deployment failed! Cleaning up..."
    
    # Stop any running containers
    if command -v docker-compose &> /dev/null; then
        cd "$DEPLOYMENT_DIR/docker"
        docker-compose -f docker-compose.testnet.yml down 2>/dev/null || true
        docker-compose -f docker-compose.monitoring.yml down 2>/dev/null || true
        cd - > /dev/null
    fi
    
    # Archive logs for debugging
    local archive_name="failed_deployment_${TIMESTAMP}.tar.gz"
    tar -czf "$LOG_DIR/$archive_name" -C "$LOG_DIR" . 2>/dev/null || true
    log_info "Logs archived to: $LOG_DIR/$archive_name"
    
    exit 1
}

trap cleanup_on_error ERR

# Prerequisite validation
validate_prerequisites() {
    log_step "Validating deployment prerequisites..."
    
    local missing_deps=()
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    else
        log_debug "Docker found: $(docker --version)"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    else
        log_debug "Docker Compose found: $(docker-compose --version)"
    fi
    
    # Check curl for health checks
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    # Check jq for JSON parsing
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and try again"
        return 1
    fi
    
    # Verify Docker is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        return 1
    fi
    
    # Check available disk space (minimum 10GB)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    local min_space=$((10 * 1024 * 1024)) # 10GB in KB
    
    if [[ $available_space -lt $min_space ]]; then
        log_error "Insufficient disk space. Available: ${available_space}KB, Required: ${min_space}KB"
        return 1
    fi
    
    # Check required files exist
    local required_files=(
        "$COMPOSE_FILE"
        "$PROJECT_ROOT/Dockerfile"
        "$PROJECT_ROOT/Cargo.toml"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file not found: $file"
            return 1
        fi
    done
    
    log_success "All prerequisites validated successfully"
}

# Environment setup
setup_environment() {
    log_step "Setting up deployment environment..."
    
    # Create necessary directories
    mkdir -p "$LOG_DIR"
    mkdir -p "$DEPLOYMENT_DIR/docker/secrets"
    mkdir -p "$DEPLOYMENT_DIR/monitoring/grafana/dashboards"
    mkdir -p "$DEPLOYMENT_DIR/monitoring/grafana/datasources"
    
    # Generate environment-specific configuration
    cat > "$DEPLOYMENT_DIR/docker/.env" << EOF
# Dytallix Testnet Environment Configuration
COMPOSE_PROJECT_NAME=dytallix-testnet
DYTALLIX_ENVIRONMENT=testnet
DYTALLIX_LOG_LEVEL=info
DYTALLIX_METRICS_ENABLED=true
DYTALLIX_AUDIT_LOGGING=true
DYTALLIX_REQUIRE_TLS=false

# Performance Configuration
DYTALLIX_TARGET_TPS=$TARGET_TPS
DYTALLIX_TARGET_BLOCK_TIME=$TARGET_BLOCK_TIME
DYTALLIX_MAX_PEERS=50

# Deployment Metadata
DEPLOYMENT_TIMESTAMP=$TIMESTAMP
DEPLOYMENT_ID=testnet-${TIMESTAMP}
EOF
    
    # Create monitoring configuration
    cat > "$DEPLOYMENT_DIR/monitoring/grafana/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    basicAuth: false
    jsonData:
      httpMethod: POST
      scrapeInterval: "5s"
    editable: true
EOF
    
    log_success "Environment setup completed"
}

# Build Docker images
build_images() {
    log_step "Building Dytallix Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build main application image with caching
    log_info "Building dytallix:testnet image..."
    docker build \
        --tag dytallix:testnet \
        --tag dytallix:latest \
        --build-arg RUST_LOG=info \
        --build-arg ENVIRONMENT=testnet \
        . 2>&1 | tee -a "$DEPLOYMENT_LOG"
    
    # Verify image was built successfully
    if docker images dytallix:testnet --format "table {{.Repository}}:{{.Tag}}" | grep -q "dytallix:testnet"; then
        log_success "Docker image built successfully"
        log_debug "Image details: $(docker images dytallix:testnet --format 'Size: {{.Size}}, Created: {{.CreatedAt}}')"
    else
        log_error "Failed to build Docker image"
        return 1
    fi
    
    cd - > /dev/null
}

# Deploy testnet
deploy_testnet() {
    log_step "Deploying Dytallix testnet..."
    
    cd "$DEPLOYMENT_DIR/docker"
    
    # Pull external images
    log_info "Pulling external Docker images..."
    docker-compose -f docker-compose.testnet.yml pull prometheus grafana 2>&1 | tee -a "$DEPLOYMENT_LOG"
    
    # Start services with dependency order
    log_info "Starting testnet services..."
    docker-compose -f docker-compose.testnet.yml up -d 2>&1 | tee -a "$DEPLOYMENT_LOG"
    
    # Wait for containers to be created
    sleep 5
    
    # Verify containers are running
    log_info "Verifying container status..."
    local failed_containers=()
    
    for container in "${NODES[@]}" "dytallix-prometheus" "dytallix-grafana"; do
        if ! docker ps --filter "name=$container" --filter "status=running" --quiet | grep -q .; then
            failed_containers+=("$container")
        fi
    done
    
    if [[ ${#failed_containers[@]} -gt 0 ]]; then
        log_error "Failed to start containers: ${failed_containers[*]}"
        
        # Show container logs for debugging
        for container in "${failed_containers[@]}"; do
            log_info "Logs for $container:"
            docker logs "$container" 2>&1 | tail -20 | tee -a "$DEPLOYMENT_LOG"
        done
        
        return 1
    fi
    
    log_success "All containers started successfully"
    cd - > /dev/null
}

# Monitor deployment progress
monitor_deployment_progress() {
    log_step "Monitoring deployment progress..."
    
    local max_wait=300  # 5 minutes
    local wait_interval=10
    local elapsed=0
    
    log_info "Waiting for services to initialize (max ${max_wait}s)..."
    
    while [[ $elapsed -lt $max_wait ]]; do
        local healthy_nodes=0
        local total_checks=0
        
        # Check each node health endpoint
        for i in "${!NODES[@]}"; do
            local node="${NODES[$i]}"
            local port="${HEALTH_PORTS[$i]}"
            
            total_checks=$((total_checks + 1))
            
            if curl -sf "http://localhost:$port/health" &> /dev/null; then
                healthy_nodes=$((healthy_nodes + 1))
                log_debug "$node is healthy"
            else
                log_debug "$node is not yet ready"
            fi
        done
        
        # Check Prometheus
        if curl -sf "http://localhost:9093/api/v1/query?query=up" &> /dev/null; then
            log_debug "Prometheus is healthy"
        fi
        
        # Check Grafana
        if curl -sf "http://localhost:3000/api/health" &> /dev/null; then
            log_debug "Grafana is healthy"
        fi
        
        log_info "Healthy nodes: $healthy_nodes/$total_checks (${elapsed}s elapsed)"
        
        # Check if all nodes are healthy
        if [[ $healthy_nodes -eq $total_checks ]]; then
            log_success "All nodes are healthy and ready!"
            return 0
        fi
        
        sleep $wait_interval
        elapsed=$((elapsed + wait_interval))
    done
    
    log_error "Deployment health check timed out after ${max_wait}s"
    return 1
}

# Generate deployment report
generate_deployment_report() {
    log_step "Generating deployment report..."
    
    local report_file="$LOG_DIR/deployment_report_${TIMESTAMP}.json"
    
    # Collect deployment information
    local deployment_info="{
        \"deployment_id\": \"testnet-${TIMESTAMP}\",
        \"timestamp\": \"$(date -Iseconds)\",
        \"status\": \"success\",
        \"nodes\": [],
        \"services\": {},
        \"performance_targets\": {
            \"target_tps\": $TARGET_TPS,
            \"target_block_time\": $TARGET_BLOCK_TIME,
            \"target_availability\": $TARGET_AVAILABILITY
        }
    }"
    
    # Collect node information
    local nodes_json="[]"
    for i in "${!NODES[@]}"; do
        local node="${NODES[$i]}"
        local api_port="${NODE_PORTS[$i]}"
        local health_port="${HEALTH_PORTS[$i]}"
        local metrics_port="${METRICS_PORTS[$i]}"
        
        # Get container info
        local container_id=$(docker ps --filter "name=$node" --format "{{.ID}}" 2>/dev/null || echo "unknown")
        local container_status=$(docker ps --filter "name=$node" --format "{{.Status}}" 2>/dev/null || echo "unknown")
        
        # Get node ID if available
        local node_id="unknown"
        if curl -sf "http://localhost:$api_port/node/id" &> /dev/null; then
            node_id=$(curl -sf "http://localhost:$api_port/node/id" 2>/dev/null | jq -r '.node_id' 2>/dev/null || echo "unknown")
        fi
        
        # Get starting block height if available
        local block_height=0
        if curl -sf "http://localhost:$api_port/blockchain/height" &> /dev/null; then
            block_height=$(curl -sf "http://localhost:$api_port/blockchain/height" 2>/dev/null | jq -r '.height' 2>/dev/null || echo 0)
        fi
        
        local node_info="{
            \"name\": \"$node\",
            \"container_id\": \"$container_id\",
            \"status\": \"$container_status\",
            \"ports\": {
                \"api\": $api_port,
                \"health\": $health_port,
                \"metrics\": $metrics_port
            },
            \"node_id\": \"$node_id\",
            \"starting_block_height\": $block_height
        }"
        
        nodes_json=$(echo "$nodes_json" | jq ". += [$node_info]")
    done
    
    # Update deployment info with nodes
    deployment_info=$(echo "$deployment_info" | jq ".nodes = $nodes_json")
    
    # Add service information
    local services_info="{
        \"prometheus\": {
            \"url\": \"http://localhost:9093\",
            \"status\": \"$(curl -sf http://localhost:9093/api/v1/query?query=up > /dev/null && echo 'healthy' || echo 'unhealthy')\"
        },
        \"grafana\": {
            \"url\": \"http://localhost:3000\",
            \"status\": \"$(curl -sf http://localhost:3000/api/health > /dev/null && echo 'healthy' || echo 'unhealthy')\",
            \"admin_password\": \"dytallix_testnet_admin\"
        }
    }"
    
    deployment_info=$(echo "$deployment_info" | jq ".services = $services_info")
    
    # Write report
    echo "$deployment_info" | jq '.' > "$report_file"
    
    log_success "Deployment report generated: $report_file"
    
    # Display summary
    log_info "=== DEPLOYMENT SUMMARY ==="
    log_info "Deployment ID: testnet-${TIMESTAMP}"
    log_info "Nodes deployed: ${#NODES[@]}"
    log_info "Grafana dashboard: http://localhost:3000 (admin/dytallix_testnet_admin)"
    log_info "Prometheus metrics: http://localhost:9093"
    log_info "Node API endpoints:"
    for i in "${!NODES[@]}"; do
        log_info "  ${NODES[$i]}: http://localhost:${NODE_PORTS[$i]}"
    done
    log_info "========================="
}

# Main deployment function
main() {
    echo -e "${CYAN}🚀 DYTALLIX ENHANCED TESTNET DEPLOYMENT${NC}"
    echo -e "${CYAN}=======================================${NC}"
    echo
    
    log_info "Starting enhanced testnet deployment..."
    log_info "Deployment ID: testnet-${TIMESTAMP}"
    log_info "Log file: $DEPLOYMENT_LOG"
    echo
    
    # Validate prerequisites
    validate_prerequisites
    echo
    
    # Setup environment
    setup_environment
    echo
    
    # Build images
    build_images
    echo
    
    # Deploy testnet
    deploy_testnet
    echo
    
    # Monitor deployment progress
    monitor_deployment_progress
    echo
    
    # Generate report
    generate_deployment_report
    echo
    
    log_success "🎉 Enhanced testnet deployment completed successfully!"
    log_info "Next steps:"
    log_info "1. Run health validation: ./scripts/validate-testnet-health.sh"
    log_info "2. Start performance monitoring: ./scripts/monitor-testnet-performance.sh"
    log_info "3. Run integration tests: ./scripts/run-integration-tests.sh"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --debug)
            DEBUG=true
            shift
            ;;
        --help|-h)
            echo "Dytallix Enhanced Testnet Deployment"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --debug    Enable debug logging"
            echo "  --help     Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DEBUG             Enable debug logging (true/false)"
            echo "  TARGET_TPS        Override target TPS (default: $TARGET_TPS)"
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

# Run main function
main