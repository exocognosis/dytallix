#!/bin/bash

# HashiCorp Vault Setup Script for Dytallix
# This script sets up Vault with proper policies and secret engines for PQC key storage

set -euo pipefail

# Configuration
VAULT_VERSION="1.15.0"
VAULT_DATA_DIR="/opt/vault/data"
VAULT_CONFIG_DIR="/opt/vault/config"
VAULT_ADDR="https://vault.dytallix.local:8200"
VAULT_TOKEN=""
SETUP_DEV_MODE=false
SETUP_PRODUCTION=false
ENABLE_AUTO_UNSEAL=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dev                   Setup development Vault instance"
    echo "  --production            Setup production Vault instance"
    echo "  --vault-addr ADDR       Vault server address [default: https://vault.dytallix.local:8200]"
    echo "  --data-dir DIR          Vault data directory [default: /opt/vault/data]"
    echo "  --config-dir DIR        Vault config directory [default: /opt/vault/config]"
    echo "  --auto-unseal           Enable auto-unseal with cloud KMS"
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
    for tool in curl jq openssl; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
}

install_vault() {
    log_info "Installing Vault..."
    
    # Download and install Vault
    local vault_zip="vault_${VAULT_VERSION}_linux_amd64.zip"
    local vault_url="https://releases.hashicorp.com/vault/${VAULT_VERSION}/${vault_zip}"
    
    curl -sSL "$vault_url" -o "/tmp/$vault_zip"
    cd /tmp && unzip -o "$vault_zip"
    sudo mv vault /usr/local/bin/
    sudo chmod +x /usr/local/bin/vault
    
    # Create vault user
    sudo useradd -r -s /bin/false vault || true
    
    # Create directories
    sudo mkdir -p "$VAULT_DATA_DIR"
    sudo mkdir -p "$VAULT_CONFIG_DIR"
    sudo mkdir -p /var/log/vault
    
    # Set permissions
    sudo chown vault:vault "$VAULT_DATA_DIR"
    sudo chown vault:vault "$VAULT_CONFIG_DIR"
    sudo chown vault:vault /var/log/vault
    
    log_info "Vault installed successfully"
}

create_vault_config() {
    log_info "Creating Vault configuration..."
    
    local config_file="$VAULT_CONFIG_DIR/vault.hcl"
    
    if [[ "$SETUP_DEV_MODE" == true ]]; then
        sudo tee "$config_file" > /dev/null << EOF
# Vault Development Configuration
ui = true
disable_mlock = true

storage "file" {
  path = "$VAULT_DATA_DIR"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = true
}

api_addr = "http://127.0.0.1:8200"
cluster_addr = "http://127.0.0.1:8201"
EOF
    else
        # Production configuration
        sudo tee "$config_file" > /dev/null << EOF
# Vault Production Configuration
ui = true
disable_mlock = false

storage "raft" {
  path = "$VAULT_DATA_DIR"
  node_id = "vault-node-1"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  cluster_address = "0.0.0.0:8201"
  tls_cert_file = "/etc/ssl/certs/vault.crt"
  tls_key_file = "/etc/ssl/private/vault.key"
  tls_min_version = "tls12"
}

api_addr = "$VAULT_ADDR"
cluster_addr = "https://127.0.0.1:8201"

# Enable audit logging
audit {
  file {
    path = "/var/log/vault/audit.log"
    log_raw = false
    format = "json"
  }
}

# Performance tuning
max_lease_ttl = "768h"
default_lease_ttl = "768h"
EOF
    fi
    
    sudo chown vault:vault "$config_file"
    sudo chmod 640 "$config_file"
    
    log_info "Vault configuration created: $config_file"
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    sudo tee /etc/systemd/system/vault.service > /dev/null << EOF
[Unit]
Description=HashiCorp Vault
Documentation=https://www.vaultproject.io/docs/
Requires=network-online.target
After=network-online.target
ConditionFileNotEmpty=$VAULT_CONFIG_DIR/vault.hcl

[Service]
Type=notify
User=vault
Group=vault
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes
PrivateDevices=yes
SecureBits=keep-caps
AmbientCapabilities=CAP_IPC_LOCK
CapabilityBoundingSet=CAP_SYSLOG CAP_IPC_LOCK
NoNewPrivileges=yes
ExecStart=/usr/local/bin/vault server -config=$VAULT_CONFIG_DIR/vault.hcl
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=process
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
StartLimitInterval=60
StartLimitBurst=3
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable vault
    
    log_info "Systemd service created"
}

initialize_vault() {
    log_info "Initializing Vault..."
    
    # Start Vault service
    sudo systemctl start vault
    sleep 5
    
    # Wait for Vault to be ready
    local attempts=0
    while ! vault status &> /dev/null && [[ $attempts -lt 30 ]]; do
        sleep 2
        attempts=$((attempts + 1))
    done
    
    if [[ $attempts -eq 30 ]]; then
        log_error "Vault failed to start within 60 seconds"
        exit 1
    fi
    
    # Initialize Vault
    local init_output=$(vault operator init -key-shares=5 -key-threshold=3 -format=json)
    
    # Save unseal keys and root token
    local unseal_keys_file="$VAULT_CONFIG_DIR/unseal_keys.json"
    local root_token_file="$VAULT_CONFIG_DIR/root_token"
    
    echo "$init_output" | sudo tee "$unseal_keys_file" > /dev/null
    echo "$init_output" | jq -r '.root_token' | sudo tee "$root_token_file" > /dev/null
    
    sudo chmod 600 "$unseal_keys_file" "$root_token_file"
    sudo chown vault:vault "$unseal_keys_file" "$root_token_file"
    
    # Unseal Vault
    local unseal_key_1=$(echo "$init_output" | jq -r '.unseal_keys_b64[0]')
    local unseal_key_2=$(echo "$init_output" | jq -r '.unseal_keys_b64[1]')
    local unseal_key_3=$(echo "$init_output" | jq -r '.unseal_keys_b64[2]')
    
    vault operator unseal "$unseal_key_1"
    vault operator unseal "$unseal_key_2"
    vault operator unseal "$unseal_key_3"
    
    # Set root token
    VAULT_TOKEN=$(echo "$init_output" | jq -r '.root_token')
    export VAULT_TOKEN
    
    log_info "Vault initialized and unsealed"
}

configure_vault_policies() {
    log_info "Configuring Vault policies..."
    
    # Create Dytallix admin policy
    vault policy write dytallix-admin - << EOF
# Dytallix Admin Policy
# Full access to Dytallix secrets

path "secret/dytallix/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/data/dytallix/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/dytallix/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "auth/token/create" {
  capabilities = ["create"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}

path "auth/token/revoke-self" {
  capabilities = ["update"]
}
EOF
    
    # Create Dytallix read-only policy
    vault policy write dytallix-readonly - << EOF
# Dytallix Read-Only Policy
# Read-only access to Dytallix secrets

path "secret/dytallix/*" {
  capabilities = ["read", "list"]
}

path "secret/data/dytallix/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/dytallix/*" {
  capabilities = ["read", "list"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}
EOF
    
    # Create Dytallix service policy (for applications)
    vault policy write dytallix-service - << EOF
# Dytallix Service Policy
# Application access to specific secrets

path "secret/dytallix/\${identity.entity.metadata.environment}/*" {
  capabilities = ["read"]
}

path "secret/data/dytallix/\${identity.entity.metadata.environment}/*" {
  capabilities = ["read"]
}

path "auth/token/lookup-self" {
  capabilities = ["read"]
}

path "auth/token/renew-self" {
  capabilities = ["update"]
}
EOF
    
    log_info "Vault policies configured"
}

setup_secret_engines() {
    log_info "Setting up secret engines..."
    
    # Enable KV v2 secrets engine
    vault secrets enable -version=2 -path=secret kv
    
    # Enable Transit secrets engine for encryption
    vault secrets enable transit
    
    # Create encryption key for PQC keys
    vault write -f transit/keys/dytallix-pqc-keys
    
    # Create encryption key for backups
    vault write -f transit/keys/dytallix-backups
    
    log_info "Secret engines configured"
}

create_sample_secrets() {
    log_info "Creating sample secrets structure..."
    
    # Create sample secrets for each environment
    for env in dev staging prod; do
        vault kv put secret/dytallix/${env}/config \
            environment="$env" \
            log_level="info" \
            debug_mode="false"
            
        vault kv put secret/dytallix/${env}/database \
            host="localhost" \
            port="5432" \
            database="dytallix_${env}" \
            username="dytallix_${env}" \
            password="$(openssl rand -base64 32)"
            
        vault kv put secret/dytallix/${env}/api \
            api_key="$(openssl rand -base64 32)" \
            jwt_secret="$(openssl rand -base64 32)" \
            rate_limit="1000"
    done
    
    log_info "Sample secrets created"
}

create_management_scripts() {
    log_info "Creating management scripts..."
    
    # Create unseal script
    cat > "$VAULT_CONFIG_DIR/unseal.sh" << EOF
#!/bin/bash
# Vault Unseal Script

VAULT_CONFIG_DIR="$VAULT_CONFIG_DIR"
VAULT_ADDR="$VAULT_ADDR"

export VAULT_ADDR

# Read unseal keys
UNSEAL_KEYS=\$(sudo cat "\$VAULT_CONFIG_DIR/unseal_keys.json" | jq -r '.unseal_keys_b64[]')

# Unseal with first 3 keys
echo "\$UNSEAL_KEYS" | head -3 | while read -r key; do
    vault operator unseal "\$key"
done

echo "Vault unsealed"
EOF
    
    # Create backup script
    cat > "$VAULT_CONFIG_DIR/backup.sh" << EOF
#!/bin/bash
# Vault Backup Script

VAULT_CONFIG_DIR="$VAULT_CONFIG_DIR"
VAULT_ADDR="$VAULT_ADDR"
BACKUP_DIR="/opt/vault/backups"

export VAULT_ADDR
export VAULT_TOKEN=\$(sudo cat "\$VAULT_CONFIG_DIR/root_token")

# Create backup directory
mkdir -p "\$BACKUP_DIR"

# Create snapshot
vault operator raft snapshot save "\$BACKUP_DIR/vault_snapshot_\$(date +%Y%m%d_%H%M%S).snap"

echo "Vault backup completed"
EOF
    
    # Make scripts executable
    chmod +x "$VAULT_CONFIG_DIR/unseal.sh"
    chmod +x "$VAULT_CONFIG_DIR/backup.sh"
    
    log_info "Management scripts created"
}

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dev)
                SETUP_DEV_MODE=true
                shift
                ;;
            --production)
                SETUP_PRODUCTION=true
                shift
                ;;
            --vault-addr)
                VAULT_ADDR="$2"
                shift 2
                ;;
            --data-dir)
                VAULT_DATA_DIR="$2"
                shift 2
                ;;
            --config-dir)
                VAULT_CONFIG_DIR="$2"
                shift 2
                ;;
            --auto-unseal)
                ENABLE_AUTO_UNSEAL=true
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
    
    # Validate options
    if [[ "$SETUP_DEV_MODE" == true && "$SETUP_PRODUCTION" == true ]]; then
        log_error "Cannot setup both dev and production modes"
        exit 1
    fi
    
    if [[ "$SETUP_DEV_MODE" == false && "$SETUP_PRODUCTION" == false ]]; then
        log_error "Must specify either --dev or --production"
        exit 1
    fi
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        exit 1
    fi
    
    export VAULT_ADDR
    
    log_info "Starting Vault setup..."
    
    check_dependencies
    install_vault
    create_vault_config
    create_systemd_service
    initialize_vault
    configure_vault_policies
    setup_secret_engines
    create_sample_secrets
    create_management_scripts
    
    log_info "Vault setup completed successfully!"
    log_info "Vault address: $VAULT_ADDR"
    log_info "Root token: $VAULT_TOKEN"
    log_warn "Store the root token and unseal keys securely!"
    
    if [[ "$SETUP_PRODUCTION" == true ]]; then
        log_warn "Production setup completed - ensure TLS certificates are properly configured"
        log_warn "Consider enabling auto-unseal for production environments"
    fi
}

# Run main function
main "$@"
