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
    <main className="bg-dashboard-bg text-dashboard-text min-h-screen px-6 py-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <section className="mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }}
            className="text-center space-y-4"
          >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-dashboard-text">
            🚀 Dytallix Performance Dashboard
          </h1>
          <p className="text-lg text-dashboard-text-muted">
            Real-time system monitoring & service health
          </p>
        </motion.div>
      </section>

      {/* System Metrics Charts */}
      <section className="mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-2xl font-bold mb-6 text-dashboard-text"
        >
          System Performance Metrics
        </motion.h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* System Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover">
              <CardHeader>
                <CardTitle className="flex items-center text-dashboard-text">
                  <CpuChipIcon className="w-5 h-5 mr-2 text-primary-400" />
                  System Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  data={[
                    { time: '08:00', cpu: 23, requests: 45 },
                    { time: '08:30', cpu: 31, requests: 67 },
                    { time: '09:00', cpu: 42, requests: 89 },
                    { time: '09:30', cpu: 45, requests: 102 },
                    { time: '10:00', cpu: 48, requests: 125 },
                    { time: '10:30', cpu: 61, requests: 145 },
                    { time: '11:00', cpu: 64, requests: 167 },
                    { time: '11:30', cpu: 72, requests: 189 },
                    { time: '12:00', cpu: 75, requests: 203 },
                    { time: '12:30', cpu: 68, requests: 185 },
                    { time: '13:00', cpu: 59, requests: 156 },
                    { time: '13:30', cpu: 51, requests: 128 },
                  ]}
                  lines={[
                    { dataKey: 'cpu', stroke: '#3b82f6', name: 'CPU %' },
                    { dataKey: 'requests', stroke: '#8b5cf6', name: 'Requests/min' }
                  ]}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Memory Allocation Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover">
              <CardHeader>
                <CardTitle className="flex items-center text-dashboard-text">
                  <CubeIcon className="w-5 h-5 mr-2 text-quantum-400" />
                  Memory Allocation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  data={[
                    { time: '08:00', used: 1.8, available: 6.2 },
                    { time: '08:30', used: 2.1, available: 5.9 },
                    { time: '09:00', used: 2.6, available: 5.4 },
                    { time: '09:30', used: 3.1, available: 4.9 },
                    { time: '10:00', used: 3.7, available: 4.3 },
                    { time: '10:30', used: 4.2, available: 3.8 },
                    { time: '11:00', used: 4.8, available: 3.2 },
                    { time: '11:30', used: 5.3, available: 2.7 },
                    { time: '12:00', used: 4.7, available: 3.3 },
                    { time: '12:30', used: 4.1, available: 3.9 },
                    { time: '13:00', used: 3.5, available: 4.5 },
                    { time: '13:30', used: 2.9, available: 5.1 },
                  ]}
                  lines={[
                    { dataKey: 'used', stroke: '#f59e0b', name: 'Used (GB)' },
                    { dataKey: 'available', stroke: '#10b981', name: 'Available (GB)' }
                  ]}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* On-Chain Activity Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover">
              <CardHeader>
                <CardTitle className="flex items-center text-dashboard-text">
                  <BoltIcon className="w-5 h-5 mr-2 text-primary-500" />
                  On-Chain Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  data={[
                    { time: '08:00', transactions: 12, blocks: 1, volume: 3.2 },
                    { time: '08:30', transactions: 25, blocks: 2, volume: 6.8 },
                    { time: '09:00', transactions: 42, blocks: 3, volume: 12.4 },
                    { time: '09:30', transactions: 47, blocks: 3, volume: 14.8 },
                    { time: '10:00', transactions: 61, blocks: 4, volume: 19.2 },
                    { time: '10:30', transactions: 67, blocks: 5, volume: 21.7 },
                    { time: '11:00', transactions: 84, blocks: 6, volume: 28.4 },
                    { time: '11:30', transactions: 96, blocks: 7, volume: 34.6 },
                    { time: '12:00', transactions: 94, blocks: 7, volume: 33.1 },
                    { time: '12:30', transactions: 79, blocks: 5, volume: 26.2 },
                    { time: '13:00', transactions: 65, blocks: 4, volume: 20.1 },
                    { time: '13:30', transactions: 51, blocks: 3, volume: 15.4 },
                  ]}
                  lines={[
                    { dataKey: 'transactions', stroke: '#ef4444', name: 'Transactions' },
                    { dataKey: 'blocks', stroke: '#06b6d4', name: 'Blocks' },
                    { dataKey: 'volume', stroke: '#8b5cf6', name: 'Volume (DYT)' }
                  ]}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="mb-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Block Height",
              value: blockchainStats?.block_height?.toLocaleString() || '0',
              icon: CubeIcon,
              color: "text-primary-400",
              trend: { value: 12, isPositive: true }
            },
            {
              title: "Total Transactions", 
              value: blockchainStats?.total_transactions?.toLocaleString() || '0',
              icon: CurrencyDollarIcon,
              color: "text-primary-500",
              trend: { value: 8.5, isPositive: true }
            },
            {
              title: "Network Peers",
              value: blockchainStats?.peer_count?.toString() || '0',
              icon: UsersIcon,
              color: "text-quantum-400",
              trend: { value: 3, isPositive: true }
            },
            {
              title: "Mempool Size",
              value: blockchainStats?.mempool_size?.toString() || '0',
              icon: ClockIcon,
              color: "text-quantum-500",
              trend: { value: 15, isPositive: false }
            }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-dashboard-text-gray">{stat.title}</p>
                      <p className="text-2xl font-bold text-dashboard-text">{stat.value}</p>
                      {stat.trend && (
                        <p className={`text-sm ${stat.trend.isPositive ? 'text-primary-400' : 'text-red-400'}`}>
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
      <section className="mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-dashboard-text"
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
              color: "text-primary-400"
            }
          ].map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-dashboard-text">{service.title}</h3>
                    <service.icon className={`w-6 h-6 ${service.color}`} />
                  </div>
                  <p className="text-dashboard-text-gray text-sm mb-3">{service.description}</p>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${service.status === 'operational' ? 'bg-dashboard-success pulse-green' : 'bg-dashboard-text-gray'}`}></div>
                    <span className={`text-sm ${service.status === 'operational' ? 'text-dashboard-success' : 'text-dashboard-text-gray'}`}>
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
      <section className="mb-12">
        <motion.h2 
          initial={{ opacity: 0 }} 
          whileInView={{ opacity: 1 }} 
          viewport={{ once: true }} 
          className="text-2xl font-bold mb-6 text-dashboard-text"
        >
          AI Modules Performance
        </motion.h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 mb-8" style={{gridTemplateRows: 'repeat(2, 1fr)'}}>
          {[
            { name: "Risk Assessment", icon: ShieldCheckIcon, color: "text-red-400", status: "active" },
            { name: "Fraud Detection", icon: ArrowTrendingUpIcon, color: "text-orange-400", status: "active" },
            { name: "Pattern Analysis", icon: CpuChipIcon, color: "text-primary-400", status: "active" },
            { name: "Smart Routing", icon: BoltIcon, color: "text-primary-500", status: "active" },
            { name: "Anomaly Detection", icon: UsersIcon, color: "text-quantum-400", status: "active" },
            { name: "Predictive Analytics", icon: ClockIcon, color: "text-quantum-500", status: "active" },
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
              <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover transition-all duration-200">
                <CardContent className="p-4 text-center">
                  <module.icon className={`w-8 h-8 mx-auto mb-3 ${module.color}`} />
                  <h3 className="text-sm font-medium text-dashboard-text mb-2">{module.name}</h3>
                  <div className="flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-dashboard-success mr-2 pulse-green"></div>
                    <span className="text-xs text-dashboard-success">Active</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="mb-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover">
              <CardHeader>
                <CardTitle className="flex items-center text-dashboard-text">
                  <BoltIcon className="w-5 h-5 mr-2 text-primary-400" />
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
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg dashboard-card hover:bg-dashboard-card-hover hover:border-dashboard-border-hover">
              <CardHeader>
                <CardTitle className="flex items-center text-dashboard-text">
                  <ArrowTrendingUpIcon className="w-5 h-5 mr-2 text-quantum-400" />
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
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-dashboard-card to-dashboard-card-hover border-dashboard-border-hover shadow-lg glow-green">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-dashboard-text flex items-center">
                    <ShieldCheckIcon className="w-5 h-5 mr-2 text-primary-400" />
                    Post-Quantum Security Status
                  </h3>
                  <p className="mt-1 text-dashboard-text-muted">
                    Your network is protected with quantum-resistant cryptography
                  </p>
                </div>
                <div className="flex space-x-4 text-sm">
                  <div className="text-center">
                    <div className="text-dashboard-success font-semibold">Dilithium</div>
                    <div className="text-dashboard-text-muted">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-dashboard-success font-semibold">Falcon</div>
                    <div className="text-dashboard-text-muted">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-dashboard-success font-semibold">SPHINCS+</div>
                    <div className="text-dashboard-text-muted">Active</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>
      </div>
    </main>
  )
}
