import { 
  CubeIcon, 
  CurrencyDollarIcon,
  UsersIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { useBlockchainStats, useTransactions, useAIHealth } from '../hooks/useAPI'
import { useWalletStore } from '../store/wallet'
import { StatCard } from '../components/StatCard'
import { TransactionList } from '../components/TransactionList'
import { ChartContainer } from '../components/ChartContainer'
import { AIStatusCard } from '../components/AIStatusCard'
import { LoadingSkeleton, CardSkeleton } from '../components/LoadingSkeleton'

export function Dashboard() {
  const { activeAccount } = useWalletStore()
  const { data: stats, isLoading: statsLoading } = useBlockchainStats()
  const { data: transactions, isLoading: txLoading } = useTransactions(
    activeAccount?.address, 
    5
  )
  const { data: aiHealth, isLoading: aiLoading } = useAIHealth()

  const blockchainStats = stats?.data
  const recentTransactions = transactions?.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-gray-400">
          Monitor your Dytallix blockchain activity and network status
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Block Height"
          value={blockchainStats?.block_height?.toLocaleString() || '0'}
          icon={CubeIcon}
          loading={statsLoading}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Total Transactions"
          value={blockchainStats?.total_transactions?.toLocaleString() || '0'}
          icon={CurrencyDollarIcon}
          loading={statsLoading}
          trend={{ value: 8.5, isPositive: true }}
        />
        <StatCard
          title="Network Peers"
          value={blockchainStats?.peer_count?.toString() || '0'}
          icon={UsersIcon}
          loading={statsLoading}
          trend={{ value: 3, isPositive: true }}
        />
        <StatCard
          title="Mempool Size"
          value={blockchainStats?.mempool_size?.toString() || '0'}
          icon={ClockIcon}
          loading={statsLoading}
          trend={{ value: 15, isPositive: false }}
        />
      </div>

      {/* AI Services Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AIStatusCard
          title="Fraud Detection"
          status={aiHealth ? 'operational' : 'unknown'}
          icon={ShieldCheckIcon}
          loading={aiLoading}
          description="Real-time transaction fraud analysis"
        />
        <AIStatusCard
          title="Risk Scoring"
          status={aiHealth ? 'operational' : 'unknown'}
          icon={ArrowTrendingUpIcon}
          loading={aiLoading}
          description="AI-powered risk assessment"
        />
        <AIStatusCard
          title="Contract Analysis"
          status={aiHealth ? 'operational' : 'unknown'}
          icon={CpuChipIcon}
          loading={aiLoading}
          description="Smart contract auditing"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Transactions */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white flex items-center">
              <BoltIcon className="w-5 h-5 mr-2" />
              Recent Transactions
            </h3>
          </div>
          <div className="p-6">
            {txLoading ? (
              <LoadingSkeleton />
            ) : (
              <TransactionList
                transactions={recentTransactions}
                loading={txLoading}
                showHeader={false}
                maxItems={5}
              />
            )}
          </div>
        </div>

        {/* Network Activity Chart */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white flex items-center">
              <ArrowTrendingUpIcon className="w-5 h-5 mr-2" />
              Network Activity
            </h3>
          </div>
          <div className="p-6">
            {statsLoading ? (
              <CardSkeleton />
            ) : (
              <ChartContainer
                data={[
                  { time: '00:00', transactions: 45, blocks: 3 },
                  { time: '04:00', transactions: 52, blocks: 4 },
                  { time: '08:00', transactions: 78, blocks: 5 },
                  { time: '12:00', transactions: 94, blocks: 6 },
                  { time: '16:00', transactions: 89, blocks: 6 },
                  { time: '20:00', transactions: 67, blocks: 4 },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      {/* Post-Quantum Security Status */}
      <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg border border-blue-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-white flex items-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2" />
              Post-Quantum Security Status
            </h3>
            <p className="mt-1 text-blue-200">
              Your network is protected with quantum-resistant cryptography
            </p>
          </div>
          <div className="flex space-x-4 text-sm">
            <div className="text-center">
              <div className="text-green-400 font-semibold">Dilithium</div>
              <div className="text-blue-200">Active</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-semibold">Falcon</div>
              <div className="text-blue-200">Active</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-semibold">SPHINCS+</div>
              <div className="text-blue-200">Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
