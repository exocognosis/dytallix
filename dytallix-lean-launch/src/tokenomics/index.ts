// Tokenomics utilities
export const DENOMINATIONS = {
  DGT: 'DGT',
  DRT: 'DRT'
}

export const TOKENS = {
  DGT: { symbol: 'DGT', decimals: 6, name: 'Dytallix Governance Token' },
  DRT: { symbol: 'DRT', decimals: 6, name: 'Dytallix Reward Token' }
}

export function formatAmount(amount, denom = 'DGT', decimals = 6) {
  if (!amount) return '0'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(num / Math.pow(10, decimals)) + ' ' + denom
}

export function parseAmount(amountStr, decimals = 6) {
  if (!amountStr) return 0
  const num = parseFloat(amountStr)
  return Math.floor(num * Math.pow(10, decimals))
}

export default {
  DENOMINATIONS,
  TOKENS,
  formatAmount,
  parseAmount
}