import React, { useState, useEffect } from 'react'
import Card from '../../components/common/Card.jsx'
import { useToaster } from '../../components/common/Toaster.jsx'
import { contractsService } from '../../services/contracts/index.js'
import { useWallet } from '../../hooks/useWallet.js'
import GasTag from '../../components/common/GasTag.jsx'

const ContractExecute = () => {
  const [contracts, setContracts] = useState([])
  const [selectedContract, setSelectedContract] = useState('')
  const [method, setMethod] = useState('')
  const [args, setArgs] = useState('{}')
  const [executing, setExecuting] = useState(false)
  const [gasEstimate, setGasEstimate] = useState(null)
  const [executeResult, setExecuteResult] = useState(null)
  const { wallet, status } = useWallet()
  const { success, error: showError, loading: showLoading } = useToaster()

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
      showError('Invalid JSON in method arguments')
      return false
    }
  }

  const estimateGas = async () => {
    if (!selectedContract || !method || !wallet?.address) return

    if (!validateArgs()) return

    try {
      const estimate = await contractsService.estimateGas(
        selectedContract,
        method,
        JSON.parse(args),
        wallet.address
      )
      setGasEstimate(estimate)
    } catch (err) {
      console.error('Gas estimation failed:', err)
      setGasEstimate(null)
    }
  }

  useEffect(() => {
    if (selectedContract && method && args) {
      const debounce = setTimeout(estimateGas, 500)
      return () => clearTimeout(debounce)
    }
  }, [selectedContract, method, args, wallet?.address])

  const handleExecute = async () => {
    if (!selectedContract || !method) {
      showError('Please select contract and method')
      return
    }

    if (!validateArgs()) return

    if (!wallet?.address || status !== 'unlocked') {
      showError('Please connect and unlock your wallet')
      return
    }

    try {
      setExecuting(true)
      const loadingToast = showLoading('Executing contract method...')
      
      const options = gasEstimate ? {
        gas: gasEstimate.gas,
        fee: gasEstimate.fee
      } : {}

      const result = await contractsService.execute(
        selectedContract,
        method,
        JSON.parse(args),
        wallet.address,
        options
      )
      
      setExecuteResult(result)
      success('Contract execution successful!', {
        details: `Transaction: ${result.txHash}`
      })
      
    } catch (err) {
      showError('Contract execution failed', { details: err.message })
    } finally {
      setExecuting(false)
    }
  }

  const contractOptions = contracts.map(contract => ({
    value: contract.address,
    label: `${contract.label || contract.address.slice(0, 20)}... (${contract.creator?.slice(0, 10)}...)`
  }))

  return (
    <div className="space-y-6">
      <Card 
        title="Execute Contract Method"
        subtitle="Call a method on an existing smart contract"
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
                  Selected Contract:
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
              Method Name
            </label>
            <input
              type="text"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="increment, transfer, execute_proposal..."
            />
          </div>

          {/* Method Arguments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Method Arguments (JSON)
            </label>
            <textarea
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
              placeholder='{"amount": "1000", "recipient": "dyt1..."}'
            />
            <div className="mt-1 text-xs text-gray-500">
              JSON object with method parameters
            </div>
          </div>

          {/* Gas Estimation */}
          {gasEstimate && (
            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Gas Estimation
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    Estimated cost for this transaction
                  </div>
                </div>
                <GasTag gasUsed={gasEstimate.gas} gasLimit={gasEstimate.gasLimit} />
              </div>
              {gasEstimate.fee && (
                <div className="mt-2 text-sm text-blue-800 dark:text-blue-200">
                  Estimated Fee: {gasEstimate.fee.amount} {gasEstimate.fee.denom}
                </div>
              )}
            </div>
          )}

          {/* Wallet Info */}
          {wallet?.address && status === 'unlocked' ? (
            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
              <div className="text-sm">
                <div className="font-medium text-green-900 dark:text-green-100">
                  Executing from:
                </div>
                <div className="font-mono text-green-700 dark:text-green-300">
                  {wallet.address}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                Please connect and unlock your wallet to execute contract methods
              </div>
            </div>
          )}

          {/* Execute Button */}
          <button
            onClick={handleExecute}
            disabled={executing || !selectedContract || !method || !wallet?.address || status !== 'unlocked'}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {executing ? 'Executing Method...' : 'Execute Method'}
          </button>
        </div>
      </Card>

      {/* Execution Result */}
      {executeResult && (
        <Card title="Execution Successful" className="border-green-200 bg-green-50 dark:bg-green-900">
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Transaction Hash
              </div>
              <div className="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                {executeResult.txHash}
              </div>
            </div>

            {executeResult.events && executeResult.events.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Events
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded border">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(executeResult.events, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {executeResult.gasUsed && (
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Gas Used
                </div>
                <GasTag gasUsed={executeResult.gasUsed} gasLimit={executeResult.gasLimit} />
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => window.open(`/explorer/tx/${executeResult.txHash}`, '_blank')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                View Transaction
              </button>
              <button
                onClick={() => window.open(`/contracts/${selectedContract}`, '_blank')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                View Contract
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default ContractExecute