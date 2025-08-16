# Changelog

This file combines mv-testnet scoped changes and lean-launch release history.

The format follows Keep a Changelog and Semantic Versioning where applicable.

## [Unreleased]
### Added
- Standardized directory layout (node/, faucet/, explorer/, web/, src/, server/, ops/, scripts/, docs/, reports/, artifacts/)
- Environment configuration template consolidation (.env.example with legacy + new VITE_* vars)
- Security-focused ignore patterns (.gitignore, .dockerignore)

### Changed
- README unification: monorepo layout, branching overview, Cosmos-only focus
- Project structure standardized for mv-testnet integration

### Security
- Reinforced exclusion of secrets (.env*, mnemonic guidance)

---

## [1.1.1] - 2025-08-12
### Changed
- Removed all Hardhat/EVM artifacts and configs from `dytallix-lean-launch`.
- Migrated faucet and backend to CosmJS; uses LCD/RPC/WS from environment.
- Moved EVM audit log to `artifacts/hardhat_audit/MATCHES.md`.

### Security / PQC
- Post-quantum cryptography productionization foundations (see 1.1.0 notes below).

## [1.1.0] - 2025-08-12
### Added
- Post-quantum cryptography productionization: Dilithium3, Falcon-512, SPHINCS+-128s-simple via PQClean WASM.
- Deterministic build pipeline (`scripts/build_pqc_wasm.sh`) with pinned emscripten 3.1.57 and optional manifest signing.
- Integrity manifest + runtime verification (`src/crypto/pqc/integrity.ts`).
- Unified PQC facade (`src/crypto/pqc/pqc.ts`).
- CI workflow `.github/workflows/pqc.yml` (build, hash, test, audit).
- Placeholder KAT framework in `src/crypto/pqc/vectors/`.

### Changed
- Wallet now relies on real facade in production; placeholder fallback disallowed when `NODE_ENV=production`.

### Security
- Zeroization of key derivation buffers; integrity checks for WASM modules.
- Vendored minimal PQClean subset to reduce supply chain risk.

## [1.1.0-pre] - 2024-01-20
### Added
- Environment variable support for Cosmos network configuration.
- CosmJS integration for Cosmos SDK blockchain interactions.
- `.env.staging` template with Cosmos testnet endpoints.
- EVM build artifact exclusions in `.gitignore` to prevent reintroduction.
- Comprehensive audit documentation (artifacts/hardhat_audit/MATCHES.md).

### Changed
- BREAKING: Faucet now uses Cosmos API endpoints instead of mock implementation.
- BREAKING: Address validation updated to require bech32 Cosmos addresses (dytallix1...).
- Network information now displays chain ID from environment variables.
- README updated to document Cosmos-only setup and remove EVM references.
- Development mode fallback behavior for faucet when API is unavailable.

### Removed
- All Hardhat/EVM-specific dependencies and configurations (audit confirmed none existed).
- EVM-style address support (0x...) in favor of Cosmos bech32 addresses.
- Mock API layer replaced with actual Cosmos endpoint integration.

### Technical Details
- Added required environment variables: `VITE_LCD_HTTP_URL`, `VITE_RPC_HTTP_URL`, `VITE_RPC_WS_URL`, `VITE_CHAIN_ID`.
- CosmJS packages: `@cosmjs/stargate`, `@cosmjs/proto-signing`, `@cosmjs/encoding`.
- Runtime calls now use Cosmos LCD/RPC endpoints.
- Chain ID handled via environment variables.

### Migration Notes
- Completed migration from EVM/Hardhat to Cosmos-only setup (no legacy code removed because none present).
- Developers must configure environment variables for proper Cosmos integration.
- Faucet component includes production API calls and development fallbacks.

---
*Date format: YYYY-MM-DD*
