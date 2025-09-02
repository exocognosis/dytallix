import React, { useEffect, useState } from 'react'
import Card from '../components/common/Card.jsx'
import { getCosmosConfig } from '../config/cosmos.js'

export default function ContractsStub() {
  const [status, setStatus] = useState('checking')
  const [detail, setDetail] = useState('')
  const rpc = getCosmosConfig().rpcUrl

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${rpc}/api/contract/call`, { method: 'GET' })
        if (r.status === 501) {
          setStatus('not-implemented')
        } else {
          setStatus('stub')
          setDetail(`RPC responded ${r.status}`)
        }
      } catch (e) {
        setStatus('stub')
        setDetail(e.message)
      }
    })()
  }, [rpc])

  return (
    <div className="p-6">
      <Card title="Smart Contracts (Coming Soon)">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {status === 'not-implemented' ? (
            <>Contracts API is not yet available (RPC returned 501). Follow progress in the Contracts roadmap.</>
          ) : (
            <>Contracts module is under development. {detail && `(${detail})`}</>
          )}
        </p>
        <a className="text-blue-600" href="/docs/contracts/ROADMAP" target="_blank" rel="noreferrer">View Contracts Roadmap</a>
      </Card>
    </div>
  )
}

