---
title: Security Overview
---

# Security Overview

> This section provides an overview of security goals, threat model, and controls for the Dytallix testnet.

## Objectives

- Protect validator keys and PQC materials
- Ensure integrity of cross-chain bridge operations
- Provide defense-in-depth for infrastructure, networking, and application layers
- Detect anomalies rapidly and support incident response

## Threat Model (High Level)

| Threat | Vector | Control Layer |
|--------|--------|---------------|
| Key theft | Compromised host / memory scrape | HSM / enclave (planned), least-privilege, sealed secrets |
| RPC abuse | Unauthenticated flood | Rate limits, WAF, circuit breakers |
| Bridge replay | Malicious relayer resubmits | Nonce + finality checks + replay cache |
| Consensus halt | Coordinated validator crash | Diverse hosting + auto-restart + monitoring |
| PQ crypto downgrade | Fallback to classical-only | Strict handshake, version pinning |

## Core Control Domains

1. Identity & Keys: Mnemonics, validator keys, PQ keypairs, rotation schedule.
2. Network Security: Segmented validator network, sentry design, firewall baselines.
3. Application Security: Input validation, API schema enforcement (OpenAPI), auth (future).
4. Supply Chain: Pin dependencies, integrity scans, vulnerability monitoring.
5. Observability: Metrics, structured logs, anomaly alerts.
6. Incident Response: Runbooks, severity matrix, containment procedures.

## Related Docs

- [Validator Node Setup](../operators/validator-node-setup.md)
- [Monitoring & Troubleshooting](../operators/monitoring-troubleshooting.md)
- [PQC Primer](../architecture/pqc-primer.md)

Next: [Key Management](key-management.md)
