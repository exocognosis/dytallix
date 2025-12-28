# QuantumVault MVP Gap Analysis (Evidence-Based)

Scope boundary: `QuantumVaultMVP/`.

Legend:
- ✅ Implemented
- ⚠️ Partial
- ❌ Missing

This is a **gap view** (what’s missing/partial) derived from the feature mapping in [QuantumVault_MVP_Status_Report.md](QuantumVault_MVP_Status_Report.md).

---

## Critical Gaps (Block MVP alignment)

1) **No Prisma migrations**
- ❌ Missing: `QuantumVaultMVP/backend/prisma/migrations` directory.
- Evidence: [QuantumVaultMVP/backend/prisma](QuantumVaultMVP/backend/prisma)
- Impact: Cannot reliably stand up/upgrade the database via normal Prisma deployment workflow.

2) **PQC wrapping is not real**
- ⚠️ Partial: AES-GCM wrapping exists, but PQC KEM is simulated and anchor keys are placeholders.
- Evidence: [QuantumVaultMVP/backend/src/wrapping/wrapping.service.ts](QuantumVaultMVP/backend/src/wrapping/wrapping.service.ts), [QuantumVaultMVP/backend/src/anchors/anchors.service.ts](QuantumVaultMVP/backend/src/anchors/anchors.service.ts)
- Impact: The “PQC Wrapping” claim fails the MVP framework requirement.

3) **No client-network scanner deployment / no air-gapped support**
- ❌ Missing: Deployable scanner agent and offline packaging.
- Evidence: scanning performed directly from backend: [QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts](QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts)
- Impact: Framework requirement for client-network deployment + air-gap is unfulfilled.

---

## Gap Matrix by Framework Area

### 1) Onboarding & Connectivity
- ❌ Client-network scanner deployment
- ❌ Air-gapped support
- ❌ Setup Wizard
- ⚠️ Connector framework (only TLS is implemented; other `TargetType` values are dead)
  - Evidence: [QuantumVaultMVP/backend/prisma/schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma), [QuantumVaultMVP/backend/src/scans/scan.processor.ts](QuantumVaultMVP/backend/src/scans/scan.processor.ts)
- ⚠️ Credential ingestion & secure storage
  - Implemented only for asset key-material: [QuantumVaultMVP/backend/src/assets/assets.service.ts](QuantumVaultMVP/backend/src/assets/assets.service.ts)
- ⚠️ Health checks & validation (service-level only)
- ❌ Artifact generation (RBAC/IAM/Vault policies)
- ⚠️ Automated first scan (manual trigger only)

### 2) Discovery & Evidence
- ✅ Real TLS scanning: [QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts](QuantumVaultMVP/backend/src/tls-scanner/tls-scanner.service.ts)
- ⚠️ Crypto evidence extraction (TLS cert evidence only)
  - Evidence persisted: [QuantumVaultMVP/backend/prisma/schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma)
- ⚠️ Scan history (exists) & ❌ Diffing (missing)
  - Evidence: [QuantumVaultMVP/backend/src/scans/scans.service.ts](QuantumVaultMVP/backend/src/scans/scans.service.ts)
- ✅ Asset catalog persistence: [schema.prisma](QuantumVaultMVP/backend/prisma/schema.prisma)
- ⚠️ PQC classification logic (placeholder)

### 3) Quantum Risk Scoring
- ✅ Deterministic scoring & risk level mapping: [QuantumVaultMVP/backend/src/risk/risk.service.ts](QuantumVaultMVP/backend/src/risk/risk.service.ts)
- ⚠️ Recalculation triggers (scan + metadata only)
- ⚠️ Evidence-based attribution (not persisted or evidence-linked)

### 4) Asset Catalog & Inventory
- ⚠️ Assets table & metadata (exists, but inventory depth is minimal)
- ❌ Environments & tags
- ✅ Status tracking
- ✅ Evidence linkage

### 5) PQC Wrapping (Remediation)
- ⚠️ PQC envelope encryption (KEM simulated)
- ⚠️ Anchor/key lifecycle (placeholder keys; not used cryptographically)
- ⚠️ Secret ingestion (manual upload only)
- ✅ Wrapping jobs
- ✅ Status transitions

### 6) Policies
- ⚠️ Scope definition (targetScope ignored)
- ❌ Enforcement modes
- ✅ Policy-asset mapping
- ⚠️ Automated job generation (manual bulk wrap; no automation)

### 7) Dashboard & UX
- ⚠️ Login UX (exists; pixel-match unverified)
- ✅ Dark dashboard
- ✅ KPI cards
- ✅ Charts
- ⚠️ Migration timeline (API exists; UI not confirmed)
- ⚠️ Drill-downs (single page tabs; limited depth)

### 8) Attestation (Optional)
- ⚠️ Blockchain integration (EVM + Dytallix; external dependency)
  - Evidence: [QuantumVaultMVP/backend/src/blockchain/blockchain.service.ts](QuantumVaultMVP/backend/src/blockchain/blockchain.service.ts)
- ✅ Attestation jobs
- ⚠️ Transaction evidence (limited tx status support for Dytallix backend)
- ⚠️ UI visibility (tab exists; flow completion unproven)

### 9) Platform & Delivery
- ✅ Docker/Compose
- ❌ Migrations
- ⚠️ Environment config (exists; not hardened)
- ✅ Docs
- ⚠️ Acceptance tests (incomplete vs claimed workflow)
- ❌ Client-deliverable packaging (no dist bundle)

---

## Non-Boundary Confusion Risk

There is significant QuantumVault-related code outside the MVP boundary (examples: [quantumvault](quantumvault), [dytallix-fast-launch/services/quantumvault-api](dytallix-fast-launch/services/quantumvault-api)). This creates ambiguity about what is actually shipped. For MVP delivery, enforce `QuantumVaultMVP/` as the sole product artifact boundary, or explicitly re-scope the boundary.
