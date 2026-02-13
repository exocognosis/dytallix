# QuantumVault Key Governance Runbook

## Purpose

This runbook operationalizes 90-day key lifecycle controls:

- explicit rotation ceremonies
- key-id/key-hash pinning
- mandatory recovery testing
- auditable ceremony evidence capture

It covers attestation signer keys and PQC transport keys.

## Prerequisites

1. Backend API is running and reachable (default: `http://localhost:13000/api/v1`).
2. ADMIN credentials are available for a dedicated operator account.
3. Vault is healthy and policy-scoped auth is configured.
4. `jq` and `curl` are installed on the operator workstation.

## Environment Controls

Configure these in backend runtime environment:

- `ATTESTATION_KEY_BOOTSTRAP_ALLOWED`
- `TRANSPORT_KEYS_BOOTSTRAP_ALLOWED`
- `ATTESTATION_SIGNER_KEY_ID_PIN`
- `ATTESTATION_SIGNER_KEY_HASH_PIN`
- `TRANSPORT_KEM_KEY_ID_PIN`
- `TRANSPORT_KEM_KEY_HASH_PIN`
- `TRANSPORT_IDENTITY_KEY_ID_PIN`
- `TRANSPORT_IDENTITY_KEY_HASH_PIN`

Recommended production posture:

1. Set both bootstrap flags to `false` after initial provisioning.
2. Set key pin values after each approved rotation ceremony.

## Standard Ceremony Workflow

### 1) Capture pre-rotation state

```bash
curl -sS -H "Cookie: <admin-cookie>" \
  http://localhost:13000/api/v1/admin/keys/status | jq '.'
```

### 2) Execute rotation ceremony

Use the rollout script, which:

- logs in with ADMIN credentials
- fetches prior key IDs
- passes expected prior key IDs to rotation APIs
- runs post-rotation recovery tests
- writes evidence files (`status-before`, rotation outputs, recovery output, `status-after`)

```bash
cd QuantumVaultMVP
QVC_API_BASE=http://localhost:13000/api/v1 \
QVC_ADMIN_EMAIL=admin@quantumvault.local \
QVC_ADMIN_PASSWORD='QuantumVault2024!' \
QVC_REASON='scheduled_rotation' \
QVC_CHANGE_TICKET='SEC-1234' \
QVC_REQUESTED_BY='security-admin' \
./scripts/rollout/key_rotation_ceremony.sh all
```

### 3) Apply new pin values

Read new IDs/hashes from:

- `GET /api/v1/admin/keys/status`
- evidence output directory from the ceremony script

Write the latest IDs/hashes into runtime env:

- `ATTESTATION_SIGNER_KEY_ID_PIN` / `ATTESTATION_SIGNER_KEY_HASH_PIN`
- `TRANSPORT_KEM_KEY_ID_PIN` / `TRANSPORT_KEM_KEY_HASH_PIN`
- `TRANSPORT_IDENTITY_KEY_ID_PIN` / `TRANSPORT_IDENTITY_KEY_HASH_PIN`

Restart backend workloads after env update.

### 4) Validate recovery and startup behavior

```bash
curl -sS -H "Cookie: <admin-cookie>" \
  -H 'Content-Type: application/json' \
  -X POST http://localhost:13000/api/v1/admin/keys/recovery-test \
  --data '{"scope":"all","requestedBy":"security-admin"}' | jq '.'
```

Expected result: `passed: true` for attestation and transport checks.

## Failure Handling

If any step fails:

1. Do not update pin variables.
2. Preserve ceremony evidence directory.
3. Restore previous key records from Vault backup or execute controlled rollback rotation.
4. Open incident ticket with API response payloads and Vault audit references.

## Evidence Retention

For each ceremony, retain:

1. Change ticket ID and operator identity.
2. `status-before.json` and `status-after.json`.
3. Rotation API responses.
4. Recovery test output.
5. Vault audit trail snippet for key-path writes.

Minimum recommended retention: 1 year.
