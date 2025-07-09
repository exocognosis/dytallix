#!/bin/bash

# Docker Secrets Management Script for Dytallix
# This script manages Docker secrets for containerized deployments

set -euo pipefail

# Configuration
DOCKER_STACK_NAME="dytallix"
SECRETS_DIR="./secrets"
ENVIRONMENT="dev"
FORCE_UPDATE=false
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create                  Create Docker secrets"
    echo "  update                  Update existing secrets"
    echo "  delete                  Delete secrets"
    echo "  list                    List all secrets"
    echo "  rotate                  Rotate PQC keys"
    echo ""
    echo "Options:"
    echo "  --env ENV               Environment (dev/staging/prod) [default: dev]"
    echo "  --stack-name NAME       Docker stack name [default: dytallix]"
    echo "  --secrets-dir DIR       Secrets directory [default: ./secrets]"
    echo "  --force                 Force update of existing secrets"
    echo "  --verbose               Enable verbose output"
    echo "  --help                  Show this help message"
}

log_info() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${GREEN}[INFO]${NC} $1"
    fi
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is required but not installed"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check if Docker Swarm is initialized
    if ! docker node ls &> /dev/null; then
        log_error "Docker Swarm is not initialized"
        log_error "Run: docker swarm init"
        exit 1
    fi
}

prepare_secrets_directory() {
    log_info "Preparing secrets directory..."
    
    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"
    
    # Create subdirectories for each environment
    mkdir -p "$SECRETS_DIR/$ENVIRONMENT"
    chmod 700 "$SECRETS_DIR/$ENVIRONMENT"
}

create_pqc_keys_secret() {
    log_info "Creating PQC keys secret..."
    
    local keys_file="../secrets-management/keys/pqc_keys_${ENVIRONMENT}.json.enc"
    local secret_name="${DOCKER_STACK_NAME}_pqc_keys_${ENVIRONMENT}"
    
    if [[ ! -f "$keys_file" ]]; then
        log_error "PQC keys file not found: $keys_file"
        log_error "Run generate-keys.sh first"
        exit 1
    fi
    
    # Check if secret already exists
    if docker secret ls --format "table {{.Name}}" | grep -q "$secret_name"; then
        if [[ "$FORCE_UPDATE" == true ]]; then
            log_info "Removing existing secret: $secret_name"
            docker secret rm "$secret_name" || true
        else
            log_warn "Secret already exists: $secret_name"
            log_warn "Use --force to update"
            return
        fi
    fi
    
    # Create the secret
    docker secret create "$secret_name" "$keys_file"
    log_info "Created secret: $secret_name"
}

create_password_secret() {
    log_info "Creating password secret..."
    
    local env_file="../secrets-management/keys/.env.${ENVIRONMENT}"
    local secret_name="${DOCKER_STACK_NAME}_keys_password_${ENVIRONMENT}"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi
    
    # Extract password from env file
    local password=$(grep "DYTALLIX_KEYS_PASSWORD=" "$env_file" | cut -d'=' -f2)
    
    if [[ -z "$password" ]]; then
        log_error "Password not found in environment file"
        exit 1
    fi
    
    # Check if secret already exists
    if docker secret ls --format "table {{.Name}}" | grep -q "$secret_name"; then
        if [[ "$FORCE_UPDATE" == true ]]; then
            log_info "Removing existing secret: $secret_name"
            docker secret rm "$secret_name" || true
        else
            log_warn "Secret already exists: $secret_name"
            return
        fi
    fi
    
    # Create the secret
    echo "$password" | docker secret create "$secret_name" -
    log_info "Created secret: $secret_name"
}

create_database_secrets() {
    log_info "Creating database secrets..."
    
    local db_password=$(openssl rand -base64 32)
    local secret_name="${DOCKER_STACK_NAME}_db_password_${ENVIRONMENT}"
    
    # Check if secret already exists
    if docker secret ls --format "table {{.Name}}" | grep -q "$secret_name"; then
        if [[ "$FORCE_UPDATE" == true ]]; then
            log_info "Removing existing secret: $secret_name"
            docker secret rm "$secret_name" || true
        else
            log_warn "Secret already exists: $secret_name"
            return
        fi
    fi
    
    # Create the secret
    echo "$db_password" | docker secret create "$secret_name" -
    log_info "Created secret: $secret_name"
    
    # Create database configuration
    local db_config_secret="${DOCKER_STACK_NAME}_db_config_${ENVIRONMENT}"
    
    if docker secret ls --format "table {{.Name}}" | grep -q "$db_config_secret"; then
        if [[ "$FORCE_UPDATE" == true ]]; then
            docker secret rm "$db_config_secret" || true
        else
            log_warn "Secret already exists: $db_config_secret"
            return
        fi
    fi
    
    cat > "$SECRETS_DIR/$ENVIRONMENT/db_config.json" << EOF
{
    "host": "dytallix-db",
    "port": 5432,
    "database": "dytallix_${ENVIRONMENT}",
    "username": "dytallix_${ENVIRONMENT}",
    "ssl_mode": "require",
    "max_connections": 100,
    "connection_timeout": 30
}
EOF
    
    docker secret create "$db_config_secret" "$SECRETS_DIR/$ENVIRONMENT/db_config.json"
    log_info "Created secret: $db_config_secret"
}

create_api_secrets() {
    log_info "Creating API secrets..."
    
    local api_key=$(openssl rand -base64 32)
    local jwt_secret=$(openssl rand -base64 32)
    
    # API key secret
    local api_secret_name="${DOCKER_STACK_NAME}_api_key_${ENVIRONMENT}"
    
    if docker secret ls --format "table {{.Name}}" | grep -q "$api_secret_name"; then
        if [[ "$FORCE_UPDATE" == true ]]; then
            docker secret rm "$api_secret_name" || true
        else
            log_warn "Secret already exists: $api_secret_name"
            return
        fi
    fi
    
    echo "$api_key" | docker secret create "$api_secret_name" -
    log_info "Created secret: $api_secret_name"
    
    # JWT secret
    local jwt_secret_name="${DOCKER_STACK_NAME}_jwt_secret_${ENVIRONMENT}"
    
    if docker secret ls --format "table {{.Name}}" | grep -q "$jwt_secret_name"; then
        if [[ "$FORCE_UPDATE" == true ]]; then
            docker secret rm "$jwt_secret_name" || true
        else
            log_warn "Secret already exists: $jwt_secret_name"
            return
        fi
    fi
    
    echo "$jwt_secret" | docker secret create "$jwt_secret_name" -
    log_info "Created secret: $jwt_secret_name"
}

create_tls_secrets() {
    log_info "Creating TLS secrets..."
    
    local certs_dir="$SECRETS_DIR/$ENVIRONMENT/certs"
    mkdir -p "$certs_dir"
    
    # Generate self-signed certificate for development
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        openssl req -x509 -newkey rsa:4096 -keyout "$certs_dir/server.key" -out "$certs_dir/server.crt" -days 365 -nodes -subj "/CN=localhost"
    else
        log_warn "For production, use proper TLS certificates"
        log_warn "Place server.crt and server.key in $certs_dir"
        return
    fi
    
    # Create secrets for certificate and key
    local cert_secret="${DOCKER_STACK_NAME}_tls_cert_${ENVIRONMENT}"
    local key_secret="${DOCKER_STACK_NAME}_tls_key_${ENVIRONMENT}"
    
    if docker secret ls --format "table {{.Name}}" | grep -q "$cert_secret"; then
        if [[ "$FORCE_UPDATE" == true ]]; then
            docker secret rm "$cert_secret" || true
        else
            log_warn "Secret already exists: $cert_secret"
            return
        fi
    fi
    
    if docker secret ls --format "table {{.Name}}" | grep -q "$key_secret"; then
        if [[ "$FORCE_UPDATE" == true ]]; then
            docker secret rm "$key_secret" || true
        else
            log_warn "Secret already exists: $key_secret"
            return
        fi
    fi
    
    docker secret create "$cert_secret" "$certs_dir/server.crt"
    docker secret create "$key_secret" "$certs_dir/server.key"
    
    log_info "Created TLS secrets: $cert_secret, $key_secret"
}

create_all_secrets() {
    log_info "Creating all secrets for environment: $ENVIRONMENT"
    
    prepare_secrets_directory
    create_pqc_keys_secret
    create_password_secret
    create_database_secrets
    create_api_secrets
    create_tls_secrets
    
    log_info "All secrets created successfully"
}

list_secrets() {
    log_info "Listing Docker secrets..."
    
    echo "Docker Secrets for stack: $DOCKER_STACK_NAME"
    echo "========================================"
    
    docker secret ls --format "table {{.Name}}\t{{.CreatedAt}}" | grep "$DOCKER_STACK_NAME" || {
        echo "No secrets found for stack: $DOCKER_STACK_NAME"
    }
}

delete_secrets() {
    log_info "Deleting secrets for environment: $ENVIRONMENT"
    
    local secrets=$(docker secret ls --format "{{.Name}}" | grep "${DOCKER_STACK_NAME}.*${ENVIRONMENT}" || true)
    
    if [[ -z "$secrets" ]]; then
        log_warn "No secrets found for environment: $ENVIRONMENT"
        return
    fi
    
    echo "$secrets" | while read -r secret; do
        if [[ -n "$secret" ]]; then
            log_info "Deleting secret: $secret"
            docker secret rm "$secret"
        fi
    done
    
    log_info "Secrets deleted for environment: $ENVIRONMENT"
}

rotate_pqc_keys() {
    log_info "Rotating PQC keys for environment: $ENVIRONMENT"
    
    # Generate new keys
    cd ../secrets-management
    ./generate-keys.sh --env "$ENVIRONMENT" --force
    cd - > /dev/null
    
    # Update the secret
    FORCE_UPDATE=true
    create_pqc_keys_secret
    create_password_secret
    
    log_info "PQC keys rotated successfully"
}

create_docker_compose_template() {
    log_info "Creating Docker Compose template..."
    
    cat > "$SECRETS_DIR/docker-compose.secrets.yml" << EOF
version: '3.8'

services:
  dytallix-node:
    image: dytallix:latest
    secrets:
      - dytallix_pqc_keys_${ENVIRONMENT}
      - dytallix_keys_password_${ENVIRONMENT}
      - dytallix_db_password_${ENVIRONMENT}
      - dytallix_db_config_${ENVIRONMENT}
      - dytallix_api_key_${ENVIRONMENT}
      - dytallix_jwt_secret_${ENVIRONMENT}
      - dytallix_tls_cert_${ENVIRONMENT}
      - dytallix_tls_key_${ENVIRONMENT}
    environment:
      - DYTALLIX_ENVIRONMENT=${ENVIRONMENT}
      - DYTALLIX_PQC_KEYS_PATH=/run/secrets/dytallix_pqc_keys_${ENVIRONMENT}
      - DYTALLIX_KEYS_PASSWORD_FILE=/run/secrets/dytallix_keys_password_${ENVIRONMENT}
      - DYTALLIX_DB_PASSWORD_FILE=/run/secrets/dytallix_db_password_${ENVIRONMENT}
      - DYTALLIX_DB_CONFIG_FILE=/run/secrets/dytallix_db_config_${ENVIRONMENT}
      - DYTALLIX_API_KEY_FILE=/run/secrets/dytallix_api_key_${ENVIRONMENT}
      - DYTALLIX_JWT_SECRET_FILE=/run/secrets/dytallix_jwt_secret_${ENVIRONMENT}
      - DYTALLIX_TLS_CERT_FILE=/run/secrets/dytallix_tls_cert_${ENVIRONMENT}
      - DYTALLIX_TLS_KEY_FILE=/run/secrets/dytallix_tls_key_${ENVIRONMENT}
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

secrets:
  dytallix_pqc_keys_${ENVIRONMENT}:
    external: true
  dytallix_keys_password_${ENVIRONMENT}:
    external: true
  dytallix_db_password_${ENVIRONMENT}:
    external: true
  dytallix_db_config_${ENVIRONMENT}:
    external: true
  dytallix_api_key_${ENVIRONMENT}:
    external: true
  dytallix_jwt_secret_${ENVIRONMENT}:
    external: true
  dytallix_tls_cert_${ENVIRONMENT}:
    external: true
  dytallix_tls_key_${ENVIRONMENT}:
    external: true
EOF
    
    log_info "Docker Compose template created: $SECRETS_DIR/docker-compose.secrets.yml"
}

main() {
    local command=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            create|update|delete|list|rotate)
                command="$1"
                shift
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --stack-name)
                DOCKER_STACK_NAME="$2"
                shift 2
                ;;
            --secrets-dir)
                SECRETS_DIR="$2"
                shift 2
                ;;
            --force)
                FORCE_UPDATE=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
    
    if [[ -z "$command" ]]; then
        log_error "No command specified"
        print_usage
        exit 1
    fi
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT (must be dev, staging, or prod)"
        exit 1
    fi
    
    log_info "Docker secrets management for environment: $ENVIRONMENT"
    
    check_dependencies
    
    case "$command" in
        create)
            create_all_secrets
            create_docker_compose_template
            ;;
        update)
            FORCE_UPDATE=true
            create_all_secrets
            ;;
        delete)
            delete_secrets
            ;;
        list)
            list_secrets
            ;;
        rotate)
            rotate_pqc_keys
            ;;
        *)
            log_error "Unknown command: $command"
            exit 1
            ;;
    esac
    
    log_info "Docker secrets management completed"
}

# Run main function
main "$@"
