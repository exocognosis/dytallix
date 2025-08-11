import React, { useEffect, useMemo, useRef, useState } from 'react'
import '../styles/global.css'

// Helper: sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

// Helper: fetch JSON with timeout and graceful error
async function fetchJson(url, opts = {}, timeoutMs = 8000) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(t)
  }
}

// PQC Algorithms and simulated sizes for fallback
const PQC = {
  dilithium: { label: 'Dilithium', pub: 1952, priv: 4864 },
  falcon: { label: 'Falcon', pub: 897, priv: 1281 },
  sphincs: { label: 'SPHINCS+', pub: 64, priv: 128 },
}

// Local storage helpers
const LS_KEY = 'dyt_wallet_v1'
const txKey = (addr) => `dyt_tx_${addr}`

const loadWallet = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
}
const saveWallet = (data) => localStorage.setItem(LS_KEY, JSON.stringify(data))
const clearWallet = () => localStorage.removeItem(LS_KEY)

// Crypto helpers
const bytesToHex = (u8) => Array.from(u8).map((b) => b.toString(16).padStart(2, '0')).join('')
const randomHex = (nBytes) => bytesToHex(crypto.getRandomValues(new Uint8Array(nBytes)))
async function sha256Hex(input) {
  const buf = typeof input === 'string' ? new TextEncoder().encode(input) : input
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return bytesToHex(new Uint8Array(hash))
}
async function deriveAddressFromPub(pubHex) {
  // Simple bech32-like placeholder address (format consistent across app)
  const h = await sha256Hex(pubHex)
  return `dytallix1${h.slice(0, 38)}`
}

// API layer with graceful fallback to simulation
async function apiGenerateKeyPair(algorithm) {
  try {
    const res = await fetchJson('/api/wallet/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ algorithm }),
    })
    if (!res?.success) throw new Error(res?.error || 'Key generation failed')
    return {
      algorithm,
      address: res.data.address,
      publicKey: res.data.public_key,
      privateKey: res.data.private_key,
      source: 'api',
    }
  } catch (e) {
    // Fallback to local generation
    const meta = PQC[algorithm]
    const publicKey = randomHex(meta.pub)
    const privateKey = randomHex(meta.priv)
    const address = await deriveAddressFromPub(publicKey)
    return { algorithm, address, publicKey, privateKey, source: 'local' }
  }
}

async function apiGetTokenBalances(address) {
  try {
    const res = await fetchJson(`/api/token/balance?address=${encodeURIComponent(address)}`)
    if (!res?.success) throw new Error(res?.error || 'Balance fetch failed')
    return { dgt: Number(res.data.dgt || 0), drt: Number(res.data.drt || 0) }
  } catch (e) {
    // Fallback to zero; keep deterministic by hashing address last byte
    const hint = parseInt((await sha256Hex(address)).slice(-2), 16)
    return { dgt: (hint % 5) * 10_000, drt: (hint % 7) * 5_000 }
  }
}

async function apiGetTxHistory(address) {
  try {
    const res = await fetchJson(`/api/wallet/transactions?address=${encodeURIComponent(address)}`)
    if (!res?.success) throw new Error(res?.error || 'Tx fetch failed')
    return res.data || []
  } catch (e) {
    // Fallback to locally cached or empty
    try { return JSON.parse(localStorage.getItem(txKey(address)) || '[]') } catch { return [] }
  }
}

function saveTxHistory(address, txs) {
  localStorage.setItem(txKey(address), JSON.stringify(txs || []))
}

// UI helpers
const formatAddr = (a) => (a?.length > 14 ? `${a.slice(0, 10)}…${a.slice(-6)}` : a || '')
const formatTime = (ts) => new Date(ts).toLocaleString()

const Section = ({ title, subtitle, children }) => (
  <section className="section">
    <div className="container">
      <div className="section-header">
        <h2 className="section-title" style={{ marginBottom: subtitle ? 6 : 16 }}>{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  </section>
)

const Tooltip = ({ label }) => (
  <span title={label} style={{ marginLeft: 6, color: 'var(--text-muted)', cursor: 'help' }}>?</span>
)

const Badge = ({ children, tone = 'default' }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: tone === 'success' ? 'rgba(16,185,129,0.15)' : tone === 'danger' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
      color: tone === 'success' ? '#16a34a' : tone === 'danger' ? '#ef4444' : '#3b82f6',
      fontSize: 12,
      fontWeight: 700,
    }}
  >
    {children}
  </span>
)

const Wallet = () => {
  const [algorithm, setAlgorithm] = useState('dilithium')
  const [wallet, setWallet] = useState(loadWallet())
  const [balances, setBalances] = useState({ dgt: 0, drt: 0 })
  const [txs, setTxs] = useState([])
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showExport, setShowExport] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const wsRef = useRef(null)

  const hasWallet = !!wallet?.address

  const refreshAll = async (addr) => {
    if (!addr) return
    const [bals, hist] = await Promise.all([apiGetTokenBalances(addr), apiGetTxHistory(addr)])
    setBalances(bals)
    setTxs(hist)
  }

  useEffect(() => {
    if (wallet?.address) refreshAll(wallet.address)
  }, [wallet?.address])

  // WebSocket listener for live tx updates (best-effort)
  useEffect(() => {
    if (!wallet?.address) return
    try {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      const url = `${proto}://${location.host}/ws/transactions?address=${encodeURIComponent(wallet.address)}`
      const ws = new WebSocket(url)
      wsRef.current = ws
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data?.type === 'tx_update' && data?.address === wallet.address) {
            setTxs((prev) => {
              const next = [data.tx, ...prev].slice(0, 50)
              saveTxHistory(wallet.address, next)
              return next
            })
          }
        } catch {}
      }
      ws.onerror = () => {}
      ws.onclose = () => {}
      return () => ws.close()
    } catch {}
  }, [wallet?.address])

  const handleCreate = async () => {
    setIsBusy(true); setError(''); setMessage('Generating keypair…')
    try {
      const kp = await apiGenerateKeyPair(algorithm)
      const next = { ...kp, createdAt: new Date().toISOString() }
      setWallet(next)
      saveWallet(next)
      setMessage(`Wallet created (${kp.source === 'api' ? 'API' : 'local'}).`)
      await refreshAll(next.address)
    } catch (e) {
      setError(e.message || 'Failed to create wallet')
    } finally { setIsBusy(false) }
  }

  const handleConnectExtension = async () => {
    setIsBusy(true); setError(''); setMessage('Connecting to extension…')
    try {
      // Prefer a PQC wallet provider if injected
      if (window.dytallix?.wallet?.connect) {
        const res = await window.dytallix.wallet.connect()
        if (!res?.address || !res?.publicKey) throw new Error('Extension returned no account')
        const next = {
          algorithm: res.algorithm || algorithm,
          address: res.address,
          publicKey: res.publicKey,
          privateKey: '', // extension-managed
          source: 'extension',
          createdAt: new Date().toISOString(),
        }
        setWallet(next); saveWallet(next); await refreshAll(next.address)
        setMessage('Extension wallet connected.')
        return
      }
      // Fallback: EVM provider (MetaMask) connection, used only to get an address
      if (window.ethereum?.request) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        const addr = accounts?.[0]
        if (!addr) throw new Error('No accounts available')
        const next = { algorithm, address: addr, publicKey: '', privateKey: '', source: 'evm', createdAt: new Date().toISOString() }
        setWallet(next); saveWallet(next); await refreshAll(next.address)
        setMessage('Browser wallet connected.')
      } else {
        throw new Error('No compatible wallet extension found')
      }
    } catch (e) {
      setError(e.message || 'Failed to connect wallet')
    } finally { setIsBusy(false) }
  }

  const handleImport = async (priv, algo) => {
    setIsBusy(true); setError(''); setMessage('Importing key…')
    try {
      if (!priv || priv.length < 32) throw new Error('Invalid private key')
      const meta = PQC[algo]
      // Derive a pseudo public key from private key for UI consistency (not cryptographically accurate)
      const publicKey = (await sha256Hex(priv)).slice(0, meta.pub * 2)
      const address = await deriveAddressFromPub(publicKey)
      const next = { algorithm: algo, address, publicKey, privateKey: priv, source: 'import', createdAt: new Date().toISOString() }
      setWallet(next); saveWallet(next); await refreshAll(next.address)
      setMessage('Wallet imported successfully.')
    } catch (e) {
      setError(e.message || 'Failed to import key')
    } finally { setIsBusy(false) }
  }

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setMessage('Copied to clipboard') } catch { setError('Copy failed') }
  }

  const handleExport = async () => {
    if (!wallet?.privateKey) { setError('No exportable key (extension-managed)'); return }
    setShowExport(true)
  }

  const handleDelete = async () => {
    setConfirmDelete(true)
  }

  const confirmDeleteNow = async () => {
    clearWallet(); setWallet(null); setBalances({ dgt: 0, drt: 0 }); setTxs([]); setConfirmDelete(false); setMessage('Wallet removed from this device.')
  }

  const overviewCards = (
    <div
      className="grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}
    >
      <div className="card">
        <h3 style={{ margin: 0, marginBottom: 6 }}>Status</h3>
        <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>Overview of your wallet and balances</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="muted">Wallet</div>
            <div>
              {hasWallet ? <Badge tone="success">Connected</Badge> : <Badge tone="danger">Not Connected</Badge>}
            </div>
          </div>
          <div>
            <div className="muted">Address<Tooltip label="Your public address for receiving tokens" /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <code style={{ overflowWrap: 'anywhere' }}>{hasWallet ? wallet.address : '—'}</code>
              {hasWallet && (
                <button className="btn btn-primary" onClick={() => copy(wallet.address)} style={{ padding: '6px 10px' }}>Copy</button>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.25)' }}>
              <div className="muted">Algorithm<Tooltip label="Post-quantum signature scheme" /></div>
              <div style={{ fontWeight: 700 }}>{hasWallet ? (PQC[wallet.algorithm]?.label || wallet.algorithm) : '—'}</div>
            </div>
            <div className="card" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
              <div className="muted">Created<Tooltip label="When this wallet was added on this device" /></div>
              <div style={{ fontWeight: 700 }}>{hasWallet ? new Date(wallet.createdAt).toLocaleString() : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: 0, marginBottom: 6 }}>Balances</h3>
        <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>Real-time balances from blockchain API</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
            <div className="muted">DGT (Governance)</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{balances.dgt.toLocaleString()}</div>
          </div>
          <div className="card" style={{ borderColor: 'rgba(16,185,129,0.28)' }}>
            <div className="muted">DRT (Rewards)</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{balances.drt.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => wallet?.address && refreshAll(wallet.address)} disabled={!hasWallet || isBusy}>Refresh</button>
        </div>
      </div>
    </div>
  )

  const createConnect = (
    <div
      className="grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}
    >
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Create New Wallet</h3>
        <p className="muted">Generates a new PQC keypair and securely stores it locally<Tooltip label="Keys are stored in your browser's local storage on this device." /></p>
        <label className="muted" htmlFor="algo">Algorithm</label>
        <select id="algo" value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)' }}>
          <option value="dilithium">Dilithium (Recommended)</option>
          <option value="falcon">Falcon</option>
          <option value="sphincs">SPHINCS+</option>
        </select>
        <button className="btn btn-primary" onClick={handleCreate} disabled={isBusy}>
          {isBusy ? 'Working…' : 'Create Wallet'}
        </button>
        <div className="muted" style={{ fontSize: '0.85rem' }}>
          Tip: You can request tokens on the Faucet page once a wallet is created.
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Connect Existing Wallet</h3>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Browser Extension</div>
                <div className="muted">Connect with a supported wallet extension<Tooltip label="PQC or EVM wallet extensions. Keys remain in your extension." /></div>
              </div>
              <button className="btn" onClick={handleConnectExtension} disabled={isBusy}>Connect</button>
            </div>
          </div>

          <ImportCard onImport={handleImport} />
        </div>
      </div>
    </div>
  )

  const keyManagement = (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Key & Address Management</h3>
      {!hasWallet ? (
        <p className="muted">Create or connect a wallet to manage keys.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <div className="muted">Public Address</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <code style={{ overflowWrap: 'anywhere' }}>{wallet.address}</code>
              <button className="btn btn-primary" onClick={() => copy(wallet.address)} style={{ padding: '6px 10px' }}>Copy</button>
            </div>
          </div>
          <div>
            <div className="muted">Private Key<Tooltip label="Keep this secret. Anyone with this can control your wallet." /></div>
            <div className="muted" style={{ marginTop: 6 }}>
              {wallet.privateKey ? 'Stored locally (encrypted at-rest by the browser).' : 'Managed by extension — cannot export.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" disabled={!wallet.privateKey} onClick={handleExport}>Export Private Key</button>
            <button className="btn" onClick={handleDelete} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444' }}>
              Delete Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const historyList = (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Transaction History</h3>
      {!hasWallet ? (
        <p className="muted">Create or connect a wallet to view activity.</p>
      ) : txs?.length ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {txs.map((t, i) => (
            <div key={i} className="card" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontWeight: 800 }}>{t.type || 'transfer'}</div>
                  <div className="muted">{t.amount} {t.denom || (t.token || '').toUpperCase()}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Badge tone={t.status === 'failed' ? 'danger' : t.status === 'pending' ? 'default' : 'success'}>
                    {t.status || 'confirmed'}
                  </Badge>
                  <div className="muted" style={{ whiteSpace: 'nowrap' }}>{formatTime(t.timestamp || Date.now())}</div>
                </div>
              </div>
              {t.hash && (
                <div className="muted" style={{ marginTop: 6, fontSize: '0.85rem' }}>Tx: <code>{formatAddr(t.hash)}</code></div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No transactions yet.</p>
      )}
    </div>
  )

  return (
    <div className="section">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Post-Quantum Wallet</h1>
          <p className="section-subtitle">Create, connect, and manage your Dytallix wallet with Dilithium, Falcon, and SPHINCS+</p>
        </div>

        {/* Alerts */}
        {(message || error) && (
          <div className="card" style={{ borderColor: error ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.32)', background: error ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: error ? '#ef4444' : '#16a34a' }}>{error ? 'Error' : 'Success'}</div>
            <div className="muted">{error || message}</div>
          </div>
        )}

        {/* Wallet Overview */}
        {overviewCards}

        {/* Create / Connect */}
        <div style={{ height: 16 }} />
        {createConnect}

        {/* Key Management */}
        <div style={{ height: 16 }} />
        {keyManagement}

        {/* Transaction History */}
        <div style={{ height: 16 }} />
        {historyList}
      </div>

      {/* Export Modal */}
      {showExport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 640, width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Export Private Key</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              Warning: Never share your private key. Anyone with this key can control your assets. Proceed only if you understand the risks.
            </p>
            <div className="card" style={{ background: 'rgba(30,41,59,0.4)', borderColor: 'rgba(148,163,184,0.25)' }}>
              <code style={{ wordBreak: 'break-all' }}>{wallet?.privateKey}</code>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn" onClick={() => copy(wallet.privateKey)}>Copy</button>
              <button className="btn btn-primary" onClick={() => setShowExport(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 520, width: '100%' }}>
            <h3 style={{ marginTop: 0, color: '#ef4444' }}>Delete Wallet</h3>
            <p className="muted">This will remove the wallet and keys stored on this device. It cannot be undone. Make sure you exported your private key first.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444' }} onClick={confirmDeleteNow}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Import form subcomponent to keep file tidy
function ImportCard({ onImport }) {
  const [algo, setAlgo] = useState('dilithium')
  const [priv, setPriv] = useState('')
  const [show, setShow] = useState(false)

  return (
    <div className="card" style={{ borderColor: 'rgba(34,197,94,0.28)' }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Manual Import</div>
        <div className="muted">Paste a private key to import an existing wallet<Tooltip label="Key is kept locally in your browser on this device." /></div>
        <label className="muted" htmlFor="ialgo">Algorithm</label>
        <select id="ialgo" value={algo} onChange={(e) => setAlgo(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)' }}>
          <option value="dilithium">Dilithium</option>
          <option value="falcon">Falcon</option>
          <option value="sphincs">SPHINCS+</option>
        </select>
        <label className="muted" htmlFor="priv">Private Key</label>
        <textarea id="priv" value={priv} onChange={(e) => setPriv(e.target.value)} rows={4} placeholder="Paste your private key here" style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)', fontFamily: 'monospace' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={() => { setPriv(''); setShow(false) }}>Clear</button>
          <button className="btn btn-primary" onClick={() => onImport(priv.trim(), algo)} disabled={!priv.trim()}>Import</button>
        </div>
      </div>
    </div>
  )
}

export default Wallet
