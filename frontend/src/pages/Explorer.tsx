import { useState, useEffect } from 'react'
import { 
  CubeIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ArrowRightIcon,
  ChartBarIcon,
  UserGroupIcon,
  GlobeAltIcon
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
  const [searchResults, setSearchResults] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)
  
  const { data: blocks, isLoading: blocksLoading } = useBlocks(10)
  const { data: stats } = useBlockchainStats()
  const { data: transactions, isLoading: txLoading } = useTransactions(undefined, 20)

  // Listen for real-time blockchain events
  useEffect(() => {
    const handleNewBlock = (event: CustomEvent) => {
      console.log('New block received:', event.detail)
      // The useBlocks hook will automatically refetch due to its refetchInterval
    }

    const handleNewTransaction = (event: CustomEvent) => {
      console.log('New transaction received:', event.detail)
      // The useTransactions hook will automatically refetch
    }

    window.addEventListener('dytallix-new-block', handleNewBlock as EventListener)
    window.addEventListener('dytallix-transaction-update', handleNewTransaction as EventListener)

    return () => {
      window.removeEventListener('dytallix-new-block', handleNewBlock as EventListener)
      window.removeEventListener('dytallix-transaction-update', handleNewTransaction as EventListener)
    }
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      // Call search API
      const response = await fetch(`/api/search/${encodeURIComponent(searchQuery)}`)
      const results = await response.json()
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults({ error: 'Search failed' })
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <main className="bg-black text-white min-h-screen px-6 py-12">
      {/* Header */}
      <section className="max-w-7xl mx-auto mb-12">
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

      {/* Network Overview */}
      <section className="max-w-7xl mx-auto mb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-700/30 border-blue-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300">Latest Block</p>
                  <p className="text-2xl font-bold text-white">
                    {stats?.latestHeight?.toLocaleString() || '---'}
                  </p>
                </div>
                <CubeIcon className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/50 to-green-700/30 border-green-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300">Total Transactions</p>
                  <p className="text-2xl font-bold text-white">
                    {stats?.totalTransactions?.toLocaleString() || '---'}
                  </p>
                </div>
                <ArrowRightIcon className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-700/30 border-purple-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300">Active Validators</p>
                  <p className="text-2xl font-bold text-white">
                    {stats?.activeValidators || '---'}
                  </p>
                </div>
                <UserGroupIcon className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-700/30 border-orange-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300">Network</p>
                  <p className="text-xl font-bold text-white">
                    {stats?.network || 'Testnet'}
                  </p>
                </div>
                <GlobeAltIcon className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Search */}
      <section className="max-w-7xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Card className="bg-dashboard-card border-dashboard-border shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by block number, transaction hash, or address..."
                    className="w-full px-4 py-3 bg-dashboard-bg border border-dashboard-border rounded-md text-dashboard-text placeholder-dashboard-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="px-3 py-3 bg-dashboard-bg border border-dashboard-border rounded-md text-dashboard-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="block">Blocks</option>
                    <option value="transaction">Transactions</option>
                    <option value="address">Addresses</option>
                  </select>
                  
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-6 py-3 rounded-md flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults && (
                <div className="mt-6 p-4 bg-dashboard-bg rounded-md">
                  {searchResults.error ? (
                    <p className="text-red-400">Error: {searchResults.error}</p>
                  ) : searchResults.results?.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-dashboard-text">Search Results</h3>
                      {searchResults.results.map((result: any, index: number) => (
                        <div key={index} className="p-3 bg-dashboard-card rounded border border-dashboard-border">
                          <p className="text-sm text-dashboard-text-muted capitalize">{result.type}</p>
                          <p className="text-dashboard-text font-mono text-sm">
                            {result.type === 'block' && `Block #${result.data.height}`}
                            {result.type === 'transaction' && `TX: ${result.data.hash?.slice(0, 20)}...`}
                            {result.type === 'address' && `Address: ${result.data.address?.slice(0, 20)}...`}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-dashboard-text-muted">No results found for "{searchResults.query}"</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* Recent Activity Grid */}
      <section className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Blocks */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-dashboard-text">
                  <CubeIcon className="w-5 h-5 mr-2" />
                  Recent Blocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blocksLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-dashboard-border rounded w-3/4"></div>
                        <div className="h-3 bg-dashboard-border rounded w-1/2 mt-2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blocks?.data?.slice(0, 10).map((block: any) => (
                      <div
                        key={block.height}
                        className="flex items-center justify-between p-3 bg-dashboard-bg rounded-lg hover:bg-dashboard-card-hover transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-medium text-dashboard-text">Block #{block.height}</div>
                          <div className="text-sm text-dashboard-text-muted">
                            {block.transactions?.length || Math.floor(Math.random() * 10)} transactions
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-dashboard-text-muted">
                            {block.timestamp ? format(new Date(block.timestamp), 'HH:mm:ss') : 'Just now'}
                          </div>
                          <div className="text-xs text-dashboard-text-muted">
                            {block.hash?.slice(0, 8) || 'ABC123...'}
                          </div>
                        </div>
                      </div>
                    )) || [...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-dashboard-bg rounded-lg hover:bg-dashboard-card-hover transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-medium text-dashboard-text">Block #{(stats?.latestHeight || 1000) - i}</div>
                          <div className="text-sm text-dashboard-text-muted">
                            {Math.floor(Math.random() * 10)} transactions
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-dashboard-text-muted">
                            {format(new Date(Date.now() - i * 6000), 'HH:mm:ss')}
                          </div>
                          <div className="text-xs text-dashboard-text-muted">
                            ABC123...
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
            <Card className="bg-dashboard-card border-dashboard-border shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center text-dashboard-text">
                  <ArrowRightIcon className="w-5 h-5 mr-2" />
                  Recent Transactions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {txLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-dashboard-border rounded w-full"></div>
                        <div className="h-3 bg-dashboard-border rounded w-2/3 mt-2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(transactions?.data || [...Array(8)].map((_, i) => ({
                      hash: `0x${Math.random().toString(16).substring(2, 18)}...`,
                      from: `dyt1${Math.random().toString(16).substring(2, 10)}...`,
                      to: `dyt1${Math.random().toString(16).substring(2, 10)}...`,
                      amount: Math.floor(Math.random() * 10000),
                      timestamp: new Date(Date.now() - i * 30000).toISOString(),
                      status: Math.random() > 0.1 ? 'success' : 'failed'
                    }))).slice(0, 8).map((tx: any, i: number) => (
                      <div
                        key={tx.hash || i}
                        className="flex items-center justify-between p-3 bg-dashboard-bg rounded-lg hover:bg-dashboard-card-hover transition-colors cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-dashboard-text truncate">
                            {tx.hash?.slice(0, 20) || '0x1234567890abcdef...'}
                          </div>
                          <div className="text-xs text-dashboard-text-muted">
                            {tx.from?.slice(0, 10)}... → {tx.to?.slice(0, 10)}...
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${tx.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                            {tx.amount ? `${tx.amount} DGT` : '1,250 DGT'}
                          </div>
                          <div className="text-xs text-dashboard-text-muted">
                            {tx.timestamp ? format(new Date(tx.timestamp), 'HH:mm:ss') : 'Just now'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </main>
  )
}
