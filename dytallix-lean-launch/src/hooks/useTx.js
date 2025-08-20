import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { connectWS } from '../lib/ws.js'
import * as PQC from '../crypto/pqc/pqc.ts'

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
    const skB64 = getSecret?.()
    if (!skB64) throw new Error('Locked')
    const msg = encoder.encode(JSON.stringify(payload))
    // Decode base64 secret key; adapter expects Uint8Array secret key; fallback if facade signature API differs.
    const sk = Uint8Array.from(atob(skB64), c => c.charCodeAt(0))
    // For simplicity assume Dilithium (wallet.algo) sign via PQC facade once implemented; placeholder base64 output
    const sig = await PQC.sign(wallet.algo, sk, msg)
    const sigB64 = btoa(String.fromCharCode(...sig))
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
