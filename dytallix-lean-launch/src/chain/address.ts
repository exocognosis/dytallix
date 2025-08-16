import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'

const M = (import.meta as any)
const DEFAULT_PREFIX = M.env?.VITE_BECH32_PREFIX || M.env?.VITE_CHAIN_PREFIX || M.env?.CHAIN_PREFIX || 'dyt'

// Derive first bech32 address from mnemonic. Prefix is configurable.
export async function addressFromMnemonic(mnemonic: string, prefix: string = DEFAULT_PREFIX): Promise<string> {
  if (!mnemonic || typeof mnemonic !== 'string') throw new Error('mnemonic required')
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix })
  const [first] = await wallet.getAccounts()
  return first.address
}

export default { addressFromMnemonic }
