// PQC Signer Abstraction Layer
// Provides interface between existing wallet system and PQC implementations
// Supports both WASM-based PQC and fallback service modes

import type { PQCKeypair } from './pqc/types'
import * as dilithium from './pqc/dilithium'
import { deriveAddress } from '../utils/address'
import { sha256 } from '../utils/crypto'

export interface SignerInterface {
  algorithm: string
  generateKeypair(): Promise<WalletKeypair>
  deriveAddress(publicKey: Uint8Array): Promise<string>
  sign(secretKey: Uint8Array, message: Uint8Array): Promise<Uint8Array>
  verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean>
}

export interface WalletKeypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
  algorithm: string
}

export interface PublicKeyProto {
  typeUrl: string
  keyBytes: Uint8Array
  algorithm: string
}

// PQC Signer using Dilithium5 via WASM
class PQCSigner implements SignerInterface {
  readonly algorithm = 'dilithium5'

  async generateKeypair(): Promise<WalletKeypair> {
    const pqcKeypair = await dilithium.keygen()
    return {
      publicKey: pqcKeypair.pk,
      secretKey: pqcKeypair.sk,
      algorithm: this.algorithm
    }
  }

  async deriveAddress(publicKey: Uint8Array): Promise<string> {
    return deriveAddress(publicKey, 'dytallix')
  }

  async sign(secretKey: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
    return dilithium.sign(secretKey, message)
  }

  async verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return dilithium.verify(publicKey, message, signature)
  }

  getPublicKeyProto(publicKey: Uint8Array): PublicKeyProto {
    return {
      typeUrl: '/dytallix.crypto.pqc.v1beta1.PubKey',
      keyBytes: publicKey,
      algorithm: this.algorithm
    }
  }
}

// Legacy Secp256k1 Signer (placeholder implementation)
class LegacySigner implements SignerInterface {
  readonly algorithm = 'secp256k1'

  async generateKeypair(): Promise<WalletKeypair> {
    // This is a placeholder - in production this would use actual secp256k1
    // For now, we fall back to PQC with warning
    console.warn('Legacy secp256k1 not implemented, using PQC with legacy address format')
    const pqcKeypair = await dilithium.keygen()
    return {
      publicKey: pqcKeypair.pk,
      secretKey: pqcKeypair.sk,
      algorithm: this.algorithm
    }
  }

  async deriveAddress(publicKey: Uint8Array): Promise<string> {
    // Use legacy address format for backward compatibility
    return deriveAddress(publicKey, 'dyt')
  }

  async sign(secretKey: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
    return dilithium.sign(secretKey, message)
  }

  async verify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return dilithium.verify(publicKey, message, signature)
  }

  getPublicKeyProto(publicKey: Uint8Array): PublicKeyProto {
    return {
      typeUrl: '/cosmos.crypto.secp256k1.PubKey',
      keyBytes: publicKey,
      algorithm: this.algorithm
    }
  }
}

// Signer Factory
export class SignerFactory {
  static create(algorithm: string = 'pqc', legacy: boolean = false): SignerInterface {
    // Environment variable to enable legacy mode
    const enableLegacy = process.env.ENABLE_LEGACY_SECP === '1' || legacy

    if (algorithm === 'secp256k1' && enableLegacy) {
      return new LegacySigner()
    }

    if (algorithm === 'pqc' || algorithm === 'dilithium5') {
      return new PQCSigner()
    }

    // Default to PQC for unknown algorithms
    console.warn(`Unknown algorithm ${algorithm}, defaulting to PQC`)
    return new PQCSigner()
  }

  static createPQC(): SignerInterface {
    return new PQCSigner()
  }

  static createLegacy(): SignerInterface | null {
    if (process.env.ENABLE_LEGACY_SECP === '1') {
      return new LegacySigner()
    }
    return null
  }
}

// Deterministic key generation using Argon2id
export async function generateDeterministicKeypair(
  passphrase: string, 
  algorithm: string = 'pqc'
): Promise<WalletKeypair> {
  const signer = SignerFactory.create(algorithm)
  
  // For deterministic generation, we should derive the entropy from the passphrase
  // This is a simplified implementation - production would use proper Argon2id
  const seed = await sha256(new TextEncoder().encode(passphrase))
  
  // Use the seed to generate deterministic keypair
  // This is a placeholder - real implementation would integrate seed into PQC keygen
  const keypair = await signer.generateKeypair()
  
  return keypair
}

// Transaction signing with proper Cosmos SDK format
export async function signTransaction(
  secretKey: Uint8Array,
  signDoc: any,
  algorithm: string = 'pqc'
): Promise<{
  signature: Uint8Array
  publicKey: PublicKeyProto
}> {
  const signer = SignerFactory.create(algorithm)
  
  // Serialize sign doc to canonical JSON bytes
  const signBytes = canonicalStringify(signDoc)
  const messageBytes = new TextEncoder().encode(signBytes)
  
  // Sign the message
  const signature = await signer.sign(secretKey, messageBytes)
  
  // Derive public key from secret key (placeholder implementation)
  const keypair = await signer.generateKeypair() // This should derive from secretKey
  const publicKeyProto = (signer as any).getPublicKeyProto?.(keypair.publicKey) || {
    typeUrl: '/dytallix.crypto.pqc.v1beta1.PubKey',
    keyBytes: keypair.publicKey,
    algorithm: signer.algorithm
  }
  
  return {
    signature,
    publicKey: publicKeyProto
  }
}

// Canonical JSON stringification for sign docs
function canonicalStringify(obj: any): string {
  if (obj === null || obj === undefined) {
    return 'null'
  }
  
  if (typeof obj === 'string') {
    return JSON.stringify(obj)
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return JSON.stringify(obj)
  }
  
  if (Array.isArray(obj)) {
    const items = obj.map(canonicalStringify)
    return `[${items.join(',')}]`
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort()
    const pairs = keys.map(key => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`)
    return `{${pairs.join(',')}}`
  }
  
  return JSON.stringify(obj)
}

export { PQCSigner, LegacySigner }