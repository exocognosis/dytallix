# Changelog

All notable changes to `@dytallix/pqc-wasm` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial publishing workflow and documentation

## [0.1.0] - 2025-10-14

### Added
- ML-DSA-65 (FIPS 204) implementation via `fips204` crate
- WebAssembly bindings for browser and Node.js
- Key generation, signing, and verification functions
- Bech32 address encoding with `dyt` prefix
- Comprehensive TypeScript type definitions
- Zeroization of sensitive key material
- Pure Rust implementation (no C dependencies)

### Security
- Constant-time operations for side-channel resistance
- Cryptographically secure random number generation
- Memory zeroization on key drop

### Performance
- Optimized WASM build size (~200KB compressed)
- Fast cryptographic operations (<5ms for most operations)

[Unreleased]: https://github.com/HisMadRealm/dytallix/compare/pqc-wasm-v0.1.0...HEAD
[0.1.0]: https://github.com/HisMadRealm/dytallix/releases/tag/pqc-wasm-v0.1.0
