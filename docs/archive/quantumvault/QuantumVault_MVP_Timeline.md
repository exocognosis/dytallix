# QuantumVault MVP Timeline (Realistic, 1–2 Senior Engineers)

Assumptions:
- No greenfield rewrite.
- Work is confined to `QuantumVaultMVP/` unless explicitly re-scoped.
- Timeline includes engineering + basic validation, not enterprise-grade compliance.

---

## Phase 1 — MVP Critical Path (6–10 weeks)

### Workstream A: Database migrations (1 week)
- Generate Prisma migrations and validate deploy path.
- Risk: medium (schema complexity is moderate; absence of migrations is a hard gap).

### Workstream B: Real PQC wrapping + anchor lifecycle (3–5 weeks)
- Replace simulated KEM and placeholder anchor keys with real PQC crypto.
- Integrate or bridge to a PQC implementation and prove correctness.
- Risk: high (crypto correctness + packaging).

### Workstream C: Onboarding wizard + automated first scan (1–2 weeks)
- Minimal wizard + readiness validation + first scan trigger.
- Risk: medium.

### Workstream D: Scan diffing + PQC classification correctness (1–2 weeks)
- Implement diffing for TLS evidence.
- Replace placeholder PQC classifier with deterministic rules.
- Risk: medium.

### Workstream E: Policies (scope + enforcement + auto-job generation) (1–2 weeks)
- Fix evaluation scope.
- Add enforcement mode.
- Auto-generate remediation jobs.
- Risk: medium.

### Workstream F: Acceptance tests aligned to framework (1–2 weeks)
- Extend E2E coverage to include wrapping and attestation.
- Risk: low-medium.

**Phase 1 total**
- **1 engineer**: ~10 weeks
- **2 senior engineers**: ~6–8 weeks (parallelize PQC work vs onboarding/policies/tests)

---

## Phase 2 — Hardening & Expansion (6–12+ weeks)

### Connector expansion (3–6 weeks)
- Implement additional connectors (Kubernetes/Vault/Cloud/DB/API/File) or explicitly remove unsupported types.

### Air-gapped delivery (2–4 weeks)
- Offline image bundle/registry plan, pinned dependencies, runbooks, optional delayed-attestation workflow.

### Inventory richness (2–4 weeks)
- Environments/tags, improved evidence linkage views, policy scope UX.

### Attestation hardening (1–3 weeks)
- Clarify backend(s), improve tx status, UI evidence.

**Phase 2 total**
- **1 engineer**: ~12+ weeks
- **2 senior engineers**: ~6–10 weeks

---

## Execution Strategy (No optimism bias)
- Treat “real PQC wrapping” and “migrations” as the primary gating items.
- Keep the product boundary clean: if `QuantumVaultMVP/` is the deliverable, remove reliance on non-boundary services or document them as dependencies.
- Do not claim support for connectors that aren’t implemented; either build them or remove/disable their types.
