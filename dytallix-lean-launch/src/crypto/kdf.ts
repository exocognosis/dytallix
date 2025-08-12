// Argon2id KDF wrapper using libsodium-wrappers (crypto_pwhash with argon2id)
// Default params: mem=64MB, ops=3, parallelism=1
// Exposes configurable params and derives a 32-byte key suitable for AES-GCM.

import sodium from 'libsodium-wrappers'

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

export async function deriveKey(password: string, salt?: Uint8Array, opts?: Partial<Omit<KdfParams, 'algo' | 'salt'>>): Promise<DerivedKey> {
  await sodium.ready
  const actualSalt = salt ?? sodium.randombytes_buf(16)
  const cfg = { ...DEFAULT_KDF, ...(opts || {}) }
  // Map to libsodium limits (it expects in bytes for MEMLIMIT, integer for OPSLIMIT)
  const key = sodium.crypto_pwhash(
    32,
    password,
    actualSalt,
    cfg.opsLimit,
    cfg.memLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  )
  return {
    key: new Uint8Array(key),
    params: { algo: 'argon2id', memLimit: cfg.memLimit, opsLimit: cfg.opsLimit, parallelism: cfg.parallelism, salt: actualSalt }
  }
}
