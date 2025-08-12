# Security Notes

## Overview
This project integrates post-quantum signature schemes (Dilithium3, Falcon-512, SPHINCS+-128s) compiled from vendored PQClean sources to WebAssembly with deterministic builds and integrity verification.

## Supply Chain Controls
- Vendored minimal PQClean sources under `vendor/pqclean/` with recorded upstream commit & LICENSE.
- Deterministic build via pinned emscripten (3.1.57) in CI.
- Manifest (SHA-256) generated per build, optionally Ed25519 signed with CI-held secret seed (`MANIFEST_SIGN_KEY`).
- Runtime denies operation if any WASM hash mismatch or manifest signature fails.

## Cryptography
- Schemes: Dilithium3, Falcon-512, SPHINCS+-128s-simple (NIST PQC finalists/standards).
- Keystore encryption: AES-GCM with Argon2id KDF via libsodium (crypto_pwhash_ALG_ARGON2ID13).
  - Defaults: memLimit ≈ 64MB, opsLimit = 3, parallelism = 1 (configurable).
  - See `src/crypto/kdf.ts` and `src/crypto/vault.ts`.
- Address derivation: `address = 'dytallix1' + hex(sha256(algo|pubKeyB64))[0:38]` (subject to future versioned Bech32 refinement).

## Secret Handling
- Private keys generated client-side only; stored encrypted (never plaintext at rest).
- In-memory secrets kept in refs; auto-cleared after inactivity or tab unload/hidden.
- Zeroization: derived key bytes and temporary buffers overwritten after use where feasible.

## Integrity & Tamper Resistance
- Each WASM file hashed and compared to manifest before instantiation.
- Optional Ed25519 signature over sorted manifest keys prevents manifest swap attack.
- CI job verifies artifact hashes to prevent unreviewed WASM drift.

## Dependency Hygiene
- Minimal external runtime deps; cryptographic core isolated to vendored C.
- `scripts/security_audit.sh` runs `npm audit --omit=dev` and prints licenses for production deps.

## Server Hardening (API)
Optional security headers can be enabled on the faucet API server via environment flags:
- `ENABLE_SEC_HEADERS=1` enables common headers:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `X-Frame-Options: DENY`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-site`
- `ENABLE_CSP=1` additionally adds a CSP header:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' wss:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`

Notes:
- Development tooling (Vite HMR) may require `ws:` in `connect-src` when using non-TLS.
- Static asset CSP should be applied by the production web server/proxy (e.g., NGINX). The Node server covers API responses only.

## Logging & Redaction
Server logs redact common secret fields and constrain line length to prevent leaking sensitive data. See `server/logger.js`.

## Incident Response
On suspected compromise:
1. Rebuild WASM from clean environment; compare hashes.
2. Revoke signing key (rotate `MANIFEST_SIGN_KEY`).
3. Ship updated manifest & public key; force clients to refresh.
4. Communicate to users with integrity failure messaging.

## Future Hardening
- Hardware-backed key storage (WebAuthn private keys wrapping PQ secrets).
- Multi-sig / threshold key splitting for high-value accounts.
- Reproducible build attestation (SLSA provenance) artifact publication.

