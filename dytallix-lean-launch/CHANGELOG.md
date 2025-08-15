# Changelog

All notable changes to the Dytallix Lean Launch frontend will be documented in this file.

## [1.1.1] - 2025-08-12
### Changed
- Removed all Hardhat/EVM artifacts and configs from `dytallix-lean-launch` (confirmed clean).
- Migrated faucet and backend to CosmJS; uses LCD/RPC/WS from environment variables.
- Moved EVM audit log to `docs/evm_migration/MATCHES.md`.
- Added optional security headers + CSP in server (env gated).

### Security
- Zeroization of key derivation buffers; explicit refusal of unsigned / mismatched WASM.
- Vendored minimal PQClean subset to reduce supply chain risk.

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

## [1.0.0] - 2024-01-20
### Added
- Environment variable support for Cosmos network configuration (LCD/RPC/WS + chain id).
- CosmJS integration for Cosmos SDK blockchain interactions.
- `.env.staging` template with Cosmos testnet endpoints.
- Comprehensive audit documentation (artifacts/hardhat_audit/MATCHES.md).

### Changed
- Faucet now uses Cosmos API endpoints instead of mock implementation.
- Address validation updated to require bech32 Cosmos addresses (dytallix1...).
- Network information displays chain ID from environment variables.
- README updated to document Cosmos-only setup and remove EVM references.
- Development mode fallback behavior for faucet when API is unavailable.

### Removed
- All Hardhat/EVM-specific dependencies and configurations (already previously removed; audit confirms none existed).
- EVM-style address support (`0x...`) in favor of Cosmos bech32 addresses.
- Mock API layer replaced with actual Cosmos endpoint integration.

### Technical Details
- Added required environment variables: VITE_LCD_HTTP_URL, VITE_RPC_HTTP_URL, VITE_RPC_WS_URL, VITE_CHAIN_ID.
- CosmJS packages: @cosmjs/stargate, @cosmjs/proto-signing, @cosmjs/encoding.
- All runtime calls now use Cosmos LCD/RPC endpoints from environment configuration.
- Chain ID handled as string value from environment variables.

### Migration Notes
- Completes migration from EVM/Hardhat to Cosmos-only setup.
- Developers must configure environment variables for proper Cosmos integration.
- Faucet component includes both production API calls and development mode fallbacks.
