/**
 * Envelope encryption for quantum-safe data protection
 * Stub implementation for Dytallix Fast Launch
 */

/**
 * Encrypt data using envelope encryption with password
 * @param {string|ArrayBuffer} data - Data to encrypt
 * @param {string} password - Password for encryption
 * @param {object} options - Encryption options
 * @returns {Promise<object>} - Encrypted envelope
 */
export async function encryptEnvelope(data, password = null, options = {}) {
  const {
    algorithm = 'AES-256-GCM',
    keyDerivation = 'PBKDF2',
    iterations = 100000
  } = options;

  console.log('[Envelope] Encrypting data', {
    dataType: typeof data,
    dataLength: data?.length || data?.byteLength,
    algorithm,
    keyDerivation,
    hasPassword: !!password
  });

  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    
    let ciphertextBytes, derivedKey;
    
    if (password) {
      // Real password-based encryption
      console.log('[Envelope] Using password-based encryption');
      
      // Derive key from password using PBKDF2
      const passwordBuffer = new TextEncoder().encode(password);
      const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      );
      
      derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: iterations,
          hash: 'SHA-256'
        },
        baseKey,
        {
          name: 'AES-GCM',
          length: 256
        },
        false,
        ['encrypt']
      );
      
      // Encrypt data with AES-GCM
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        derivedKey,
        dataBytes
      );
      
      ciphertextBytes = new Uint8Array(encryptedData);
      
    } else {
      // Fallback to mock encryption for development
      console.log('[Envelope] Using mock encryption (no password provided)');
      
      ciphertextBytes = new Uint8Array(dataBytes.length + 16);
      const pattern = new Uint8Array([0xAB, 0xCD, 0xEF, 0x12]);
      
      for (let i = 0; i < dataBytes.length; i++) {
        ciphertextBytes[i] = dataBytes[i] ^ pattern[i % pattern.length];
      }
      
      const padding = crypto.getRandomValues(new Uint8Array(16));
      ciphertextBytes.set(padding, dataBytes.length);
    }
    
    // Convert to base64 for envelope metadata (safe for binary data)
    // Use a proper base64 encoding that handles binary data correctly
    const sampleSize = Math.min(ciphertextBytes.length, 100);
    const sampleBytes = ciphertextBytes.slice(0, sampleSize);
    
    // Safe base64 encoding: convert bytes to binary string chunk by chunk
    let binaryString = '';
    for (let i = 0; i < sampleBytes.length; i++) {
      binaryString += String.fromCharCode(sampleBytes[i]);
    }
    const ciphertextBase64 = btoa(binaryString);
    
    // Generate mock key for the return format (real key is not exposed)
    const mockKey = crypto.getRandomValues(new Uint8Array(32));
    
    const envelope = {
      version: '1.0',
      algorithm,
      keyDerivation,
      iterations,
      salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
      ciphertext: ciphertextBase64,
      timestamp: new Date().toISOString(),
      passwordProtected: !!password,
      metadata: {
        originalSize: dataBytes.length,
        encryptedSize: ciphertextBytes.length
      }
    };

    // Return the format expected by UploadCard
    return {
      ciphertext: ciphertextBytes,     // Uint8Array for upload
      key: mockKey,                    // Mock key (real key is derived from password)
      nonce: iv,                       // Uint8Array nonce/IV
      envelope: envelope,              // Full envelope for reference
      salt: salt,                      // Salt needed for decryption
      iterations: iterations           // Iterations needed for decryption
    };
  } catch (error) {
    console.error('[Envelope] Encryption error:', error);
    throw new Error('Failed to encrypt data: ' + error.message);
  }
}

/**
 * Decrypt encrypted data with password
 * @param {Uint8Array} encryptedData - Encrypted data
 * @param {string} password - Password for decryption
 * @param {Uint8Array} salt - Salt used during encryption
 * @param {Uint8Array} iv - IV used during encryption
 * @param {number} iterations - PBKDF2 iterations
 * @returns {Promise<Uint8Array>} - Decrypted data
 */
export async function decryptWithPassword(encryptedData, password, salt, iv, iterations = 100000) {
  console.log('[Envelope] Decrypting with password', {
    encryptedSize: encryptedData.length,
    hasPassword: !!password,
    iterations
  });

  try {
    if (!password) {
      throw new Error('Password is required for decryption');
    }

    // Derive the same key from password and salt
    const passwordBuffer = new TextEncoder().encode(password);
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['decrypt']
    );
    
    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      derivedKey,
      encryptedData
    );
    
    return new Uint8Array(decryptedData);
  } catch (error) {
    console.error('[Envelope] Decryption error:', error);
    if (error.name === 'OperationError') {
      throw new Error('Invalid password or corrupted data');
    }
    throw new Error('Failed to decrypt data: ' + error.message);
  }
}

/**
 * Decrypt data from an envelope (legacy function)
 * @param {object} envelope - Encrypted envelope
 * @param {string} password - Password for decryption
 * @returns {Promise<string>} - Decrypted data
 */
export async function decryptEnvelope(envelope, password) {
  console.log('[Envelope] Decrypting envelope', {
    version: envelope?.version,
    algorithm: envelope?.algorithm,
    hasPassword: !!password,
    passwordProtected: envelope?.passwordProtected
  });

  try {
    if (!envelope || !envelope.ciphertext) {
      throw new Error('Invalid envelope');
    }

    if (envelope.passwordProtected && !password) {
      throw new Error('Password is required for this encrypted file');
    }

    if (envelope.passwordProtected) {
      // This is a placeholder - in a real implementation, you'd need
      // the actual encrypted data bytes, not just the base64 sample
      throw new Error('Real decryption requires the full encrypted file data');
    } else {
      // Mock decryption for non-password protected files
      const decoded = atob(envelope.ciphertext);
      const originalData = decoded.replace(/_encrypted_\d+$/, '');
      return originalData;
    }
  } catch (error) {
    console.error('[Envelope] Decryption error:', error);
    throw new Error('Failed to decrypt data: ' + error.message);
  }
}

/**
 * Generate a random encryption key
 * @param {number} length - Key length in bytes
 * @returns {Promise<string>} - Generated key (hex)
 */
export async function generateEncryptionKey(length = 32) {
  console.log('[Envelope] Generating encryption key (stub)', { length });
  
  try {
    const key = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(key).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('[Envelope] Key generation error:', error);
    // Fallback for environments without crypto API
    let key = '';
    for (let i = 0; i < length * 2; i++) {
      key += Math.floor(Math.random() * 16).toString(16);
    }
    return key;
  }
}

/**
 * Validate an envelope structure
 * @param {object} envelope - Envelope to validate
 * @returns {boolean} - Whether the envelope is valid
 */
export function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== 'object') {
    return false;
  }

  const requiredFields = ['version', 'algorithm', 'ciphertext', 'salt', 'iv'];
  
  for (const field of requiredFields) {
    if (!envelope[field]) {
      console.warn('[Envelope] Missing required field:', field);
      return false;
    }
  }

  return true;
}

/**
 * Get envelope metadata
 * @param {object} envelope - Envelope to analyze
 * @returns {object} - Envelope metadata
 */
export function getEnvelopeMetadata(envelope) {
  if (!validateEnvelope(envelope)) {
    return null;
  }

  return {
    version: envelope.version,
    algorithm: envelope.algorithm,
    keyDerivation: envelope.keyDerivation,
    iterations: envelope.iterations,
    timestamp: envelope.timestamp,
    originalSize: envelope.metadata?.originalSize,
    encryptedSize: envelope.metadata?.encryptedSize,
    isValid: true
  };
}
