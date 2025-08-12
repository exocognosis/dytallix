import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { connectWS } from '../lib/ws.js'

const TOKENS = {
  native: { symbol: 'DYL', decimals: 6 },
  DGT: { symbol: 'DGT', decimals: 6 },
  DRT: { symbol: 'DRT', decimals: 6 },
}

export function useBalances(address) {
  const [balances, setBalances] = useState({ native: '0', DGT: '0', DRT: '0' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!address) return
    setLoading(true); setError('')
    try {
      const res = await api(`/api/balances/${address}`)
      setBalances({ native: String(res.native || '0'), DGT: String(res.DGT || '0'), DRT: String(res.DRT || '0') })
    } catch (e) { setError(e.message || 'Failed to load balances') }
    finally { setLoading(false) }
  }, [address])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    if (!address) return
    const ws = connectWS(`/balances?address=${encodeURIComponent(address)}`)
    if (!ws) return
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data?.type === 'balance_update' && data.address === address) {
          setBalances((b) => ({ ...b, ...(data.balances || {}) }))
        }
      } catch {}
    }
    return () => ws.close()
  }, [address])

  return { balances, tokens: TOKENS, loading, error, refresh }
}
