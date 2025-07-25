#!/bin/bash

# Dytallix Monitoring Health Check Script
# This script verifies that all monitoring components are healthy

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROMETHEUS_URL="http://localhost:9093"
GRAFANA_URL="http://localhost:3000"
ALERTMANAGER_URL="http://localhost:9094"
LOKI_URL="http://localhost:3100"

# Dytallix node endpoints
DYTALLIX_NODES=(
    "http://localhost:3030"
    "http://localhost:3032"
    "http://localhost:3034"
)

DYTALLIX_METRICS=(
    "http://localhost:9090"
    "http://localhost:9091"
    "http://localhost:9092"
)

DYTALLIX_HEALTH=(
    "http://localhost:8081"
    "http://localhost:8083"
    "http://localhost:8085"
)

NODE_EXPORTERS=(
    "http://localhost:9100"
    "http://localhost:9101"
    "http://localhost:9102"
)

# Logging functions
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

# Health check function
check_endpoint() {
    local url=$1
    local name=$2
    local timeout=${3:-10}
    
    if curl -f -s --max-time "$timeout" "$url" > /dev/null 2>&1; then
        log_info "$name is healthy ($url)"
        return 0
    else
        log_error "$name is unhealthy or unreachable ($url)"
        return 1
    fi
}

# Check specific health endpoint
check_health_endpoint() {
    local url=$1
    local name=$2
    local timeout=${3:-10}
    
    response=$(curl -f -s --max-time "$timeout" "$url" 2>/dev/null || echo "ERROR")
    
    if [[ "$response" != "ERROR" ]]; then
        log_info "$name health check passed ($url)"
        return 0
    else
        log_error "$name health check failed ($url)"
        return 1
    fi
}

# Check Prometheus targets
check_prometheus_targets() {
    log_step "Checking Prometheus targets..."
    
    targets_response=$(curl -s "$PROMETHEUS_URL/api/v1/targets" 2>/dev/null || echo "ERROR")
    
    if [[ "$targets_response" == "ERROR" ]]; then
        log_error "Failed to get Prometheus targets"
        return 1
    fi
    
    # Extract target status (simplified check)
    up_targets=$(echo "$targets_response" | grep -o '"health":"up"' | wc -l)
    total_targets=$(echo "$targets_response" | grep -o '"health":"' | wc -l)
    
    if [[ $up_targets -gt 0 ]] && [[ $total_targets -gt 0 ]]; then
        log_info "Prometheus targets: $up_targets/$total_targets are healthy"
        if [[ $up_targets -lt $total_targets ]]; then
            log_warn "Some Prometheus targets are down"
        fi
        return 0
    else
        log_error "No healthy Prometheus targets found"
        return 1
    fi
}

# Check Alertmanager alerts
check_alertmanager_status() {
    log_step "Checking Alertmanager status..."
    
    alerts_response=$(curl -s "$ALERTMANAGER_URL/api/v1/alerts" 2>/dev/null || echo "ERROR")
    
    if [[ "$alerts_response" == "ERROR" ]]; then
        log_error "Failed to get Alertmanager alerts"
        return 1
    fi
    
    # Count active alerts
    active_alerts=$(echo "$alerts_response" | grep -o '"status":' | wc -l)
    log_info "Alertmanager is accessible. Active alerts: $active_alerts"
    
    return 0
}

# Check Grafana datasources
check_grafana_datasources() {
    log_step "Checking Grafana datasources..."
    
    # Simple check if Grafana is responding
    if curl -f -s --max-time 10 "$GRAFANA_URL/api/health" > /dev/null 2>&1; then
        log_info "Grafana is healthy"
        return 0
    else
        log_error "Grafana health check failed"
        return 1
    fi
}

# Check Docker containers
check_docker_containers() {
    log_step "Checking Docker containers..."
    
    # List of expected containers
    expected_containers=(
        "dytallix-prometheus"
        "dytallix-grafana"
        "dytallix-alertmanager"
        "dytallix-loki"
        "dytallix-promtail"
        "dytallix-node-exporter-1"
        "dytallix-node-exporter-2"
        "dytallix-node-exporter-3"
        "dytallix-node-1"
        "dytallix-node-2"
        "dytallix-node-3"
    )
    
    failed_containers=()
    
    for container in "${expected_containers[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            log_info "Container $container is running"
        else
            log_error "Container $container is not running"
            failed_containers+=("$container")
        fi
    done
    
    if [[ ${#failed_containers[@]} -eq 0 ]]; then
        return 0
    else
        log_error "Failed containers: ${failed_containers[*]}"
        return 1
    fi
}

# Main health check function
main() {
    log_info "Starting Dytallix monitoring health check..."
    
    local overall_status=0
    
    # Check Docker containers first
    log_step "=== Docker Container Health ==="
    if ! check_docker_containers; then
        overall_status=1
    fi
    
    # Check monitoring services
    log_step "=== Monitoring Services Health ==="
    
    if ! check_endpoint "$PROMETHEUS_URL/-/healthy" "Prometheus"; then
        overall_status=1
    fi
    
    if ! check_endpoint "$GRAFANA_URL/api/health" "Grafana"; then
        overall_status=1
    fi
    
    if ! check_endpoint "$ALERTMANAGER_URL/-/healthy" "Alertmanager"; then
        overall_status=1
    fi
    
    if ! check_endpoint "$LOKI_URL/ready" "Loki"; then
        overall_status=1
    fi
    
    # Check Prometheus targets
    if ! check_prometheus_targets; then
        overall_status=1
    fi
    
    # Check Alertmanager status
    if ! check_alertmanager_status; then
        overall_status=1
    fi
    
    # Check Grafana datasources
    if ! check_grafana_datasources; then
        overall_status=1
    fi
    
    # Check Dytallix nodes
    log_step "=== Dytallix Nodes Health ==="
    
    for i in "${!DYTALLIX_HEALTH[@]}"; do
        node_num=$((i + 1))
        if ! check_health_endpoint "${DYTALLIX_HEALTH[$i]}/health" "Dytallix Node $node_num"; then
            overall_status=1
        fi
    done
    
    # Check Dytallix metrics endpoints
    log_step "=== Dytallix Metrics Endpoints ==="
    
    for i in "${!DYTALLIX_METRICS[@]}"; do
        node_num=$((i + 1))
        if ! check_endpoint "${DYTALLIX_METRICS[$i]}/metrics" "Dytallix Node $node_num Metrics"; then
            overall_status=1
        fi
    done
    
    # Check Node Exporters
    log_step "=== Node Exporter Health ==="
    
    for i in "${!NODE_EXPORTERS[@]}"; do
        node_num=$((i + 1))
        if ! check_endpoint "${NODE_EXPORTERS[$i]}/metrics" "Node Exporter $node_num"; then
            overall_status=1
        fi
    done
    
    # Summary
    echo
    log_step "=== Health Check Summary ==="
    
    if [[ $overall_status -eq 0 ]]; then
        log_info "✅ All monitoring components are healthy!"
    else
        log_error "❌ Some monitoring components have issues. Please check the logs above."
    fi
    
    exit $overall_status
}

# Script options
case "${1:-check}" in
    "check")
        main
        ;;
    "quick")
        log_info "Running quick health check..."
        check_endpoint "$PROMETHEUS_URL/-/healthy" "Prometheus" 5
        check_endpoint "$GRAFANA_URL/api/health" "Grafana" 5
        check_endpoint "$ALERTMANAGER_URL/-/healthy" "Alertmanager" 5
        ;;
    "docker")
        log_info "Checking Docker containers only..."
        check_docker_containers
        ;;
    "prometheus")
        log_info "Checking Prometheus only..."
        check_endpoint "$PROMETHEUS_URL/-/healthy" "Prometheus"
        check_prometheus_targets
        ;;
    "help")
        echo "Usage: $0 [check|quick|docker|prometheus|help]"
        echo ""
        echo "Commands:"
        echo "  check      - Full health check (default)"
        echo "  quick      - Quick check of main services"
        echo "  docker     - Check Docker containers only"
        echo "  prometheus - Check Prometheus and targets only"
        echo "  help       - Show this help message"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac