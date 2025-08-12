import React, { useEffect, useMemo, useState } from 'react'

export default function SendForm({ wallet, balances, onEstimate, onSignAndSubmit }) {
  const [token, setToken] = useState('native')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [est, setEst] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const max = useMemo(() => BigInt(balances?.[token] || '0'), [balances, token])

  useEffect(() => { setEst(null) }, [token, to, amount])

  const validate = () => {
    if (!to.startsWith('dytallix1') || to.length < 12) return 'Invalid address'
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return 'Invalid amount'
    if (BigInt(Math.floor(Number(amount) * 1_000_000)) > max) return 'Insufficient funds'
    return ''
  }

  const handleEstimate = async () => {
    const v = validate()
    if (v) { setError(v); return }
    setError('')
    const payload = { type: 'transfer', token, to, amount: String(Math.floor(Number(amount) * 1_000_000)), from: wallet.address }
    try {
      const e = await onEstimate(payload)
      setEst(e)
    } catch (err) {
      setError(err.message || 'Estimate failed')
    }
  }

  const handleSubmit = async () => {
    const v = validate(); if (v) { setError(v); return }
    setSubmitting(true); setError('')
    const payload = { type: 'transfer', token, to, amount: String(Math.floor(Number(amount) * 1_000_000)), from: wallet.address }
    try {
      const { txHash } = await onSignAndSubmit(payload)
      setEst(null); setAmount(''); setTo('')
      setError(`Submitted: ${txHash}`)
    } catch (err) { setError(err.message || 'Submit failed') }
    finally { setSubmitting(false) }
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
      <div className="muted">Available: {Number(max)/1_000_000}</div>
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
      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)' }}>{error}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" onClick={handleEstimate}>Estimate</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>Send</button>
      </div>
    </div>
  )
}
