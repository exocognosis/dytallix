import React, { useState } from 'react'
import { 
  CommandLineIcon,
  PlusIcon,
  PlayIcon,
  DocumentTextIcon,
  CpuChipIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export function SmartContracts() {
  const [showDeployForm, setShowDeployForm] = useState(false)
  const [contractCode, setContractCode] = useState('')
  const [contractName, setContractName] = useState('')
  const [selectedContract, setSelectedContract] = useState<string | null>(null)

  // Mock contracts data
  const mockContracts = [
    {
      id: '0x1234...5678',
      name: 'DTX Token',
      type: 'ERC-20',
      status: 'active',
      deployedAt: '2025-07-10T10:30:00Z',
      gasUsed: '2,134,567',
      interactions: 1247,
      securityScore: 95
    },
    {
      id: '0x2345...6789',
      name: 'Staking Pool',
      type: 'Custom',
      status: 'active',
      deployedAt: '2025-07-09T14:20:00Z',
      gasUsed: '1,876,432',
      interactions: 892,
      securityScore: 88
    },
    {
      id: '0x3456...789a',
      name: 'Governance',
      type: 'DAO',
      status: 'active',
      deployedAt: '2025-07-08T09:15:00Z',
      gasUsed: '3,245,123',
      interactions: 456,
      securityScore: 92
    }
  ]

  const handleDeployContract = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Deploying contract:', { contractName, contractCode })
    // Mock deployment
    alert('Contract deployment simulation - would deploy in real environment')
    setShowDeployForm(false)
    setContractCode('')
    setContractName('')
  }

  const handleExecuteFunction = (contractId: string, functionName: string) => {
    console.log('Executing function:', functionName, 'on contract:', contractId)
    alert(`Simulation: Executing ${functionName} on contract ${contractId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-700 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Smart Contracts</h1>
          <p className="mt-2 text-gray-400">
            Deploy, manage, and interact with quantum-safe smart contracts
          </p>
        </div>
        <button
          onClick={() => setShowDeployForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Deploy Contract</span>
        </button>
      </div>

      {/* Deploy Contract Form */}
      {showDeployForm && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Deploy New Contract</h2>
          <form onSubmit={handleDeployContract} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contract Name
              </label>
              <input
                type="text"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter contract name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contract Code (Solidity)
              </label>
              <textarea
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="pragma solidity ^0.8.0;&#10;&#10;contract MyContract {&#10;    // Your contract code here&#10;}"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeployForm(false)}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Deploy Contract
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockContracts.map((contract) => (
          <div key={contract.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{contract.name}</h3>
                <p className="text-sm text-gray-400">{contract.type}</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-500 capitalize">{contract.status}</span>
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Contract ID:</span>
                <span className="text-sm text-white font-mono">{contract.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Gas Used:</span>
                <span className="text-sm text-white">{contract.gasUsed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Interactions:</span>
                <span className="text-sm text-white">{contract.interactions.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Security Score:</span>
                <div className="flex items-center space-x-2">
                  {contract.securityScore >= 90 ? (
                    <ShieldCheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className={`text-sm font-medium ${
                    contract.securityScore >= 90 ? 'text-green-500' : 'text-yellow-500'
                  }`}>
                    {contract.securityScore}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedContract(contract.id)}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4" />
                <span>View</span>
              </button>
              <button
                onClick={() => handleExecuteFunction(contract.id, 'transfer')}
                className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <PlayIcon className="h-4 w-4" />
                <span>Execute</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Contract Details */}
      {selectedContract && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Contract Details</h2>
            <button
              onClick={() => setSelectedContract(null)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Contract Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Address:</span>
                  <span className="text-white font-mono">{selectedContract}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Compiler:</span>
                  <span className="text-white">Solidity 0.8.19</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Optimization:</span>
                  <span className="text-white">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Verification:</span>
                  <span className="text-green-500">Verified</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Available Functions</h3>
              <div className="space-y-2">
                {['transfer', 'approve', 'balanceOf', 'totalSupply'].map((func) => (
                  <button
                    key={func}
                    onClick={() => handleExecuteFunction(selectedContract, func)}
                    className="w-full flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <CodeBracketIcon className="h-5 w-5 text-blue-500" />
                      <span className="text-white font-mono">{func}()</span>
                    </div>
                    <PlayIcon className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Contract Auditor */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">AI Contract Auditor</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <ShieldCheckIcon className="h-6 w-6 text-green-500" />
              <span className="text-green-500 font-medium">Secure</span>
            </div>
            <p className="text-2xl font-bold text-white">3</p>
            <p className="text-sm text-gray-400">Contracts</p>
          </div>
          
          <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
              <span className="text-yellow-500 font-medium">Warnings</span>
            </div>
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-sm text-gray-400">Identified</p>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CpuChipIcon className="h-6 w-6 text-blue-500" />
              <span className="text-blue-500 font-medium">Gas Optimization</span>
            </div>
            <p className="text-2xl font-bold text-white">12%</p>
            <p className="text-sm text-gray-400">Potential Savings</p>
          </div>
        </div>
      </div>
    </div>
  )
}
