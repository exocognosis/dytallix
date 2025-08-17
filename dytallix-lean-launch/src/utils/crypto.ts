// Crypto utilities for PQC wallet operations

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment - use Web Crypto API
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    return new Uint8Array(hashBuffer)
  } else {
    // Node.js environment - use crypto module
    const crypto = await import('crypto')
    const hash = crypto.createHash('sha256')
    hash.update(data)
    return new Uint8Array(hash.digest())
  }
}

export async function ripemd160(data: Uint8Array): Promise<Uint8Array> {
  // Use hash-wasm for RIPEMD160 since it's not available in Web Crypto API
  const { ripemd160 } = await import('hash-wasm')
  const hashHex = await ripemd160(data)
  return hexToBytes(hashHex)
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length')
  }
  
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}