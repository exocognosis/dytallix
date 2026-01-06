# QuantumVault MVP Status Report (Evidence-Based)

**Repository**: HisMadRealm/dytallix (branch: `pqc-audit-fixes`)

**Assessment boundary (source of truth)**: `QuantumVaultMVP/` (work outside this folder is treated as non-MVP unless it is clearly packaged/consumed by `QuantumVaultMVP/`).

**Important**: `QuantumVaultMVP/STATUS.md` declares “100% COMPLETE / PRODUCTION READY”. This report does **not** accept that claim as evidence; it validates against code artifacts and executable surfaces.

---

## A. Repository & Structure Analysis

### A1) QuantumVaultMVP structure (target boundary)
- Backend service (NestJS + BullMQ): [QuantumVaultMVP/backend](QuantumVaultMVP/backend)
  - Modules present: `auth`, `scans`, `tls-scanner`, `assets`, `risk`, `vault`, `wrapping`, `policies`, `dashboard`, `attestation`, `blockchain`, `queue`
  - DB schema (Prisma): [QuantumVaultMVP/backend/prisma/schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma)
- Frontend app (Next.js): [QuantumVaultMVP/frontend](QuantumVaultMVP/frontend)
  - Routes: login + single dashboard page with tabs: [QuantumVaultMVP/frontend/src/app](QuantumVaultMVP/frontend/src/app)
- Smart contracts (Hardhat): [QuantumVaultMVP/contracts](QuantumVaultMVP/contracts)
  - Contract: [QuantumVaultMVP/contracts/contracts/QuantumVaultAttestation.sol](QuantumVaultMVP/contracts/contracts/QuantumVaultAttestation.sol)
- Infra (Compose): [QuantumVaultMVP/infra/docker-compose.yml](QuantumVaultMVP/infra/docker-compose.yml)
- Acceptance test harness: [QuantumVaultMVP/scripts/e2e.sh](QuantumVaultMVP/scripts/e2e.sh)

### A2) Non-boundary “QuantumVault” work (deviations)
There are multiple QuantumVault-related artifacts outside `QuantumVaultMVP/` (examples):
- [quantumvault](quantumvault)
- [dytallix-fast-launch/services/quantumvault-api](dytallix-fast-launch/services/quantumvault-api)
- Various deployment/scripts/docs referencing QuantumVault routes and services (e.g. [QUANTUMVAULT-HETZNER-DEPLOYMENT.md](QUANTUMVAULT-HETZNER-DEPLOYMENT.md))

**Deviation impact**: The repo contains at least two implementations/packaging surfaces for “QuantumVault”. For MVP alignment decisions, `QuantumVaultMVP/` must be treated as authoritative; anything outside it is “out of scope” unless it is the actual deployed artifact for customers.

### A3) Commit-level evidence (QuantumVaultMVP)
Recent commit history touching `QuantumVaultMVP/`:
- `9f180de` QuantumVault: add Dytallix anchoring and run scripts
- `a01e45b` Implement QuantumVault MVP… (#227)
- `35628a8` Remove QuantumVaultMVP (corrupted)
- `24a6b02` Add QuantumVaultMVP

(From `git log --oneline -n 20 -- QuantumVaultMVP`.)

---

## B. Feature-to-Implementation Mapping (No feature skipped)

Legend:
- ✅ Implemented (exists + used end-to-end)
- ⚠️ Partial (exists but stubbed/unused/incomplete vs expected behavior)
- ❌ Missing (no code + no executable docs/ops path)

### 1) Onboarding & Connectivity

| Feature / Capability | Expected Behavior (framework) | Status | Evidence | Notes / Gaps |
|---|---|---:|---|---|
| Client-network scanner deployment | Deployable scanner inside client network | ❌ | TLS scanning runs from backend service: [QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts](QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts) | No separable scanner/agent artifact; no installer/package for client-side deployment boundary.
| Air-gapped support | Operate with restricted/no outbound connectivity | ❌ | No air-gap docs or offline mode artifacts found in `QuantumVaultMVP/` (search for “air-gapped” returned no matches). | Compose pulls images and assumes online tooling. No offline bundle, registry mirror guidance, or delayed-attestation workflow.
| Setup Wizard | Guided initial setup of connectors/targets/credentials | ❌ | Frontend routes only include login + dashboard: [QuantumVaultMVP/frontend/src/app](QuantumVaultMVP/frontend/src/app) | No wizard flows, no first-run provisioning steps.
| Connector framework (TLS, Kubernetes, Vault, Cloud) | Pluggable connectors for multiple sources | ⚠️ | `TargetType` includes non-TLS types: [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma) | Scan processor only performs TLS handshake; no implementations for `DATABASE`, `API_ENDPOINT`, `FILE_STORAGE`.
| Credential ingestion & secure storage (Vault) | Ingest credentials and store in Vault | ⚠️ | Vault client + fail-fast init: [vault.service.ts](QuantumVaultMVP/backend/src/vault/vault.service.ts); asset key ingestion stores to Vault: [assets.service.ts](QuantumVaultMVP/backend/src/assets/assets.service.ts) | Only asset key-material ingestion exists. No target-credential ingestion endpoints; `Target.credentials` is a string field but unused.
| Health checks & validation | Validate connectors and environment readiness | ⚠️ | Vault fail-fast init: [vault.service.ts](QuantumVaultMVP/backend/src/vault/vault.service.ts); Compose health checks: [docker-compose.yml](QuantumVaultMVP/infra/docker-compose.yml) | Health checks are service-level, not connector-level validation (e.g., test a given target/credential set).
| Artifact generation (RBAC, IAM, Vault policies) | Generate RBAC/IAM/Vault policy artifacts | ❌ | No generator scripts or policy templates found in `QuantumVaultMVP/` | RBAC exists in-app, but no “artifact output” capability.
| Automated first scan | First scan triggered after setup/onboarding | ⚠️ | Manual API call exists: [scans.controller.ts](QuantumVaultMVP/backend/src/scans/scans.controller.ts) and E2E script triggers scan: [e2e.sh](QuantumVaultMVP/scripts/e2e.sh) | No onboarding-triggered scan; no background “first scan” automation.

### 2) Discovery & Evidence

| Feature / Capability | Expected Behavior (framework) | Status | Evidence | Notes / Gaps |
|---|---|---:|---|---|
| Real TLS scanning | Perform real TLS handshake and extract cert chain | ✅ | Uses Node TLS connect + `getPeerCertificate(true)`: [tls-scanner.service.ts](QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts) | Real network TLS scan exists.
| Crypto evidence extraction | Extract crypto evidence from assets | ⚠️ | Evidence fields stored on `ScanAsset` (cipherSuite, tlsVersion, algorithms): [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma); stored by processor: [scan.processor.ts](QuantumVaultMVP/backend/src/scans/scan.processor.ts) | Only TLS cert evidence; no key inventory, no config/SSH/API key discovery.
| Scan history & diffing | Keep history and provide diff capability | ⚠️ | History endpoints: [scans.controller.ts](QuantumVaultMVP/backend/src/scans/scans.controller.ts); history query: [scans.service.ts](QuantumVaultMVP/backend/src/scans/scans.service.ts) | No diff endpoint or diff computation between scans.
| Asset catalog persistence | Persist assets and metadata | ✅ | Asset model + relations: [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma); asset queries: [assets.service.ts](QuantumVaultMVP/backend/src/assets/assets.service.ts) | Persisted.
| PQC classification logic | Classify PQC vs non-PQC correctly | ⚠️ | Placeholder string-match against PQC algorithm names: [tls-scanner.service.ts](QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts) | This will almost always mark real-world TLS certs as non-PQC; no standards-based classification.

### 3) Quantum Risk Scoring

| Feature / Capability | Expected Behavior (framework) | Status | Evidence | Notes / Gaps |
|---|---|---:|---|---|
| Deterministic scoring (0–100) | Deterministic risk score from evidence | ✅ | Weighted formula returns 0–100: [risk.service.ts](QuantumVaultMVP/backend/src/risk/risk.service.ts) | Deterministic.
| Risk level mapping | Map score to levels | ✅ | `determineRiskLevel`: [risk.service.ts](QuantumVaultMVP/backend/src/risk/risk.service.ts) | Implemented.
| Recalculation triggers | Recompute score on evidence/metadata changes | ⚠️ | Recalc on scan completion: [scan.processor.ts](QuantumVaultMVP/backend/src/scans/scan.processor.ts) and on metadata update: [assets.service.ts](QuantumVaultMVP/backend/src/assets/assets.service.ts) | No triggers on policy changes, wrapping/attestation results, or periodic re-evaluation.
| Evidence-based attribution | Provide evidence-backed factor attribution | ⚠️ | Factors computed in-memory: [risk.service.ts](QuantumVaultMVP/backend/src/risk/risk.service.ts) | Factors are not persisted/linked to evidence objects; attribution is not surfaced as a first-class evidence chain.

### 4) Asset Catalog & Inventory

| Feature / Capability | Expected Behavior (framework) | Status | Evidence | Notes / Gaps |
|---|---|---:|---|---|
| Assets table & metadata | Assets persisted with metadata | ⚠️ | Asset model + metadata JSON: [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma); list endpoint: [assets.controller.ts](QuantumVaultMVP/backend/src/assets/assets.controller.ts) | “Metadata” exists, but framework expects richer inventory constructs (env/tags) and UX to manage them.
| Environments & tags | First-class env/tag taxonomy | ❌ | No env/tag models in schema: [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma) | Missing.
| Status tracking | Track status across lifecycle | ✅ | `AssetStatus` + transitions in services: scan -> DISCOVERED [scan.processor.ts](QuantumVaultMVP/backend/src/scans/scan.processor.ts), ingest -> ASSESSED [assets.service.ts](QuantumVaultMVP/backend/src/assets/assets.service.ts), wrap -> WRAPPED_PQC [wrapping.service.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.service.ts), attest -> ATTESTED [attestation.service.ts](QuantumVaultMVP/backend/src/attestation/attestation.service.ts) | Implemented.
| Evidence linkage | Link evidence to assets | ✅ | Relations: `scanAssets`, `wrappingResults`, `attestations`: [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma) | Implemented.

### 5) PQC Wrapping (Remediation)

| Feature / Capability | Expected Behavior (framework) | Status | Evidence | Notes / Gaps |
|---|---|---:|---|---|
| PQC envelope encryption | Real PQC KEM + symmetric AEAD envelope | ⚠️ | AES-256-GCM implemented; PQC KEM explicitly “simulated”: [wrapping.service.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.service.ts) | Not real Kyber (random bytes used). This is a core MVP gap.
| Anchor/key lifecycle | Anchors with rotation and lifecycle | ⚠️ | Anchor create/rotate exists: [anchors.service.ts](QuantumVaultMVP/backend/src/anchors/anchors.service.ts) | Anchor keys are placeholders and not cryptographically used by wrapping.
| Secret ingestion | Ingest secrets to be wrapped | ⚠️ | Asset key material ingestion exists: [assets.controller.ts](QuantumVaultMVP/backend/src/assets/assets.controller.ts) | Only supports manual base64 key upload for an asset; no connector-based ingestion.
| Wrapping jobs | Async wrapping jobs | ✅ | BullMQ worker: [wrapping.processor.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.processor.ts); endpoints: [wrapping.controller.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.controller.ts) | Implemented.
| Status transitions | Asset/job status transitions | ✅ | Updates job + asset status: [wrapping.processor.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.processor.ts), [wrapping.service.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.service.ts) | Implemented.

### 6) Policies

| Feature / Capability | Expected Behavior (framework) | Status | Evidence | Notes / Gaps |
|---|---|---:|---|---|
| Scope definition | Define scope of a policy (asset subsets) | ⚠️ | `Policy.targetScope` exists: [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma) | `targetScope` is not used in evaluation; all assets are evaluated: [policies.service.ts](QuantumVaultMVP/backend/src/policies/policies.service.ts).
| Enforcement modes | Monitor vs enforce, etc. | ❌ | No enforcement mode fields or logic in schema/service | Missing.
| Policy-asset mapping | Link policies to assets | ✅ | `PolicyAsset` join + upsert in evaluation: [policies.service.ts](QuantumVaultMVP/backend/src/policies/policies.service.ts) | Implemented.
| Automated job generation | Generate wrapping jobs automatically from policies | ⚠️ | Manual bulk wrap endpoint exists: [wrapping.controller.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.controller.ts) | No automation on activation; no scheduler/eventing.

### 7) Dashboard & UX

| Feature / Capability | Expected Behavior (framework) | Status | Evidence | Notes / Gaps |
|---|---|---:|---|---|
| Login UX (pixel-match) | Pixel-perfect login UX | ⚠️ | Login page exists: [frontend/src/app/login/page.tsx](QuantumVaultMVP/frontend/src/app/login/page.tsx) | Cannot validate pixel-match without runtime screenshot comparison.
| Dark dashboard | Dark themed dashboard | ✅ | Dashboard styling: [frontend/src/app/dashboard/page.tsx](QuantumVaultMVP/frontend/src/app/dashboard/page.tsx) | Implemented.
| KPI cards | KPI cards for key metrics | ✅ | KPI cards render from `/dashboard/kpis`: [dashboard.service.ts](QuantumVaultMVP/backend/src/dashboard/dashboard.service.ts), [dashboard/page.tsx](QuantumVaultMVP/frontend/src/app/dashboard/page.tsx) | Implemented.
| Charts | Charts for trends/distribution | ✅ | Recharts used: [dashboard/page.tsx](QuantumVaultMVP/frontend/src/app/dashboard/page.tsx) | Implemented.
| Migration timeline | Migration timeline view | ⚠️ | API exists: [dashboard.controller.ts](QuantumVaultMVP/backend/src/dashboard/dashboard.controller.ts) | Frontend has API method but no confirmed UI usage (only referenced in [frontend/src/lib/api.ts](QuantumVaultMVP/frontend/src/lib/api.ts)).
| Drill-downs | Drill-down into assets/policies/evidence | ⚠️ | Single dashboard page with tabs: [dashboard/page.tsx](QuantumVaultMVP/frontend/src/app/dashboard/page.tsx) | Tabbed views exist, but drill-down flows beyond the single page are limited.

### 8) Attestation (Optional / Conditional)

| Feature / Capability | Expected Behavior (framework) | Status | Evidence | Notes / Gaps |
|---|---|---:|---|---|
| Blockchain integration | Anchor attestations on-chain | ⚠️ | Supports EVM or “dytallix” backend: [blockchain.service.ts](QuantumVaultMVP/backend/src/blockchain/blockchain.service.ts); Solidity contract exists: [QuantumVaultAttestation.sol](QuantumVaultMVP/contracts/contracts/QuantumVaultAttestation.sol) | E2E script does not validate attestation; Dytallix backend assumes external API contract.
| Attestation jobs | Asynchronous attestation jobs | ✅ | Attestation job creation + queue: [attestation.service.ts](QuantumVaultMVP/backend/src/attestation/attestation.service.ts) | Implemented.
| Transaction evidence | Store tx hashes and evidence | ⚠️ | Stores `txHash`, `blockNumber`, `chainId?`: [attestation.service.ts](QuantumVaultMVP/backend/src/attestation/attestation.service.ts) | Dytallix path returns limited status (`unknown`) for tx status.
| UI visibility | UI shows attestation status | ⚠️ | Dashboard includes “Attestations” tab: [dashboard/page.tsx](QuantumVaultMVP/frontend/src/app/dashboard/page.tsx) | Needs verification of completed UI flow and evidence display.

### 9) Platform & Delivery

| Feature / Capability | Expected Behavior (framework) | Status | Evidence | Notes / Gaps |
|---|---|---:|---|---|
| Docker / Compose | Full stack runnable via Compose | ✅ | Compose defines postgres/redis/vault/backend/frontend (+ optional geth): [infra/docker-compose.yml](QuantumVaultMVP/infra/docker-compose.yml) | Runnable.
| Migrations | DB migrations present and runnable | ❌ | No `prisma/migrations` directory in boundary; prisma folder contains only [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma) and [seed.ts](QuantumVaultMVP/backend/prisma/seed.ts) | `npx prisma migrate deploy` will fail without migrations.
| Environment config | Config templates and env management | ⚠️ | Backend has `.env.example` (present per file listing), frontend uses `NEXT_PUBLIC_API_URL` in compose | Needs hardening and documented production configuration.
| Docs | MVP docs exist | ✅ | [QuantumVaultMVP/README.md](QuantumVaultMVP/README.md), [docs/INSTALL.md](QuantumVaultMVP/docs/INSTALL.md), [docs/API.md](QuantumVaultMVP/docs/API.md), etc. | Docs exist but include claims that are not supported by code (see PQC wrapping).
| Acceptance tests | Automated acceptance tests cover end-to-end MVP | ⚠️ | [scripts/e2e.sh](QuantumVaultMVP/scripts/e2e.sh) | Script does not test key ingestion, wrapping, or attestation (despite README claiming it does).
| Client-deliverable packaging | Deliverable artifact for client deployment | ❌ | No `dist/` in `QuantumVaultMVP/` (per search) | No packaging/installer story for “scanner deployment” or “air-gapped”.

---

## C. Technical Debt & Blockers (Evidence-Based)

### Critical (blocks MVP claims)
- **No Prisma migrations**: `QuantumVaultMVP/backend/prisma` contains schema + seed only; no migrations directory. Evidence: [QuantumVaultMVP/backend/prisma](QuantumVaultMVP/backend/prisma).
- **PQC wrapping is simulated**: KEM ciphertext is random bytes; anchors are placeholder keys. Evidence: [wrapping.service.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.service.ts), [anchors.service.ts](QuantumVaultMVP/backend/src/anchors/anchors.service.ts).
- **No scanner deployment/air-gapped packaging**: only backend-in-container TLS scan; no client-side agent or offline bundle. Evidence: [tls-scanner.service.ts](QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts), absence of packaging artifacts.

### High
- **Connector framework is mostly not implemented**: only TLS scanning exists; other target types are dead fields. Evidence: [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma), [scan.processor.ts](QuantumVaultMVP/backend/src/scans/scan.processor.ts).
- **Policy evaluation is simplistic and ignores `targetScope`**: evaluates all assets; rule matching is exact equality only. Evidence: [policies.service.ts](QuantumVaultMVP/backend/src/policies/policies.service.ts).
- **PQC classification is placeholder**: string match against PQC names; not a usable compliance classifier. Evidence: [tls-scanner.service.ts](QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts).

### Medium
- **Acceptance test coverage is materially incomplete** vs claimed workflow. Evidence: [scripts/e2e.sh](QuantumVaultMVP/scripts/e2e.sh).
- **Migration timeline UI not wired** (API exists; UI usage not found). Evidence: [dashboard.controller.ts](QuantumVaultMVP/backend/src/dashboard/dashboard.controller.ts), [frontend/src/lib/api.ts](QuantumVaultMVP/frontend/src/lib/api.ts).

### Low
- **RBAC is implemented but artifact generation is absent** (framework expects generated RBAC/IAM/Vault policies). Evidence: RBAC guard/decorator exist but no generators.

---

## D. Alignment Scorecard (Reality Check)

| Category | % Complete | Confidence | Risk to MVP delivery |
|---|---:|---|---|
| 1. Onboarding & Connectivity | 25% | High | **Critical** (no wizard, no agent, no artifacts, no air-gap) |
| 2. Discovery & Evidence | 60% | Medium | High (TLS only; no diffing; PQC classification weak) |
| 3. Quantum Risk Scoring | 70% | High | Medium (score exists; attribution and triggers incomplete) |
| 4. Asset Catalog & Inventory | 55% | High | High (no env/tags; limited inventory depth) |
| 5. PQC Wrapping (Remediation) | 40% | High | **Critical** (simulated PQC) |
| 6. Policies | 45% | High | High (no enforcement modes; scope unused; automation missing) |
| 7. Dashboard & UX | 65% | Medium | Medium (UI exists; some flows not proven) |
| 8. Attestation (Optional) | 55% | Medium | Medium-High (depends on external chain/backend; limited proof) |
| 9. Platform & Delivery | 45% | High | **Critical** (no migrations; packaging absent; tests partial) |

---

## E. What Exists Today (Concrete)

End-to-end surfaces that exist in `QuantumVaultMVP/`:
- Auth + RBAC (JWT + roles guard): [QuantumVaultMVP/backend/src/auth](QuantumVaultMVP/backend/src/auth), [RolesGuard](QuantumVaultMVP/backend/src/auth/guards/roles.guard.ts)
- TLS scan target CRUD + async scan processing: [scans](QuantumVaultMVP/backend/src/scans)
- Evidence persistence for TLS scans: [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma)
- Deterministic risk scoring: [risk.service.ts](QuantumVaultMVP/backend/src/risk/risk.service.ts)
- Asset CRUD-ish (list/get/update metadata) + key-material ingestion to Vault: [assets](QuantumVaultMVP/backend/src/assets)
- Wrapping job orchestration + AES-GCM wrapping with simulated KEM: [wrapping](QuantumVaultMVP/backend/src/wrapping)
- Policy CRUD + evaluation + policy-asset mapping: [policies](QuantumVaultMVP/backend/src/policies)
- Dashboard KPIs + trends snapshots + migration timeline API: [dashboard](QuantumVaultMVP/backend/src/dashboard)
- Attestation job orchestration + blockchain recording (EVM or Dytallix): [attestation](QuantumVaultMVP/backend/src/attestation), [blockchain.service.ts](QuantumVaultMVP/backend/src/blockchain/blockchain.service.ts)
- A single-page Next.js UI for login + dashboard tabs: [QuantumVaultMVP/frontend/src/app](QuantumVaultMVP/frontend/src/app)

---

## F. What Is Partial vs Missing (Executive Take)

- The system is a **functional demo scaffold** for TLS-based discovery + DB persistence + dashboards.
- The MVP is **not aligned** with the framework on the most important claims: **client-network scanner deployment**, **air-gapped support**, **real PQC wrapping**, **migrations**, and **connector breadth**.

Next deliverables (generated separately):
- [QuantumVault_MVP_Gap_Analysis.md](QuantumVault_MVP_Gap_Analysis.md)
- [QuantumVault_MVP_Remediation_Plan.md](QuantumVault_MVP_Remediation_Plan.md)
- [QuantumVault_MVP_Timeline.md](QuantumVault_MVP_Timeline.md)
