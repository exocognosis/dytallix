// Vault encryption using AES-GCM and Argon2id-derived key via libsodium wrapper
// Exposes encryptVault/decryptVault returning and consuming typed arrays

import { deriveKey, type KdfParams, type DerivedKey } from './kdf'

export interface EncryptedVault {
  v: 1
  cipher: 'AES-GCM'
  kdf: 'argon2id'
  kdfParams: { memLimit: number; opsLimit: number; parallelism: number; saltB64: string }
  nonceB64: string
  ctB64: string
}

// Helper: base64 utils
function b64(u8: Uint8Array) {
  if (typeof btoa !== 'undefined') return btoa(String.fromCharCode(...u8))
  return Buffer.from(u8).toString('base64')
}
function ub64(s: string) {
  if (typeof atob !== 'undefined') return new Uint8Array([...atob(s)].map(c => c.charCodeAt(0)))
  return new Uint8Array(Buffer.from(s, 'base64'))
}

function zeroize(buf?: Uint8Array) { try { if (buf) buf.fill(0) } catch {} }

export async function encryptVault(plaintext: Uint8Array, pass: string, kdfOverrides?: Partial<Omit<KdfParams, 'algo' | 'salt'>>): Promise<EncryptedVault> {
  const dk: DerivedKey = await deriveKey(pass)
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  const aesKey = await crypto.subtle.importKey('raw', dk.key, { name: 'AES-GCM' }, false, ['encrypt'])
  try {
    const ctBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext)
    const out: EncryptedVault = {
      v: 1,
      cipher: 'AES-GCM',
      kdf: 'argon2id',
      kdfParams: { memLimit: dk.params.memLimit, opsLimit: dk.params.opsLimit, parallelism: dk.params.parallelism, saltB64: b64(dk.params.salt) },
      nonceB64: b64(nonce),
      ctB64: b64(new Uint8Array(ctBuf))
    }
    return out
  } finally {
    zeroize(dk.key); zeroize(plaintext)
  }
}

export async function decryptVault(blob: EncryptedVault, pass: string): Promise<Uint8Array> {
  if (!blob || blob.v !== 1 || blob.cipher !== 'AES-GCM' || blob.kdf !== 'argon2id') throw new Error('Unsupported vault format')
  const salt = ub64(blob.kdfParams.saltB64)
  const { key } = await deriveKey(pass, salt, { memLimit: blob.kdfParams.memLimit, opsLimit: blob.kdfParams.opsLimit, parallelism: blob.kdfParams.parallelism })
  const nonce = ub64(blob.nonceB64)
  const ct = ub64(blob.ctB64)
  const aesKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt'])
  try {
    const ptBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aesKey, ct)
    return new Uint8Array(ptBuf)
  } catch (e) {
    throw new Error('Decryption failed')
  } finally {
    zeroize(key); zeroize(ct)
  }
}
