import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Card from '../../components/common/Card.jsx'
import Table from '../../components/common/Table.jsx'
import Amount from '../../components/common/Amount.jsx'
import RiskBadge from '../../components/common/RiskBadge.jsx'
import { accountsService } from '../../services/accounts/index.js'
import { aiRiskService } from '../../services/ai/index.js'

const AccountsPage = () => {
  const { address } = useParams()
  const [account, setAccount] = useState(null)
  const [balances, setBalances] = useState([])
  const [transactions, setTransactions] = useState([])
  const [stakingPositions, setStakingPositions] = useState(null)
  const [riskAssessment, setRiskAssessment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (address) {
      loadAccountData()
    }
  }, [address])

  const loadAccountData = async () => {
    try {
      setLoading(true)
      const [
        accountData,
        balancesData,
        txData,
        stakingData,
        riskData
      ] = await Promise.all([
        accountsService.getAccountOverview(address),
        accountsService.getBalances(address),
        accountsService.getAccountTxs(address, { limit: 10 }),
        accountsService.getStakingPositions(address).catch(() => null),
        aiRiskService.getAccountRisk(address).catch(() => null)
      ])
      
      setAccount(accountData)
      setBalances(balancesData.balances || [])
      setTransactions(txData.transactions || [])
      setStakingPositions(stakingData)
      setRiskAssessment(riskData)
      
    } catch (err) {
      console.error('Failed to load account data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'transactions', label: 'Transactions', icon: '📋' },
    { id: 'staking', label: 'Staking', icon: '🏛️' },
    { id: 'governance', label: 'Governance', icon: '🗳️' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AccountOverview account={account} balances={balances} riskAssessment={riskAssessment} />
      case 'transactions':
        return <AccountTransactions transactions={transactions} address={address} />
      case 'staking':
        return <AccountStaking stakingPositions={stakingPositions} />
      case 'governance':
        return <AccountGovernance address={address} />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!account && !loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">Account not found</div>
          <div className="text-sm text-gray-400 mt-2">
            Please check the address and try again
          </div>
        </div>
      </div>
    )
  }

  // Calculate total portfolio value
  const totalValue = balances.reduce((sum, balance) => {
    const value = parseFloat(balance.amount || 0)
    // Mock USD conversion rates
    const rate = balance.denom === 'DGT' ? 0.12 : 0.08
    return sum + (value * rate / Math.pow(10, 6))
  }, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Account Details
          </h1>
          <div className="mt-2 font-mono text-sm text-gray-600 dark:text-gray-400 break-all">
            {address}
          </div>
          {riskAssessment && (
            <div className="mt-2">
              <RiskBadge 
                level={riskAssessment.level} 
                score={riskAssessment.score} 
                rationale={riskAssessment.rationale} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${totalValue.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Portfolio Value</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {balances.length}
            </div>
            <div className="text-sm text-gray-500">Token Holdings</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {transactions.length}
            </div>
            <div className="text-sm text-gray-500">Recent Transactions</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stakingPositions?.delegations?.length || 0}
            </div>
            <div className="text-sm text-gray-500">Staking Positions</div>
          </div>
        </Card>
      </div>

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
    </div>
  )
}

// Account Overview Component
const AccountOverview = ({ account, balances, riskAssessment }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Balances */}
      <Card title="Token Balances">
        <div className="space-y-3">
          {balances.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No token balances found
            </div>
          ) : (
            balances.map((balance, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                    {balance.denom}
                  </div>
                  <div>
                    <div className="font-medium">{balance.denom}</div>
                    <div className="text-xs text-gray-500">
                      {balance.denom === 'DGT' ? 'Governance Token' : 'Reward Token'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Amount value={balance.amount} denom={balance.denom} showFiat={true} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Account Information */}
      <Card title="Account Information">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Address:</span>
            <span className="font-mono text-xs">{account?.address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Account Number:</span>
            <span>{account?.accountNumber || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sequence:</span>
            <span>{account?.sequence || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">First Activity:</span>
            <span>{account?.firstSeen ? new Date(account.firstSeen).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Last Activity:</span>
            <span>{account?.lastSeen ? new Date(account.lastSeen).toLocaleDateString() : '—'}</span>
          </div>
          {riskAssessment && (
            <div className="pt-3 border-t">
              <div className="text-gray-500 mb-2">AI Risk Assessment:</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Risk Score:</span>
                  <span>{(riskAssessment.score * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Risk Level:</span>
                  <RiskBadge level={riskAssessment.level} />
                </div>
                {riskAssessment.rationale && (
                  <div className="text-xs text-gray-600 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {riskAssessment.rationale}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// Account Transactions Component
const AccountTransactions = ({ transactions, address }) => {
  const columns = [
    { key: 'hash', label: 'Hash', align: 'left' },
    { key: 'type', label: 'Type', align: 'left' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'status', label: 'Status', align: 'center' },
    { key: 'time', label: 'Time', align: 'right' }
  ]

  const rows = transactions.map(tx => ({
    hash: () => (
      <Link 
        to={`/explorer/tx/${tx.hash}`}
        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
      >
        {tx.hash.slice(0, 15)}...
      </Link>
    ),
    type: tx.type.replace('_', ' '),
    amount: () => tx.amount ? <Amount value={tx.amount.amount} denom={tx.amount.denom} /> : '—',
    status: () => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        tx.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {tx.status}
      </span>
    ),
    time: new Date(tx.timestamp).toLocaleDateString()
  }))

  return (
    <Card 
      title="Recent Transactions"
      actions={
        <Link 
          to={`/transactions?address=${address}`}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          View All →
        </Link>
      }
    >
      <Table
        columns={columns}
        rows={rows}
        emptyLabel="No transactions found"
        responsive={true}
      />
    </Card>
  )
}

// Account Staking Component
const AccountStaking = ({ stakingPositions }) => {
  if (!stakingPositions || (!stakingPositions.delegations?.length && !stakingPositions.rewards?.length)) {
    return (
      <Card title="Staking Positions">
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">No staking positions found</div>
          <div className="text-sm">
            Delegate tokens to validators to start earning rewards
          </div>
        </div>
      </Card>
    )
  }

  const totalStaked = stakingPositions.delegations?.reduce(
    (sum, del) => sum + parseFloat(del.amount || 0), 0
  ) || 0

  const totalRewards = stakingPositions.rewards?.reduce(
    (sum, reward) => sum + parseFloat(reward.amount || 0), 0
  ) || 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">
              <Amount value={totalStaked} denom="DGT" />
            </div>
            <div className="text-sm text-gray-500">Total Staked</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">
              <Amount value={totalRewards} denom="DRT" />
            </div>
            <div className="text-sm text-gray-500">Pending Rewards</div>
          </div>
        </Card>
      </div>

      {/* Delegations */}
      {stakingPositions.delegations?.length > 0 && (
        <Card title="Active Delegations">
          <div className="space-y-3">
            {stakingPositions.delegations.map((delegation, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <div className="font-medium">{delegation.validatorName}</div>
                  <div className="text-xs text-gray-500 font-mono">
                    {delegation.validatorAddress?.slice(0, 20)}...
                  </div>
                </div>
                <div className="text-right">
                  <Amount value={delegation.amount} denom="DGT" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// Account Governance Component
const AccountGovernance = ({ address }) => {
  const [governanceActivity, setGovernanceActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGovernanceActivity()
  }, [address])

  const loadGovernanceActivity = async () => {
    try {
      const data = await accountsService.getGovernanceActivity(address)
      setGovernanceActivity(data.votes || [])
    } catch (err) {
      console.error('Failed to load governance activity:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card title="Governance Activity">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </Card>
    )
  }

  if (governanceActivity.length === 0) {
    return (
      <Card title="Governance Activity">
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">No governance participation found</div>
          <div className="text-sm">
            Participate in governance by voting on proposals
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Governance Activity">
      <div className="space-y-3">
        {governanceActivity.map((vote, index) => (
          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
            <div>
              <Link 
                to={`/governance/${vote.proposalId}`}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                Proposal #{vote.proposalId}
              </Link>
              <div className="text-sm text-gray-500">{vote.proposalTitle}</div>
            </div>
            <div className="text-right">
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                vote.option === 'yes' ? 'bg-green-100 text-green-800' :
                vote.option === 'no' ? 'bg-red-100 text-red-800' :
                vote.option === 'abstain' ? 'bg-gray-100 text-gray-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {vote.option.toUpperCase()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(vote.timestamp).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default AccountsPage