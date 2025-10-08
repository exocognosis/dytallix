// Import keystore functionality

import { DecryptionAuthError } from './types.js';
import { base64ToArray, zeroize } from './utils.js';
import { parseAndValidate } from './schema.js';
import { deriveKey } from './scrypt.js';
import { decryptAESGCM } from './aesgcm.js';

/**
 * Import and decrypt a keystore
 * @param {string} json - Keystore JSON string
 * @param {string} password - Decryption password
 * @returns {Promise<Object>} ImportResult with algorithm, privateKey, and addressCheck
 * @throws {KeystoreParseError | KeystoreVersionUnsupportedError | DecryptionAuthError}
 */
export async function importKeystore(json, password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  
  // Parse and validate JSON structure
  const keystore = parseAndValidate(json);
  
  let derivedKey = null;
  
  try {
    // Extract crypto parameters
    const { ciphertext, iv, authTag, salt, kdfparams } = keystore.crypto;
    
    // Convert from base64
    const ciphertextBytes = base64ToArray(ciphertext);
    const ivBytes = base64ToArray(iv);
    const authTagBytes = base64ToArray(authTag);
    const saltBytes = base64ToArray(salt);
    
    // Derive key from password
    derivedKey = await deriveKey(password, saltBytes, kdfparams);
    
    // Decrypt private key
    let privateKey;
    try {
      privateKey = await decryptAESGCM(ciphertextBytes, authTagBytes, derivedKey, ivBytes);
    } catch {
      // Decryption failed - likely wrong password
      throw new DecryptionAuthError('Decryption failed. Check your password and try again.');
    }
    
    // Clean up derived key
    zeroize(derivedKey);
    
    // Return import result
    return {
      algorithm: keystore.algorithm,
      privateKey,
      addressCheck: keystore.address // For verification by caller
    };
  } catch (err) {
    // Clean up on error
    if (derivedKey) zeroize(derivedKey);
    
    // Re-throw known errors
    if (err instanceof DecryptionAuthError) {
      throw err;
    }
    
    // Wrap other errors
    if (err.name === 'KeystoreParseError' || err.name === 'KeystoreVersionUnsupportedError') {
      throw err;
    }
    
    throw new DecryptionAuthError('Decryption failed: ' + err.message);
  }
}
