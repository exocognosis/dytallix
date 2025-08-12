import React from 'react'

export default function ReceiveModal({ address, onClose }) {
  if (!address) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%' }}>
        <h3 style={{ marginTop: 0 }}>Receive</h3>
        <div className="muted">Your Address</div>
        <div className="card" style={{ background: 'rgba(30,41,59,0.4)', borderColor: 'rgba(148,163,184,0.25)' }}>
          <code style={{ wordBreak: 'break-all' }}>{address}</code>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn" onClick={() => navigator.clipboard.writeText(address)}>Copy</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
