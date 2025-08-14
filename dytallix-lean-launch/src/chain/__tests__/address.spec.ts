import { describe, it, expect, vi } from 'vitest'
import { addressFromMnemonic } from '../address'

// The DirectSecp256k1HdWallet will try to parse mnemonic; mock it to avoid crypto runtime in unit test
vi.mock('@cosmjs/proto-signing', () => ({
  DirectSecp256k1HdWallet: {
    fromMnemonic: async (_m: string, opts: any) => ({
      getAccounts: async () => ([{ address: `${opts?.prefix || 'dyt'}1mockaddress` }])
    })
  }
}))

describe('address utils', () => {
  it('derives bech32 with provided prefix', async () => {
    const addr = await addressFromMnemonic('test test test test test test test test test test test junk', 'cosmos')
    expect(addr.startsWith('cosmos')).toBe(true)
  })
})
