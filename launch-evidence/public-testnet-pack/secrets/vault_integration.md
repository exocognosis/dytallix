# Vault Integration for Dytallix

## Overview

This document outlines the HashiCorp Vault integration for secure secret management in the Dytallix blockchain infrastructure.

## Architecture

### Vault Deployment

The Vault deployment consists of:
- **Primary Vault Cluster**: High-availability setup with 3 nodes
- **Secondary Vault Cluster**: Disaster recovery and backup
- **Vault Agent**: Client-side secret injection and caching
- **Consul Backend**: Secure, distributed storage backend

### Secret Organization

```
vault/
├── dytallix/
│   ├── prod/
│   │   ├── database/          # Database credentials
│   │   ├── api-keys/          # External service API keys
│   │   ├── certificates/      # TLS certificates and keys
│   │   └── signing-keys/      # Blockchain signing keys
│   ├── staging/
│   │   └── [similar structure]
│   ├── dev/
│   │   └── [similar structure]
│   └── shared/
│       ├── monitoring/        # Monitoring credentials
│       └── infrastructure/    # Infrastructure secrets
```

## Secret Categories

### 1. Blockchain Signing Keys

**Path**: `vault/dytallix/{env}/signing-keys/`

- **Validator Keys**: Private keys for block validation
- **Node Keys**: P2P network identity keys  
- **Consensus Keys**: Tendermint consensus participation
- **Bridge Keys**: Cross-chain bridge operator keys

**Security**: HSM-backed, auto-rotation, audit logging

### 2. Database Credentials

**Path**: `vault/dytallix/{env}/database/`

- **Primary DB**: PostgreSQL credentials with read/write access
- **Replica DB**: Read-only replica credentials
- **Backup DB**: Backup and archival access
- **Analytics DB**: Metrics and analytics database

**Features**: Dynamic credentials, automatic rotation, connection pooling

### 3. External API Keys

**Path**: `vault/dytallix/{env}/api-keys/`

- **Cosmos RPC**: External Cosmos network access
- **Ethereum Bridge**: Ethereum node and Infura keys
- **Monitoring**: Prometheus, Grafana, AlertManager
- **Cloud Providers**: AWS, GCP, Azure service accounts

**Management**: Centralized key rotation, usage tracking, rate limiting

### 4. TLS Certificates

**Path**: `vault/dytallix/{env}/certificates/`

- **API Gateway**: Public-facing API TLS certificates
- **Internal Services**: Service-to-service communication
- **Client Certificates**: mTLS authentication
- **CA Certificates**: Certificate authority chains

**Features**: Automatic renewal, OCSP stapling, certificate transparency

## Access Control Policies

### Role-Based Access

```hcl
# Developer role - read-only access to dev secrets
path "dytallix/dev/*" {
  capabilities = ["read", "list"]
}

# Operator role - full access to staging and limited prod
path "dytallix/staging/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "dytallix/prod/monitoring/*" {
  capabilities = ["read", "list"]
}

# Admin role - full access with audit requirements
path "dytallix/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
  required_parameters = ["audit_reason"]
}
```

### Service Account Policies

```hcl
# Blockchain node service account
path "dytallix/{{identity.entity.aliases.approle.metadata.environment}}/signing-keys/validator" {
  capabilities = ["read"]
}

path "dytallix/{{identity.entity.aliases.approle.metadata.environment}}/database/primary" {
  capabilities = ["read"]
}

# Monitoring service account
path "dytallix/shared/monitoring/*" {
  capabilities = ["read", "list"]
}
```

## Secret Rotation Policies

### Automatic Rotation

- **Database Credentials**: Every 24 hours
- **API Keys**: Every 7 days (where supported)
- **TLS Certificates**: 30 days before expiration
- **Service Tokens**: Every 12 hours

### Manual Rotation Triggers

- **Security Incident**: Immediate rotation of all potentially compromised secrets
- **Personnel Changes**: Rotation of admin-level secrets within 2 hours
- **Compliance Requirements**: Quarterly rotation of high-privilege keys
- **Maintenance Windows**: Planned rotation during low-traffic periods

## Integration Methods

### Vault Agent

```yaml
# vault-agent.hcl
vault {
  address = "https://vault.dytallix.internal:8200"
  retry {
    num_retries = 5
  }
}

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path = "/etc/vault/role-id"
      secret_id_file_path = "/etc/vault/secret-id"
    }
  }
}

template {
  source      = "/etc/templates/database.tpl"
  destination = "/etc/dytallix/database.conf"
  perms       = 0600
  command     = "systemctl reload dytallix-node"
}
```

### Kubernetes Integration

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dytallix-node
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "dytallix-node"
    vault.hashicorp.com/agent-inject-secret-database: "dytallix/prod/database/primary"
    vault.hashicorp.com/agent-inject-template-database: |
      {{- with secret "dytallix/prod/database/primary" -}}
      DATABASE_URL="postgresql://{{ .Data.username }}:{{ .Data.password }}@{{ .Data.host }}:{{ .Data.port }}/{{ .Data.database }}"
      {{- end }}
```

### Direct API Integration

```rust
// Rust integration example
use serde_json::Value;
use reqwest::Client;

pub struct VaultClient {
    base_url: String,
    token: String,
    client: Client,
}

impl VaultClient {
    pub async fn get_secret(&self, path: &str) -> Result<Value, Box<dyn std::error::Error>> {
        let url = format!("{}/v1/{}", self.base_url, path);
        let response = self.client
            .get(&url)
            .header("X-Vault-Token", &self.token)
            .send()
            .await?;
        
        let secret: Value = response.json().await?;
        Ok(secret["data"].clone())
    }
}
```

## Security Features

### Encryption

- **Transit Secrets Engine**: Application-level encryption/decryption
- **Key Management**: Centralized cryptographic key lifecycle
- **Seal/Unseal**: Shamir's Secret Sharing for Vault initialization
- **Auto-Unseal**: Cloud HSM or external key management integration

### Audit and Compliance

- **Comprehensive Logging**: All secret access logged with user/service identification
- **Audit Trail**: Immutable record of all Vault operations
- **Compliance Reports**: SOC 2, PCI DSS, GDPR compliance reporting
- **Access Reviews**: Regular audit of permissions and access patterns

### High Availability

- **Multi-Region Setup**: Vault clusters in multiple geographic regions
- **Backup Strategy**: Encrypted, regularly tested backup procedures
- **Failover**: Automatic failover with minimal downtime
- **Performance Standbys**: Read replicas for improved performance

## Monitoring and Alerting

### Key Metrics

- **Secret Access Frequency**: Unusual access pattern detection
- **Rotation Success Rate**: Failed rotation alerting
- **Vault Health**: Cluster status and performance monitoring
- **Certificate Expiration**: Proactive renewal alerting

### Alert Conditions

```yaml
alerts:
  - name: "vault_seal_status"
    condition: "vault_up == 0"
    severity: "critical"
    description: "Vault cluster is sealed or unavailable"
    
  - name: "certificate_expiring"
    condition: "cert_expiry_days < 7"
    severity: "warning"
    description: "TLS certificate expiring within 7 days"
    
  - name: "secret_rotation_failed"
    condition: "rotation_failures > 0"
    severity: "high"
    description: "Secret rotation failed, manual intervention required"
```

## Disaster Recovery

### Backup Procedures

1. **Automated Snapshots**: Daily encrypted snapshots of Vault data
2. **Cross-Region Replication**: Real-time replication to secondary regions
3. **Backup Testing**: Monthly restore testing procedures
4. **Recovery Procedures**: Documented step-by-step recovery processes

### Emergency Procedures

1. **Vault Compromise**: Immediate seal, forensic analysis, re-key
2. **Key Loss**: Emergency recovery using master key shares
3. **Regional Outage**: Failover to secondary region
4. **Data Corruption**: Restore from verified backup snapshot

## Development Workflow

### Local Development

```bash
# Start local Vault in dev mode
vault server -dev -dev-root-token-id="dev-token"

# Configure local secrets
vault kv put dytallix/dev/database/primary \
    host="localhost" \
    port="5432" \
    database="dytallix_dev" \
    username="dev_user" \
    password="dev_password"
```

### Testing Integration

```bash
# Vault smoke test script
./scripts/vault_smoke.sh

# Test secret retrieval
vault kv get dytallix/dev/database/primary

# Test policy enforcement
vault policy test dytallix-dev-policy user=developer
```

## Compliance and Security

### Regulatory Compliance

- **SOC 2 Type II**: Annual compliance audit and certification
- **PCI DSS**: Payment card industry data security standards
- **GDPR**: European privacy regulation compliance
- **SOX**: Sarbanes-Oxley financial reporting requirements

### Security Best Practices

- **Principle of Least Privilege**: Minimal necessary access grants
- **Defense in Depth**: Multiple security layers and controls
- **Regular Security Reviews**: Quarterly access and policy reviews
- **Incident Response**: Documented security incident procedures

This Vault integration provides enterprise-grade secret management with security, compliance, and operational excellence for the Dytallix blockchain infrastructure.