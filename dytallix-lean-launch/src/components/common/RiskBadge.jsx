import React from 'react'

/**
 * RiskBadge - Displays AI risk assessment with color coding and tooltip
 * @param {Object} props
 * @param {'low'|'medium'|'high'} props.level - Risk level
 * @param {number} [props.score] - Raw numeric score (0-1)
 * @param {string} [props.rationale] - Short rationale for the risk level
 */
const RiskBadge = ({ level, score, rationale }) => {
  const config = {
    low: { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      label: 'Low Risk',
      icon: '✓'
    },
    medium: { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      label: 'Medium Risk',
      icon: '⚠'
    },
    high: { 
      color: 'bg-red-100 text-red-800 border-red-200', 
      label: 'High Risk',
      icon: '⚠'
    }
  }

  const currentConfig = config[level] || config.medium
  
  const tooltip = `${currentConfig.label}${score !== undefined ? ` (${(score * 100).toFixed(1)}%)` : ''}${rationale ? `\n${rationale}` : ''}`

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentConfig.color}`}
      title={tooltip}
      aria-label={tooltip}
      data-testid="risk-badge"
    >
      <span className="mr-1" aria-hidden="true">{currentConfig.icon}</span>
      {currentConfig.label}
    </span>
  )
}

export default RiskBadge