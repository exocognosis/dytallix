// Utility functions for encoding/decoding and buffer operations

/**
 * Convert Uint8Array to base64 string
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function arrayToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 * @param {string} base64
 * @returns {Uint8Array}
 */
export function base64ToArray(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Zero out sensitive data in a Uint8Array
 * @param {Uint8Array} buffer
 */
export function zeroize(buffer) {
  if (!buffer) return;
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = 0;
  }
}

/**
 * Compute SHA-256 hash of data
 * @param {Uint8Array} data
 * @returns {Promise<Uint8Array>}
 */
export async function sha256(data) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Compute checksum (SHA-256) of public key and return base64
 * @param {Uint8Array} publicKey
 * @returns {Promise<string>}
 */
export async function computeChecksum(publicKey) {
  const hash = await sha256(publicKey);
  return arrayToBase64(hash);
}

/**
 * Generate random bytes using crypto.getRandomValues
 * @param {number} length - Number of bytes to generate
 * @returns {Uint8Array}
 */
export function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}
