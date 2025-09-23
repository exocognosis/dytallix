import { existsSync, readFileSync } from 'fs'
import { isAbsolute, resolve } from 'path'
import {
  KeystoreRecord,
  defaultKeystoreDir,
  loadKeystoreByName,
  findKeystoreByAddress
} from '../keystore.js'

export function loadKeystoreRecord(address: string, keystoreHint?: string): { name: string; record: KeystoreRecord } {
  if (!address || typeof address !== 'string') {
    throw new Error('Address is required to locate keystore')
  }

  if (keystoreHint) {
    const hint = keystoreHint.trim()
    const candidatePath = isAbsolute(hint) ? hint : resolve(hint)
    if (existsSync(candidatePath)) {
      const raw = readFileSync(candidatePath, 'utf8')
      const record = JSON.parse(raw) as KeystoreRecord
      return { name: record.name || candidatePath, record }
    }

    const record = loadKeystoreByName(hint)
    return { name: hint, record }
  }

  const found = findKeystoreByAddress(address, defaultKeystoreDir())
  if (found) {
    return { name: found.name, record: found.rec }
  }

  throw new Error('No keystore found for address. Provide --keystore path or name explicitly.')
}
