# QuantumVault Internal Secure Access

This document describes the production-facing access-control path implemented in `QuantumVaultMVP`. It extends the existing ingress pipeline and operates directly on `PipelineAsset` records, stored PQC envelopes, existing anchor keys, and the blockchain attestation subsystem.

## Runtime Components

- `backend/src/auth/enterprise-identity.service.ts`
  Validates enterprise JWTs against JWKS, maps Azure AD / Okta / AD-backed claims into QuantumVault user/session attributes, and captures device and network context from request headers.
- `backend/src/access/asset-registry.service.ts`
  Exposes the ingress-produced asset registry with classification, lifecycle, encryption, legal-hold, and access-history metadata.
- `backend/src/access/access-policy.service.ts`
  Enforces the internal classification matrix for clearance, role allowlists, department scope, project scope, MFA, step-up, device posture, network zone, legal hold, and concurrent-session limits.
- `backend/src/access/access.service.ts`
  Creates access requests, opens approval records when required, derives content keys from the stored PQC envelope, re-wraps content keys for a session, and issues short-lived session JWTs.
- `backend/src/access/audit-ledger.service.ts`
  Builds a signed, hash-chained audit ledger and queues selected event proofs for asynchronous blockchain anchoring through the existing blockchain client.
- `backend/src/access/access-audit.processor.ts`
  BullMQ worker for queue-backed access-ledger anchoring.
- `backend/src/storage/object-storage.service.ts`
  Writes and reads encrypted payloads from the configured filesystem or S3-compatible backend.
- `backend/src/monitoring/monitoring.controller.ts`
  Exposes Prometheus metrics and runtime health for internal observability systems.
- `frontend/src/app/dashboard/access/page.tsx`
  Internal access dashboard for policy posture, asset discovery, request submission, active sessions, and audit visibility.

## Data Model

The Prisma schema adds internal secure-access primitives on top of the existing pipeline registry:

- `PipelineAsset`
  Adds `classificationLevel`, `ownerDepartment`, `storageLocation`, `encryptionState`, `keyManifestRef`, `authorizedRoles`, `retentionPolicy`, `lifecycleState`, `integrityCheckTimestamp`, `legalHold`, `approvalRequired`, `lastAccessAt`, and `accessHistoryRef`.
- `AccessRequest`
  Immutable request record for each access attempt, including decision, policy hash, approval linkage, and requester context.
- `AccessSession`
  Session-scoped decryption record containing the session JWT hash, Vault wrap-key path, rewrapped content key, expiry, and revocation state.
- `AuditLedgerEvent`
  Hash-chained signed audit event with optional blockchain transaction reference.

## Enterprise Identity Exchange

`POST /api/v1/auth/enterprise/exchange` accepts an enterprise IdP JWT and returns the same QuantumVault session shape as local login.

Required backend environment variables:

- `ENTERPRISE_IDP_PROVIDER`
- `ENTERPRISE_IDP_JWKS_URL`
- `ENTERPRISE_IDP_ISSUER`
- `ENTERPRISE_IDP_AUDIENCE`

Supported request security headers:

- `x-qv-device-id`
- `x-qv-device-compliance`
- `x-qv-device-trust`
- `x-qv-network-zone`
- `x-qv-location`
- `x-forwarded-for`
- `x-real-ip`

These values are written into the persisted session and are used again during access-policy evaluation.

## Classification Policy Matrix

Implemented in `backend/src/access/access-policy.service.ts`.

| Level | Minimum auth controls | Device posture | Network zones | Allowed actions | Max TTL |
| --- | --- | --- | --- | --- | --- |
| `L0_INTERNAL` | SSO | `MANAGED` | `INTERNAL`, `VPN`, `RESTRICTED`, `SECURE_ENCLAVE` | `VIEW`, `DOWNLOAD` | 24h |
| `L1_SENSITIVE` | SSO + MFA | `MANAGED` | `INTERNAL`, `VPN`, `RESTRICTED`, `SECURE_ENCLAVE` | `VIEW`, `DOWNLOAD` | 8h |
| `L2_CONFIDENTIAL` | MFA | `MANAGED` | `INTERNAL`, `VPN`, `RESTRICTED`, `SECURE_ENCLAVE` | `VIEW`, `CONTROLLED_DOWNLOAD` | 4h |
| `L3_RESTRICTED` | MFA + device attestation | `HARDENED` | `RESTRICTED`, `SECURE_ENCLAVE` | `VIEW` | 1h |
| `L4_CRITICAL` | MFA + step-up + approval | `SECURE_WORKSTATION` | `SECURE_ENCLAVE` | `VIEW` | 30m |

`L4_CRITICAL` always requires approval. Assets can also force approval through the ingress metadata path via `PipelineAsset.approvalRequired`.

## Asset-Level Location Policy

Access policy can now enforce a distinct location rule when the asset metadata opts into it.

Supported metadata keys:

- `requireLocation` or `locationPolicy.required`
- `allowedLocations`
- `allowedLocationCodes`
- `allowedLocationLabels`

Example:

```json
{
  "requireLocation": true,
  "allowedLocationCodes": ["PHX-LAB", "PHX-SR4"]
}
```

The requester must assert a location with `x-qv-location` when creating or activating the access session. If the session is checked out to a managed endpoint, the managed credential's `locationCode` or `locationLabel` must also match that asserted session location.

## Cryptographic Flow

1. Ingress encrypts the asset using the existing PQC envelope file generated by the pipeline.
2. `AccessService` loads the stored payload from `PipelineAsset.storageLocation`.
3. The asset's anchor private key is read from Vault using the existing anchor record.
4. ML-KEM decapsulation derives the shared secret.
5. HKDF derives the AES-256 content key.
6. A fresh 32-byte session wrap key is generated.
7. The content key is re-encrypted with AES-256-GCM under the session wrap key, bound to the session metadata as AAD.
8. The session wrap key is stored in Vault at `quantumvault/access-sessions/<sessionId>/wrap-key`.
9. The client receives a short-lived session JWT. The database stores only its SHA-256 hash.
10. On content view, the session token is verified, the wrap key is fetched from Vault, and the protected content is decrypted for the allowed session window.
11. On expiry or explicit close, the Vault wrap key is deleted and the session is marked `EXPIRED` or `REVOKED`.

The encrypted payload itself now flows through the configured storage backend:

- `filesystem`
  Stored under the configured destination path or `STORAGE_FILESYSTEM_ROOT`
- `s3`
  Stored in `OBJECT_STORAGE_BUCKET` using S3-compatible APIs

## Managed Checkout / Check-In

For classifications that allow local editing, QuantumVault now supports a managed-endpoint checkout path built on top of the existing access session.

1. A user first receives a normal QuantumVault access session.
2. `POST /api/v1/access/sessions/:id/checkout` unwraps the content key inside QuantumVault.
3. QuantumVault verifies a live managed credential bound to the requester, machine, and network zone, then rewraps that content key to the managed-device ML-KEM public key.
4. The client receives a signed `qv.checkout.bundle.v1` containing the encrypted asset payload, a device-bound content-key envelope, policy metadata, and check-in metadata.
5. The endpoint agent decrypts only inside its managed local workspace.
6. `POST /api/v1/access/sessions/:id/checkin` uploads the edited content back to QuantumVault.
7. QuantumVault re-encrypts the returned content as a new PQC-protected asset version using the original anchor path.
8. A new `PipelineAsset` record is created for the returned version, and the original asset metadata is updated with supersession lineage.
9. The access session is then closed and its Vault session wrap key is deleted.

## Audit and Blockchain Anchoring

Every request, approval decision, session start, checkout, check-in, session close, and legal-hold mutation emits a signed `AuditLedgerEvent`.

- Event hash: SHA-256 over canonical JSON
- Signature: `AttestationService.signDigest("qv.audit.v1", eventHash)`
- Chain integrity: each event carries `previousEventHash`
- Optional blockchain anchoring:
  Controlled by `ACCESS_AUDIT_ANCHOR_EVENTS`
  Default anchored event types are `ACCESS_REQUEST`, `APPROVAL`, `DENIAL`, `SESSION_START`, `SESSION_END`, and `REVOCATION`

Anchoring is queue-backed. `AuditLedgerService` records the signed event immediately and enqueues an `access-audit` BullMQ job. The worker later updates `blockchainTxHash`, `blockchainBlockNumber`, and the event payload anchor status.

Checkout/check-in lineage is carried in the final anchored session-close event payload:

- checkout bundle id
- source asset id
- previous content hash
- new content hash
- version number
- managed-device public-key hash

Only proofs are anchored. Raw content and decrypted keys never leave internal systems.

## Deployment Notes

- `backend/.env.example` includes the required enterprise identity and access-audit environment variables.
- `backend/.env.example` also includes storage backend and monitoring token variables.
- `infra/docker-compose.yml` forwards the enterprise IdP, storage backend, access-audit, and monitoring variables into the backend container.
- Local compose includes MinIO plus a bootstrap container that creates the default bucket for S3-compatible deployments.
- Nginx or the upstream ingress tier must preserve `x-forwarded-proto` so secure cookie selection remains correct.
- Corporate proxy or device-gateway layers should inject the `x-qv-*` headers from trusted posture systems. Do not accept those headers from untrusted public ingress.

## Monitoring Surface

`GET /api/v1/access/monitoring/summary` returns:

- assets by classification
- active sessions
- denied attempts
- legal holds
- pending approvals
- active session details for operator dashboards

`GET /api/v1/access/audit` returns the signed access ledger for dashboarding, SIEM ingestion, and insider-threat investigation.

`GET /api/v1/monitoring/metrics` exposes Prometheus-compatible counters, gauges, and histograms for:

- access requests and policy evaluations
- session lifecycle and materialization
- object-storage operations
- audit ledger events and anchor jobs

`GET /api/v1/monitoring/runtime` returns runtime health for storage, blockchain, and queue backlogs.
