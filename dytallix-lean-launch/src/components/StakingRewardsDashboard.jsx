import React, { useState, useEffect } from 'react'
import '../styles/global.css'

// --- Helper Functions ---
const formatAmount = (amount, decimals = 6, symbol = '') => {
  if (!amount) return '0'
  const num = parseFloat(amount) / Math.pow(10, decimals)
  return `${num.toLocaleString()} ${symbol}`.trim()
}

const shortAddress = (addr, start = 6, end = 4) => {
  if (!addr || addr.length <= start + end) return addr
  return `${addr.slice(0, start)}...${addr.slice(-end)}`
}

async function fetchJson(url, opts = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally { clearTimeout(t) }
}

// --- API Functions ---
const StakingAPI = {
  getRewards: (delegator) => `/staking/rewards/${encodeURIComponent(delegator)}`,
  claimRewards: () => '/staking/claim',
}

// --- Sub-components ---
const RewardsSummaryCard = ({ summary, onClaim, claiming }) => (
  <div className="card" style={{ marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
      <h3 style={{ margin: 0 }}>Rewards Summary</h3>
      <button 
        className="btn btn-primary"
        onClick={onClaim}
        disabled={claiming || !summary?.pending_rewards || summary.pending_rewards === '0'}
      >
        {claiming ? 'Claiming...' : 'Claim All Rewards'}
      </button>
    </div>
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <div className="metric-card">
        <div className="metric-label">Total Stake</div>
        <div className="metric-value">{formatAmount(summary?.total_stake, 6, 'DGT')}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Pending Rewards</div>
        <div className="metric-value pending">{formatAmount(summary?.pending_rewards, 6, 'DRT')}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Unclaimed Rewards</div>
        <div className="metric-value unclaimed">{formatAmount(summary?.accrued_unclaimed, 6, 'DRT')}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Total Claimed</div>
        <div className="metric-value claimed">{formatAmount(summary?.total_claimed, 6, 'DRT')}</div>
      </div>
    </div>
  </div>
)

const PositionCard = ({ position, onClaimSpecific, claiming }) => (
  <div className="card position-card" style={{ marginBottom: '0.75rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h4 style={{ margin: 0 }}>Validator</h4>
          <code className="validator-address">{shortAddress(position?.validator)}</code>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          <div>
            <div className="label">Stake</div>
            <div className="value">{formatAmount(position?.stake, 6, 'DGT')}</div>
          </div>
          <div>
            <div className="label">Pending</div>
            <div className="value pending">{formatAmount(position?.pending, 6, 'DRT')}</div>
          </div>
          <div>
            <div className="label">Unclaimed</div>
            <div className="value unclaimed">{formatAmount(position?.accrued_unclaimed, 6, 'DRT')}</div>
          </div>
        </div>
      </div>
      
      <button 
        className="btn btn-sm btn-outline"
        onClick={() => onClaimSpecific(position?.validator)}
        disabled={claiming || !position?.pending || position.pending === '0'}
        style={{ marginLeft: '1rem' }}
      >
        {claiming ? '...' : 'Claim'}
      </button>
    </div>
  </div>
)

const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
    <div className="spinner"></div>
  </div>
)

const ErrorMessage = ({ error, onRetry }) => (
  <div className="card error-card">
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      <h4>Error Loading Rewards</h4>
      <p className="muted">{error}</p>
      <button className="btn btn-outline" onClick={onRetry}>
        Retry
      </button>
    </div>
  </div>
)

// --- Main Component ---
const StakingRewardsDashboard = ({ delegatorAddress }) => {
  const [rewardsData, setRewardsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [claiming, setClaiming] = useState(false)
  const [claimingValidator, setClaimingValidator] = useState(null)

  const loadRewards = async () => {
    if (!delegatorAddress) {
      setError('Please provide a delegator address')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchJson(StakingAPI.getRewards(delegatorAddress))
      setRewardsData(data)
    } catch (err) {
      setError(err.message || 'Failed to load rewards data')
      console.error('Error loading rewards:', err)
    } finally {
      setLoading(false)
    }
  }

  const claimAllRewards = async () => {
    if (!delegatorAddress || claiming) return
    
    setClaiming(true)
    try {
      const response = await fetchJson(StakingAPI.claimRewards(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegator: delegatorAddress })
      })
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      // Refresh rewards data after successful claim
      await loadRewards()
    } catch (err) {
      setError(`Failed to claim rewards: ${err.message}`)
    } finally {
      setClaiming(false)
    }
  }

  const claimSpecificRewards = async (validatorAddress) => {
    if (!delegatorAddress || !validatorAddress || claiming) return
    
    setClaiming(true)
    setClaimingValidator(validatorAddress)
    
    try {
      const response = await fetchJson(StakingAPI.claimRewards(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          delegator: delegatorAddress, 
          validator: validatorAddress 
        })
      })
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      // Refresh rewards data after successful claim
      await loadRewards()
    } catch (err) {
      setError(`Failed to claim rewards: ${err.message}`)
    } finally {
      setClaiming(false)
      setClaimingValidator(null)
    }
  }

  // Load rewards when component mounts or delegator address changes
  useEffect(() => {
    loadRewards()
  }, [delegatorAddress])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!delegatorAddress) return
    
    const interval = setInterval(loadRewards, 30000)
    return () => clearInterval(interval)
  }, [delegatorAddress])

  if (!delegatorAddress) {
    return (
      <div className="card">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>Staking Rewards Dashboard</h3>
          <p className="muted">Please connect your wallet or provide a delegator address to view rewards.</p>
        </div>
      </div>
    )
  }

  if (loading && !rewardsData) {
    return <LoadingSpinner />
  }

  if (error && !rewardsData) {
    return <ErrorMessage error={error} onRetry={loadRewards} />
  }

  if (!rewardsData) {
    return null
  }

  const { summary, positions = [] } = rewardsData

  return (
    <div className="staking-rewards-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Staking Rewards</h2>
          <p className="muted" style={{ margin: '0.25rem 0 0 0' }}>
            Delegator: <code>{shortAddress(delegatorAddress, 8, 6)}</code>
          </p>
        </div>
        
        <button 
          className="btn btn-outline btn-sm"
          onClick={loadRewards}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <RewardsSummaryCard 
        summary={summary}
        onClaim={claimAllRewards}
        claiming={claiming}
      />

      {positions.length > 0 && (
        <div className="positions-section">
          <h3 style={{ marginBottom: '1rem' }}>
            Validator Positions ({positions.length})
          </h3>
          
          <div className="positions-list">
            {positions.map((position, index) => (
              <PositionCard
                key={position.validator || index}
                position={position}
                onClaimSpecific={claimSpecificRewards}
                claiming={claiming && claimingValidator === position.validator}
              />
            ))}
          </div>
        </div>
      )}

      {positions.length === 0 && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h4>No Staking Positions</h4>
            <p className="muted">This address has no active staking delegations.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default StakingRewardsDashboard