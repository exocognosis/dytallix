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
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useBlockchainStats, useTransactions, useAIHealth } from '../hooks/useAPI'
import { useWalletStore } from '../store/wallet'
import { TransactionList } from '../components/TransactionList'
import { ChartContainer } from '../components/ChartContainer'
import { LoadingSkeleton, CardSkeleton } from '../components/LoadingSkeleton'

export function Dashboard() {
  const { activeAccount } = useWalletStore()
  const { data: stats, isLoading: statsLoading } = useBlockchainStats()
  const { data: transactions, isLoading: txLoading } = useTransactions(
    activeAccount?.address, 
    5
  )
  const { data: aiHealth } = useAIHealth()

  const blockchainStats = stats?.data
  const recentTransactions = transactions?.data || []

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
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-lg text-gray-300">
            Monitor your Dytallix blockchain activity and network status
          </p>
        </motion.div>
      </section>

      {/* Stats Grid */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Block Height",
              value: blockchainStats?.block_height?.toLocaleString() || '0',
              icon: CubeIcon,
              color: "text-blue-400",
              trend: { value: 12, isPositive: true }
            },
            {
              title: "Total Transactions", 
              value: blockchainStats?.total_transactions?.toLocaleString() || '0',
              icon: CurrencyDollarIcon,
              color: "text-green-400",
              trend: { value: 8.5, isPositive: true }
            },
            {
              title: "Network Peers",
              value: blockchainStats?.peer_count?.toString() || '0',
              icon: UsersIcon,
              color: "text-purple-400",
              trend: { value: 3, isPositive: true }
            },
            {
              title: "Mempool Size",
              value: blockchainStats?.mempool_size?.toString() || '0',
              icon: ClockIcon,
              color: "text-cyan-400",
              trend: { value: 15, isPositive: false }
            }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className="bg-gray-900 border-gray-800 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">{stat.title}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                      {stat.trend && (
                        <p className={`text-sm ${stat.trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {stat.trend.isPositive ? '+' : '-'}{stat.trend.value}%
                        </p>
                      )}
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI Services Status */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6"
        >
          AI Services Status
        </motion.h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            {
              title: "Fraud Detection",
              status: aiHealth ? 'operational' : 'unknown',
              icon: ShieldCheckIcon,
              description: "Real-time transaction fraud analysis",
              color: "text-red-400"
            },
            {
              title: "Risk Scoring",
              status: aiHealth ? 'operational' : 'unknown', 
              icon: ArrowTrendingUpIcon,
              description: "AI-powered risk assessment",
              color: "text-yellow-400"
            },
            {
              title: "Contract Analysis",
              status: aiHealth ? 'operational' : 'unknown',
              icon: CpuChipIcon,
              description: "Smart contract auditing",
              color: "text-blue-400"
            }
          ].map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className="bg-gray-900 border-gray-800 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                    <service.icon className={`w-6 h-6 ${service.color}`} />
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{service.description}</p>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${service.status === 'operational' ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <span className={`text-sm ${service.status === 'operational' ? 'text-green-400' : 'text-gray-400'}`}>
                      {service.status === 'operational' ? 'Operational' : 'Unknown'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AI Modules Grid */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6"
        >
          AI Modules
        </motion.h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 mb-8" style={{gridTemplateRows: 'repeat(2, 1fr)'}}>
          {[
            { name: "Risk Assessment", icon: ShieldCheckIcon, color: "text-red-400", status: "active" },
            { name: "Fraud Detection", icon: ArrowTrendingUpIcon, color: "text-orange-400", status: "active" },
            { name: "Pattern Analysis", icon: CpuChipIcon, color: "text-blue-400", status: "active" },
            { name: "Smart Routing", icon: BoltIcon, color: "text-green-400", status: "active" },
            { name: "Anomaly Detection", icon: UsersIcon, color: "text-purple-400", status: "active" },
            { name: "Predictive Analytics", icon: ClockIcon, color: "text-cyan-400", status: "active" },
            { name: "ML Optimization", icon: CubeIcon, color: "text-yellow-400", status: "active" },
            { name: "Neural Networks", icon: CurrencyDollarIcon, color: "text-pink-400", status: "active" }
          ].map((module, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="bg-gray-900 border-gray-800 shadow-lg hover:border-gray-700 transition-all duration-200">
                <CardContent className="p-4 text-center">
                  <module.icon className={`w-8 h-8 mx-auto mb-3 ${module.color}`} />
                  <h3 className="text-sm font-medium text-white mb-2">{module.name}</h3>
                  <div className="flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                    <span className="text-xs text-green-400">Active</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <BoltIcon className="w-5 h-5 mr-2" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </motion.div>

          {/* Network Activity Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <ArrowTrendingUpIcon className="w-5 h-5 mr-2" />
                  Network Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Post-Quantum Security Status */}
      <section className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700/50 shadow-lg">
            <CardContent className="p-6">
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
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </main>
  )
}
