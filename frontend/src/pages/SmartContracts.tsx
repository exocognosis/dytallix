import { useState } from 'react'
import { 
  CommandLineIcon, 
  ShieldCheckIcon,
  CodeBracketIcon,
  PlayIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  DeployContractModal,
  ContractInteractionModal,
  AIAuditModal,
  EnhancedContractCard,
  RealTimeDeploymentTracker,
  ContractTemplate
} from '../components/smart-contracts';

const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'erc20-pqc',
    title: 'ERC-20 Token (PQC)',
    description: 'Standard fungible token with post-quantum cryptography',
    features: ['Dilithium signatures', 'Quantum-resistant transfers', 'Governance ready', 'Mintable/Burnable', 'Access Control'],
    status: 'ready',
    language: 'Rust',
    pqcAlgorithm: 'Dilithium',
    estimatedGas: '2.1M',
    version: '1.2.0',
    deployments: 1247,
    lastUpdated: '2 days ago'
  },
  {
    id: 'nft-pqc',
    title: 'NFT Collection (PQC)',
    description: 'Non-fungible token collection with quantum security',
    features: ['SPHINCS+ verification', 'Metadata protection', 'Royalty system', 'Batch minting', 'Marketplace ready'],
    status: 'ready',
    language: 'Rust',
    pqcAlgorithm: 'SPHINCS+',
    estimatedGas: '3.2M',
    version: '1.1.5',
    deployments: 892,
    lastUpdated: '5 days ago'
  },
  {
    id: 'dao-governance',
    title: 'DAO Governance',
    description: 'Decentralized governance with quantum-safe voting',
    features: ['Falcon signatures', 'Proposal system', 'Treasury management', 'Voting weights', 'Timelock execution'],
    status: 'beta',
    language: 'Rust',
    pqcAlgorithm: 'Falcon',
    estimatedGas: '4.1M',
    version: '0.9.2',
    deployments: 234,
    lastUpdated: '1 week ago'
  },
  {
    id: 'defi-pool',
    title: 'DeFi Liquidity Pool',
    description: 'Automated market maker with quantum protection',
    features: ['PQC price oracles', 'Secure swaps', 'Yield farming', 'Impermanent loss protection', 'Multi-asset support'],
    status: 'development',
    language: 'Rust',
    pqcAlgorithm: 'Dilithium',
    estimatedGas: '5.5M',
    version: '0.5.0',
    deployments: 12,
    lastUpdated: '3 days ago'
  }
]

export function SmartContracts() {
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [showInteractModal, setShowInteractModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)

  const handleDeploy = (template?: ContractTemplate) => {
    if (template) {
      setSelectedTemplate(template)
    }
    setShowDeployModal(true)
  }

  const handleViewCode = (template: ContractTemplate) => {
    // In a real implementation, this would open the code viewer
    window.open(`https://github.com/dytallix/contracts/tree/main/${template.id}`, '_blank')
  }

  const handleAudit = (template: ContractTemplate) => {
    setSelectedTemplate(template)
    setShowAuditModal(true)
  }
  return (
    <main className="bg-black text-white min-h-screen px-6 py-12">
      {/* Header */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center justify-center">
            <CommandLineIcon className="w-12 h-12 mr-4" />
            Smart Contracts
          </h1>
          <p className="text-lg text-gray-300">
            Deploy and interact with quantum-safe smart contracts on the Dytallix network
          </p>
        </motion.div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Deploy Contract",
              description: "Deploy new quantum-safe contracts with guided setup",
              icon: CodeBracketIcon,
              color: "blue",
              action: () => handleDeploy()
            },
            {
              title: "Interact",
              description: "Call functions on existing contracts with dynamic ABI",
              icon: PlayIcon,
              color: "purple",
              action: () => setShowInteractModal(true)
            },
            {
              title: "AI Audit",
              description: "Get AI-powered security analysis and recommendations",
              icon: ShieldCheckIcon,
              color: "green",
              action: () => setShowAuditModal(true)
            }
          ].map((action, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card 
                className={`cursor-pointer transition-all hover:scale-105 border shadow-lg ${
                  action.color === 'blue' ? 'bg-blue-900/20 border-blue-700 hover:bg-blue-900/30' :
                  action.color === 'purple' ? 'bg-purple-900/20 border-purple-700 hover:bg-purple-900/30' :
                  'bg-green-900/20 border-green-700 hover:bg-green-900/30'
                }`}
                onClick={action.action}
              >
                <CardContent className="p-6 text-center">
                  <action.icon className={`w-12 h-12 mx-auto mb-4 ${
                    action.color === 'blue' ? 'text-blue-400' :
                    action.color === 'purple' ? 'text-purple-400' :
                    'text-green-400'
                  }`} />
                  <h3 className="font-semibold text-white mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-300">{action.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contract Templates */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.div 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="flex items-center justify-between mb-6"
        >
          <h2 className="text-2xl font-bold text-blue-400">
            Quantum-Safe Contract Templates
          </h2>
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => window.open('https://github.com/dytallix/contracts', '_blank')}
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />
            View All Templates
          </Button>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-6">
          {CONTRACT_TEMPLATES.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <EnhancedContractCard
                template={template}
                onDeploy={handleDeploy}
                onViewCode={handleViewCode}
                onAudit={handleAudit}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Deployments */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-purple-400"
        >
          Real-time Deployment Tracker
        </motion.h2>
        <RealTimeDeploymentTracker />
      </section>

      {/* Security Features */}
      <section className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border-green-700/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-white">
                <ShieldCheckIcon className="w-6 h-6 mr-2" />
                Quantum-Safe Security Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">100%</div>
                  <div className="text-sm text-green-200">Quantum Resistant</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">3</div>
                  <div className="text-sm text-blue-200">PQC Algorithms</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">AI</div>
                  <div className="text-sm text-purple-200">Powered Audits</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">24/7</div>
                  <div className="text-sm text-yellow-200">Security Monitoring</div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-green-200 mb-6">
                  All smart contracts are automatically protected with post-quantum cryptography and AI-powered security audits. 
                  Our platform ensures your contracts remain secure against both classical and quantum threats.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button 
                    variant="outline" 
                    className="border-green-400 text-green-400 hover:bg-green-400/10"
                    onClick={() => window.open('https://docs.dytallix.com/pqc-security', '_blank')}
                  >
                    <DocumentTextIcon className="w-4 h-4 mr-2" />
                    Learn More About PQC
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setShowAuditModal(true)}
                  >
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Try AI Audit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Modals */}
      <DeployContractModal 
        isOpen={showDeployModal} 
        onClose={() => setShowDeployModal(false)} 
      />
      
      <ContractInteractionModal 
        isOpen={showInteractModal} 
        onClose={() => setShowInteractModal(false)} 
      />
      
      <AIAuditModal 
        isOpen={showAuditModal} 
        onClose={() => setShowAuditModal(false)}
        contractAddress={selectedTemplate ? '0x742d35Cc4Cf3E3C3E3C3E3C3E3C3E3C3E3C3E3C3' : undefined}
      />
    </main>
  )
}
