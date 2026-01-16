---
title: Security Roadmap
---

# Security Roadmap

## Q3 2025
- Implement key rotation automation
- Add dependency scanning to CI (JS + Rust)
- Basic anomaly detection for block time & faucet abuse

## Q4 2025
- mTLS between internal services
- HSM integration pilot for validator keys
- Fuzz testing for critical modules
- Formal verification evaluation for bridge contract

## 2026 Early
- Full PQC handshake rollout
- Multi-party bridge attestation
- Hardware-backed enclaves for signing (TEE)
- Continuous threat modeling cadence

## Metrics of Success
- MTTD < 5 min for Sev1/2
- MTTR < 60 min for Sev2
- >90% key rotations executed within window
- Zero critical unpatched vulns >30 days

Return: [Security Overview](overview.md)
