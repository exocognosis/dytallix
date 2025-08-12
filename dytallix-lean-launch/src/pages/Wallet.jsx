import React, { useEffect, useMemo, useRef, useState } from 'react'
import '../styles/global.css'
import { useWallet } from '../hooks/useWallet.js'
import { useBalances } from '../hooks/useBalances.js'
import { useTx } from '../hooks/useTx.js'
import SendForm from '../components/wallet/SendForm.jsx'
import ReceiveModal from '../components/wallet/ReceiveModal.jsx'
import HistoryList from '../components/wallet/HistoryList.jsx'
import SettingsCard from '../components/wallet/SettingsCard.jsx'

// Helper: sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))

// UI helpers
const formatAddr = (a) => (a?.length > 14 ? `${a.slice(0, 10)}…${a.slice(-6)}` : a || '')
const formatTime = (ts) => new Date(ts).toLocaleString()

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

const isHex = (s) => /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0
const hexToBase64 = (hex) => {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g).map((h) => parseInt(h, 16)))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

// Add Cosmos faucet helper
import { requestCosmosFaucet } from '../utils/faucet'
// PQC integrity: preload and block actions if verification fails
import { preloadAll as preloadPqcIntegrity } from '../crypto/pqc/integrity'

const Wallet = () => {
  const [algorithm, setAlgorithm] = useState('dilithium')
  const [showExport, setShowExport] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showReceive, setShowReceive] = useState(false)
  // PQC integrity state
  const [pqcOk, setPqcOk] = useState(null)
  const [pqcErr, setPqcErr] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        await preloadPqcIntegrity()
        if (mounted) { setPqcOk(true); setPqcErr('') }
      } catch (e) {
        if (mounted) { setPqcOk(false); setPqcErr(e?.message || 'PQC integrity check failed') }
      }
    })()
    return () => { mounted = false }
  }, [])

  const { wallet, status, createWallet, unlock, lock, connectWatchOnly, importPrivateKey, importKeystore, changePassword, exportKeystore, forget, getSecret } = useWallet()
  // Expose keystore import for ImportCard toggle mode
  useEffect(() => { window.__importKeystore = async (json, password) => importKeystore(json, password) ; return () => { delete window.__importKeystore } }, [importKeystore])

  const hasWallet = !!wallet?.address
  const { balances, loading: balLoading, refresh: refreshBalances } = useBalances(wallet?.address)
  const tx = useTx({ wallet, getSecret })

  const handleCreate = async () => {
    setError(''); setMessage('')
    try {
      if (pqcOk === false) throw new Error('PQC disabled due to integrity failure')
      const password = prompt('Create password for keystore (min 8 chars with upper/lower/digit):')
      if (!password) return
      const { address } = await createWallet(algorithm, password)
      setMessage(`Wallet created: ${address}`)
    } catch (e) { setError(e.message || 'Failed to create wallet') }
  }

  const handleConnectExtension = async () => {
    setError(''); setMessage('')
    try {
      const addr = prompt('Enter address to watch:')
      if (!addr) return
      await connectWatchOnly(addr, algorithm)
      setMessage('Connected watch-only wallet')
    } catch (e) { setError(e.message || 'Failed to connect') }
  }

  const handleImport = async (priv, algo) => {
    setError(''); setMessage('')
    try {
      const password = prompt('Set password to encrypt this key:')
      if (!password) return
      const keyB64 = isHex(priv) ? hexToBase64(priv) : priv
      await importPrivateKey(algo, keyB64, password)
      setMessage('Wallet imported successfully.')
    } catch (e) { setError(e.message || 'Failed to import key') }
  }

  const handleExport = async () => { try { exportKeystore(); setShowExport(false) } catch (e) { setError(e.message) } }

  const handleDelete = async () => { setConfirmDelete(true) }
  const confirmDeleteNow = async () => { try { forget(); setConfirmDelete(false); setMessage('Wallet removed from this device.') } catch (e) { setError(e.message) } }

  const onEstimate = async (payload) => tx.estimate(payload)
  const onSignAndSubmit = async (payload) => {
    if (status !== 'unlocked') {
      const pwd = prompt('Enter password to unlock:')
      if (!pwd) throw new Error('Unlock cancelled')
      await unlock(pwd)
    }
    const signed = await tx.sign(payload)
    const res = await tx.submit(signed)
    return res
  }

  // Cosmos Faucet funding helper
  const handleCosmosFaucet = async () => {
    setError(''); setMessage('')
    try {
      if (!hasWallet) throw new Error('No wallet')
      const addr = wallet.address
      if (!/^dyt[a-z0-9]{10,}$/i.test(addr)) throw new Error('Address must be bech32 (dyt...)')
      const res = await requestCosmosFaucet(addr)
      setMessage(`Faucet requested: ${(res.amount ?? '')} ${(res.token ?? '')} ${res.txHash ? `tx ${String(res.txHash).slice(0,8)}…` : ''}`.trim())
      // give network a couple seconds then refresh balances
      setTimeout(() => { try { refreshBalances() } catch {} }, 2500)
    } catch (e) {
      setError(e?.message || 'Faucet request failed')
    }
  }

  const overviewCards = (
    <div
      className="grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}
    >
      {/* PQC warning banner if integrity failed */}
      {pqcOk === false && (
        <div className="card" style={{ gridColumn: '1 / -1', borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)' }}>
          <div style={{ fontWeight: 700, color: '#ef4444' }}>PQC Integrity Check Failed</div>
          <div className="muted">{pqcErr || 'One or more WASM modules failed verification. PQC actions are disabled.'}</div>
        </div>
      )}

      <div className="card">
        <h3 style={{ margin: 0, marginBottom: 6 }}>Status</h3>
        <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>Overview of your wallet and balances</p>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="muted">Wallet</div>
            <div>
              {hasWallet ? <Badge tone="success">{status === 'unlocked' ? 'Unlocked' : 'Locked'}</Badge> : <Badge tone="danger">Not Connected</Badge>}
            </div>
          </div>
          <div>
            <div className="muted">Address<Tooltip label="Your public address for receiving tokens" /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <code style={{ overflowWrap: 'anywhere' }}>{hasWallet ? wallet.address : '—'}</code>
              {hasWallet && (
                <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(wallet.address)} style={{ padding: '6px 10px' }}>Copy</button>
              )}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.25)' }}>
              <div className="muted">Algorithm<Tooltip label="Post-quantum signature scheme" /></div>
              <div style={{ fontWeight: 700 }}>{hasWallet ? (wallet.algo) : '—'}</div>
            </div>
            <div className="card" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
              <div className="muted">Status</div>
              <div style={{ fontWeight: 700 }}>{hasWallet ? status : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: 0, marginBottom: 6 }}>Balances</h3>
        <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>Real-time balances from blockchain API</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
            <div className="muted">DYL (Native)</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{Number(balances.native)/1_000_000}</div>
          </div>
          <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
            <div className="muted">DGT (Governance)</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{Number(balances.DGT)/1_000_000}</div>
          </div>
          <div className="card" style={{ borderColor: 'rgba(16,185,129,0.28)' }}>
            <div className="muted">DRT (Rewards)</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{Number(balances.DRT)/1_000_000}</div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => hasWallet && refreshBalances()} disabled={!hasWallet}>Refresh</button>
          <button className="btn" onClick={() => setShowReceive(true)} disabled={!hasWallet}>Receive</button>
          <a className="btn" href="/faucet">Faucet</a>
          {/* New Cosmos faucet trigger */}
          <button className="btn" onClick={handleCosmosFaucet} disabled={!hasWallet}>Fund via Faucet</button>
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
        <button className="btn btn-primary" onClick={handleCreate} disabled={pqcOk === false}>Create Wallet</button>
        <div className="muted" style={{ fontSize: '0.85rem' }}>
          Tip: You can request tokens on the Faucet page once a wallet is created.
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Connect / Import</h3>
        <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>Watch-only</div>
                <div className="muted">Connect with an address only<Tooltip label="No private keys stored." /></div>
              </div>
              <button className="btn" onClick={handleConnectExtension}>Connect</button>
            </div>
          </div>

          <ImportCard onImport={handleImport} disabled={pqcOk === false} />
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
              <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(wallet.address)} style={{ padding: '6px 10px' }}>Copy</button>
            </div>
          </div>
          <div className="muted">Keystore stored locally. Private key never leaves device.</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setShowExport(true)} disabled={!wallet.hasKeys}>Export Keystore</button>
            {status === 'unlocked' ? (
              <button className="btn" onClick={lock}>Lock</button>
            ) : (
              <button className="btn" onClick={async () => { const p = prompt('Password'); if (!p) return; try { await unlock(p) } catch (e) { setError(e.message) } }}>Unlock</button>
            )}
            <button className="btn" onClick={() => setConfirmDelete(true)} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444' }}>
              Delete Wallet
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="section">
      <div className="container">
        <div className="section-header" style={{ textAlign: 'center' }}>
          <h1 className="section-title">Wallet & Key Management</h1>
          <p className="section-subtitle" style={{ whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip' }}>PQC wallet creation and management for all supported quantum-resistant algorithms.</p>
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

        {/* Send Form */}
        <div style={{ height: 16 }} />
        {hasWallet && (
          <SendForm wallet={wallet} balances={balances} onEstimate={onEstimate} onSignAndSubmit={onSignAndSubmit} />
        )}

        {/* Transaction History */}
        <div style={{ height: 16 }} />
        {hasWallet && <HistoryList address={wallet.address} />}

        <div style={{ height: 16 }} />
        <SettingsCard onExport={exportKeystore} onChangePassword={changePassword} onForget={() => setConfirmDelete(true)} />
      </div>

      {/* Export Modal */}
      {showExport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 640, width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Export Keystore</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              Download your encrypted keystore JSON. Keep it safe; your assets depend on it.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn" onClick={() => setShowExport(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleExport}>Download</button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && hasWallet && (
        <ReceiveModal address={wallet.address} onClose={() => setShowReceive(false)} />
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 520, width: '100%' }}>
            <h3 style={{ marginTop: 0, color: '#ef4444' }}>Delete Wallet</h3>
            <p className="muted">This will remove the wallet and keys stored on this device. It cannot be undone. Make sure you exported your keystore first.</p>
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
function ImportCard({ onImport, disabled = false }) {
  const [algo, setAlgo] = useState('dilithium')
  const [priv, setPriv] = useState('')
  // Added keystore JSON import state
  const [showKs, setShowKs] = useState(false)
  const [ksJson, setKsJson] = useState('')
  const [ksMsg, setKsMsg] = useState('')
  const [ksErr, setKsErr] = useState('')

  // Access importKeystore via window dispatch (passed through closure in parent) by reusing onImport signature when showKs is true
  const handleImportKeystore = async () => {
    setKsErr(''); setKsMsg('')
    try {
      if (disabled) throw new Error('PQC disabled due to integrity failure')
      const password = prompt('Password to decrypt keystore:')
      if (!password) return
      // Parent wallet hook available in closure scope via importKeystore directly (we can attach to window for brevity)
      if (typeof window.__importKeystore !== 'function') throw new Error('Unavailable')
      await window.__importKeystore(ksJson, password)
      setKsMsg('Keystore imported.')
      setKsJson('')
    } catch (e) { setKsErr(e.message || 'Import failed') }
  }

  return (
    <div className="card" style={{ borderColor: 'rgba(34,197,94,0.28)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>Manual Import</div>
        <button className="btn" style={{ padding: '4px 10px' }} onClick={() => { setShowKs(s => !s); setKsErr(''); setKsMsg('') }}>{showKs ? 'Private Key Mode' : 'Keystore Mode'}</button>
      </div>
      <div className="muted" style={{ marginBottom: 8 }}>{showKs ? 'Paste encrypted keystore JSON' : 'Paste a private key to import an existing wallet'}<Tooltip label={showKs ? 'Keystore stays local; decrypted only in memory.' : 'Key is kept locally in your browser on this device.'} /></div>

      {!showKs && (
        <>
          <label className="muted" htmlFor="ialgo">Algorithm</label>
          <select id="ialgo" value={algo} onChange={(e) => setAlgo(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)' }} disabled={disabled}>
            <option value="dilithium">Dilithium</option>
            <option value="falcon">Falcon</option>
            <option value="sphincs">SPHINCS+</option>
          </select>
          <label className="muted" htmlFor="priv">Private Key (base64 or hex)</label>
          <textarea id="priv" value={priv} onChange={(e) => setPriv(e.target.value)} rows={4} placeholder="Paste your private key here" style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)', fontFamily: 'monospace' }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => { setPriv('') }}>Clear</button>
            <button className="btn btn-primary" onClick={() => onImport(priv.trim(), algo)} disabled={!priv.trim() || disabled}>Import</button>
          </div>
        </>
      )}

      {showKs && (
        <>
          <textarea value={ksJson} onChange={(e) => setKsJson(e.target.value)} rows={6} placeholder="Paste keystore JSON" style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)', fontFamily: 'monospace' }} />
          {ksMsg && <div className="card" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.32)' }}>{ksMsg}</div>}
          {ksErr && <div className="card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.35)' }}>{ksErr}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => { setKsJson('') }}>Clear</button>
            <button className="btn btn-primary" onClick={handleImportKeystore} disabled={!ksJson.trim() || disabled}>Import Keystore</button>
          </div>
        </>
      )}
    </div>
  )
}

export default Wallet
