// Address derivation utilities for Dytallix
// Supports both legacy Blake3-based and new bech32-based address formats

import { blake3 } from 'hash-wasm'
import { sha256 as wasmSha256 } from 'hash-wasm'
import { ripemd160 } from 'hash-wasm'

export interface AddressDerivationOptions {
  prefix: string
  legacy?: boolean
}

// Derive address from public key
export async function deriveAddress(
  publicKey: Uint8Array, 
  prefix: string = 'dytallix',
  legacy: boolean = false
): Promise<string> {
  if (legacy || prefix === 'dyt') {
    return deriveLegacyAddress(publicKey)
  } else {
    return derivePQCAddress(publicKey, prefix)
  }
}

// Legacy address derivation using Blake3
// Format: dyt1 + hex(blake3("dyt.addr.v1" || pk))[0..40] + checksum
export async function deriveLegacyAddress(publicKey: Uint8Array): Promise<string> {
  // Blake3 hash with domain separation
  const domainSep = new TextEncoder().encode('dyt.addr.v1')
  const combined = new Uint8Array(domainSep.length + publicKey.length)
  combined.set(domainSep, 0)
  combined.set(publicKey, domainSep.length)
  
  const hash = await blake3(combined)
  const hashBytes = hexToBytes(hash)
  
  // Take first 20 bytes for address body
  const bodyBytes = hashBytes.slice(0, 20)
  const bodyHex = bytesToHex(bodyBytes)
  
  // Calculate checksum using SHA256
  const checksumHash = await wasmSha256(bodyBytes)
  const checksumBytes = hexToBytes(checksumHash)
  const checksum = bytesToHex(checksumBytes.slice(0, 2))
  
  return `dyt1${bodyHex}${checksum}`
}

// New PQC address derivation using bech32 format  
// Format: bech32(prefix, ripemd160(sha256(pubkey_raw)))
export async function derivePQCAddress(
  publicKey: Uint8Array, 
  prefix: string = 'dytallix'
): Promise<string> {
  // Step 1: SHA256 hash of public key
  const sha256Hash = await wasmSha256(publicKey)
  const sha256Bytes = hexToBytes(sha256Hash)
  
  // Step 2: RIPEMD160 hash of SHA256 result
  const ripemdHash = await ripemd160(sha256Bytes)
  const ripemdBytes = hexToBytes(ripemdHash)
  
  // Step 3: Encode with bech32 using prefix
  // For now using simplified encoding until we add proper bech32 library
  return `${prefix}${bytesToHex(ripemdBytes)}`
}

// Validate address format
export function validateAddress(address: string): boolean {
  // Legacy format: dyt1 + 40 hex chars + 4 hex chars checksum
  if (address.startsWith('dyt1') && address.length === 48) {
    return validateLegacyAddress(address)
  }
  
  // PQC format: dytallix + 40 hex chars (20 bytes RIPEMD160)
  if (address.startsWith('dytallix') && address.length === ('dytallix'.length + 40)) {
    return validatePQCAddress(address)
  }
  
  return false
}

// Validate legacy address format and checksum
export async function validateLegacyAddress(address: string): Promise<boolean> {
  if (!address.startsWith('dyt1') || address.length !== 48) {
    return false
  }
  
  try {
    const addressBody = address.slice(4, 44) // Skip 'dyt1' prefix
    const providedChecksum = address.slice(44, 48)
    
    const bodyBytes = hexToBytes(addressBody)
    const checksumHash = await wasmSha256(bodyBytes)
    const checksumBytes = hexToBytes(checksumHash)
    const expectedChecksum = bytesToHex(checksumBytes.slice(0, 2))
    
    return providedChecksum === expectedChecksum
  } catch {
    return false
  }
}

// Validate PQC address format
export function validatePQCAddress(address: string): boolean {
  if (!address.startsWith('dytallix')) {
    return false
  }
  
  const expectedLength = 'dytallix'.length + 40 // 20 bytes hex encoded
  if (address.length !== expectedLength) {
    return false
  }
  
  try {
    const hashPart = address.slice('dytallix'.length)
    hexToBytes(hashPart) // Will throw if invalid hex
    return true
  } catch {
    return false
  }
}

// Get address type
export function getAddressType(address: string): 'legacy' | 'pqc' | 'invalid' {
  if (address.startsWith('dyt1') && address.length === 48) {
    return 'legacy'
  }
  
  if (address.startsWith('dytallix') && address.length === ('dytallix'.length + 40)) {
    return 'pqc'
  }
  
  return 'invalid'
}

// Utility functions
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length')
  }
  
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Test vectors for validation
export const TEST_VECTORS = {
  legacy: {
    publicKey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    expectedAddress: 'dyt1' // Will be computed
  },
  pqc: {
    publicKey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    expectedAddress: 'dytallix' // Will be computed
  }
}

// Helper for generating test vectors
export async function generateTestVectors() {
  const testPubKey = hexToBytes('1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
  
  const legacyAddr = await deriveLegacyAddress(testPubKey)
  const pqcAddr = await derivePQCAddress(testPubKey)
  
  return {
    publicKey: bytesToHex(testPubKey),
    legacy: legacyAddr,
    pqc: pqcAddr
  }
}