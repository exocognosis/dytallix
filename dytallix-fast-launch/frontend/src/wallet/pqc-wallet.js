/**
 * PQC Wallet Service - Real post-quantum cryptography wallet implementation
 * Uses WASM-compiled FIPS 204 ML-DSA (Dilithium) for key generation and signing
 */

import { sha3_256 } from 'js-sha3';

let wasmModule = null;

/**
 * Initialize the WASM PQC module
 * @returns {Promise<Object>} The loaded WASM module
 */
async function initWasm() {
  if (wasmModule) return wasmModule;
  
  try {
    // Dynamically load the WASM module using a data URL trick to bypass Vite restrictions
    const wasmJsUrl = '/wasm/pqc_wasm.js';
    const wasmBgUrl = '/wasm/pqc_wasm_bg.wasm';
    
    // Create a blob URL for the JS module
    const jsResponse = await fetch(wasmJsUrl);
    const jsText = await jsResponse.text();
    
    // Modify the JS to use the correct WASM path
    const modifiedJs = jsText.replace(
      "new URL('pqc_wasm_bg.wasm', import.meta.url)",
      `'${wasmBgUrl}'`
    );
    
    // Create blob and import
    const blob = new Blob([modifiedJs], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    
    const module = await import(/* @vite-ignore */ blobUrl);
    
    // Initialize with the WASM file path
    await module.default(wasmBgUrl);
    
    wasmModule = module;
    console.log('✅ PQC WASM module initialized:', module.version());
    
    // Clean up blob URL
    URL.revokeObjectURL(blobUrl);
    
    return wasmModule;
  } catch (error) {
    console.error('❌ Failed to load PQC WASM module:', error);
    throw new Error('Failed to initialize PQC cryptography: ' + error.message);
  }
}

/**
 * Generate a new PQC keypair
 * @returns {Promise<{address: string, publicKey: string, secretKey: string, algorithm: string}>}
 */
export async function generateKeypair() {
  const wasm = await initWasm();
  
  try {
    // Call WASM keygen function
    const resultJson = wasm.keygen();
    const result = JSON.parse(resultJson);
    
    return {
      address: result.address,
      publicKey: result.pk,
      secretKey: result.sk,
      algorithm: result.algo
    };
  } catch (error) {
    console.error('❌ Key generation failed:', error);
    throw new Error('Failed to generate PQC keypair: ' + error.message);
  }
}

/**
 * Sign a message with a secret key
 * @param {Uint8Array|string} message - Message to sign (Uint8Array or hex string)
 * @param {string} secretKeyBase64 - Base64-encoded secret key
 * @returns {Promise<string>} Base64-encoded signature
 */
export async function signMessage(message, secretKeyBase64) {
  const wasm = await initWasm();
  
  try {
    // Convert message to Uint8Array if it's a string
    let messageBytes;
    if (typeof message === 'string') {
      if (message.startsWith('0x')) {
        // Hex string
        message = message.slice(2);
        messageBytes = new Uint8Array(message.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      } else {
        // UTF-8 string
        messageBytes = new TextEncoder().encode(message);
      }
    } else {
      messageBytes = message;
    }
    
    // Call WASM sign function
    const signatureBase64 = wasm.sign(messageBytes, secretKeyBase64);
    return signatureBase64;
  } catch (error) {
    console.error('❌ Signing failed:', error);
    throw new Error('Failed to sign message: ' + error.message);
  }
}

/**
 * Verify a signature
 * @param {Uint8Array|string} message - Message that was signed
 * @param {string} signatureBase64 - Base64-encoded signature
 * @param {string} publicKeyBase64 - Base64-encoded public key
 * @returns {Promise<boolean>} True if signature is valid
 */
export async function verifySignature(message, signatureBase64, publicKeyBase64) {
  const wasm = await initWasm();
  
  try {
    // Convert message to Uint8Array if it's a string
    let messageBytes;
    if (typeof message === 'string') {
      if (message.startsWith('0x')) {
        message = message.slice(2);
        messageBytes = new Uint8Array(message.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      } else {
        messageBytes = new TextEncoder().encode(message);
      }
    } else {
      messageBytes = message;
    }
    
    // Call WASM verify function
    const isValid = wasm.verify(messageBytes, signatureBase64, publicKeyBase64);
    return isValid;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

/**
 * Derive address from public key
 * @param {string} publicKeyBase64 - Base64-encoded public key
 * @param {string} hrp - Human-readable prefix (default: 'dyt')
 * @returns {Promise<string>} Bech32 address
 */
export async function pubkeyToAddress(publicKeyBase64, hrp = 'dyt') {
  const wasm = await initWasm();
  
  try {
    const address = wasm.pubkey_to_address(publicKeyBase64, hrp);
    return address;
  } catch (error) {
    console.error('❌ Address derivation failed:', error);
    throw new Error('Failed to derive address: ' + error.message);
  }
}

/**
 * Check if WASM module is available
 * @returns {Promise<boolean>}
 */
export async function isWasmAvailable() {
  try {
    const wasm = await initWasm();
    return wasm.dilithium_available();
  } catch {
    return false;
  }
}

/**
 * Get WASM module version
 * @returns {Promise<string>}
 */
export async function getVersion() {
  try {
    const wasm = await initWasm();
    return wasm.version();
  } catch (error) {
    return 'unavailable';
  }
}

/**
 * Create a transaction hash (deterministic)
 * @param {Object} tx - Transaction object
 * @returns {string} Hex-encoded transaction hash
 */
export function createTxHash(tx) {
  // Use Web Crypto API to hash the transaction
  const txJson = JSON.stringify(tx);
  const encoder = new TextEncoder();
  const data = encoder.encode(txJson);
  
  return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return '0x' + hashHex;
  });
}

/**
 * Canonicalize JSON by sorting keys recursively for deterministic hashing
 * @param {*} obj - Object to canonicalize
 * @returns {*} Object with sorted keys
 */
function canonicalizeJson(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => canonicalizeJson(item));
  }
  
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = canonicalizeJson(obj[key]);
  }
  return sorted;
}

/**
 * Sign a Dytallix transaction
 * @param {Object} tx - Transaction object with {msgs, fee, nonce, chain_id, memo}
 * @param {string} secretKeyBase64 - Base64-encoded secret key
 * @param {string} publicKeyBase64 - Base64-encoded public key
 * @returns {Promise<Object>} Signed transaction object
 */
export async function signTransaction(tx, secretKeyBase64, publicKeyBase64) {
  try {
    // Serialize transaction for signing (canonical JSON)
    // Ensure fee is a string as backend expects
    const txToSign = {
      chain_id: tx.chain_id,
      fee: typeof tx.fee === 'string' ? tx.fee : String(tx.fee),
      msgs: tx.msgs,
      nonce: tx.nonce,
      memo: tx.memo || ''
    };
    
    // Canonicalize for deterministic hashing (sort all keys)
    const canonicalTx = canonicalizeJson(txToSign);
    const txJson = JSON.stringify(canonicalTx);
    const txBytes = new TextEncoder().encode(txJson);
    
    // Hash the transaction with SHA3-256 (Keccak) before signing
    // This matches the backend expectation: let hash = sha3_256(&canonical_json);
    const hashHex = sha3_256(txBytes); // Returns hex string
    const hashBytes = new Uint8Array(hashHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    console.log('📝 Transaction JSON:', txJson);
    console.log('🔑 SHA3-256 hash (hex):', hashHex);
    console.log('🔑 Hash bytes length:', hashBytes.length);
    
    // Sign the hash (not the raw transaction bytes)
    const signature = await signMessage(hashBytes, secretKeyBase64);
    
    // Create signed transaction with required fields
    const signedTx = {
      tx: txToSign,
      signature: signature,
      public_key: publicKeyBase64,
      algorithm: 'dilithium5',  // FIPS 204 ML-DSA-65 (formerly Dilithium3)
      version: 1
    };
    
    console.log('✅ Transaction signed with PQC signature (SHA3-256 hash)');
    return signedTx;
  } catch (error) {
    console.error('❌ Transaction signing failed:', error);
    throw new Error('Failed to sign transaction: ' + error.message);
  }
}

export default {
  generateKeypair,
  signMessage,
  verifySignature,
  pubkeyToAddress,
  isWasmAvailable,
  getVersion,
  createTxHash,
  signTransaction
};
