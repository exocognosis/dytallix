# Dytallix Post-Quantum (PQC) Key Rotation & Secret Management

Version: 1.1  
Status: Baseline Hardening Document  
Maintainer: Security Engineering (security@dytallix.example)

## 1. Purpose & Scope
Defines the authoritative procedure for generation, rotation, revocation, recovery and evidence of PQC (post‑quantum) cryptographic keys used by:
- Bridge / cross‑chain signing (Dilithium5, Falcon1024, SPHINCS+ fallback)
- Validator / consensus hybrid keys (Ed25519 + PQC phase‑in)
- Service / oracle API secrets & encryption master keys (Vault managed)

Out of scope: end‑user wallet keys (custody external) and non‑production sandboxes.

## 2. Objectives
| Goal | Target |
|------|--------|
| Limit compromise window | ≤ 90 days for bridge validators (planned 60d) |
| Emergency revocation | < 15 minutes activation |
| Recovery (RTO) | < 30 minutes for bridge signing continuity |
| Evidence completeness | 100% rotation events logged & hashed |

## 3. Key Classes & Cryptoperiods
| Key Class | Algorithms | Default Lifetime | Overlap Window | Notes |
|-----------|-----------|------------------|---------------|-------|
| Bridge Validator Signing | Dilithium5 primary; Falcon1024 perf; SPHINCS+ contingency | 60d planned / 90d max | 7d dual-valid | Always keep at least two PQC algs ready (agility) |
| Threshold / Multisig Set Metadata | N/A (set manifest) | Align with signing keys | 7d | Manifest hashed & stored |
| Consensus Hybrid (phase-in) | Ed25519 + Dilithium2 | 180d | 14d | PQC added before deprecating classical |
| Service API / JWT | 256‑bit random | 30d | 7d | Automated Vault rotation |
| Encryption KEK (Vault transit) | AES-256-GCM | 180d | 14d | Re-wrap DEKs only |

## 4. Authoritative Stores
| Material | Store | Access Control |
|----------|-------|----------------|
| Active PQC Private Keys | Vault Transit / HSM | M-of-N unseal, audited, no raw export |
| Public Keys & Manifests | Git: `security/validators.json` + on-chain registry | Signed commits (GPG) + chain emission |
| Rotation Manifests | Git: `security/rotation/*.yaml` | Append-only, checksum index |
| Revocation / CRL | On-chain `/pqc/revocations` + mirror JSON | Immediate propagation |

Manifest fields: `set_id, key_id, algorithm, created_at, activates_at, retires_at, fingerprint_sha256, status`.

## 5. Standard Rotation Procedure (Bridge PQC Keys)
1. Initiate: Create ticket SEC-ROT-<id>; list retiring `key_id`s; assign owner & reviewer.
2. Prep: Fetch inventory (script planned) -> verify no drift vs last manifest.
3. Generate: In offline/HSM context create Dilithium5 + Falcon1024 keypairs; derive fingerprints.
4. Store: Load private material into Vault/HSM (label: `bridge-val-<validator>-<epoch>`). No plaintext persistence.
5. Extract Public: Export public portions only; build draft manifest `<new_set_id>.yaml` with `activates_at = T+24h`.
6. Dry Run: `pqc_bridge_cli verify --manifest <file>` against test payload corpus.
7. Review: 2-person sign-off (Security + Ops). PR merges manifest & updates `validators.json` (signed commit).
8. Pre-Activation Checks (T-1h): Node sync of manifest hash; threshold simulation (≥ quorum success rate == 100%).
9. Activate (T0): Governance/config tx sets `active_set_id = <new_set_id>`.
10. Monitor (T0→T0+2h): Metrics: signature success, block latency, error logs. Abort criteria: >1% signing failures sustained 5m.
11. Retire: Mark old keys `status=retired`; schedule HSM destroy (or destroy-pending if retention policy); remove from active set.
12. Evidence: Append JSON line to `launch-evidence/security/rotation_log.jsonl` with SHA256 of manifest + metrics summary.
13. Archive: Copy manifest & metrics snapshot to `launch-evidence/security/rotation_logs/<UTC>_<set_id>.yaml`.

## 6. Emergency Rotation (Compromise Fast Path)
Triggers: suspected private key leak, anomalous signature pattern, validator host intrusion, PQC lib critical CVE, threshold integrity breach.
Steps (≤15m target):
- Generate & store new key(s) immediately (skip T+24h delay).
- Add compromised key to CRL -> broadcast on-chain.
- Activate new set; pause affected bridge lane if quorum temporarily unsafe.
- Forensic snapshot BEFORE destruction of compromised host material.
- Post-incident report within 24h (timeline, scope, remediation, indicators).

## 7. Revocation & CRL Handling
- Any key in `revoked` state causes signature rejection (fail closed).
- Nodes poll / subscribe to revocation feed; max propagation delay SLA < 2m.
- CRL mirrored: `security/revocations/current.json` (signed + hashed into rotation index).

## 8. Recovery Scenarios
| Scenario | Action | Success Criteria |
|----------|--------|------------------|
| Activation Failure (no new sigs) | Rollback `active_set_id` to previous manifest; re-run dry-run; re-attempt | Signatures resume <10m |
| Vault Outage | Failover to standby cluster; restore keys from sealed escrow | Service restored <30m |
| Corrupt Manifest | Re-validate checksum vs git tag; re-issue activation | Integrity verified |
| State Drift | Halt signing (circuit breaker); reconcile public key map from manifests | Drift = 0 |

## 9. Evidence & Metrics
Artifacts (hash-indexed) under `launch-evidence/security/`:
- `rotation_logs/<UTC>_<set_id>.yaml` (manifest snapshot)
- `rotation_log.jsonl` (append-only event lines)
- `dependency_audit_<UTC>.txt` (cargo + npm consolidated)
- `integrity_report_<UTC>.json` (planned)

Metrics Targets: rotation completion ≤24h (standard), emergency rotation ≤15m, revocation propagation <2m, signature error rate post-rotation <1%.

## 10. Dependency Audit Integration
Weekly CI job runs: `cargo audit` and `npm audit --omit=dev --audit-level=moderate`.
Policy: Critical/High -> patch or temporary deny / pin <48h; Medium <14d; Low by next rotation cycle. Results appended to latest dependency audit evidence file.

## 11. Algorithm Agility Strategy
Maintain dual readiness (Dilithium5 + Falcon1024). Quarterly review NIST updates & cryptanalysis. Add new algorithm via shadow verification stage (collect signatures, do not enforce) before activation. Deprecation cycle: announce -> mark deprecated -> disallow new keys -> revoke after two full rotations.

## 12. Roles
| Role | Responsibilities |
|------|------------------|
| Security Eng | Own process, manifests, emergency actions |
| Ops / SRE | Execute rotations, monitor, evidence archival |
| Cryptography Reviewer | Review algorithmic changes & manifests |
| Compliance | Audit trail verification |

## 13. Quick Checklist (Standard Rotation)
1. Ticket & inventory
2. Generate keys (Dilithium5 + Falcon1024)
3. Vault store & fingerprint
4. Draft manifest + dry-run verify
5. PR + dual approval
6. Pre-activation checks
7. Activate
8. Monitor
9. Retire & destroy old keys
10. Evidence & close ticket

## 14. Change Log
- v1.1 Consolidated baseline; clarified activation & evidence paths.
- v1.0 Initial version.

---
Document Classification: Internal Security
