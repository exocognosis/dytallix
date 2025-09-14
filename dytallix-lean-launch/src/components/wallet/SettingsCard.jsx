import React, { useState } from 'react'

export default function SettingsCard({ onExport, onChangePassword, onForget }) {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const handleChange = async () => {
    setErr(''); setMsg('')
    try { await onChangePassword(oldPw, newPw); setMsg('Password changed.'); setOldPw(''); setNewPw('') } catch (e) { setErr(e.message) }
  }

  return (
    <div className="card" style={{ display: 'grid', gap: 12, borderTop: '3px solid var(--primary-400)', paddingTop: 20 }}>
      <h3 style={{ margin: 0, color: 'var(--primary-400)' }}>Settings</h3>
      {msg && <div className="card" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.32)' }}>{msg}</div>}
      {err && <div className="card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.35)' }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div className="muted">Old password</div>
          <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)' }} />
        </div>
        <div>
          <div className="muted">New password</div>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid rgba(148,163,184,0.35)' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn" onClick={handleChange} disabled={!oldPw || !newPw}>Change password</button>
        <button className="btn" onClick={onExport}>Export keystore</button>
        <button className="btn" onClick={onForget} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#ef4444' }}>Forget from device</button>
      </div>
    </div>
  )
}
