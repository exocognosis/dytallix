#!/bin/bash

# Dytallix Health Monitoring Script for Hetzner Deployment
# This script monitors the health of all services and provides detailed status information

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")/docker-compose"
DOMAIN="${DOMAIN:-dytallix.local}"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}[SECTION]${NC} $1"
    echo "=================================================================================="
}

# Check if service is running
check_service() {
    local service_name="$1"
    local container_name="$2"
    
    if docker-compose -f "$COMPOSE_DIR/docker-compose.yml" ps "$service_name" | grep -q "Up"; then
        log_success "$container_name is running"
        return 0
    else
        log_error "$container_name is not running"
        return 1
    fi
}

# Check service health endpoint
check_health_endpoint() {
    local service_name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [[ "$status_code" == "$expected_status" ]]; then
        log_success "$service_name health check passed (HTTP $status_code)"
        return 0
    else
        log_error "$service_name health check failed (HTTP $status_code)"
        return 1
    fi
}

# Check port connectivity
check_port() {
    local service_name="$1"
    local host="$2"
    local port="$3"
    
    if nc -z "$host" "$port" 2>/dev/null; then
        log_success "$service_name port $port is accessible"
        return 0
    else
        log_error "$service_name port $port is not accessible"
        return 1
    fi
}

# Get container logs
get_container_logs() {
    local service_name="$1"
    local lines="${2:-50}"
    
    echo -e "${CYAN}Recent logs for $service_name:${NC}"
    docker-compose -f "$COMPOSE_DIR/docker-compose.yml" logs --tail="$lines" "$service_name" 2>/dev/null || echo "No logs available"
    echo ""
}

# Check Docker and Docker Compose
check_docker() {
    log_header "Docker Environment"
    
    if command -v docker >/dev/null 2>&1; then
        log_success "Docker is installed: $(docker --version)"
    else
        log_error "Docker is not installed"
        return 1
    fi
    
    if command -v docker-compose >/dev/null 2>&1; then
        log_success "Docker Compose is installed: $(docker-compose --version)"
    else
        log_error "Docker Compose is not installed"
        return 1
    fi
    
    if docker info >/dev/null 2>&1; then
        log_success "Docker daemon is running"
    else
        log_error "Docker daemon is not running"
        return 1
    fi
    
    echo ""
}

# Check system resources
check_system_resources() {
    log_header "System Resources"
    
    # Memory usage
    local mem_info
    mem_info=$(free -h | awk '/^Mem:/ {print $3 "/" $2 " (" $3/$2*100 "%)"}')
    echo -e "${BLUE}Memory Usage:${NC} $mem_info"
    
    # Disk usage
    local disk_info
    disk_info=$(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')
    echo -e "${BLUE}Disk Usage:${NC} $disk_info"
    
    # CPU load
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}')
    echo -e "${BLUE}Load Average:${NC}$load_avg"
    
    # Check if resources are concerning
    local mem_percent
    mem_percent=$(free | awk '/^Mem:/ {print $3/$2*100}')
    if (( $(echo "$mem_percent > 90" | bc -l) )); then
        log_warning "High memory usage: ${mem_percent}%"
    fi
    
    local disk_percent
    disk_percent=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_percent -gt 90 ]]; then
        log_warning "High disk usage: ${disk_percent}%"
    fi
    
    echo ""
}

# Check Docker containers
check_containers() {
    log_header "Docker Containers Status"
    
    cd "$COMPOSE_DIR"
    
    local services=(
        "traefik:Traefik Reverse Proxy"
        "dytallix-node:Dytallix Blockchain Node"
        "frontend:Frontend Application" 
        "explorer:Blockchain Explorer"
        "faucet:Token Faucet"
        "bridge:Cross-chain Bridge"
        "postgres:PostgreSQL Database"
        "redis:Redis Cache"
        "prometheus:Prometheus Monitoring"
        "grafana:Grafana Dashboard"
        "loki:Loki Log Aggregation"
        "promtail:Promtail Log Collector"
    )
    
    local failed_services=()
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service_name display_name <<< "$service_info"
        if ! check_service "$service_name" "$display_name"; then
            failed_services+=("$service_name")
        fi
    done
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        log_warning "Failed services: ${failed_services[*]}"
    fi
    
    echo ""
}

# Check network connectivity
check_network() {
    log_header "Network Connectivity"
    
    # Check internal Docker network
    if docker network ls | grep -q "dytallix"; then
        log_success "Dytallix Docker network exists"
    else
        log_warning "Dytallix Docker network not found"
    fi
    
    # Check port accessibility
    local ports=(
        "traefik:localhost:80"
        "traefik-https:localhost:443"
        "prometheus:localhost:9090"
        "grafana:localhost:3000"
        "node-rpc:localhost:26657"
        "node-p2p:localhost:26656"
    )
    
    for port_info in "${ports[@]}"; do
        IFS=':' read -r service_name host port <<< "$port_info"
        check_port "$service_name" "$host" "$port"
    done
    
    echo ""
}

# Check service health endpoints
check_service_health() {
    log_header "Service Health Endpoints"
    
    # Wait a moment for services to be ready
    sleep 2
    
    local endpoints=(
        "Frontend:http://localhost/health"
        "Explorer:http://localhost:3002/health"
        "Faucet:http://localhost:3001/health"
        "Bridge:http://localhost:8080/health"
        "Blockchain RPC:http://localhost:26657/health"
        "Prometheus:http://localhost:9090/-/healthy"
        "Grafana:http://localhost:3000/api/health"
        "Traefik:http://localhost:8081/ping"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        IFS=':' read -r service_name url <<< "$endpoint_info"
        check_health_endpoint "$service_name" "$url"
    done
    
    echo ""
}

# Check blockchain status
check_blockchain() {
    log_header "Blockchain Status"
    
    # Check if node is running
    if ! check_port "Blockchain Node" "localhost" "26657"; then
        log_error "Blockchain node is not accessible"
        return 1
    fi
    
    # Get node status
    local node_status
    if node_status=$(curl -s http://localhost:26657/status 2>/dev/null); then
        local node_id
        node_id=$(echo "$node_status" | jq -r '.result.node_info.id' 2>/dev/null || echo "unknown")
        local network
        network=$(echo "$node_status" | jq -r '.result.node_info.network' 2>/dev/null || echo "unknown")
        local latest_height
        latest_height=$(echo "$node_status" | jq -r '.result.sync_info.latest_block_height' 2>/dev/null || echo "unknown")
        local catching_up
        catching_up=$(echo "$node_status" | jq -r '.result.sync_info.catching_up' 2>/dev/null || echo "unknown")
        
        log_success "Node ID: $node_id"
        log_success "Network: $network"
        log_success "Latest Block Height: $latest_height"
        
        if [[ "$catching_up" == "false" ]]; then
            log_success "Node is synced (not catching up)"
        else
            log_warning "Node is catching up (syncing)"
        fi
    else
        log_error "Failed to get node status"
    fi
    
    # Check validators
    local validators
    if validators=$(curl -s http://localhost:26657/validators 2>/dev/null); then
        local validator_count
        validator_count=$(echo "$validators" | jq -r '.result.total' 2>/dev/null || echo "unknown")
        log_success "Active validators: $validator_count"
    else
        log_warning "Failed to get validator information"
    fi
    
    echo ""
}

# Check monitoring stack
check_monitoring() {
    log_header "Monitoring Stack"
    
    # Check Prometheus
    if check_health_endpoint "Prometheus" "http://localhost:9090/-/healthy"; then
        # Get Prometheus targets
        local targets
        if targets=$(curl -s http://localhost:9090/api/v1/targets 2>/dev/null); then
            local active_targets
            active_targets=$(echo "$targets" | jq -r '.data.activeTargets | length' 2>/dev/null || echo "unknown")
            log_success "Prometheus has $active_targets active targets"
        fi
    fi
    
    # Check Grafana
    check_health_endpoint "Grafana" "http://localhost:3000/api/health"
    
    # Check Loki
    check_health_endpoint "Loki" "http://localhost:3100/ready"
    
    echo ""
}

# Check SSL certificates (if using Traefik with Let's Encrypt)
check_ssl() {
    log_header "SSL Certificates"
    
    if [[ "$DOMAIN" != "dytallix.local" ]]; then
        local cert_info
        if cert_info=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null); then
            echo -e "${BLUE}SSL Certificate Info:${NC}"
            echo "$cert_info"
            log_success "SSL certificate is valid"
        else
            log_warning "SSL certificate check failed or not using HTTPS"
        fi
    else
        log_info "Skipping SSL check for local domain"
    fi
    
    echo ""
}

# Show service logs
show_logs() {
    local service="${1:-all}"
    local lines="${2:-50}"
    
    log_header "Service Logs"
    
    if [[ "$service" == "all" ]]; then
        local services=("dytallix-node" "frontend" "explorer" "faucet" "bridge" "postgres" "redis" "prometheus" "grafana")
        for svc in "${services[@]}"; do
            echo -e "${PURPLE}=== $svc logs ===${NC}"
            get_container_logs "$svc" "$lines"
        done
    else
        get_container_logs "$service" "$lines"
    fi
}

# Generate health report
generate_report() {
    local report_file="${1:-health-report-$(date +%Y%m%d-%H%M%S).txt}"
    
    log_info "Generating health report: $report_file"
    
    {
        echo "Dytallix Health Report"
        echo "Generated: $(date)"
        echo "Domain: $DOMAIN"
        echo ""
        
        echo "=== SYSTEM RESOURCES ==="
        free -h
        df -h
        uptime
        echo ""
        
        echo "=== DOCKER CONTAINERS ==="
        cd "$COMPOSE_DIR"
        docker-compose ps
        echo ""
        
        echo "=== NETWORK PORTS ==="
        netstat -tlnp | grep -E ':(80|443|3000|8080|9090|26656|26657)\s'
        echo ""
        
        echo "=== SERVICE LOGS (last 20 lines) ==="
        local services=("dytallix-node" "frontend" "explorer" "faucet" "bridge")
        for service in "${services[@]}"; do
            echo "--- $service ---"
            docker-compose logs --tail=20 "$service" 2>/dev/null || echo "No logs available"
            echo ""
        done
        
    } > "$report_file"
    
    log_success "Health report saved to: $report_file"
}

# Main health check function
main_health_check() {
    log_info "Starting Dytallix health check..."
    echo ""
    
    check_docker
    check_system_resources
    check_containers
    check_network
    check_service_health
    check_blockchain
    check_monitoring
    check_ssl
    
    log_info "Health check completed!"
}

# Show help
show_help() {
    cat << EOF
Dytallix Health Monitoring Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    check               Run full health check (default)
    logs [SERVICE]      Show logs for service or all services
    report [FILE]       Generate detailed health report
    status              Show brief status summary
    help               Show this help message

Options:
    --lines N          Number of log lines to show (default: 50)

Examples:
    $0                     # Run full health check
    $0 check               # Run full health check
    $0 logs dytallix-node  # Show logs for blockchain node
    $0 logs                # Show logs for all services
    $0 report              # Generate health report
    $0 status              # Quick status check

EOF
}

# Parse arguments and run appropriate function
main() {
    local command="${1:-check}"
    local arg2="${2:-}"
    local lines=50
    
    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --lines)
                lines="$2"
                shift 2
                ;;
            check|logs|report|status|help)
                command="$1"
                shift
                ;;
            *)
                if [[ -z "$arg2" ]]; then
                    arg2="$1"
                fi
                shift
                ;;
        esac
    done
    
    case $command in
        check)
            main_health_check
            ;;
        logs)
            show_logs "$arg2" "$lines"
            ;;
        report)
            generate_report "$arg2"
            ;;
        status)
            check_containers
            check_service_health
            ;;
        help)
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Change to compose directory
cd "$COMPOSE_DIR" 2>/dev/null || {
    log_error "Could not find docker-compose directory at: $COMPOSE_DIR"
    log_info "Please run this script from the deployment directory or ensure docker-compose.yml exists"
    exit 1
}

# Run main function
main "$@"
