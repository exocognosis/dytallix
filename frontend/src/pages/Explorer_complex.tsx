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
        <h1 className="text-3xl font-bold text-white">Blockchain Explorer</h1>
        <p className="mt-2 text-gray-400">
          Explore blocks, transactions, and addresses on the Dytallix network
        </p>
      </div>

      {/* Search */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by block height, transaction hash, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="block">Blocks</option>
              <option value="transaction">Transactions</option>
              <option value="address">Addresses</option>
            </select>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <CubeIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-400">Current Block</p>
              <p className="text-2xl font-bold text-white">12,345</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <ArrowRightIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-white">1,234,567</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-400">Pending Transactions</p>
              <p className="text-2xl font-bold text-white">42</p>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Blocks */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Latest Blocks</h2>
        <div className="space-y-4">
          {mockBlocks.map((block) => (
            <div key={block.height} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <div className="flex items-center space-x-4">
                <CubeIcon className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium text-white">Block #{block.height}</p>
                  <p className="text-sm text-gray-400">{block.hash}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">{new Date(block.timestamp).toLocaleTimeString()}</p>
                <p className="text-sm text-gray-400">{block.transactions} transactions</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Transactions */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Latest Transactions</h2>
        <div className="space-y-4">
          {mockTransactions.map((tx) => (
            <div key={tx.hash} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <div className="flex items-center space-x-4">
                <ArrowRightIcon className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-white">{tx.hash}</p>
                  <p className="text-sm text-gray-400">{tx.from} → {tx.to}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">{tx.amount}</p>
                <p className="text-sm text-gray-400">{new Date(tx.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
