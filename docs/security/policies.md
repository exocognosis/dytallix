---
title: Security Policies
---

# Security Policies

> Canonical internal-facing summary of high-level security policies referenced across the docs. Draft status until full governance review.

## Scope

Applies to validators, bridge relayers, API / RPC infrastructure, build systems, and supporting cloud services.

## Policy Domains

### 1. Access Control
- Least privilege for all IAM roles
- MFA required for all privileged accounts (roadmap until enforcement)
- Quarterly access reviews

### 2. Key Management
- Validator & bridge keys stored in encrypted volumes; HSM integration (roadmap)
- Mandatory key rotation schedule (90 days target where feasible)
- Compromise response: revoke, rotate, resync node; incident process invoked

### 3. Change Management
- All production changes require PR + code review
- Emergency changes post‑facto review within 24h

### 4. Vulnerability Management
- Weekly automated dependency scan (npm, cargo, docker base images)
- Critical (CVSS 9+) patched &lt;24h; High &lt;72h; Medium next sprint

### 5. Logging & Monitoring
- Centralized log aggregation (roadmap for full SIEM)
- Tamper‑evident storage (hash chaining roadmap)

### 6. Incident Response
- Severity matrix defined (see incident-response.md)
- Postmortems required for Sev1/Sev2

### 7. Data Protection
- Encryption in transit (TLS 1.2+, migration to 1.3) and at rest (cloud provider + CMEK roadmap)
- No plaintext secrets in repos

### 8. Secure Development
- Threat modeling lightweight pass for new modules
- Mandatory lint + basic security checks in CI

### 9. Third-Party / Supply Chain
- Pin critical dependencies
- Verify signatures for container base images (roadmap)

### 10. Business Continuity
- Minimum RPO 24h, RTO 4h for core chain services (draft)

## Enforcement
Non‑compliant findings tracked in hardening_checklist.md with remediation timelines.

## Review Cadence
- Policy review quarterly or after Sev1 incident

Next: [Disaster Recovery Plan](disaster-recovery.md)
