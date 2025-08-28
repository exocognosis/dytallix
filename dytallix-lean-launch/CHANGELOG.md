# Changelog

This file combines mv-testnet scoped changes and lean-launch release history.

The format follows Keep a Changelog and Semantic Versioning where applicable.

## [Unreleased]
### Added
- **Comprehensive Faucet QA/CI Infrastructure**
  - JSON Schema definition for faucet API response validation (`frontend/faucet.response.schema.json`)
  - TypeScript faucet client with Ajv schema validation (`src/faucetClient.ts`)
  - Comprehensive unit tests for faucet schema validation (`src/__tests__/faucet.test.ts`)
  - Enhanced Cypress E2E tests for complete faucet flow including wallet balance verification (`cypress/e2e/faucet.cy.ts`)
  - Rust integration tests for faucet API contract validation (`tests/faucet_integration.rs`)
  - Local faucet testing script with JSON validation (`scripts/faucet_request.sh`)

- **Enhanced CI/CD Pipeline**
  - Multi-job CI workflow with separate lint, unit test, E2E test, and build stages
  - Rust toolchain integration with clippy and rustfmt
  - Parallel test execution for improved CI performance
  - Cypress screenshot and video artifact capture on test failures
  - Backend server orchestration for E2E testing in CI

- **Improved Makefile Targets**
  - `make dev` - Start development environment (backend + frontend)
  - `make faucet` - Test faucet functionality using validation script
  - `make test` - Run comprehensive test suite (lint + unit + e2e)
  - `make test-unit` - Run unit tests only (Rust + frontend)
  - `make test-e2e` - Run end-to-end tests only (Cypress + integration)
  - Configurable variables: `FRONTEND_DIR`, `FAUCET_ENDPOINT`, `FAUCET_ADDRESS`

- **Faucet API Schema Validation**
  - Dual-token system support (DGT governance + DRT rewards tokens)
  - Legacy single-token compatibility mode
  - Comprehensive error handling with standardized error codes
  - Transaction hash format validation (0x + 64 hex characters)
  - Rate limiting detection and validation

- Standardized directory layout (node/, faucet/, explorer/, web/, src/, server/, ops/, scripts/, docs/, reports/, artifacts/)
- Environment configuration template consolidation (.env.example with legacy + new VITE_* vars)
- Security-focused ignore patterns (.gitignore, .dockerignore)
- Dual-token nomenclature enforcement in CLI: governance token DGT, reward token DRT (validation restricts denoms to DGT/DRT).
- **Centralized environment variable loader** (`src/config/env.ts`) with unified API and faucet endpoint configuration

### Changed
- **CI Workflow Architecture**
  - Split monolithic CI job into focused parallel jobs (lint, unit, e2e, build)
  - Enhanced error handling with graceful degradation for existing test failures
  - Improved artifact collection and upload strategy
  - Added Rust integration alongside Node.js testing

- README unification: monorepo layout, branching overview, Cosmos-only focus
- Project structure standardized for mv-testnet integration
- CLI package/binary renamed from `dyt` to `dcli`.
- Environment variable prefix migrated from `DYT_` to `DX_` (old names still accepted with deprecation warnings).
- Updated docs, CI workflow, and examples to use `dcli` and dual-token model.
- **BREAKING: Environment variable consolidation for API and faucet endpoints**
  - Removed: `FAUCET_URL` (unprefixed), `VITE_FAUCET_API_URL`
  - Added: `VITE_API_URL` (required base API), `VITE_FAUCET_URL` (optional override)
  - Migration: Set `VITE_API_URL` to your API base; faucet defaults to `{API_URL}/faucet`

### Security
- **Contract Validation Implementation**
  - Faucet API response schema enforcement prevents injection attacks
  - Address format validation (bech32 with dytallix1 prefix)
  - Token symbol enumeration (only DGT/DRT accepted)
  - Transaction hash format verification prevents malformed data
  - Rate limiting validation ensures proper cooldown enforcement

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
