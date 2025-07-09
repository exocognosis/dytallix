import { useState } from 'react'
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  FireIcon,
  TrophyIcon,
  GiftIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'
import { useTokenomicsMetrics, useTokenBalance, useVotingPower, useEmissionProposals, useRewardClaims } from '../hooks/useTokenomics'
import { useWalletStore } from '../store/wallet'
import { TokenTransferModal } from './TokenTransferModal'
import { RewardClaimModal } from './RewardClaimModal'
import { GovernanceVotingModal } from './GovernanceVotingModal'

export function TokenomicsDashboard() {
  const { activeAccount } = useWalletStore()
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showRewardModal, setShowRewardModal] = useState(false)
  const [showVotingModal, setShowVotingModal] = useState(false)

  const { data: metricsData, isLoading: metricsLoading } = useTokenomicsMetrics()
  const { data: balanceData, isLoading: balanceLoading } = useTokenBalance(activeAccount?.address || '')
  const { data: votingPowerData } = useVotingPower(activeAccount?.address || '')
  const { data: proposalsData } = useEmissionProposals()
  const { data: rewardsData } = useRewardClaims(activeAccount?.address || '')

  const metrics = metricsData?.data
  const balance = balanceData?.data
  const votingPower = votingPowerData?.data
  const proposals = proposalsData?.data || []
  const rewards = rewardsData?.data || []

  const claimableRewards = rewards.filter(r => !r.claimed && Date.now() >= r.claimableAt)
  const totalClaimable = claimableRewards.reduce((sum, r) => sum + r.amount, 0)

  if (metricsLoading || balanceLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h2 className="text-3xl font-bold text-white flex items-center">
          <CurrencyDollarIcon className="w-8 h-8 mr-3" />
          Dytallix Tokenomics
        </h2>
        <p className="mt-2 text-gray-400">
          DGT governance tokens and DRT reward tokens with adaptive emission
        </p>
      </div>

      {/* Token Balances */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">DGT Balance</h3>
                <p className="text-sm text-gray-400">Governance Token</p>
              </div>
              <ScaleIcon className="w-8 h-8 text-blue-400" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">{balance.dgt.toLocaleString()}</p>
              {votingPower && (
                <p className="text-sm text-gray-400 mt-1">
                  Voting Power: {votingPower.votingPercentage.toFixed(4)}%
                </p>
              )}
            </div>
            <button
              onClick={() => setShowTransferModal(true)}
              className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Transfer DGT
            </button>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-white">DRT Balance</h3>
                <p className="text-sm text-gray-400">Reward Token</p>
              </div>
              <TrophyIcon className="w-8 h-8 text-green-400" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">{balance.drt.toLocaleString()}</p>
              {totalClaimable > 0 && (
                <p className="text-sm text-green-400 mt-1">
                  +{totalClaimable} DRT claimable
                </p>
              )}
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => setShowTransferModal(true)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                Transfer DRT
              </button>
              {totalClaimable > 0 && (
                <button
                  onClick={() => setShowRewardModal(true)}
                  className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 transition-colors"
                >
                  Claim Rewards
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tokenomics Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">DGT Total Supply</h3>
                <p className="text-2xl font-bold text-white">{metrics.dgtTotalSupply.toLocaleString()}</p>
              </div>
              <ScaleIcon className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">DRT Circulating</h3>
                <p className="text-2xl font-bold text-white">{(metrics.drtTotalSupply - metrics.drtTotalBurned).toLocaleString()}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">DRT Burned</h3>
                <p className="text-2xl font-bold text-white">{metrics.drtTotalBurned.toLocaleString()}</p>
              </div>
              <FireIcon className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Emission Rate</h3>
                <p className="text-2xl font-bold text-white">{metrics.currentEmissionRate}</p>
                <p className="text-xs text-gray-500">DRT per block</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      )}

      {/* Governance Proposals */}
      {proposals.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Active Governance Proposals</h3>
              <button
                onClick={() => setShowVotingModal(true)}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Vote on Proposals
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{proposal.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">{proposal.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-green-400 text-sm">
                          For: {proposal.votesFor.toLocaleString()}
                        </span>
                        <span className="text-red-400 text-sm">
                          Against: {proposal.votesAgainst.toLocaleString()}
                        </span>
                        <span className="text-gray-400 text-sm">
                          Ends: {new Date(proposal.votingDeadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      proposal.status === 'active' ? 'bg-green-900/50 text-green-400' :
                      proposal.status === 'passed' ? 'bg-blue-900/50 text-blue-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {proposal.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reward Claims */}
      {claimableRewards.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Claimable Rewards</h3>
              <GiftIcon className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {claimableRewards.map((reward, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{reward.amount} DRT</p>
                    <p className="text-gray-400 text-sm capitalize">{reward.type} Rewards</p>
                  </div>
                  <button
                    onClick={() => setShowRewardModal(true)}
                    className="bg-yellow-600 text-white py-1 px-3 rounded text-sm hover:bg-yellow-700 transition-colors"
                  >
                    Claim
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showTransferModal && (
        <TokenTransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          balance={balance}
        />
      )}

      {showRewardModal && (
        <RewardClaimModal
          isOpen={showRewardModal}
          onClose={() => setShowRewardModal(false)}
          rewards={claimableRewards}
        />
      )}

      {showVotingModal && (
        <GovernanceVotingModal
          isOpen={showVotingModal}
          onClose={() => setShowVotingModal(false)}
          proposals={proposals}
          votingPower={votingPower}
        />
      )}
    </div>
  )
}
