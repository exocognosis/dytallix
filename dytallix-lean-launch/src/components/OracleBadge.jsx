import React from 'react'

export default function OracleBadge({ verified=false, score, model }) {
  if (!verified && (score === undefined || score === null)) return null
  const label = verified ? 'Oracle Verified' : 'AI Risk'
  const color = verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {verified ? '✓' : '⚠️'} {label}{score !== undefined ? `: ${score}` : ''}{model ? ` • ${model}` : ''}
    </span>
  )
}

