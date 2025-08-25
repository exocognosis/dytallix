import React, { useState } from 'react'
import Card from '../../components/common/Card.jsx'
import { useToaster } from '../../components/common/Toaster.jsx'
import { contractsService } from '../../services/contracts/index.js'
import { useWallet } from '../../hooks/useWallet.js'

const ContractDeploy = () => {
  const [wasmFile, setWasmFile] = useState(null)
  const [initMsg, setInitMsg] = useState('{}')
  const [deploying, setDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState(null)
  const { wallet, status } = useWallet()
  const { success, error: showError, loading: showLoading } = useToaster()

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file
    if (!file.name.endsWith('.wasm')) {
      showError('Invalid file type. Please select a .wasm file')
      return
    }

    const MAX_SIZE = 100 * 1024 // 100KB
    if (file.size > MAX_SIZE) {
      showError(`File too large. Maximum size is ${MAX_SIZE / 1024}KB`)
      return
    }

    setWasmFile(file)
  }

  const validateInitMsg = () => {
    try {
      JSON.parse(initMsg)
      return true
    } catch {
      showError('Invalid JSON in initialization message')
      return false
    }
  }

  const handleDeploy = async () => {
    if (!wasmFile) {
      showError('Please select a WASM file')
      return
    }

    if (!validateInitMsg()) return

    if (!wallet?.address || status !== 'unlocked') {
      showError('Please connect and unlock your wallet')
      return
    }

    try {
      setDeploying(true)
      const loadingToast = showLoading('Deploying contract...')
      
      const result = await contractsService.deployWasm(
        wasmFile,
        JSON.parse(initMsg),
        wallet.address
      )
      
      setDeployResult(result)
      success('Contract deployed successfully!', {
        details: `Contract: ${result.contractAddress}`
      })
      
      // Reset form
      setWasmFile(null)
      setInitMsg('{}')
      
    } catch (err) {
      showError('Contract deployment failed', { details: err.message })
    } finally {
      setDeploying(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card 
        title="Deploy WASM Contract"
        subtitle="Upload and deploy a WebAssembly smart contract"
      >
        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              WASM Binary File
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <label htmlFor="wasm-file" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
                      {wasmFile ? wasmFile.name : 'Select WASM file'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Maximum file size: 100KB
                    </span>
                  </label>
                  <input
                    id="wasm-file"
                    type="file"
                    accept=".wasm"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
            </div>
            {wasmFile && (
              <div className="mt-2 text-sm text-green-600">
                ✓ {wasmFile.name} ({(wasmFile.size / 1024).toFixed(1)}KB)
              </div>
            )}
          </div>

          {/* Initialization Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Initialization Message (JSON)
            </label>
            <textarea
              value={initMsg}
              onChange={(e) => setInitMsg(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
              placeholder='{"owner": "dyt1...", "initial_supply": "1000000"}'
            />
            <div className="mt-1 text-xs text-gray-500">
              JSON object passed to the contract's instantiate function
            </div>
          </div>

          {/* Wallet Info */}
          {wallet?.address && status === 'unlocked' ? (
            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
              <div className="text-sm">
                <div className="font-medium text-blue-900 dark:text-blue-100">
                  Deploying from:
                </div>
                <div className="font-mono text-blue-700 dark:text-blue-300">
                  {wallet.address}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                Please connect and unlock your wallet to deploy contracts
              </div>
            </div>
          )}

          {/* Deploy Button */}
          <button
            onClick={handleDeploy}
            disabled={deploying || !wasmFile || !wallet?.address || status !== 'unlocked'}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {deploying ? 'Deploying Contract...' : 'Deploy Contract'}
          </button>
        </div>
      </Card>

      {/* Deploy Result */}
      {deployResult && (
        <Card title="Deployment Successful" className="border-green-200 bg-green-50 dark:bg-green-900">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contract Address
                </div>
                <div className="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                  {deployResult.contractAddress}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Code Hash
                </div>
                <div className="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                  {deployResult.codeHash}
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Transaction Hash
              </div>
              <div className="font-mono text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                {deployResult.txHash}
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => window.open(`/contracts/${deployResult.contractAddress}`, '_blank')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                View Contract
              </button>
              <button
                onClick={() => window.open(`/explorer/tx/${deployResult.txHash}`, '_blank')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                View Transaction
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default ContractDeploy