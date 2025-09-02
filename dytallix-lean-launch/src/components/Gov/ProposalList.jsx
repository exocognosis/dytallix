import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../common/Card.jsx'
import Table from '../common/Table.jsx'
import { getCosmosConfig } from '../../config/cosmos.js'

export default function ProposalList() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const rpc = getCosmosConfig().rpcUrl

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const r = await fetch(`${rpc}/api/governance/proposals`)
        if (!r.ok) throw new Error(`RPC ${r.status}`)
        const j = await r.json()
        setProposals(j.proposals || [])
      } catch (e) {
        setError(e.message)
      } finally { setLoading(false) }
    })()
  }, [rpc])

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '' }
  ]

  const rows = proposals.map(p => ({
    id: p.id,
    title: p.title,
    status: (p.status || '').toString(),
    actions: () => <Link className="text-blue-600" to={`/governance/${p.id}`}>View</Link>
  }))

  return (
    <Card title="Governance Proposals" subtitle="Read-only governance view">
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <Table columns={columns} rows={rows} emptyLabel="No proposals" />
      )}
    </Card>
  )
}

