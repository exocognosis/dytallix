# QuantumVaultMVP Changelog

All notable changes to QuantumVaultMVP are documented in this file.

The format is intentionally lightweight (date-based) to support MVP-paced iteration.

## 2025-12-28

### Fixed / Remediated
- Removed simulated post-quantum behavior from production wrapping paths by implementing real ML-KEM (ML-KEM-1024) encapsulation and HKDF-derived AES-256-GCM wrapping.
- Updated anchor lifecycle to generate and persist real ML-KEM keypairs (public + secret) instead of placeholders.
- Fixed Vault integration to work with Vault dev defaults (KV v2 under the `secret/` mount):
  - Writes now target `secret/data/<path>` for logical paths like `quantumvault/...`.
  - Reads unwrap KV v2 payloads correctly.
- Fixed TLS scanning to handle non-RSA certificates (e.g., ECDSA) using Node’s `crypto.X509Certificate` instead of RSA-assumptive parsing.

### Container / Ops
- Made database initialization deterministic in containers:
  - Added Prisma migrations usable with `prisma migrate deploy`.
  - Switched container seeding to a Node-executed seed script (`prisma/seed.js`) to avoid TS loader/ESM issues at runtime.

### Validation
- Updated E2E defaults to target the exposed backend port (`http://localhost:13000/api/v1`).
- Re-ran the E2E suite successfully after fixes (scan completes, asset discovered, policy created, PQC anchor created).

### Docs / Audit
- Added baseline and remediation checklist notes under `QuantumVaultMVP/audit/`.

### Planned (Next)
- Frontend UX: add a single-file one-off flow to encrypt → attest → anchor.
- Frontend UX: modernize and simplify the UI for better usability.
