# Architecture

## Components

- **Frontend (Next.js)**: Auth + dark dashboard UI.
- **Backend (Go)**: REST API under `/api/*`.
- **Postgres**: System of record for targets, scans, assets, policies, jobs, attestations, audit log.
- **Vault (KV)**: Stores raw secrets and wrapped envelopes.
- **Local EVM (Anvil)**: MVP chain for attestations.
- **Contract Deployer**: Compiles & deploys the attestation contract; writes `attestation.json`.
- **Caddy**: Terminates TLS and routes `/api/*` → backend, everything else → frontend.

## Data Flows

### 1) Scan
1. Create a scan target (`TLS` / `HTTP` / `POSTGRES`).
2. Start a scan for that target.
3. Backend performs a real network handshake/request/DB connect and records evidence.
4. Backend upserts an `asset`, computes risk score + risk level.

### 2) Secret Ingest + PQC Wrap
1. Upload a secret to an asset (`POST /assets/{id}/secrets`).
2. Create an anchor (`POST /anchors`) and activate it.
3. Bulk wrap assets (`POST /wrap`).
4. Wrapper reads raw secret from Vault, performs Kyber768 encapsulation, derives an AEAD key via HKDF-SHA256, encrypts via ChaCha20-Poly1305, stores envelope back in Vault.

### 3) On-chain Attestation
1. Bulk attest assets (`POST /attest`).
2. Attestor submits a real EVM tx to the deployed contract.
3. Backend waits for mining, stores tx hash + block number.

## Local Stack

See `infra/docker-compose.yml` for the full service topology.
