import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon, 
  PlayIcon,
  CogIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { motion } from 'framer-motion'

interface ContractInteractionModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ABIFunction {
  name: string
  type: 'function' | 'view' | 'payable'
  inputs: Array<{
    name: string
    type: string
    description?: string
  }>
  outputs?: Array<{
    name: string
    type: string
  }>
}

const SAMPLE_CONTRACTS = [
  {
    address: '0x742d35Cc4Cf3E3C3E3C3E3C3E3C3E3C3E3C3E3C3',
    name: 'DytalToken (ERC-20)',
    type: 'ERC-20 Token',
    abi: [
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          { name: 'to', type: 'address', description: 'Recipient address' },
          { name: 'amount', type: 'uint256', description: 'Amount to transfer' }
        ],
        outputs: [{ name: 'success', type: 'bool' }]
      },
      {
        name: 'balanceOf',
        type: 'view',
        inputs: [
          { name: 'account', type: 'address', description: 'Account to check balance' }
        ],
        outputs: [{ name: 'balance', type: 'uint256' }]
      },
      {
        name: 'approve',
        type: 'function',
        inputs: [
          { name: 'spender', type: 'address', description: 'Address to approve' },
          { name: 'amount', type: 'uint256', description: 'Amount to approve' }
        ],
        outputs: [{ name: 'success', type: 'bool' }]
      }
    ]
  },
  {
    address: '0x987fEDCBA98765432109876543210987654321098',
    name: 'DytaNFT Collection',
    type: 'NFT Contract',
    abi: [
      {
        name: 'mint',
        type: 'payable',
        inputs: [
          { name: 'to', type: 'address', description: 'Recipient address' },
          { name: 'tokenURI', type: 'string', description: 'Token metadata URI' }
        ],
        outputs: [{ name: 'tokenId', type: 'uint256' }]
      },
      {
        name: 'ownerOf',
        type: 'view',
        inputs: [
          { name: 'tokenId', type: 'uint256', description: 'Token ID to check' }
        ],
        outputs: [{ name: 'owner', type: 'address' }]
      },
      {
        name: 'setApprovalForAll',
        type: 'function',
        inputs: [
          { name: 'operator', type: 'address', description: 'Operator address' },
          { name: 'approved', type: 'bool', description: 'Approval status' }
        ]
      }
    ]
  }
]

export function ContractInteractionModal({ isOpen, onClose }: ContractInteractionModalProps) {
  const [selectedContract, setSelectedContract] = useState<typeof SAMPLE_CONTRACTS[0] | null>(null)
  const [selectedFunction, setSelectedFunction] = useState<ABIFunction | null>(null)
  const [functionInputs, setFunctionInputs] = useState<Record<string, string>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  const [customAddress, setCustomAddress] = useState('')

  const handleInputChange = (paramName: string, value: string) => {
    setFunctionInputs(prev => ({
      ...prev,
      [paramName]: value
    }))
  }

  const handleExecuteFunction = async () => {
    if (!selectedContract || !selectedFunction) return

    setIsExecuting(true)
    
    try {
      // Simulate function execution
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock response based on function type
      if (selectedFunction.type === 'view') {
        if (selectedFunction.name === 'balanceOf') {
          setExecutionResult({ balance: '1000000000000000000000' }) // 1000 tokens
        } else if (selectedFunction.name === 'ownerOf') {
          setExecutionResult({ owner: '0x742d35Cc4Cf3E3C3E3C3E3C3E3C3E3C3E3C3E3C3' })
        }
      } else {
        setExecutionResult({ 
          transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
          success: true 
        })
      }
    } catch (error) {
      setExecutionResult({ error: 'Function execution failed' })
    } finally {
      setIsExecuting(false)
    }
  }

  const resetModal = () => {
    setSelectedContract(null)
    setSelectedFunction(null)
    setFunctionInputs({})
    setIsExecuting(false)
    setExecutionResult(null)
    setCustomAddress('')
  }

  const handleClose = () => {
    onClose()
    resetModal()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-900 p-6 text-left align-middle shadow-xl transition-all border border-gray-800">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-white flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <PlayIcon className="w-6 h-6 mr-2 text-purple-400" />
                    Interact with Smart Contract
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </Dialog.Title>

                <div className="mt-6 space-y-6">
                  {/* Contract Selection */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">Select Contract</h4>
                    
                    {/* Custom Address Input */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Custom Contract Address
                      </label>
                      <input
                        type="text"
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>

                    {/* Sample Contracts */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {SAMPLE_CONTRACTS.map((contract) => (
                        <Card 
                          key={contract.address}
                          className={`cursor-pointer transition-all border-2 ${
                            selectedContract?.address === contract.address 
                              ? 'border-purple-500 bg-purple-900/20' 
                              : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                          }`}
                          onClick={() => setSelectedContract(contract)}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-white text-sm">{contract.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-gray-400 text-sm mb-2">{contract.type}</p>
                            <code className="text-xs text-gray-500 font-mono">
                              {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                            </code>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Function Selection */}
                  {selectedContract && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h4 className="text-lg font-semibold text-white mb-4">Select Function</h4>
                      <div className="space-y-2">
                        {selectedContract.abi.map((func, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              selectedFunction === func
                                ? 'border-purple-500 bg-purple-900/20'
                                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                            onClick={() => setSelectedFunction(func)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-white">{func.name}</span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  func.type === 'view' ? 'bg-blue-900 text-blue-400' :
                                  func.type === 'payable' ? 'bg-yellow-900 text-yellow-400' :
                                  'bg-green-900 text-green-400'
                                }`}>
                                  {func.type}
                                </span>
                              </div>
                              <CogIcon className="w-4 h-4 text-gray-400" />
                            </div>
                            {func.inputs.length > 0 && (
                              <div className="mt-2 text-sm text-gray-400">
                                Inputs: {func.inputs.map(input => `${input.name}: ${input.type}`).join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Function Parameters */}
                  {selectedFunction && selectedFunction.inputs.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h4 className="text-lg font-semibold text-white mb-4">Function Parameters</h4>
                      <div className="space-y-4">
                        {selectedFunction.inputs.map((input, index) => (
                          <div key={index}>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              {input.name} ({input.type})
                              {input.description && (
                                <span className="text-gray-500 font-normal"> - {input.description}</span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={functionInputs[input.name] || ''}
                              onChange={(e) => handleInputChange(input.name, e.target.value)}
                              placeholder={`Enter ${input.type} value`}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Execute Button */}
                  {selectedFunction && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-between items-center"
                    >
                      {selectedFunction.type === 'payable' && (
                        <div className="flex items-center text-yellow-400 text-sm">
                          <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                          This function requires payment
                        </div>
                      )}
                      <div className="flex space-x-4 ml-auto">
                        <Button variant="outline" onClick={handleClose}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleExecuteFunction}
                          disabled={isExecuting}
                          className="flex items-center"
                        >
                          <PlayIcon className="w-4 h-4 mr-2" />
                          {isExecuting ? 'Executing...' : `Call ${selectedFunction.name}`}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Execution Result */}
                  {executionResult && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-white">Execution Result</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(executionResult, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}