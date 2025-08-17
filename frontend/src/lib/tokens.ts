// Token definitions mirrored from lean launch app for consistency
export interface TokenMeta {
  symbol: 'DGT' | 'DRT'
  base: string
  decimals: number
  display: string
  description: string
}

export const TOKENS: Record<'DGT' | 'DRT', TokenMeta> = {
  DGT: {
    symbol: 'DGT',
    base: 'udgt',
    decimals: 6,
    display: 'Dytallix Governance Token',
    description: 'Governance / staking / voting'
  },
  DRT: {
    symbol: 'DRT',
    base: 'udrt',
    decimals: 6,
    display: 'Dytallix Reward Token',
    description: 'Rewards / emissions / utility'
  }
}

export function formatAmountWithSymbol(amountBase: number | string, baseDenom: string): string {
  const meta = Object.values(TOKENS).find(t => t.base.toLowerCase() === baseDenom.toLowerCase())
  if (!meta) return String(amountBase)
  const n = typeof amountBase === 'string' ? BigInt(amountBase) : BigInt(Math.floor(amountBase))
  const factor = 10n ** BigInt(meta.decimals)
  const whole = n / factor
  const frac = n % factor
  if (frac === 0n) return `${whole} ${meta.symbol}`
  const fracStr = frac.toString().padStart(meta.decimals, '0').replace(/0+$/, '')
  return `${whole}.${fracStr} ${meta.symbol}`
}

export function toBaseUnits(symbol: 'DGT' | 'DRT', displayAmount: string | number): string {
  const meta = TOKENS[symbol]
  const str = String(displayAmount).trim()
  if (!/^[0-9]+(\.[0-9]+)?$/.test(str)) throw new Error('INVALID_AMOUNT')
  const [whole, dec = ''] = str.split('.')
  const decPadded = (dec + '0'.repeat(meta.decimals)).slice(0, meta.decimals)
  return String(BigInt(whole) * (10n ** BigInt(meta.decimals)) + BigInt(decPadded || '0'))
}
