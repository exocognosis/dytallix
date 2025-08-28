# Security Notes

## Overview
This project integrates post-quantum signature schemes (Dilithium3, Falcon-512, SPHINCS+-128s) compiled from vendored PQClean sources to WebAssembly with deterministic builds and integrity verification.

## Cryptography Stack
- PQ Schemes: Dilithium3, Falcon-512, SPHINCS+-128s-simple (NIST PQC standard set coverage diversity: lattice vs hash-based).
- Key Material Lifecycle:
  - Generated client-side (WebCrypto for randomness → CSPRNG seeds PQClean C code).
  - Stored only encrypted (never raw) in the browser vault.
  - Decrypted into memory on unlock; wiped (zeroized) on manual lock, tab visibility loss (best-effort), or inactivity timeout.
- Address Derivation (current prototype): `dytallix1` + first 38 hex chars of `sha256(algo_id || base64(pubKey))`. (Will transition to Bech32 with HRP + version + algo code.)

## Vault / KDF & Secret Handling
- Password → Argon2id (libsodium) with parameters chosen for ≈ 250–500ms on mid-range laptop: `opsLimit=3`, `memLimit≈64MB` (tunable via env in future).
- Derived key length: 32 bytes (AES-256-GCM key + HKDF sub-derivations if needed).
- Encrypted Keystore Format (JSON):
  ```json
  {
    "v":1,
    "kdf":"argon2id",
    "params":{"ops":3,"mem":65536,"parallelism":1},
    "algo_keys":{"dilithium3":{...}, ...},
    "cipher":"aes-256-gcm",
    "salt":"base64...",
    "nonce":"base64...",
    "ct":"base64..."
  }
  ```
- Zeroization: after decrypt / sign, Buffers / Uint8Arrays mutated with `fill(0)`; references nulled. JS GC is non-deterministic—residual risk documented.
- No plaintext secret writes to `localStorage`, `sessionStorage`, or IndexedDB.

## Browser Threat Model (Primary Concerns)
| Threat | Mitigation | Residual Risk |
|--------|------------|---------------|
| Malicious third-party script (XSS) | Strict CSP (`default-src 'self'`; no external scripts) | Inline style allowance until hashed styles adopted |
| WASM tampering / substitution | Manifest hash + optional Ed25519 signature check before instantiation | If both manifest & WASM replaced AND signature disabled |
| Memory scraping (in-tab) | Minimize exposure window; zeroize on lock/blur | Active attacker with JS execution can exfiltrate live secrets |
| Phishing domain | Encourage bookmark + TLS; integrity banner mismatch warns users | Sophisticated lookalike + user ignores banner |
| Supply chain (npm dep compromise) | Minimal runtime deps; vendored crypto C; security audit script | Dependency added later without review |
| Timing side-channels | Constant-time primitives in PQClean C; avoid branching on secrets in TS | Browser JIT micro-architectural leakage |

## Supply Chain Controls
- Vendored minimal PQClean sources under `vendor/pqclean/` with recorded upstream commit & LICENSE.
- Deterministic build via pinned emscripten (3.1.57) in CI.
- Manifest (SHA-256) generated per build, optionally Ed25519 signed with CI-held seed (`MANIFEST_SIGN_KEY`).
- Runtime denies operation if any WASM hash mismatch or manifest signature fails.
- CI compares produced hashes against previous known-good to surface unexpected drift.

## Integrity & Tamper Resistance
Flow on app load:
1. Download `manifest.json` + `*.wasm` assets.
2. Compute SHA-256 on each WASM blob (sorted keys).
3. Compare to manifest hashes; if signature present verify Ed25519 over concatenated hash list.
4. Set integrity state: OK / Degraded (manifest fetch transient failure) / Failure (hash mismatch).
5. On Failure: disable signing & high-risk UI elements; prompt hard refresh.

User Feedback:
- Banner + icon color (green / amber / red).
- Console log (dev) with non-sensitive diagnostics.

## Dependency Hygiene
- Minimal external runtime deps; cryptographic core isolated to vendored C.
- `npm run security:audit` (wrapper script) runs `npm audit --omit=dev` + license enumeration → `artifacts/security/audit.txt`.
- PR review gate: changes under `vendor/pqclean/` require explicit reviewer ack.

## Server Hardening (API / Faucet)
Optional security headers via env flags (`ENABLE_SEC_HEADERS=1`, `ENABLE_CSP=1`). See table (unchanged):
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: DENY`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-site`
- `Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' wss: ws:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'` (plus enumerated origins & style/img adjustments in code)

## Content Security Policy (CSP)
- Dev: Vite sets baseline CSP with only necessary relaxations for HMR (`'unsafe-inline'` styles currently).
- Prod: Dynamic enumeration of allowed `connect-src` origins from env prevents silent addition of exfiltration endpoints.
- Next Hardening Step: remove `'unsafe-inline'` by adopting hashed style tags or extracted CSS.

## Logging & Redaction
- Server logger redacts keys containing: mnemonic / private / secret / token / key. (Case-insensitive.)
- Frontend browser logger similarly scrubs before console output.
- Never log decrypted vault content or derived keys.

## Memory Handling & Zeroization Caveats
- JS cannot guarantee immediate reclamation; zeroization best-effort reduces persistence window.
- WASM linear memory pages containing secrets are overwritten before free when practical; full page purge not always feasible without performance cost.

## Incident Response
1. Detect anomaly (integrity failure, suspicious outbound traffic, audit mismatch).
2. Freeze deployments; snapshot current artifact manifests.
3. Rebuild WASM from clean environment; compare hashes.
4. Rotate manifest signing key (revoke old public key).
5. Release advisory & patched build; force clients to refetch (cache bust).
6. Post-incident review; adjust CSP / dependency allowlist.

## Future / Roadmap Hardening
- SLSA provenance build attestation & publish provenance file.
- WebAuthn hardware-backed wrap key for vault master key.
- Enclave-backed faucet signer (mitigate server exfil risk).
- Continuous integrity monitoring (subresource integrity + report-uri).
- In-browser side-channel mitigation experiments (site isolation hints).

## Responsible Disclosure
Please open a security advisory (GitHub Security tab) or email security@dytallix.invalid (placeholder) with detailed reproduction steps. Provide: affected commit SHA, environment, PoC script, and impact assessment.

---

(See `README.md` for operational & troubleshooting notes; `LAUNCH-CHECKLIST.md` for final pre-launch validation steps.)

