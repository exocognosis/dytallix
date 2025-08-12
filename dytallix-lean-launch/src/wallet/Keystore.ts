// Versioned keystore JSON import/export for the wallet vault
// Stores { encVault, kdfParams, meta }

import type { EncryptedVault } from '../crypto/vault'

export interface KeystoreMeta {
  createdAt: string
  address: string
  algo: string
  note?: string
}

export interface KeystoreV1 {
  v: 1
  encVault: EncryptedVault
  meta: KeystoreMeta
}

const LS_KEY = 'keystore_v1'

export function exportKeystore(ks: KeystoreV1): string {
  return JSON.stringify(ks)
}

export function importKeystore(json: string | object): KeystoreV1 {
  const obj = typeof json === 'string' ? JSON.parse(json) : json
  if (!obj || obj.v !== 1) throw new Error('Unsupported keystore version')
  return obj as KeystoreV1
}

export function saveKeystore(ks: KeystoreV1) {
  localStorage.setItem(LS_KEY, exportKeystore(ks))
}
export function loadKeystore(): KeystoreV1 | null {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? importKeystore(raw) : null } catch { return null }
}
export function clearKeystore() { localStorage.removeItem(LS_KEY) }
