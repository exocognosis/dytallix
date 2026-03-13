#!/bin/bash

# Dytallix Deployment Update and Maintenance Script
# This script handles updates, scaling, and maintenance tasks for the Hetzner deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")/docker-compose"
BACKUP_DIR="/tmp/dytallix-maintenance-backup-$(date +%Y%m%d-%H%M%S)"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}[MAINTENANCE]${NC} $1"
    echo "=================================================================================="
}

# Show help
show_help() {
    cat << EOF
Dytallix Deployment Update and Maintenance Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    update              Update all services to latest versions
    restart [SERVICE]   Restart specific service or all services
    scale SERVICE N     Scale service to N replicas
    backup              Create backup before maintenance
    logs [SERVICE]      Show service logs
    cleanup             Clean up unused Docker resources
    rebuild [SERVICE]   Rebuild and restart service
    status              Show current status
    help               Show this help message

Options:
    --backup            Create backup before operation
    --force             Force operation without confirmation
    --pull              Pull latest images before operation

Examples:
    $0 update --backup          # Update all services with backup
    $0 restart dytallix-node    # Restart blockchain node
    $0 scale frontend 3         # Scale frontend to 3 replicas
    $0 rebuild bridge --pull    # Rebuild bridge service with latest image
    $0 cleanup                  # Clean up unused Docker resources

Services:
    dytallix-node, frontend, explorer, faucet, bridge, postgres, redis,
    prometheus, grafana, loki, promtail, traefik

EOF
}

# Check if we're in the right directory
check_environment() {
    if [[ ! -f "$COMPOSE_DIR/docker-compose.yml" ]]; then
        log_error "docker-compose.yml not found at: $COMPOSE_DIR"
        log_info "Please run this script from the deployment directory"
        exit 1
    fi
    
    cd "$COMPOSE_DIR"
}

# Create backup before maintenance
create_backup() {
    log_header "Creating Maintenance Backup"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup compose files and configs
    cp -r . "$BACKUP_DIR/compose"
    
    # Backup databases if running
    if docker-compose ps postgres | grep -q "Up"; then
        log_info "Backing up PostgreSQL database..."
        docker-compose exec -T postgres pg_dumpall -U postgres > "$BACKUP_DIR/postgres_backup.sql"
    fi
    
    if docker-compose ps redis | grep -q "Up"; then
        log_info "Backing up Redis data..."
        docker-compose exec redis redis-cli BGSAVE
        sleep 2
        docker cp "$(docker-compose ps -q redis):/data/dump.rdb" "$BACKUP_DIR/redis_dump.rdb" 2>/dev/null || true
    fi
    
    # Backup blockchain data
    if docker-compose ps dytallix-node | grep -q "Up"; then
        log_info "Backing up blockchain configuration..."
        mkdir -p "$BACKUP_DIR/blockchain"
        docker cp "$(docker-compose ps -q dytallix-node):/root/.dytallix/config" "$BACKUP_DIR/blockchain/" 2>/dev/null || true
    fi
    
    log_success "Backup created at: $BACKUP_DIR"
}

# Pull latest images
pull_images() {
    log_header "Pulling Latest Images"
    
    local services=("$@")
    
    if [[ ${#services[@]} -eq 0 ]]; then
        log_info "Pulling all images..."
        docker-compose pull
    else
        for service in "${services[@]}"; do
            log_info "Pulling image for $service..."
            docker-compose pull "$service"
        done
    fi
    
    log_success "Images pulled successfully"
}

# Update services
update_services() {
    local services=("$@")
    local backup_flag=false
    local force_flag=false
    local pull_flag=false
    
    # Parse flags
    local filtered_services=()
    for arg in "${services[@]}"; do
        case $arg in
            --backup)
                backup_flag=true
                ;;
            --force)
                force_flag=true
                ;;
            --pull)
                pull_flag=true
                ;;
            *)
                filtered_services+=("$arg")
                ;;
        esac
    done
    
    services=("${filtered_services[@]}")
    
    log_header "Updating Services"
    
    # Create backup if requested
    if [[ "$backup_flag" == true ]]; then
        create_backup
    fi
    
    # Confirm operation
    if [[ "$force_flag" == false ]]; then
        echo -e "${YELLOW}This will update and restart services. Continue? (y/N)${NC}"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log_info "Operation cancelled"
            exit 0
        fi
    fi
    
    # Pull images if requested
    if [[ "$pull_flag" == true ]]; then
        pull_images "${services[@]}"
    fi
    
    # Update services
    if [[ ${#services[@]} -eq 0 ]]; then
        log_info "Updating all services..."
        docker-compose up -d --remove-orphans
    else
        for service in "${services[@]}"; do
            log_info "Updating $service..."
            docker-compose up -d "$service"
        done
    fi
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check health
    "$SCRIPT_DIR/monitor.sh" status
    
    log_success "Services updated successfully"
}

# Restart services
restart_services() {
    local services=("$@")
    
    log_header "Restarting Services"
    
    if [[ ${#services[@]} -eq 0 ]]; then
        log_info "Restarting all services..."
        docker-compose restart
    else
        for service in "${services[@]}"; do
            log_info "Restarting $service..."
            docker-compose restart "$service"
        done
    fi
    
    log_success "Services restarted successfully"
}

# Scale service
scale_service() {
    local service="$1"
    local replicas="$2"
    
    log_header "Scaling Service"
    
    log_info "Scaling $service to $replicas replicas..."
    docker-compose up -d --scale "$service=$replicas"
    
    log_success "$service scaled to $replicas replicas"
}

# Rebuild service
rebuild_service() {
    local services=("$@")
    local pull_flag=false
    
    # Parse flags
    local filtered_services=()
    for arg in "${services[@]}"; do
        case $arg in
            --pull)
                pull_flag=true
                ;;
            *)
                filtered_services+=("$arg")
                ;;
        esac
    done
    
    services=("${filtered_services[@]}")
    
    log_header "Rebuilding Services"
    
    if [[ ${#services[@]} -eq 0 ]]; then
        log_error "No services specified for rebuild"
        return 1
    fi
    
    for service in "${services[@]}"; do
        log_info "Rebuilding $service..."
        
        # Stop service
        docker-compose stop "$service"
        
        # Remove container
        docker-compose rm -f "$service"
        
        # Pull image if requested
        if [[ "$pull_flag" == true ]]; then
            docker-compose pull "$service"
        fi
        
        # Rebuild and start
        docker-compose up -d "$service"
        
        log_success "$service rebuilt successfully"
    done
}

# Show service logs
show_logs() {
    local service="${1:-}"
    local lines="${2:-100}"
    
    log_header "Service Logs"
    
    if [[ -z "$service" ]]; then
        log_info "Showing logs for all services..."
        docker-compose logs --tail="$lines" -f
    else
        log_info "Showing logs for $service..."
        docker-compose logs --tail="$lines" -f "$service"
    fi
}

# Clean up Docker resources
cleanup_docker() {
    log_header "Docker Cleanup"
    
    log_info "Current Docker usage:"
    docker system df
    
    echo -e "${YELLOW}This will remove unused Docker resources. Continue? (y/N)${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        log_info "Cleanup cancelled"
        return 0
    fi
    
    # Clean up containers
    log_info "Removing stopped containers..."
    docker container prune -f
    
    # Clean up images
    log_info "Removing unused images..."
    docker image prune -f
    
    # Clean up volumes (be careful!)
    log_info "Removing unused volumes..."
    docker volume prune -f
    
    # Clean up networks
    log_info "Removing unused networks..."
    docker network prune -f
    
    # Show new usage
    log_info "Docker usage after cleanup:"
    docker system df
    
    log_success "Docker cleanup completed"
}

# Show current status
show_status() {
    log_header "Current Status"
    
    # Docker compose status
    log_info "Docker Compose Services:"
    docker-compose ps
    
    echo ""
    
    # System resources
    log_info "System Resources:"
    echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
    echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"
    echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
    
    echo ""
    
    # Service health
    "$SCRIPT_DIR/monitor.sh" status
}

# Handle service management
manage_service() {
    local action="$1"
    local service="$2"
    
    case $action in
        start)
            log_info "Starting $service..."
            docker-compose start "$service"
            ;;
        stop)
            log_info "Stopping $service..."
            docker-compose stop "$service"
            ;;
        restart)
            log_info "Restarting $service..."
            docker-compose restart "$service"
            ;;
        *)
            log_error "Unknown action: $action"
            return 1
            ;;
    esac
    
    log_success "$action completed for $service"
}

# Rolling update for zero-downtime deployment
rolling_update() {
    local services=("frontend" "explorer" "faucet" "bridge")
    
    log_header "Rolling Update"
    
    create_backup
    
    for service in "${services[@]}"; do
        log_info "Rolling update for $service..."
        
        # Scale up
        docker-compose up -d --scale "$service=2" "$service"
        sleep 10
        
        # Check health
        if ! curl -f "http://localhost/$service/health" >/dev/null 2>&1; then
            log_warning "Health check failed for $service, continuing..."
        fi
        
        # Scale back down
        docker-compose up -d --scale "$service=1" "$service"
        sleep 5
    done
    
    log_success "Rolling update completed"
}

# Main function
main() {
    local command="${1:-help}"
    shift || true
    
    check_environment
    
    case $command in
        update)
            update_services "$@"
            ;;
        restart)
            restart_services "$@"
            ;;
        scale)
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 scale SERVICE REPLICAS"
                exit 1
            fi
            scale_service "$1" "$2"
            ;;
        backup)
            create_backup
            ;;
        logs)
            show_logs "$@"
            ;;
        cleanup)
            cleanup_docker
            ;;
        rebuild)
            rebuild_service "$@"
            ;;
        status)
            show_status
            ;;
        rolling-update)
            rolling_update
            ;;
        start|stop)
            if [[ $# -lt 1 ]]; then
                log_error "Usage: $0 $command SERVICE"
                exit 1
            fi
            manage_service "$command" "$1"
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

# Run main function
main "$@"
