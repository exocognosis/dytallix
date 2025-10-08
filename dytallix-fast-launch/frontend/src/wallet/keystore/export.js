// Export keystore functionality

import { DEFAULT_KDF_PARAMS } from './types.js';
import { arrayToBase64, computeChecksum, randomBytes, zeroize } from './utils.js';
import { deriveKey, prepareKDFParams } from './scrypt.js';
import { encryptAESGCM } from './aesgcm.js';

/**
 * Export a PQC wallet to encrypted keystore format
 * @param {Object} wallet - PQCWalletLike object
 * @param {Function} wallet.getAddress - Returns full canonical address
 * @param {Function} wallet.getAlgorithm - Returns 'ML-DSA' or 'SLH-DSA'
 * @param {Function} wallet.getPublicKey - Returns Uint8Array public key
 * @param {Function} wallet.exportPrivateKeyRaw - Returns Uint8Array private key
 * @param {Object} opts - Export options
 * @param {string} opts.password - Encryption password
 * @param {Object} [opts.kdf] - Optional KDF parameter overrides
 * @param {Function} [opts.now] - Optional time provider for testing
 * @returns {Promise<Object>} KeystoreV1 object
 */
export async function exportKeystore(wallet, opts) {
  const { password, kdf, now } = opts;
  
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  
  // Get wallet data
  const address = await wallet.getAddress();
  const algorithm = wallet.getAlgorithm();
  const publicKey = await wallet.getPublicKey();
  const privateKeyRaw = await wallet.exportPrivateKeyRaw();
  
  try {
    // Prepare KDF parameters
    const kdfParams = prepareKDFParams(kdf, DEFAULT_KDF_PARAMS);
    
    // Generate random salt and IV
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    
    // Derive encryption key from password
    const derivedKey = await deriveKey(password, salt, kdfParams);
    
    // Encrypt private key
    const { ciphertext, authTag } = await encryptAESGCM(privateKeyRaw, derivedKey, iv);
    
    // Zero out sensitive data
    zeroize(privateKeyRaw);
    zeroize(derivedKey);
    
    // Compute checksum of public key
    const checksum = await computeChecksum(publicKey);
    
    // Build keystore object
    const keystore = {
      version: 1,
      algorithm,
      address,
      publicKey: arrayToBase64(publicKey),
      crypto: {
        cipher: 'aes-256-gcm',
        ciphertext: arrayToBase64(ciphertext),
        iv: arrayToBase64(iv),
        authTag: arrayToBase64(authTag),
        salt: arrayToBase64(salt),
        kdf: 'scrypt',
        kdfparams: kdfParams
      },
      createdAt: (now ? now() : new Date()).toISOString(),
      meta: {
        checksum,
        note: 'Dytallix PQC Wallet Keystore v1'
      }
    };
    
    return keystore;
  } catch (err) {
    // Clean up on error
    if (privateKeyRaw) zeroize(privateKeyRaw);
    throw err;
  }
}

/**
 * Serialize keystore to JSON string with stable ordering
 * @param {Object} keystore - KeystoreV1 object
 * @returns {Promise<string>} JSON string
 */
export async function serializeKeystore(keystore) {
  // Use JSON.stringify with ordered keys for deterministic output
  return JSON.stringify(keystore, null, 2);
}
