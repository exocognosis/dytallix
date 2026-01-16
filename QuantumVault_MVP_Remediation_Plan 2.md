# QuantumVault MVP Remediation Plan (Phased, Evidence-Based)

Assumptions:
- Team: 1–2 senior engineers.
- Boundary: `QuantumVaultMVP/` is the target product.
- Goal: Achieve alignment with the **given MVP framework**, not the repo’s internal claims.

Non-goals:
- No greenfield rebuild unless unavoidable.
- No new “nice-to-have” UX beyond what the framework explicitly requires.

---

## Phase 1 — MVP Critical Path (Must exist end-to-end)

### Workstream 1: Database migrations (hard blocker)
**Why**: Framework requires migrations and delivery discipline; current boundary has no Prisma migrations.
- Generate initial migration set from [QuantumVaultMVP/backend/prisma/schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma)
- Validate `prisma migrate deploy` works in containerized deployment paths described in [QuantumVaultMVP/docs/INSTALL.md](QuantumVaultMVP/docs/INSTALL.md)

**Exit criteria**
- `QuantumVaultMVP/infra/docker-compose.yml` brings up backend + DB with migrations applied deterministically.

### Workstream 2: Real PQC envelope encryption (core MVP gap)
**Why**: Current wrapping is explicitly simulated.
- Replace simulated KEM (`randomBytes(1568)`) with a real PQC KEM implementation.
  - Evidence of current simulation: [QuantumVaultMVP/backend/src/wrapping/wrapping.service.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.service.ts)
- Replace placeholder anchor key generation with real PQC key generation.
  - Evidence of placeholder keys: [QuantumVaultMVP/backend/src/anchors/anchors.service.ts](QuantumVaultMVP/backend/src/anchors/anchors.service.ts)
- Ensure anchor public key is actually used for encapsulation and private key is needed for decapsulation/unwrapping (even if unwrapping is not exposed in MVP UI, key lifecycle must be real).

**Dependencies / decisions**
- Choose PQC library strategy:
  - Node-native PQC library (harder operationally), or
  - Bridge to existing Rust PQC crates in repo (e.g., [pqc-crypto](pqc-crypto)) via a small service boundary.

**Exit criteria**
- Wrapping results are reproducible and verifiable as real PQC KEM + AEAD envelope.
- Anchors are real keys, lifecycle operations are meaningful.

### Workstream 3: Onboarding & Connectivity MVP minimum
**Why**: Framework requires setup wizard, connector onboarding, and automated first scan.
- Implement a minimal Setup Wizard (frontend) that:
  1) Validates environment readiness (DB/Redis/Vault availability)
  2) Creates the first TLS scan target
  3) Triggers the first scan automatically
- Add connector health validation endpoints for targets/credentials, separate from service health.

**Evidence**
- No wizard currently: [QuantumVaultMVP/frontend/src/app](QuantumVaultMVP/frontend/src/app)
- Scan trigger exists: [QuantumVaultMVP/backend/src/scans/scans.controller.ts](QuantumVaultMVP/backend/src/scans/scans.controller.ts)

**Exit criteria**
- Fresh deployment can be brought to first completed scan through a guided flow.

### Workstream 4: Discovery completeness (MVP-acceptable scope)
**Why**: Framework expects scan history + diffing and PQC classification.
- Implement scan diffing for TLS evidence (cert chain + key/signature algorithm changes).
- Replace placeholder PQC classification with standards-based classification rules for TLS evidence.

**Evidence**
- No diffing: [QuantumVaultMVP/backend/src/scans/scans.service.ts](QuantumVaultMVP/backend/src/scans/scans.service.ts)
- Placeholder PQC logic: [QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts](QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts)

**Exit criteria**
- UI/API can show “what changed since last scan” per asset.

### Workstream 5: Policies (minimum viable enforcement)
**Why**: Framework requires scope definition, enforcement modes, policy-asset mapping, automated job generation.
- Make `targetScope` actually constrain evaluation.
- Add enforcement mode model (monitor vs enforce).
- Implement automatic wrapping job generation when a policy is active + matches assets.

**Evidence**
- Evaluation ignores scope and is simplistic: [QuantumVaultMVP/backend/src/policies/policies.service.ts](QuantumVaultMVP/backend/src/policies/policies.service.ts)

**Exit criteria**
- Policy activation can drive remediation jobs without manual triggering.

### Workstream 6: Acceptance tests (must match framework)
**Why**: Current E2E script does not cover required flows.
- Extend acceptance tests to cover:
  - credential ingestion
  - wrapping (real PQC)
  - policy-driven job generation
  - attestation submission (if enabled)

**Evidence**
- Current script stops before wrapping/attestation: [QuantumVaultMVP/scripts/e2e.sh](QuantumVaultMVP/scripts/e2e.sh)

**Exit criteria**
- CI-executable script demonstrates the MVP critical path end-to-end.

---

## Phase 2 — Hardening & Expansion

### Connector expansion
- Implement additional connector types referenced by `TargetType` (Database/API/File storage) or remove them to avoid false product claims.

### Air-gapped delivery
- Provide offline install/runbook:
  - image bundle (or private registry mirror)
  - dependency pinning
  - optional delayed attestation submission

### Inventory richness
- Add environments/tags as first-class entities (schema + UI), linking policies and evidence.

### Attestation hardening
- Make transaction status meaningful for the Dytallix backend or clearly constrain MVP to EVM only.
- Add UI evidence views (tx hash, block height, proofs).

---

## Sequencing (Critical dependencies)

1) Migrations (unblocks reliable bring-up)
2) Real PQC wrapping + real anchors (core MVP claim)
3) Onboarding wizard + automated first scan
4) Diffing + PQC classification correctness
5) Policies: scope + enforcement + auto-job generation
6) Acceptance tests aligned to the above
7) Phase 2 expansion (connectors, air-gap packaging, inventory depth, attestation polish)
