// Schema validation and version guards for keystore

import { 
  KeystoreParseError, 
  KeystoreVersionUnsupportedError 
} from './types.js';

/**
 * Validate keystore V1 structure
 * @param {any} obj - Object to validate
 * @throws {KeystoreParseError}
 */
export function validateKeystoreV1(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new KeystoreParseError('Keystore must be an object');
  }
  
  if (obj.version !== 1) {
    throw new KeystoreParseError('Expected version 1');
  }
  
  if (!obj.algorithm || !['ML-DSA', 'SLH-DSA'].includes(obj.algorithm)) {
    throw new KeystoreParseError('Invalid or missing algorithm (must be ML-DSA or SLH-DSA)');
  }
  
  if (!obj.address || typeof obj.address !== 'string') {
    throw new KeystoreParseError('Missing or invalid address');
  }
  
  if (!obj.crypto || typeof obj.crypto !== 'object') {
    throw new KeystoreParseError('Missing crypto section');
  }
  
  const crypto = obj.crypto;
  
  if (crypto.cipher !== 'aes-256-gcm') {
    throw new KeystoreParseError('Invalid cipher (must be aes-256-gcm)');
  }
  
  if (crypto.kdf !== 'scrypt') {
    throw new KeystoreParseError('Invalid KDF (must be scrypt)');
  }
  
  // Check required base64 fields
  const requiredFields = ['ciphertext', 'iv', 'authTag', 'salt'];
  for (const field of requiredFields) {
    if (!crypto[field] || typeof crypto[field] !== 'string') {
      throw new KeystoreParseError(`Missing or invalid crypto.${field}`);
    }
  }
  
  // Validate KDF params
  if (!crypto.kdfparams || typeof crypto.kdfparams !== 'object') {
    throw new KeystoreParseError('Missing kdfparams');
  }
  
  const kdfParams = crypto.kdfparams;
  const requiredKdfFields = ['n', 'r', 'p', 'dklen'];
  for (const field of requiredKdfFields) {
    if (typeof kdfParams[field] !== 'number' || kdfParams[field] <= 0) {
      throw new KeystoreParseError(`Invalid kdfparams.${field}`);
    }
  }
  
  if (!obj.createdAt || typeof obj.createdAt !== 'string') {
    throw new KeystoreParseError('Missing or invalid createdAt timestamp');
  }
  
  // Optional fields validation
  if (obj.publicKey !== undefined && typeof obj.publicKey !== 'string') {
    throw new KeystoreParseError('Invalid publicKey (must be string)');
  }
  
  if (obj.meta !== undefined && typeof obj.meta !== 'object') {
    throw new KeystoreParseError('Invalid meta (must be object)');
  }
}

/**
 * Parse and validate keystore JSON
 * @param {string} json - JSON string
 * @returns {Object} - Parsed and validated keystore
 * @throws {KeystoreParseError | KeystoreVersionUnsupportedError}
 */
export function parseAndValidate(json) {
  let obj;
  
  try {
    obj = JSON.parse(json);
  } catch (err) {
    throw new KeystoreParseError('Invalid JSON: ' + err.message);
  }
  
  if (!obj || typeof obj !== 'object') {
    throw new KeystoreParseError('Keystore must be a JSON object');
  }
  
  // Check version first
  if (obj.version === undefined) {
    throw new KeystoreParseError('Missing version field');
  }
  
  if (typeof obj.version !== 'number') {
    throw new KeystoreParseError('Version must be a number');
  }
  
  if (obj.version !== 1) {
    throw new KeystoreVersionUnsupportedError(obj.version);
  }
  
  // Validate v1 structure
  validateKeystoreV1(obj);
  
  return obj;
}

/**
 * Check if a value is a valid keystore version
 * @param {any} version
 * @returns {boolean}
 */
export function isSupportedVersion(version) {
  return version === 1;
}
