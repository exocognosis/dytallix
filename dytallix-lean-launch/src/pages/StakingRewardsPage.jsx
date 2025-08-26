import React, { useState } from 'react'
import StakingRewardsDashboard from '../components/StakingRewardsDashboard'
import '../styles/global.css'

// Example integration showing how to add the StakingRewardsDashboard 
// to an existing page with wallet integration

const StakingRewardsPage = () => {
  const [delegatorAddress, setDelegatorAddress] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  // Mock wallet connection - replace with actual wallet integration
  const connectWallet = async () => {
    // This would be replaced with actual wallet connection logic
    // e.g., using MetaMask, Keplr, or other wallet providers
    try {
      // Simulate wallet connection
      const mockAddress = 'dyt1example123456789abcdefghijklmnopqrstuvwxyz'
      setDelegatorAddress(mockAddress)
      setIsConnected(true)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  const disconnectWallet = () => {
    setDelegatorAddress('')
    setIsConnected(false)
  }

  const handleAddressInput = (event) => {
    setDelegatorAddress(event.target.value)
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            Staking Rewards
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
            View and claim your staking rewards across all validators. Track your delegation performance and manage your DRT rewards.
          </p>
        </div>

        {/* Connection Interface */}
        {!isConnected && !delegatorAddress && (
          <div className="card" style={{ maxWidth: '500px', margin: '0 auto 2rem', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem' }}>Connect Your Wallet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Connect your wallet to automatically load your staking rewards, or manually enter a delegator address.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-primary"
                onClick={connectWallet}
              >
                Connect Wallet
              </button>
            </div>

            <div style={{ margin: '1.5rem 0', color: 'var(--text-muted)' }}>
              — or —
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                Enter Delegator Address:
              </label>
              <input
                type="text"
                placeholder="dyt1..."
                value={delegatorAddress}
                onChange={handleAddressInput}
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--surface-border)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>
        )}

        {/* Connected State */}
        {isConnected && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ color: 'var(--success-500)' }}>
                ● Connected
              </div>
              <code style={{ fontSize: '0.9rem' }}>{delegatorAddress}</code>
              <button 
                className="btn btn-outline btn-sm"
                onClick={disconnectWallet}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Manual Address Entry State */}
        {!isConnected && delegatorAddress && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>Viewing rewards for:</div>
              <code style={{ fontSize: '0.9rem' }}>{delegatorAddress}</code>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => setDelegatorAddress('')}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Staking Rewards Dashboard */}
        <StakingRewardsDashboard 
          delegatorAddress={delegatorAddress}
        />

        {/* Features Information */}
        {!delegatorAddress && (
          <div style={{ marginTop: '4rem' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
              Staking Rewards Features
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div className="card">
                <h4 style={{ color: 'var(--primary-400)', marginBottom: '1rem' }}>
                  Real-time Tracking
                </h4>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Monitor your pending and accrued rewards across all validator delegations with automatic updates every 30 seconds.
                </p>
              </div>
              
              <div className="card">
                <h4 style={{ color: 'var(--accent-400)', marginBottom: '1rem' }}>
                  One-Click Claiming
                </h4>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Claim rewards from individual validators or all at once with a single transaction. Track your claim history.
                </p>
              </div>
              
              <div className="card">
                <h4 style={{ color: 'var(--success-500)', marginBottom: '1rem' }}>
                  Comprehensive Analytics
                </h4>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  View detailed breakdowns of your staking positions, including total stake, pending rewards, and historical claims.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StakingRewardsPage