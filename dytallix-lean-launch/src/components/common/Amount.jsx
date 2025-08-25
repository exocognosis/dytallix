import React from 'react'
import { formatAmount } from '../../tokenomics/index.ts'

/**
 * Amount - Displays formatted token amounts with optional fiat estimation
 * @param {Object} props
 * @param {BigInt|string|number} props.value - Amount value
 * @param {'DGT'|'DRT'} props.denom - Token denomination
 * @param {boolean} [props.showFiat] - Whether to show fiat estimate
 * @param {number} [props.decimals] - Number of decimal places (default: 6)
 */
const Amount = ({ value, denom = 'DGT', showFiat = false, decimals = 6 }) => {
  if (!value && value !== 0) return <span className="text-gray-500">—</span>

  // Convert to number if needed
  let numValue = value
  if (typeof value === 'bigint') {
    numValue = Number(value)
  } else if (typeof value === 'string') {
    numValue = parseFloat(value)
  }

  // Format the main amount
  const formattedAmount = formatAmount(numValue, denom, decimals)
  
  // Mock fiat conversion (in real implementation, this would use exchange rates)
  const fiatRate = denom === 'DGT' ? 0.12 : 0.08
  const fiatValue = (numValue / Math.pow(10, decimals)) * fiatRate

  return (
    <div className="text-right" data-testid="amount-display">
      <div className="font-mono text-sm">
        {formattedAmount}
      </div>
      {showFiat && (
        <div className="text-xs text-gray-500">
          ≈ ${fiatValue.toFixed(2)} USD
        </div>
      )}
    </div>
  )
}

export default Amount