import { useState } from 'react'
import { XMarkIcon, GiftIcon } from '@heroicons/react/24/outline'
import { RewardClaim } from '../types/tokenomics'
import { useClaimRewards } from '../hooks/useTokenomics'
import toast from 'react-hot-toast'

interface RewardClaimModalProps {
  isOpen: boolean
  onClose: () => void
  rewards: RewardClaim[]
}

export function RewardClaimModal({ isOpen, onClose, rewards }: RewardClaimModalProps) {
  const claimRewards = useClaimRewards()
  const [claimingType, setClaimingType] = useState<'validator' | 'staker' | null>(null)

  const validatorRewards = rewards.filter(r => r.type === 'validator')
  const stakerRewards = rewards.filter(r => r.type === 'staker')
  
  const totalValidatorRewards = validatorRewards.reduce((sum, r) => sum + r.amount, 0)
  const totalStakerRewards = stakerRewards.reduce((sum, r) => sum + r.amount, 0)

  const handleClaim = async (type: 'validator' | 'staker') => {
    setClaimingType(type)
    
    try {
      const result = await claimRewards.mutateAsync(type)
      
      if (result.success) {
        toast.success(`${type} rewards claimed successfully!`)
        onClose()
      } else {
        toast.error(result.error || 'Claim failed')
      }
    } catch (error) {
      toast.error('Claim failed')
    } finally {
      setClaimingType(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <GiftIcon className="w-6 h-6 mr-2" />
            Claim Rewards
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Validator Rewards */}
          {totalValidatorRewards > 0 && (
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-medium">Validator Rewards</h3>
                  <p className="text-gray-400 text-sm">
                    Rewards from block validation
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">
                    {totalValidatorRewards.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">DRT</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {validatorRewards.map((reward, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      Claimable since: {new Date(reward.claimableAt).toLocaleDateString()}
                    </span>
                    <span className="text-white">{reward.amount} DRT</span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => handleClaim('validator')}
                disabled={claimingType === 'validator'}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {claimingType === 'validator' ? 'Claiming...' : 'Claim Validator Rewards'}
              </button>
            </div>
          )}

          {/* Staker Rewards */}
          {totalStakerRewards > 0 && (
            <div className="p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-white font-medium">Staker Rewards</h3>
                  <p className="text-gray-400 text-sm">
                    Rewards from token staking
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-400">
                    {totalStakerRewards.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">DRT</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {stakerRewards.map((reward, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-400">
                      Claimable since: {new Date(reward.claimableAt).toLocaleDateString()}
                    </span>
                    <span className="text-white">{reward.amount} DRT</span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => handleClaim('staker')}
                disabled={claimingType === 'staker'}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {claimingType === 'staker' ? 'Claiming...' : 'Claim Staker Rewards'}
              </button>
            </div>
          )}

          {/* No rewards */}
          {totalValidatorRewards === 0 && totalStakerRewards === 0 && (
            <div className="text-center py-8">
              <GiftIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">No claimable rewards</h3>
              <p className="mt-1 text-sm text-gray-500">
                Check back later for new rewards to claim.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 mt-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
