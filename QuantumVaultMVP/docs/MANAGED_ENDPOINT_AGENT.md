# QuantumVault Managed Endpoint Agent

The managed endpoint agent is the local runtime that consumes a signed `qv.checkout.bundle.v1`, verifies the backend attestation signature, decapsulates the ML-KEM checkout envelope, materializes a protected workspace, and returns edited content through the agent check-in path.

## Package

Location:

- `agent/`

Primary command:

- `qv-agent`

## Supported Runtime

- Node.js 22 LTS
- `@openforge-sh/liboqs` available through `npm install`

The repository pins the expected runtime with `.nvmrc`.

## Commands

### Initialize a device profile

```bash
cd QuantumVaultMVP/agent
npm install
npm run build

node dist/cli.js init \
  --profile finance-phx \
  --device-id phx-secure-01 \
  --device-label "Finance Secure Workstation" \
  --network-zone SECURE_ENCLAVE \
  --location-label "Phoenix secure room 4" \
  --location-code PHX-SR4 \
  --output ./finance-phx-enrollment.json
```

This generates:

- a local ML-KEM device keypair stored under `~/.quantumvault-agent/profiles/<profile>/`
- an enrollment JSON payload containing:
  - `deviceId`
  - `deviceLabel`
  - `deviceKeyAlgorithm`
  - `devicePublicKey`
  - `devicePublicKeyHash`
  - `networkZone`
  - `locationLabel`
  - `locationCode`

Use that enrollment JSON in the QuantumVault credential authority UI or admin API when issuing the managed credential.

### Fetch the attestation trust bundle

```bash
node dist/cli.js trust-sync \
  --profile finance-phx \
  --server-base-url http://127.0.0.1:13000
```

This caches the public ML-DSA verifier bundle from:

- `GET /api/v1/access/agent/trust-bundle`

### Open a checkout bundle

```bash
node dist/cli.js open \
  --profile finance-phx \
  --bundle ./q1-forecast.checkout.json \
  --server-base-url http://127.0.0.1:13000
```

The agent will:

- verify the detached ML-DSA signature on the checkout bundle,
- confirm the bundle is bound to the local managed device profile,
- decapsulate the device-bound ML-KEM envelope,
- decrypt the content key and session token,
- materialize plaintext into a protected workspace,
- persist local workspace state for later check-in.

### Check in an edited workspace

```bash
node dist/cli.js checkin \
  --workspace ~/.quantumvault-agent/workspaces/<session>-<bundle> \
  --editor "Excel 365" \
  --reason "Quarterly revisions complete"
```

The agent reads the local workspace state, posts the edited file to:

- `POST /api/v1/access/agent/sessions/:id/checkin`

and then securely deletes the workspace by default.

### Cleanup a workspace manually

```bash
node dist/cli.js cleanup \
  --workspace ~/.quantumvault-agent/workspaces/<session>-<bundle>
```

## Local Storage Layout

- `~/.quantumvault-agent/profiles/<profile>/profile.json`
- `~/.quantumvault-agent/profiles/<profile>/device-key.json`
- `~/.quantumvault-agent/profiles/<profile>/trust-bundle.json`
- `~/.quantumvault-agent/workspaces/<session>-<bundle>/`

Secrets and workspace state are written with restrictive local file permissions.

## Security Notes

- The agent never stores the ML-KEM secret key in the repository.
- Checkout bundles are verified against the backend-published ML-DSA trust bundle before decryption.
- Workspaces are created under a dedicated agent root and deleted with a best-effort secure wipe on cleanup.
- The agent check-in path is session-token based and uses the encrypted session token from the checkout bundle, so it does not depend on the browser JWT.

## Local End-to-End Validation

The repository includes a local validation script that exercises the full managed endpoint path against the local QuantumVault stack:

```bash
cd QuantumVaultMVP
python3 scripts/local/managed-endpoint-e2e.py
```

This script will:

- repair the active local dev anchors by rotating the current ML-KEM-1024 and ML-DSA-65 anchors,
- ingest a fresh local source file through the PQC pipeline,
- generate a device enrollment payload with the agent,
- issue a managed credential through the admin API,
- request access with device/network context headers,
- perform checkout, bundle verification, local decrypt, local edit, and agent check-in,
- verify the expected audit actions for the resulting access session.

Artifacts are written to:

- `.secure/local-services/e2e/managed-endpoint/<run>/`
