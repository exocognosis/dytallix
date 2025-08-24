#!/bin/bash

# Dytallix Observability Stack Launcher
# This script starts Prometheus, Grafana, and related monitoring infrastructure using Docker Compose

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
OBSERVABILITY_DIR="$PROJECT_ROOT/observability"
COMPOSE_FILE="$OBSERVABILITY_DIR/docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if observability should be enabled
check_observability_enabled() {
    if [[ "${ENABLE_OBSERVABILITY:-0}" != "1" ]]; then
        log_warn "ENABLE_OBSERVABILITY is not set to 1. Observability stack will not start."
        echo "To enable observability, set ENABLE_OBSERVABILITY=1"
        exit 0
    fi
}

# Create docker-compose.yml for the observability stack
create_compose_file() {
    log_step "Creating Docker Compose configuration for observability stack..."
    
    mkdir -p "$OBSERVABILITY_DIR"
    
    cat > "$COMPOSE_FILE" << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: dytallix-prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    networks:
      - dytallix-monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: dytallix-grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=dytallix123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    networks:
      - dytallix-monitoring
    depends_on:
      - prometheus

  node-exporter:
    image: prom/node-exporter:latest
    container_name: dytallix-node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - dytallix-monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: dytallix-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager:/etc/alertmanager
      - alertmanager_data:/alertmanager
    networks:
      - dytallix-monitoring
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:

networks:
  dytallix-monitoring:
    driver: bridge
    external: false
EOF

    log_info "Docker Compose file created at $COMPOSE_FILE"
}

# Create basic alertmanager configuration
create_alertmanager_config() {
    log_step "Creating Alertmanager configuration..."
    
    mkdir -p "$OBSERVABILITY_DIR/alertmanager"
    
    cat > "$OBSERVABILITY_DIR/alertmanager/alertmanager.yml" << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alertmanager@dytallix.local'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://localhost:5001/webhook'
    send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
EOF

    log_info "Alertmanager configuration created"
}

# Start the observability stack
start_stack() {
    log_step "Starting observability stack..."
    
    cd "$OBSERVABILITY_DIR"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Start the stack
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check service health
    check_service_health "Prometheus" "http://localhost:9090/-/ready"
    check_service_health "Grafana" "http://localhost:3000/api/health"
    
    log_info "Observability stack started successfully!"
    log_info "Access points:"
    log_info "  - Prometheus: http://localhost:9090"
    log_info "  - Grafana: http://localhost:3000 (admin/dytallix123)"
    log_info "  - Alertmanager: http://localhost:9093"
}

# Check if a service is healthy
check_service_health() {
    local service_name="$1"
    local health_url="$2"
    local max_attempts=30
    local attempt=1
    
    log_info "Checking $service_name health..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$health_url" > /dev/null 2>&1; then
            log_info "$service_name is healthy"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: $service_name not ready yet..."
        sleep 2
        ((attempt++))
    done
    
    log_warn "$service_name may not be fully ready, but continuing..."
    return 1
}

# Stop the observability stack
stop_stack() {
    log_step "Stopping observability stack..."
    
    cd "$OBSERVABILITY_DIR"
    docker-compose down
    
    log_info "Observability stack stopped"
}

# Show logs from the observability stack
show_logs() {
    cd "$OBSERVABILITY_DIR"
    docker-compose logs -f
}

# Main function
main() {
    case "${1:-start}" in
        start)
            check_observability_enabled
            create_compose_file
            create_alertmanager_config
            start_stack
            ;;
        stop)
            stop_stack
            ;;
        restart)
            stop_stack
            sleep 2
            main start
            ;;
        logs)
            show_logs
            ;;
        status)
            cd "$OBSERVABILITY_DIR"
            docker-compose ps
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|logs|status}"
            echo ""
            echo "Commands:"
            echo "  start   - Start the observability stack"
            echo "  stop    - Stop the observability stack"  
            echo "  restart - Restart the observability stack"
            echo "  logs    - Show logs from all services"
            echo "  status  - Show status of all services"
            echo ""
            echo "Environment variables:"
            echo "  ENABLE_OBSERVABILITY - Set to 1 to enable observability stack"
            exit 1
            ;;
    esac
}

main "$@"