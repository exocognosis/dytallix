import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../../components/common/Card.jsx'
import { useToaster } from '../../components/common/Toaster.jsx'
import { governanceService } from '../../services/governance/index.js'
import { useWallet } from '../../hooks/useWallet.js'

const GovernanceDetail = () => {
  const { proposalId } = useParams()
  const [proposal, setProposal] = useState(null)
  const [tally, setTally] = useState(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [selectedVote, setSelectedVote] = useState('')
  const { wallet, status } = useWallet()
  const { success, error: showError, loading: showLoading } = useToaster()

  useEffect(() => {
    loadProposal()
  }, [proposalId])

  useEffect(() => {
    if (!proposal) return
    
    // Subscribe to live tally updates
    const unsubscribe = governanceService.subscribeTallies(proposalId, (newTally) => {
      setTally(newTally)
    })
    
    return unsubscribe
  }, [proposal, proposalId])

  const loadProposal = async () => {
    try {
      setLoading(true)
      const [proposalData, tallyData] = await Promise.all([
        governanceService.getProposal(proposalId),
        governanceService.getProposalTally(proposalId)
      ])
      
      setProposal(proposalData)
      setTally(tallyData)
    } catch (err) {
      showError('Failed to load proposal details', { details: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async () => {
    if (!selectedVote || !wallet?.address) return
    
    try {
      setVoting(true)
      const loadingToast = showLoading('Submitting vote...')
      
      const result = await governanceService.submitVote(
        proposalId, 
        selectedVote, 
        wallet.address
      )
      
      success('Vote submitted successfully!', { 
        details: `Transaction: ${result.txHash}` 
      })
      
      // Refresh tally after vote
      setTimeout(() => {
        governanceService.getProposalTally(proposalId).then(setTally)
      }, 2000)
      
    } catch (err) {
      showError('Failed to submit vote', { details: err.message })
    } finally {
      setVoting(false)
    }
  }

  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active Voting' },
      passed: { color: 'bg-blue-100 text-blue-800', label: 'Passed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      failed: { color: 'bg-gray-100 text-gray-800', label: 'Failed' },
      deposit_period: { color: 'bg-yellow-100 text-yellow-800', label: 'Deposit Period' }
    }
    
    const { color, label } = config[status] || config.active
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>{label}</span>
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderTallyChart = () => {
    if (!tally) return null
    
    const total = (tally.yes || 0) + (tally.no || 0) + (tally.abstain || 0) + (tally.no_with_veto || 0)
    if (total === 0) return <div className="text-gray-500">No votes yet</div>
    
    const percentages = {
      yes: ((tally.yes || 0) / total * 100),
      no: ((tally.no || 0) / total * 100),
      abstain: ((tally.abstain || 0) / total * 100),
      no_with_veto: ((tally.no_with_veto || 0) / total * 100)
    }
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {percentages.yes.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              Yes ({(tally.yes || 0).toLocaleString()})
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {percentages.no.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              No ({(tally.no || 0).toLocaleString()})
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {percentages.abstain.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              Abstain ({(tally.abstain || 0).toLocaleString()})
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {percentages.no_with_veto.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500">
              Veto ({(tally.no_with_veto || 0).toLocaleString()})
            </div>
          </div>
        </div>
        
        {/* Visual progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div className="flex h-full">
            <div 
              className="bg-green-500" 
              style={{ width: `${percentages.yes}%` }}
            />
            <div 
              className="bg-red-500" 
              style={{ width: `${percentages.no}%` }}
            />
            <div 
              className="bg-gray-400" 
              style={{ width: `${percentages.abstain}%` }}
            />
            <div 
              className="bg-orange-500" 
              style={{ width: `${percentages.no_with_veto}%` }}
            />
          </div>
        </div>
        
        <div className="text-center text-gray-600">
          Total Votes: {total.toLocaleString()}
        </div>
      </div>
    )
  }

  const renderVotingPanel = () => {
    if (!wallet?.address || status !== 'unlocked') {
      return (
        <Card title="Vote on Proposal">
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              Connect your wallet to vote on this proposal
            </div>
            <Link 
              to="/wallet"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Connect Wallet
            </Link>
          </div>
        </Card>
      )
    }
    
    if (proposal?.status !== 'active') {
      return (
        <Card title="Voting Closed">
          <div className="text-center py-8 text-gray-500">
            Voting period has ended for this proposal
          </div>
        </Card>
      )
    }
    
    return (
      <Card title="Cast Your Vote">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: 'yes', label: 'Yes', color: 'green' },
              { value: 'no', label: 'No', color: 'red' },
              { value: 'abstain', label: 'Abstain', color: 'gray' },
              { value: 'no_with_veto', label: 'No with Veto', color: 'orange' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedVote(option.value)}
                className={`p-4 border rounded-lg text-center transition-all ${
                  selectedVote === option.value
                    ? `border-${option.color}-500 bg-${option.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{option.label}</div>
              </button>
            ))}
          </div>
          
          {selectedVote && (
            <div className="mt-6">
              <button
                onClick={handleVote}
                disabled={voting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {voting ? 'Submitting Vote...' : `Vote ${selectedVote.replace('_', ' ').toUpperCase()}`}
              </button>
            </div>
          )}
          
          <div className="text-xs text-gray-500 text-center">
            Voting from: {wallet.address.slice(0, 20)}...
          </div>
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Proposal not found</div>
          <Link 
            to="/governance"
            className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Governance
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link 
            to="/governance"
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
          >
            ← Back to Governance
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Proposal #{proposal.id}
          </h1>
        </div>
        {getStatusBadge(proposal.status)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title={proposal.title}>
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {proposal.description}
              </div>
            </div>
          </Card>

          <Card title="Current Tally" subtitle="Live updates every 5 seconds">
            {renderTallyChart()}
          </Card>

          {proposal.metadata?.execution_log && (
            <Card title="Execution Log">
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                <pre>{JSON.stringify(proposal.metadata.execution_log, null, 2)}</pre>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {renderVotingPanel()}
          
          <Card title="Proposal Details">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Proposal ID:</span>
                <span className="font-medium">#{proposal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Type:</span>
                <span className="font-medium">{proposal.type || 'Text'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Submitter:</span>
                <span className="font-mono text-xs">{proposal.submitter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Submit Time:</span>
                <span>{formatDate(proposal.submit_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Voting Start:</span>
                <span>{formatDate(proposal.voting_start)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Voting End:</span>
                <span>{formatDate(proposal.voting_end)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default GovernanceDetail