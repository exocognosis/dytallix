# QuantumVault Managed Checkout / Check-In

This document defines the managed-endpoint checkout and check-in contract implemented by the internal access subsystem.

The flow is intentionally not a permanent "decrypt and hand over the key" model.

QuantumVault:

1. derives the asset content-encryption key inside the trusted backend,
2. rewraps that content key to a managed device public key for a short-lived session,
3. issues a signed checkout bundle,
4. accepts the edited file back over the active access session,
5. re-encrypts the returned version into a new PQC-protected object,
6. records signed audit events, and
7. anchors the checkout/check-in lineage to the Dytallix path through the existing audit ledger.

## API Endpoints

### `POST /api/v1/access/sessions/:id/checkout`

Issues a managed-endpoint checkout bundle for an active access session.

Request body:

```json
{
  "sessionToken": "<access-session-jwt>",
  "credentialId": "managed-credential-uuid",
  "deviceKeyAlgorithm": "ML-KEM-768",
  "devicePublicKey": "<base64-ml-kem-public-key>",
  "agentVersion": "qv-agent/1.0.0",
  "workspaceId": "host-1234",
  "reason": "local spreadsheet edit"
}
```

Response shape:

```json
{
  "schemaVersion": "qv.checkout.bundle.v1",
  "bundleId": "uuid",
  "issuedAt": "2026-03-14T15:00:00.000Z",
  "expiresAt": "2026-03-14T16:00:00.000Z",
  "sessionId": "uuid",
  "accessRequestId": "uuid",
  "pipelineAssetId": "uuid",
  "classificationLevel": "L2_CONFIDENTIAL",
  "allowedAction": "CONTROLLED_DOWNLOAD",
  "relativePath": "finance/q1-forecast.xlsx",
  "filename": "q1-forecast.xlsx",
  "mimeType": "application/octet-stream",
  "requester": {
    "id": "uuid",
    "email": "analyst@corp.local",
    "department": "Finance",
    "role": "VIEWER"
  },
  "device": {
    "deviceId": "mdm-device-id",
    "credentialId": "managed-credential-uuid",
    "publicKeyHash": "0x...",
    "keyAlgorithm": "ML-KEM-768",
    "agentVersion": "qv-agent/1.0.0",
    "workspaceId": "host-1234"
  },
  "assetEnvelope": {
    "schemaVersion": "qv.checkout.asset-envelope.v1",
    "algorithm": "ML-KEM-768-HKDF-SHA256-AES-256-GCM",
    "kemAlgorithm": "ML-KEM-768",
    "anchorId": "uuid",
    "ciphertext": "<base64>",
    "nonce": "<base64>",
    "aeadTag": "<base64>",
    "aadContext": {},
    "source": {},
    "contentHash": "sha256hex"
  },
  "contentKeyEnvelope": {
    "schemaVersion": "qv.checkout.content-key-envelope.v1",
    "kemAlgorithm": "ML-KEM-768",
    "kemCiphertext": "<base64>",
    "salt": "<base64>",
    "nonce": "<base64>",
    "aeadTag": "<base64>",
    "aadContext": {},
    "encryptedContentKey": "<base64>"
  },
  "sessionTokenEnvelope": {
    "schemaVersion": "qv.checkout.session-token-envelope.v1",
    "kemAlgorithm": "ML-KEM-768",
    "salt": "<base64>",
    "nonce": "<base64>",
    "aeadTag": "<base64>",
    "aadContext": {},
    "encryptedSessionToken": "<base64>"
  },
  "checkin": {
    "schemaVersion": "qv.checkin.manifest.v1",
    "endpointPath": "/api/v1/access/agent/sessions/:id/checkin",
    "checkoutBundleId": "uuid"
  },
  "policy": {
    "version": "2026-03-13.access-policy.v1",
    "hash": "0x..."
  },
  "lineage": {
    "sourceAssetId": "uuid",
    "sourceContentHash": "sha256hex"
  },
  "reason": "local spreadsheet edit",
  "signature": {
    "algorithm": "ML-DSA-65",
    "domain": "qv.checkout.bundle.v1",
    "signingDigestHex": "0x...",
    "signatureHex": "0x...",
    "signerKeyId": "mldsa65:...",
    "signerKeyHashHex": "0x..."
  }
}
```

### `POST /api/v1/access/sessions/:id/checkin`

Uploads the edited content for a previously issued checkout bundle.

Request body:

```json
{
  "sessionToken": "<access-session-jwt>",
  "checkoutBundleId": "uuid",
  "contentBase64": "<base64-edited-file>",
  "contentSha256": "optional_sha256_hex",
  "mediaType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "agentVersion": "qv-agent/1.0.0",
  "editor": "Excel 365",
  "reason": "reconciled quarterly updates"
}
```

Response shape:

```json
{
  "checkedIn": true,
  "sessionClosed": true,
  "sessionId": "uuid",
  "checkoutBundleId": "uuid",
  "credentialId": "managed-credential-uuid",
  "newAssetId": "uuid",
  "versionNumber": 4,
  "contentSha256": "sha256hex",
  "payloadDigestSha256": "0x...",
  "storageLocation": "s3://quantumvault/path/to/file.v4.pqc.json",
  "attestationSignature": {
    "algorithm": "ML-DSA-65",
    "domain": "qv.checkin.payload.v1",
    "signingDigestHex": "0x...",
    "signatureHex": "0x...",
    "signerKeyId": "mldsa65:...",
    "signerKeyHashHex": "0x..."
  }
}
```

## Endpoint Agent Responsibilities

The managed endpoint agent is expected to:

- validate the `signature` on the checkout bundle,
- verify `expiresAt`, `sessionId`, `pipelineAssetId`, and `device.publicKeyHash`,
- decapsulate `contentKeyEnvelope.kemCiphertext` using the local ML-KEM private key,
- derive the AES rewrap key from the supplied salt,
- decrypt `encryptedContentKey`,
- decrypt `sessionTokenEnvelope.encryptedSessionToken`,
- decrypt `assetEnvelope.ciphertext` using the recovered content key and provided AAD,
- place plaintext only in an ephemeral protected workspace,
- upload the edited file back through the check-in endpoint before the access session expires,
- securely delete workspace plaintext and local CEK material on close.

## Audit and Anchoring

The runtime records:

- `SESSION_START / CHECKOUT_BUNDLE_ISSUED`
- `STORAGE_WRITE / CHECKIN_PQC_VERSION_STORED`
- `SESSION_END / CHECKOUT_SESSION_CHECKED_IN`

The final `SESSION_END` event carries the version lineage:

- source asset id
- previous content hash
- new content hash
- version number
- checkout bundle id
- managed-device public-key hash

That event is signed and passed to the existing blockchain anchoring path so the Dytallix proof contains the check-out/check-in chain of custody.

## Local Validation

For a live local-stack verification, run:

```bash
cd QuantumVaultMVP
python3 scripts/local/managed-endpoint-e2e.py
```

The script:

- rotates the active local ML-KEM-1024 and ML-DSA-65 anchors so the dev Vault and anchor records are aligned,
- creates a fresh isolated source/destination pair under `infra/data/local-managed-endpoint-e2e/`,
- runs the PQC pipeline,
- issues a managed device credential,
- requests and checks out access,
- opens the bundle through the managed endpoint agent,
- modifies the file locally,
- checks the file back in as a new PQC-protected version, and
- verifies the expected audit actions for the access session.

It writes the result bundle to:

- `.secure/local-services/e2e/managed-endpoint/<run>/result.json`
