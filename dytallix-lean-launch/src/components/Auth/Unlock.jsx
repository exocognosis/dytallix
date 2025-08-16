import React, { useEffect, useMemo, useRef, useState } from 'react'
import zxcvbn from 'zxcvbn'

// Simple Unlock/Create component with strength meter and auto-lock
export default function Unlock({ onCreate, onUnlock, onLock, isLocked = true }) {
  const [mode, setMode] = useState('unlock') // 'unlock' | 'create'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [timer, setTimer] = useState(null)

  const score = useMemo(() => (password ? zxcvbn(password).score : 0), [password])

  // auto-lock: 5min inactivity + on tab hidden
  const idleRef = useRef(null)
  useEffect(() => {
    const resetIdle = () => {
      if (idleRef.current) clearTimeout(idleRef.current)
      idleRef.current = setTimeout(() => { try { onLock?.() } catch {} }, 5 * 60 * 1000)
    }
    const onVis = () => { if (document.hidden) { try { onLock?.() } catch {} } else { resetIdle() } }
    window.addEventListener('mousemove', resetIdle)
    window.addEventListener('keydown', resetIdle)
    document.addEventListener('visibilitychange', onVis)
    resetIdle()
    return () => { if (idleRef.current) clearTimeout(idleRef.current); window.removeEventListener('mousemove', resetIdle); window.removeEventListener('keydown', resetIdle); document.removeEventListener('visibilitychange', onVis) }
  }, [onLock])

  const doUnlock = async (e) => {
    e?.preventDefault()
    setError('')
    try { await onUnlock?.(password); setPassword('') } catch (err) { setError(err?.message || 'Unlock failed') }
  }
  const doCreate = async (e) => {
    e?.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (score < 3) { setError('Password too weak'); return }
    try { await onCreate?.(password); setPassword(''); setConfirm(''); setMode('unlock') } catch (err) { setError(err?.message || 'Create failed') }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h3 style={{ marginTop: 0 }}>{mode === 'unlock' ? 'Unlock Wallet' : 'Create Wallet'}</h3>
      {error && <div className="card" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', marginBottom: 8 }}><div style={{ color: '#ef4444', fontWeight: 700 }}>Error</div><div className="muted">{error}</div></div>}
      <form onSubmit={mode === 'unlock' ? doUnlock : doCreate} style={{ display: 'grid', gap: 12 }}>
        <input type="password" className="input" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        {mode === 'create' && (
          <>
            <input type="password" className="input" placeholder="Confirm password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
            <Strength score={score} />
          </>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={()=>setMode(m=>m==='unlock'?'create':'unlock')}>{mode==='unlock'?'Create Wallet':'Back'}</button>
          <button type="submit" className="btn btn-primary">{mode==='unlock'?'Unlock':'Create'}</button>
        </div>
      </form>
    </div>
  )
}

function Strength({ score }) {
  const labels = ['Very weak','Weak','Fair','Good','Strong']
  const colors = ['#ef4444','#f97316','#f59e0b','#16a34a','#16a34a']
  const clamped = Math.max(0, Math.min(4, Number(score||0)))
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
        {Array.from({ length: 5 }).map((_,i)=> (
          <div key={i} style={{ height: 6, borderRadius: 4, background: i<=clamped?colors[clamped]:'rgba(148,163,184,0.25)' }} />
        ))}
      </div>
      <div className="muted" style={{ fontSize: 12 }}>{labels[clamped]}</div>
    </div>
  )
}
