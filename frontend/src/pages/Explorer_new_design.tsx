import { useState } from 'react'
import { 
  CubeIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useBlocks, useBlockchainStats, useTransactions } from '../hooks/useAPI'
import { TransactionList } from '../components/TransactionList'
import { format } from 'date-fns'

export function Explorer() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'block' | 'transaction' | 'address'>('all')
  
  const { data: blocks, isLoading: blocksLoading } = useBlocks(10)
  const { data: stats } = useBlockchainStats()
  const { data: transactions, isLoading: txLoading } = useTransactions(undefined, 20)

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    
    // Implement search logic based on query type
    console.log('Searching for:', searchQuery, 'Type:', searchType)
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
            <CubeIcon className="w-12 h-12 mr-4" />
            Blockchain Explorer
          </h1>
          <p className="text-lg text-gray-300">
            Explore blocks, transactions, and addresses on the Dytallix network
          </p>
        </motion.div>
      </section>

      {/* Search */}
      <section className="max-w-6xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Card className="bg-gray-900 border-gray-800 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by block number, transaction hash, or address..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="px-3 py-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="block">Blocks</option>
                    <option value="transaction">Transactions</option>
                    <option value="address">Addresses</option>
                  </select>
                  
                  <Button
                    onClick={handleSearch}
                    className="px-6 py-3 rounded-md flex items-center"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Network Overview */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Latest Block",
              value: stats?.data?.block_height?.toLocaleString() || '0',
              color: "text-blue-400",
              icon: CubeIcon
            },
            {
              title: "Total Transactions", 
              value: stats?.data?.total_transactions?.toLocaleString() || '0',
              color: "text-green-400",
              icon: ArrowRightIcon
            },
            {
              title: "Block Time",
              value: "~6s",
              color: "text-purple-400",
              icon: ClockIcon
            }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
            >
              <Card className="bg-gray-900 border-gray-800 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">{stat.title}</p>
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Blocks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <CubeIcon className="w-5 h-5 mr-2" />
                  Recent Blocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blocksLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-700 rounded w-1/2 mt-2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blocks?.data?.slice(0, 10).map((block: any) => (
                      <div
                        key={block.height}
                        className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-medium text-white">Block #{block.height}</div>
                          <div className="text-sm text-gray-400">
                            {block.transactions?.length || 0} transactions
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">
                            {format(new Date(block.timestamp), 'HH:mm:ss')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {block.hash?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <ArrowRightIcon className="w-5 h-5 mr-2" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionList
                  transactions={transactions?.data || []}
                  loading={txLoading}
                  showHeader={false}
                  maxItems={10}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
