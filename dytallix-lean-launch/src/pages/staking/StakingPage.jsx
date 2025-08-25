import React, { useState, useEffect } from 'react'
import Card from '../../components/common/Card.jsx'
import Table from '../../components/common/Table.jsx'
import Amount from '../../components/common/Amount.jsx'
import { useToaster } from '../../components/common/Toaster.jsx'
import { stakingService } from '../../services/staking/index.js'
import { useWallet } from '../../hooks/useWallet.js'

const StakingPage = () => {
  const [validators, setValidators] = useState([])
  const [delegations, setDelegations] = useState([])
  const [rewards, setRewards] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('validators')
  const [selectedValidator, setSelectedValidator] = useState(null)
  const [showDelegateModal, setShowDelegateModal] = useState(false)
  const [showUndelegateModal, setShowUndelegateModal] = useState(false)
  const { wallet, status } = useWallet()
  const { success, error: showError, loading: showLoading } = useToaster()

  useEffect(() => {
    loadStakingData()
  }, [])

  useEffect(() => {
    if (wallet?.address && status === 'unlocked') {
      loadUserStakingData()
    }
  }, [wallet?.address, status])

  const loadStakingData = async () => {
    try {
      setLoading(true)
      const validatorsData = await stakingService.listValidators()
      setValidators(validatorsData.validators || [])
    } catch (err) {
      showError('Failed to load staking data', { details: err.message })
    } finally {
      setLoading(false)
    }
  }

  const loadUserStakingData = async () => {
    if (!wallet?.address) return

    try {
      const [delegationsData, rewardsData] = await Promise.all([
        stakingService.getDelegations(wallet.address),
        stakingService.getRewards(wallet.address)
      ])
      
      setDelegations(delegationsData.delegations || [])
      setRewards(rewardsData.rewards || {})
    } catch (err) {
      console.error('Failed to load user staking data:', err)
    }
  }

  const handleDelegate = async (validatorAddress, amount) => {
    if (!wallet?.address || status !== 'unlocked') {
      showError('Please connect and unlock your wallet')
      return
    }

    try {
      const loadingToast = showLoading('Delegating tokens...')
      
      const result = await stakingService.delegate(
        validatorAddress, 
        amount, 
        wallet.address
      )
      
      success('Delegation successful!', {
        details: `Transaction: ${result.txHash}`
      })
      
      // Refresh data
      await loadUserStakingData()
      setShowDelegateModal(false)
      
    } catch (err) {
      showError('Delegation failed', { details: err.message })
    }
  }

  const handleUndelegate = async (validatorAddress, amount) => {
    if (!wallet?.address || status !== 'unlocked') {
      showError('Please connect and unlock your wallet')
      return
    }

    try {
      const loadingToast = showLoading('Undelegating tokens...')
      
      const result = await stakingService.undelegate(
        validatorAddress, 
        amount, 
        wallet.address
      )
      
      success('Undelegation successful!', {
        details: `Transaction: ${result.txHash} - Tokens will be available after unbonding period`
      })
      
      // Refresh data
      await loadUserStakingData()
      setShowUndelegateModal(false)
      
    } catch (err) {
      showError('Undelegation failed', { details: err.message })
    }
  }

  const handleClaimRewards = async () => {
    if (!wallet?.address || status !== 'unlocked') {
      showError('Please connect and unlock your wallet')
      return
    }

    try {
      const loadingToast = showLoading('Claiming rewards...')
      
      const result = await stakingService.claimRewards(wallet.address)
      
      success('Rewards claimed successfully!', {
        details: `Transaction: ${result.txHash}`
      })
      
      // Refresh data
      await loadUserStakingData()
      
    } catch (err) {
      showError('Claiming rewards failed', { details: err.message })
    }
  }

  const tabs = [
    { id: 'validators', label: 'Validators', icon: '👥' },
    { id: 'delegations', label: 'My Delegations', icon: '💎' },
    { id: 'rewards', label: 'Rewards', icon: '🎁' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'validators':
        return (
          <ValidatorsList 
            validators={validators} 
            loading={loading} 
            onDelegate={(validator) => {
              setSelectedValidator(validator)
              setShowDelegateModal(true)
            }}
          />
        )
      case 'delegations':
        return (
          <DelegationsList 
            delegations={delegations} 
            validators={validators}
            onUndelegate={(delegation) => {
              setSelectedValidator(delegation)
              setShowUndelegateModal(true)
            }}
          />
        )
      case 'rewards':
        return (
          <RewardsPanel 
            rewards={rewards} 
            validators={validators}
            onClaimAll={handleClaimRewards}
          />
        )
      default:
        return null
    }
  }

  const totalStaked = delegations.reduce((sum, del) => sum + (parseFloat(del.amount) || 0), 0)
  const totalRewards = Object.values(rewards).reduce((sum, reward) => sum + (parseFloat(reward.amount) || 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Staking
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Delegate tokens to validators and earn rewards
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={loadStakingData}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {wallet?.address && status === 'unlocked' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                <Amount value={totalStaked} denom="DGT" />
              </div>
              <div className="text-sm text-gray-500">Total Staked</div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                <Amount value={totalRewards} denom="DRT" />
              </div>
              <div className="text-sm text-gray-500">Pending Rewards</div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {delegations.length}
              </div>
              <div className="text-sm text-gray-500">Active Delegations</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>

      {/* Delegate Modal */}
      {showDelegateModal && selectedValidator && (
        <DelegateModal
          validator={selectedValidator}
          onDelegate={handleDelegate}
          onClose={() => {
            setShowDelegateModal(false)
            setSelectedValidator(null)
          }}
        />
      )}

      {/* Undelegate Modal */}
      {showUndelegateModal && selectedValidator && (
        <UndelegateModal
          delegation={selectedValidator}
          onUndelegate={handleUndelegate}
          onClose={() => {
            setShowUndelegateModal(false)
            setSelectedValidator(null)
          }}
        />
      )}
    </div>
  )
}

// Validators List Component
const ValidatorsList = ({ validators, loading, onDelegate }) => {
  const columns = [
    { key: 'moniker', label: 'Validator', align: 'left' },
    { key: 'votingPower', label: 'Voting Power', align: 'right' },
    { key: 'commission', label: 'Commission', align: 'right' },
    { key: 'status', label: 'Status', align: 'center' },
    { key: 'actions', label: 'Actions', align: 'right' }
  ]

  const rows = validators.map(validator => ({
    moniker: () => (
      <div>
        <div className="font-medium">{validator.moniker}</div>
        <div className="text-xs text-gray-500 font-mono">
          {validator.address?.slice(0, 20)}...
        </div>
      </div>
    ),
    votingPower: () => (
      <div className="text-right">
        <div className="font-medium">
          {(validator.votingPowerPercent || 0).toFixed(2)}%
        </div>
        <div className="text-xs text-gray-500">
          <Amount value={validator.votingPower} denom="DGT" />
        </div>
      </div>
    ),
    commission: `${(validator.commission * 100).toFixed(1)}%`,
    status: () => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        validator.status === 'active' 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {validator.status}
      </span>
    ),
    actions: () => (
      <button
        onClick={() => onDelegate(validator)}
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
      >
        Delegate
      </button>
    )
  }))

  if (loading) {
    return (
      <Card title="Validators">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card title="Active Validators">
      <Table
        columns={columns}
        rows={rows}
        emptyLabel="No validators found"
        responsive={true}
      />
    </Card>
  )
}

// Delegations List Component
const DelegationsList = ({ delegations, validators, onUndelegate }) => {
  const getValidatorName = (address) => {
    const validator = validators.find(v => v.address === address)
    return validator?.moniker || `${address.slice(0, 20)}...`
  }

  const columns = [
    { key: 'validator', label: 'Validator', align: 'left' },
    { key: 'amount', label: 'Delegated Amount', align: 'right' },
    { key: 'rewards', label: 'Pending Rewards', align: 'right' },
    { key: 'actions', label: 'Actions', align: 'right' }
  ]

  const rows = delegations.map(delegation => ({
    validator: getValidatorName(delegation.validatorAddress),
    amount: () => <Amount value={delegation.amount} denom="DGT" />,
    rewards: () => <Amount value={delegation.pendingRewards || 0} denom="DRT" />,
    actions: () => (
      <button
        onClick={() => onUndelegate(delegation)}
        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
      >
        Undelegate
      </button>
    )
  }))

  if (delegations.length === 0) {
    return (
      <Card title="My Delegations">
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">No active delegations</div>
          <div className="text-sm">
            Delegate tokens to validators to start earning rewards
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card title="My Delegations">
      <Table
        columns={columns}
        rows={rows}
        emptyLabel="No delegations found"
        responsive={true}
      />
    </Card>
  )
}

// Rewards Panel Component
const RewardsPanel = ({ rewards, validators, onClaimAll }) => {
  const totalRewards = Object.values(rewards).reduce(
    (sum, reward) => sum + (parseFloat(reward.amount) || 0), 
    0
  )

  if (totalRewards === 0) {
    return (
      <Card title="Staking Rewards">
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">No pending rewards</div>
          <div className="text-sm">
            Delegate tokens to validators to start earning rewards
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card 
      title="Staking Rewards"
      actions={
        <button
          onClick={onClaimAll}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Claim All Rewards
        </button>
      }
    >
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            <Amount value={totalRewards} denom="DRT" showFiat={true} />
          </div>
          <div className="text-sm text-green-700 dark:text-green-300">
            Total Pending Rewards
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(rewards).map(([validatorAddress, reward]) => {
            const validator = validators.find(v => v.address === validatorAddress)
            return (
              <div key={validatorAddress} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <div className="font-medium">
                    {validator?.moniker || `${validatorAddress.slice(0, 20)}...`}
                  </div>
                </div>
                <div className="text-right">
                  <Amount value={reward.amount} denom="DRT" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// Simplified modals (these would be full components in a real app)
const DelegateModal = ({ validator, onDelegate, onClose }) => {
  const [amount, setAmount] = useState('')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-medium mb-4">Delegate to {validator.moniker}</h3>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount to delegate"
          className="w-full p-2 border rounded mb-4"
        />
        <div className="flex space-x-4">
          <button
            onClick={() => onDelegate(validator.address, amount)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Delegate
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const UndelegateModal = ({ delegation, onUndelegate, onClose }) => {
  const [amount, setAmount] = useState('')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-medium mb-4">Undelegate</h3>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount to undelegate"
          className="w-full p-2 border rounded mb-4"
        />
        <div className="flex space-x-4">
          <button
            onClick={() => onUndelegate(delegation.validatorAddress, amount)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Undelegate
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default StakingPage