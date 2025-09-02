import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../components/common/Card.jsx'
import OracleBadge from '../components/OracleBadge.jsx'
import { getCosmosConfig } from '../config/cosmos.js'

export default function BlockPage() {
  const { id } = useParams()
  const [block, setBlock] = useState(null)
  const [error, setError] = useState(null)
  const rpc = getCosmosConfig().rpcUrl

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${rpc}/block/${id}`)
        if (!r.ok) throw new Error(`RPC ${r.status}`)
        const j = await r.json()
        setBlock(j)
      } catch (e) { setError(e.message) }
    })()
  }, [rpc, id])

  return (
    <div className="p-6 space-y-6">
      <Card title={`Block ${id}`}>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!block ? <div className="text-sm text-gray-500">Loading…</div> : (
          <div className="space-y-2 text-sm">
            <div><span className="font-semibold">Hash:</span> <code>{block.hash}</code></div>
            <div><span className="font-semibold">Txs:</span></div>
            <ul className="list-disc list-inside">
              {(block.txs || []).map(h => (
                <li key={h}><Link className="text-blue-600" to={`/tx/${h}`}>{h.slice(0, 18)}…</Link> <OracleBadge verified={false} /></li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  )
}

