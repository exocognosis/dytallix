// WASM integrity utilities
// Loads a manifest mapping fileName -> expectedSha256 (hex)
// Provides fetchAndVerify(url, expectedSha256) that returns ArrayBuffer if matches
// Optional: detached signature embedded as _sig (base64 Ed25519) over canonical JSON of remaining keys.
// Future extension: external signature file or multiple pubkeys / key rotation.

interface Manifest { [name: string]: string }

let manifestPromise: Promise<Manifest> | null = null

// Quick check helper used by UI to gate PQC actions
export async function checkIntegrity(): Promise<{ ok: boolean; error?: string }> {
  try { await loadManifest(); return { ok: true } } catch (e:any) { return { ok: false, error: e?.message || 'Integrity load failed' } }
}

// Primary manifest path now served from public/wasm/pqc
const MANIFEST_PATHS = ['/wasm/pqc/manifest.json', '/crypto/pqc/manifest.json'] // fallback to old path if still present

function getEnv(key: string): string | undefined {
  try {
    // Vite exposes import.meta.env at build time
    // eslint-disable-next-line no-undef
    const env: any = (import.meta as any).env || {}
    return env[key]
  } catch { return undefined }
}

async function fetchFirst(paths: string[]): Promise<Response> {
  const v = (window as any).__PQC_MANIFEST_VERSION__ || getEnv('VITE_PQC_MANIFEST_VERSION') || ''
  for (const p of paths) {
    try {
      const r = await fetch(p + (v ? ('?v=' + encodeURIComponent(v)) : ''))
      if (r.ok) return r
    } catch { /* ignore */ }
  }
  throw new Error('Manifest fetch failed for all candidate paths')
}

async function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) {
    manifestPromise = fetchFirst(MANIFEST_PATHS)
      .then(r => r.json())
      .then(async (raw: any) => {
        if (raw && typeof raw === 'object') {
          const sig = raw._sig
          if (sig) {
            try { await verifyManifestSignature(raw, sig) } catch (e) { throw new Error('Manifest signature invalid: ' + (e as Error).message) }
            delete raw._sig
          }
        }
        return raw as Manifest
      })
  }
  return manifestPromise
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('')
}

async function verifyManifestSignature(raw: any, sigB64: string) {
  const pubHex: string | undefined = (window as any).__PQC_MANIFEST_PUBKEY__ || getEnv('VITE_PQC_MANIFEST_PUBKEY')
  if (!pubHex) throw new Error('No manifest pubkey configured')
  const sorted: Record<string,string> = {}
  Object.keys(raw).filter(k => k !== '_sig').sort().forEach(k => { if (k !== '_sig') sorted[k] = raw[k] })
  const canonical = JSON.stringify(sorted)
  const data = new TextEncoder().encode(canonical)
  const sig = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0))
  const pub = new Uint8Array(pubHex.match(/.{1,2}/g)!.map(h => parseInt(h,16)))
  // Attempt Ed25519 verification via WebCrypto. Browser impls vary in naming; try both.
  const algVariants: any[] = [ { name: 'Ed25519' }, { name: 'NODE-ED25519' } ]
  let imported: CryptoKey | null = null
  let lastErr: any = null
  for (const alg of algVariants) {
    try { imported = await crypto.subtle.importKey('raw', pub, alg, false, ['verify']); break } catch (e) { lastErr = e }
  }
  if (!imported) throw new Error('Import pubkey failed: ' + (lastErr?.message || 'unknown'))
  const ok = await crypto.subtle.verify(imported.algorithm as AlgorithmIdentifier, imported, sig, data)
  if (!ok) throw new Error('Signature mismatch')
}

export async function fetchAndVerifyWasm(fileName: string): Promise<ArrayBuffer> {
  const manifest = await loadManifest()
  const expected = manifest[fileName]
  if (!expected) throw new Error(`No manifest entry for ${fileName}`)
  const res = await fetch(`/wasm/pqc/${fileName}`)
  if (!res.ok) throw new Error(`Failed to fetch WASM ${fileName}`)
  const buf = await res.arrayBuffer()
  const actual = await sha256Hex(buf)
  if (actual !== expected) throw new Error(`Integrity mismatch for ${fileName}`)
  return buf
}

export async function fetchAndVerifyBinary(path: string): Promise<Uint8Array> {
  const buf = await fetchAndVerifyWasm(path)
  return new Uint8Array(buf)
}

export async function preloadAll(): Promise<void> {
  const manifest = await loadManifest()
  await Promise.all(Object.keys(manifest).map(f => fetchAndVerifyWasm(f).catch(e => { throw e })))
}

export async function getManifest(): Promise<Manifest> { return loadManifest() }
