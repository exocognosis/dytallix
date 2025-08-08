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

  return (
    <div className="card">
      <h3>PQC Status</h3>
      <ul>
        {Object.entries(status).map(([k, v]) => (
          <li key={k}>{k}: {v}</li>
        ))}
      </ul>
    </div>
  )
}

export default PQCStatusCard
