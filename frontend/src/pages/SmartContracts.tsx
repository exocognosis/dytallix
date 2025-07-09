import React, { useState } from 'react'
import { 
  CommandLineIcon,
  PlusIcon,
  PlayIcon,
  DocumentTextIcon,
  CpuChipIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline'
import { useContracts, useDeployContract } from '../hooks/useAPI'

export function SmartContracts() {
  const [showDeployForm, setShowDeployForm] = useState(false)
  const [contractCode, setContractCode] = useState('')
  const [contractName, setContractName] = useState('')
  const [selectedContract, setSelectedContract] = useState<string | null>(null)

  const { data: contracts, isLoading: contractsLoading } = useContracts()
  const deployContract = useDeployContract()

  const handleDeployContract = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // Mock ABI for demonstration
      const mockAbi = [
        {
          "name": "transfer",
          "type": "function",
          "inputs": [
            { "name": "to", "type": "string" },
            { "name": "amount", "type": "uint64" }
          ],
          "outputs": [{ "name": "success", "type": "bool" }]
        }
      ]

      await deployContract.mutateAsync({
        code: contractCode,
        abi: mockAbi
      })
      
      setShowDeployForm(false)
      setContractCode('')
      setContractName('')
    } catch (error) {
      console.error('Failed to deploy contract:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <CommandLineIcon className="w-8 h-8 mr-3" />
          Smart Contracts
        </h1>
        <p className="mt-2 text-gray-400">
          Deploy and interact with WASM smart contracts on the Dytallix network
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={() => setShowDeployForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Deploy Contract
          </button>
          
          <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            Templates
          </button>
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Deployed Contracts</h3>
          </div>
          <div className="p-6">
            {contractsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="p-4 bg-gray-700 rounded-lg">
                      <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : contracts?.data && contracts.data.length > 0 ? (
              <div className="space-y-3">
                {contracts.data.map((contract) => (
                  <div
                    key={contract.address}
                    className={`p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer ${
                      selectedContract === contract.address ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedContract(contract.address)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{contract.name}</h4>
                        <p className="text-gray-400 text-sm">
                          {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                        </p>
                      </div>
                      <CpuChipIcon className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CommandLineIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-300">No contracts deployed</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Deploy your first smart contract to get started.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contract Interaction */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Contract Interaction</h3>
          </div>
          <div className="p-6">
            {selectedContract ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Function Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    placeholder="transfer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Parameters (JSON)
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm"
                    placeholder='{"to": "dyt1...", "amount": 1000000}'
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Gas Limit
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    placeholder="100000"
                  />
                </div>
                
                <button className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Execute Function
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Select a contract to interact with it
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contract Templates */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Contract Templates</h3>
          <p className="text-sm text-gray-400">Pre-built smart contract templates</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: 'Token Contract',
                description: 'Basic fungible token implementation',
                language: 'Rust',
                complexity: 'Beginner'
              },
              {
                name: 'DGT Governance Token',
                description: 'Dytallix governance token with voting power',
                language: 'Rust',
                complexity: 'Advanced'
              },
              {
                name: 'DRT Reward Token',
                description: 'Adaptive emission reward token with burning',
                language: 'Rust',
                complexity: 'Advanced'
              },
              {
                name: 'Emission Controller',
                description: 'DAO-controlled DRT emission management',
                language: 'Rust',
                complexity: 'Expert'
              },
              {
                name: 'NFT Contract',
                description: 'Non-fungible token with metadata',
                language: 'Rust',
                complexity: 'Intermediate'
              },
              {
                name: 'DAO Governance',
                description: 'Decentralized governance contract',
                language: 'Rust',
                complexity: 'Advanced'
              },
              {
                name: 'Escrow Contract',
                description: 'Multi-party escrow service',
                language: 'Rust',
                complexity: 'Intermediate'
              },
              {
                name: 'Staking Contract',
                description: 'Token staking with rewards',
                language: 'Rust',
                complexity: 'Advanced'
              },
              {
                name: 'Oracle Contract',
                description: 'External data oracle integration',
                language: 'Rust',
                complexity: 'Advanced'
              }
            ].map((template, index) => (
              <div key={index} className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-white font-medium">{template.name}</h4>
                    <p className="text-gray-400 text-sm mt-1">{template.description}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-blue-900/50 text-blue-400 px-2 py-1 rounded">
                        {template.language}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        template.complexity === 'Beginner' ? 'bg-green-900/50 text-green-400' :
                        template.complexity === 'Intermediate' ? 'bg-yellow-900/50 text-yellow-400' :
                        template.complexity === 'Advanced' ? 'bg-red-900/50 text-red-400' :
                        'bg-purple-900/50 text-purple-400'
                      }`}>
                        {template.complexity}
                      </span>
                    </div>
                  </div>
                  <CodeBracketIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deploy Contract Modal */}
      {showDeployForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Deploy Smart Contract</h3>
            
            <form onSubmit={handleDeployContract} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Contract Name
                </label>
                <input
                  type="text"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="MyContract"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Contract Code (WASM)
                </label>
                <textarea
                  value={contractCode}
                  onChange={(e) => setContractCode(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm"
                  placeholder="Enter your WASM contract bytecode or Rust source code..."
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={deployContract.isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {deployContract.isLoading ? 'Deploying...' : 'Deploy Contract'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowDeployForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
