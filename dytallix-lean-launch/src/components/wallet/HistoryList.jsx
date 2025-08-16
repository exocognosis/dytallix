import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { connectWS } from '../../lib/ws.js'

export default function HistoryList({ address }) {
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setItems([]); setCursor('') }, [address])

  const load = async () => {
    if (!address) return
    setLoading(true)
    try {
      const res = await api(`/api/txs/${address}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`)
      setItems((prev) => [...prev, ...(res.items || [])])
      setCursor(res.nextCursor || '')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [address])

  useEffect(() => {
    if (!address) return
    const ws = connectWS(`/transactions?address=${encodeURIComponent(address)}`)
    if (!ws) return
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data?.type === 'tx_status' && data?.address === address) {
          setItems((prev) => [{ ...data }, ...prev].slice(0, 100))
        }
      } catch {}
    }
    return () => ws.close()
  }, [address])

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Transaction History</h3>
      {!items.length ? <p className="muted">No transactions.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((t, i) => (
            <div key={i} className="card" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 800 }}>{t.type || 'transfer'}</div>
                  <div className="muted">{t.amount} {t.token}</div>
                </div>
                <div className="muted" style={{ whiteSpace: 'nowrap' }}>{new Date(t.timestamp || Date.now()).toLocaleString()}</div>
              </div>
              {t.txHash && (
                <div className="muted" style={{ marginTop: 6, fontSize: '0.85rem' }}>Tx: <code>{String(t.txHash).slice(0, 10)}…{String(t.txHash).slice(-6)}</code></div>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={load} disabled={loading || !cursor}>Load more</button>
      </div>
    </div>
  )
}
