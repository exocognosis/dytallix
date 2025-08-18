import { useState, useEffect } from 'react'
import { 
  ShieldCheckIcon,
  TrophyIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  BoltIcon,
  PlusIcon,
  ArrowRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { useStakingData } from '../hooks/useAPI'
import { format } from 'date-fns'

interface Validator {
  address: string
  moniker: string
  votingPower: number
  commission: number
  status: 'active' | 'inactive' | 'jailed'
  selfStake: number
  totalStake: number
  delegators: number
  uptime: number
  recentBlocks: number
}

interface Delegation {
  validatorAddress: string
  validatorMoniker: string
  stakedAmount: number
  rewards: number
  status: 'active' | 'unbonding'
}

export function Staking() {
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null)
  const [stakingAmount, setStakingAmount] = useState('')
  const [showStakeModal, setShowStakeModal] = useState(false)
  
  // Use real API hook that we'll implement
  const { data: stakingData, isLoading } = useStakingData()

  // Mock data for now - will be replaced with real API
  const mockValidators: Validator[] = [
    {
      address: 'dyt1validator1...',
      moniker: 'Quantum Defender',
      votingPower: 1250000,
      commission: 5.0,
      status: 'active',
      selfStake: 100000,
      totalStake: 1250000,
      delegators: 847,
      uptime: 99.8,
      recentBlocks: 998
    },
    {
      address: 'dyt1validator2...',
      moniker: 'PQC Sentinel',
      votingPower: 980000,
      commission: 3.5,
      status: 'active',
      selfStake: 80000,
      totalStake: 980000,
      delegators: 623,
      uptime: 99.9,
      recentBlocks: 999
    },
    {
      address: 'dyt1validator3...',
      moniker: 'Crypto Guardian',
      votingPower: 750000,
      commission: 7.0,
      status: 'active',
      selfStake: 50000,
      totalStake: 750000,
      delegators: 421,
      uptime: 98.5,
      recentBlocks: 985
    }
  ]

  const mockUserDelegations: Delegation[] = [
    {
      validatorAddress: 'dyt1validator1...',
      validatorMoniker: 'Quantum Defender',
      stakedAmount: 10000,
      rewards: 125.50,
      status: 'active'
    },
    {
      validatorAddress: 'dyt1validator2...',
      validatorMoniker: 'PQC Sentinel',
      stakedAmount: 5000,
      rewards: 67.25,
      status: 'active'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-400/10 border-green-400/20'
      case 'inactive': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      case 'jailed': return 'text-red-400 bg-red-400/10 border-red-400/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }
  }

  const handleStake = (validator: Validator) => {
    setSelectedValidator(validator)
    setShowStakeModal(true)
  }

  const handleConfirmStake = () => {
    if (selectedValidator && stakingAmount) {
      console.log(`Staking ${stakingAmount} DGT to ${selectedValidator.moniker}`)
      // Here we would call the actual staking API
      setShowStakeModal(false)
      setStakingAmount('')
      setSelectedValidator(null)
    }
  }

  const totalStaked = mockUserDelegations.reduce((sum, del) => sum + del.stakedAmount, 0)
  const totalRewards = mockUserDelegations.reduce((sum, del) => sum + del.rewards, 0)

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
            <ShieldCheckIcon className="w-12 h-12 mr-4" />
            Staking Dashboard
          </h1>
          <p className="text-lg text-gray-300">
            Secure the network and earn rewards by staking your DGT tokens
          </p>
        </motion.div>
      </section>

      {/* User Staking Overview */}
      <section className="max-w-7xl mx-auto mb-12">
        <h2 className="text-2xl font-bold mb-6">Your Staking Portfolio</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-700/30 border-blue-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-300">Total Staked</p>
                  <p className="text-2xl font-bold text-white">{totalStaked.toLocaleString()} DGT</p>
                </div>
                <TrophyIcon className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/50 to-green-700/30 border-green-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-300">Pending Rewards</p>
                  <p className="text-2xl font-bold text-white">{totalRewards.toFixed(2)} DRT</p>
                </div>
                <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-700/30 border-purple-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-300">Validators</p>
                  <p className="text-2xl font-bold text-white">{mockUserDelegations.length}</p>
                </div>
                <UserGroupIcon className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-700/30 border-orange-700/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-300">APY</p>
                  <p className="text-2xl font-bold text-white">12.5%</p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* My Delegations */}
      <section className="max-w-7xl mx-auto mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">My Delegations</h2>
          <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
            Claim All Rewards ({totalRewards.toFixed(2)} DRT)
          </Button>
        </div>

        <div className="grid gap-4">
          {mockUserDelegations.map((delegation, index) => (
            <Card key={index} className="bg-dashboard-card border-dashboard-border">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-dashboard-text">{delegation.validatorMoniker}</h3>
                    <p className="text-sm text-dashboard-text-muted">{delegation.validatorAddress.slice(0, 20)}...</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-dashboard-text">{delegation.stakedAmount.toLocaleString()} DGT staked</p>
                    <p className="text-green-400">{delegation.rewards.toFixed(2)} DRT rewards</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-4">
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Validators List */}
      <section className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Active Validators</h2>

        <div className="space-y-4">
          {mockValidators.map((validator, index) => (
            <motion.div
              key={validator.address}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-dashboard-card border-dashboard-border hover:border-dashboard-border-hover transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-xl font-semibold text-dashboard-text">{validator.moniker}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(validator.status)}`}>
                          <span className="capitalize">{validator.status}</span>
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-dashboard-text-muted">Voting Power</p>
                          <p className="text-dashboard-text font-medium">{validator.votingPower.toLocaleString()} DGT</p>
                        </div>
                        <div>
                          <p className="text-dashboard-text-muted">Commission</p>
                          <p className="text-dashboard-text font-medium">{validator.commission}%</p>
                        </div>
                        <div>
                          <p className="text-dashboard-text-muted">Delegators</p>
                          <p className="text-dashboard-text font-medium">{validator.delegators}</p>
                        </div>
                        <div>
                          <p className="text-dashboard-text-muted">Uptime</p>
                          <p className="text-dashboard-text font-medium">{validator.uptime}%</p>
                        </div>
                        <div>
                          <p className="text-dashboard-text-muted">Recent Blocks</p>
                          <p className="text-dashboard-text font-medium">{validator.recentBlocks}/1000</p>
                        </div>
                      </div>
                      
                      <p className="text-dashboard-text-muted text-sm mt-3">
                        {validator.address.slice(0, 40)}...
                      </p>
                    </div>
                    
                    <div className="ml-6 space-y-2">
                      <Button 
                        onClick={() => handleStake(validator)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Stake
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stake Modal */}
      {showStakeModal && selectedValidator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-dashboard-card border border-dashboard-border rounded-lg p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">Stake to {selectedValidator.moniker}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-dashboard-text-muted mb-2">Amount (DGT)</label>
                <input
                  type="number"
                  value={stakingAmount}
                  onChange={(e) => setStakingAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-dashboard-bg border border-dashboard-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount to stake"
                />
              </div>
              
              <div className="bg-dashboard-bg p-3 rounded-md">
                <p className="text-sm text-dashboard-text-muted">Commission: {selectedValidator.commission}%</p>
                <p className="text-sm text-dashboard-text-muted">Expected APY: ~12.5%</p>
              </div>
              
              <div className="flex space-x-4">
                <Button
                  onClick={() => setShowStakeModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmStake}
                  disabled={!stakingAmount || parseFloat(stakingAmount) <= 0}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Confirm Stake
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  )
}