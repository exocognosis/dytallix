#!/bin/bash

# Dytallix Environment Setup Script
# This script sets up environment variables for development and testing

set -euo pipefail

# Default values
ENVIRONMENT="dev"
KEYS_DIR="./keys"
VAULT_URL=""
VAULT_TOKEN=""
CREATE_ENV_FILE=true
VERBOSE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "This script sets up environment variables for Dytallix development."
    echo "It can be sourced to load variables into the current shell."
    echo ""
    echo "Options:"
    echo "  --env ENV               Environment (dev/staging/prod) [default: dev]"
    echo "  --keys-dir DIR          Directory containing PQC keys [default: ./keys]"
    echo "  --vault-url URL         Vault server URL"
    echo "  --vault-token TOKEN     Vault access token"
    echo "  --no-env-file           Don't create .env file"
    echo "  --verbose               Enable verbose output"
    echo "  --help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Setup dev environment"
    echo "  $0 --env prod           # Setup prod environment"
    echo "  source $0               # Load variables into current shell"
}

log_info() {
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${GREEN}[INFO]${NC} $1" >&2
    fi
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

check_keys_exist() {
    local keys_file="$KEYS_DIR/pqc_keys_${ENVIRONMENT}.json"
    local encrypted_keys_file="$KEYS_DIR/pqc_keys_${ENVIRONMENT}.json.enc"
    
    if [[ ! -f "$keys_file" && ! -f "$encrypted_keys_file" ]]; then
        log_error "No PQC keys found for environment: $ENVIRONMENT"
        log_error "Expected: $keys_file or $encrypted_keys_file"
        log_error "Run generate-keys.sh first to create keys"
        return 1
    fi
    
    if [[ -f "$encrypted_keys_file" ]]; then
        log_info "Found encrypted keys: $encrypted_keys_file"
        return 0
    fi
    
    if [[ -f "$keys_file" ]]; then
        log_warn "Found unencrypted keys: $keys_file"
        log_warn "Consider encrypting keys for better security"
        return 0
    fi
}

load_key_password() {
    local env_file="$KEYS_DIR/.env.${ENVIRONMENT}"
    
    if [[ -f "$env_file" ]]; then
        # Source the environment file to get the password
        source "$env_file"
        log_info "Loaded configuration from: $env_file"
    else
        log_warn "No environment file found: $env_file"
        if [[ -z "${DYTALLIX_KEYS_PASSWORD:-}" ]]; then
            log_error "DYTALLIX_KEYS_PASSWORD not set and no env file found"
            return 1
        fi
    fi
}

setup_base_variables() {
    log_info "Setting up base environment variables..."
    
    # Core configuration
    export DYTALLIX_ENVIRONMENT="$ENVIRONMENT"
    export DYTALLIX_LOG_LEVEL="info"
    export DYTALLIX_DEBUG_MODE="false"
    
    # Paths
    export DYTALLIX_DATA_DIR="./data"
    export DYTALLIX_LOGS_DIR="./logs"
    export DYTALLIX_BACKUP_DIR="./backups"
    
    # Security settings
    export DYTALLIX_REQUIRE_TLS="true"
    export DYTALLIX_MIN_TLS_VERSION="1.2"
    export DYTALLIX_AUDIT_LOGGING="true"
    
    # Development-specific settings
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        export DYTALLIX_LOG_LEVEL="debug"
        export DYTALLIX_DEBUG_MODE="true"
        export DYTALLIX_REQUIRE_TLS="false"
        export DYTALLIX_AUDIT_LOGGING="false"
    fi
    
    # Create required directories
    mkdir -p "$DYTALLIX_DATA_DIR" "$DYTALLIX_LOGS_DIR" "$DYTALLIX_BACKUP_DIR"
}

setup_pqc_variables() {
    log_info "Setting up PQC key variables..."
    
    local keys_file="$KEYS_DIR/pqc_keys_${ENVIRONMENT}.json"
    local encrypted_keys_file="$KEYS_DIR/pqc_keys_${ENVIRONMENT}.json.enc"
    
    if [[ -f "$encrypted_keys_file" ]]; then
        export DYTALLIX_PQC_KEYS_PATH="$encrypted_keys_file"
        export DYTALLIX_PQC_KEYS_ENCRYPTED="true"
    else
        export DYTALLIX_PQC_KEYS_PATH="$keys_file"
        export DYTALLIX_PQC_KEYS_ENCRYPTED="false"
    fi
    
    # Key rotation settings
    export DYTALLIX_KEY_ROTATION_INTERVAL="720"  # 30 days in hours
    export DYTALLIX_KEY_ROTATION_ENABLED="true"
    export DYTALLIX_KEY_BACKUP_RETENTION="90"   # 90 days
    
    # Signature algorithm preferences
    export DYTALLIX_PREFERRED_SIGNATURE_ALGORITHM="Dilithium5"
    export DYTALLIX_PREFERRED_KEM_ALGORITHM="Kyber1024"
    
    # Performance settings
    export DYTALLIX_SIGNATURE_CACHE_SIZE="1000"
    export DYTALLIX_SIGNATURE_CACHE_TTL="300"   # 5 minutes
}

setup_vault_variables() {
    if [[ -n "$VAULT_URL" && -n "$VAULT_TOKEN" ]]; then
        log_info "Setting up Vault variables..."
        
        export VAULT_ADDR="$VAULT_URL"
        export VAULT_TOKEN="$VAULT_TOKEN"
        export DYTALLIX_USE_VAULT="true"
        export DYTALLIX_VAULT_PATH="secret/dytallix/${ENVIRONMENT}"
        
        # Test Vault connection
        if command -v vault &> /dev/null; then
            if vault status &> /dev/null; then
                log_info "Vault connection successful"
            else
                log_warn "Cannot connect to Vault at $VAULT_URL"
            fi
        else
            log_warn "Vault CLI not installed - cannot test connection"
        fi
    else
        export DYTALLIX_USE_VAULT="false"
        log_info "Vault not configured"
    fi
}

setup_network_variables() {
    log_info "Setting up network variables..."
    
    # Default network settings
    export DYTALLIX_BIND_ADDRESS="0.0.0.0"
    export DYTALLIX_PORT="8080"
    export DYTALLIX_METRICS_PORT="9090"
    export DYTALLIX_HEALTH_CHECK_PORT="8081"
    
    # P2P network settings
    export DYTALLIX_P2P_PORT="30303"
    export DYTALLIX_P2P_DISCOVERY_PORT="30304"
    export DYTALLIX_P2P_MAX_PEERS="50"
    
    # Environment-specific overrides
    case "$ENVIRONMENT" in
        dev)
            export DYTALLIX_PORT="8080"
            export DYTALLIX_P2P_PORT="30303"
            ;;
        staging)
            export DYTALLIX_PORT="8081"
            export DYTALLIX_P2P_PORT="30304"
            ;;
        prod)
            export DYTALLIX_PORT="8082"
            export DYTALLIX_P2P_PORT="30305"
            ;;
    esac
}

setup_database_variables() {
    log_info "Setting up database variables..."
    
    # Database configuration
    export DYTALLIX_DB_HOST="localhost"
    export DYTALLIX_DB_PORT="5432"
    export DYTALLIX_DB_NAME="dytallix_${ENVIRONMENT}"
    export DYTALLIX_DB_USER="dytallix_${ENVIRONMENT}"
    export DYTALLIX_DB_PASSWORD="dytallix_${ENVIRONMENT}_password"
    export DYTALLIX_DB_SSL_MODE="prefer"
    export DYTALLIX_DB_MAX_CONNECTIONS="100"
    export DYTALLIX_DB_CONNECTION_TIMEOUT="30"
    
    # Database URL
    export DYTALLIX_DATABASE_URL="postgresql://${DYTALLIX_DB_USER}:${DYTALLIX_DB_PASSWORD}@${DYTALLIX_DB_HOST}:${DYTALLIX_DB_PORT}/${DYTALLIX_DB_NAME}?sslmode=${DYTALLIX_DB_SSL_MODE}"
}

setup_ai_service_variables() {
    log_info "Setting up AI service variables..."
    
    # AI service configuration
    export DYTALLIX_AI_SERVICE_ENABLED="true"
    export DYTALLIX_AI_SERVICE_BASE_URL="http://localhost:8000"
    export DYTALLIX_AI_SERVICE_API_KEY="dev-api-key"
    export DYTALLIX_AI_SERVICE_TIMEOUT="30"
    export DYTALLIX_AI_SERVICE_MAX_RETRIES="3"
    export DYTALLIX_AI_SERVICE_RETRY_DELAY="1000"
    
    # Risk scoring thresholds
    export DYTALLIX_AI_LOW_RISK_THRESHOLD="0.3"
    export DYTALLIX_AI_HIGH_RISK_THRESHOLD="0.7"
    export DYTALLIX_AI_FRAUD_THRESHOLD="0.8"
    
    # AI model configuration
    export DYTALLIX_AI_MODEL_NAME="dytallix-risk-model"
    export DYTALLIX_AI_MODEL_VERSION="1.0"
    export DYTALLIX_AI_PREDICTION_CACHE_TTL="300"
}

setup_monitoring_variables() {
    log_info "Setting up monitoring variables..."
    
    # Monitoring configuration
    export DYTALLIX_METRICS_ENABLED="true"
    export DYTALLIX_METRICS_ENDPOINT="/metrics"
    export DYTALLIX_HEALTH_CHECK_ENDPOINT="/health"
    export DYTALLIX_READINESS_ENDPOINT="/ready"
    
    # Logging configuration
    export DYTALLIX_LOG_FORMAT="json"
    export DYTALLIX_LOG_TIMESTAMP="true"
    export DYTALLIX_LOG_CALLER="true"
    export DYTALLIX_LOG_STACK_TRACE="true"
    
    # Alerting thresholds
    export DYTALLIX_ALERT_CPU_THRESHOLD="80"
    export DYTALLIX_ALERT_MEMORY_THRESHOLD="85"
    export DYTALLIX_ALERT_DISK_THRESHOLD="90"
    export DYTALLIX_ALERT_ERROR_RATE_THRESHOLD="5"
}

create_env_file() {
    if [[ "$CREATE_ENV_FILE" != true ]]; then
        return
    fi
    
    log_info "Creating .env file..."
    
    local env_file=".env.${ENVIRONMENT}"
    
    cat > "$env_file" << EOF
# Dytallix Environment Configuration
# Environment: $ENVIRONMENT
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

# Core Configuration
DYTALLIX_ENVIRONMENT=$DYTALLIX_ENVIRONMENT
DYTALLIX_LOG_LEVEL=$DYTALLIX_LOG_LEVEL
DYTALLIX_DEBUG_MODE=$DYTALLIX_DEBUG_MODE

# Paths
DYTALLIX_DATA_DIR=$DYTALLIX_DATA_DIR
DYTALLIX_LOGS_DIR=$DYTALLIX_LOGS_DIR
DYTALLIX_BACKUP_DIR=$DYTALLIX_BACKUP_DIR

# PQC Keys
DYTALLIX_PQC_KEYS_PATH=$DYTALLIX_PQC_KEYS_PATH
DYTALLIX_PQC_KEYS_ENCRYPTED=$DYTALLIX_PQC_KEYS_ENCRYPTED
DYTALLIX_KEYS_PASSWORD=${DYTALLIX_KEYS_PASSWORD:-}

# Network
DYTALLIX_BIND_ADDRESS=$DYTALLIX_BIND_ADDRESS
DYTALLIX_PORT=$DYTALLIX_PORT
DYTALLIX_METRICS_PORT=$DYTALLIX_METRICS_PORT
DYTALLIX_HEALTH_CHECK_PORT=$DYTALLIX_HEALTH_CHECK_PORT

# P2P Network
DYTALLIX_P2P_PORT=$DYTALLIX_P2P_PORT
DYTALLIX_P2P_DISCOVERY_PORT=$DYTALLIX_P2P_DISCOVERY_PORT
DYTALLIX_P2P_MAX_PEERS=$DYTALLIX_P2P_MAX_PEERS

# Database
DYTALLIX_DATABASE_URL=$DYTALLIX_DATABASE_URL
DYTALLIX_DB_MAX_CONNECTIONS=$DYTALLIX_DB_MAX_CONNECTIONS

# Security
DYTALLIX_REQUIRE_TLS=$DYTALLIX_REQUIRE_TLS
DYTALLIX_MIN_TLS_VERSION=$DYTALLIX_MIN_TLS_VERSION
DYTALLIX_AUDIT_LOGGING=$DYTALLIX_AUDIT_LOGGING

# Vault (if configured)
DYTALLIX_USE_VAULT=$DYTALLIX_USE_VAULT
VAULT_ADDR=${VAULT_ADDR:-}
VAULT_TOKEN=${VAULT_TOKEN:-}

# AI Services
DYTALLIX_AI_SERVICE_ENABLED=$DYTALLIX_AI_SERVICE_ENABLED
DYTALLIX_AI_SERVICE_BASE_URL=$DYTALLIX_AI_SERVICE_BASE_URL
DYTALLIX_AI_SERVICE_API_KEY=$DYTALLIX_AI_SERVICE_API_KEY

# Monitoring
DYTALLIX_METRICS_ENABLED=$DYTALLIX_METRICS_ENABLED
DYTALLIX_LOG_FORMAT=$DYTALLIX_LOG_FORMAT
EOF
    
    # Set restrictive permissions
    chmod 600 "$env_file"
    
    log_info "Environment file created: $env_file"
}

print_summary() {
    echo ""
    echo "=== Dytallix Environment Setup Complete ==="
    echo "Environment: $ENVIRONMENT"
    echo "Keys directory: $KEYS_DIR"
    echo "PQC keys: $DYTALLIX_PQC_KEYS_PATH"
    echo "Vault enabled: $DYTALLIX_USE_VAULT"
    echo ""
    echo "To use these variables:"
    echo "  source $0 --env $ENVIRONMENT"
    echo "  # or"
    echo "  export \$(grep -v '^#' .env.${ENVIRONMENT} | xargs)"
    echo ""
    echo "To start the application:"
    echo "  cd blockchain-core && cargo run"
    echo ""
}

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --keys-dir)
                KEYS_DIR="$2"
                shift 2
                ;;
            --vault-url)
                VAULT_URL="$2"
                shift 2
                ;;
            --vault-token)
                VAULT_TOKEN="$2"
                shift 2
                ;;
            --no-env-file)
                CREATE_ENV_FILE=false
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
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT (must be dev, staging, or prod)"
        exit 1
    fi
    
    log_info "Setting up environment: $ENVIRONMENT"
    
    # Check if keys exist
    if ! check_keys_exist; then
        exit 1
    fi
    
    # Load key password if available
    load_key_password || true
    
    # Setup all variable groups
    setup_base_variables
    setup_pqc_variables
    setup_vault_variables
    setup_network_variables
    setup_database_variables
    setup_ai_service_variables
    setup_monitoring_variables
    
    # Create environment file
    create_env_file
    
    # Print summary
    print_summary
}

# Check if script is being sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script is being executed, not sourced
    main "$@"
else
    # Script is being sourced, set up variables silently
    VERBOSE=false
    main "$@"
fi
