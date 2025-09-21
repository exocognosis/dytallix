# PulseGuard Security Guide

## Authentication & Authorization

### HMAC Request Validation

All API requests must include a valid HMAC-SHA256 signature.

#### Key Management

```bash
# Generate strong HMAC key
openssl rand -hex 32

# Set in environment
export PG_HMAC_KEY="your_32_character_hex_key"
```

#### Request Signing

```python
import hmac
import hashlib
import json

def sign_request(data, secret_key):
    """Sign request data with HMAC-SHA256."""
    if isinstance(data, dict):
        data = json.dumps(data, sort_keys=True, separators=(',', ':'))
    
    signature = hmac.new(
        secret_key.encode('utf-8'),
        data.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature

# Usage
request_body = {"tx_hash": "0x123..."}
signature = sign_request(request_body, "your_hmac_key")

# Add to request headers
headers = {
    "Content-Type": "application/json",
    "X-HMAC-Signature": signature
}
```

#### Validation Process

1. Extract HMAC signature from `X-HMAC-Signature` header
2. Recompute HMAC over request body using server key
3. Compare signatures using timing-safe comparison
4. Reject request if signatures don't match

### Ed25519 Response Signing

Responses are signed with Ed25519 for integrity verification.

#### Key Generation

```bash
# Generate Ed25519 keypair
python3 -c "
import ed25519
import base64

# Generate keypair
signing_key = ed25519.SigningKey()
verify_key = signing_key.get_verifying_key()

# Export keys
secret_b64 = base64.b64encode(signing_key.to_bytes()).decode('ascii')
public_b64 = base64.b64encode(verify_key.to_bytes()).decode('ascii')

print(f'Secret key (set PG_SIGNING_SECRET): {secret_b64}')
print(f'Public key (for verification): {public_b64}')
"
```

#### Response Verification

```python
import ed25519
import base64
import json

def verify_response(response_data, signature_info):
    """Verify Ed25519 signature on response."""
    if signature_info.get("algorithm") != "ed25519":
        return False
        
    try:
        # Load public key
        public_key_b64 = signature_info["public_key"]
        public_key_bytes = base64.b64decode(public_key_b64)
        verify_key = ed25519.VerifyingKey(public_key_bytes)
        
        # Reconstruct signed data
        data_json = json.dumps(response_data, sort_keys=True, separators=(',', ':'))
        
        # Verify signature
        signature = base64.b64decode(signature_info["signature"])
        verify_key.verify(signature, data_json.encode('utf-8'))
        return True
        
    except Exception:
        return False
```

## Post-Quantum Cryptography (PQC)

### Current Status

PQC support is implemented as configurable stubs for future integration:

```bash
# Enable PQC features (stub implementation)
export PG_PQC_ENABLED=true
```

### Planned Algorithms

- **Signatures**: Dilithium (NIST standard)
- **Key Exchange**: Kyber (for future encrypted channels)
- **Hash Functions**: SHA-3, BLAKE3 (already implemented)

### Implementation Roadmap

1. **Phase 1** (Current): Stub interfaces and configuration
2. **Phase 2**: Integration with quantum-safe libraries
3. **Phase 3**: Hybrid classical/quantum signatures
4. **Phase 4**: Full quantum-safe protocol

### PQC Stub Interface

```python
from service.security import get_security_manager

security = get_security_manager()

# PQC signing (returns stub)
pqc_signature = security.pqc_sign(data, algorithm="dilithium")

# PQC verification (returns stub result)
is_valid = security.pqc_verify(data, pqc_signature)
```

## Network Security

### TLS/HTTPS Configuration

```nginx
# Nginx reverse proxy configuration
server {
    listen 443 ssl http2;
    server_name pulseguard.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://localhost:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Firewall Rules

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing

# SSH access
ufw allow 22/tcp

# HTTPS for API
ufw allow 443/tcp

# Prometheus metrics (internal only)
ufw allow from 10.0.0.0/8 to any port 9109

# Enable firewall
ufw enable
```

### Rate Limiting

```nginx
# Nginx rate limiting
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    
    server {
        location /score {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://localhost:8088;
        }
    }
}
```

## Data Security

### Sensitive Data Handling

1. **Transaction Hashes**: Not considered sensitive, can be logged
2. **Addresses**: Pseudonymous, treat as PII in some jurisdictions
3. **Values**: Financial data, minimize retention
4. **HMAC Keys**: Highly sensitive, never log or expose

### Data Retention Policy

```python
# Example data purging
import time
from datetime import datetime, timedelta

def purge_old_data():
    """Remove data older than retention period."""
    cutoff_time = int(time.time()) - (30 * 24 * 3600)  # 30 days
    
    # Clean temporal features
    temporal_engine.cleanup_old_data()
    
    # Clean graph data
    dag_builder.cleanup_old_edges()
    
    # Clean feature store
    feature_store.cleanup_old_versions(keep_versions=5)
```

### Encryption at Rest

```bash
# Encrypt sensitive configuration
ansible-vault create config/secrets.yml

# Use encrypted storage for models
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
    --encrypt --output models/ensemble.gpg models/ensemble.pkl
```

## Audit & Compliance

### Logging Security Events

```python
import logging

security_logger = logging.getLogger("pulseguard.security")

# Log authentication events
security_logger.info("HMAC validation success", extra={
    "event": "auth_success",
    "client_ip": request.client.host,
    "trace_id": trace_id
})

security_logger.warning("HMAC validation failed", extra={
    "event": "auth_failure", 
    "client_ip": request.client.host,
    "user_agent": request.headers.get("user-agent")
})
```

### Compliance Considerations

#### GDPR (EU)

- Transaction hashes may be considered personal data
- Implement data subject access/deletion rights
- Document data processing basis and retention

#### PCI DSS (if handling card data)

- Use secure communication protocols
- Implement access controls and monitoring
- Regular security assessments

#### SOC 2 Type II

- Implement security controls framework
- Regular access reviews and monitoring
- Incident response procedures

### Security Monitoring

```yaml
# Security monitoring alerts
groups:
  - name: pulseguard-security
    rules:
      - alert: AuthenticationFailures
        expr: rate(pulseguard_auth_failures_total[5m]) > 10
        annotations:
          summary: "High authentication failure rate"
          
      - alert: UnusualTraffic
        expr: rate(pulseguard_requests_total[1m]) > 1000
        annotations:
          summary: "Unusual request volume detected"
```

## Incident Response

### Security Incident Classification

1. **Low**: Failed authentication attempts
2. **Medium**: Potential data access breach
3. **High**: Confirmed unauthorized access
4. **Critical**: System compromise or data exfiltration

### Response Procedures

1. **Detection**: Automated alerts and monitoring
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threats and vulnerabilities
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update procedures and controls

### Emergency Contacts

```yaml
# incident_response.yml
contacts:
  security_team: security@company.com
  on_call: +1-555-SECURITY
  legal: legal@company.com
  
escalation:
  low: security_team
  medium: security_team + on_call
  high: security_team + on_call + legal
  critical: all_contacts + executives
```

## Vulnerability Management

### Regular Security Updates

```bash
# Update dependencies monthly
pip list --outdated
pip install --upgrade package_name

# Security-only updates
pip install --upgrade --only-upgrade package_name
```

### Security Scanning

```bash
# Dependency vulnerability scanning
pip install safety
safety check

# Static analysis
pip install bandit
bandit -r service/ models/ -f json -o security_report.json

# Container scanning (if using Docker)
trivy image pulseguard:latest
```

### Penetration Testing

- Quarterly external penetration tests
- Annual red team exercises
- Bug bounty program for external researchers

## Secure Development

### Code Review Security Checklist

- [ ] No hardcoded secrets or keys
- [ ] Input validation on all endpoints
- [ ] Proper error handling (no info leakage)
- [ ] Authentication/authorization checks
- [ ] Secure random number generation
- [ ] Safe deserialization practices

### Secret Management

```bash
# Use environment variables
export PG_HMAC_KEY="$(openssl rand -hex 32)"

# Or use secret management service
kubectl create secret generic pulseguard-secrets \
  --from-literal=hmac-key="$(openssl rand -hex 32)" \
  --from-literal=signing-key="$(python3 -c 'import ed25519, base64; print(base64.b64encode(ed25519.SigningKey().to_bytes()).decode())')"
```

Never commit secrets to version control:

```gitignore
# .gitignore
.env
*.key
*_secret*
config/secrets.yml
```