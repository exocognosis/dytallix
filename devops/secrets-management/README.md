# Dytallix Secrets Management

This directory contains scripts and configurations for securely managing PQC keys and secrets in various deployment environments.

## Contents

- `generate-keys.sh` - Generate new PQC keys and encrypt them
- `vault-setup.sh` - Set up HashiCorp Vault for secret storage
- `env-setup.sh` - Set up environment variables for development
- `docker-secrets.sh` - Docker secrets management
- `k8s-secrets.yaml` - Kubernetes secrets configuration
- `backup-keys.sh` - Backup and rotate PQC keys
- `config/` - Configuration templates
- `examples/` - Example configurations for different environments

## Security Principles

1. **Key Rotation**: Regular rotation of PQC keys with backward compatibility
2. **Encryption at Rest**: All secrets encrypted when stored
3. **Access Control**: Role-based access to secrets
4. **Audit Logging**: All secret access is logged
5. **Secure Transport**: TLS/mTLS for all secret transmission
6. **Environment Separation**: Different keys for dev/staging/prod

## Quick Start

### Development Environment
```bash
# Generate development keys
./generate-keys.sh --env dev

# Set up environment variables
source ./env-setup.sh
```

### Production Environment
```bash
# Set up Vault
./vault-setup.sh

# Generate production keys
./generate-keys.sh --env prod --vault

# Deploy to Kubernetes
kubectl apply -f k8s-secrets.yaml
```

## Environment Variables

The following environment variables are used by Dytallix:

- `DYTALLIX_PQC_KEYS_PATH` - Path to PQC keys file
- `DYTALLIX_KEYS_PASSWORD` - Password for encrypted keys
- `DYTALLIX_VAULT_URL` - Vault server URL
- `DYTALLIX_VAULT_TOKEN` - Vault access token
- `DYTALLIX_KEY_ROTATION_INTERVAL` - Key rotation interval in hours
- `DYTALLIX_BACKUP_ENCRYPTION_KEY` - Key for encrypting backups
