// AES-256-GCM encryption and decryption using WebCrypto API

import { CryptoUnavailableError } from './types.js';

/**
 * Check if WebCrypto is available
 * @throws {CryptoUnavailableError}
 */
function ensureCryptoAvailable() {
  if (!crypto || !crypto.subtle) {
    throw new CryptoUnavailableError();
  }
}

/**
 * Encrypt data using AES-256-GCM
 * @param {Uint8Array} plaintext - Data to encrypt
 * @param {Uint8Array} key - 32-byte encryption key
 * @param {Uint8Array} iv - 12-byte initialization vector
 * @returns {Promise<{ciphertext: Uint8Array, authTag: Uint8Array}>}
 */
export async function encryptAESGCM(plaintext, key, iv) {
  ensureCryptoAvailable();
  
  if (key.length !== 32) {
    throw new Error('AES-256-GCM requires a 32-byte key');
  }
  if (iv.length !== 12) {
    throw new Error('AES-GCM requires a 12-byte IV');
  }
  
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt (this produces ciphertext + auth tag concatenated)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv, tagLength: 128 }, // 128-bit (16-byte) tag
    cryptoKey,
    plaintext
  );
  
  const encryptedBytes = new Uint8Array(encrypted);
  
  // Split ciphertext and auth tag (last 16 bytes)
  const ciphertext = encryptedBytes.slice(0, -16);
  const authTag = encryptedBytes.slice(-16);
  
  return { ciphertext, authTag };
}

/**
 * Decrypt data using AES-256-GCM
 * @param {Uint8Array} ciphertext - Encrypted data
 * @param {Uint8Array} authTag - 16-byte authentication tag
 * @param {Uint8Array} key - 32-byte decryption key
 * @param {Uint8Array} iv - 12-byte initialization vector
 * @returns {Promise<Uint8Array>} - Decrypted plaintext
 * @throws {Error} If authentication fails (wrong password/corrupted data)
 */
export async function decryptAESGCM(ciphertext, authTag, key, iv) {
  ensureCryptoAvailable();
  
  if (key.length !== 32) {
    throw new Error('AES-256-GCM requires a 32-byte key');
  }
  if (iv.length !== 12) {
    throw new Error('AES-GCM requires a 12-byte IV');
  }
  if (authTag.length !== 16) {
    throw new Error('AES-GCM authentication tag must be 16 bytes');
  }
  
  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Concatenate ciphertext and auth tag for WebCrypto
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);
  
  try {
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 },
      cryptoKey,
      combined
    );
    
    return new Uint8Array(decrypted);
  } catch {
    // WebCrypto throws if authentication fails
    throw new Error('Decryption failed: authentication error');
  }
}
