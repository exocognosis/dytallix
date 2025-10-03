/**
 * Address derivation for PQC public keys
 * Implements deterministic bech32-based address derivation
 */

import type { Address } from './provider.js';

// Use crypto for Node.js, Web Crypto for browsers
async function sha256(data: Uint8Array): Promise<Uint8Array> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    // Browser
    const hash = await window.crypto.subtle.digest('SHA-256', data as BufferSource);
    return new Uint8Array(hash);
  } else {
    // Node.js
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(data).digest();
    return new Uint8Array(hash);
  }
}

// Simple bech32 encoding (simplified for now, can be enhanced with full bech32 lib)
function bech32Encode(hrp: string, data: Uint8Array): string {
  // For now, use hex encoding with hrp prefix
  // TODO: Replace with proper bech32 encoding library
  const hex = Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hrp}1${hex}`;
}

/**
 * Derive address from public key using the chain's standard method
 * 
 * Current implementation:
 * 1. SHA-256 hash of public key
 * 2. Take first 20 bytes (standard address length)
 * 3. Encode as bech32 with HRP
 * 
 * @param publicKey - Raw public key bytes (Dilithium3 = 1952 bytes)
 * @param hrp - Human Readable Prefix (default: 'dyt')
 * @returns Bech32-encoded address
 */
export async function deriveAddress(
  publicKey: Uint8Array,
  hrp: string = 'dyt'
): Promise<Address> {
  // Hash the public key
  const hash = await sha256(publicKey);
  
  // Take first 20 bytes for address (standard Cosmos SDK address length)
  const addressBytes = hash.slice(0, 20);
  
  // Encode as bech32
  const address = bech32Encode(hrp, addressBytes);
  
  return address as Address;
}

/**
 * Validate address format
 */
export function isValidAddress(address: string, hrp: string = 'dyt'): boolean {
  const pattern = new RegExp(`^${hrp}1[a-z0-9]+$`);
  return pattern.test(address);
}
