import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { connectWS } from '../lib/ws.js'
// Use JS compatibility layer so tests can mock easily
import * as PQC from '../lib/crypto/pqc.js'

export function useTx({ wallet, getSecret }) {
  const [status, setStatus] = useState('idle')
  const [lastHash, setLastHash] = useState('')
  const [error, setError] = useState('')

  const encoder = new TextEncoder()

  const estimate = useCallback(async (payload) => {
    const res = await api('/api/tx/estimate', { method: 'POST', body: JSON.stringify(payload) })
    return res
  }, [])

  const sign = useCallback(async (payload) => {
    const skAny = getSecret?.()
    if (!skAny) throw new Error('Locked')
    const msg = encoder.encode(JSON.stringify(payload))
    let sk
    try {
      sk = Uint8Array.from(atob(skAny), c => c.charCodeAt(0))
    } catch {
      // Fallback for test mocks that provide non-base64 strings
      sk = encoder.encode(String(skAny))
    }
    const sigAny = await PQC.sign(wallet.algo, sk, msg)
    const sigB64 = typeof sigAny === 'string' ? sigAny : btoa(String.fromCharCode(...sigAny))
    return { payload, from: wallet.address, pubkey: wallet.publicKey, algo: wallet.algo, signature: sigB64 }
  }, [wallet, getSecret, encoder])

  const submit = useCallback(async (signed) => {
    setStatus('submitting'); setError('')
    try {
      const res = await api('/api/tx/submit', { method: 'POST', body: JSON.stringify(signed) })
      setLastHash(res.txHash)
      setStatus('submitted')
      return res
    } catch (e) { setError(e.message || 'Submit failed'); setStatus('idle'); throw e }
  }, [])

  const track = useCallback((hash, onUpdate) => {
    if (!hash) return () => {}
    ;(async () => {
      try {
        const first = await api(`/api/tx/${hash}`)
        onUpdate?.(first)
      } catch {}
    })()
    const ws = connectWS(`/tx?hash=${encodeURIComponent(hash)}`)
    if (ws) {
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
            if (data?.type === 'tx_status' && data.hash === hash) onUpdate?.(data)
        } catch {}
      }
    }
    return () => { try { ws?.close() } catch {} }
  }, [])

  return { estimate, sign, submit, track, status, lastHash, error }
}
