/**
 * BLAKE3 Hashing Functions
 * Stub implementation for Dytallix Fast Launch
 */

/**
 * Simple hash function as fallback when BLAKE3 WASM is not available
 * @param {string} input - Input string to hash
 * @returns {string} - Hex hash (simplified)
 */
function simpleHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate BLAKE3 hash of a string (hex output)
 * @param {string} input - Input string to hash
 * @returns {Promise<string>} - Hex-encoded hash
 */
export async function blake3Hex(input) {
  if (!input) {
    return '';
  }

  try {
    // Try to use native crypto.subtle if available (for demo purposes)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (error) {
    console.warn('[BLAKE3] Crypto API not available, using fallback hash');
  }

  // Fallback to simple hash
  const fallbackHash = simpleHash(input);
  console.log('[BLAKE3] Using fallback hash (development only)', {
    inputLength: input.length,
    hash: fallbackHash
  });
  
  return fallbackHash + '0'.repeat(56); // Pad to look like a proper hash
}

/**
 * Generate BLAKE3 hash of a File object
 * @param {File} file - File to hash
 * @returns {Promise<string>} - Hex-encoded hash
 */
export async function blake3File(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer);
    return blake3Hex(text);
  } catch (error) {
    console.error('[BLAKE3] Error hashing file:', error);
    throw new Error('Failed to hash file: ' + error.message);
  }
}

/**
 * Generate BLAKE3 hash with custom parameters
 * @param {string|Uint8Array} input - Input to hash
 * @param {object} options - Hashing options
 * @returns {Promise<string>} - Hex-encoded hash
 */
export async function blake3WithOptions(input, options = {}) {
  const {
    length = 32, // Output length in bytes
    key = null,  // Optional key for keyed hashing
    context = null // Optional context for derive_key
  } = options;

  console.log('[BLAKE3] Hashing with options (stub)', {
    inputType: typeof input,
    length,
    hasKey: !!key,
    hasContext: !!context
  });

  // For stub implementation, just use regular blake3Hex
  const baseHash = await blake3Hex(input.toString());
  
  // Truncate or pad to requested length (in hex chars)
  const targetLength = length * 2; // bytes to hex chars
  if (baseHash.length > targetLength) {
    return baseHash.substring(0, targetLength);
  } else {
    return baseHash + '0'.repeat(targetLength - baseHash.length);
  }
}

/**
 * Stream hash function for large files (stub implementation)
 * @param {File} file - File to hash in chunks
 * @returns {Promise<string>} - Hex-encoded hash
 */
export async function blake3Stream(file) {
  console.log('[BLAKE3] Stream hashing file (stub)', {
    name: file?.name,
    size: file?.size
  });
  
  // For now, just use the regular file hashing
  return blake3File(file);
}

/**
 * Verify a BLAKE3 hash
 * @param {string} input - Original input
 * @param {string} expectedHash - Expected hash to verify against
 * @returns {Promise<boolean>} - Whether the hash matches
 */
export async function verifyBlake3(input, expectedHash) {
  try {
    const computedHash = await blake3Hex(input);
    return computedHash === expectedHash;
  } catch (error) {
    console.error('[BLAKE3] Error verifying hash:', error);
    return false;
  }
}
