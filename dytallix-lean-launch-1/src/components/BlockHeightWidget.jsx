import React, { useEffect, useState } from 'react'
import { getBlockHeight } from '../lib/api.js'

const BlockHeightWidget = () => {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const fetchHeight = async () => {
      const h = await getBlockHeight()
      setHeight(h)
    }
    fetchHeight()
    const id = setInterval(fetchHeight, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3 style={{ margin: 0 }}>Block Height</h3>
      <span className="muted" style={{ fontSize: '0.9rem' }}>Local node (mock)</span>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-400)' }}>{height}</div>
    </div>
  )
}

export default BlockHeightWidget
