import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card.jsx'
import OracleBadge from '../components/OracleBadge.jsx'
import { getCosmosConfig } from '../config/cosmos.js'

export default function TxPage() {
  const { hash } = useParams()
  const [tx, setTx] = useState(null)
  const [error, setError] = useState(null)
  const rpc = getCosmosConfig().rpcUrl

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${rpc}/tx/${hash}`)
        if (!r.ok) throw new Error(`RPC ${r.status}`)
        const j = await r.json()
        setTx(j)
      } catch (e) { setError(e.message) }
    })()
  }, [rpc, hash])

  return (
    <div className="p-6 space-y-6">
      <Card title={`Transaction ${hash?.slice(0, 12)}…`}>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!tx ? <div className="text-sm text-gray-500">Loading…</div> : (
          <div className="space-y-2 text-sm">
            <div><span className="font-semibold">Status:</span> {tx.status || 'pending'}</div>
            <div><span className="font-semibold">Block:</span> <Link className="text-blue-600" to={`/block/${tx.block_height || 'latest'}`}>{tx.block_height || '—'}</Link></div>
            <div><span className="font-semibold">PQC:</span> {tx.pqc_algorithm || 'Dilithium'}</div>
            {typeof tx.fee !== 'undefined' && (
              <div><span className="font-semibold">Fee:</span> {tx.fee} <span className="text-xs text-gray-500">uDGT</span></div>
            )}
            <OracleBadge verified={!!tx.ai_risk_score} score={tx.ai_risk_score} model={tx.ai_model_id} />
            <pre className="mt-4 text-xs overflow-auto">{JSON.stringify(tx, null, 2)}</pre>
          </div>
        )}
      </Card>
    </div>
  )
}
