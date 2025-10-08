# PQC Keystore Export/Import

A robust, modular keystore system for Dytallix PQC Wallet that provides secure encryption and serialization of post-quantum cryptographic keys.

## Features

- **Strong Encryption**: AES-256-GCM with scrypt KDF (N=262144, r=8, p=1)
- **Post-Quantum Algorithms**: Support for ML-DSA (Dilithium) and SLH-DSA (SPHINCS+)
- **Full Address Storage**: Never truncates addresses - stores complete canonical form
- **Versioned Format**: Future-proof schema with version guards
- **Browser-Native**: Uses WebCrypto API for all cryptographic operations
- **Zero Dependencies**: Only requires `scrypt-js` for KDF

## JSON Keystore Format (Version 1)

```json
{
  "version": 1,
  "algorithm": "ML-DSA",
  "address": "pqc1ml1234567890abcdefghijklmnopqrstuvwxyz",
  "publicKey": "base64-encoded-public-key",
  "crypto": {
    "cipher": "aes-256-gcm",
    "ciphertext": "base64-encoded-encrypted-private-key",
    "iv": "base64-encoded-12-byte-nonce",
    "authTag": "base64-encoded-16-byte-tag",
    "salt": "base64-encoded-16-byte-salt",
    "kdf": "scrypt",
    "kdfparams": {
      "n": 262144,
      "r": 8,
      "p": 1,
      "dklen": 32
    }
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "meta": {
    "checksum": "base64-sha256-of-public-key",
    "note": "Dytallix PQC Wallet Keystore v1"
  }
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `version` | number | Keystore format version (currently 1) |
| `algorithm` | string | PQC algorithm: `"ML-DSA"` or `"SLH-DSA"` |
| `address` | string | Full canonical address (never truncated) |
| `publicKey` | string | Base64-encoded public key (optional) |
| `crypto.cipher` | string | Encryption cipher (always `"aes-256-gcm"`) |
| `crypto.ciphertext` | string | Base64-encoded encrypted private key |
| `crypto.iv` | string | Base64-encoded 12-byte initialization vector |
| `crypto.authTag` | string | Base64-encoded 16-byte authentication tag |
| `crypto.salt` | string | Base64-encoded KDF salt |
| `crypto.kdf` | string | Key derivation function (always `"scrypt"`) |
| `crypto.kdfparams` | object | Scrypt parameters |
| `createdAt` | string | ISO8601 timestamp |
| `meta.checksum` | string | SHA-256 hash of public key for integrity |
| `meta.note` | string | Optional user note |

## Usage

### Browser/React

```javascript
import { exportKeystore, serializeKeystore, importKeystore } from './wallet/keystore';
import { createWalletAdapter } from './wallet/pqc';

// Export a wallet to encrypted keystore
async function exportWallet(wallet, password) {
  const keystore = await exportKeystore(wallet, { password });
  const json = await serializeKeystore(keystore);
  
  // Download or save json
  return json;
}

// Import keystore and recover wallet
async function importWallet(json, password) {
  const result = await importKeystore(json, password);
  
  // result contains:
  // - algorithm: 'ML-DSA' | 'SLH-DSA'
  // - privateKey: Uint8Array (decrypted private key)
  // - addressCheck: string (for verification)
  
  return result;
}
```

### Wallet Adapter Interface

Your wallet must implement the `PQCWalletLike` interface:

```javascript
interface PQCWalletLike {
  getAddress(): Promise<string>;           // Returns full canonical address
  getAlgorithm(): 'ML-DSA' | 'SLH-DSA';   // Returns algorithm
  getPublicKey(): Promise<Uint8Array>;     // Returns public key bytes
  exportPrivateKeyRaw(): Promise<Uint8Array>; // Returns private key bytes
}
```

## Security Considerations

### Encryption

- **AES-256-GCM**: Authenticated encryption with 128-bit tag
- **Scrypt KDF**: Memory-hard function resistant to GPU attacks
  - Default N=262144 (2^18) for strong security
  - Configurable via export options
- **Random IVs**: 12-byte nonce generated using `crypto.getRandomValues()`
- **Random Salts**: 16-byte salt for each keystore

### Key Management

- Private keys are **zeroized** from memory after encryption
- Derived keys are **zeroized** after use
- No secrets logged or stored in plaintext
- WebCrypto API used for all cryptographic operations

### Password Requirements

- Minimum length: 8 characters
- Recommended: 12+ characters with mixed case, numbers, and symbols
- Consider using a password strength meter (e.g., `zxcvbn`)

### Best Practices

1. **Store keystores securely**: Treat encrypted keystores like encrypted private keys
2. **Use strong passwords**: Weak passwords can be brute-forced
3. **Backup multiple copies**: Store in different secure locations
4. **Verify checksums**: Check `meta.checksum` matches public key after import
5. **Test recovery**: Always test import before deleting original keys

## Error Handling

The module provides specific error types:

```javascript
try {
  const result = await importKeystore(json, password);
} catch (err) {
  if (err instanceof DecryptionAuthError) {
    // Wrong password or corrupted keystore
    console.error('Decryption failed - check password');
  } else if (err instanceof KeystoreParseError) {
    // Invalid JSON or schema
    console.error('Invalid keystore format');
  } else if (err instanceof KeystoreVersionUnsupportedError) {
    // Version not supported
    console.error('Unsupported keystore version:', err.version);
  } else if (err instanceof CryptoUnavailableError) {
    // WebCrypto not available
    console.error('Browser does not support WebCrypto');
  }
}
```

## Migration Path (Future: v2+)

Version 2 may include:

- **PBKDF2 fallback**: Alternative KDF for constrained environments
- **Concatenated format**: `authTag` included in `ciphertext` (some implementations prefer this)
- **Multiple key support**: Store multiple keypairs in one keystore
- **Metadata extensions**: Additional fields for key derivation paths, etc.

The `schema.js` module includes version guards and validation to ensure forward compatibility.

## Module Structure

```
wallet/keystore/
├── types.js      # TypeScript-style JSDoc types and error classes
├── utils.js      # Encoding, hashing, and buffer utilities
├── scrypt.js     # Scrypt KDF wrapper
├── aesgcm.js     # AES-GCM encryption/decryption
├── schema.js     # JSON schema validation and version guards
├── export.js     # Export keystore function
├── import.js     # Import keystore function
└── index.js      # Public API exports
```

## Testing

Run the test suite:

```bash
npm test -- frontend/src/wallet/keystore/keystore.test.js
```

Test coverage includes:
- Round-trip export/import for both ML-DSA and SLH-DSA
- Wrong password error handling
- Schema validation (missing fields, invalid types)
- Version compatibility
- Address integrity checks
- Custom KDF parameters
- Edge cases (long addresses, buffer zeroization)

## License

MIT

## Contributing

1. All cryptographic operations must use WebCrypto or audited libraries
2. Never log or store secrets in plaintext
3. Maintain test coverage ≥90%
4. Document all public APIs with JSDoc
5. Follow existing code style
