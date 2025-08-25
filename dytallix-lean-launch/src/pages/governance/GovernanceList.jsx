import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/common/Card.jsx'
import Table from '../../components/common/Table.jsx'
import { useToaster } from '../../components/common/Toaster.jsx'
import { governanceService } from '../../services/governance/index.js'

const GovernanceList = () => {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tallies, setTallies] = useState({})
  const { error: showError } = useToaster()

  useEffect(() => {
    loadProposals()
  }, [])

  const loadProposals = async () => {
    try {
      setLoading(true)
      const result = await governanceService.listProposals()
      setProposals(result.proposals || [])
      
      // Subscribe to live tally updates for active proposals
      const activeProposals = (result.proposals || []).filter(p => p.status === 'active')
      activeProposals.forEach(proposal => {
        const unsubscribe = governanceService.subscribeTallies(proposal.id, (tally) => {
          setTallies(prev => ({ ...prev, [proposal.id]: tally }))
        })
        
        // Cleanup on unmount (stored in component ref if needed for multiple)
        return () => unsubscribe()
      })
      
    } catch (err) {
      setError(err.message)
      showError('Failed to load governance proposals', { details: err.message })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      passed: { color: 'bg-blue-100 text-blue-800', label: 'Passed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      failed: { color: 'bg-gray-100 text-gray-800', label: 'Failed' },
      deposit_period: { color: 'bg-yellow-100 text-yellow-800', label: 'Deposit Period' }
    }
    
    const { color, label } = config[status] || config.active
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTally = (proposal) => {
    const tally = tallies[proposal.id] || proposal.tally
    if (!tally) return '—'
    
    const total = (tally.yes || 0) + (tally.no || 0) + (tally.abstain || 0) + (tally.no_with_veto || 0)
    if (total === 0) return '0 votes'
    
    const yesPercent = ((tally.yes || 0) / total * 100).toFixed(1)
    return (
      <div className="text-sm">
        <div className="font-medium">Yes: {yesPercent}%</div>
        <div className="text-gray-500">Total: {total.toLocaleString()} votes</div>
      </div>
    )
  }

  const columns = [
    {
      key: 'id',
      label: 'ID',
      align: 'left'
    },
    {
      key: 'title',
      label: 'Title',
      align: 'left'
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center'
    },
    {
      key: 'voting_end',
      label: 'End Time',
      align: 'right'
    },
    {
      key: 'tally',
      label: 'Current Tally',
      align: 'right'
    }
  ]

  const rows = proposals.map(proposal => ({
    id: proposal.id,
    title: () => (
      <Link 
        to={`/governance/${proposal.id}`}
        className="text-blue-600 hover:text-blue-800 font-medium"
      >
        {proposal.title}
      </Link>
    ),
    status: () => getStatusBadge(proposal.status),
    voting_end: formatDate(proposal.voting_end),
    tally: () => formatTally(proposal)
  }))

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Governance Proposals
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Participate in network governance by voting on proposals
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link
            to="/governance/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Proposal
          </Link>
          <button
            onClick={loadProposals}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {proposals.filter(p => p.status === 'active').length}
            </div>
            <div className="text-sm text-gray-500">Active Proposals</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {proposals.filter(p => p.status === 'passed').length}
            </div>
            <div className="text-sm text-gray-500">Passed</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {proposals.filter(p => p.status === 'rejected').length}
            </div>
            <div className="text-sm text-gray-500">Rejected</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {proposals.length}
            </div>
            <div className="text-sm text-gray-500">Total Proposals</div>
          </div>
        </Card>
      </div>

      <Card title="All Proposals">
        {error ? (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Error loading proposals</div>
            <div className="text-gray-500 text-sm">{error}</div>
            <button
              onClick={loadProposals}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <Table
            columns={columns}
            rows={rows}
            emptyLabel="No governance proposals found"
            responsive={true}
          />
        )}
      </Card>
    </div>
  )
}

export default GovernanceList