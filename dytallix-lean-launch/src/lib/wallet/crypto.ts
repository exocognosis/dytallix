// Dytallix PQC Wallet Crypto Abstractions
// Wrapper around pqc-crypto for keypair generation, signing, and verification

import type { Algo } from './types'
import { generateKeypair as pqcGenerateKeypair, sign as pqcSign, verify as pqcVerify, pubkeyFromSecret } from '../../crypto/pqc/pqc'

export interface PQCKeyPair {
  publicKey: string
  secretKey: string
}

/**
 * Generate a new PQC keypair for the specified algorithm
 */
export async function generateKeypair(algo: Algo): Promise<PQCKeyPair> {
  if (algo === 'kyber-hpke') {
    throw new Error('HPKE key generation not yet implemented')
  }
  
  const keypair = await pqcGenerateKeypair(algo)
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey
  }
}

/**
 * Get public key from secret key
 */
export async function getPublicKey(secretKey: string, algo: Algo): Promise<string> {
  return await pubkeyFromSecret(secretKey)
}

/**
 * Sign a message with the given secret key and algorithm
 */
export async function sign(secretKey: string, message: Uint8Array, algo: Algo): Promise<string> {
  if (algo === 'kyber-hpke') {
    throw new Error('HPKE signing not supported')
  }
  
  const signature = await pqcSign(algo, secretKey, message)
  return signature
}

/**
 * Verify a signature against a message and public key
 */
export async function verify(publicKey: string, message: Uint8Array, signature: string, algo: Algo): Promise<boolean> {
  if (algo === 'kyber-hpke') {
    throw new Error('HPKE verification not supported')
  }
  
  return await pqcVerify(algo, publicKey, message, signature)
}

/**
 * HPKE utilities for encrypted export/import (placeholder)
 */
export async function hpkeEncrypt(data: Uint8Array, recipientPublicKey: string): Promise<Uint8Array> {
  // TODO: Implement HPKE encryption when Kyber support is added
  throw new Error('HPKE encryption not yet implemented')
}

export async function hpkeDecrypt(encryptedData: Uint8Array, secretKey: string): Promise<Uint8Array> {
  // TODO: Implement HPKE decryption when Kyber support is added
  throw new Error('HPKE decryption not yet implemented')
}

/**
 * Zero out sensitive data in memory
 */
export function zeroize(data: Uint8Array | string[]): void {
  if (data instanceof Uint8Array) {
    data.fill(0)
  } else {
    // For string arrays, overwrite with zeros
    for (let i = 0; i < data.length; i++) {
      data[i] = '\0'.repeat(data[i].length)
    }
  }
}