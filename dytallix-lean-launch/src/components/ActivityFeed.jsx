import React, { useEffect, useMemo, useRef, useState } from 'react'
import { api, getBlockHeight } from '../lib/api.js'
import { connectWS } from '../lib/ws.js'

// Simple formatter helpers
const shortHash = (h) => (h ? `${String(h).slice(0, 10)}…${String(h).slice(-6)}` : '—')
const fmtTs = (ts) => new Date(ts || Date.now()).toLocaleString()

export default function ActivityFeed({ address, onNewBlock }) {
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState('')
  const [loading, setLoading] = useState(false)
  const [height, setHeight] = useState(0)

  // reset when address changes
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

  // Subscribe to tx updates via app WS (if available)
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

  // Live block height via RPC WS or periodic poll fallback
  useEffect(() => {
    let off = null
    let timer = null
    let cancelled = false

    ;(async () => {
      try { const h = await getBlockHeight(); if (!cancelled && h) setHeight(h) } catch {}
      try {
        const mod = await import('../chain/cosmosAdapter.ts')
        const unsub = mod?.subscribeWS?.({
          onNewBlock: (h) => {
            setHeight(h)
            try { onNewBlock?.(h) } catch {}
          },
        })
        off = typeof unsub === 'function' ? unsub : null
      } catch {
        // Fallback poll if WS fails
        timer = setInterval(async () => {
          try { const h = await getBlockHeight(); if (!cancelled && h && h !== height) { setHeight(h); try { onNewBlock?.(h) } catch {} } } catch {}
        }, 3000)
      }
    })()

    return () => { cancelled = true; try { off?.() } catch {}; if (timer) clearInterval(timer) }
  }, [onNewBlock, height])

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Activity</h3>
        <div className="badge" style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', color: 'var(--primary-500)', fontWeight: 800 }}>
          Height: {height}
        </div>
      </div>

      {!items.length ? <p className="muted">No transactions.</p> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((t, i) => (
            <div key={i} className="card" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 800 }}>{t.type || 'transfer'}</div>
                  {(t.amount || t.token) && <div className="muted">{t.amount} {t.token}</div>}
                </div>
                <div className="muted" style={{ whiteSpace: 'nowrap' }}>{fmtTs(t.timestamp)}</div>
              </div>
              {t.txHash && (
                <div className="muted" style={{ marginTop: 6, fontSize: '0.85rem' }}>Tx: <code>{shortHash(t.txHash)}</code></div>
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
