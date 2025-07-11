import { 
  ChartBarIcon, 
  BoltIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export function Analytics() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <ChartBarIcon className="w-8 h-8 mr-3" />
          AI Analytics
        </h1>
        <p className="mt-2 text-gray-400">
          Advanced AI-powered analytics for threat detection, market insights, and quantum security monitoring
        </p>
      </div>

      {/* AI Health Status */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">AI System Health</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 font-semibold">Threat Detection</span>
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">99.7%</div>
            <div className="text-sm text-gray-400">Active & Monitoring</div>
          </div>
          
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 font-semibold">Contract Auditing</span>
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">100%</div>
            <div className="text-sm text-gray-400">Real-time Analysis</div>
          </div>
          
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-400 font-semibold">Model Training</span>
              <BoltIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">24/7</div>
            <div className="text-sm text-gray-400">Continuous Learning</div>
          </div>
        </div>
      </div>

      {/* Threat Detection */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Real-time Threat Detection</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
            <div className="flex items-center">
              <ShieldCheckIcon className="w-5 h-5 text-green-400 mr-3" />
              <span className="text-white">Quantum Attack Patterns</span>
            </div>
            <span className="text-green-400 font-semibold">No Threats Detected</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-3" />
              <span className="text-white">Unusual Transaction Patterns</span>
            </div>
            <span className="text-yellow-400 font-semibold">3 Flagged (Low Risk)</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-700 rounded">
            <div className="flex items-center">
              <CpuChipIcon className="w-5 h-5 text-blue-400 mr-3" />
              <span className="text-white">Smart Contract Vulnerabilities</span>
            </div>
            <span className="text-green-400 font-semibold">All Clear</span>
          </div>
        </div>
      </div>

      {/* Market Analytics */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Market Analytics</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Price Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">DGT Price</span>
                <span className="text-green-400 font-semibold">$1.82 (+8.7%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">DRT Price</span>
                <span className="text-green-400 font-semibold">$0.034 (+15.2%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Market Cap</span>
                <span className="text-white">$847.2M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h Volume</span>
                <span className="text-white">$23.1M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Circulating Supply</span>
                <span className="text-white">650M DGT • 97.2M DRT</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Network Activity</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Addresses</span>
                <span className="text-green-400">+15.7% (24h)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Transactions</span>
                <span className="text-white">1.2M (24h)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Staking Ratio</span>
                <span className="text-blue-400">67.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network Hash Rate</span>
                <span className="text-white">847.2 TH/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">AI-Generated Insights</h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2">Market Sentiment Analysis</h4>
            <p className="text-gray-300 text-sm">
              AI models detect strong positive sentiment around DGT/DRT with 89% confidence. Social media mentions increased 340% following the quantum security audit completion and dual-token launch.
            </p>
          </div>
          
          <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
            <h4 className="font-semibold text-green-400 mb-2">Security Recommendation</h4>
            <p className="text-gray-300 text-sm">
              All deployed smart contracts pass quantum-resistance checks. Recommended to upgrade contracts deployed before block 2,847,392 to latest PQC standards.
            </p>
          </div>
          
          <div className="p-4 bg-purple-900/20 border border-purple-700 rounded-lg">
            <h4 className="font-semibold text-purple-400 mb-2">Network Optimization</h4>
            <p className="text-gray-300 text-sm">
              AI suggests increasing validator rewards by 0.3% to maintain optimal network security while managing inflation. Projected impact: +5% network participation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
