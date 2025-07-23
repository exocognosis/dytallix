#!/bin/bash

# Dytallix Monitoring Deployment Script
# This script automates the deployment of the complete monitoring stack

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_DIR="./deployment/docker"
MONITORING_CONFIG_DIR="./deployment/monitoring"
SCRIPTS_DIR="./scripts/monitoring"

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

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Setup monitoring configuration
setup_monitoring_config() {
    log_step "Setting up monitoring configuration..."
    
    # Ensure monitoring directories exist
    mkdir -p "$DEPLOYMENT_DIR/monitoring/grafana/dashboards"
    mkdir -p "$DEPLOYMENT_DIR/monitoring/grafana/datasources"
    mkdir -p "$DEPLOYMENT_DIR/monitoring/templates"
    mkdir -p "$DEPLOYMENT_DIR/secrets"
    
    # Copy monitoring configurations if they don't exist
    if [[ ! -f "$DEPLOYMENT_DIR/monitoring/prometheus.yml" ]]; then
        log_info "Copying Prometheus configuration..."
        cp "$MONITORING_CONFIG_DIR/prometheus.yml" "$DEPLOYMENT_DIR/monitoring/"
    fi
    
    if [[ ! -f "$DEPLOYMENT_DIR/monitoring/alert_rules.yml" ]]; then
        log_info "Copying alert rules..."
        cp "$MONITORING_CONFIG_DIR/alert_rules.yml" "$DEPLOYMENT_DIR/monitoring/"
    fi
    
    if [[ ! -f "$DEPLOYMENT_DIR/monitoring/alertmanager.yml" ]]; then
        log_info "Copying Alertmanager configuration..."
        cp "$MONITORING_CONFIG_DIR/alertmanager.yml" "$DEPLOYMENT_DIR/monitoring/"
    fi
    
    if [[ ! -f "$DEPLOYMENT_DIR/monitoring/loki.yml" ]]; then
        log_info "Copying Loki configuration..."
        cp "$MONITORING_CONFIG_DIR/loki.yml" "$DEPLOYMENT_DIR/monitoring/"
    fi
    
    if [[ ! -f "$DEPLOYMENT_DIR/monitoring/promtail.yml" ]]; then
        log_info "Copying Promtail configuration..."
        cp "$MONITORING_CONFIG_DIR/promtail.yml" "$DEPLOYMENT_DIR/monitoring/"
    fi
    
    # Copy Grafana configurations
    if [[ ! -f "$DEPLOYMENT_DIR/monitoring/grafana/datasources/prometheus.yml" ]]; then
        log_info "Copying Grafana datasource configuration..."
        cp "$MONITORING_CONFIG_DIR/grafana/datasources/prometheus.yml" "$DEPLOYMENT_DIR/monitoring/grafana/datasources/"
    fi
    
    if [[ ! -f "$DEPLOYMENT_DIR/monitoring/grafana/dashboards/dytallix.json" ]]; then
        log_info "Copying Grafana dashboard..."
        cp "$MONITORING_CONFIG_DIR/grafana/dashboards/dytallix.json" "$DEPLOYMENT_DIR/monitoring/grafana/dashboards/"
    fi
    
    # Copy alert templates
    if [[ ! -f "$DEPLOYMENT_DIR/monitoring/templates/default.tmpl" ]]; then
        log_info "Copying alert templates..."
        cp "$MONITORING_CONFIG_DIR/templates/default.tmpl" "$DEPLOYMENT_DIR/monitoring/templates/"
    fi
    
    log_info "Monitoring configuration setup completed"
}

# Setup secrets
setup_secrets() {
    log_step "Setting up secrets..."
    
    # Check if secrets exist
    if [[ ! -f "$DEPLOYMENT_DIR/secrets/slack_webhook" ]]; then
        log_warn "Slack webhook not configured. Creating placeholder file."
        echo "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" > "$DEPLOYMENT_DIR/secrets/slack_webhook"
        log_warn "Please edit $DEPLOYMENT_DIR/secrets/slack_webhook with your actual Slack webhook URL"
    fi
    
    if [[ ! -f "$DEPLOYMENT_DIR/secrets/smtp_password" ]]; then
        log_warn "SMTP password not configured. Creating placeholder file."
        echo "your_smtp_password_here" > "$DEPLOYMENT_DIR/secrets/smtp_password"
        log_warn "Please edit $DEPLOYMENT_DIR/secrets/smtp_password with your actual SMTP password"
    fi
    
    # Set appropriate permissions
    chmod 600 "$DEPLOYMENT_DIR/secrets/"*
    
    log_info "Secrets setup completed"
}

# Validate configurations
validate_configurations() {
    log_step "Validating configurations..."
    
    # Check Prometheus configuration
    if docker run --rm -v "$(pwd)/$DEPLOYMENT_DIR/monitoring:/etc/prometheus" --entrypoint promtool prom/prometheus:latest check config /etc/prometheus/prometheus.yml; then
        log_info "Prometheus configuration is valid"
    else
        log_error "Prometheus configuration is invalid"
        return 1
    fi
    
    # Check alert rules
    if docker run --rm -v "$(pwd)/$DEPLOYMENT_DIR/monitoring:/etc/prometheus" --entrypoint promtool prom/prometheus:latest check rules /etc/prometheus/alert_rules.yml; then
        log_info "Alert rules are valid"
    else
        log_error "Alert rules are invalid"
        return 1
    fi
    
    # Check Alertmanager configuration
    if docker run --rm -v "$(pwd)/$DEPLOYMENT_DIR/monitoring:/etc/alertmanager" --entrypoint amtool prom/alertmanager:latest check-config /etc/alertmanager/alertmanager.yml; then
        log_info "Alertmanager configuration is valid"
    else
        log_error "Alertmanager configuration is invalid"
        return 1
    fi
    
    log_info "Configuration validation completed"
}

# Deploy monitoring stack
deploy_monitoring() {
    log_step "Deploying monitoring stack..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    docker-compose -f docker-compose.testnet.yml pull prometheus grafana alertmanager loki promtail node-exporter-1 node-exporter-2 node-exporter-3
    
    # Start monitoring services
    log_info "Starting monitoring services..."
    docker-compose -f docker-compose.testnet.yml up -d prometheus grafana alertmanager loki promtail node-exporter-1 node-exporter-2 node-exporter-3
    
    cd - > /dev/null
    
    log_info "Monitoring stack deployment initiated"
}

# Wait for services to be ready
wait_for_services() {
    log_step "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    services=(
        "http://localhost:9093/-/healthy:Prometheus"
        "http://localhost:3000/api/health:Grafana"
        "http://localhost:9094/-/healthy:Alertmanager"
        "http://localhost:3100/ready:Loki"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service"
        
        log_info "Waiting for $name to be ready..."
        attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -f -s --max-time 5 "$url" > /dev/null 2>&1; then
                log_info "$name is ready"
                break
            else
                if [[ $attempt -eq $max_attempts ]]; then
                    log_error "$name failed to become ready after $max_attempts attempts"
                    return 1
                fi
                
                log_info "Attempt $attempt/$max_attempts: $name not ready yet, waiting..."
                sleep 10
                ((attempt++))
            fi
        done
    done
    
    log_info "All services are ready"
}

# Run health check
run_health_check() {
    log_step "Running health check..."
    
    if [[ -x "$SCRIPTS_DIR/check_monitoring_health.sh" ]]; then
        "$SCRIPTS_DIR/check_monitoring_health.sh" quick
    else
        log_warn "Health check script not found or not executable"
        
        # Basic health check
        local services=(
            "http://localhost:9093/-/healthy:Prometheus"
            "http://localhost:3000/api/health:Grafana"
            "http://localhost:9094/-/healthy:Alertmanager"
            "http://localhost:3100/ready:Loki"
        )
        
        for service in "${services[@]}"; do
            IFS=':' read -r url name <<< "$service"
            
            if curl -f -s --max-time 5 "$url" > /dev/null 2>&1; then
                log_info "$name health check passed"
            else
                log_error "$name health check failed"
            fi
        done
    fi
}

# Show access information
show_access_info() {
    log_step "Deployment completed successfully!"
    
    cat << EOF

🎉 Dytallix Monitoring Stack is now running!

Access URLs:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Grafana Dashboard:    http://localhost:3000
   Username: admin
   Password: dytallix_testnet_admin

📈 Prometheus:           http://localhost:9093
🚨 Alertmanager:         http://localhost:9094
📝 Loki:                 http://localhost:3100

Dytallix Nodes:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 Node 1 API:          http://localhost:3030
🔗 Node 2 API:          http://localhost:3032
🔗 Node 3 API:          http://localhost:3034

System Metrics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Node Exporter 1:     http://localhost:9100/metrics
📊 Node Exporter 2:     http://localhost:9101/metrics
📊 Node Exporter 3:     http://localhost:9102/metrics

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Configure Slack webhook: edit deployment/docker/secrets/slack_webhook
2. Configure SMTP password: edit deployment/docker/secrets/smtp_password
3. Start Dytallix nodes to see metrics
4. Import additional Grafana dashboards if needed
5. Test alerting by triggering alerts

Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Check status:    docker-compose -f deployment/docker/docker-compose.testnet.yml ps
View logs:       docker-compose -f deployment/docker/docker-compose.testnet.yml logs -f [service]
Stop services:   docker-compose -f deployment/docker/docker-compose.testnet.yml down
Health check:    ./scripts/monitoring/check_monitoring_health.sh

EOF
}

# Cleanup function
cleanup() {
    log_step "Cleaning up monitoring stack..."
    
    cd "$DEPLOYMENT_DIR"
    docker-compose -f docker-compose.testnet.yml down
    cd - > /dev/null
    
    log_info "Monitoring stack stopped"
}

# Main deployment function
main() {
    case "${1:-deploy}" in
        "deploy")
            log_info "Starting Dytallix monitoring deployment..."
            check_prerequisites
            setup_monitoring_config
            setup_secrets
            validate_configurations
            deploy_monitoring
            wait_for_services
            run_health_check
            show_access_info
            ;;
        "config")
            log_info "Setting up monitoring configuration only..."
            setup_monitoring_config
            setup_secrets
            validate_configurations
            ;;
        "validate")
            log_info "Validating configurations only..."
            validate_configurations
            ;;
        "start")
            log_info "Starting monitoring services..."
            cd "$DEPLOYMENT_DIR"
            docker-compose -f docker-compose.testnet.yml up -d prometheus grafana alertmanager loki promtail node-exporter-1 node-exporter-2 node-exporter-3
            cd - > /dev/null
            wait_for_services
            run_health_check
            show_access_info
            ;;
        "stop")
            log_info "Stopping monitoring services..."
            cd "$DEPLOYMENT_DIR"
            docker-compose -f docker-compose.testnet.yml stop prometheus grafana alertmanager loki promtail node-exporter-1 node-exporter-2 node-exporter-3
            cd - > /dev/null
            ;;
        "restart")
            log_info "Restarting monitoring services..."
            cd "$DEPLOYMENT_DIR"
            docker-compose -f docker-compose.testnet.yml restart prometheus grafana alertmanager loki promtail node-exporter-1 node-exporter-2 node-exporter-3
            cd - > /dev/null
            wait_for_services
            run_health_check
            ;;
        "cleanup")
            cleanup
            ;;
        "status")
            log_info "Checking monitoring services status..."
            cd "$DEPLOYMENT_DIR"
            docker-compose -f docker-compose.testnet.yml ps prometheus grafana alertmanager loki promtail node-exporter-1 node-exporter-2 node-exporter-3
            cd - > /dev/null
            ;;
        "logs")
            service=${2:-""}
            if [[ -n "$service" ]]; then
                log_info "Showing logs for $service..."
                cd "$DEPLOYMENT_DIR"
                docker-compose -f docker-compose.testnet.yml logs -f "$service"
                cd - > /dev/null
            else
                log_info "Showing logs for all monitoring services..."
                cd "$DEPLOYMENT_DIR"
                docker-compose -f docker-compose.testnet.yml logs -f prometheus grafana alertmanager loki promtail
                cd - > /dev/null
            fi
            ;;
        "help")
            cat << EOF
Usage: $0 [command] [options]

Commands:
  deploy     - Full deployment (setup config, validate, deploy, health check)
  config     - Setup and validate configuration only
  validate   - Validate configurations only
  start      - Start monitoring services
  stop       - Stop monitoring services
  restart    - Restart monitoring services
  cleanup    - Stop and remove monitoring services
  status     - Show service status
  logs [svc] - Show logs (optionally for specific service)
  help       - Show this help message

Examples:
  $0 deploy              # Full deployment
  $0 config              # Setup configuration
  $0 start               # Start services
  $0 logs prometheus     # Show Prometheus logs
  $0 status              # Check service status

EOF
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information."
            exit 1
            ;;
    esac
}

# Run main function
main "$@"