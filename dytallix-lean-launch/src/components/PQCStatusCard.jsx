import React, { useEffect, useState } from 'react'
import { getPQCStatus } from '../lib/api.js'

const PQCStatusCard = () => {
  const [status, setStatus] = useState({})

  useEffect(() => {
    const fetchStatus = async () => {
      const s = await getPQCStatus()
      setStatus(s)
    }
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => clearInterval(id)
  }, [])

  const toBadgeClass = (v) => {
    if (v === 'active') return 'badge badge-success'
    if (v === 'degraded') return 'badge badge-warning'
    return 'badge badge-neutral'
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0 }}>PQC Status</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
        {Object.entries(status).map(([k, v]) => (
          <li key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
            {typeof v === 'string' ? (
              <span className={toBadgeClass(v)}>{v}</span>
            ) : (
              <span className="badge badge-info">{String(v)}</span>
            )}
          </li>
        ))}
      </ul>
      <span className="muted" style={{ fontSize: '0.8rem' }}>Auto-refreshes every 5s</span>
    </div>
  )
}

export default PQCStatusCard
