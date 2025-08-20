---
title: Application Security
---

# Application Security

## Secure Development Lifecycle

| Phase | Control |
|-------|---------|
| Design | Threat modeling light for new modules |
| Implementation | ESLint + type hints + code reviews |
| Build | Dependency audit (npm audit, cargo audit) |
| Test | Unit + e2e + fuzz (roadmap) |
| Release | Signed tags (roadmap) |
| Operate | Runtime monitoring + log integrity |

## Input Validation

- OpenAPI schema defines expected request structure
- Reject unknown fields (validator middleware planned)
- Size limits on JSON bodies (&lt;=100KB)

## Dependency Security

- Weekly automated scan script (see `scripts/security_audit.sh`)
- Pin major versions
- Avoid abandoned packages

## Secrets Management

- `.env` not committed (sample templates only)
- Plan to migrate to Vault / Secret Manager for production
- Memory zeroization for short-lived key materials (roadmap)

## Bridge Specific

- Replay protection via nonce + block finality
- Multi-party attestation threshold (future)
- Rate limiting relayer submissions

Next: [Monitoring & Detection](monitoring-detection.md) | Back: [Security Overview](overview.md) | Policies: [Security Policies](policies.md)
