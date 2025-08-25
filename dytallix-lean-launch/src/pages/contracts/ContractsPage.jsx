import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Card from '../../components/common/Card.jsx'
import Table from '../../components/common/Table.jsx'
import ContractDeploy from '../../components/contracts/ContractDeploy.jsx'
import ContractExecute from '../../components/contracts/ContractExecute.jsx'
import ContractQuery from '../../components/contracts/ContractQuery.jsx'
import { contractsService } from '../../services/contracts/index.js'

const ContractsPage = () => {
  const [activeTab, setActiveTab] = useState('deploy')
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalContracts: 0,
    recentDeployments: 0,
    activeContracts: 0
  })

  useEffect(() => {
    loadContracts()
  }, [])

  const loadContracts = async () => {
    try {
      setLoading(true)
      const result = await contractsService.listContracts({ limit: 10 })
      setContracts(result.contracts || [])
      setStats({
        totalContracts: result.total || 0,
        recentDeployments: result.recentDeployments || 0,
        activeContracts: result.activeContracts || 0
      })
    } catch (err) {
      console.error('Failed to load contracts:', err)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'deploy', label: 'Deploy', icon: '📦' },
    { id: 'execute', label: 'Execute', icon: '⚡' },
    { id: 'query', label: 'Query', icon: '🔍' },
    { id: 'list', label: 'Browse', icon: '📋' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'deploy':
        return <ContractDeploy />
      case 'execute':
        return <ContractExecute />
      case 'query':
        return <ContractQuery />
      case 'list':
        return <ContractsList contracts={contracts} loading={loading} onRefresh={loadContracts} />
      default:
        return <ContractDeploy />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Smart Contracts
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Deploy, execute, and query WebAssembly smart contracts
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={loadContracts}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalContracts}
            </div>
            <div className="text-sm text-gray-500">Total Contracts</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.activeContracts}
            </div>
            <div className="text-sm text-gray-500">Active Contracts</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.recentDeployments}
            </div>
            <div className="text-sm text-gray-500">Recent Deployments</div>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  )
}

// Contracts List Component
const ContractsList = ({ contracts, loading, onRefresh }) => {
  const columns = [
    {
      key: 'address',
      label: 'Contract Address',
      align: 'left'
    },
    {
      key: 'creator',
      label: 'Creator',
      align: 'left'
    },
    {
      key: 'codeHash',
      label: 'Code Hash',
      align: 'left'
    },
    {
      key: 'lastActivity',
      label: 'Last Activity',
      align: 'right'
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right'
    }
  ]

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const rows = contracts.map(contract => ({
    address: () => (
      <Link 
        to={`/contracts/${contract.address}`}
        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
      >
        {contract.address.slice(0, 20)}...
      </Link>
    ),
    creator: () => (
      <Link 
        to={`/accounts/${contract.creator}`}
        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
      >
        {contract.creator?.slice(0, 15)}...
      </Link>
    ),
    codeHash: () => (
      <span className="font-mono text-sm text-gray-600">
        {contract.codeHash?.slice(0, 15)}...
      </span>
    ),
    lastActivity: formatDate(contract.lastExecutionTime),
    actions: () => (
      <div className="flex space-x-2">
        <Link
          to={`/contracts/${contract.address}`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          View
        </Link>
        <button
          onClick={() => {
            // Set contract for execute tab
            window.localStorage.setItem('selectedContract', contract.address)
            // Switch to execute tab could be handled by parent
          }}
          className="text-green-600 hover:text-green-800 text-sm"
        >
          Execute
        </button>
      </div>
    )
  }))

  if (loading) {
    return (
      <Card title="Contract List">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card 
      title="Recent Contracts"
      actions={
        <button
          onClick={onRefresh}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Refresh
        </button>
      }
    >
      <Table
        columns={columns}
        rows={rows}
        emptyLabel="No contracts deployed yet"
        responsive={true}
      />
      
      {contracts.length > 0 && (
        <div className="mt-4 text-center">
          <Link
            to="/contracts/all"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            View all contracts →
          </Link>
        </div>
      )}
    </Card>
  )
}

export default ContractsPage