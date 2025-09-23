import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

export const DILITHIUM_ALGO = 'dilithium5'

type Keypair = { sk: Uint8Array; pk: Uint8Array }

function findManifest(): string {
  const envPath = process.env.DYTX_PQC_MANIFEST
  if (envPath) {
    const resolved = resolve(envPath)
    if (!existsSync(resolved)) {
      throw new Error(`DYTX_PQC_MANIFEST points to missing file: ${resolved}`)
    }
    return resolved
  }

  const here = dirname(fileURLToPath(new URL(import.meta.url)))
  const candidateRoots = [
    '../../../../../pqc-crypto',
    '../../../../pqc-crypto',
    '../../../pqc-crypto',
    '../../pqc-crypto',
    '../pqc-crypto',
    '../../../../../../pqc-crypto'
  ]

  for (const rel of candidateRoots) {
    const manifest = resolve(here, rel, 'Cargo.toml')
    if (existsSync(manifest)) {
      return manifest
    }
  }

  const cwdManifest = resolve(process.cwd(), '../pqc-crypto/Cargo.toml')
  if (existsSync(cwdManifest)) return cwdManifest
  const cwdManifestAlt = resolve(process.cwd(), '../../pqc-crypto/Cargo.toml')
  if (existsSync(cwdManifestAlt)) return cwdManifestAlt

  throw new Error('Unable to locate dytallix-pqc Cargo manifest. Set DYTX_PQC_MANIFEST.')
}

function runPqcBinary(primary: string, fallbacks: string[], args: string[]): string {
  const manifest = findManifest()
  const crateDir = dirname(manifest)
  const names = [primary, ...fallbacks]

  for (const name of names) {
    const candidates = [
      join(crateDir, 'target', 'release', name),
      join(crateDir, 'target', 'release', `${name}.exe`),
      join(crateDir, 'target', 'debug', name),
      join(crateDir, 'target', 'debug', `${name}.exe`)
    ]
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const res = spawnSync(candidate, args, { encoding: 'utf8' })
        if (res.status === 0 && res.stdout.trim()) {
          return res.stdout.trim()
        }
        const err = res.stderr?.trim() || `execution failed for ${candidate}`
        throw new Error(err)
      }
    }
  }

  for (const name of names) {
    const res = spawnSync(
      'cargo',
      ['run', '-q', '--manifest-path', manifest, '--bin', name, '--', ...args],
      { encoding: 'utf8' }
    )
    if (res.status === 0 && res.stdout.trim()) {
      return res.stdout.trim()
    }
  }

  throw new Error(`Unable to execute PQC binary ${primary}`)
}

export function generateDilithiumKeypair(): Keypair {
  const tmp = mkdtempSync(join(tmpdir(), 'dcli-keygen-'))
  try {
    runPqcBinary('keygen_raw', ['keygen'], [tmp])
    const pk = readFileSync(join(tmp, 'pk.bin'))
    const sk = readFileSync(join(tmp, 'sk.bin'))
    return { pk: new Uint8Array(pk), sk: new Uint8Array(sk) }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim()
  if (!clean) return new Uint8Array()
  return new Uint8Array(clean.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) ?? [])
}

export function signDilithium(secretKey: Uint8Array, message: Uint8Array): Uint8Array {
  const tmp = mkdtempSync(join(tmpdir(), 'dcli-sign-'))
  try {
    const skPath = join(tmp, 'sk.bin')
    const msgPath = join(tmp, 'msg.bin')
    writeFileSync(skPath, Buffer.from(secretKey))
    writeFileSync(msgPath, Buffer.from(message))
    const hex = runPqcBinary('pqc-sign', ['sign'], [skPath, msgPath])
    return hexToBytes(hex)
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}
