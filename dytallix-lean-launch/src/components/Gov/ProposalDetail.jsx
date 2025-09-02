import React, { useEffect, useState } from 'react'
import Card from '../common/Card.jsx'
import { getCosmosConfig } from '../../config/cosmos.js'

export default function ProposalDetail({ proposalId }) {
  const [data, setData] = useState(null)
  const [tally, setTally] = useState(null)
  const [params, setParams] = useState(null)
  const [error, setError] = useState(null)
  const rpc = getCosmosConfig().rpcUrl

  useEffect(() => {
    (async () => {
      try {
        const [p, t, cfg] = await Promise.all([
          fetch(`${rpc}/gov/proposal/${proposalId}`),
          fetch(`${rpc}/gov/tally/${proposalId}`),
          fetch(`${rpc}/gov/config`)
        ])
        if (!p.ok) throw new Error(`proposal ${p.status}`)
        if (!t.ok) throw new Error(`tally ${t.status}`)
        const pj = await p.json()
        const tj = await t.json()
        let cfgj = null
        if (cfg.ok) cfgj = await cfg.json()
        setData(pj)
        setTally(tj)
        setParams(cfgj)
      } catch (e) { setError(e.message) }
    })()
  }, [rpc, proposalId])

  return (
    <div className="space-y-4">
      <Card title={`Proposal #${proposalId}`}>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!data ? <div className="text-sm text-gray-500">Loading…</div> : (
          <div className="space-y-2 text-sm">
            <div><span className="font-semibold">Title:</span> {data.title}</div>
            <div><span className="font-semibold">Status:</span> {String(data.status)}</div>
            <div><span className="font-semibold">Description:</span> {data.description}</div>
          </div>
        )}
      </Card>
      <Card title="Current Tally (uDGT)">
        {!tally ? <div className="text-sm text-gray-500">Loading…</div> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>Yes: {tally.yes} uDGT</div>
            <div>No: {tally.no} uDGT</div>
            <div>Abstain: {tally.abstain} uDGT</div>
            <div>Veto: {tally.no_with_veto} uDGT</div>
          </div>
        )}
      </Card>
      <Card title="Governance Parameters">
        {!params ? <div className="text-sm text-gray-500">Loading…</div> : (
          <pre className="text-xs overflow-auto">{JSON.stringify(params, null, 2)}</pre>
        )}
      </Card>
    </div>
  )
}
