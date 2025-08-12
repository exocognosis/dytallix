import { describe, it, expect } from 'vitest'
import { encryptVault, decryptVault } from '../../crypto/vault'

function u8(s: string) { return new TextEncoder().encode(s) }
function s(u: Uint8Array) { return new TextDecoder().decode(u) }

describe('vault', () => {
  it('round-trips encrypt/decrypt', async () => {
    const pt = u8('hello secret')
    const blob = await encryptVault(pt.slice(), 'correct horse')
    const out = await decryptVault(blob, 'correct horse')
    expect(s(out)).toBe('hello secret')
  })

  it('fails with bad password', async () => {
    const blob = await encryptVault(u8('x'), 'p1')
    await expect(decryptVault(blob, 'p2')).rejects.toThrow()
  })

  it('zeroizes inputs/keys (best-effort)', async () => {
    const pt = u8('wipe me')
    const blob = await encryptVault(pt, 'pass')
    // pt should be zeroized
    expect(Array.from(pt).some(b => b !== 0)).toBe(false)
    // decrypt also zeroizes ct in function scope; cannot easily assert here
    await decryptVault(blob, 'pass')
  })
})
