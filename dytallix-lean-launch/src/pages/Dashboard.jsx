import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import '../styles/global.css'
// Metrics client for dashboard data
import { getOverview, getTimeseries, openDashboardSocket, isFiniteNumber, getBlockHeight } from '../../frontend/src/lib/metricsClient.ts'
// Real PQC status card component
import PQCStatusCard from '../components/PQCStatusCard.jsx'
import { getPQCStatus } from '../lib/api.js'

const DEFAULT_RANGE = '1h'
const DEFAULT_REFRESH_MS = 10000
const persistRange = () => {}
const persistRefresh = () => {}
// Ensure we ALWAYS return an object with a no-op close so cleanup is safe
const logEvent = () => {}
const logApiError = () => 1

// Placeholder components (Block height widget only)
const BlockHeightWidget = () => {
  const [height, setHeight] = useState(0)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    const pull = async () => {
      const h = await getBlockHeight()
      if (!cancelled) {
        if (h != null && h > 0) { setHeight(h); setErr('') } else { setErr('Unavailable') }
      }
    }
    pull()
    const id = setInterval(pull, 4000)
    // WebSocket push (reuse dashboard ws)
    let ws
    try {
      ws = openDashboardSocket({
        onOverview: (o) => { if (o?.height != null) setHeight(Number(o.height)||0) }
      })
    } catch { /* ignore */ }
    return () => { cancelled = true; clearInterval(id); try { ws?.close() } catch {} }
  }, [])

  return (
    <div className="card">
      <h3>Block Height</h3>
      <div data-test="chain-height" style={{ fontSize: '2rem', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>
        {err && height===0 ? err : height>0 ? height.toLocaleString() : 'Loading...'}
      </div>
    </div>
  )
}
const LineChart = () => <div className="card">Line Chart</div>

const ranges = [
  { id: '15m', label: '15m' },
  { id: '1h', label: '1h' },
  { id: '24h', label: '24h' },
]
const refreshOptions = [
  { ms: 5000, label: '5s' },
  { ms: 10000, label: '10s' },
  { ms: 30000, label: '30s' },
  { ms: 0, label: 'Off' },
]

const StatusBadge = ({ status }) => {
  const map = { healthy: 'badge-success', degraded: 'badge-warning', down: 'badge-warning' }
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return <span className={`badge ${map[status] || 'badge-neutral'}`}>{label}</span>
}

// Added: visual trend pill with arrow and color encoding
const TrendPill = ({ changePct = 0 }) => {
  const dir = changePct > 0.5 ? 'up' : changePct < -0.5 ? 'down' : 'flat'
  const cls = dir === 'up' ? 'badge-success' : dir === 'down' ? 'badge-danger' : 'badge-neutral'
  const icon = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '→'
  const sign = changePct > 0 ? '+' : ''
  return (
    <span className={`badge ${cls}`} style={{ padding: '4px 10px' }}>
      <span style={{ fontSize: 10 }}>{icon}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{sign}{changePct.toFixed(1)}%</span>
    </span>
  )
}

const Skeleton = ({ height = 120 }) => (
  <div className="card" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="muted">Loading…</div>
  </div>
)

const ErrorBanner = ({ message, onRetry }) => (
  <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ color: '#FCA5A5', fontWeight: 700 }}>Error</div>
      <div className="muted" style={{ flex: 1 }}>{message}</div>
      {onRetry ? <button className="btn btn-secondary" onClick={onRetry}>Retry</button> : null}
    </div>
  </div>
)

function useAutoRefresh(intervalMs, fn) {
  const saved = useRef(fn)
  useEffect(() => { saved.current = fn }, [fn])
  useEffect(() => {
    if (!intervalMs) return
    const id = setInterval(() => saved.current?.(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}

function deriveHealth({ tps, blockTime, peers, mempool }) {
  if (tps === 0 || peers === 0) return 'down'
  if (blockTime > 10 || mempool > 5000) return 'degraded'
  return 'healthy'
}

const MetricCard = ({ label, value, href }) => (
  <a className="card" href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
      {href ? <span className="badge badge-info">View</span> : null}
    </div>
    <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
  </a>
)

const Selector = ({ options, value, onChange }) => (
  <div style={{ display: 'inline-flex', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--surface-border)', borderRadius: 12, padding: 4 }}>
    {options.map((o) => (
      <button key={o.id || o.ms} className={`btn ${value === (o.id || o.ms) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => onChange(o.id || o.ms)} style={{ padding: '8px 12px' }}>{o.label}</button>
    ))}
  </div>
)

const Dashboard = () => {
  const [range, setRange] = useState(DEFAULT_RANGE)
  const [refreshMs, setRefreshMs] = useState(DEFAULT_REFRESH_MS)
  const [overview, setOverview] = useState(null)
  const [err, setErr] = useState('')
  const [mock, setMock] = useState(false)

  const [tpsSeries, setTpsSeries] = useState({ points: [] })
  const [btSeries, setBtSeries] = useState({ points: [] })
  const [peersSeries, setPeersSeries] = useState({ points: [] })
  const [peers24Series, setPeers24Series] = useState({ points: [] })

  const [loading, setLoading] = useState(true)
  const [aiLatency, setAiLatency] = useState({ avg_ms: null, p95_ms: null, samples: 0 })
  const [pqc, setPqc] = useState(null)

  const loadAll = async () => {
    try {
      const [o, s1, s2, s3, s3_24, pq] = await Promise.all([
        getOverview(),
        getTimeseries('tps', range),
        getTimeseries('blockTime', range),
        getTimeseries('peers', range),
        getTimeseries('peers', '24h'),
        getPQCStatus().catch(() => null),
      ])
      setOverview(o); setMock(Boolean(o._mock))
      setTpsSeries(s1); setBtSeries(s2); setPeersSeries(s3); setPeers24Series(s3_24)
      if (pq) setPqc(pq)
      setErr('')
      // Fetch AI latency badge from node RPC (optional)
      try {
        const rpc = (await import('../config/cosmos.js')).getCosmosConfig().rpcUrl
        const r = await fetch(`${rpc}/ai/latency`, { cache: 'no-store' })
        if (r.ok) {
          const j = await r.json().catch(() => null)
          if (j) setAiLatency(j)
        }
      } catch {/* optional */}
    } catch (e) {
      const n = logApiError('dashboard')
      setErr(`Failed to load dashboard data (attempt ${n}). Using fallback data.`)
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => { logEvent('dashboard_load'); loadAll() }, [])
  // Range change
  useEffect(() => { logEvent('dashboard_range_change', { range }); loadAll() }, [range])
  // Auto refresh
  useAutoRefresh(refreshMs, loadAll)

  // Hardened WebSocket lifecycle (prevents undefined close() crash)
  useEffect(() => {
    let sock
    try {
      sock = openDashboardSocket({
        onOverview: (o) => setOverview((prev) => ({ ...(prev || {}), ...o, _mock: false })),
        onError: () => {}
      }) || null
    } catch (e) {
      console.warn('Socket init failed (non-fatal):', e)
      sock = null
    }
    return () => {
      try {
        if (sock && typeof sock.close === 'function') sock.close()
      } catch (e) {
        console.warn('Socket cleanup error (ignored):', e)
      }
    }
  }, [])

  const health = useMemo(() => overview ? deriveHealth(overview) : 'healthy', [overview])
  const lastUpdated = useMemo(() => overview?.updatedAt ? new Date(overview.updatedAt).toISOString() : '—', [overview])

  // Peer stats derived from series
  const peerStats = useMemo(() => {
    const pts = peersSeries?.points || []
    const pts24 = peers24Series?.points || []
    if (!pts.length) return null
    const vals = pts.map((p) => Number(p.value) || 0)
    const vals24 = pts24.map((p) => Number(p.value) || 0)
    const last = vals[vals.length - 1]
    const prev = vals[vals.length - 2] ?? last
    const first = vals[0] ?? last
    const sum = vals.reduce((a, b) => a + b, 0)
    const avg = sum / vals.length
    const avg24 = vals24.length ? (vals24.reduce((a, b) => a + b, 0) / vals24.length) : avg
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const sorted = [...vals].sort((a, b) => a - b)
    const n = sorted.length
    const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    const p95 = sorted[Math.floor(0.95 * (n - 1))]
    const variance = vals.reduce((a, v) => a + (v - avg) ** 2, 0) / n
    const stdDev = Math.sqrt(variance)
    const cvPct = avg ? (stdDev / avg) * 100 : 0
    const denom = first === 0 ? 1 : first
    const changePct = ((last - first) / denom) * 100
    const trend = changePct > 2 ? 'up' : changePct < -2 ? 'down' : 'flat'
    const lastDelta = last - prev
    return { last, avg, avg24, min, max, changePct, trend, median, p95, stdDev, cvPct, lastDelta }
  }, [peersSeries, peers24Series])

  const onChangeRange = (r) => { setRange(r); persistRange(r) }
  const onChangeRefresh = (ms) => { setRefreshMs(ms); persistRefresh(ms); logEvent('dashboard_autorefresh_toggle', { interval: ms }) }

  return (
    <div className="section">
      <div className="container">
        <style>{`
          .pill{padding:2px 8px;border-radius:9999px;font-size:.75rem}
          .pill.good{background:rgba(16,185,129,.15);color:#34D399}
          .pill.bad{background:rgba(239,68,68,.15);color:#F87171}
          .section-label{font-size:.85rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(148,163,184,.9)}
          .section-stack{margin-top:24px}
          .section-divider{height:1px;background:rgba(255,255,255,.06);margin:8px 0 12px}
        `}</style>
        <div className="section-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
          <div>
            <h2 className="section-title">Network Dashboard</h2>
            <p className="section-subtitle">Real-time network analytics, performance metrics, and activity.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <div className="muted">Range</div>
            <Selector options={ranges} value={range} onChange={onChangeRange} />
            <div className="muted">Refresh</div>
            <Selector options={refreshOptions} value={refreshMs} onChange={onChangeRefresh} />
          </div>
        </div>

        {err ? <ErrorBanner message={err} onRetry={loadAll} /> : null}

        {/* TOP ROW: Headline KPIs */}
        <div className="section-label">Headline KPIs</div>
        <div className="section-divider" />
        <div style={{ display:'grid', gap:16, marginTop:16, gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="card"><div className="muted">TPS (live)</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{isFiniteNumber(overview?.tps) ? overview.tps : '—'}</div></div>
          <div className="card"><div className="muted">Block Time (avg)</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{isFiniteNumber(overview?.blockTime) ? `${overview.blockTime}s` : '—'}</div></div>
          <div className="card"><div className="muted">Finality / Latency</div><div style={{ fontSize: 16, marginTop: 6 }}>{isFiniteNumber(overview?.finality) ? `${overview.finality}s` : '—'}</div><div className="muted" style={{ marginTop: 4 }}>AI P95 {aiLatency?.p95_ms ? `${Number(aiLatency.p95_ms).toFixed(0)} ms` : '—'}</div></div>
          <div className="card"><div className="muted">Validator Count</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{isFiniteNumber(overview?.validators) ? overview.validators : '—'}</div></div>
        </div>

        {/* MIDDLE ROW: System Health */}
        <div className="section-label section-stack">System Health</div>
        <div className="section-divider" />
        <div style={{ display:'grid', gap:16, marginTop:16, gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="card"><div className="muted">Peer Count</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{isFiniteNumber(overview?.peers) ? overview.peers : '—'}</div></div>
          <div className="card"><div className="muted">Mempool Size</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{isFiniteNumber(overview?.mempool) ? overview.mempool : '—'}</div></div>
          <div className="card"><div className="muted">Node CPU %</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{isFiniteNumber(overview?.cpu) ? `${overview.cpu}%` : '—'}</div></div>
          <div className="card"><div className="muted">Node Memory %</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{isFiniteNumber(overview?.memory) ? `${overview.memory}%` : '—'}</div></div>
          <div className="card"><div className="muted">Disk I/O</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{isFiniteNumber(overview?.diskIO) ? `${overview.diskIO} MB/s` : '—'}</div></div>
          <div className="card" style={{ display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
            <div className="muted">Overall Status</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 6 }}>
              <div style={{ fontSize: 16 }}>{health}</div>
              <span className={`pill ${health === 'healthy' ? 'good' : 'bad'}`}>{health}</span>
            </div>
            <div className="muted" style={{ marginTop: 8 }}>Last updated: {lastUpdated}{mock ? ' • mock' : ''}</div>
          </div>
        </div>

        {/* BOTTOM ROW: Trends + Security */}
        <div className="section-label section-stack">Trends & Security</div>
        <div className="section-divider" />
        <div style={{ display:'grid', gap:16, marginTop:16, gridTemplateColumns:'2fr 1fr' }}>
          <div style={{display:'grid', gap:16}}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>TPS over time</h3>
                <a className="btn btn-secondary" href="/explorer?tab=tx" style={{ padding: '6px 10px' }}>View latest transactions</a>
              </div>
              {tpsSeries.points?.length ? (
                <LineChart data={tpsSeries.points} yLabel="TPS" formatY={(v) => Number(v).toFixed(2)} />
              ) : <div className="muted">No data yet.</div>}
            </div>
            <div className="card">
              <h3 style={{ margin: 0 }}>Block time over time</h3>
              {btSeries.points?.length ? (
                <LineChart data={btSeries.points} yLabel="Block time (s)" formatY={(v) => Number(v).toFixed(2)} color="var(--accent-500)" />
              ) : <div className="muted">No data yet.</div>}
            </div>
            <div className="card">
              <h3 style={{ margin: 0 }}>Peer count over time</h3>
              {peersSeries.points?.length ? (
                <LineChart data={peersSeries.points} yLabel="Peers" formatY={(v) => Math.round(Number(v))} color="var(--success-500)" />
              ) : <div className="muted">No data yet.</div>}
            </div>
          </div>
          <div className="card" style={{alignSelf:'start'}}>
            <h3 style={{fontWeight:700, marginBottom:8}}>Security & PQC</h3>
            <div style={{display:'grid', gap:8}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">Block Height</span><span>{isFiniteNumber(overview?.height) ? overview.height.toLocaleString() : '—'}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">PQC Status</span><span className={`pill ${(pqc?.enabled || pqc?.status === 'active') ? 'good':'bad'}`}>{(pqc?.enabled || pqc?.status === 'active') ? 'enabled' : (pqc?.status || 'disabled')}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">Algorithm</span><span>{pqc?.algorithm || '—'}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">Runtime</span><span>{pqc?.runtime || '—'}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">Modules</span>
                <span className={`pill ${pqc?.wasmModules ? 'good':'bad'}`}>{pqc?.wasmModules ? 'enabled' : 'disabled'}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">Wallet Support</span><span className={`pill ${(pqc?.walletSupport === 'enabled' || pqc?.walletSupport === 'active') ? 'good':'bad'}`}>{pqc?.walletSupport || '—'}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">Version</span><span>{pqc?.version || '—'}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">Finality</span><span>{isFiniteNumber(overview?.finality) ? `${overview.finality}s` : '—'}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">AI Latency (P95)</span><span>{aiLatency?.p95_ms ? `${Number(aiLatency.p95_ms).toFixed(0)} ms` : '—'}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="muted">Updated</span><span>{pqc?.updatedAt ? new Date(pqc.updatedAt).toISOString() : lastUpdated}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
