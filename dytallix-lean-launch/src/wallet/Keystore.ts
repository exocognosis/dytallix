// Versioned keystore JSON import/export for the wallet vault
// Stores { encVault, kdfParams, meta }

import type { EncryptedVault } from '../crypto/vault'
import { encryptVault, decryptVault } from '../crypto/vault'

export interface KeystoreMeta {
  createdAt: string
  address: string
  algo: string
  publicKey?: string
  note?: string
}

export interface KeystoreV1 {
  v: 1
  encVault: EncryptedVault
  meta: KeystoreMeta
}

const LS_KEY = 'keystore_v1'
const META_LS_KEY = 'wallet_meta_v1'

export function exportKeystore(ks: KeystoreV1): string {
  return JSON.stringify(ks)
}

export function importKeystore(json: string | object): KeystoreV1 {
  const obj = typeof json === 'string' ? JSON.parse(json) : json
  if (!obj || obj.v !== 1) throw new Error('Unsupported keystore version')
  if (!obj.meta || !obj.encVault) throw new Error('Malformed keystore')
  return obj as KeystoreV1
}

export function saveKeystore(ks: KeystoreV1) {
  localStorage.setItem(LS_KEY, exportKeystore(ks))
}
export function loadKeystore(): KeystoreV1 | null {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? importKeystore(raw) : null } catch { return null }
}
export function clearKeystore() { localStorage.removeItem(LS_KEY) }

// Meta helpers for watch-only wallets or quick boot
export function saveMeta(meta: { address: string; algo: string; publicKey?: string }) {
  localStorage.setItem(META_LS_KEY, JSON.stringify(meta))
}
export function loadMeta(): { address: string; algo: string; publicKey?: string } | null {
  try { const raw = localStorage.getItem(META_LS_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}
export function clearMeta() { localStorage.removeItem(META_LS_KEY) }

// High-level helpers
export async function createKeystoreFromSecret(secretKeyB64: string, meta: { address: string; algo: string; publicKey?: string }, password: string): Promise<KeystoreV1> {
  const pt = new TextEncoder().encode(secretKeyB64)
  const encVault = await encryptVault(pt, password)
  return { v: 1, encVault, meta: { createdAt: new Date().toISOString(), ...meta } }
}

export async function decryptKeystoreToSecret(ks: KeystoreV1, password: string): Promise<string> {
  const pt = await decryptVault(ks.encVault, password)
  try {
    return new TextDecoder().decode(pt)
  } finally {
    try { pt.fill(0) } catch {}
  }
}
