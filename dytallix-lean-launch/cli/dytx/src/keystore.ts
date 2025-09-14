import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync, createHash } from 'crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

export type KeystoreRecord = {
  name: string
  address: string
  pubkey_b64: string
  cipher: {
    alg: 'aes-256-gcm'
    iv_b64: string
    tag_b64: string
  }
  kdf: {
    salt_b64: string
    iter: number
    dklen: number
    digest: 'sha256'
  }
  ciphertext_b64: string
  createdAt: string
  algo: string
}

export function defaultKeystoreDir(): string {
  const base = process.env.DYTX_KEYSTORE || join(process.env.HOME || process.cwd(), '.dytx', 'keystore')
  if (!existsSync(base)) {
    mkdirSync(base, { recursive: true })
  }
  return base
}

export function deriveAddressFromPubkey(pubkey: Uint8Array, prefix = 'dytallix'): string {
  const sha = createHash('sha256').update(pubkey).digest()
  const ripe = createHash('ripemd160').update(sha).digest('hex')
  // Bech32-like development format: <prefix>1<hex>
  return `${prefix}1${ripe}`
}

export function encryptSecretKey(name: string, sk: Uint8Array, pk: Uint8Array, passphrase: string, algo = 'dilithium'): KeystoreRecord {
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const iter = 210_000
  const dk = pbkdf2Sync(passphrase, salt, iter, 32, 'sha256')
  const cipher = createCipheriv('aes-256-gcm', dk, iv)
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(sk)), cipher.final()])
  const tag = cipher.getAuthTag()
  const address = deriveAddressFromPubkey(pk)
  const rec: KeystoreRecord = {
    name,
    address,
    pubkey_b64: Buffer.from(pk).toString('base64'),
    cipher: { alg: 'aes-256-gcm', iv_b64: iv.toString('base64'), tag_b64: tag.toString('base64') },
    kdf: { salt_b64: salt.toString('base64'), iter, dklen: 32, digest: 'sha256' },
    ciphertext_b64: ciphertext.toString('base64'),
    createdAt: new Date().toISOString(),
    algo,
  }
  return rec
}

export function decryptSecretKey(rec: KeystoreRecord, passphrase: string): Uint8Array {
  const salt = Buffer.from(rec.kdf.salt_b64, 'base64')
  const iv = Buffer.from(rec.cipher.iv_b64, 'base64')
  const tag = Buffer.from(rec.cipher.tag_b64, 'base64')
  const ct = Buffer.from(rec.ciphertext_b64, 'base64')
  const dk = pbkdf2Sync(passphrase, salt, rec.kdf.iter, rec.kdf.dklen, rec.kdf.digest)
  const decipher = createDecipheriv('aes-256-gcm', dk, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return new Uint8Array(pt)
}

export function saveKeystore(rec: KeystoreRecord, dir = defaultKeystoreDir()): string {
  const file = join(dir, `${rec.name}.json`)
  writeFileSync(file, JSON.stringify(rec, null, 2))
  return file
}

export function loadKeystoreByName(name: string, dir = defaultKeystoreDir()): KeystoreRecord {
  const file = join(dir, `${name}.json`)
  const raw = readFileSync(file, 'utf8')
  return JSON.parse(raw)
}

export function findKeystoreByAddress(address: string, dir = defaultKeystoreDir()): { name: string, rec: KeystoreRecord } | null {
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))
  for (const f of files) {
    const raw = readFileSync(join(dir, f), 'utf8')
    try {
      const rec = JSON.parse(raw) as KeystoreRecord
      if (rec.address === address) return { name: f.replace(/\.json$/, ''), rec }
    } catch {}
  }
  return null
}
