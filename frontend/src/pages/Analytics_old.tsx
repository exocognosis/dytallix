
import { 
  BoltIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useAIHealth } from '../hooks/useAPI'
import { ChartContainer } from '../components/ChartContainer'
import { AIStatusCard } from '../components/AIStatusCard'

export function Analytics() {
  const { data: aiHealth, isLoading: healthLoading } = useAIHealth()
  // const { data: aiStats, isLoading: statsLoading } = useAIStatistics()

  // Mock data for charts - in real app this would come from API
  const fraudAnalysisData = [
    { time: '00:00', transactions: 45, flagged: 3 },
    { time: '04:00', transactions: 52, flagged: 2 },
    { time: '08:00', transactions: 78, flagged: 5 },
    { time: '12:00', transactions: 94, flagged: 7 },
    { time: '16:00', transactions: 89, flagged: 4 },
    { time: '20:00', transactions: 67, flagged: 2 },
  ]

  const riskScoreDistribution = [
    { score: '0-20', count: 1250 },
    { score: '21-40', count: 890 },
    { score: '41-60', count: 456 },
    { score: '61-80', count: 234 },
    { score: '81-100', count: 67 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <BoltIcon className="w-8 h-8 mr-3" />
          AI Analytics Dashboard
        </h1>
        <p className="mt-2 text-gray-400">
          Real-time insights from AI-powered blockchain analysis
        </p>
      </div>

      {/* AI Services Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AIStatusCard
          title="Fraud Detection"
          status={aiHealth ? 'operational' : 'unknown'}
          icon={ShieldCheckIcon}
          loading={healthLoading}
          description="Real-time fraud analysis"
        />
        <AIStatusCard
          title="Risk Scoring"
          status={aiHealth ? 'operational' : 'unknown'}
          icon={ChartBarIcon}
          loading={healthLoading}
          description="Transaction risk assessment"
        />
        <AIStatusCard
          title="Contract Audit"
          status={aiHealth ? 'operational' : 'unknown'}
          icon={CpuChipIcon}
          loading={healthLoading}
          description="Smart contract analysis"
        />
        <AIStatusCard
          title="Anomaly Detection"
          status={aiHealth ? 'operational' : 'unknown'}
          icon={ExclamationTriangleIcon}
          loading={healthLoading}
          description="Network behavior monitoring"
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Transactions Analyzed</h3>
              <p className="text-2xl font-bold text-white mt-1">2,847</p>
              <p className="text-xs text-green-400 mt-1">+12% from yesterday</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Fraud Detected</h3>
              <p className="text-2xl font-bold text-white mt-1">23</p>
              <p className="text-xs text-red-400 mt-1">+3 from yesterday</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Average Risk Score</h3>
              <p className="text-2xl font-bold text-white mt-1">15.4</p>
              <p className="text-xs text-green-400 mt-1">-2.1 from yesterday</p>
            </div>
            <ShieldCheckIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400">AI Accuracy</h3>
              <p className="text-2xl font-bold text-white mt-1">94.2%</p>
              <p className="text-xs text-green-400 mt-1">+0.3% from yesterday</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Analysis Over Time */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Fraud Detection Over Time</h3>
            <p className="text-sm text-gray-400">Transactions analyzed vs flagged for fraud</p>
          </div>
          <div className="p-6">
            <ChartContainer data={fraudAnalysisData} />
          </div>
        </div>

        {/* Risk Score Distribution */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Risk Score Distribution</h3>
            <p className="text-sm text-gray-400">Distribution of transaction risk scores</p>
          </div>
          <div className="p-6">
            <ChartContainer 
              data={riskScoreDistribution.map(item => ({ 
                time: item.score, 
                transactions: item.count, 
                blocks: 0 
              }))} 
              type="bar" 
            />
          </div>
        </div>
      </div>

      {/* Recent AI Alerts */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Recent AI Alerts</h3>
          <p className="text-sm text-gray-400">Latest security and risk notifications</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              {
                type: 'fraud',
                message: 'High-risk transaction detected from address dyt1abc...def',
                timestamp: '2 minutes ago',
                severity: 'high'
              },
              {
                type: 'anomaly',
                message: 'Unusual transaction pattern detected in smart contract dyt1contract...123',
                timestamp: '15 minutes ago',
                severity: 'medium'
              },
              {
                type: 'risk',
                message: 'Address dyt1risk...456 flagged for potential money laundering',
                timestamp: '1 hour ago',
                severity: 'high'
              },
              {
                type: 'audit',
                message: 'Smart contract audit completed for dyt1smart...789',
                timestamp: '2 hours ago',
                severity: 'low'
              }
            ].map((alert, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-gray-700 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  alert.severity === 'high' ? 'bg-red-400' :
                  alert.severity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                }`} />
                <div className="flex-1">
                  <p className="text-white text-sm">{alert.message}</p>
                  <p className="text-gray-400 text-xs mt-1">{alert.timestamp}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  alert.severity === 'high' ? 'bg-red-900/50 text-red-400' :
                  alert.severity === 'medium' ? 'bg-yellow-900/50 text-yellow-400' : 
                  'bg-green-900/50 text-green-400'
                }`}>
                  {alert.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
