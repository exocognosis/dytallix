# QuantumVault MVP - Security Guide

## Overview

QuantumVault implements defense-in-depth security with multiple layers of protection for sensitive cryptographic assets.

## Authentication & Authorization

### Password Requirements

- Minimum 8 characters
- Hashed with bcrypt (cost factor 12)
- Stored as hash only, never plaintext
- Session tokens expire after 24 hours

### Role-Based Access Control (RBAC)

**ADMIN**
- Full system access
- User management
- Anchor key rotation
- Policy management
- Audit log access

**SECURITY_ENGINEER**
- Asset management
- Scan operations
- Policy creation & evaluation
- Wrapping operations
- Attestation operations

**VIEWER**
- Read-only access to assets
- Read-only access to scans
- Dashboard viewing

### API Authentication

All API endpoints (except login) require JWT bearer token:

```bash
Authorization: Bearer <jwt-token>
```

### Audit Logging

All sensitive operations are logged:
- User login/logout
- Asset modifications
- Key material uploads
- Wrapping operations
- Attestation submissions
- Policy changes
- Anchor rotations

## Secret Management

### HashiCorp Vault

QuantumVault **requires** HashiCorp Vault for secrets storage:

1. **Fail-Fast**: Application refuses to start if Vault is unavailable
2. **Never Logged**: Key material payloads are never logged
3. **Database References Only**: DB stores only Vault paths, not secrets
4. **Access Control**: Vault ACLs restrict service access

### Secrets Stored in Vault

- Asset key material
- PQC anchor private keys
- Wrapped asset ciphertext
- Database credentials (optional)
- API keys for integrations

### Secret Rotation

**Anchor Keys**: 
- Rotation creates new keypair
- Old keys marked inactive but preserved for decryption
- Recommended rotation: every 90 days

**Vault Tokens**:
- Use periodic tokens with auto-renewal
- Root token should be stored securely offline
- Service tokens should have minimal permissions

## Network Security

### TLS/SSL

Production deployments should:
- Use TLS 1.3 for all external connections
- Obtain valid certificates from trusted CA
- Enable HSTS headers
- Disable weak cipher suites

### Firewall Rules

Recommended firewall configuration:

```
# Public (from internet)
80/tcp   -> Frontend (redirect to 443)
443/tcp  -> Frontend (HTTPS)

# Internal only
3000/tcp -> Backend API
5432/tcp -> PostgreSQL
6379/tcp -> Redis
8200/tcp -> Vault
8545/tcp -> Blockchain RPC

# Deny all other inbound
```

### Container Isolation

- All services run in isolated Docker containers
- Network segmentation via Docker networks
- No privileged containers
- Read-only filesystems where possible

## Data Security

### Encryption at Rest

**Database**:
- PostgreSQL supports transparent data encryption
- Enable for production deployments
- Encrypt backups

**Vault Storage**:
- Vault encrypts all data at rest by default
- Use encryption-at-rest for backend storage

### Encryption in Transit

**Within Docker Network**:
- Services communicate over encrypted Docker overlay network
- Vault connections use TLS

**External Connections**:
- API uses HTTPS only
- Database connections use SSL
- Redis can be configured with TLS

### Key Material Handling

**Strict Rules**:
1. Never log key material payloads
2. Maximum upload size: 10MB
3. Streamed upload (no temp files)
4. Immediate encryption upon receipt
5. Store only in Vault, never DB
6. Access logged in audit trail

## PQC Security

### Algorithm Selection

**KEM**: Kyber1024
- Security Level: NIST Level 5
- Public key: 1568 bytes
- Ciphertext: 1568 bytes
- Shared secret: 32 bytes

**KDF**: HKDF-SHA256
- Derives symmetric key from shared secret
- Industry standard, FIPS approved

**AEAD**: AES-256-GCM
- 256-bit key size
- 96-bit nonce
- 128-bit authentication tag
- FIPS 140-2 approved

### Envelope Encryption

```
1. Generate random Kyber1024 keypair (anchor)
2. For each asset:
   a. Encapsulate to derive shared secret
   b. HKDF-SHA256 to derive AES key
   c. Encrypt plaintext with AES-256-GCM
   d. Store: KEM ciphertext + nonce + AEAD ciphertext + tag
3. Store all in Vault
4. DB stores only Vault references
```

## Blockchain Security

### Private Key Management

**Development**:
- Uses well-known Hardhat test account
- Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **NEVER USE IN PRODUCTION**

**Production**:
- Generate new private key securely
- Store in Vault or hardware wallet
- Use multi-sig for contract ownership
- Rotate periodically

### Smart Contract Security

**Attestation Contract**:
- Immutable once deployed
- No upgrade mechanism (by design)
- Events for transparency
- Input validation

**Best Practices**:
- Audit before production deployment
- Test extensively on testnet
- Monitor gas prices
- Set reasonable gas limits

## Security Hardening

### Production Checklist

**Before Production Deployment**:

- [ ] Change all default passwords
- [ ] Generate strong JWT secret (32+ bytes)
- [ ] Use production Vault with proper ACLs
- [ ] Generate new blockchain private keys
- [ ] Enable TLS for all external connections
- [ ] Configure firewall rules
- [ ] Enable database encryption at rest
- [ ] Set up automated backups
- [ ] Configure monitoring & alerting
- [ ] Review audit log retention policy
- [ ] Perform security audit
- [ ] Run penetration testing
- [ ] Document incident response plan
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Enable CSP headers
- [ ] Disable verbose error messages
- [ ] Remove development endpoints
- [ ] Verify no secrets in logs
- [ ] Test backup restoration

### Environment Variables

**Never commit to Git**:
- Database passwords
- JWT secrets
- Vault tokens
- Private keys
- API keys

Use secrets management:
- Docker secrets
- Kubernetes secrets
- Vault dynamic secrets
- AWS Secrets Manager
- Azure Key Vault

### Dependency Security

**Regular Updates**:
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Fix critical issues
npm audit fix
```

**Automated Scanning**:
- Enable GitHub Dependabot
- Use Snyk or similar
- Scan Docker images
- Monitor CVE databases

## Compliance

### Data Privacy

**PII Handling**:
- Minimal collection (email only for users)
- Encrypted at rest and in transit
- Right to erasure supported
- Audit trail for access

**Key Material**:
- Treated as highly sensitive
- Access strictly controlled
- Never logged or cached
- Encrypted in Vault

### Audit Requirements

**Audit Logs Include**:
- Timestamp
- User ID
- Action performed
- Resource affected
- IP address
- User agent

**Retention**:
- Minimum 1 year recommended
- Immutable storage
- Regular review for anomalies

## Incident Response

### Security Incident

1. **Detect**: Monitor logs for anomalies
2. **Contain**: Isolate affected systems
3. **Investigate**: Review audit logs
4. **Remediate**: Patch vulnerabilities
5. **Recover**: Restore from clean backup
6. **Learn**: Update procedures

### Breach Response

1. Immediately rotate all secrets
2. Force logout all users
3. Review access logs
4. Notify affected parties
5. File required reports
6. Conduct forensic analysis

## Security Contacts

- **Security Team**: security@quantumvault.local
- **Vulnerability Reports**: security-vuln@quantumvault.local
- **Emergency**: +1-XXX-XXX-XXXX

## Responsible Disclosure

If you discover a security vulnerability:
1. Email security-vuln@quantumvault.local
2. Include detailed description
3. Allow 90 days for remediation
4. Do not publicly disclose until patched

We appreciate responsible security research!
