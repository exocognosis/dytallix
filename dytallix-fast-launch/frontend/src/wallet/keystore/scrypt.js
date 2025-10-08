// Scrypt KDF wrapper for browser using scrypt-js

import scrypt from 'scrypt-js';

/**
 * Derive a key from password using scrypt
 * @param {string} password - User password
 * @param {Uint8Array} salt - Random salt (recommended: 16+ bytes)
 * @param {Object} params - Scrypt parameters
 * @param {number} params.n - CPU/memory cost (power of 2)
 * @param {number} params.r - Block size
 * @param {number} params.p - Parallelization
 * @param {number} params.dklen - Derived key length
 * @returns {Promise<Uint8Array>} - Derived key
 */
export async function deriveKey(password, salt, params) {
  const { n, r, p, dklen } = params;
  
  // Convert password to bytes
  const passwordBytes = new TextEncoder().encode(password);
  
  // Run scrypt (this is CPU-intensive and may take a few seconds)
  const derivedKey = await scrypt.scrypt(
    passwordBytes,
    salt,
    n,
    r,
    p,
    dklen
  );
  
  return new Uint8Array(derivedKey);
}

/**
 * Prepare scrypt parameters for keystore (validate and serialize)
 * @param {Partial<{n: number, r: number, p: number, dklen: number}>} overrides
 * @param {{n: number, r: number, p: number, dklen: number}} defaults
 * @returns {{n: number, r: number, p: number, dklen: number}}
 */
export function prepareKDFParams(overrides = {}, defaults) {
  const params = { ...defaults, ...overrides };
  
  // Validate n is power of 2
  if ((params.n & (params.n - 1)) !== 0 || params.n === 0) {
    throw new Error('KDF parameter n must be a power of 2');
  }
  
  // Validate positive integers
  if (params.r <= 0 || params.p <= 0 || params.dklen <= 0) {
    throw new Error('KDF parameters r, p, and dklen must be positive');
  }
  
  return params;
}
