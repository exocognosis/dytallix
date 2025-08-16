import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import '../styles/global.css'

// --- Helpers ---
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))
const fmtTime = (ts) => {
  try { return new Date(ts).toLocaleString() } catch { return String(ts) }
}
const shortHash = (h, n = 10) => (h && h.length > n + 6 ? `${h.slice(0, n)}…${h.slice(-6)}` : h || '')
const isHex64 = (s) => /^[A-Fa-f0-9]{64}$/.test(s || '')
const isNumeric = (s) => /^\d+$/.test((s || '').trim())
const looksLikeAddress = (s) => (s || '').toLowerCase().startsWith('dyt') || (s || '').startsWith('0x')

async function fetchJson(url, opts = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally { clearTimeout(t) }
}

const API = {
  blocks: (limit = 10) => `/api/blocks?limit=${limit}`,
  block: (height) => `/api/blocks/${height}`,
  txs: (limit = 10, page = 1) => `/api/transactions?limit=${limit}&page=${page}`,
  tx: (hash) => `/api/transactions/${hash}`,
  addr: (a) => `/api/addresses/${encodeURIComponent(a)}`,
  addrTxs: (a, limit = 20, page = 1) => `/api/addresses/${encodeURIComponent(a)}/transactions?limit=${limit}&page=${page}`,
  search: (q) => `/api/search/${encodeURIComponent(q)}`,
}

const StatusBadge = ({ status, ok }) => {
  const s = status || (ok ? 'confirmed' : 'pending')
  const tone = s === 'failed' ? 'badge-warning' : s === 'pending' ? 'badge-info' : 'badge-success'
  const label = s
  return <span className={`badge ${tone}`}>{label}</span>
}

const SectionCard = ({ title, subtitle, right, children }) => (
  <div className="card" style={{ display: 'grid', gap: 12 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {subtitle ? <div className="muted" style={{ marginTop: 2 }}>{subtitle}</div> : null}
      </div>
      <div>{right}</div>
    </div>
    <div>{children}</div>
  </div>
)

const DataTable = ({ columns, rows, emptyLabel = 'No data', onRowClick }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={{ textAlign: c.align || 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, borderBottom: '1px solid var(--surface-border)' }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ padding: 16, textAlign: 'center' }} className="muted">{emptyLabel}</td>
          </tr>
        ) : rows.map((r, i) => (
          <tr key={i} onClick={() => onRowClick && onRowClick(r)} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
            {columns.map((c) => (
              <td key={c.key} style={{ padding: '12px 12px', borderBottom: '1px solid var(--surface-border)', fontSize: 14, verticalAlign: 'middle', textAlign: c.align || 'left' }}>{typeof r[c.key] === 'function' ? r[c.key]() : r[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const DetailModal = ({ open, onClose, title, children }) => {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div className="card" style={{ maxWidth: 980, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>{children}</div>
      </div>
    </div>
  )
}

const Explorer = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useParams()

  // Search & filters
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [activeTab, setActiveTab] = useState('all') // all | blocks | transactions | contracts | addresses

  // Lists
  const [limit, setLimit] = useState(10)
  const [blocks, setBlocks] = useState([])
  const [txs, setTxs] = useState([])
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  const [loadingTxs, setLoadingTxs] = useState(false)

  // Detail state
  const [blockDetail, setBlockDetail] = useState(null)
  const [txDetail, setTxDetail] = useState(null)
  const [addrDetail, setAddrDetail] = useState(null)
  const [addrTxs, setAddrTxs] = useState([])
  const [blockTxs, setBlockTxs] = useState([])

  // From Deploy banner
  const [showDeployBanner, setShowDeployBanner] = useState(searchParams.get('from') === 'deploy')
  const templateFromDeploy = searchParams.get('template') || ''

  // Realtime
  const intervalRef = useRef(null)

  // Prefill details from URL params (query or path)
  useEffect(() => {
    const addrQ = searchParams.get('address')
    const height = searchParams.get('block')
    const hashQ = searchParams.get('tx')
    const addrP = params.addr
    const hashP = params.hash

    if (addrP || addrQ) openAddress(addrP || addrQ)
    else if ((height && isNumeric(height))) openBlock(Number(height))
    else if (hashP || hashQ) openTx(hashP || hashQ)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Initial load + auto refresh
  useEffect(() => {
    let disposed = false

    const load = async () => {
      try {
        setLoadingBlocks(true)
        const b = await fetchJson(API.blocks(limit))
        if (!disposed) setBlocks(b.blocks || [])
      } catch { if (!disposed) setBlocks([]) } finally { if (!disposed) setLoadingBlocks(false) }

      try {
        setLoadingTxs(true)
        const t = await fetchJson(API.txs(limit, 1))
        if (!disposed) setTxs(t.transactions || [])
      } catch { if (!disposed) setTxs([]) } finally { if (!disposed) setLoadingTxs(false) }
    }

    load()

    // Poll every 20s
    intervalRef.current = setInterval(load, 20000)
    return () => { disposed = true; clearInterval(intervalRef.current) }
  }, [limit])

  // --- Actions ---
  const doSearch = async (e) => {
    if (e) e.preventDefault()
    const q = query.trim()
    if (!q) return
    try {
      const res = await fetchJson(API.search(q))
      // Heuristics: navigate/open first strong match
      const first = res.results?.[0]
      if (first?.type === 'block' && first?.data?.height) openBlock(first.data.height)
      else if (first?.type === 'transaction' && first?.data?.hash) openTx(first.data.hash)
      else if (first?.type === 'address' && first?.data?.address) openAddress(first.data.address)
      else {
        // If numeric, attempt block; if tx-hash, attempt tx; if address-like, address
        if (isNumeric(q)) openBlock(Number(q))
        else if (isHex64(q)) openTx(q)
        else if (looksLikeAddress(q)) openAddress(q)
      }
      setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('q', q); return p })
    } catch {}
  }

  const openBlock = async (height) => {
    try {
      // Show placeholder immediately
      setBlockDetail({ height, pending: true })
      setTxDetail(null)
      setAddrDetail(null)
      setAddrTxs([])

      const data = await fetchJson(API.block(height))
      setBlockDetail(data)
      // try to gather txs for this block from recent txs list
      try {
        const t = await fetchJson(API.txs(200, 1))
        const forBlock = (t.transactions || []).filter((x) => Number(x.height) === Number(height))
        setBlockTxs(forBlock)
      } catch { setBlockTxs([]) }
      const p = new URLSearchParams(searchParams)
      p.set('block', height)
      p.delete('tx'); p.delete('address')
      setSearchParams(p)
    } catch {
      setBlockDetail((prev) => prev && prev.height === height ? { ...prev, notIndexed: true } : prev)
    }
  }

  const openTx = async (hash) => {
    try {
      // Show placeholder immediately so deep-link opens modal
      setTxDetail({ hash, pending: true })
      setBlockDetail(null)
      setAddrDetail(null)
      setAddrTxs([])
      const data = await fetchJson(API.tx(hash))
      setTxDetail(data)
      const p = new URLSearchParams(searchParams)
      p.set('tx', hash)
      p.delete('block'); p.delete('address')
      setSearchParams(p)
    } catch {
      setTxDetail((prev) => prev && prev.hash === hash ? { ...prev, notIndexed: true } : prev)
    }
  }

  const openAddress = async (addr) => {
    try {
      // Placeholder to open modal while indexing
      setAddrDetail({ address: addr, pending: true })
      setAddrTxs([])
      setBlockDetail(null)
      setTxDetail(null)

      const [info, hist] = await Promise.all([
        fetchJson(API.addr(addr)).catch(() => null),
        fetchJson(API.addrTxs(addr, 20, 1)).catch(() => ({ transactions: [] }))
      ])
      setAddrDetail(info || { address: addr, balance: '—' })
      setAddrTxs(hist?.transactions || [])
      const p = new URLSearchParams(searchParams)
      p.set('address', addr)
      p.delete('block'); p.delete('tx')
      setSearchParams(p)
    } catch {
      setAddrDetail((prev) => prev && prev.address === addr ? { ...prev, notIndexed: true } : prev)
    }
  }

  const closeDetail = () => {
    setBlockDetail(null); setTxDetail(null); setAddrDetail(null); setAddrTxs([])
    const p = new URLSearchParams(searchParams)
    p.delete('block'); p.delete('tx'); p.delete('address')
    setSearchParams(p)
  }

  // --- Render helpers ---
  const blockColumns = [
    { key: 'height', label: 'Height' },
    { key: 'hash', label: 'Block Hash' },
    { key: 'time', label: 'Timestamp' },
    { key: 'txCount', label: 'Txs', align: 'right' },
  ]
  const blockRows = (blocks || []).map((b) => ({
    height: (<a className="btn btn-secondary" href={`/explorer?block=${b.height}`} onClick={(e) => { e.preventDefault(); openBlock(b.height) }} style={{ padding: '6px 10px' }}>#{b.height}</a>),
    hash: <code>{shortHash(b.hash)}</code>,
    time: <span className="muted">{fmtTime(b.time)}</span>,
    txCount: <span style={{ fontWeight: 700 }}>{b.txCount ?? 0}</span>,
    // For clicks on the row
    _raw: b,
  }))

  const getStatus = (t) => (t?.success === false ? 'failed' : (t?.status === 'pending' ? 'pending' : 'confirmed'))

  // Columns for transactions table (fix ReferenceError)
  const txColumns = [
    { key: 'hash', label: 'Tx Hash' },
    { key: 'from', label: 'From' },
    { key: 'to', label: 'To' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'status', label: 'Status', align: 'right' },
  ]

  const txRows = (txs || []).map((t) => ({
    hash: (<a className="btn btn-secondary" href={`/explorer?tx=${t.hash}`} onClick={(e) => { e.preventDefault(); openTx(t.hash) }} style={{ padding: '6px 10px' }}>{shortHash(t.hash, 12)}</a>),
    from: t.from ? (<a href={`/explorer?address=${t.from}`} onClick={(e) => { e.preventDefault(); openAddress(t.from) }}>{shortHash(t.from)}</a>) : <span className="muted">—</span>,
    to: t.to ? (<a href={`/explorer?address=${t.to}`} onClick={(e) => { e.preventDefault(); openAddress(t.to) }}>{shortHash(t.to)}</a>) : <span className="muted">—</span>,
    amount: <span style={{ fontWeight: 700 }}>{t.amount || '—'}</span>,
    status: (<StatusBadge status={getStatus(t)} />),
    _raw: t,
  }))

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'blocks', label: 'Blocks' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'contracts', label: 'Contracts' },
    { id: 'addresses', label: 'Addresses' },
  ]

  return (
    <div className="section">
      {/* Page styles */}
      <style>{`
        .explorer-grid { display: grid; gap: 24px; grid-template-columns: 1.1fr 0.9fr; }
        @media (max-width: 1536px) { .explorer-grid { grid-template-columns: 1.1fr 0.9fr; } }
        @media (max-width: 1024px) { .explorer-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) { .explorer-grid { grid-template-columns: 1fr; } }
        @media (max-width: 360px) { .explorer-grid { grid-template-columns: 1fr; } }
        .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .tab { padding: 8px 12px; border: 1px solid var(--surface-border); border-radius: 999px; cursor: pointer; font-weight: 700; color: var(--text-muted); }
        .tab.active { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.35); color: #93C5FD; }
      `}</style>

      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Explorer</h2>
          <p className="section-subtitle">Search blocks, transactions, and addresses — updated in near real-time.</p>
        </div>

        {/* From Deploy banner */}
        {showDeployBanner && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>Deployed just now</div>
              <div className="muted">You came from Deploy{templateFromDeploy ? ` · Template: ${templateFromDeploy}` : ''}.</div>
            </div>
            <button className="btn" onClick={() => setShowDeployBanner(false)}>Dismiss</button>
          </div>
        )}

        {/* Search & Filters */}
        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <form onSubmit={doSearch} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              className="input"
              placeholder="Search by block, transaction, or address…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, minWidth: 220 }}
            />
            <button className="btn btn-primary" type="submit">Search</button>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="muted">Show</label>
              <select className="select" value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ width: 96 }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="muted">items</span>
            </div>
          </form>
          <div className="tabs">
            {tabs.map((t) => (
              <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Main content grid */}
        {(activeTab === 'all' || activeTab === 'blocks' || activeTab === 'transactions') && (
          <div className="explorer-grid" style={{ marginTop: 16 }}>
            {/* Latest Blocks */}
            {(activeTab === 'all' || activeTab === 'blocks') && (
              <SectionCard title="Latest Blocks" subtitle="Newest blocks on the network" right={loadingBlocks ? <span className="badge badge-info">Loading…</span> : null}>
                <DataTable columns={blockColumns} rows={blockRows} onRowClick={(r) => openBlock(r._raw.height)} />
              </SectionCard>
            )}

            {/* Latest Transactions */}
            {(activeTab === 'all' || activeTab === 'transactions') && (
              <SectionCard title="Latest Transactions" subtitle="Recent activity" right={loadingTxs ? <span className="badge badge-info">Loading…</span> : null}>
                <DataTable columns={txColumns} rows={txRows} onRowClick={(r) => openTx(r._raw.hash)} />
              </SectionCard>
            )}
          </div>
        )}

        {/* Addresses tab content */}
        {activeTab === 'addresses' && (
          <SectionCard title="Find Address" subtitle="Search to view balances and history">
            <div className="muted">Use the search bar above to open an address. Try pasting a Dytallix address that starts with <code>dyt…</code>.</div>
          </SectionCard>
        )}

        {/* Contracts tab content */}
        {activeTab === 'contracts' && (
          <SectionCard title="Contracts" subtitle="Deployed contracts on Dytallix">
            <div className="muted">Contract index coming soon. You can deploy from the Deploy page and open a contract address here.</div>
          </SectionCard>
        )}
      </div>

      {/* Detail Modals */}
      <DetailModal open={!!blockDetail} onClose={closeDetail} title={blockDetail ? `Block #${blockDetail.header?.height || blockDetail.height}` : ''}>
        {blockDetail ? (
          <>
            {(blockDetail.pending || blockDetail.notIndexed) && (
              <div className="card" style={{ background: 'rgba(30,41,59,0.35)' }}>
                <div style={{ fontWeight: 800 }}>{blockDetail.notIndexed ? 'Not indexed yet' : 'Loading block…'}</div>
                <div className="muted">The explorer may need a few seconds to index. Try again shortly.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => openBlock(blockDetail.height)}>Retry</button>
                </div>
              </div>
            )}
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
                <div className="muted">Hash</div>
                <code style={{ wordBreak: 'break-all' }}>{blockDetail.hash || blockDetail.header?.hash || '—'}</code>
              </div>
              <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
                <div className="muted">Timestamp</div>
                <div style={{ fontWeight: 700 }}>{fmtTime(blockDetail.time || blockDetail.header?.time)}</div>
              </div>
              <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
                <div className="muted">Proposer / Validator</div>
                <code>{shortHash(blockDetail.proposer || blockDetail.validator || '—')}</code>
              </div>
              <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
                <div className="muted">Tx Count</div>
                <div style={{ fontWeight: 800 }}>{blockDetail.txCount ?? (blockDetail.data?.txs?.length || 0)}</div>
              </div>
              <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
                <div className="muted">Block Size</div>
                <div style={{ fontWeight: 800 }}>{blockDetail.size ? `${blockDetail.size.toLocaleString()} bytes` : '—'}</div>
              </div>
              <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
                <div className="muted">Chain ID</div>
                <div style={{ fontWeight: 700 }}>{blockDetail.chainId || '—'}</div>
              </div>
            </div>
            <div>
              <h4 style={{ marginTop: 8, marginBottom: 8 }}>Transactions</h4>
              <DataTable
                columns={[{ key: 'hash', label: 'Tx Hash' }, { key: 'status', label: 'Status', align: 'right' }]}
                rows={(blockTxs || []).map((t) => ({
                  hash: (<a className="btn btn-secondary" href={`/explorer?tx=${t.hash}`} onClick={(e) => { e.preventDefault(); openTx(t.hash) }} style={{ padding: '6px 10px' }}>{shortHash(t.hash, 12)}</a>),
                  status: <StatusBadge status={getStatus(t)} />,
                }))}
                onRowClick={(r) => {}}
              />
            </div>
          </>
        ) : null}
      </DetailModal>

      <DetailModal open={!!txDetail} onClose={closeDetail} title={txDetail ? `Transaction ${shortHash(txDetail.hash || '')}` : ''}>
        {txDetail ? (
          <>
            {(txDetail.pending || txDetail.notIndexed) && (
              <div className="card" style={{ background: 'rgba(30,41,59,0.35)' }}>
                <div style={{ fontWeight: 800 }}>{txDetail.notIndexed ? 'Not indexed yet' : 'Loading transaction…'}</div>
                <div className="muted">Waiting for the explorer to index this transaction. You can retry below.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => openTx(txDetail.hash)}>Retry</button>
                </div>
              </div>
            )}
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div className="card"><div className="muted">Hash</div><code style={{ wordBreak: 'break-all' }}>{txDetail.hash || '—'}</code></div>
              <div className="card"><div className="muted">Block Height</div>{txDetail.height ? <a className="btn" href={`/explorer?block=${txDetail.height}`} onClick={(e) => { e.preventDefault(); openBlock(txDetail.height) }} style={{ padding: '6px 10px' }}>#{txDetail.height}</a> : <span className="muted">—</span>}</div>
              <div className="card"><div className="muted">Timestamp</div><div style={{ fontWeight: 700 }}>{fmtTime(txDetail.time || txDetail.timestamp)}</div></div>
              <div className="card"><div className="muted">Status</div><StatusBadge status={getStatus(txDetail)} /></div>
              <div className="card"><div className="muted">Gas Used</div><div style={{ fontWeight: 700 }}>{txDetail.gasUsed ?? '—'}</div></div>
              <div className="card"><div className="muted">Fee</div><div style={{ fontWeight: 700 }}>{txDetail.fee ?? '—'}</div></div>
            </div>
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
              <div className="card"><div className="muted">From</div>{txDetail.from ? <a href={`/explorer?address=${txDetail.from}`} onClick={(e) => { e.preventDefault(); openAddress(txDetail.from) }}>{txDetail.from}</a> : <span className="muted">—</span>}</div>
              <div className="card"><div className="muted">To</div>{txDetail.to ? <a href={`/explorer?address=${txDetail.to}`} onClick={(e) => { e.preventDefault(); openAddress(txDetail.to) }}>{txDetail.to}</a> : <span className="muted">—</span>}</div>
              <div className="card"><div className="muted">Value</div><div style={{ fontWeight: 700 }}>{txDetail.amount || txDetail.value || '—'}</div></div>
            </div>
          </>
        ) : null}
      </DetailModal>

      <DetailModal open={!!addrDetail} onClose={closeDetail} title={addrDetail ? `Address ${shortHash(addrDetail.address || '')}` : ''}>
        {addrDetail ? (
          <>
            {(addrDetail.pending || addrDetail.notIndexed) && (
              <div className="card" style={{ background: 'rgba(30,41,59,0.35)' }}>
                <div style={{ fontWeight: 800 }}>{addrDetail.notIndexed ? 'Not indexed yet' : 'Loading address…'}</div>
                <div className="muted">Waiting for the explorer to index this address/contract. You can retry below.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => openAddress(addrDetail.address)}>Retry</button>
                </div>
              </div>
            )}
            <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div className="card"><div className="muted">Address</div><code style={{ wordBreak: 'break-all' }}>{addrDetail.address}</code></div>
              <div className="card"><div className="muted">Balance</div><div style={{ fontWeight: 800 }}>{addrDetail.balance || '—'}</div></div>
              <div className="card"><div className="muted">First Seen</div><div style={{ fontWeight: 700 }}>{fmtTime(addrDetail.firstSeen || '')}</div></div>
              <div className="card"><div className="muted">Last Seen</div><div style={{ fontWeight: 700 }}>{fmtTime(addrDetail.lastSeen || '')}</div></div>
            </div>
            <div>
              <h4 style={{ marginTop: 8, marginBottom: 8 }}>Transaction History</h4>
              <DataTable
                columns={[{ key: 'hash', label: 'Tx Hash' }, { key: 'dir', label: 'Direction' }, { key: 'amount', label: 'Amount', align: 'right' }, { key: 'status', label: 'Status', align: 'right' }]}
                rows={(addrTxs || []).map((t) => ({
                  hash: (<a className="btn btn-secondary" href={`/explorer?tx=${t.hash}`} onClick={(e) => { e.preventDefault(); openTx(t.hash) }} style={{ padding: '6px 10px' }}>{shortHash(t.hash, 12)}</a>),
                  dir: <span className="muted">{t.type || (t.to === addrDetail.address ? 'receive' : 'send')}</span>,
                  amount: <span style={{ fontWeight: 700 }}>{t.amount || '—'}</span>,
                  status: <StatusBadge status={getStatus(t)} />,
                }))}
                onRowClick={(r) => {}}
              />
              {/* Unknown ABI notice */}
              {addrDetail && !addrDetail.abi && (
                <div className="card" style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 800 }}>ABI not available</div>
                  <div className="muted">This contract's ABI is not yet known. You can still view transfers and events. Learn how to publish ABI in the docs.</div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </DetailModal>
    </div>
  )
}

export default Explorer
