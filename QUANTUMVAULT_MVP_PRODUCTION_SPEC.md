# QuantumVault MVP (Production) — Design & Implementation Specification

**Date:** 2025-12-14  
**Audience:** Engineering (backend, frontend, DevOps), Security, Product  
**Goal:** A production-grade platform that discovers non‑PQC crypto usage, computes quantum risk, wraps assets with PQC envelope encryption, and proves remediation with blockchain attestations.

> This spec is intentionally explicit: it defines concrete module boundaries, data model, APIs, workflows, crypto primitives, and deployment/security controls so a team can implement without re‑design.

---

## 1) Assumptions & High‑Level Architecture

### 1.1 Non‑negotiable MVP constraints

- **No mocks in the runtime path.** Scanners must connect to real endpoints; crypto must be performed by real PQC libraries; attestations must submit real blockchain transactions; persistence must be real DB.
- **Separation of concerns:** scanning, policy evaluation, wrapping, and attestation must be asynchronous jobs with durable state.
- **No secrets in logs:** key material, vault tokens, DB creds, signing keys, ciphertext blobs are never logged.

### 1.2 Implementation choices (explicit)

These choices are optimized for production correctness and maintainability in a polyglot repo (Node + Rust already present).

**Backend (API + control plane)**
- **Language/framework:** TypeScript (Node 20+) with **Fastify** (or NestJS if your team strongly prefers) for REST.
- **ORM/migrations:** **Prisma** (or Drizzle + SQL migrations). Migrations are mandatory.
- **Job queue:** **BullMQ + Redis** (or RabbitMQ) for scan/wrap/attest pipelines.
- **Auth:** OIDC (preferred) via an identity provider (Okta/AzureAD/Auth0) OR MVP fallback: email+password with Argon2id and secure sessions/JWT.
- **RBAC:** ADMIN, SECURITY_ENGINEER, VIEWER.

**Scanning engine**
- Runs as a worker service consuming scan jobs.
- Protocol scanners use real network calls:
	- TLS handshake scanning (cert chain + negotiated cipher suite + signature/key algorithms).
	- Optional: HTTPS endpoint metadata (HSTS, protocol versions), DB TLS checks (where credentials exist).

**Crypto service (PQC)**
- **Dedicated Rust service** exposing gRPC/HTTP to the control plane.
- **PQC libraries:** prefer **liboqs** (OpenQuantumSafe) bindings for ML‑KEM/ML‑DSA; if not available in target environment, use maintained Rust crates (already present in repo): `pqcrypto-kyber`, `pqcrypto-dilithium`, `pqcrypto-falcon`.
- **Symmetric:** AES‑256‑GCM (FIPS-friendly) or XChaCha20‑Poly1305 (if you need nonce-misuse resistance). Pick one per environment; this spec defaults to **AES‑256‑GCM**.
- **KDF:** HKDF‑SHA‑256.

**Secure storage / vault**
- Production: **HashiCorp Vault** (KV v2 + optional Transit) for storing:
	- anchor root private keys (wrapped/locked down)
	- wrapped asset blobs and capsules
	- credentials to access scanned systems (where required)
- DB stores only **references**, hashes, metadata, and statuses.

**Blockchain attestation**
- MVP uses an **EVM-compatible chain** for attestations (dev/stage: Sepolia/Amoy; prod: Ethereum L2 or consortium EVM).
- Client: **ethers.js**.
- Smart contract: `QuantumVaultAttestationRegistry` with `recordAttestation(...)`.
- A pluggable adapter can also support the repo’s existing Dytallix chain anchoring, but the MVP contract interface is EVM-first.

**Frontend**
- React SPA dashboard, authenticated, consuming REST API.
- Pages exactly per this spec:
	- Scan & Assets
	- Encryption Policies
	- Anchors & Attestation
	- Organization Risk Profile
	- Admin (users, integrations) — minimal

**Persistence**
- PostgreSQL 15+.
- Database migrations required.

### 1.3 High-level components

```
┌──────────────────────────┐
│        Frontend SPA      │
│  Dashboards + Forms      │
└─────────────┬────────────┘
							│ HTTPS
┌─────────────▼────────────┐
│  QuantumVault API (TS)   │
│  Auth/RBAC + REST        │
│  Asset/Policy/Anchor     │
│  Wrapping/Attestation    │
└─────────────┬────────────┘
							│ enqueue jobs
┌─────────────▼────────────┐
│ Queue (Redis/BullMQ)     │
└───────┬─────────┬────────┘
				│         │
┌───────▼───┐ ┌───▼────────┐
│ Scan      │ │ Wrap/Orch   │
│ Worker    │ │ Worker      │
│ (network) │ │ (vault+PQC) │
└───────┬───┘ └───┬────────┘
				│         │
				│         │ gRPC/HTTP
				│   ┌─────▼───────────┐
				│   │ PQC Crypto Svc   │
				│   │ (Rust + liboqs)  │
				│   └─────┬───────────┘
				│         │
				│         │
┌───────▼─────────▼─────────┐
│ PostgreSQL (system-of-rec) │
└───────┬─────────┬─────────┘
				│         │
┌───────▼───┐ ┌───▼────────┐
│ Vault      │ │ EVM chain   │
│ (secrets)  │ │ + Contract  │
└────────────┘ └────────────┘
```

### 1.4 Environment model

- **DEV**: local docker-compose for API, worker, Postgres, Redis, Vault (dev mode), and EVM testnet RPC.
- **STAGE**: dedicated Postgres/Redis/Vault; EVM testnet; production-like configs.
- **PROD**: HA Postgres, Redis, Vault; EVM network; strict secrets, auditing, and least privilege.

---

## 2) Data Model & Entities (Relational)

This section defines the canonical DB schema. It is compatible with the entity list you provided, with minor additions required for production operation (targets, jobs, audit).

### 2.1 Core tables

#### `assets`
- `id` UUID PK
- `name` TEXT NOT NULL
- `type` ENUM (`TLS_CERT`, `DATABASE`, `API_ENDPOINT`, `FILE_SHARE`, `KEY`, `APPLICATION`, `PROTOCOL`, `OTHER`) NOT NULL
- `location` TEXT NOT NULL (hostname/URI/path)
- `environment` ENUM (`PROD`, `STAGE`, `DEV`, `OTHER`) NOT NULL
- `crypto_algorithms_in_use` JSONB NOT NULL DEFAULT `[]`
	- each entry: `{ layer, protocol?, algorithm, key_length?, curve?, signature_alg?, kem?, symmetric?, mode?, negotiated_cipher? }`
- `pqc_compliance` ENUM (`COMPLIANT`, `NON_COMPLIANT`, `UNKNOWN`) NOT NULL
- `quantum_risk_score` INT NOT NULL DEFAULT 0
- `risk_level` ENUM (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) NOT NULL
- `business_criticality` ENUM (`LOW`, `MEDIUM`, `HIGH`) NOT NULL DEFAULT `MEDIUM`
- `data_sensitivity` ENUM (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`) NOT NULL DEFAULT `INTERNAL`
- `exposure` ENUM (`INTERNET_FACING`, `INTERNAL`, `PARTNER`) NOT NULL DEFAULT `INTERNAL`
- `last_scan_timestamp` TIMESTAMPTZ NULL
- `status` ENUM (`AT_RISK`, `IN_REMEDIATION`, `WRAPPED_PQC`, `ATTESTED`) NOT NULL DEFAULT `AT_RISK`
- `wrapper_enabled` BOOLEAN NOT NULL DEFAULT FALSE
- `wrapper_algorithm` TEXT NULL (e.g., `ML-KEM-1024+HKDF-SHA256+AES-256-GCM`)
- `wrapper_anchor_id` UUID NULL FK → `encryption_anchors.id`
- `wrapper_last_updated_at` TIMESTAMPTZ NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

Indexes:
- `(environment, type, pqc_compliance, risk_level, status)`
- `(last_scan_timestamp)`

#### `asset_key_material`
- `id` UUID PK
- `asset_id` UUID FK → `assets.id` ON DELETE CASCADE
- `key_type` ENUM (`PRIVATE_KEY`, `API_SECRET`, `DB_CREDENTIAL`, `CONFIG_BLOB`, `OTHER`) NOT NULL
- `storage_reference` TEXT NOT NULL (Vault reference to plaintext or existing protected representation)
- `wrapped_pqc_key_reference` TEXT NULL (Vault reference to PQC-wrapped blob)
- `last_wrapped_at` TIMESTAMPTZ NULL
- `is_pqc_wrapped` BOOLEAN NOT NULL DEFAULT FALSE
- `algorithm_details` JSONB NOT NULL DEFAULT `{}`

#### `scan_targets`
Defines what the scanning engine will touch.
- `id` UUID PK
- `name` TEXT NOT NULL
- `target` TEXT NOT NULL (e.g., `example.com:443`, `https://api.example.com`, `postgres://...`)
- `target_type` ENUM (`TLS_ENDPOINT`, `HTTPS_URL`, `POSTGRES`, `MYSQL`, `MONGODB`, `CUSTOM`) NOT NULL
- `environment` ENUM (`PROD`, `STAGE`, `DEV`, `OTHER`) NOT NULL
- `auth_reference` TEXT NULL (Vault reference to credentials for authenticated scans)
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at`, `updated_at`

#### `scans`
- `id` UUID PK
- `triggered_by_user_id` UUID NULL FK → `users.id`
- `scan_type` ENUM (`DISCOVERY`, `RESCAN`, `POLICY_VALIDATION`) NOT NULL
- `started_at` TIMESTAMPTZ NOT NULL
- `completed_at` TIMESTAMPTZ NULL
- `number_of_assets_scanned` INT NOT NULL DEFAULT 0
- `number_of_non_pqc_assets_found` INT NOT NULL DEFAULT 0
- `status` ENUM (`RUNNING`, `SUCCESS`, `FAILED`, `PARTIAL`) NOT NULL
- `error_message` TEXT NULL

#### `scan_assets`
- `id` UUID PK
- `scan_id` UUID FK → `scans.id` ON DELETE CASCADE
- `asset_id` UUID FK → `assets.id` ON DELETE CASCADE
- `scan_result` ENUM (`NEW`, `UPDATED`, `UNCHANGED`) NOT NULL
- `details` JSONB NOT NULL DEFAULT `{}`

#### `encryption_policies`
- `id` UUID PK
- `name` TEXT NOT NULL
- `description` TEXT NULL
- `scope_type` ENUM (`ALL_ASSETS`, `BY_TYPE`, `BY_ENVIRONMENT`, `BY_TAG`, `BY_RISK_LEVEL`, `CUSTOM_QUERY`) NOT NULL
- `scope_definition` JSONB NOT NULL
- `required_pqc_algorithms` JSONB NOT NULL
	- example: `{ "kem": ["ML-KEM-1024"], "symmetric": ["AES-256-GCM"], "signature": ["ML-DSA-65"] }`
- `transition_strategy` ENUM (`HYBRID`, `PQC_ONLY`) NOT NULL
- `enforcement_mode` ENUM (`MONITOR_ONLY`, `ENFORCE`) NOT NULL
- `created_by_user_id` UUID NULL FK → `users.id`
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at`, `updated_at`

#### `policy_assets`
- `id` UUID PK
- `policy_id` UUID FK → `encryption_policies.id` ON DELETE CASCADE
- `asset_id` UUID FK → `assets.id` ON DELETE CASCADE
- `is_compliant` BOOLEAN NOT NULL
- `last_evaluated_at` TIMESTAMPTZ NOT NULL

Unique:
- `(policy_id, asset_id)`

#### `encryption_anchors`
- `id` UUID PK
- `name` TEXT NOT NULL
- `description` TEXT NULL
- `anchor_type` ENUM (`ROOT_OF_TRUST`, `KEY_HIERARCHY`, `POLICY_BUNDLE`) NOT NULL
- `associated_policy_ids` JSONB NOT NULL DEFAULT `[]`
- `root_public_key_reference` TEXT NOT NULL (Vault reference)
- `root_private_key_reference` TEXT NOT NULL (Vault reference; access restricted)
- `root_key_algorithm` TEXT NOT NULL (e.g., `ML-KEM-1024`)
- `is_active` BOOLEAN NOT NULL DEFAULT FALSE
- `environment` ENUM (`PROD`, `STAGE`, `DEV`, `OTHER`) NOT NULL
- `created_by_user_id` UUID NULL FK → `users.id`
- `created_at`, `updated_at`

Constraint:
- exactly one active anchor per `environment` (enforced in app logic + unique partial index).

#### `blockchain_attestation_jobs`
- `id` UUID PK
- `created_by_user_id` UUID NULL FK → `users.id`
- `anchor_id` UUID FK → `encryption_anchors.id`
- `filters` JSONB NOT NULL
- `total_assets` INT NOT NULL
- `succeeded_count` INT NOT NULL DEFAULT 0
- `failed_count` INT NOT NULL DEFAULT 0
- `status` ENUM (`PENDING`, `RUNNING`, `COMPLETED`, `FAILED`) NOT NULL
- `blockchain_network` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL
- `completed_at` TIMESTAMPTZ NULL

#### `blockchain_attestations`
- `id` UUID PK
- `job_id` UUID FK → `blockchain_attestation_jobs.id` ON DELETE CASCADE
- `asset_id` UUID FK → `assets.id`
- `anchor_id` UUID FK → `encryption_anchors.id`
- `attestation_status` ENUM (`PENDING`, `SUCCESS`, `FAILED`) NOT NULL
- `blockchain_tx_id` TEXT NULL
- `attested_at` TIMESTAMPTZ NULL
- `error_message` TEXT NULL
- `payload_hash` TEXT NOT NULL

Indexes:
- `(asset_id, attestation_status)`
- `(job_id)`

#### `organization_risk_snapshots`
- `id` UUID PK
- `snapshot_timestamp` TIMESTAMPTZ NOT NULL
- `total_assets` INT NOT NULL
- `total_non_pqc_assets` INT NOT NULL
- `total_wrapped_pqc_assets` INT NOT NULL
- `total_attested_assets` INT NOT NULL
- `high_risk_assets_count` INT NOT NULL
- `medium_risk_assets_count` INT NOT NULL
- `low_risk_assets_count` INT NOT NULL
- `critical_risk_assets_count` INT NOT NULL
- `policy_coverage_percent` NUMERIC NOT NULL
- `assets_out_of_policy` INT NOT NULL
- `comments` TEXT NULL

#### `users`
- `id` UUID PK
- `email` TEXT UNIQUE NOT NULL
- `name` TEXT NOT NULL
- `role` ENUM (`ADMIN`, `VIEWER`, `SECURITY_ENGINEER`) NOT NULL
- auth columns depend on strategy:
	- OIDC: `external_id` TEXT UNIQUE, no password
	- Local auth: `password_hash` TEXT NOT NULL
- `created_at`, `updated_at`

### 2.2 Audit logging (required)

#### `audit_log_events`
- `id` UUID PK
- `timestamp` TIMESTAMPTZ NOT NULL
- `actor_user_id` UUID NULL
- `action` TEXT NOT NULL (e.g., `SCAN_STARTED`, `POLICY_UPDATED`, `ANCHOR_ROTATED`, `ASSET_WRAPPED`, `ATTESTATION_SENT`)
- `entity_type` TEXT NOT NULL
- `entity_id` UUID NULL
- `metadata` JSONB NOT NULL

---

## 3) Scanning & Cataloguing (Non‑PQC Discovery)

### 3.1 Scan inputs

- A scan is launched against one of:
	- selected `scan_targets` (preferred)
	- ad-hoc targets list (uploaded) which are persisted into `scan_targets` if user chooses

### 3.2 Scanner plugins (MVP scope)

**MVP scanners (must be real network calls):**
1. **TLS Endpoint Scanner**
	 - Connects to `host:port` using TLS.
	 - Captures:
		 - negotiated TLS version (TLS1.2 / TLS1.3)
		 - cipher suite
		 - server cert chain
		 - leaf public key algorithm and size (RSA bits, ECDSA curve)
		 - certificate signature algorithm (e.g., `sha256WithRSAEncryption`, `ecdsa-with-SHA256`)

2. **HTTPS URL Scanner**
	 - Performs HTTPS request and also evaluates TLS handshake details.
	 - Captures:
		 - HSTS present
		 - ALPN (h2/http1.1)
		 - redirect behavior

**Optional (only if credentials exist):**
- Postgres scanner: attempt TLS connection; check `ssl` requirement; capture server cert and negotiated TLS.

### 3.3 Algorithm classification mapping

Maintain a versioned mapping file in the backend configuration:
- `NON_PQC` includes: `RSA`, `ECDSA`, `ECDH`, `Ed25519`, `X25519` (classical), classical TLS ciphers.
- `PQC` includes: `ML-KEM-*`, `ML-DSA-*`, `FALCON-*`, `SPHINCS+`.
- `HYBRID` includes: `X25519+ML-KEM-768`, etc (explicit list).

Classification rules:
- If any layer uses only classical key exchange/signatures for confidentiality/integrity → asset is `NON_COMPLIANT`.
- If hybrid is negotiated → `COMPLIANT` (but flagged `hybrid=true` and risk base differs).
- Unknown/parse failures → `UNKNOWN`.

### 3.4 Scan run workflow (functional)

1. UI → `POST /api/v1/scans` with `scanType` and target IDs/targets.
2. API creates `scans` record with `RUNNING`.
3. API enqueues `scan:execute` job with scan ID.
4. Scan worker:
	 - iterates targets with timeouts + per-target error isolation
	 - for each target:
		 - executes scanner plugin
		 - **upserts** an `assets` record (stable identity = environment + location + type)
		 - writes `scan_assets` record
		 - recomputes quantum risk score (Section 4)
5. Worker updates `scans` counts and status (SUCCESS/PARTIAL/FAILED).
6. UI polls `GET /api/v1/scans/{id}`.

### 3.5 Error handling requirements

- Per-target failures are recorded in `scan_assets.details.error` and do **not** abort the entire scan.
- All network connections must have configurable:
	- connect timeout
	- handshake timeout
	- overall timeout
- The worker must use concurrency limits (e.g., 20 targets max concurrently) to avoid network collapse.

---

## 4) Quantum Risk Scoring Algorithm

### 4.1 Deterministic scoring

Compute `quantum_risk_score ∈ [0,100]` and `risk_level`:
- 0–24: LOW
- 25–49: MEDIUM
- 50–74: HIGH
- 75–100: CRITICAL

### 4.2 Inputs

- `pqc_compliance`
- `crypto_algorithms_in_use`
- `exposure`
- `data_sensitivity`
- `business_criticality`
- `last_scan_timestamp`
- optional modifier: if `wrapper_enabled=true`, decrease base.

### 4.3 Base algorithm score

- If `pqc_compliance == COMPLIANT`:
	- `base_algo = 10`
- Else if hybrid detected:
	- `base_algo = 30`
- Else (`NON_COMPLIANT` or `UNKNOWN`):
	- `base_algo = 60`

If `wrapper_enabled == true` and `wrapper_algorithm` is present:
- reduce base by 20 (floor at 0): `base_algo = max(0, base_algo - 20)`

### 4.4 Weights

Exposure:
- INTERNET_FACING: +25
- PARTNER: +15
- INTERNAL: +5

Sensitivity:
- RESTRICTED: +25
- CONFIDENTIAL: +15
- INTERNAL: +8
- PUBLIC: +0

Business criticality:
- HIGH: +20
- MEDIUM: +10
- LOW: +0

Staleness (days since last scan):
- ≤7: +0
- ≤30: +5
- ≤90: +10
- >90: +15

### 4.5 Computation

$$score = clamp_{0..100}(base\_algo + exposure + sensitivity + criticality + staleness)$$

Map to `risk_level` by range.

### 4.6 When recomputed

- after each scan
- after user edits asset metadata (exposure, sensitivity, criticality)
- after wrapping completes

---

## 5) PQC Encryption Policy Management Dashboard

### 5.1 Data + evaluation semantics

A policy defines:
- scope: which assets it applies to
- required algorithms: what wrapping must use
- enforcement mode:
	- MONITOR_ONLY: evaluate and report only
	- ENFORCE: eligible assets can be wrapped via UI or scheduled jobs

Policy evaluation produces `policy_assets` rows.

### 5.2 Policy scope definition (supported operators)

`scope_definition` supports these keys (MVP):
- `type`: array of asset types
- `environment`: array
- `minRiskLevel`: one of LOW/MEDIUM/HIGH/CRITICAL
- `pqcCompliance`: array (optional)
- `status`: array (optional)

`CUSTOM_QUERY` scope_type allows a restricted SQL-like DSL (MVP: disabled by default; enable only in trusted environments).

### 5.3 List view requirements

Columns:
- name, scope_type, enforcement_mode, is_active, created_by, updated_at
- assets_in_scope (computed)
- policy_coverage_percent = assets_in_scope / total_assets * 100

Filters:
- enforcement_mode, scope_type, active/inactive, date range

### 5.4 Detail view requirements

Editable:
- name, description
- scope form (guided) + advanced JSON editor
- required_pqc_algorithms
- transition_strategy
- enforcement_mode
- is_active

Metrics:
- total assets in scope
- non-compliant assets in scope
- already wrapped assets in scope

Actions:
- save → triggers evaluation
- “Evaluate Policy” button
- “Apply PQC Wrapping” button (only if ENFORCE)

---

## 6) Encryption Anchor Selection & Blockchain Attestation Dashboard

### 6.1 Anchor management

An Encryption Anchor is the root-of-trust for wrapping and attestation.

**Key requirements**
- Key generation uses the real PQC service.
- Root keys are stored in Vault; DB stores only references.
- Exactly one anchor is active per environment.

**Actions**
- Create anchor:
	- choose algorithm (default: `ML-KEM-1024`)
	- crypto service generates keypair
	- keys stored in Vault
	- DB stores `root_public_key_reference`, `root_private_key_reference`
- Activate anchor:
	- sets this anchor `is_active=true` and deactivates others for environment
- Rotate anchor keys:
	- generates new keypair, updates vault references
	- logs audit event `ANCHOR_ROTATED`

### 6.2 Attestation batch UX

Controls:
- select active anchor (default)
- filter assets by risk level, environment, type, status, policy
- select assets (multi-select) or “select all filtered” with confirmation

Start attestation:
- API creates `blockchain_attestation_jobs` and `blockchain_attestations`
- enqueues `attestation:execute` job

Job drilldown:
- per-asset result rows with tx hash, status, error

---

## 7) Organization Quantum Risk Profile Dashboard (KPIs)

### 7.1 KPIs (must be computed from real DB)

- total assets
- total non‑PQC assets (`pqc_compliance IN (NON_COMPLIANT, UNKNOWN)`)
- counts by risk_level
- total wrapped
- total attested
- percentages wrapped/attested
- active policies count
- policy coverage percent
- assets out of policy

### 7.2 Trends

- time series from `organization_risk_snapshots`
- snapshots are created:
	- after each scan completion
	- after batch wrap completion
	- after attestation job completion

### 7.3 Drill-down navigation

- clicking KPI navigates to Assets list with filters applied.

---

## 8) Wrapping / PQC Encryption Workflow (Real Crypto)

### 8.1 Wrapping overview

QuantumVault does not replace an asset’s native crypto; it wraps **asset material** (keys/secrets/config blobs) using PQC KEM + symmetric envelope encryption.

### 8.2 Crypto construction (normative)

**Algorithms**
- KEM: `ML-KEM-1024` (Kyber equivalent)
- KDF: HKDF-SHA-256
- Symmetric: AES-256-GCM

**Envelope format** (stored in Vault as a single JSON blob):
```json
{
	"version": "qv-wrap-v1",
	"kem": "ML-KEM-1024",
	"kdf": "HKDF-SHA-256",
	"aead": "AES-256-GCM",
	"anchor_id": "...",
	"policy_id": "...",
	"encapsulated_key": "<hex capsule>",
	"iv": "<hex>",
	"ciphertext": "<base64>",
	"tag": "<included in ciphertext if using WebCrypto; else explicit>",
	"aad": {
		"asset_id": "...",
		"asset_key_material_id": "...",
		"created_at": "..."
	},
	"hash": "<sha256 of canonical envelope json>"
}
```

**AAD policy**
- AAD MUST include `asset_id`, `asset_key_material_id`, `anchor_id`, `policy_id` to prevent swapping.

### 8.3 Wrapping job selection logic

Eligible assets for a policy wrap batch:
- policy is active AND enforcement_mode == ENFORCE
- `policy_assets.is_compliant == false`
- asset has at least one `asset_key_material` record

### 8.4 Wrapping workflow (per asset)

1. Resolve anchor:
	 - select active anchor for asset environment (or specified anchor)
2. Resolve policy:
	 - from request or policy batch
3. For each `asset_key_material`:
	 - fetch plaintext from Vault via `storage_reference`
	 - call PQC crypto service to:
		 - encapsulate (KEM) to anchor public key
		 - derive symmetric key via HKDF
		 - AEAD encrypt plaintext with AAD
	 - store envelope blob in Vault; return `wrapped_pqc_key_reference`
	 - update `asset_key_material.is_pqc_wrapped=true`, set `last_wrapped_at`
4. Update asset:
	 - `wrapper_enabled=true`
	 - `wrapper_algorithm=...`
	 - `wrapper_anchor_id=...`
	 - `wrapper_last_updated_at=now()`
	 - `status=WRAPPED_PQC`
	 - recompute risk score (Section 4)

### 8.5 Integration artifacts

MVP produces artifacts as downloadable config bundles (no extra UI beyond “Download config” on asset detail):
- a JSON file containing:
	- vault references (wrapped blob ref)
	- required runtime parameters (anchor public key ref, algorithm suite)
	- instructions for a sidecar/decryptor to fetch from Vault

---

## 9) API Design & UX Flows (REST)

All endpoints are versioned under `/api/v1`.

### 9.1 Auth

- `POST /api/v1/auth/login` (only if local auth enabled)
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`

Authorization: bearer access token; refresh token via httpOnly secure cookie.

### 9.2 Assets

- `GET /api/v1/assets` (pagination + filters)
- `GET /api/v1/assets/{id}`
- `PATCH /api/v1/assets/{id}` (metadata edits: exposure/sensitivity/criticality)
- `POST /api/v1/assets/{id}/wrap` body `{ policyId?, anchorId? }`

### 9.3 Scan targets and scans

- `GET /api/v1/scan-targets`
- `POST /api/v1/scan-targets`
- `PATCH /api/v1/scan-targets/{id}`
- `POST /api/v1/scans` body `{ scanType, targetIds?: string[], targets?: string[] }`
- `GET /api/v1/scans`
- `GET /api/v1/scans/{id}`

### 9.4 Policies

- `POST /api/v1/policies`
- `GET /api/v1/policies`
- `GET /api/v1/policies/{id}`
- `PATCH /api/v1/policies/{id}`
- `POST /api/v1/policies/{id}/evaluate`

### 9.5 Anchors

- `POST /api/v1/anchors`
- `GET /api/v1/anchors`
- `GET /api/v1/anchors/{id}`
- `PATCH /api/v1/anchors/{id}`
- `POST /api/v1/anchors/{id}/activate`
- `POST /api/v1/anchors/{id}/rotate-keys`

### 9.6 Wrapping batch

- `POST /api/v1/wrapping/apply` body `{ policyId, filter? }`
- `GET /api/v1/wrapping/jobs` (optional) or reuse generic jobs endpoint

### 9.7 Attestations

- `POST /api/v1/attestations/jobs` body `{ anchorId, assetIds?, filters? }`
- `GET /api/v1/attestations/jobs`
- `GET /api/v1/attestations/jobs/{id}`
- `GET /api/v1/attestations` (filters)

### 9.8 Dashboards

- `GET /api/v1/dashboard/organization-risk`
- `GET /api/v1/dashboard/risk-trends`

### 9.9 UX flows (exact MVP)

Flow A: Run scan → review non-PQC
- Start scan from Scan & Assets
- Poll scan
- View filtered non-PQC assets

Flow B: Create policy → evaluate scope
- Create policy
- Auto evaluation
- View assets in scope

Flow C: Wrap assets
- From policy detail: apply wrapping batch
- Show progress
- Asset statuses update to WRAPPED_PQC

Flow D: Create/activate anchor → attest
- Create anchor (keys generated)
- Activate anchor
- Filter WRAPPED_PQC assets
- Start attestation job
- Show tx hashes

Flow E: Org risk profile
- view KPIs and trends
- drill down to assets list

---

## 10) Blockchain Attestation (Real Transactions)

### 10.1 Attestation payload (normative)

For each asset, compute a canonical payload:
```json
{
	"schema": "qv-attestation-v1",
	"asset_id": "uuid",
	"asset_location_hash": "keccak256(location)",
	"anchor_id": "uuid",
	"policy_ids": ["..."],
	"risk_level": "HIGH",
	"risk_score": 72,
	"wrapper_algorithm": "ML-KEM-1024+HKDF-SHA256+AES-256-GCM",
	"wrapped": true,
	"timestamp": "2025-12-14T00:00:00Z"
}
```
Then compute `payload_hash = keccak256(canonical_json)`.

### 10.2 Smart contract interface

`recordAttestation(bytes32 assetIdHash, bytes32 anchorIdHash, uint8 riskLevel, bytes32 payloadHash)`
- Emits event `Attested(assetIdHash, anchorIdHash, riskLevel, payloadHash, timestamp, txSender)`

### 10.3 Transaction submission

- Attestation worker uses ethers.js with a dedicated hot wallet stored in Vault.
- Waits for N confirmations (configurable, default 1 for testnets, 5 for prod).

### 10.4 DB updates

- On success:
	- `blockchain_attestations.attestation_status=SUCCESS`
	- `blockchain_tx_id=txHash`, `attested_at=now()`
	- if `assets.status == WRAPPED_PQC`, set to `ATTESTED`
- On failure:
	- mark FAILED and store sanitized error message

---

## 11) Security, Compliance, and Deployment

### 11.1 Security controls

**Transport security**
- All external endpoints over TLS.
- Internal service-to-service mTLS recommended for prod.

**Secrets**
- Vault is the only source of truth for:
	- anchor private keys
	- blockchain signer private key
	- scan credentials
	- wrapped blobs
- DB contains references only.

**RBAC**
- VIEWER: read-only dashboards
- SECURITY_ENGINEER: scans, evaluate policies, initiate wrapping
- ADMIN: all actions + user management + anchor rotation

**Audit**
- Every state-changing operation writes to `audit_log_events`.
- Include request id / correlation id.

**Input validation**
- Strict schema validation (zod/valibot) on all request bodies.
- SSRF mitigation for remote URL scanning:
	- allowlists, DNS pinning, block link-local/metadata IP ranges.

**Rate limiting**
- Login and job-start endpoints rate-limited.

### 11.2 Compliance considerations

- Encryption at rest: Postgres disk encryption + Vault for secret material.
- Data minimization: store only required metadata.
- Retention: configurable retention policy for scans/jobs/audit logs.

### 11.3 Deployment model

**Containers**
- `quantumvault-api`
- `quantumvault-worker-scan`
- `quantumvault-worker-wrap`
- `quantumvault-worker-attest`
- `pqc-crypto-service` (Rust)
- `postgres`, `redis`, `vault`

**Config (env vars, examples)**
- `DATABASE_URL`
- `REDIS_URL`
- `VAULT_ADDR`, `VAULT_TOKEN` (prod uses Kubernetes auth/approle)
- `PQC_SERVICE_URL`
- `EVM_RPC_URL`, `EVM_CHAIN_ID`, `ATTESTATION_CONTRACT_ADDRESS`
- `ATTESTATION_SIGNER_VAULT_REF`
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (if OIDC)

**Observability**
- structured logs (JSON)
- metrics: scan durations, wrap success rate, attestation latency, queue depth

---

## 12) Acceptance Criteria Mapping

This section maps the provided acceptance criteria to implementation checkpoints.

1) Discovery
- TLS scanner performs real handshake and extracts cert/public-key and signature algorithms.
- Assets upserted with correct `crypto_algorithms_in_use` and `pqc_compliance`.
- Scan and scan_assets persisted.

2) Risk scoring
- Deterministic score + level; changes to metadata alter score.

3) Policies and wrapping
- CRUD policy + evaluation updates `policy_assets`.
- Wrapping uses real PQC KEM + AEAD; wrapped blobs stored in Vault.
- Asset wrapper fields updated and risk decreases.

4) Anchors and attestation
- Create anchor generates real PQC keys and stores in Vault.
- Attestation submits real EVM tx and records tx hash.

5) Org risk dashboard
- KPIs computed from DB; trends from snapshots.
- Drilldowns filter correctly.

6) End-to-end
- New admin can run scan → define policy → wrap → create/activate anchor → attest → see KPIs improve.

---

## 13) Notes on Repo Alignment (Dytallix)

This repository already contains a “QuantumVault v2” proof/anchoring workflow in dytallix-fast-launch/services/quantumvault-api focused on file proofs and blockchain anchoring.

- That existing service can remain as a separate product surface (proof/certificate).
- The MVP described in this spec is the **enterprise posture management + wrapping + attestation** system.
- If desired, the existing proof anchoring endpoints can be reused as a secondary attestation adapter, but the MVP’s primary attestation target is the EVM contract described above.

---

## Appendix A — Minimal rollout plan (implementation sequencing)

1. Implement DB schema + migrations + auth/RBAC
2. Implement scan targets + TLS scanner + assets list
3. Implement risk scoring + org dashboard KPIs (no trends)
4. Implement policies + evaluation
5. Implement anchors + Vault integration + crypto service
6. Implement wrapping workflow
7. Implement EVM contract + attestation jobs
8. Add snapshots + trend charts
