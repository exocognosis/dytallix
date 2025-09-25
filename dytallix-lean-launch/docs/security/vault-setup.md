# Vault Setup for Dytallix Secret Management

This document describes how to set up HashiCorp Vault for secure validator key management in production environments.

## Overview

Dytallix uses HashiCorp Vault for:
- Validator private key storage and retrieval
- PQC signing key management
- Operational secrets (API keys, database credentials)
- Key rotation and backup procedures

## Development Setup

### 1. Install Vault

**macOS**:
```bash
brew install vault
```

**Ubuntu/Debian**:
```bash
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install vault
```

### 2. Start Development Server

```bash
# Start dev server (DO NOT use in production)
vault server -dev -dev-root-token-id="dev-token-123"

# In another terminal, export dev token
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN="dev-token-123"
```

### 3. Create Validator Keys

```bash
# Create a test validator key
vault kv put secret/validators/validator1 \
  private_key="ed25519:5K8...example...key" \
  public_key="ed25519:A1B...example...pubkey" \
  address="dytallix1validator1234567890abcdef" \
  created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Verify key was stored
vault kv get secret/validators/validator1
```

### 4. Apply Security Policy

```bash
# Apply the validator key access policy
vault policy write validator-readonly - <<EOF
path "secret/data/validators/*" {
  capabilities = ["read"]
}
EOF

# Create token with limited permissions
vault token create -policy=validator-readonly
```

## Production Setup

### 1. Initialize Vault Cluster

```bash
# Initialize Vault (save unseal keys securely!)
vault operator init -key-shares=5 -key-threshold=3

# Unseal Vault with 3 of 5 keys
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>
```

### 2. Configure TLS

```bash
# Generate TLS certificates
vault write pki/root/generate/internal \
    common_name="vault.dytallix.internal" \
    ttl=8760h

# Configure HTTPS listener in vault.hcl
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/etc/vault/tls/vault.crt"
  tls_key_file  = "/etc/vault/tls/vault.key"
}
```

### 3. Enable Audit Logging

```bash
vault audit enable file file_path=/var/log/vault/audit.log
```

### 4. Configure Authentication

```bash
# Enable AppRole authentication for services
vault auth enable approle

# Create role for dytallix services
vault write auth/approle/role/dytallix-node \
    token_policies="validator-readonly" \
    token_ttl=1h \
    token_max_ttl=4h
```

## Key Management Procedures

### Storing Validator Keys

```bash
# Store validator private key (in production, pipe from secure source)
vault kv put secret/validators/validator1 \
  private_key="$(cat /secure/validator1.key)" \
  public_key="$(cat /secure/validator1.pub)" \
  address="$(dcli keys show validator1 -a)" \
  algorithm="dilithium5" \
  created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  rotation_schedule="quarterly"
```

### Key Rotation

```bash
# Generate new keypair
dcli keys add validator1-new --algo pqc

# Store new key with version
vault kv put secret/validators/validator1 \
  private_key="$(dcli keys export validator1-new --unsafe --unarmored-hex)" \
  public_key="$(dcli keys show validator1-new -p)" \
  version="2" \
  rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  previous_version="1"

# Update validator on-chain
dcli tx staking edit-validator \
  --pubkey="$(dcli keys show validator1-new -p)" \
  --from=validator1-new
```

### Backup and Recovery

```bash
# Create encrypted backup
vault operator raft snapshot save vault-backup-$(date +%Y%m%d).snap

# Encrypt backup (use organization's encryption standards)
gpg --encrypt --recipient ops@dytallix.com vault-backup-*.snap

# Store in secure offsite location
aws s3 cp vault-backup-*.snap.gpg s3://dytallix-vault-backups/
```

## Integration with Dytallix Node

### Environment Configuration

```bash
# Production environment variables
export VAULT_ADDR="https://vault.dytallix.internal:8200"
export VAULT_ROLE_ID="<app-role-id>"
export VAULT_SECRET_ID="<app-secret-id>"  # Injected by k8s/systemd
export VALIDATOR_KEY_PATH="secret/validators/validator1"
```

### Node Startup Integration

The `ops/start-node.sh` script automatically:
1. Authenticates with Vault using AppRole
2. Retrieves validator private key
3. Computes and logs key fingerprint (no private material)
4. Initializes node keystore
5. Starts validator with proper signing key

### Monitoring and Alerting

```bash
# Monitor Vault health
curl -s https://vault.dytallix.internal:8200/v1/sys/health

# Monitor key access (audit logs)
tail -f /var/log/vault/audit.log | jq '.request.path' | grep validators

# Set up alerts for:
# - Vault seal status
# - Failed authentication attempts  
# - Key access outside business hours
# - Backup failures
```

## Security Considerations

### Access Control
- Use principle of least privilege
- Rotate tokens regularly (max 4 hour TTL)
- Monitor all key access via audit logs
- Implement break-glass procedures for emergencies

### Network Security
- Run Vault on private network segments
- Use mutual TLS for all communications
- Implement IP allow-listing for client access
- Deploy behind load balancer with DDoS protection

### Physical Security
- Store unseal keys in separate hardware security modules
- Require multiple personnel for unseal operations
- Implement tamper-evident seals on Vault infrastructure
- Regular security audits and penetration testing

### Disaster Recovery
- Test backup restoration procedures monthly
- Maintain hot standby Vault cluster in different region
- Document emergency key recovery procedures
- Train operations team on incident response

## Compliance and Auditing

### Audit Trail
All Vault operations are logged including:
- Authentication attempts (success/failure)
- Secret access (read/write/delete)
- Policy changes and administrative actions
- Token creation and revocation

### Compliance Features
- **SOC 2**: Audit logging and access controls
- **PCI DSS**: Encryption at rest and in transit
- **GDPR**: Data retention and deletion capabilities
- **FIPS 140-2**: Hardware security module integration

### Regular Audits
- Monthly access review (who has access to what)
- Quarterly policy review and updates
- Annual penetration testing
- Continuous compliance monitoring

## Troubleshooting

### Common Issues

**Vault Sealed**:
```bash
vault status
# If sealed, unseal with threshold keys
vault operator unseal
```

**Token Expired**:
```bash
# Renew token
vault token renew

# Or authenticate with AppRole again
vault write auth/approle/login role_id=$VAULT_ROLE_ID secret_id=$VAULT_SECRET_ID
```

**Network Connectivity**:
```bash
# Test connectivity
curl -k https://vault.dytallix.internal:8200/v1/sys/health

# Check DNS resolution
nslookup vault.dytallix.internal
```

### Emergency Procedures

**Lost Unseal Keys**: 
1. Generate new root key using recovery key shares
2. Re-key Vault with new unseal keys
3. Update operational procedures

**Compromised Validator Key**:
1. Immediately revoke access to compromised key
2. Generate new validator keypair
3. Update on-chain validator information
4. Rotate all potentially affected secrets

**Vault Cluster Failure**:
1. Activate disaster recovery procedures
2. Restore from encrypted backups
3. Re-initialize cluster if necessary
4. Verify all validator operations resume normally

For additional support, consult the [HashiCorp Vault documentation](https://www.vaultproject.io/docs) or contact the Dytallix operations team.