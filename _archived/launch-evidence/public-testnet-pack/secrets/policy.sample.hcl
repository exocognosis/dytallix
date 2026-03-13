# HashiCorp Vault Policy Configuration Sample
# This file contains sample policies for Dytallix blockchain infrastructure

# Developer Policy - Read-only access to development secrets
path "dytallix/data/dev/*" {
  capabilities = ["read", "list"]
}

# Allow developers to read shared monitoring credentials
path "dytallix/data/shared/monitoring/read-only/*" {
  capabilities = ["read"]
}

# Operator Policy - Full access to staging, limited production access
path "dytallix/data/staging/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Operators can read production monitoring and database credentials
path "dytallix/data/prod/monitoring/*" {
  capabilities = ["read", "list"]
}

path "dytallix/data/prod/database/replica/*" {
  capabilities = ["read"]
}

# Administrator Policy - Full access with audit requirements
path "dytallix/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
  required_parameters = ["audit_reason"]
}

# Allow admins to manage policies and auth methods
path "sys/policies/acl/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Service Account Policies

# Blockchain Node Service Policy
path "dytallix/data/{{identity.entity.aliases.approle.metadata.environment}}/signing-keys/validator" {
  capabilities = ["read"]
}

path "dytallix/data/{{identity.entity.aliases.approle.metadata.environment}}/database/primary" {
  capabilities = ["read"]
}

path "dytallix/data/{{identity.entity.aliases.approle.metadata.environment}}/certificates/node-tls" {
  capabilities = ["read"]
}

# API Gateway Service Policy
path "dytallix/data/{{identity.entity.aliases.approle.metadata.environment}}/certificates/api-gateway" {
  capabilities = ["read"]
}

path "dytallix/data/{{identity.entity.aliases.approle.metadata.environment}}/api-keys/external/*" {
  capabilities = ["read"]
}

# Monitoring Service Policy
path "dytallix/data/shared/monitoring/*" {
  capabilities = ["read", "list"]
}

path "dytallix/data/+/monitoring/*" {
  capabilities = ["read", "list"]
}

# Bridge Operator Service Policy
path "dytallix/data/{{identity.entity.aliases.approle.metadata.environment}}/signing-keys/bridge/*" {
  capabilities = ["read"]
}

path "dytallix/data/{{identity.entity.aliases.approle.metadata.environment}}/api-keys/ethereum/*" {
  capabilities = ["read"]
}

path "dytallix/data/{{identity.entity.aliases.approle.metadata.environment}}/api-keys/cosmos/*" {
  capabilities = ["read"]
}

# Backup Service Policy
path "dytallix/data/+/database/backup" {
  capabilities = ["read"]
}

path "dytallix/data/shared/backup/*" {
  capabilities = ["read", "list"]
}

# Transit Engine Policies for Application-Level Encryption

# Allow nodes to encrypt/decrypt sensitive data
path "transit/encrypt/dytallix-node-{{identity.entity.aliases.approle.metadata.environment}}" {
  capabilities = ["update"]
}

path "transit/decrypt/dytallix-node-{{identity.entity.aliases.approle.metadata.environment}}" {
  capabilities = ["update"]
}

# Database Dynamic Secrets Configuration

# Database secret engine configuration
path "database/config/dytallix-primary" {
  capabilities = ["create", "read", "update", "delete"]
  allowed_parameters = {
    "plugin_name" = ["postgresql-database-plugin"]
    "connection_url" = ["postgresql://{{username}}:{{password}}@postgres.dytallix.internal:5432/dytallix?sslmode=require"]
    "allowed_roles" = ["dytallix-node", "dytallix-readonly", "dytallix-admin"]
  }
}

# Database role definitions
path "database/roles/dytallix-node" {
  capabilities = ["create", "read", "update", "delete"]
  allowed_parameters = {
    "db_name" = ["dytallix-primary"]
    "creation_statements" = ["CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' IN ROLE \"dytallix_app\";"]
    "default_ttl" = ["24h"]
    "max_ttl" = ["72h"]
  }
}

path "database/roles/dytallix-readonly" {
  capabilities = ["create", "read", "update", "delete"]
  allowed_parameters = {
    "db_name" = ["dytallix-primary"]
    "creation_statements" = ["CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}' IN ROLE \"dytallix_readonly\";"]
    "default_ttl" = ["12h"]
    "max_ttl" = ["24h"]
  }
}

# PKI Engine Policies for Certificate Management

# Allow certificate issuance for internal services
path "pki_int/issue/dytallix-internal" {
  capabilities = ["create", "update"]
  allowed_parameters = {
    "common_name" = ["*.dytallix.internal", "*.svc.cluster.local"]
    "alt_names" = ["*.dytallix.internal", "*.svc.cluster.local"]
    "ttl" = ["720h"]
  }
}

# Allow certificate issuance for external-facing services
path "pki_int/issue/dytallix-external" {
  capabilities = ["create", "update"]
  allowed_parameters = {
    "common_name" = ["*.dytallix.com", "api.dytallix.com", "explorer.dytallix.com"]
    "alt_names" = ["*.dytallix.com"]
    "ttl" = ["2160h"]
  }
}

# Identity-Based Policies

# Environment-specific access based on entity metadata
path "dytallix/data/{{identity.entity.metadata.environment}}/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Team-specific access
path "dytallix/data/shared/{{identity.entity.metadata.team}}/*" {
  capabilities = ["read", "list"]
}

# Audit and Compliance Policies

# Allow security team to read audit logs
path "sys/audit/*" {
  capabilities = ["read", "list"]
}

# Allow compliance team to generate reports
path "sys/capabilities-self" {
  capabilities = ["update"]
}

path "sys/entity/lookup" {
  capabilities = ["update"]
}

# Emergency Break-Glass Policy
# Only activated during security incidents
path "dytallix/data/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
  required_parameters = ["emergency_ticket", "approver"]
}

path "sys/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
  required_parameters = ["emergency_ticket", "approver"]
}

# Policy Template Variables
# These policies use Vault's templating system for dynamic access control

# Time-based access (business hours only for non-critical operations)
path "dytallix/data/prod/non-critical/*" {
  capabilities = ["read", "list"]
  allowed_parameters = {
    "time_of_day" = ["09:00-17:00"]
    "day_of_week" = ["monday", "tuesday", "wednesday", "thursday", "friday"]
  }
}

# IP-based restrictions for production access
path "dytallix/data/prod/*" {
  capabilities = ["read", "list"]
  bound_cidrs = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

# Multi-factor authentication requirement for sensitive operations
path "dytallix/data/prod/signing-keys/*" {
  capabilities = ["read"]
  required_parameters = ["mfa_totp"]
}

# This policy file demonstrates enterprise-grade access control
# with defense-in-depth, least privilege, and compliance requirements.