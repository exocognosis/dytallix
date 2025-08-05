import { useState } from 'react'
import { 
  CheckCircleIcon,
  RocketLaunchIcon,
  DocumentTextIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { motion } from 'framer-motion'

export interface ContractTemplate {
  id: string
  title: string
  description: string
  features: string[]
  status: 'ready' | 'beta' | 'development'
  language: string
  pqcAlgorithm: string
  estimatedGas: string
  version: string
  deployments: number
  lastUpdated: string
}

interface EnhancedContractCardProps {
  template: ContractTemplate
  onDeploy: (template: ContractTemplate) => void
  onViewCode: (template: ContractTemplate) => void
  onAudit: (template: ContractTemplate) => void
}

const STATUS_COLORS = {
  ready: 'bg-green-900/30 text-green-400 border-green-700',
  beta: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
  development: 'bg-blue-900/30 text-blue-400 border-blue-700'
}

const PQC_COLORS = {
  'Dilithium': 'bg-purple-900/30 text-purple-400 border-purple-700',
  'SPHINCS+': 'bg-orange-900/30 text-orange-400 border-orange-700',
  'Falcon': 'bg-cyan-900/30 text-cyan-400 border-cyan-700',
  'Kyber': 'bg-pink-900/30 text-pink-400 border-pink-700'
}

export function EnhancedContractCard({ template, onDeploy, onViewCode, onAudit }: EnhancedContractCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group"
    >
      <Card className="bg-gray-900 border-gray-800 shadow-lg hover:border-gray-700 transition-all duration-300 h-full overflow-hidden">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-white text-lg mb-2 group-hover:text-blue-400 transition-colors">
                {template.title}
              </CardTitle>
              <p className="text-gray-300 text-sm line-clamp-2">{template.description}</p>
            </div>
            <div className="flex flex-col items-end space-y-2 ml-4">
              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[template.status]}`}>
                {template.status}
              </span>
              {/* PQC Algorithm Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                PQC_COLORS[template.pqcAlgorithm as keyof typeof PQC_COLORS] || 'bg-gray-900/30 text-gray-400 border-gray-700'
              }`}>
                {template.pqcAlgorithm}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="p-4 flex flex-col h-[280px]">
          {/* Features */}
          <div className="mb-4 flex-1">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Key Features:</h4>
            <div className="space-y-1">
              {template.features.slice(0, 3).map((feature, idx) => (
                <div key={idx} className="flex items-center text-xs">
                  <CheckCircleIcon className="w-3 h-3 text-green-400 mr-2 flex-shrink-0" />
                  <span className="text-gray-400">{feature}</span>
                </div>
              ))}
              {template.features.length > 3 && (
                <div className="text-xs text-gray-500">+{template.features.length - 3} more features</div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-500">Language</div>
              <div className="text-orange-400 font-medium">{template.language}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-500">Est. Gas</div>
              <div className="text-blue-400 font-medium">{template.estimatedGas}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-500">Deployments</div>
              <div className="text-green-400 font-medium">{template.deployments.toLocaleString()}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-500">Version</div>
              <div className="text-purple-400 font-medium">v{template.version}</div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="flex items-center text-xs text-gray-500 mb-4">
            <ClockIcon className="w-3 h-3 mr-1" />
            Updated {template.lastUpdated}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              size="sm" 
              onClick={() => onDeploy(template)}
              disabled={template.status === 'development'}
              className="flex items-center justify-center text-xs py-1.5 px-2"
            >
              <RocketLaunchIcon className="w-3 h-3 mr-1" />
              Deploy
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewCode(template)}
              className="flex items-center justify-center text-xs py-1.5 px-2"
            >
              <EyeIcon className="w-3 h-3 mr-1" />
              View
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onAudit(template)}
              className="flex items-center justify-center text-xs py-1.5 px-2 bg-green-900/10 border-green-700 text-green-400 hover:bg-green-900/20"
            >
              <DocumentTextIcon className="w-3 h-3 mr-1" />
              Audit
            </Button>
          </div>
        </CardContent>

        {/* Hover Effect Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none"
        />
      </Card>
    </motion.div>
  )
}