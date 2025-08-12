# Changelog

## [1.1.0] - 2025-08-12
### Added
- Post-quantum cryptography productionization: Dilithium3, Falcon-512, SPHINCS+-128s-simple via PQClean WASM.
- Deterministic build pipeline (`scripts/build_pqc_wasm.sh`) with pinned emscripten 3.1.57 and optional manifest signing.
- Integrity manifest + runtime verification (`src/crypto/pqc/integrity.ts`).
- Unified PQC facade (`src/crypto/pqc/pqc.ts`) with per-algo thin wrappers.
- CI workflow `.github/workflows/pqc.yml` building, hashing, testing (KAT/tamper), and auditing.
- Placeholder KAT framework ready for official vectors under `src/crypto/pqc/vectors/`.

### Changed
- Wallet now relies on real facade in production; placeholder fallback disallowed when `NODE_ENV=production`.

### Security
- Zeroization of key derivation buffers; explicit refusal of unsigned / mismatched WASM.
- Vendored minimal PQClean subset to reduce supply chain risk.

