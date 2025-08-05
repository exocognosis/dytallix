import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { useContracts } from '../../hooks/useAPI'

interface RecentDeployment {
  id: string
  name: string
  type: string
  address: string
  deployer: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: Date
  gasUsed?: string
  txHash?: string
}

// Mock data generator for real-time simulation
const generateMockDeployment = (): RecentDeployment => {
  const types = ['ERC-20 Token', 'NFT Collection', 'DAO Contract', 'DeFi Pool', 'Custom Contract']
  const names = ['DytalToken', 'CryptoArt', 'GovernanceDAO', 'LiquidityPool', 'MultiSig']
  const statuses: ('pending' | 'confirmed' | 'failed')[] = ['pending', 'confirmed', 'confirmed', 'confirmed', 'failed']
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: names[Math.floor(Math.random() * names.length)],
    type: types[Math.floor(Math.random() * types.length)],
    address: '0x' + Math.random().toString(16).substr(2, 40),
    deployer: '0x' + Math.random().toString(16).substr(2, 40),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    timestamp: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
    gasUsed: (Math.random() * 5000000 + 1000000).toFixed(0),
    txHash: '0x' + Math.random().toString(16).substr(2, 64)
  }
}

export function RealTimeDeploymentTracker() {
  const [deployments, setDeployments] = useState<RecentDeployment[]>([])
  const [isLive, setIsLive] = useState(true)
  
  // Get contracts from API (for real deployments)
  const { data: contractsData } = useContracts()

  useEffect(() => {
    // Initialize with some mock data
    const initialDeployments = Array.from({ length: 8 }, generateMockDeployment)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    setDeployments(initialDeployments)

    // Simulate real-time updates
    const interval = setInterval(() => {
      if (isLive && Math.random() > 0.7) { // 30% chance every interval
        const newDeployment = generateMockDeployment()
        setDeployments(prev => [newDeployment, ...prev.slice(0, 9)]) // Keep latest 10
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [isLive])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />
      case 'failed':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
      case 'pending':
        return <ClockIcon className="w-4 h-4 text-yellow-400 animate-spin" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      case 'pending':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <Card className="bg-gray-900 border-gray-800 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center">
            <ClockIcon className="w-5 h-5 mr-2 text-purple-400" />
            Real-time Deployment Tracker
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-gray-400">{isLive ? 'LIVE' : 'PAUSED'}</span>
            <button
              onClick={() => setIsLive(!isLive)}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              {isLive ? 'Pause' : 'Resume'}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {deployments.map((deployment, index) => (
              <motion.div
                key={deployment.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group cursor-pointer"
              >
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(deployment.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white text-sm truncate">
                        {deployment.name}
                      </span>
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                        {deployment.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="font-mono text-xs text-gray-300">
                        {truncateAddress(deployment.address)}
                      </code>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">
                        by {truncateAddress(deployment.deployer)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className={`text-xs font-medium ${getStatusColor(deployment.status)}`}>
                      {deployment.status}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(deployment.timestamp)}
                    </div>
                    {deployment.gasUsed && (
                      <div className="text-xs text-gray-500">
                        {parseInt(deployment.gasUsed).toLocaleString()} gas
                      </div>
                    )}
                  </div>
                  
                  <button 
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-600 rounded"
                    title="View details"
                  >
                    <EyeIcon className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {deployments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent deployments</p>
              <p className="text-xs">Deployments will appear here in real-time</p>
            </div>
          )}
        </div>
        
        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-400">
                {deployments.filter(d => d.status === 'confirmed').length}
              </div>
              <div className="text-xs text-gray-400">Confirmed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-400">
                {deployments.filter(d => d.status === 'pending').length}
              </div>
              <div className="text-xs text-gray-400">Pending</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">
                {deployments.filter(d => d.status === 'failed').length}
              </div>
              <div className="text-xs text-gray-400">Failed</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}