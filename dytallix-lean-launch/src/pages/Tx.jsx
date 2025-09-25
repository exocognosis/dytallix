import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card.jsx'
import AiRiskBadge from '../components/AiRiskBadge.jsx'

export default function TxPage() {
  const { hash } = useParams()
  const [tx, setTx] = useState(null)
  const [error, setError] = useState(null)
  const [risk, setRisk] = useState({ status: 'loading', score: null, label: undefined, latencyMs: undefined, model: undefined })

  useEffect(() => {
    let cancelled = false
    setError(null)
    setTx(null)
    ;(async () => {
      try {
        // Prefer backend which normalizes responses
        const r = await fetch(`/api/transactions/${encodeURIComponent(hash)}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        if (!cancelled) setTx(j)
      } catch (e) {
        if (!cancelled) {
          setError('Load failed')
          // Graceful fallback so the page renders context and risk badge
          setTx({ hash, status: 'unknown', block_height: null, pqc_algorithm: 'Dilithium' })
        }
      }
    })()
    return () => { cancelled = true }
  }, [hash])

  // Fetch AI risk from server adapter (best-effort)
  useEffect(() => {
    let mounted = true
    setRisk({ status: 'loading', score: null, label: undefined, latencyMs: undefined, model: undefined })
    const t0 = Date.now()
    ;(async () => {
      try {
        const res = await fetch(`/api/ai/risk/transaction/${encodeURIComponent(hash)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = await res.json()
        if (!mounted) return
        const score = typeof d.score === 'number' ? d.score : (typeof d.ai_risk_score === 'number' ? d.ai_risk_score : null)
        const label = d.label || d.level || undefined
        const model = d.model || d.ai_risk_model || d.ai_model_id || undefined
        const riskStatus = d.risk_status === 'unavailable' ? 'unavailable' : 'ok'
        setRisk({ status: riskStatus, score, label, latencyMs: Date.now() - t0, model })
      } catch (_) {
        if (mounted) setRisk({ status: 'unavailable', score: null, label: undefined, latencyMs: Date.now() - t0 })
      }
    })()
    return () => { mounted = false }
  }, [hash])

  return (
    <div className="p-6 space-y-6">
      <Card title={`Transaction ${hash?.slice(0, 12)}…`} actions={<AiRiskBadge score={risk.score} label={risk.label} status={risk.status} latencyMs={risk.latencyMs} /> }>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!tx ? <div className="text-sm text-gray-500">Loading…</div> : (
          <div className="space-y-2 text-sm">
            <div><span className="font-semibold">Status:</span> {tx.status || 'pending'}</div>
            <div><span className="font-semibold">Block:</span> {tx.block_height ? (<Link className="text-blue-600" to={`/block/${tx.block_height}`}>{tx.block_height}</Link>) : '—'}</div>
            <div><span className="font-semibold">PQC:</span> {tx.pqc_algorithm || 'Dilithium'}</div>
            {typeof tx.fee !== 'undefined' && (
              <div><span className="font-semibold">Fee:</span> {tx.fee} <span className="text-xs text-gray-500">uDGT</span></div>
            )}
            <pre className="mt-4 text-xs overflow-auto">{JSON.stringify(tx, null, 2)}</pre>
          </div>
        )}
      </Card>
    </div>
  )
}
