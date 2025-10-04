# Vault Integration Setup for Dytallix

This document describes how to integrate HashiCorp Vault with Dytallix for secure key management in production environments.

## Overview

In production, validator signing keys MUST be sourced from Vault, never from local disk. This ensures:
- Keys are encrypted at rest in Vault's storage backend
- Access is controlled via Vault policies
- Key rotation is centralized
- Audit logs capture all key access

## Prerequisites

- HashiCorp Vault installed and unsealed
- Vault address accessible from validator nodes
- AppRole auth method enabled
- KV v2 secrets engine mounted at `secret/`

## Setup Steps

### 1. Enable AppRole Auth

```bash
vault auth enable approle
```

### 2. Create Policy

Store validator key access policy in Vault:

```bash
vault policy write dytallix-validator ops/vault/vault_policy.hcl
```

### 3. Create AppRole

```bash
vault write auth/approle/role/dytallix-validator \
  token_policies="dytallix-validator" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=0
```

### 4. Generate Credentials

```bash
# Get Role ID (can be stored in config)
vault read -field=role_id auth/approle/role/dytallix-validator/role-id

# Generate Secret ID (should be injected securely)
vault write -field=secret_id -f auth/approle/role/dytallix-validator/secret-id
```

### 5. Store Signing Key in Vault

```bash
# Example: store a validator's signing key
vault kv put secret/dytallix/validator/validator01/signing-key \
  private_key="<base64_encoded_key>" \
  public_key="<base64_encoded_pubkey>" \
  algorithm="dilithium3"
```

### 6. Configure Vault Agent

Deploy the Vault Agent configuration to your validator node:

```bash
# Copy configuration
cp ops/vault/agent-config.hcl /etc/dytallix/vault-agent.hcl

# Store credentials
echo "YOUR_ROLE_ID" > /etc/dytallix/vault-role-id
echo "YOUR_SECRET_ID" > /etc/dytallix/vault-secret-id
chmod 600 /etc/dytallix/vault-*

# Create template directory
mkdir -p /etc/dytallix/templates
```

### 7. Create Key Template

Create `/etc/dytallix/templates/signing-key.tmpl`:

```hcl
{{ with secret "secret/data/dytallix/validator/validator01/signing-key" }}
{
  "private_key": "{{ .Data.data.private_key }}",
  "public_key": "{{ .Data.data.public_key }}",
  "algorithm": "{{ .Data.data.algorithm }}"
}
{{ end }}
```

### 8. Start Vault Agent

```bash
vault agent -config=/etc/dytallix/vault-agent.hcl
```

The agent will:
1. Authenticate using AppRole
2. Fetch the signing key from Vault
3. Write it to `/var/run/dytallix/signing-key.json`
4. Keep the token renewed
5. Reload the node when keys change

### 9. Configure Node to Use Vault Keys

Update node configuration to read from `/var/run/dytallix/signing-key.json` instead of disk:

```bash
export DYTALLIX_KEY_SOURCE=vault
export DYTALLIX_KEY_PATH=/var/run/dytallix/signing-key.json
```

The node should:
- Check that the key file exists at startup
- Fail to start if key is missing (never use fallback keys)
- Monitor the file for changes (Vault Agent will update it)
- Never write keys to permanent storage

## Security Checklist

- [ ] Vault is running with TLS enabled
- [ ] Vault storage backend is encrypted
- [ ] AppRole credentials are injected via secret management (not env vars)
- [ ] Key files are in tmpfs (`/var/run`) with 0600 permissions
- [ ] No signing keys exist on permanent disk
- [ ] Vault audit logging is enabled
- [ ] Regular key rotation schedule is defined
- [ ] Backup and recovery procedures are documented

## Production Mode Validation

To verify Vault integration in production:

1. **Check no keys on disk:**
   ```bash
   find /etc /opt /home -name "*priv*key*" -o -name "*signing*key*" 2>/dev/null
   # Should return no results
   ```

2. **Verify key source:**
   ```bash
   ls -la /var/run/dytallix/signing-key.json
   # Should exist with 0600 permissions
   ```

3. **Test key retrieval:**
   ```bash
   vault kv get secret/dytallix/validator/validator01/signing-key
   # Should succeed with valid credentials
   ```

4. **Validate node startup:**
   ```bash
   # Node should start successfully and log Vault key source
   journalctl -u dytallixd -n 50 | grep -i vault
   ```

## Troubleshooting

### Agent Can't Authenticate

```bash
# Check role ID and secret ID
cat /etc/dytallix/vault-role-id
cat /etc/dytallix/vault-secret-id

# Test authentication manually
vault write auth/approle/login \
  role_id="$(cat /etc/dytallix/vault-role-id)" \
  secret_id="$(cat /etc/dytallix/vault-secret-id)"
```

### Key Template Not Rendering

```bash
# Check agent logs
journalctl -u vault-agent -f

# Verify secret exists
vault kv get secret/dytallix/validator/validator01/signing-key

# Check template syntax
vault agent -config=/etc/dytallix/vault-agent.hcl -log-level=debug
```

### Node Can't Read Key

```bash
# Check file exists and has correct permissions
ls -la /var/run/dytallix/signing-key.json

# Check file contents (be careful in production!)
cat /var/run/dytallix/signing-key.json

# Verify node user can read
sudo -u dytallix cat /var/run/dytallix/signing-key.json
```

## References

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Vault AppRole Auth](https://www.vaultproject.io/docs/auth/approle)
- [Vault Agent](https://www.vaultproject.io/docs/agent)
- [Dytallix Security Documentation](../SECURITY.md)
