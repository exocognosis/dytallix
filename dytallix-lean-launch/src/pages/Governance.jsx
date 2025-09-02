import React from 'react'
import { useParams } from 'react-router-dom'
import ProposalList from '../components/Gov/ProposalList.jsx'
import ProposalDetail from '../components/Gov/ProposalDetail.jsx'

export default function Governance() {
  const { proposalId } = useParams()
  return (
    <div className="p-6 space-y-6">
      {!proposalId && <ProposalList />}
      {proposalId && <ProposalDetail proposalId={proposalId} />}
    </div>
  )
}

