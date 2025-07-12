import { useState } from 'react'
import { 
  CubeIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export function Explorer() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'block' | 'transaction' | 'address'>('all')

  const handleSearch = () => {
    if (!searchQuery.trim()) return
    console.log('Searching for:', searchQuery, 'Type:', searchType)
  }

  // Mock data for demonstration
  const mockBlocks = [
    { height: 12345, hash: '0x1abc...def', timestamp: Date.now() - 30000, transactions: 15 },
    { height: 12344, hash: '0x2abc...def', timestamp: Date.now() - 60000, transactions: 23 },
    { height: 12343, hash: '0x3abc...def', timestamp: Date.now() - 90000, transactions: 8 },
  ]

  const mockTransactions = [
    { hash: '0xa1b2...c3d4', from: '0x1234...5678', to: '0x9abc...def0', amount: '1.25 DTX', timestamp: Date.now() - 15000 },
    { hash: '0xb2c3...d4e5', from: '0x2345...6789', to: '0xabcd...ef01', amount: '0.75 DTX', timestamp: Date.now() - 45000 },
    { hash: '0xc3d4...e5f6', from: '0x3456...789a', to: '0xbcde...f012', amount: '2.10 DTX', timestamp: Date.now() - 75000 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <CubeIcon className="w-8 h-8 mr-3" />
          Blockchain Explorer
        </h1>
        <p className="mt-2 text-gray-400">
          Explore blocks, transactions, and addresses on the Dytallix network
        </p>
      </div>

      {/* Search */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
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
              <option value="block">Block</option>
              <option value="transaction">Transaction</option>
              <option value="address">Address</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Network Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Latest Block</h3>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                #{stats?.data?.block_height?.toLocaleString() || 0}
              </p>
            </div>
            <CubeIcon className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Total Transactions</h3>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {stats?.data?.total_transactions?.toLocaleString() || 0}
              </p>
            </div>
            <ArrowRightIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Pending Transactions</h3>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {stats?.data?.mempool_size || 0}
              </p>
            </div>
            <ClockIcon className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Latest Blocks and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Blocks */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Latest Blocks</h3>
          </div>
          <div className="p-6">
            {blocksLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-600 rounded w-32"></div>
                        <div className="h-3 bg-gray-600 rounded w-24"></div>
                      </div>
                      <div className="h-4 bg-gray-600 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : blocks?.data ? (
              <div className="space-y-3">
                {blocks.data.slice(0, 10).map((block) => (
                  <div
                    key={block.hash}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">#{block.number}</span>
                        <span className="text-xs text-gray-400">
                          {format(new Date(block.timestamp * 1000), 'MMM d, HH:mm')}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-xs text-gray-400">
                          {block.transactions.length} transactions
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">
                      {block.hash.slice(0, 8)}...{block.hash.slice(-6)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No blocks found
              </div>
            )}
          </div>
        </div>

        {/* Latest Transactions */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Latest Transactions</h3>
          </div>
          <div className="p-6">
            <TransactionList
              transactions={transactions?.data || []}
              loading={txLoading}
              showHeader={false}
              maxItems={10}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
