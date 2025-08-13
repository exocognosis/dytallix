import dotenv from 'dotenv'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate'
import { logInfo, logError } from './logger.js'

dotenv.config()

// Env configuration (read lazily where possible)
const RPC = process.env.RPC_HTTP_URL || process.env.RPC_URL || process.env.VITE_RPC_HTTP_URL
const CHAIN_ID = process.env.CHAIN_ID || process.env.VITE_CHAIN_ID || 'dytallix-testnet-1'
const BECH32_PREFIX = process.env.CHAIN_PREFIX || 'dytallix'
const MNEMONIC = process.env.FAUCET_MNEMONIC || process.env.TEST_MNEMONIC
const GAS_PRICE = process.env.FAUCET_GAS_PRICE || '0.025uDRT' // override in env to match chain

const MAX_DGT = process.env.FAUCET_MAX_PER_REQUEST_DGT || '2'
const MAX_DRT = process.env.FAUCET_MAX_PER_REQUEST_DRT || '50'

let signerAddress = ''
let clientPromise = null

async function getClient() {
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
  if (token === 'DGT') return { denom: 'uDGT', max: MAX_DGT }
  if (token === 'DRT') return { denom: 'uDRT', max: MAX_DRT }
  throw new Error('Unsupported token')
}

function toMicro(amountDisplay) {
  // 6 decimals
  const n = Number(amountDisplay)
  if (!isFinite(n) || n <= 0) throw new Error('INVALID_AMOUNT')
  return String(Math.round(n * 1_000_000))
}

export async function transfer({ token, to }) {
  const { denom, max } = getTokenConfig(token)
  if (!denom) {
    const e = new Error(`Denom not configured for ${token}`)
    e.status = 500
    throw e
  }
  const amount = toMicro(max)
  const client = await getClient()
  const fee = 'auto'
  const memo = `faucet:${token}`

  try {
    logInfo('Sending faucet transfer', { token, to, amount, denom })
    const result = await client.sendTokens(signerAddress, to, [{ amount, denom }], fee, memo)
    // result: DeliverTxResponse with transactionHash
    return { hash: result.transactionHash }
  } catch (err) {
    logError('Transfer failed', err)
    // retry once after small delay
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
