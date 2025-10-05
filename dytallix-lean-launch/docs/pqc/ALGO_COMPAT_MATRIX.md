# PQC Algorithm Compatibility Matrix

**Single Source of Truth for Post-Quantum Cryptography in Dytallix**

Version: 1.0  
Last Updated: 2025-01-XX

---

## Overview

This document defines the canonical PQC algorithms supported by the Dytallix network, including algorithm identifiers, key/signature sizes, serialization rules, and verification parameters.

## Supported Algorithms

### Default Algorithm: dilithium3

**Algorithm ID**: `dilithium3`  
**NIST Security Level**: 3 (equivalent to AES-192)  
**Status**: ✅ **PRIMARY** (recommended for all transactions)

**Key Specifications:**
- Public Key Size: 1952 bytes
- Secret Key Size: 4016 bytes
- Signature Size: 3309 bytes (includes message)
- Signing Time: ~2.3ms
- Verification Time: ~1.8ms

**Use Cases:**
- Transaction signatures
- Block validation
- Validator consensus
- Cross-chain operations

---

### Alternate Algorithm: dilithium5

**Algorithm ID**: `dilithium5`  
**NIST Security Level**: 5 (equivalent to AES-256)  
**Status**: ⚠️ **SUPPORTED** (higher security, larger signatures)

**Key Specifications:**
- Public Key Size: 2592 bytes
- Secret Key Size: 4880 bytes
- Signature Size: 4627 bytes (includes message)
- Signing Time: ~3.5ms
- Verification Time: ~2.5ms

**Use Cases:**
- High-value transactions requiring maximum security
- Long-term key storage scenarios

---

### Optional Algorithm: falcon512

**Algorithm ID**: `falcon512`  
**NIST Security Level**: 1 (equivalent to AES-128)  
**Status**: 🔧 **EXPERIMENTAL** (feature-gated, smaller signatures)

**Key Specifications:**
- Public Key Size: 897 bytes
- Secret Key Size: 1281 bytes
- Signature Size: ~666 bytes (variable)
- Signing Time: ~8ms
- Verification Time: ~0.5ms

**Use Cases:**
- Resource-constrained environments
- Fast verification requirements

---

## Canonical Transaction Serialization

All PQC signatures are computed over the canonical representation of a transaction.

### Serialization Rules

1. **Field Order**: Strict alphabetical ordering of JSON keys
2. **Number Encoding**: All numbers serialized as strings for 128-bit safety
3. **No Whitespace**: Compact JSON with no formatting
4. **Stable Encoder**: Use `serde_json` with `preserve_order` feature

### Example Canonical Transaction

```json
{
  "chain_id": "dyt-local-1",
  "fee": "1000",
  "memo": "",
  "msgs": [
    {
      "amount": "1000000",
      "denom": "DGT",
      "from": "dytallix1...",
      "to": "dytallix1...",
      "type": "send"
    }
  ],
  "nonce": 0
}
```

### Domain-Separated Hash

Before signing, the canonical JSON bytes are hashed with domain separation:

```
prehash = SHA3-256("DYT|tx|v1|" + canonical_json_bytes)
```

**Domain Prefix**: `DYT|tx|v1|`  
**Hash Algorithm**: SHA3-256 (32 bytes output)  
**Purpose**: Prevents signature reuse across contexts

---

## Wire Format

### SignedTx Envelope

```json
{
  "tx": { /* canonical transaction fields */ },
  "public_key": "<base64-encoded-public-key>",
  "signature": "<base64-encoded-signature>",
  "algorithm": "dilithium3",
  "version": 1
}
```

### Field Descriptions

- **tx**: The unsigned transaction object (canonical fields)
- **public_key**: Base64-encoded public key bytes
- **signature**: Base64-encoded signature bytes (includes signed message)
- **algorithm**: One of: `dilithium3`, `dilithium5`, `falcon512`
- **version**: Protocol version (currently 1)

---

## Address Encoding

**Format**: Bech32  
**Prefix**: `dytallix`  
**Derivation**: Public key → SHA3-256 → first 20 bytes → bech32 encode

Example: `dytallix10c66ed458dff3342ae933a1b51245bae0f30419e`

---

## Algorithm Selection & Configuration

### Environment Variables

**Node Configuration:**
```bash
DYT_PQC_ALGO_DEFAULT=dilithium3
DYT_PQC_ALGO_ALLOWLIST=dilithium3,dilithium5
```

**CLI Configuration:**
```bash
DYTX_PQC_ALGO=dilithium3
```

### Default Behavior

- **CLI**: Uses `DYT_PQC_ALGO_DEFAULT` if not specified
- **Node**: Validates incoming transactions against `DYT_PQC_ALGO_ALLOWLIST`
- **Rejection**: Transactions with non-allowlisted algorithms return HTTP 422 with `INVALID_SIGNATURE_ALGO`

---

## Verification Flow

```
1. Extract algorithm from SignedTx envelope
2. Validate algorithm is in allowlist (node-side)
3. Decode base64 public key and signature
4. Validate key/signature sizes for algorithm
5. Construct canonical transaction JSON
6. Compute domain-separated prehash
7. Verify signature: open(signature, public_key) == prehash
8. If valid, accept transaction and include algorithm in receipt
```

---

## Error Codes

| Code | Description | Mitigation |
|------|-------------|------------|
| `INVALID_SIGNATURE_ALGO` | Algorithm not in allowlist | Use `dilithium3` or check node config |
| `INVALID_SIGNATURE` | Signature verification failed | Check key, message, and algorithm match |
| `INVALID_PUBLIC_KEY` | Public key wrong size/format | Verify key generation and encoding |
| `UNSUPPORTED_ALGORITHM` | Algorithm not compiled | Node built without optional features |

---

## Migration & Compatibility

### Version History

- **v1.0**: Initial specification with dilithium3 as default
- Backwards compatibility: Transactions without `algorithm` field default to `dilithium5` (legacy)

### Future Algorithms

To add a new algorithm:
1. Update this spec with algorithm details
2. Add algorithm enum variant to `node/src/crypto/pqc_verify.rs`
3. Implement verification function
4. Add to `DYT_PQC_ALGO_ALLOWLIST` in production config
5. Update WASM manifest
6. Generate and test KATs

---

## References

- [NIST PQC Standardization](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [CRYSTALS-Dilithium Specification](https://pq-crystals.org/dilithium/)
- [FALCON Specification](https://falcon-sign.info/)
- [pqcrypto Rust Crate](https://github.com/rustpq/pqcrypto)

---

## Appendix: Algorithm Comparison Table

| Feature | dilithium3 | dilithium5 | falcon512 |
|---------|-----------|-----------|-----------|
| Security Level | NIST-3 (AES-192) | NIST-5 (AES-256) | NIST-1 (AES-128) |
| Public Key | 1952 B | 2592 B | 897 B |
| Signature | 3309 B | 4627 B | ~666 B |
| Sign Time | 2.3 ms | 3.5 ms | 8 ms |
| Verify Time | 1.8 ms | 2.5 ms | 0.5 ms |
| Recommended | ✅ Yes | ⚠️ High security | 🔧 Experimental |
