import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { 
  XMarkIcon, 
  RocketLaunchIcon, 
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { motion } from 'framer-motion'
import { useDeployContract, useDeployTemplate } from '../../hooks/useAPI'

interface ContractTemplate {
  id: string
  title: string
  description: string
  features: string[]
  status: 'ready' | 'beta' | 'development'
  language: string
  pqcAlgorithm: string
  estimatedGas: string
}

interface DeployContractModalProps {
  isOpen: boolean
  onClose: () => void
}

const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'erc20-pqc',
    title: 'ERC-20 Token (PQC)',
    description: 'Standard fungible token with post-quantum cryptography',
    features: ['Dilithium signatures', 'Quantum-resistant transfers', 'Governance ready'],
    status: 'ready',
    language: 'Rust',
    pqcAlgorithm: 'Dilithium',
    estimatedGas: '2.1M'
  },
  {
    id: 'nft-pqc',
    title: 'NFT Collection (PQC)',
    description: 'Non-fungible token collection with quantum security',
    features: ['SPHINCS+ verification', 'Metadata protection', 'Royalty system'],
    status: 'ready',
    language: 'Rust',
    pqcAlgorithm: 'SPHINCS+',
    estimatedGas: '3.2M'
  },
  {
    id: 'dao-governance',
    title: 'DAO Governance',
    description: 'Decentralized governance with quantum-safe voting',
    features: ['Falcon signatures', 'Proposal system', 'Treasury management'],
    status: 'beta',
    language: 'Rust',
    pqcAlgorithm: 'Falcon',
    estimatedGas: '4.1M'
  },
  {
    id: 'defi-pool',
    title: 'DeFi Liquidity Pool',
    description: 'Automated market maker with quantum protection',
    features: ['PQC price oracles', 'Secure swaps', 'Yield farming'],
    status: 'development',
    language: 'Rust',
    pqcAlgorithm: 'Dilithium',
    estimatedGas: '5.5M'
  }
]

const PQC_METHODS = [
  { id: 'dilithium', name: 'Dilithium', description: 'NIST standard for digital signatures' },
  { id: 'falcon', name: 'Falcon', description: 'Compact lattice-based signatures' },
  { id: 'sphincs', name: 'SPHINCS+', description: 'Hash-based signature scheme' }
]

export function DeployContractModal({ isOpen, onClose }: DeployContractModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [selectedPQC, setSelectedPQC] = useState<string>('dilithium')
  const [contractName, setContractName] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle')
  const [deploymentHash, setDeploymentHash] = useState('')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const deployTemplate = useDeployTemplate()
  const deployContract = useDeployContract()

  const handleDeploy = async () => {
    if (!selectedTemplate || !contractName) return

    setIsDeploying(true)
    setDeploymentStatus('deploying')
    setErrorMsg('')

    try {
      // For ERC-20 PQC, backend maps to WrappedDytallix(name, symbol, admin, bridge, originalChain, originalAsset)
      // We'll pass: [name, symbol] and backend will use default admin/bridge accounts
      let args: any[] = []
      if (selectedTemplate.id === 'erc20-pqc') {
        args = [contractName, contractName.slice(0, 4).toUpperCase()]
      }

      const result = await deployTemplate.mutateAsync({ templateId: selectedTemplate.id, args })

      if (result?.success && result.data?.address) {
        setDeploymentStatus('success')
        setDeploymentHash(result.data.address)
      } else {
        throw new Error(result?.error || 'Unknown deployment error')
      }

      // Auto close after success
      setTimeout(() => {
        onClose()
        resetModal()
      }, 3000)
      
    } catch (error: any) {
      setDeploymentStatus('error')
      setErrorMsg(error?.message || 'Deployment failed')
    } finally {
      setIsDeploying(false)
    }
  }

  const resetModal = () => {
    setSelectedTemplate(null)
    setSelectedPQC('dilithium')
    setContractName('')
    setIsDeploying(false)
    setDeploymentStatus('idle')
    setDeploymentHash('')
    setErrorMsg('')
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
                    <RocketLaunchIcon className="w-6 h-6 mr-2 text-blue-400" />
                    Deploy Smart Contract
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-white"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </Dialog.Title>

                <div className="mt-6">
                  {deploymentStatus === 'deploying' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8"
                    >
                      <ClockIcon className="w-12 h-12 mx-auto text-blue-400 animate-spin mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Deploying Contract...</h3>
                      <p className="text-gray-400">This may take a few moments</p>
                    </motion.div>
                  )}

                  {deploymentStatus === 'success' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <CheckCircleIcon className="w-12 h-12 mx-auto text-green-400 mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Contract Deployed Successfully!</h3>
                      <p className="text-gray-400 mb-4">Contract Address:</p>
                      <code className="bg-gray-800 px-4 py-2 rounded text-green-400 font-mono">
                        {deploymentHash}
                      </code>
                    </motion.div>
                  )}

                  {deploymentStatus === 'error' && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8"
                    >
                      <p className="text-red-400">{errorMsg}</p>
                    </motion.div>
                  )}

                  {deploymentStatus === 'idle' && (
                    <>
                      {/* Template Selection */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Select Contract Template</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {CONTRACT_TEMPLATES.map((template) => (
                            <Card 
                              key={template.id}
                              className={`cursor-pointer transition-all border-2 ${
                                selectedTemplate?.id === template.id 
                                  ? 'border-blue-500 bg-blue-900/20' 
                                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                              }`}
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <CardHeader className="pb-2">
                                <CardTitle className="text-white text-sm flex items-center justify-between">
                                  {template.title}
                                  <div className="flex space-x-1">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      template.status === 'ready' ? 'bg-green-900 text-green-400' :
                                      template.status === 'beta' ? 'bg-yellow-900 text-yellow-400' :
                                      'bg-blue-900 text-blue-400'
                                    }`}>
                                      {template.status}
                                    </span>
                                    <span className="px-2 py-1 bg-purple-900 text-purple-400 rounded text-xs">
                                      {template.pqcAlgorithm}
                                    </span>
                                  </div>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <p className="text-gray-400 text-sm mb-2">{template.description}</p>
                                <div className="text-xs text-gray-500">
                                  Gas: ~{template.estimatedGas}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* PQC Method Selection */}
                      {selectedTemplate && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6"
                        >
                          <h4 className="text-lg font-semibold text-white mb-4">Select PQC Method</h4>
                          <div className="grid md:grid-cols-3 gap-4">
                            {PQC_METHODS.map((method) => (
                              <Card 
                                key={method.id}
                                className={`cursor-pointer transition-all border-2 ${
                                  selectedPQC === method.id 
                                    ? 'border-green-500 bg-green-900/20' 
                                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                                }`}
                                onClick={() => setSelectedPQC(method.id)}
                              >
                                <CardContent className="p-4 text-center">
                                  <ShieldCheckIcon className="w-8 h-8 mx-auto mb-2 text-green-400" />
                                  <h5 className="font-semibold text-white mb-1">{method.name}</h5>
                                  <p className="text-xs text-gray-400">{method.description}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Contract Name */}
                      {selectedTemplate && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6"
                        >
                          <h4 className="text-lg font-semibold text-white mb-4">Contract Details</h4>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Contract Name
                            </label>
                            <input
                              type="text"
                              value={contractName}
                              onChange={(e) => setContractName(e.target.value)}
                              placeholder="Enter contract name"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </motion.div>
                      )}

                      {/* Deploy Button */}
                      {selectedTemplate && contractName && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-end space-x-4"
                        >
                          <Button variant="outline" onClick={handleClose}>
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleDeploy}
                            disabled={isDeploying || selectedTemplate.status === 'development'}
                            className="flex items-center"
                          >
                            <RocketLaunchIcon className="w-4 h-4 mr-2" />
                            {isDeploying ? 'Deploying...' : 'Deploy Contract'}
                          </Button>
                        </motion.div>
                      )}
                    </>
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