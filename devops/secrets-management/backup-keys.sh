#!/bin/bash

# Dytallix PQC Key Backup and Rotation Script
# This script handles backup and rotation of PQC keys with proper versioning

set -euo pipefail

# Configuration
KEYS_DIR="./keys"
BACKUP_DIR="./backups"
VAULT_URL=""
VAULT_TOKEN=""
ENVIRONMENT="dev"
ROTATION_INTERVAL_HOURS=720  # 30 days default
BACKUP_RETENTION_DAYS=90
DRY_RUN=false
FORCE_ROTATION=false
ENCRYPTION_KEY=""
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
    echo "  backup                  Create backup of current keys"
    echo "  rotate                  Rotate PQC keys"
    echo "  restore                 Restore keys from backup"
    echo "  cleanup                 Clean up old backups"
    echo "  verify                  Verify backup integrity"
    echo "  schedule                Set up automatic rotation"
    echo ""
    echo "Options:"
    echo "  --env ENV               Environment (dev/staging/prod) [default: dev]"
    echo "  --keys-dir DIR          Keys directory [default: ./keys]"
    echo "  --backup-dir DIR        Backup directory [default: ./backups]"
    echo "  --vault-url URL         Vault server URL"
    echo "  --vault-token TOKEN     Vault access token"
    echo "  --rotation-interval H   Rotation interval in hours [default: 720]"
    echo "  --retention-days D      Backup retention in days [default: 90]"
    echo "  --encryption-key KEY    Encryption key for backups"
    echo "  --dry-run               Show what would be done without executing"
    echo "  --force                 Force rotation even if not due"
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
    
    for tool in openssl jq date; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is required but not installed"
            exit 1
        fi
    done
}

create_backup_directory() {
    log_info "Creating backup directory structure..."
    
    local backup_date=$(date +%Y%m%d)
    local backup_path="$BACKUP_DIR/$ENVIRONMENT/$backup_date"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "DRY RUN: Would create directory: $backup_path"
        return
    fi
    
    mkdir -p "$backup_path"
    chmod 700 "$backup_path"
    
    echo "$backup_path"
}

generate_backup_metadata() {
    local backup_path="$1"
    local metadata_file="$backup_path/metadata.json"
    
    log_info "Generating backup metadata..."
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "DRY RUN: Would create metadata file: $metadata_file"
        return
    fi
    
    cat > "$metadata_file" << EOF
{
    "backup_id": "$(uuidgen)",
    "environment": "$ENVIRONMENT",
    "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "created_by": "$(whoami)",
    "hostname": "$(hostname)",
    "version": "1.0",
    "rotation_interval_hours": $ROTATION_INTERVAL_HOURS,
    "retention_days": $BACKUP_RETENTION_DAYS,
    "files": {
        "keys": [],
        "checksums": []
    }
}
EOF
}

backup_keys() {
    local backup_path="$1"
    local keys_file="$KEYS_DIR/pqc_keys_${ENVIRONMENT}.json"
    local encrypted_keys_file="$KEYS_DIR/pqc_keys_${ENVIRONMENT}.json.enc"
    local env_file="$KEYS_DIR/.env.${ENVIRONMENT}"
    
    log_info "Backing up PQC keys..."
    
    # Backup encrypted keys if available
    if [[ -f "$encrypted_keys_file" ]]; then
        local backup_keys_file="$backup_path/pqc_keys_${ENVIRONMENT}.json.enc"
        
        if [[ "$DRY_RUN" == true ]]; then
            echo "DRY RUN: Would backup encrypted keys: $encrypted_keys_file -> $backup_keys_file"
        else
            cp "$encrypted_keys_file" "$backup_keys_file"
            chmod 600 "$backup_keys_file"
        fi
    fi
    
    # Backup unencrypted keys if available
    if [[ -f "$keys_file" ]]; then
        local backup_keys_file="$backup_path/pqc_keys_${ENVIRONMENT}.json"
        
        if [[ "$DRY_RUN" == true ]]; then
            echo "DRY RUN: Would backup unencrypted keys: $keys_file -> $backup_keys_file"
        else
            cp "$keys_file" "$backup_keys_file"
            chmod 600 "$backup_keys_file"
        fi
    fi
    
    # Backup environment file
    if [[ -f "$env_file" ]]; then
        local backup_env_file="$backup_path/.env.${ENVIRONMENT}"
        
        if [[ "$DRY_RUN" == true ]]; then
            echo "DRY RUN: Would backup environment file: $env_file -> $backup_env_file"
        else
            cp "$env_file" "$backup_env_file"
            chmod 600 "$backup_env_file"
        fi
    fi
    
    # Generate checksums
    if [[ "$DRY_RUN" != true ]]; then
        log_info "Generating checksums..."
        cd "$backup_path"
        find . -type f -name "*.json*" -o -name ".env.*" | while read -r file; do
            sha256sum "$file" >> checksums.txt
        done
        cd - > /dev/null
    fi
}

encrypt_backup() {
    local backup_path="$1"
    
    if [[ -z "$ENCRYPTION_KEY" ]]; then
        log_warn "No encryption key provided - backup will not be encrypted"
        return
    fi
    
    log_info "Encrypting backup..."
    
    local archive_file="$backup_path.tar.gz"
    local encrypted_file="$backup_path.tar.gz.enc"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "DRY RUN: Would create encrypted backup: $encrypted_file"
        return
    fi
    
    # Create tarball
    cd "$(dirname "$backup_path")"
    tar -czf "$archive_file" "$(basename "$backup_path")"
    
    # Encrypt the tarball
    openssl enc -aes-256-cbc -salt -in "$archive_file" -out "$encrypted_file" -pass pass:"$ENCRYPTION_KEY" -pbkdf2 -iter 100000
    
    # Remove unencrypted files
    rm -rf "$backup_path" "$archive_file"
    
    cd - > /dev/null
    
    log_info "Backup encrypted: $encrypted_file"
}

backup_to_vault() {
    local backup_path="$1"
    
    if [[ -z "$VAULT_URL" || -z "$VAULT_TOKEN" ]]; then
        log_info "Vault not configured - skipping Vault backup"
        return
    fi
    
    log_info "Backing up to Vault..."
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "DRY RUN: Would backup to Vault: $VAULT_URL"
        return
    fi
    
    export VAULT_ADDR="$VAULT_URL"
    export VAULT_TOKEN="$VAULT_TOKEN"
    
    # Check Vault connection
    if ! vault status &> /dev/null; then
        log_error "Cannot connect to Vault"
        return 1
    fi
    
    local vault_path="secret/dytallix/backups/${ENVIRONMENT}/$(date +%Y%m%d_%H%M%S)"
    
    # Create tarball and encode
    local temp_archive="/tmp/dytallix_backup_$(date +%s).tar.gz"
    cd "$(dirname "$backup_path")"
    tar -czf "$temp_archive" "$(basename "$backup_path")"
    local encoded_backup=$(base64 -i "$temp_archive")
    cd - > /dev/null
    
    # Store in Vault
    vault kv put "$vault_path" \
        backup_data="$encoded_backup" \
        environment="$ENVIRONMENT" \
        created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        backup_type="keys"
    
    # Clean up
    rm -f "$temp_archive"
    
    log_info "Backup stored in Vault: $vault_path"
}

check_rotation_needed() {
    local keys_file="$KEYS_DIR/pqc_keys_${ENVIRONMENT}.json"
    local encrypted_keys_file="$KEYS_DIR/pqc_keys_${ENVIRONMENT}.json.enc"
    local env_file="$KEYS_DIR/.env.${ENVIRONMENT}"
    
    # Check if force rotation is requested
    if [[ "$FORCE_ROTATION" == true ]]; then
        log_info "Force rotation requested"
        return 0
    fi
    
    # Check if keys exist
    if [[ ! -f "$keys_file" && ! -f "$encrypted_keys_file" ]]; then
        log_info "No keys found - rotation needed"
        return 0
    fi
    
    # Check key age
    local key_file="$encrypted_keys_file"
    if [[ ! -f "$key_file" ]]; then
        key_file="$keys_file"
    fi
    
    local key_age_hours=$(( ($(date +%s) - $(stat -c %Y "$key_file")) / 3600 ))
    
    if [[ $key_age_hours -gt $ROTATION_INTERVAL_HOURS ]]; then
        log_info "Keys are $key_age_hours hours old (rotation interval: $ROTATION_INTERVAL_HOURS hours)"
        return 0
    fi
    
    log_info "Keys are $key_age_hours hours old - rotation not needed"
    return 1
}

rotate_keys() {
    log_info "Rotating PQC keys for environment: $ENVIRONMENT"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "DRY RUN: Would rotate keys for environment: $ENVIRONMENT"
        return
    fi
    
    # Create backup before rotation
    backup_keys_command
    
    # Generate new keys
    cd "$(dirname "$0")"
    ./generate-keys.sh --env "$ENVIRONMENT" --force
    cd - > /dev/null
    
    log_info "Key rotation completed"
}

restore_keys() {
    local backup_id="$1"
    
    if [[ -z "$backup_id" ]]; then
        log_error "Backup ID required for restore"
        return 1
    fi
    
    log_info "Restoring keys from backup: $backup_id"
    
    # Find backup
    local backup_path=$(find "$BACKUP_DIR/$ENVIRONMENT" -name "*$backup_id*" -type d | head -1)
    
    if [[ -z "$backup_path" ]]; then
        log_error "Backup not found: $backup_id"
        return 1
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "DRY RUN: Would restore from: $backup_path"
        return
    fi
    
    # Verify checksums
    if [[ -f "$backup_path/checksums.txt" ]]; then
        cd "$backup_path"
        if ! sha256sum -c checksums.txt; then
            log_error "Checksum verification failed"
            return 1
        fi
        cd - > /dev/null
        log_info "Checksum verification passed"
    fi
    
    # Restore files
    cp "$backup_path"/pqc_keys_*.json* "$KEYS_DIR/"
    cp "$backup_path"/.env.* "$KEYS_DIR/"
    
    log_info "Keys restored from backup: $backup_id"
}

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    local cutoff_date=$(date -d "$BACKUP_RETENTION_DAYS days ago" +%Y%m%d)
    
    find "$BACKUP_DIR/$ENVIRONMENT" -type d -name "????????" | while read -r backup_dir; do
        local backup_date=$(basename "$backup_dir")
        
        if [[ "$backup_date" < "$cutoff_date" ]]; then
            if [[ "$DRY_RUN" == true ]]; then
                echo "DRY RUN: Would delete old backup: $backup_dir"
            else
                log_info "Deleting old backup: $backup_dir"
                rm -rf "$backup_dir"
            fi
        fi
    done
}

verify_backup() {
    local backup_path="$1"
    
    if [[ -z "$backup_path" ]]; then
        log_error "Backup path required for verification"
        return 1
    fi
    
    log_info "Verifying backup: $backup_path"
    
    # Check if backup exists
    if [[ ! -d "$backup_path" ]]; then
        log_error "Backup directory not found: $backup_path"
        return 1
    fi
    
    # Check checksums
    if [[ -f "$backup_path/checksums.txt" ]]; then
        cd "$backup_path"
        if sha256sum -c checksums.txt; then
            log_info "Backup verification passed"
            return 0
        else
            log_error "Backup verification failed"
            return 1
        fi
        cd - > /dev/null
    else
        log_warn "No checksums file found - cannot verify integrity"
        return 1
    fi
}

setup_cron_job() {
    log_info "Setting up automatic key rotation..."
    
    local cron_entry="0 2 * * 0 $(realpath "$0") rotate --env $ENVIRONMENT"
    
    if [[ "$DRY_RUN" == true ]]; then
        echo "DRY RUN: Would add cron entry: $cron_entry"
        return
    fi
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    
    log_info "Cron job added for weekly key rotation"
}

backup_keys_command() {
    log_info "Creating backup for environment: $ENVIRONMENT"
    
    local backup_path=$(create_backup_directory)
    generate_backup_metadata "$backup_path"
    backup_keys "$backup_path"
    encrypt_backup "$backup_path"
    backup_to_vault "$backup_path"
    
    log_info "Backup completed successfully"
}

main() {
    local command=""
    local backup_id=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            backup|rotate|restore|cleanup|verify|schedule)
                command="$1"
                shift
                ;;
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --keys-dir)
                KEYS_DIR="$2"
                shift 2
                ;;
            --backup-dir)
                BACKUP_DIR="$2"
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
            --rotation-interval)
                ROTATION_INTERVAL_HOURS="$2"
                shift 2
                ;;
            --retention-days)
                BACKUP_RETENTION_DAYS="$2"
                shift 2
                ;;
            --encryption-key)
                ENCRYPTION_KEY="$2"
                shift 2
                ;;
            --backup-id)
                backup_id="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE_ROTATION=true
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
        log_error "Invalid environment: $ENVIRONMENT"
        exit 1
    fi
    
    log_info "PQC key backup/rotation for environment: $ENVIRONMENT"
    
    check_dependencies
    
    case "$command" in
        backup)
            backup_keys_command
            ;;
        rotate)
            if check_rotation_needed; then
                rotate_keys
            else
                log_info "Key rotation not needed"
            fi
            ;;
        restore)
            if [[ -z "$backup_id" ]]; then
                log_error "Backup ID required for restore (use --backup-id)"
                exit 1
            fi
            restore_keys "$backup_id"
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        verify)
            if [[ -z "$backup_id" ]]; then
                log_error "Backup path required for verification"
                exit 1
            fi
            verify_backup "$backup_id"
            ;;
        schedule)
            setup_cron_job
            ;;
        *)
            log_error "Unknown command: $command"
            exit 1
            ;;
    esac
    
    log_info "Operation completed successfully"
}

# Run main function
main "$@"
