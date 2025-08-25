import React, { useState, useEffect } from 'react'
import Card from '../../components/common/Card.jsx'
import { useToaster } from '../../components/common/Toaster.jsx'
import { contractsService } from '../../services/contracts/index.js'

const ContractQuery = () => {
  const [contracts, setContracts] = useState([])
  const [selectedContract, setSelectedContract] = useState('')
  const [method, setMethod] = useState('')
  const [args, setArgs] = useState('{}')
  const [querying, setQuerying] = useState(false)
  const [queryResult, setQueryResult] = useState(null)
  const { error: showError } = useToaster()

  useEffect(() => {
    loadContracts()
  }, [])

  const loadContracts = async () => {
    try {
      const result = await contractsService.listContracts({ limit: 50 })
      setContracts(result.contracts || [])
    } catch (err) {
      console.error('Failed to load contracts:', err)
    }
  }

  const validateArgs = () => {
    try {
      JSON.parse(args)
      return true
    } catch {
      showError('Invalid JSON in query arguments')
      return false
    }
  }

  const handleQuery = async () => {
    if (!selectedContract || !method) {
      showError('Please select contract and method')
      return
    }

    if (!validateArgs()) return

    try {
      setQuerying(true)
      const result = await contractsService.query(
        selectedContract,
        method,
        JSON.parse(args)
      )
      
      setQueryResult({
        method,
        args: JSON.parse(args),
        result,
        timestamp: new Date().toISOString()
      })
      
    } catch (err) {
      showError('Contract query failed', { details: err.message })
    } finally {
      setQuerying(false)
    }
  }

  const formatJsonResult = (data) => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  const contractOptions = contracts.map(contract => ({
    value: contract.address,
    label: `${contract.label || contract.address.slice(0, 20)}... (${contract.creator?.slice(0, 10)}...)`
  }))

  return (
    <div className="space-y-6">
      <Card 
        title="Query Contract State"
        subtitle="Read data from smart contracts without modifying state"
      >
        <div className="space-y-6">
          {/* Contract Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Contract
            </label>
            <select
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Choose a contract...</option>
              {contractOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-gray-500">
              {contracts.length} contracts available
            </div>
          </div>

          {selectedContract && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm">
                <div className="font-medium text-gray-700 dark:text-gray-300">
                  Querying Contract:
                </div>
                <div className="font-mono text-gray-900 dark:text-gray-100 break-all">
                  {selectedContract}
                </div>
              </div>
            </div>
          )}

          {/* Method Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Query Method
            </label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="get_balance, get_info, get_config..."
            />
            <div className="mt-1 text-xs text-gray-500">
              Read-only method name for querying contract state
            </div>
          </div>

          {/* Query Arguments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Query Arguments (JSON)
            </label>
            <textarea
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
              placeholder='{"address": "dyt1...", "denom": "DGT"}'
            />
            <div className="mt-1 text-xs text-gray-500">
              JSON object with query parameters (use {} for no parameters)
            </div>
          </div>

          {/* Common Query Examples */}
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Common Query Examples:
            </div>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
              <div><span className="font-mono">get_config</span> - Get contract configuration</div>
              <div><span className="font-mono">get_balance</span> - Get token balance for address</div>
              <div><span className="font-mono">get_total_supply</span> - Get total token supply</div>
              <div><span className="font-mono">get_minter</span> - Get minter information</div>
            </div>
          </div>

          {/* Query Button */}
          <button
            onClick={handleQuery}
            disabled={querying || !selectedContract || !method}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {querying ? 'Querying Contract...' : 'Query Contract'}
          </button>
        </div>
      </Card>

      {/* Query Result */}
      {queryResult && (
        <Card 
          title="Query Result" 
          subtitle={`${queryResult.method} - ${new Date(queryResult.timestamp).toLocaleString()}`}
        >
          <div className="space-y-4">
            {/* Query Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Method
                </div>
                <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {queryResult.method}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Arguments
                </div>
                <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {JSON.stringify(queryResult.args)}
                </div>
              </div>
            </div>

            {/* Result Data with Syntax Highlighting */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Result Data
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(formatJsonResult(queryResult.result))}
                  className="text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded"
                >
                  Copy
                </button>
              </div>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm whitespace-pre-wrap">
                  <code>{formatJsonResult(queryResult.result)}</code>
                </pre>
              </div>
            </div>

            {/* Result Summary */}
            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
              <div className="text-sm">
                <div className="font-medium text-green-900 dark:text-green-100 mb-1">
                  Query Summary
                </div>
                <div className="text-green-700 dark:text-green-300 space-y-1">
                  <div>✓ Query executed successfully</div>
                  <div>✓ No gas fees charged for read-only operations</div>
                  <div>✓ Result data retrieved and formatted</div>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => window.open(`/contracts/${selectedContract}`, '_blank')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                View Contract Details
              </button>
              <button
                onClick={handleQuery}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Re-run Query
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default ContractQuery