import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react'
import '../styles/global.css'

// Strengthened placeholder utilities & fallbacks to prevent runtime crashes
const DEFAULT_RANGE = '1h'
const DEFAULT_REFRESH_MS = 10000
const persistRange = () => {}
const persistRefresh = () => {}
const getOverview = () => Promise.resolve({})
const getTimeseries = () => Promise.resolve({ points: [] })
// Ensure we ALWAYS return an object with a no-op close so cleanup is safe
const openDashboardSocket = (handlers = {}) => {
  try {
    // If a real implementation gets injected later it can override this.
    // For now just simulate an interface.
    return { close: () => {}, send: () => {} }
  } catch (e) {
    return { close: () => {} }
  }
}
const logEvent = () => {}
const logApiError = () => 1

// Placeholder components
const BlockHeightWidget = () => {
  const [height, setHeight] = useState(0)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    const fetchHeight = async () => {
      try {
        const res = await fetch('/api/status/height', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        let data
        try {
          data = await res.json()
        } catch (e) {
          throw new Error('Invalid JSON in /api/status/height')
        }
        if (!cancelled && data && (data.ok || data.height != null)) {
          setHeight(Number(data.height) || 0)
          setErr('')
        }
      } catch (error) {
        if (!cancelled) {
          setErr('Unavailable')
          // Silent console to avoid noisy crashes in production; keep for dev.
          console.warn('Block height fetch issue:', error?.message || error)
        }
      }
    }

    fetchHeight()
    const interval = setInterval(fetchHeight, 10000) // Poll every 10 seconds
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return (
    <div className="card">
      <h3>Block Height</h3>
      <div data-test="chain-height" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        {err ? err : height > 0 ? height : 'Loading...'}
      </div>
    </div>
  )
}
const PQCStatusCard = () => <div className="card">PQC Status Card</div>
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

  const loadAll = async () => {
    try {
      const [o, s1, s2, s3, s3_24] = await Promise.all([
        getOverview(),
        getTimeseries('tps', range),
        getTimeseries('blockTime', range),
        getTimeseries('peers', range),
        getTimeseries('peers', '24h'),
      ])
      setOverview(o); setMock(Boolean(o._mock))
      setTpsSeries(s1); setBtSeries(s2); setPeersSeries(s3); setPeers24Series(s3_24)
      setErr('')
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
  const lastUpdated = useMemo(() => overview?.updatedAt ? new Date(overview.updatedAt).toLocaleString() : '—', [overview])

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

        {/* Chain status row */}
        {loading && !overview ? (
          <Skeleton height={120} />
        ) : (
          <div className="grid grid-3">
            <MetricCard label="Block Height" value={overview?.height?.toLocaleString?.() || overview?.height || '—'} href={`/explorer?block=${overview?.height || ''}`} />
            <MetricCard label="TPS" value={overview?.tps ?? '—'} />
            <MetricCard label="Block Time (avg)" value={`${overview?.blockTime ?? '—'}s`} />
            <MetricCard label="Peer Count" value={overview?.peers ?? '—'} />
            <MetricCard label="Validator Count" value={overview?.validators ?? '—'} />
            <MetricCard label="Finality / Latency" value={`${overview?.finality ?? '—'}s`} />
            <MetricCard label="Mempool Size" value={overview?.mempool ?? '—'} />
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Status</div>
                <div style={{ marginTop: 6 }}><StatusBadge status={health} /></div>
              </div>
              <div className="muted">Last updated: {lastUpdated}{mock ? ' • mock' : ''}</div>
            </div>
          </div>
        )}

        {/* Resource row */}
        <div className="grid grid-3" style={{ marginTop: 24 }}>
          <MetricCard label="Node CPU %" value={overview?.cpu != null ? `${overview.cpu}%` : '—'} />
          <MetricCard label="Node Memory %" value={overview?.memory != null ? `${overview.memory}%` : '—'} />
          <MetricCard label="Disk I/O" value={overview?.diskIO != null ? `${overview.diskIO} MB/s` : '—'} />
        </div>

        {/* Charts */}
        <div className="grid grid-2" style={{ marginTop: 24 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>TPS over time</h3>
              <a className="btn btn-secondary" href="/explorer?tab=tx" style={{ padding: '6px 10px' }}>View latest transactions</a>
            </div>
            {tpsSeries.points?.length ? (
              <LineChart data={tpsSeries.points} yLabel="TPS" formatY={(v) => Number(v).toFixed(2)} />
            ) : <div className="muted">No data</div>}
          </div>
          <div className="card">
            <h3 style={{ margin: 0 }}>Block time over time</h3>
            {btSeries.points?.length ? (
              <LineChart data={btSeries.points} yLabel="Block time (s)" formatY={(v) => Number(v).toFixed(2)} color="var(--accent-500)" />
            ) : <div className="muted">No data</div>}
          </div>
        </div>
        <div className="grid grid-2" style={{ marginTop: 24 }}>
          <div className="card">
            <h3 style={{ margin: 0 }}>Peer count over time</h3>
            {peersSeries.points?.length ? (
              <>
                <LineChart data={peersSeries.points} yLabel="Peers" formatY={(v) => Math.round(Number(v))} color="var(--success-500)" />
                {peerStats && (
                  // Redesigned KPI grid: top row key KPIs, bottom row distribution & stability
                  <div className="kpi-grid" style={{ marginTop: 10 }}>
                    {/* Top row: Current • 24h Avg • Min–Max • Trend */}
                    <div className="kpi-tile">
                      <div className="kpi-label">Current</div>
                      <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(peerStats.last)}</div>
                    </div>
                    <div className="kpi-tile">
                      <div className="kpi-label">24h Avg</div>
                      <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(peerStats.avg24)}</div>
                    </div>
                    <div className="kpi-tile">
                      <div className="kpi-label">Min–Max</div>
                      <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(peerStats.min)}–{Math.round(peerStats.max)}</div>
                    </div>
                    <div className="kpi-tile">
                      <div className="kpi-label">Trend</div>
                      <div><TrendPill changePct={peerStats.changePct} /></div>
                    </div>

                    {/* Bottom row: Δ Last • Volatility (σ + CV%) • P95 • Median */}
                    <div className="kpi-tile">
                      <div className="kpi-label">Δ Last</div>
                      {(() => {
                        const val = Math.round(peerStats.lastDelta)
                        const positive = val > 0
                        const color = val === 0 ? 'var(--text-muted)' : positive ? 'var(--success-500)' : 'var(--danger-500)'
                        const sign = val > 0 ? '+' : ''
                        return <div className="kpi-value" style={{ color, fontVariantNumeric: 'tabular-nums' }}>{sign}{val}</div>
                      })()}
                    </div>
                    <div className="kpi-tile">
                      <div className="kpi-label">Volatility (σ + CV%)</div>
                      <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{peerStats.stdDev.toFixed(1)} <span className="muted" style={{ fontWeight: 600 }}>(CV {peerStats.cvPct.toFixed(1)}%)</span></div>
                      {(() => {
                        const pct = Math.max(0, Math.min(100, peerStats.cvPct))
                        return (
                          <div className="progress-mini" aria-hidden="true">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                        )
                      })()}
                    </div>
                    <div className="kpi-tile">
                      <div className="kpi-label">P95</div>
                      <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(peerStats.p95)}</div>
                    </div>
                    <div className="kpi-tile">
                      <div className="kpi-label">Median</div>
                      <div className="kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(peerStats.median)}</div>
                    </div>
                  </div>
                )}
              </>
            ) : <div className="muted">No data</div>}
          </div>
          <div className="card">
            <h3 style={{ margin: 0 }}>Security & PQC</h3>
            <div className="grid grid-2">
              <BlockHeightWidget />
              <PQCStatusCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
