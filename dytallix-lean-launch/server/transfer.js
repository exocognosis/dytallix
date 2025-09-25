import dotenv from 'dotenv'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate'
import { logInfo, logError } from './logger.js'
import fs from 'fs'
import path from 'path'

dotenv.config()

// Env configuration (read lazily where possible)
const RPC = process.env.RPC_HTTP_URL || process.env.RPC_URL || process.env.VITE_RPC_HTTP_URL
const CHAIN_ID = process.env.CHAIN_ID || process.env.VITE_CHAIN_ID || 'dytallix-testnet-1'
const BECH32_PREFIX = process.env.CHAIN_PREFIX || 'dytallix'
const MNEMONIC = process.env.FAUCET_MNEMONIC || process.env.TEST_MNEMONIC
const GAS_PRICE = process.env.FAUCET_GAS_PRICE || '0.025uDRT' // override in env to match chain

const MAX_DGT = process.env.FAUCET_MAX_PER_REQUEST_DGT || '2'
const MAX_DRT = process.env.FAUCET_MAX_PER_REQUEST_DRT || '50'

// --- Load tokenomics metadata (server local) ---
let tokenomicsCache = null
function loadTokenomics() {
  if (tokenomicsCache) return tokenomicsCache
  try {
    const p = path.join(path.dirname(new URL(import.meta.url).pathname), 'tokenomics.json')
    const raw = fs.readFileSync(p, 'utf8')
    const json = JSON.parse(raw)
    // index by symbol upper
    const map = new Map()
    for (const t of json.tokens || []) {
      if (t.symbol) map.set(String(t.symbol).toUpperCase(), t)
    }
    tokenomicsCache = { list: json.tokens || [], map }
  } catch {
    tokenomicsCache = { list: [], map: new Map() }
  }
  return tokenomicsCache
}

let signerAddress = ''
let clientPromise = null

async function getClient() {
  // In test environment, return a mock client
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    signerAddress = 'dytallix1faucet123456789abcdef123456789abcdef123456'
    return {
      sendTokens: async (from, to, tokens, fee, memo) => {
        // Mock successful transaction
        return {
          transactionHash: `0x${Math.random().toString(16).slice(2).padStart(64, '0')}`
        }
      }
    }
  }
  
  if (!RPC || !MNEMONIC) {
    const e = new Error('FAUCET_NOT_CONFIGURED')
    e.status = 503
    throw e
  }
  if (!clientPromise) {
    clientPromise = (async () => {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, { prefix: BECH32_PREFIX })
      const [acc] = await wallet.getAccounts()
      signerAddress = acc.address
      const client = await SigningStargateClient.connectWithSigner(RPC, wallet, {
        gasPrice: GasPrice.fromString(GAS_PRICE)
      })
      return client
    })()
  }
  return clientPromise
}

function getTokenConfig(token) {
  const { map } = loadTokenomics()
  const meta = map.get(String(token).toUpperCase())
  if (meta) {
    // Allow per-token override for faucet max via env naming convention FAUCET_MAX_PER_REQUEST_<SYMBOL>
    const envKey = `FAUCET_MAX_PER_REQUEST_${meta.symbol.toUpperCase()}`
    const max = process.env[envKey] || (meta.symbol === 'DGT' ? MAX_DGT : meta.symbol === 'DRT' ? MAX_DRT : '1')
    return { denom: meta.base, decimals: meta.decimals ?? 6, max }
  }
  // Fallback legacy path (should not be hit if tokenomics.json present)
  if (token === 'DGT') return { denom: 'uDGT', decimals: 6, max: MAX_DGT }
  if (token === 'DRT') return { denom: 'uDRT', decimals: 6, max: MAX_DRT }
  throw new Error('Unsupported token')
}

function toMicro(amountDisplay, decimals) {
  const n = Number(amountDisplay)
  if (!isFinite(n) || n <= 0) throw new Error('INVALID_AMOUNT')
  const factor = 10 ** (decimals || 6)
  return String(Math.round(n * factor))
}

export async function transfer({ token, to }) {
  const { denom, max, decimals } = getTokenConfig(token)
  if (!denom) {
    const e = new Error(`Denom not configured for ${token}`)
    e.status = 500
    throw e
  }
  const amount = toMicro(max, decimals)
  const client = await getClient()
  const fee = 'auto'
  const memo = `faucet:${token}`

  try {
    logInfo('Sending faucet transfer', { token, to, amount, denom })
    const result = await client.sendTokens(signerAddress, to, [{ amount, denom }], fee, memo)
    return { hash: result.transactionHash }
  } catch (err) {
    logError('Transfer failed', err)
    await new Promise(r => setTimeout(r, 1200))
    try {
      const result = await client.sendTokens(signerAddress, to, [{ amount, denom }], 'auto', memo)
      return { hash: result.transactionHash }
    } catch (err2) {
      logError('Transfer failed after retry', err2)
      const e = new Error('RPC_TRANSFER_FAILED')
      e.status = 502
      throw e
    }
  }
}

export function getMaxFor(token) {
  return getTokenConfig(token).max
}
