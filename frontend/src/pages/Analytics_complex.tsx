import { 
  BoltIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export function Analytics() {
  // Mock data for demonstration
  const fraudAnalysisData = [
    { time: '00:00', transactions: 45, flagged: 3 },
    { time: '04:00', transactions: 52, flagged: 2 },
    { time: '08:00', transactions: 78, flagged: 5 },
    { time: '12:00', transactions: 94, flagged: 7 },
    { time: '16:00', transactions: 89, flagged: 4 },
    { time: '20:00', transactions: 67, flagged: 2 },
  ]

  const riskScoreDistribution = [
    { score: '0-20', count: 1250, color: '#10b981' },
    { score: '21-40', count: 890, color: '#3b82f6' },
    { score: '41-60', count: 456, color: '#f59e0b' },
    { score: '61-80', count: 123, color: '#ef4444' },
    { score: '81-100', count: 45, color: '#dc2626' },
  ]

  const mockAIHealth = {
    status: 'healthy',
    models: [
      { name: 'Fraud Detection', status: 'active', accuracy: 94.2 },
      { name: 'Risk Scoring', status: 'active', accuracy: 91.8 },
      { name: 'Contract Auditor', status: 'active', accuracy: 96.5 },
      { name: 'Anomaly Detection', status: 'active', accuracy: 89.3 },
    ]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white">AI Analytics</h1>
        <p className="mt-2 text-gray-400">
          Real-time security insights powered by artificial intelligence
        </p>
      </div>

      {/* AI Health Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">AI System Health</h2>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-6 w-6 text-green-500" />
              <span className="text-green-500 font-medium">Operational</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {mockAIHealth.models.map((model) => (
              <div key={model.name} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CpuChipIcon className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="font-medium text-white">{model.name}</p>
                    <p className="text-sm text-gray-400">Accuracy: {model.accuracy}%</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-500">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Threat Detection Summary */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Threat Detection Summary</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <ShieldCheckIcon className="h-6 w-6 text-green-500" />
                <span className="text-green-500 font-medium">Clean</span>
              </div>
              <p className="text-2xl font-bold text-white">1,247</p>
              <p className="text-sm text-gray-400">Transactions (24h)</p>
            </div>
            
            <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
                <span className="text-yellow-500 font-medium">Flagged</span>
              </div>
              <p className="text-2xl font-bold text-white">23</p>
              <p className="text-sm text-gray-400">Transactions (24h)</p>
            </div>
            
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                <span className="text-red-500 font-medium">Blocked</span>
              </div>
              <p className="text-2xl font-bold text-white">5</p>
              <p className="text-sm text-gray-400">Transactions (24h)</p>
            </div>
            
            <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <ChartBarIcon className="h-6 w-6 text-blue-500" />
                <span className="text-blue-500 font-medium">Accuracy</span>
              </div>
              <p className="text-2xl font-bold text-white">94.2%</p>
              <p className="text-sm text-gray-400">Detection Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fraud Analysis Chart */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">24-Hour Fraud Analysis</h2>
        <div className="h-64 bg-gray-700 rounded-lg p-4 flex items-end justify-between">
          {fraudAnalysisData.map((data, index) => (
            <div key={data.time} className="flex flex-col items-center space-y-2">
              <div className="flex flex-col items-center space-y-1">
                <div 
                  className="bg-red-500 rounded-t"
                  style={{ 
                    height: `${(data.flagged / Math.max(...fraudAnalysisData.map(d => d.flagged))) * 80}px`,
                    width: '20px'
                  }}
                ></div>
                <div 
                  className="bg-blue-500 rounded-b"
                  style={{ 
                    height: `${(data.transactions / Math.max(...fraudAnalysisData.map(d => d.transactions))) * 80}px`,
                    width: '20px'
                  }}
                ></div>
              </div>
              <span className="text-xs text-gray-400">{data.time}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-400">Total Transactions</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-400">Flagged Transactions</span>
          </div>
        </div>
      </div>

      {/* Risk Score Distribution */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Risk Score Distribution</h2>
        <div className="space-y-4">
          {riskScoreDistribution.map((item) => (
            <div key={item.score} className="flex items-center space-x-4">
              <div className="w-20 text-sm text-gray-400">{item.score}</div>
              <div className="flex-1 bg-gray-700 rounded-full h-4 relative">
                <div 
                  className="h-4 rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: item.color,
                    width: `${(item.count / Math.max(...riskScoreDistribution.map(i => i.count))) * 100}%`
                  }}
                ></div>
              </div>
              <div className="w-16 text-sm text-gray-400 text-right">{item.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent AI Actions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Recent AI Actions</h2>
        <div className="space-y-4">
          {[
            { time: '2 min ago', action: 'Flagged suspicious transaction', hash: '0xabc123...', risk: 'High' },
            { time: '5 min ago', action: 'Contract audit completed', hash: '0xdef456...', risk: 'Low' },
            { time: '8 min ago', action: 'Anomaly detected in block', hash: '0x789xyz...', risk: 'Medium' },
            { time: '12 min ago', action: 'Risk score updated', hash: '0x456abc...', risk: 'Low' },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <BoltIcon className="h-6 w-6 text-yellow-500" />
                <div>
                  <p className="font-medium text-white">{item.action}</p>
                  <p className="text-sm text-gray-400">{item.hash}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.risk === 'High' ? 'bg-red-900 text-red-300' :
                  item.risk === 'Medium' ? 'bg-yellow-900 text-yellow-300' :
                  'bg-green-900 text-green-300'
                }`}>
                  {item.risk}
                </span>
                <p className="text-sm text-gray-400 mt-1">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
