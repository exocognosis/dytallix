import { useState } from 'react'
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  FireIcon,
  TrophyIcon,
  GiftIcon,
  ScaleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

export function Tokenomics() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h')

  // Mock data for demonstration
  const mockMetrics = {
    totalSupply: 1000000000,
    circulatingSupply: 750000000,
    marketCap: 450000000,
    price: 0.60,
    priceChange24h: 5.2,
    volume24h: 12500000,
    stakingRatio: 0.45,
    burnedTokens: 25000000
  }

  const mockBalance = {
    total: 1250.75,
    staked: 800.50,
    available: 450.25,
    rewards: 12.35
  }

  const distributionData = [
    { category: 'Public Sale', percentage: 35, color: '#3b82f6' },
    { category: 'Team & Advisors', percentage: 20, color: '#8b5cf6' },
    { category: 'Development', percentage: 15, color: '#10b981' },
    { category: 'Marketing', percentage: 10, color: '#f59e0b' },
    { category: 'Staking Rewards', percentage: 15, color: '#ef4444' },
    { category: 'Reserve', percentage: 5, color: '#6b7280' }
  ]

  const emissionSchedule = [
    { year: '2025', tokens: 100000000, inflation: 10 },
    { year: '2026', tokens: 90000000, inflation: 9 },
    { year: '2027', tokens: 81000000, inflation: 8.1 },
    { year: '2028', tokens: 72900000, inflation: 7.3 },
    { year: '2029', tokens: 65610000, inflation: 6.6 }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white">Tokenomics</h1>
        <p className="mt-2 text-gray-400">
          DTX token economics, distribution, and governance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">DTX Price</p>
              <p className="text-2xl font-bold text-white">${mockMetrics.price.toFixed(3)}</p>
            </div>
            <div className={`flex items-center space-x-1 ${mockMetrics.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {mockMetrics.priceChange24h >= 0 ? (
                <ArrowUpIcon className="h-4 w-4" />
              ) : (
                <ArrowDownIcon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{Math.abs(mockMetrics.priceChange24h)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-400">Market Cap</p>
              <p className="text-2xl font-bold text-white">${(mockMetrics.marketCap / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-400">24h Volume</p>
              <p className="text-2xl font-bold text-white">${(mockMetrics.volume24h / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <FireIcon className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm text-gray-400">Tokens Burned</p>
              <p className="text-2xl font-bold text-white">{(mockMetrics.burnedTokens / 1000000).toFixed(1)}M</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Balance */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Your DTX Holdings</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Balance</p>
            <p className="text-xl font-bold text-white">{mockBalance.total.toLocaleString()} DTX</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400">Staked</p>
            <p className="text-xl font-bold text-blue-400">{mockBalance.staked.toLocaleString()} DTX</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400">Available</p>
            <p className="text-xl font-bold text-green-400">{mockBalance.available.toLocaleString()} DTX</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-400">Pending Rewards</p>
            <p className="text-xl font-bold text-yellow-400">{mockBalance.rewards.toLocaleString()} DTX</p>
          </div>
        </div>
      </div>

      {/* Supply Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Supply Information</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Supply</span>
              <span className="text-white font-bold">{(mockMetrics.totalSupply / 1000000).toFixed(0)}M DTX</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Circulating Supply</span>
              <span className="text-white font-bold">{(mockMetrics.circulatingSupply / 1000000).toFixed(0)}M DTX</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Staking Ratio</span>
              <span className="text-white font-bold">{(mockMetrics.stakingRatio * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${(mockMetrics.circulatingSupply / mockMetrics.totalSupply) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-400">
              {((mockMetrics.circulatingSupply / mockMetrics.totalSupply) * 100).toFixed(1)}% of total supply in circulation
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Token Distribution</h2>
          <div className="space-y-3">
            {distributionData.map((item) => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-300">{item.category}</span>
                </div>
                <span className="text-white font-medium">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emission Schedule */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Emission Schedule</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Year</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">New Tokens</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Inflation Rate</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {emissionSchedule.map((item) => (
                <tr key={item.year} className="border-b border-gray-700">
                  <td className="py-3 px-4 text-white font-medium">{item.year}</td>
                  <td className="py-3 px-4 text-white">{(item.tokens / 1000000).toFixed(0)}M DTX</td>
                  <td className="py-3 px-4 text-white">{item.inflation.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-gray-400">Staking Rewards (70%), Development (30%)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Governance */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Governance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <ScaleIcon className="h-6 w-6 text-blue-500" />
              <span className="text-white font-medium">Voting Power</span>
            </div>
            <p className="text-2xl font-bold text-white">0.08%</p>
            <p className="text-sm text-gray-400">Based on staked DTX</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <TrophyIcon className="h-6 w-6 text-yellow-500" />
              <span className="text-white font-medium">Active Proposals</span>
            </div>
            <p className="text-2xl font-bold text-white">3</p>
            <p className="text-sm text-gray-400">Available for voting</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <GiftIcon className="h-6 w-6 text-green-500" />
              <span className="text-white font-medium">Staking APY</span>
            </div>
            <p className="text-2xl font-bold text-white">12.5%</p>
            <p className="text-sm text-gray-400">Current annual yield</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Stake DTX
        </button>
        <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
          Claim Rewards
        </button>
        <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
          View Proposals
        </button>
        <button className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors">
          Transfer DTX
        </button>
      </div>
    </div>
  )
}
