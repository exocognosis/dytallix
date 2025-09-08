import React, { useEffect, useMemo, useState } from 'react'
import { getBlockHeight as _getBlockHeight } from '../lib/api.js'
import { TOKENS as TOKENOMICS } from '../tokenomics.js'

// SendTx: amount/denom selector, fee estimate, confirm modal, result panel (tx hash + block height)
export default function SendTx({ wallet, balances, onEstimate, onSignAndSubmit }) {
  const [token, setToken] = useState('native') // native | DGT | DRT
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [est, setEst] = useState(null)
  const [error, setError] = useState('')
  const [openConfirm, setOpenConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // { txHash, height }

  const decimalsFor = (t) => {
    if (t === 'native') return 6 // native chain token decimals
    return TOKENOMICS[t]?.decimals || 6
  }
  const microFactor = (t) => 10 ** decimalsFor(t)
  const max = useMemo(() => BigInt(balances?.[token] || '0'), [balances, token])

  useEffect(() => { setEst(null); setResult(null) }, [token, to, amount])

  const validate = () => {
    if (!to || !/^dyt[a-z0-9]{10,}/i.test(to)) return 'Invalid bech32 address'
    const n = Number(amount)
    if (!amount || !isFinite(n) || n <= 0) return 'Invalid amount'
    const micro = BigInt(Math.floor(n * microFactor(token)))
    if (micro > max) return 'Insufficient funds'
    return ''
  }

  const buildAmountMicro = () => String(Math.floor(Number(amount) * microFactor(token)))

  const handleEstimate = async () => {
    const v = validate(); if (v) { setError(v); return }
    setError('')
    try {
      const payload = { type: 'transfer', token, to, amount: buildAmountMicro(), from: wallet.address }
      const e = await onEstimate(payload)
      setEst(e)
      setOpenConfirm(true)
    } catch (e) { setError(e?.message || 'Estimate failed') }
  }

  const handleConfirmSend = async () => {
    const v = validate(); if (v) { setError(v); return }
    setSubmitting(true); setError('')
    try {
      const payload = { type: 'transfer', token, to, amount: buildAmountMicro(), from: wallet.address }
      const res = await onSignAndSubmit(payload)
      let height = 0
      try { if (typeof _getBlockHeight === 'function') { height = await _getBlockHeight() } } catch {}
      setResult({ txHash: res?.txHash || '', height })
      setOpenConfirm(false)
      setAmount(''); setTo('')
    } catch (e) {
      setError(e?.message || 'Submit failed')
    } finally { setSubmitting(false) }
  }

  // New: Primary Send button behavior – if an estimate exists, submit immediately; otherwise open confirm modal first
  const handlePrimarySend = async () => {
    if (est) {
      await handleConfirmSend()
    } else {
      setOpenConfirm(true)
    }
  }

  return (
    <div className="card" style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Send</h3>
      <label className="muted" htmlFor="token">Token</label>
      <select id="token" value={token} onChange={(e) => setToken(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)' }}>
        <option value="native">DYL</option>
        <option value="DGT">DGT</option>
        <option value="DRT">DRT</option>
      </select>
      <div className="muted">Available: {Number(max)/microFactor(token)}</div>

      <label className="muted" htmlFor="to">To Address</label>
      <input id="to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="dytallix1..." style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)' }} />

      <label className="muted" htmlFor="amt">Amount</label>
      <input id="amt" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)' }} />

      {est && (
        <div className="card" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <div className="muted">Estimated Fee: {est.fee}</div>
          <div className="muted">Gas: {est.gas}</div>
        </div>
      )}

      {result && (
        <div className="card" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.25)' }}>
          <div style={{ fontWeight: 700 }}>Transaction Submitted</div>
          <div className="muted">Tx Hash: <code>{String(result.txHash).slice(0, 10)}…{String(result.txHash).slice(-6)}</code></div>
          <div className="muted">Block Height (latest): {result.height}</div>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" onClick={handleEstimate}>Estimate</button>
        <button className="btn btn-primary" onClick={handlePrimarySend} disabled={submitting}>Send</button>
      </div>

      {openConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 60 }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', display: 'grid', gap: 10 }}>
            <h3 style={{ margin: 0 }}>Confirm Transaction</h3>
            <div className="muted">You are sending</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{amount}</div>
              <div className="muted">{token === 'native' ? 'DYL' : token}</div>
            </div>
            <div className="muted">To <code style={{ wordBreak: 'break-all' }}>{to || '—'}</code></div>
            {est && (
              <div className="card" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
                <div className="muted">Estimated Fee: {est.fee} • Gas: {est.gas}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setOpenConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleConfirmSend} disabled={submitting}>Confirm & Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
