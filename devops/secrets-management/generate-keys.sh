#!/bin/bash

# Dytallix PQC Key Generation and Encryption Script
# This script generates new PQC keys and encrypts them for secure storage

set -euo pipefail

# Default values
ENVIRONMENT="dev"
USE_VAULT=false
OUTPUT_DIR="./keys"
BACKUP_DIR="./backups"
FORCE_REGENERATE=false
ENCRYPT_KEYS=true
KEY_PASSWORD=""
VAULT_URL=""
VAULT_TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --env ENV               Environment (dev/staging/prod) [default: dev]"
    echo "  --vault                 Store keys in HashiCorp Vault"
    echo "  --output-dir DIR        Output directory for keys [default: ./keys]"
    echo "  --backup-dir DIR        Backup directory [default: ./backups]"
    echo "  --force                 Force regeneration of existing keys"
    echo "  --no-encrypt            Don't encrypt keys (NOT RECOMMENDED)"
    echo "  --password PASSWORD     Password for key encryption"
    echo "  --vault-url URL         Vault server URL"
    echo "  --vault-token TOKEN     Vault access token"
    echo "  --help                  Show this help message"
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check for required tools
    for tool in openssl base64 jq; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check for Rust if we need to generate keys
    if ! command -v cargo &> /dev/null; then
        log_error "Cargo is required to build the key generation tool"
        exit 1
    fi
    
    # Check for Vault CLI if using Vault
    if [[ "$USE_VAULT" == true ]]; then
        if ! command -v vault &> /dev/null; then
            log_error "Vault CLI is required for Vault integration"
            exit 1
        fi
    fi
}

generate_password() {
    if [[ -z "$KEY_PASSWORD" ]]; then
        if [[ "$ENVIRONMENT" == "dev" ]]; then
            KEY_PASSWORD="dytallix-dev-$(date +%s)"
        else
            KEY_PASSWORD=$(openssl rand -base64 32)
        fi
    fi
}

create_directories() {
    log_info "Creating directories..."
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$BACKUP_DIR"
    
    # Set restrictive permissions
    chmod 700 "$OUTPUT_DIR"
    chmod 700 "$BACKUP_DIR"
}

backup_existing_keys() {
    local keys_file="$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}.json"
    if [[ -f "$keys_file" ]]; then
        log_info "Backing up existing keys..."
        local backup_file="$BACKUP_DIR/pqc_keys_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).json"
        cp "$keys_file" "$backup_file"
        log_info "Backup created: $backup_file"
    fi
}

generate_pqc_keys() {
    log_info "Generating PQC keys for environment: $ENVIRONMENT"
    
    # Build the key generation tool
    cd "$(dirname "$0")/../.."
    
    # Check if we can use the existing pqc-crypto library
    if [[ -d "pqc-crypto" ]]; then
        cd pqc-crypto
        cargo build --release
        cd ..
    else
        log_error "PQC crypto library not found"
        exit 1
    fi
    
    # Generate keys using the library
    local keys_file="$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}.json"
    local temp_keys_file="$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}_temp.json"
    
    # Create a temporary Rust program to generate keys
    cat > /tmp/generate_keys.rs << 'EOF'
extern crate dytallix_pqc;
use dytallix_pqc::PQCManager;
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pqc_manager = PQCManager::new()?;
    let keys_json = pqc_manager.export_keys()?;
    
    let output_file = std::env::args().nth(1).unwrap_or_else(|| "pqc_keys.json".to_string());
    fs::write(&output_file, keys_json)?;
    
    println!("Keys generated and saved to: {}", output_file);
    Ok(())
}
EOF
    
    # Instead of manually compiling, let's create a simple CLI program
    PQC_DIR="/Users/rickglenn/Desktop/dytallix/pqc-crypto"
    cd "$PQC_DIR"
    
    # Create bin directory if it doesn't exist
    mkdir -p src/bin
    
    # Create a simple keys generator binary
    cat > src/bin/keygen.rs << 'EOF'
use dytallix_pqc::PQCManager;
use std::env;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pqc_manager = PQCManager::new()?;
    
    let output_file = env::args().nth(1).unwrap_or_else(|| "pqc_keys.json".to_string());
    pqc_manager.save_to_file(&output_file)?;
    
    println!("Keys generated and saved to: {}", output_file);
    Ok(())
}
EOF

    # Build and run with cargo
    cargo build --release --bin keygen
    cargo run --release --bin keygen -- "$temp_keys_file"
    
    cd "/Users/rickglenn/Desktop/dytallix/devops/secrets-management"
    
    # Clean up
    rm -f /tmp/generate_keys.rs /tmp/generate_keys
    
    if [[ ! -f "$temp_keys_file" ]]; then
        log_error "Failed to generate keys"
        exit 1
    fi
    
    mv "$temp_keys_file" "$keys_file"
    log_info "Keys generated: $keys_file"
}

encrypt_keys() {
    if [[ "$ENCRYPT_KEYS" != true ]]; then
        log_warn "Keys are not encrypted - this is not recommended for production"
        return
    fi
    
    log_info "Encrypting keys..."
    
    local keys_file="$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}.json"
    local encrypted_file="$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}.json.enc"
    
    # Generate a salt
    local salt=$(openssl rand -hex 16)
    
    # Encrypt the keys
    openssl enc -aes-256-cbc -salt -in "$keys_file" -out "$encrypted_file" -pass pass:"$KEY_PASSWORD" -pbkdf2 -iter 100000
    
    # Create metadata file
    cat > "$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}.meta" << EOF
{
    "environment": "$ENVIRONMENT",
    "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "encrypted": true,
    "algorithm": "aes-256-cbc",
    "pbkdf2_iterations": 100000,
    "salt": "$salt"
}
EOF
    
    # Remove unencrypted file
    rm -f "$keys_file"
    
    log_info "Keys encrypted: $encrypted_file"
}

store_in_vault() {
    if [[ "$USE_VAULT" != true ]]; then
        return
    fi
    
    log_info "Storing keys in Vault..."
    
    # Configure Vault
    export VAULT_ADDR="$VAULT_URL"
    export VAULT_TOKEN="$VAULT_TOKEN"
    
    # Check Vault status
    if ! vault status &> /dev/null; then
        log_error "Cannot connect to Vault at $VAULT_URL"
        exit 1
    fi
    
    local keys_file="$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}.json.enc"
    local vault_path="secret/dytallix/${ENVIRONMENT}/pqc_keys"
    
    # Read the encrypted keys
    local encrypted_keys=$(base64 -i "$keys_file")
    
    # Store in Vault
    vault kv put "$vault_path" \
        encrypted_keys="$encrypted_keys" \
        password="$KEY_PASSWORD" \
        environment="$ENVIRONMENT" \
        created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    
    log_info "Keys stored in Vault at: $vault_path"
}

create_env_file() {
    log_info "Creating environment file..."
    
    local env_file="$OUTPUT_DIR/.env.${ENVIRONMENT}"
    
    cat > "$env_file" << EOF
# Dytallix PQC Keys Environment Configuration
# Environment: $ENVIRONMENT
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

DYTALLIX_ENVIRONMENT=$ENVIRONMENT
DYTALLIX_PQC_KEYS_PATH=$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}.json.enc
DYTALLIX_KEYS_PASSWORD=$KEY_PASSWORD

# Vault Configuration (if applicable)
DYTALLIX_VAULT_URL=$VAULT_URL
DYTALLIX_VAULT_TOKEN=$VAULT_TOKEN
DYTALLIX_USE_VAULT=$USE_VAULT

# Key Rotation Configuration
DYTALLIX_KEY_ROTATION_INTERVAL=720  # 30 days in hours
DYTALLIX_BACKUP_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Security Settings
DYTALLIX_REQUIRE_TLS=true
DYTALLIX_MIN_TLS_VERSION=1.2
DYTALLIX_AUDIT_LOGGING=true
EOF
    
    # Set restrictive permissions
    chmod 600 "$env_file"
    
    log_info "Environment file created: $env_file"
}

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --vault)
                USE_VAULT=true
                shift
                ;;
            --output-dir)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --backup-dir)
                BACKUP_DIR="$2"
                shift 2
                ;;
            --force)
                FORCE_REGENERATE=true
                shift
                ;;
            --no-encrypt)
                ENCRYPT_KEYS=false
                shift
                ;;
            --password)
                KEY_PASSWORD="$2"
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
    
    # Check if keys already exist
    local keys_file="$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}.json"
    local encrypted_keys_file="$OUTPUT_DIR/pqc_keys_${ENVIRONMENT}.json.enc"
    
    if [[ -f "$keys_file" || -f "$encrypted_keys_file" ]] && [[ "$FORCE_REGENERATE" != true ]]; then
        log_error "Keys already exist for environment: $ENVIRONMENT"
        log_info "Use --force to regenerate"
        exit 1
    fi
    
    # Validate Vault parameters
    if [[ "$USE_VAULT" == true ]]; then
        if [[ -z "$VAULT_URL" || -z "$VAULT_TOKEN" ]]; then
            log_error "Vault URL and token are required when using Vault"
            exit 1
        fi
    fi
    
    log_info "Starting PQC key generation for environment: $ENVIRONMENT"
    
    check_dependencies
    generate_password
    create_directories
    backup_existing_keys
    generate_pqc_keys
    encrypt_keys
    store_in_vault
    create_env_file
    
    log_info "PQC key generation completed successfully!"
    log_info "Key password: $KEY_PASSWORD"
    log_warn "Store the password securely - it's required to decrypt the keys"
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        log_warn "Production keys generated - ensure they are properly backed up and access is restricted"
    fi
}

# Run main function
main "$@"
