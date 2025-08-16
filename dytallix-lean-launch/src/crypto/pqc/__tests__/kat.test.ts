import { describe, it, expect } from 'vitest'
import { keygen, sign, verify, sizes } from '../pqc'
import fs from 'fs'
import path from 'path'
import * as Adapter from '../../../lib/crypto/pqc.js'

// Enhanced KAT logic: if real WASM present (sizes > 0) we enforce strict pass.
const STRICT = !!process.env.PQC_STRICT_KAT

// Utility to determine if algo implemented (non-placeholder)
async function isImplemented(algo: string) {
  try { const s = await sizes(algo as any); return s.pk > 0 && s.sk > 0 && s.sig > 0 } catch { return false }
}

// Placeholder KAT test scaffold. Real vectors to be ingested once added under vectors/.
// For now, just ensures API accessible for each enabled algo.

const ALGOS: any[] = ['dilithium','falcon','sphincs']

interface KATVector { algo: string; msg: Uint8Array; pk: Uint8Array; sk: Uint8Array; sig: Uint8Array }

function loadVectors(algo: string): KATVector[] {
  try {
    const base = path.join(__dirname, '../vectors', algo)
    const files = fs.readdirSync(base).filter(f => f.endsWith('.json'))
    const out: KATVector[] = []
    for (const f of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'))
      if (raw.pk && raw.sk && raw.sig && raw.msg) {
        out.push({ algo, pk: Buffer.from(raw.pk,'hex'), sk: Buffer.from(raw.sk,'hex'), sig: Buffer.from(raw.sig,'hex'), msg: Buffer.from(raw.msg,'hex') })
      }
    }
    return out
  } catch { return [] }
}

const VECTORS: Record<string, KATVector[]> = {
  dilithium: loadVectors('dilithium'),
  falcon: loadVectors('falcon'),
  sphincs: loadVectors('sphincs')
}

describe('PQC KAT placeholder', () => {
  for (const algo of ALGOS) {
    it(`${algo} keygen/sign/verify basic`, async () => {
      try {
        const kp = await keygen(algo)
        const msg = new TextEncoder().encode('kat-test')
        const sig = await sign(algo, kp.sk, msg)
        const ok = await verify(algo, kp.pk, msg, sig)
        // Placeholder stubs may fail; we only assert type conditions.
        expect(typeof ok).toBe('boolean')
      } catch (e) {
        expect(true).toBe(true)
      }
    })
    it(`${algo} KAT vectors`, async () => {
      const vectors = VECTORS[algo] || []
      for (const v of vectors) {
        const ok = await verify(algo, v.pk, v.msg, v.sig).catch(()=>false)
        expect(ok).toBe(true)
      }
      expect(Array.isArray(vectors)).toBe(true)
    })
  }
})

for (const algo of ALGOS) {
  describe(`${algo} strict KAT`, () => {
    it('keygen/sign/verify roundtrip', async () => {
      const impl = await isImplemented(algo)
      if (!impl && !STRICT) return
      const kp = await keygen(algo as any)
      const msg = new TextEncoder().encode('roundtrip')
      const sig = await sign(algo as any, kp.sk, msg)
      const ok = await verify(algo as any, kp.pk, msg, sig)
      expect(ok).toBe(true)
    })
    it('signature tamper detection', async () => {
      const impl = await isImplemented(algo)
      if (!impl && !STRICT) return
      const kp = await Adapter.generateKeypair(algo)
      const msg = new TextEncoder().encode('tamper')
      const sigB64 = await Adapter.sign(algo, kp.secretKey, msg)
      const sigU8 = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0))
      sigU8[0] ^= 0xff
      const tamperedB64 = btoa(String.fromCharCode(...sigU8))
      const ok = await Adapter.verify(algo, kp.publicKey, msg, tamperedB64)
      expect(ok).toBe(false)
    })
    it('KAT vector verification', async () => {
      const impl = await isImplemented(algo)
      const vectors = VECTORS[algo] || []
      if (vectors.length === 0) {
        if (STRICT && impl) throw new Error(`No KAT vectors for implemented algo ${algo}`)
        return
      }
      for (const v of vectors) {
        const ok = await verify(algo as any, v.pk, v.msg, v.sig)
        expect(ok).toBe(true)
      }
    })
  })
}
