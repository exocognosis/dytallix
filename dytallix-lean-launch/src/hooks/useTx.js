import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { connectWS } from '../lib/ws.js'
import { _util } from '../lib/crypto/pqc.js'
import { sign as pqcSign } from '../lib/crypto/pqc.js'

export function useTx({ wallet, getSecret }) {
  const [status, setStatus] = useState('idle')
  const [lastHash, setLastHash] = useState('')
  const [error, setError] = useState('')

  const estimate = useCallback(async (payload) => {
    const res = await api('/api/tx/estimate', { method: 'POST', body: JSON.stringify(payload) })
    return res
  }, [])

  const sign = useCallback(async (payload) => {
    const skB64 = getSecret?.()
    if (!skB64) throw new Error('Locked')
    const msg = _util.enc.encode(JSON.stringify(payload))
    const sigB64 = await pqcSign(wallet.algo, skB64, msg)
    return { payload, from: wallet.address, pubkey: wallet.publicKey, algo: wallet.algo, signature: sigB64 }
  }, [wallet, getSecret])

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
    let stopped = false
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
    return () => { try { ws?.close() } catch {} ; stopped = true }
  }, [])

  return { estimate, sign, submit, track, status, lastHash, error }
}
