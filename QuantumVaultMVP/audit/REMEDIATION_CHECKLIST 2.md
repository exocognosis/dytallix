# QuantumVaultMVP Remediation Checklist (Authoritative)

Branch: `quantumvaultmvp-remediation-2025-12-28`

This checklist is the source of truth for closing the MVP gaps. Every checkbox must be backed by concrete evidence (file links + line ranges).

## Phase 0 — Baseline & Safety

- [x] Working branch created: `quantumvaultmvp-remediation-2025-12-28`
- [x] Baseline run captured: [audit/BASELINE.md](QuantumVaultMVP/audit/BASELINE.md)
- [x] Baseline failures triaged and mapped to fixes
  - E2E default API URL pointed to the wrong port: [scripts/e2e.sh](QuantumVaultMVP/scripts/e2e.sh#L18)
  - Fresh DB had no users because seed was not executed in container: [backend/Dockerfile](QuantumVaultMVP/backend/Dockerfile#L63-L67), [backend/prisma/seed.ts](QuantumVaultMVP/backend/prisma/seed.ts)

## Phase 1 — Prisma Migrations (Hard Blocker)

- [x] `QuantumVaultMVP/backend/prisma/migrations/` exists (generated from schema)
  - Evidence: [backend/prisma/migrations/20251228151252_init/migration.sql](QuantumVaultMVP/backend/prisma/migrations/20251228151252_init/migration.sql)
  - Evidence: [backend/prisma/migrations/migration_lock.toml](QuantumVaultMVP/backend/prisma/migrations/migration_lock.toml)
- [ ] Container startup uses `prisma migrate deploy` (no `prisma db push` in production paths)
- [ ] `docker compose up` deterministically applies migrations (fresh DB)
- [ ] Docs updated to describe migration-based boot
- [ ] E2E fails fast if migrations missing/not applied

## Phase 2 — Real PQC Wrapping + Real Anchors (Core Blocker)

### Simulated crypto removal (must be eliminated from production runtime)

- [ ] Remove simulated KEM ciphertext generation from wrapping runtime
  - Current simulated KEM: [backend/src/wrapping/wrapping.service.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.service.ts#L108-L111)
- [ ] Replace placeholder anchor key generation with real PQC keypairs
  - Current placeholder anchors: [backend/src/anchors/anchors.service.ts](QuantumVaultMVP/backend/src/anchors/anchors.service.ts#L39-L43)

### Real PQC KEM + envelope format

- [ ] Integrate real liboqs/OpenQuantumSafe KEM binding usable from Node in-container
- [ ] Chosen suite documented in [docs/SECURITY.md](QuantumVaultMVP/docs/SECURITY.md)
- [ ] Anchors store private key material in Vault; DB stores references + public key (or reference)
- [ ] Wrapping payload in Vault includes: `kem_ciphertext`, `salt`, `nonce`, `aead_ciphertext`, suite metadata
- [ ] Unwrap path exists and is verified (e2e)
- [ ] DB stores references/metadata only (not raw secrets)

## Phase 3 — Onboarding Wizard + Automated First Scan

- [ ] Backend endpoints exist for onboarding:
  - readiness checks (Vault reachable, DB OK, queue OK)
  - bootstrap initial TLS targets
  - trigger first scan
- [ ] Frontend wizard flow exists and works on fresh install:
  - readiness step
  - add target(s) step
  - run first scan step
  - completion step showing discovered assets

## Phase 4 — Scan Diffing + PQC Classification Correctness

- [ ] Scan diffing implemented (latest vs prior) for TLS evidence per asset/target
- [ ] Diff exposed by API and displayed in UI (asset detail)
- [ ] Placeholder PQC classification removed and replaced with deterministic rule-based classification
- [ ] Classification ‘why’ persisted as evidence field(s)

## Phase 5 — Policies (Scope + Enforcement + Automation)

- [ ] `targetScope` is enforced during evaluation (does not evaluate all assets by default)
  - Current bug (loads all assets): [backend/src/policies/policies.service.ts](QuantumVaultMVP/backend/src/policies/policies.service.ts#L65-L73)
- [ ] Policy has enforcement mode (at least `MONITOR` vs `ENFORCE`) in schema + API
- [ ] `ENFORCE` automatically schedules wrapping jobs for in-scope non-compliant assets with key material
- [ ] Audit log events recorded for activation + auto job generation

## Phase 6 — Acceptance Tests Alignment

- [ ] [scripts/e2e.sh](QuantumVaultMVP/scripts/e2e.sh) validates end-to-end:
  - stack up
  - migrations applied
  - create/login user
  - create target(s)
  - scan + verify assets/evidence
  - ingest key material to Vault for at least one asset
  - real PQC wrap + verify unwrap OR verifiable suite metadata
  - create `ENFORCE` policy + verify auto-job generation
  - attestation only if fully real + confirmed; otherwise disabled by default

## Final — Required Evidence Outputs

- [ ] Post remediation report: [audit/POST_REMEDIATION_REPORT.md](QuantumVaultMVP/audit/POST_REMEDIATION_REPORT.md)
  - Must include how-to-run, proof commands, and captured outputs.
