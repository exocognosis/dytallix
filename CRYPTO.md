# Dytallix Cryptographic Schema and Transaction Format

## Overview

This document describes the canonical transaction format, signature scheme, hashing, and validation rules for the Dytallix blockchain. The schema is unified across CLI and Node implementations to ensure interoperability and security.

## Transaction Schema

### Message Types

All transaction messages follow the canonical JSON schema:

```rust
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(tag="type", rename_all="snake_case")]
pub enum Msg {
    Send { 
        from: String,      // Sender address (dyt1...)
        to: String,        // Recipient address (dyt1...)
        denom: String,     // Token denomination ("DGT" or "DRT")
        amount: u128       // Amount in smallest units (serialized as string)
    }
}
```

**Validation Rules:**
- `amount` must be > 0
- `from` and `to` addresses cannot be empty
- `denom` must be "DGT" or "DRT" (case-insensitive)
- Addresses should follow dyt1... format (see Address Derivation)

### Transaction Structure

```rust
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Tx {
    pub chain_id: String,  // Network identifier
    pub nonce: u64,        // Account sequence number
    pub msgs: Vec<Msg>,    // Transaction messages
    pub fee: u128,         // Transaction fee (serialized as string)
    pub memo: String,      // Optional memo field
}
```

**Validation Rules:**
- `chain_id` cannot be empty
- `msgs` must contain at least one message
- `fee` must be > 0
- All messages must pass individual validation

### Signed Transaction Envelope

```rust
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct SignedTx {
    pub tx: Tx,
    pub public_key: String,    // Base64-encoded public key
    pub signature: String,     // Base64-encoded signature
    pub algorithm: String,     // Signature algorithm ("dilithium5")
    pub version: u32,          // Envelope version (1)
}
```

## Cryptographic Specifications

### Hashing Algorithm

- **Primary Hash:** SHA3-256 (Keccak-256)
- **Address Derivation:** Blake3 + SHA256 checksum
- **Canonical JSON:** Uses `serde_json::to_vec()` for deterministic serialization

### Signature Algorithm

- **Default:** Dilithium5 (Post-Quantum Cryptography)
- **Alternative:** Mock signatures for testing (feature flag `pqc-mock`)
- **Envelope Version:** 1 (current)

### Signature Process

1. Serialize transaction to canonical JSON bytes
2. Hash with SHA3-256
3. Sign hash with private key using Dilithium5
4. Encode signature and public key as Base64
5. Create SignedTx envelope

```rust
// Signing
let bytes = canonical_json(&tx)?;
let hash = sha3_256(&bytes);
let signature = ActivePQC::sign(private_key, &hash);

// Verification  
let bytes = canonical_json(&signed_tx.tx)?;
let hash = sha3_256(&bytes);
let valid = ActivePQC::verify(&public_key, &hash, &signature);
```

## Address Derivation

### Format
- **Prefix:** `dyt1`
- **Encoded Data:** 48 hexadecimal characters (24 bytes)
- **Total Length:** 52 characters
- **Example:** `dyt1e1c820e653bb12629306be2af671e2aab83074cdf6193cf6`

### Derivation Process
1. Hash public key with Blake3 (32 bytes output)
2. Take first 20 bytes as address portion
3. Calculate SHA256 checksum of the 20-byte portion
4. Append first 4 bytes of checksum
5. Encode as hexadecimal with "dyt1" prefix

```rust
pub fn get_address(pubkey: &[u8]) -> String {
    let hash = blake3::hash(pubkey);
    let address_bytes = &hash.as_bytes()[..20];
    let checksum = sha2::Sha256::digest(address_bytes);
    let checksum_bytes = &checksum[..4];
    
    let mut full_bytes = [0u8; 24];
    full_bytes[..20].copy_from_slice(address_bytes);
    full_bytes[20..].copy_from_slice(checksum_bytes);
    
    format!("dyt1{}", hex::encode(full_bytes))
}
```

## Wire Format

### Amount Serialization

All `u128` amounts and fees are serialized as strings to prevent precision loss:

```json
{
  "type": "send",
  "from": "dyt1...",
  "to": "dyt1...", 
  "denom": "DGT",
  "amount": "1000000000000000000"
}
```

### Complete Transaction Example

```json
{
  "signed_tx": {
    "tx": {
      "chain_id": "dytallix-mainnet-1",
      "nonce": 42,
      "msgs": [
        {
          "type": "send",
          "from": "dyt1alice123456789012345678901234567890123456",
          "to": "dyt1bob123456789012345678901234567890123456",
          "denom": "DGT",
          "amount": "1000000000000000000"
        }
      ],
      "fee": "10000000000000000",
      "memo": "Payment for services"
    },
    "public_key": "base64_encoded_public_key...",
    "signature": "base64_encoded_signature...",
    "algorithm": "dilithium5",
    "version": 1
  }
}
```

## Validation and Error Handling

### HTTP Status Codes

| Error Type | HTTP Status | Error Code | Description |
|------------|-------------|------------|-------------|
| Invalid Signature | 422 | `INVALID_SIGNATURE` | Signature verification failed |
| Invalid Chain ID | 422 | `INVALID_CHAIN_ID` | Wrong network |
| Invalid Nonce | 409 | `INVALID_NONCE` | Sequence number mismatch |
| Insufficient Funds | 422 | `INSUFFICIENT_FUNDS` | Not enough balance |
| Duplicate Transaction | 409 | `DUPLICATE_TRANSACTION` | TX already exists |
| Mempool Full | 503 | `MEMPOOL_FULL` | Cannot accept more TXs |

### Error Response Format

```json
{
  "error": "INVALID_NONCE",
  "message": "Invalid nonce: expected 5, got 3",
  "expected": 5,
  "got": 3
}
```

## Transaction Hash

Transactions are identified by their canonical hash:

```rust
pub fn tx_hash(tx: &Tx) -> Result<String> {
    let bytes = canonical_json(tx)?;
    let hash = sha3_256(&bytes);
    Ok(format!("0x{}", hex::encode(hash)))
}
```

**Properties:**
- Deterministic (same transaction produces same hash)
- 66 characters (`0x` + 64 hex chars)
- Used for mempool deduplication and transaction lookup
- Derived from canonical JSON representation

## Feature Flags

### PQC (Post-Quantum Cryptography)
- `pqc-real`: Use real Dilithium5 implementation (default)
- `pqc-mock`: Use deterministic mock signatures for testing

### Legacy Support
- `legacy-submit`: Enable legacy submission logic (OFF by default, dev-only)

## Security Considerations

### Private Key Handling
- Private keys are NEVER logged or exposed in error messages
- Keys are zeroized after use when possible
- Use secure memory allocation for key storage

### Replay Protection
- Nonce sequence prevents transaction replay
- Chain ID prevents cross-network replay
- Transaction hash deduplication in mempool

### Signature Security
- Dilithium5 provides post-quantum security
- Hash-then-sign pattern with SHA3-256
- Algorithm and version fields prevent downgrade attacks

## Implementation Notes

### CLI Integration
- Use `cli/src/types/tx.rs` for canonical types
- Legacy tx.rs provides compatibility layer
- Address derivation in `cli/src/addr.rs`

### Node Integration  
- Use `node/src/types/tx.rs` for canonical types
- Address derivation in `node/src/addr.rs` mirrors CLI
- RPC endpoint `/submit` only accepts `{"signed_tx": SignedTx}`

### Testing
- Comprehensive test suites in `cli/tests/crypto_interop.rs` and `node/tests/validation.rs`
- Cross-compatibility tests ensure CLI and Node interoperability
- Mock PQC support for deterministic testing

## Migration Path

1. **Phase 1:** Canonical types introduced (✅ Complete)
2. **Phase 2:** New RPC validation with error codes (✅ Complete) 
3. **Phase 3:** Legacy removal (behind feature flag)
4. **Phase 4:** Full migration to canonical-only format

## Examples

See `reports/smoke/crypto_interop.md` for complete usage examples and test transcripts.