import React from 'react'
import styles from './AiRiskBadge.module.css'

/**
 * AiRiskBadge
 * Props:
 *  - score: number | null
 *  - label: 'low' | 'medium' | 'high' | undefined
 *  - status: 'ok' | 'unavailable' | 'loading' | undefined
 *  - latencyMs?: number
 *  - model?: string
 */
export default function AiRiskBadge({ score, label, status, latencyMs, model }) {
  // Hide while loading to prevent flashing N/A
  if (!status || status === 'loading') return null

  // If oracle is unavailable, show neutral N/A badge
  if (status === 'unavailable') {
    const tip = `AI Risk: N/A${typeof latencyMs === 'number' ? ` • latency=${latencyMs}ms` : ''}`
    return (
      <span className={`${styles.badge} ${styles.gray}`} title={tip} aria-label="AI risk unavailable">
        N/A
      </span>
    )
  }

  // Determine risk level from label or score
  let level = (label || '').toLowerCase()
  if (!level && typeof score === 'number') {
    level = score < 0.3 ? 'low' : (score < 0.7 ? 'medium' : 'high')
  }

  let colorClass = styles.gray
  let text = 'N/A'
  switch (level) {
    case 'low':
      colorClass = styles.green
      text = 'Low Risk'
      break
    case 'medium':
      colorClass = styles.orange
      text = 'Medium Risk'
      break
    case 'high':
      colorClass = styles.red
      text = 'High Risk'
      break
    default:
      // keep gray N/A
      break
  }

  const tips = []
  if (typeof score === 'number') tips.push(`score=${Number(score).toFixed(2)}`)
  if (typeof latencyMs === 'number') tips.push(`latency=${latencyMs}ms`)
  if (model) tips.push(`model=${model}`)
  const title = tips.length ? tips.join(' • ') : undefined

  return (
    <span className={`${styles.badge} ${colorClass}`} title={title} aria-label={`AI risk ${text}`}>
      {text}
    </span>
  )
}
