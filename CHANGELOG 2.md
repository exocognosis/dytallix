# Changelog

All notable changes to the Dytallix project.

## [0.2.0] - 2026-01-07

### Added

#### Smart Contracts
- WASM smart contract support on testnet
- `contracts/deploy` endpoint for deploying contracts
- `contracts/call` endpoint for executing contract methods
- `contracts/state` endpoint for querying contract state
- Host functions: `storage_get`, `storage_set`, `read_input`, `write_output`, `debug_log`
- Gas metering for contract execution

#### Example Contracts
- `contracts/counter` - Minimal no_std counter (504 bytes)
- `contracts/hello-world` - Full-featured example with std

#### SDK Updates
- Contract deployment methods in both TypeScript and Rust SDKs
- Contract call/execute methods
- `deploy_contract.js` and `deploy_contract.rs` examples
- E2E tests for both SDKs (11/11 passing)

### Changed
- Node now builds with `--features contracts` by default
- Updated SDK READMEs with contract documentation

### Fixed
- WASM host function signatures for proper linking
- ApiError::NotFound variant compatibility

## [0.1.0] - 2026-01-06

### Added

#### SDKs
- TypeScript SDK v0.2.0 with full PQC support
- Rust SDK v0.2.0 with ML-DSA signatures
- Wallet generation (PQC-secure)
- Account balance queries
- Faucet requests
- Message signing and verification
- Transaction building and submission

#### Network
- Testnet deployed at `https://dytallix.com/rpc`
- Chain ID: `dytallix-testnet-1`
- Dual token system (DGT + DRT)
- Faucet for testnet tokens

#### Documentation
- SDK README files with usage examples
- API endpoint documentation
