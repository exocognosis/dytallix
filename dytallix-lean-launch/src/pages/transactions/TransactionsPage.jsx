import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/common/Card.jsx'
import Table from '../../components/common/Table.jsx'
import RiskBadge from '../../components/common/RiskBadge.jsx'
import GasTag from '../../components/common/GasTag.jsx'
import Amount from '../../components/common/Amount.jsx'
import { transactionsService } from '../../services/ai/index.js'

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    type: '',
    riskLevel: '',
    address: '',
    limit: 20,
    page: 1
  })
  const [stats, setStats] = useState({
    total: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0
  })

  useEffect(() => {
    loadTransactions()
  }, [filters])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const result = await transactionsService.getTransactions({
        ...filters,
        includeRisk: true
      })
      
      setTransactions(result.data || [])
      
      // Calculate risk stats
      const riskStats = (result.data || []).reduce((acc, tx) => {
        if (tx.risk) {
          acc[`${tx.risk.level}Risk`]++
        }
        return acc
      }, { highRisk: 0, mediumRisk: 0, lowRisk: 0 })
      
      setStats({
        total: result.total || 0,
        ...riskStats
      })
      
    } catch (err) {
      console.error('Failed to load transactions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filtering
    }))
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeIcon = (type) => {
    const icons = {
      'send': '💸',
      'delegate': '🏛️',
      'undelegate': '🔓',
      'vote': '🗳️',
      'contract_execute': '⚡',
      'contract_deploy': '📦',
      'governance': '⚖️',
      'ibc': '🌉'
    }
    return icons[type] || '📄'
  }

  const getStatusBadge = (status) => {
    const config = {
      'success': { color: 'bg-green-100 text-green-800', label: 'Success' },
      'failed': { color: 'bg-red-100 text-red-800', label: 'Failed' },
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' }
    }
    
    const { color, label } = config[status] || config.pending
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{label}</span>
  }

  const columns = [
    {
      key: 'hash',
      label: 'Transaction Hash',
      align: 'left'
    },
    {
      key: 'type',
      label: 'Type',
      align: 'left'
    },
    {
      key: 'from',
      label: 'From',
      align: 'left'
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right'
    },
    {
      key: 'gas',
      label: 'Gas',
      align: 'right'
    },
    {
      key: 'risk',
      label: 'AI Risk',
      align: 'center'
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center'
    },
    {
      key: 'time',
      label: 'Time',
      align: 'right'
    }
  ]

  const rows = transactions.map(tx => ({
    hash: () => (
      <Link 
        to={`/explorer/tx/${tx.hash}`}
        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
      >
        {tx.hash.slice(0, 20)}...
      </Link>
    ),
    type: () => (
      <div className="flex items-center">
        <span className="mr-2">{getTypeIcon(tx.type)}</span>
        <span className="capitalize text-sm">{tx.type.replace('_', ' ')}</span>
      </div>
    ),
    from: () => (
      <Link 
        to={`/accounts/${tx.from}`}
        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
      >
        {tx.from?.slice(0, 15)}...
      </Link>
    ),
    amount: () => tx.amount ? (
      <Amount value={tx.amount.amount} denom={tx.amount.denom} />
    ) : '—',
    gas: () => tx.gasUsed ? (
      <GasTag gasUsed={tx.gasUsed} gasLimit={tx.gasLimit} />
    ) : '—',
    risk: () => tx.risk ? (
      <RiskBadge 
        level={tx.risk.level} 
        score={tx.risk.score} 
        rationale={tx.risk.rationale} 
      />
    ) : '—',
    status: () => getStatusBadge(tx.status),
    time: formatDate(tx.timestamp)
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Transactions
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Browse blockchain transactions with AI risk analysis
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={loadTransactions}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total Transactions</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.lowRisk}
            </div>
            <div className="text-sm text-gray-500">Low Risk</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.mediumRisk}
            </div>
            <div className="text-sm text-gray-500">Medium Risk</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.highRisk}
            </div>
            <div className="text-sm text-gray-500">High Risk</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaction Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Types</option>
              <option value="send">Send</option>
              <option value="delegate">Delegate</option>
              <option value="undelegate">Undelegate</option>
              <option value="vote">Vote</option>
              <option value="contract_execute">Contract Execute</option>
              <option value="contract_deploy">Contract Deploy</option>
              <option value="governance">Governance</option>
              <option value="ibc">IBC Transfer</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Risk Level
            </label>
            <select
              value={filters.riskLevel}
              onChange={(e) => handleFilterChange('riskLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Risk Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <input
              type="text"
              value={filters.address}
              onChange={(e) => handleFilterChange('address', e.target.value)}
              placeholder="dyt1... or 0x..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Results per page
            </label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setFilters({
              type: '',
              riskLevel: '',
              address: '',
              limit: 20,
              page: 1
            })}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card title="Recent Transactions">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              rows={rows}
              emptyLabel="No transactions found"
              responsive={true}
            />
            
            {/* Pagination */}
            {transactions.length === filters.limit && (
              <div className="mt-6 flex justify-between items-center">
                <button
                  onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
                  disabled={filters.page === 1}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {filters.page} • {transactions.length} of {stats.total} transactions
                </span>
                
                <button
                  onClick={() => handleFilterChange('page', filters.page + 1)}
                  disabled={transactions.length < filters.limit}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* AI Risk Information */}
      <Card title="About AI Risk Analysis">
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Our AI system analyzes transactions in real-time to identify potential risks, fraud patterns, and anomalies.
            Risk scores are calculated based on multiple factors including:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Transaction patterns and amounts</li>
            <li>Address reputation and history</li>
            <li>Smart contract interactions</li>
            <li>Network activity correlation</li>
            <li>Known threat indicators</li>
          </ul>
          <p>
            <strong>Note:</strong> Risk assessments are provided as guidance only. 
            Always conduct your own research before interacting with addresses or contracts.
          </p>
        </div>
      </Card>
    </div>
  )
}

export default TransactionsPage