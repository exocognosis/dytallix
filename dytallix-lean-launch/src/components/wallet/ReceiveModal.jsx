import React, { useEffect, useRef, useState } from 'react'

export default function ReceiveModal({ address, onClose }) {
  const canvasRef = useRef(null)
  const [qrReady, setQrReady] = useState(false)

  useEffect(() => {
    let mounted = true
    const draw = async () => {
      if (!address || !canvasRef.current) return
      try {
        const QR = await import('qrcode')
        if (!mounted) return
        await QR.toCanvas(canvasRef.current, address, { width: 220, margin: 1, color: { dark: '#0ea5e9', light: '#00000000' } })
        setQrReady(true)
      } catch {
        setQrReady(false)
      }
    }
    draw()
    return () => { mounted = false }
  }, [address])

  if (!address) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div className="card" style={{ maxWidth: 520, width: '100%' }}>
        <h3 style={{ marginTop: 0 }}>Receive</h3>
        <div className="muted">Your Address</div>
        <div className="card" style={{ background: 'rgba(30,41,59,0.4)', borderColor: 'rgba(148,163,184,0.25)' }}>
          <code style={{ wordBreak: 'break-all' }}>{address}</code>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', placeItems: 'center', width: 240, height: 240, background: 'rgba(148,163,184,0.08)', borderRadius: 12, border: '1px solid rgba(148,163,184,0.25)' }}>
            <canvas ref={canvasRef} width={220} height={220} aria-label="QR code" />
          </div>
          <div className="muted" style={{ maxWidth: 280 }}>
            Scan this QR to share your bech32 address quickly. Colors are optimized for dark UI.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn" onClick={() => navigator.clipboard.writeText(address)}>Copy</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
