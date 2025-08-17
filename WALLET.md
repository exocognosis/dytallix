# Dytallix PQC Wallet Implementation

## Overview

This document describes the implementation of Post-Quantum Cryptography (PQC) wallet functionality for Dytallix, as specified in the requirements. The implementation introduces Dilithium5 as the default algorithm with deterministic key generation using Argon2id.

## Implementation Status

### ✅ Completed Features

1. **SDK Module (`sdk/pqc_wallet.rs`)**
   - Argon2id KDF with specified parameters (memory=64 MiB, time_cost=3, parallelism=1)
   - Crypto-agile framework with `CryptoAlgo` trait
   - Dilithium5 implementation (real PQC)
   - Mock implementation for testing
   - Deterministic and non-deterministic key generation modes
   - Address derivation using bech32("dytallix", ripemd160(sha256(pubkey_raw)))
   - Public key serialization with type_url "/dytallix.crypto.pqc.v1beta1.PubKey"
   - Comprehensive unit tests

2. **CLI Commands (`cli/src/cmd/wallet.rs`)**
   - New `wallet` subcommand with create, show, sign, export, import actions
   - Default algorithm: Dilithium5
   - Legacy secp256k1 support structure (flag implemented, backend pending)
   - Interactive passphrase confirmation
   - Deterministic key generation option
   - JSON and text output formats

3. **Address Derivation (`cli/src/addr_new.rs`)**
   - New bech32-based address format for PQC wallets
   - Maintains backward compatibility with legacy address format
   - Proper prefix: "dytallix1"

### 🔄 Partially Complete

1. **Deterministic Key Generation**
   - Framework is implemented but seed-based key derivation needs completion
   - Currently using placeholder random generation in real PQC implementation
   - Argon2id seed derivation works correctly

2. **CLI Integration**
   - Basic wallet commands are functional
   - Some compilation issues with existing CLI modules need resolution
   - Legacy secp256k1 backend not yet implemented

### 📋 Remaining Tasks

1. **Complete Deterministic Implementation**
   - Implement seed-based Dilithium5 key generation
   - Fix deterministic reproduction test

2. **CLI Integration Fixes**
   - Resolve compilation errors in existing modules
   - Complete CLI testing and validation

3. **Legacy Support**
   - Implement secp256k1 backend for `--legacy-secp` flag

4. **JS Tooling Updates**
   - Update existing JS scripts to work with new PQC wallet format
   - Ensure compatibility with explorer and other tools

## Technical Details

### Argon2id Configuration

```rust
// Default parameters as specified
const ARGON2_MEMORY: u32 = 64 * 1024; // 64 MiB in KiB
const ARGON2_TIME_COST: u32 = 3;
const ARGON2_PARALLELISM: u32 = 1;

// Enforced minimums for security
const MIN_MEMORY: u32 = 8 * 1024; // 8 MiB minimum
const MIN_TIME_COST: u32 = 1;
const MIN_PARALLELISM: u32 = 1;
```

### Address Format

- **Legacy**: `dyt1{hex_body}{checksum}` (48 chars total)
- **PQC**: `dytallix1{bech32_encoded_hash}` (variable length, starts with "dytallix1")

### Public Key Serialization

```json
{
  "@type": "/dytallix.crypto.pqc.v1beta1.PubKey",
  "algorithm": "dilithium5",
  "key": "base64_encoded_key_bytes"
}
```

### Usage Examples

```bash
# Create deterministic PQC wallet
dcli wallet create --name my_wallet --deterministic --domain production

# Create random PQC wallet  
dcli wallet create --name my_wallet

# Show wallet info
dcli wallet show my_wallet

# Sign transaction
dcli wallet sign my_wallet --tx '{"amount":1000,"to":"dytallix1..."}'

# Export wallet public key
dcli wallet export my_wallet
```

## Test Results

All core functionality tests pass:
- ✅ Address format validation
- ✅ Argon2 configuration validation  
- ✅ Public key serialization format
- ✅ Different passphrases produce different keys
- ⚠️ Deterministic reproduction (pending seed-based implementation)

## Security Considerations

1. **Memory Safety**: Sensitive data is zeroized after use
2. **Parameter Validation**: Argon2id parameters are validated against minimums
3. **Crypto Agility**: Framework supports algorithm switching
4. **Salt Generation**: Deterministic and random salt generation modes

## Next Steps

1. Complete seed-based deterministic key generation
2. Resolve CLI compilation issues
3. Add comprehensive integration tests
4. Update documentation with complete usage examples
5. Implement legacy secp256k1 support