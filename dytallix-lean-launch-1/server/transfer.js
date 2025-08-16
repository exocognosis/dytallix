import dotenv from 'dotenv'
import { ethers } from 'ethers'
import { logInfo, logError } from './logger.js'

dotenv.config()

const RPC_URL = process.env.RPC_URL
const PK = process.env.FAUCET_PRIVATE_KEY
const DGT_ADDR = process.env.DGT_TOKEN_ADDRESS
const DRT_ADDR = process.env.DRT_TOKEN_ADDRESS
const MAX_DGT = process.env.FAUCET_MAX_PER_REQUEST_DGT || '2'
const MAX_DRT = process.env.FAUCET_MAX_PER_REQUEST_DRT || '50'

if (!RPC_URL || !PK) {
  throw new Error('Missing RPC_URL or FAUCET_PRIVATE_KEY in environment')
}

const provider = new ethers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(PK, provider)

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)'
]

function getTokenConfig(token) {
  if (token === 'DGT') {
    return { address: DGT_ADDR, max: MAX_DGT }
  }
  if (token === 'DRT') {
    return { address: DRT_ADDR, max: MAX_DRT }
  }
  throw new Error('Unsupported token')
}

export async function transfer({ token, to }) {
  const { address: tokenAddress, max } = getTokenConfig(token)
  if (!tokenAddress) {
    throw Object.assign(new Error(`Token address not configured for ${token}`), { status: 500 })
  }

  // For MVP assume ERC-20 for both
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet)
  const decimals = await contract.decimals()
  const amount = ethers.parseUnits(max.toString(), decimals)

  const trySend = async () => {
    const tx = await contract.transfer(to, amount)
    const receipt = await tx.wait(1)
    return { hash: receipt.transactionHash || tx.hash }
  }

  try {
    logInfo('Sending faucet transfer', { token, to, amount: max })
    return await trySend()
  } catch (err) {
    logError('Transfer failed, retrying once', err.message)
    // one retry after small delay
    await new Promise(r => setTimeout(r, 1200))
    try {
      return await trySend()
    } catch (err2) {
      logError('Transfer failed after retry', err2.message)
      const e = new Error('RPC_TRANSFER_FAILED')
      e.status = 502
      throw e
    }
  }
}

export function getMaxFor(token) {
  return getTokenConfig(token).max
}
