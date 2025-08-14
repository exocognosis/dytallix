// Argon2id KDF wrapper using hash-wasm (argon2id)
// Default params: mem=64MB, ops=3, parallelism=1
// Exposes configurable params and derives a 32-byte key suitable for AES-GCM.

import { argon2id } from 'hash-wasm'

export interface KdfParams {
  algo: 'argon2id'
  memLimit: number // bytes
  opsLimit: number
  parallelism: number
  salt: Uint8Array
}

export interface DerivedKey {
  key: Uint8Array
  params: KdfParams
}

export const DEFAULT_KDF: Omit<KdfParams, 'salt'> = {
  algo: 'argon2id',
  memLimit: 64 * 1024 * 1024, // 64MB
  opsLimit: 3,
  parallelism: 1,
}

function zeroize(buf?: Uint8Array) { try { if (buf) buf.fill(0) } catch {} }

export async function deriveKey(password: string, salt?: Uint8Array, opts?: Partial<Omit<KdfParams, 'algo' | 'salt'>>): Promise<DerivedKey> {
  const actualSalt = salt ?? (globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(new Uint8Array(16)) : new Uint8Array(16).map(() => Math.floor(Math.random() * 256)))
  const cfg = { ...DEFAULT_KDF, ...(opts || {}) }

  // hash-wasm expects memorySize in KiB, iterations as ops, and supports binary output
  const memorySizeKiB = Math.max(8 * 1024, Math.floor(cfg.memLimit / 1024)) // enforce minimum 8MB
  const pwdBuf = new TextEncoder().encode(password)
  try {
    const key = await argon2id({
      password: pwdBuf,
      salt: actualSalt,
      parallelism: cfg.parallelism,
      iterations: cfg.opsLimit,
      memorySize: memorySizeKiB,
      hashLength: 32,
      outputType: 'binary',
      version: 0x13,
    })
    return {
      key: key instanceof Uint8Array ? key : new Uint8Array(key as any),
      params: { algo: 'argon2id', memLimit: cfg.memLimit, opsLimit: cfg.opsLimit, parallelism: cfg.parallelism, salt: actualSalt }
    }
  } finally {
    zeroize(pwdBuf)
  }
}
