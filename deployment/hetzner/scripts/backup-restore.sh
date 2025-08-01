#!/bin/bash

# Dytallix Data Backup and Restore Script
# This script helps backup data from GCP and restore it on Hetzner

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Configuration
BACKUP_DIR="/tmp/dytallix-backup-$(date +%Y%m%d-%H%M%S)"
KUBERNETES_NAMESPACE="dytallix"

# Help function
show_help() {
    cat << EOF
Dytallix Data Backup and Restore Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    backup-gcp          Backup data from GCP Kubernetes
    restore-hetzner     Restore data to Hetzner deployment
    backup-genesis      Backup genesis and configuration files
    restore-genesis     Restore genesis and configuration files
    backup-all          Backup everything from GCP
    help               Show this help message

Options:
    --namespace NAMESPACE   Kubernetes namespace (default: dytallix)
    --backup-dir DIR        Backup directory (default: /tmp/dytallix-backup-TIMESTAMP)
    --source-cluster CLUSTER   Source GCP cluster context
    --dry-run              Show what would be done without executing

Examples:
    $0 backup-all --source-cluster gke_project_zone_cluster
    $0 restore-hetzner --backup-dir /tmp/dytallix-backup-20240101-120000
    $0 backup-genesis
    $0 restore-genesis --backup-dir /tmp/dytallix-backup-20240101-120000

EOF
}

# Check dependencies
check_dependencies() {
    local missing=()
    
    command -v kubectl >/dev/null 2>&1 || missing+=("kubectl")
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    command -v tar >/dev/null 2>&1 || missing+=("tar")
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing[*]}"
        log_info "Please install the missing tools and try again"
        exit 1
    fi
}

# Backup PostgreSQL database from GCP
backup_postgres_gcp() {
    local namespace="$1"
    local backup_dir="$2"
    
    log_info "Backing up PostgreSQL database from GCP..."
    
    # Get PostgreSQL pod
    local postgres_pod
    postgres_pod=$(kubectl get pods -n "$namespace" -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$postgres_pod" ]]; then
        log_warning "PostgreSQL pod not found in namespace $namespace"
        return 0
    fi
    
    log_info "Found PostgreSQL pod: $postgres_pod"
    
    # Create database backup
    mkdir -p "$backup_dir/postgres"
    
    # Backup all databases
    kubectl exec -n "$namespace" "$postgres_pod" -- pg_dumpall -U postgres > "$backup_dir/postgres/all_databases.sql"
    
    # Backup explorer database specifically
    kubectl exec -n "$namespace" "$postgres_pod" -- pg_dump -U postgres -d explorer > "$backup_dir/postgres/explorer.sql" 2>/dev/null || log_warning "Explorer database not found"
    
    # Backup faucet database specifically
    kubectl exec -n "$namespace" "$postgres_pod" -- pg_dump -U postgres -d faucet > "$backup_dir/postgres/faucet.sql" 2>/dev/null || log_warning "Faucet database not found"
    
    log_success "PostgreSQL backup completed"
}

# Backup Redis data from GCP
backup_redis_gcp() {
    local namespace="$1"
    local backup_dir="$2"
    
    log_info "Backing up Redis data from GCP..."
    
    # Get Redis pod
    local redis_pod
    redis_pod=$(kubectl get pods -n "$namespace" -l app=redis -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$redis_pod" ]]; then
        log_warning "Redis pod not found in namespace $namespace"
        return 0
    fi
    
    log_info "Found Redis pod: $redis_pod"
    
    # Create Redis backup
    mkdir -p "$backup_dir/redis"
    
    # Save Redis data
    kubectl exec -n "$namespace" "$redis_pod" -- redis-cli BGSAVE
    sleep 5  # Wait for background save to complete
    
    # Copy dump file
    kubectl cp "$namespace/$redis_pod:/data/dump.rdb" "$backup_dir/redis/dump.rdb" 2>/dev/null || log_warning "Redis dump file not found"
    
    log_success "Redis backup completed"
}

# Backup blockchain data from GCP
backup_blockchain_gcp() {
    local namespace="$1"
    local backup_dir="$2"
    
    log_info "Backing up blockchain data from GCP..."
    
    # Get blockchain node pod
    local node_pod
    node_pod=$(kubectl get pods -n "$namespace" -l app=dytallix-node -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [[ -z "$node_pod" ]]; then
        log_warning "Dytallix node pod not found in namespace $namespace"
        return 0
    fi
    
    log_info "Found blockchain node pod: $node_pod"
    
    # Create blockchain backup
    mkdir -p "$backup_dir/blockchain"
    
    # Stop the node temporarily (if safe to do so)
    log_warning "Consider stopping the node before backup for data consistency"
    
    # Copy blockchain data
    kubectl cp "$namespace/$node_pod:/root/.dytallix/data" "$backup_dir/blockchain/" 2>/dev/null || log_warning "Blockchain data directory not found"
    kubectl cp "$namespace/$node_pod:/root/.dytallix/config" "$backup_dir/blockchain/" 2>/dev/null || log_warning "Blockchain config directory not found"
    
    log_success "Blockchain data backup completed"
}

# Backup genesis and configuration files
backup_genesis() {
    local backup_dir="$1"
    
    log_info "Backing up genesis and configuration files..."
    
    mkdir -p "$backup_dir/genesis"
    
    # Look for genesis files in common locations
    local genesis_files=(
        "./genesis.json"
        "./config/genesis.json"
        "./blockchain-core/genesis.json"
        "./testnet/genesis.json"
    )
    
    for file in "${genesis_files[@]}"; do
        if [[ -f "$file" ]]; then
            cp "$file" "$backup_dir/genesis/"
            log_info "Backed up: $file"
        fi
    done
    
    # Backup configuration files
    if [[ -d "./config" ]]; then
        cp -r ./config "$backup_dir/"
        log_info "Backed up config directory"
    fi
    
    # Backup environment files
    local env_files=(
        ".env"
        ".env.production"
        ".env.testnet"
        "deployment/gcp/.env"
    )
    
    for file in "${env_files[@]}"; do
        if [[ -f "$file" ]]; then
            cp "$file" "$backup_dir/genesis/"
            log_info "Backed up: $file"
        fi
    done
    
    log_success "Genesis and configuration backup completed"
}

# Backup Kubernetes configurations
backup_k8s_configs() {
    local namespace="$1"
    local backup_dir="$2"
    
    log_info "Backing up Kubernetes configurations..."
    
    mkdir -p "$backup_dir/k8s"
    
    # Backup all resources in namespace
    kubectl get all -n "$namespace" -o yaml > "$backup_dir/k8s/all-resources.yaml" 2>/dev/null || log_warning "Failed to backup all resources"
    
    # Backup specific resources
    local resources=("deployments" "services" "configmaps" "secrets" "persistentvolumeclaims" "ingresses")
    
    for resource in "${resources[@]}"; do
        kubectl get "$resource" -n "$namespace" -o yaml > "$backup_dir/k8s/$resource.yaml" 2>/dev/null || log_warning "Failed to backup $resource"
    done
    
    log_success "Kubernetes configurations backup completed"
}

# Restore PostgreSQL database to Hetzner
restore_postgres_hetzner() {
    local backup_dir="$1"
    
    log_info "Restoring PostgreSQL database to Hetzner..."
    
    if [[ ! -f "$backup_dir/postgres/all_databases.sql" ]]; then
        log_warning "PostgreSQL backup not found, skipping restore"
        return 0
    fi
    
    # Wait for PostgreSQL to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    docker-compose exec -T postgres pg_isready -U postgres || {
        log_error "PostgreSQL is not ready"
        return 1
    }
    
    # Restore databases
    docker-compose exec -T postgres psql -U postgres < "$backup_dir/postgres/all_databases.sql"
    
    log_success "PostgreSQL database restored"
}

# Restore Redis data to Hetzner
restore_redis_hetzner() {
    local backup_dir="$1"
    
    log_info "Restoring Redis data to Hetzner..."
    
    if [[ ! -f "$backup_dir/redis/dump.rdb" ]]; then
        log_warning "Redis backup not found, skipping restore"
        return 0
    fi
    
    # Stop Redis temporarily
    docker-compose stop redis
    
    # Copy dump file
    docker cp "$backup_dir/redis/dump.rdb" "$(docker-compose ps -q redis):/data/dump.rdb"
    
    # Start Redis
    docker-compose start redis
    
    log_success "Redis data restored"
}

# Restore blockchain data to Hetzner
restore_blockchain_hetzner() {
    local backup_dir="$1"
    
    log_info "Restoring blockchain data to Hetzner..."
    
    if [[ ! -d "$backup_dir/blockchain" ]]; then
        log_warning "Blockchain backup not found, skipping restore"
        return 0
    fi
    
    # Stop blockchain node
    docker-compose stop dytallix-node
    
    # Create volume directory
    mkdir -p ./volumes/dytallix-node
    
    # Restore data
    if [[ -d "$backup_dir/blockchain/data" ]]; then
        cp -r "$backup_dir/blockchain/data" ./volumes/dytallix-node/
    fi
    
    if [[ -d "$backup_dir/blockchain/config" ]]; then
        cp -r "$backup_dir/blockchain/config" ./volumes/dytallix-node/
    fi
    
    # Start blockchain node
    docker-compose start dytallix-node
    
    log_success "Blockchain data restored"
}

# Restore genesis files
restore_genesis() {
    local backup_dir="$1"
    
    log_info "Restoring genesis and configuration files..."
    
    if [[ ! -d "$backup_dir/genesis" ]]; then
        log_warning "Genesis backup not found, skipping restore"
        return 0
    fi
    
    # Restore genesis files
    for file in "$backup_dir/genesis"/*; do
        if [[ -f "$file" ]]; then
            filename=$(basename "$file")
            cp "$file" "./$filename"
            log_info "Restored: $filename"
        fi
    done
    
    # Restore config directory
    if [[ -d "$backup_dir/config" ]]; then
        cp -r "$backup_dir/config" ./
        log_info "Restored config directory"
    fi
    
    log_success "Genesis and configuration files restored"
}

# Main backup function for GCP
backup_gcp() {
    local namespace="$1"
    local backup_dir="$2"
    local source_cluster="$3"
    
    log_info "Starting full backup from GCP..."
    
    # Switch to source cluster context if provided
    if [[ -n "$source_cluster" ]]; then
        kubectl config use-context "$source_cluster"
        log_info "Switched to cluster context: $source_cluster"
    fi
    
    # Create backup directory
    mkdir -p "$backup_dir"
    
    # Backup all components
    backup_postgres_gcp "$namespace" "$backup_dir"
    backup_redis_gcp "$namespace" "$backup_dir"
    backup_blockchain_gcp "$namespace" "$backup_dir"
    backup_k8s_configs "$namespace" "$backup_dir"
    backup_genesis "$backup_dir"
    
    # Create backup manifest
    cat > "$backup_dir/manifest.json" << EOF
{
    "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "source": "gcp",
    "namespace": "$namespace",
    "cluster": "$source_cluster",
    "components": [
        "postgres",
        "redis", 
        "blockchain",
        "kubernetes",
        "genesis"
    ]
}
EOF

    # Create tar archive
    local archive_name="dytallix-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    tar -czf "$archive_name" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")"
    
    log_success "Full backup completed!"
    log_info "Backup directory: $backup_dir"
    log_info "Backup archive: $archive_name"
    log_info "To restore on Hetzner, copy the backup directory and run:"
    log_info "  $0 restore-hetzner --backup-dir $backup_dir"
}

# Main restore function for Hetzner
restore_hetzner() {
    local backup_dir="$1"
    
    log_info "Starting restore to Hetzner..."
    
    if [[ ! -d "$backup_dir" ]]; then
        log_error "Backup directory not found: $backup_dir"
        exit 1
    fi
    
    # Check if manifest exists
    if [[ -f "$backup_dir/manifest.json" ]]; then
        log_info "Backup manifest found:"
        cat "$backup_dir/manifest.json" | jq .
    fi
    
    # Restore all components
    restore_genesis "$backup_dir"
    restore_postgres_hetzner "$backup_dir"
    restore_redis_hetzner "$backup_dir"
    restore_blockchain_hetzner "$backup_dir"
    
    log_success "Restore to Hetzner completed!"
    log_info "Please verify all services are running correctly"
}

# Parse command line arguments
parse_args() {
    local command=""
    local namespace="$KUBERNETES_NAMESPACE"
    local backup_dir="$BACKUP_DIR"
    local source_cluster=""
    local dry_run=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            backup-gcp|backup-all|restore-hetzner|backup-genesis|restore-genesis|help)
                command="$1"
                shift
                ;;
            --namespace)
                namespace="$2"
                shift 2
                ;;
            --backup-dir)
                backup_dir="$2"
                shift 2
                ;;
            --source-cluster)
                source_cluster="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    case $command in
        backup-gcp|backup-all)
            check_dependencies
            backup_gcp "$namespace" "$backup_dir" "$source_cluster"
            ;;
        restore-hetzner)
            restore_hetzner "$backup_dir"
            ;;
        backup-genesis)
            backup_genesis "$backup_dir"
            ;;
        restore-genesis)
            restore_genesis "$backup_dir"
            ;;
        help|"")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Main entry point
main() {
    if [[ $# -eq 0 ]]; then
        show_help
        exit 0
    fi
    
    parse_args "$@"
}

# Run main function
main "$@"
