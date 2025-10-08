// Types and interfaces for PQC Keystore v1

/**
 * @typedef {'ML-DSA' | 'SLH-DSA'} PQCAlgorithm
 */

/**
 * @typedef {Object} KDFParams
 * @property {number} n - CPU/memory cost parameter (must be power of 2)
 * @property {number} r - Block size parameter
 * @property {number} p - Parallelization parameter
 * @property {number} dklen - Derived key length in bytes
 */

/**
 * @typedef {Object} CryptoParams
 * @property {'aes-256-gcm'} cipher - Encryption cipher
 * @property {string} ciphertext - Base64 encoded encrypted private key
 * @property {string} iv - Base64 encoded initialization vector (12 bytes)
 * @property {string} authTag - Base64 encoded authentication tag (16 bytes)
 * @property {string} salt - Base64 encoded KDF salt
 * @property {'scrypt'} kdf - Key derivation function
 * @property {KDFParams} kdfparams - KDF parameters
 */

/**
 * @typedef {Object} KeystoreMeta
 * @property {string} [checksum] - SHA-256 hash of public key (base64)
 * @property {string} [note] - Optional user note
 */

/**
 * @typedef {Object} KeystoreV1
 * @property {1} version - Keystore version
 * @property {PQCAlgorithm} algorithm - PQC scheme used (ML-DSA or SLH-DSA)
 * @property {string} address - FULL canonical address (never truncated)
 * @property {string} [publicKey] - Optional base64 encoded public key
 * @property {CryptoParams} crypto - Encryption parameters
 * @property {string} createdAt - ISO8601 timestamp
 * @property {KeystoreMeta} [meta] - Optional metadata
 */

/**
 * @typedef {Object} ExportOptions
 * @property {string} password - Password to encrypt the keystore
 * @property {Partial<KDFParams>} [kdf] - Optional KDF parameter overrides
 * @property {() => Date} [now] - Optional time provider for testing
 */

/**
 * @typedef {Object} ImportResult
 * @property {PQCAlgorithm} algorithm - Algorithm from keystore
 * @property {Uint8Array} privateKey - Decrypted private key bytes
 * @property {string} [addressCheck] - Address from keystore for verification
 */

// Error classes
export class KeystoreError extends Error {
  constructor(message) {
    super(message);
    this.name = 'KeystoreError';
  }
}

export class KeystoreParseError extends KeystoreError {
  constructor(message) {
    super(message);
    this.name = 'KeystoreParseError';
  }
}

export class KeystoreVersionUnsupportedError extends KeystoreError {
  constructor(version) {
    super(`Unsupported keystore version: ${version}`);
    this.name = 'KeystoreVersionUnsupportedError';
    this.version = version;
  }
}

export class DecryptionAuthError extends KeystoreError {
  constructor(message = 'Decryption failed. Check your password and try again.') {
    super(message);
    this.name = 'DecryptionAuthError';
  }
}

export class CryptoUnavailableError extends KeystoreError {
  constructor(message = 'WebCrypto API is not available') {
    super(message);
    this.name = 'CryptoUnavailableError';
  }
}

// Default KDF parameters (N=262144, r=8, p=1, dklen=32)
export const DEFAULT_KDF_PARAMS = {
  n: 262144, // 2^18
  r: 8,
  p: 1,
  dklen: 32
};
