import React, { useState, useEffect } from 'react'
import { useWalletState, useWalletActions } from '../state/walletStore.ts'
import { ConnectDytallixWalletModal } from '../components/ConnectDytallixWalletModal.tsx'
import '../styles/global.css'

const StakingRewardsPage = () => {
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [stakingData, setStakingData] = useState({
    totalStaked: '0',
    rewards: '0',
    validators: []
  })

  const { isUnlocked, currentAccount } = useWalletState()
  const { init, refreshBalances } = useWalletActions()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (isUnlocked && currentAccount) {
      // Refresh balances when account is available
      refreshBalances(currentAccount.address)
      
      // TODO: Fetch staking data for the connected account
      // This would integrate with Dytallix staking modules
      console.log('Fetching staking data for:', currentAccount.address)
    }
  }, [isUnlocked, currentAccount, refreshBalances])

  const handleConnectWallet = () => {
    setShowWalletModal(true)
  }

  const handleWalletSuccess = () => {
    setShowWalletModal(false)
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
          Staking & Rewards
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: '600px', margin: '0 auto' }}>
          Stake your DGT tokens to help secure the Dytallix network and earn rewards. 
          Participate in quantum-resistant consensus while supporting the ecosystem.
        </p>
      </div>

      {!isUnlocked || !currentAccount ? (
        <div style={{ 
          backgroundColor: '#f9fafb', 
          border: '2px dashed #d1d5db', 
          borderRadius: '12px', 
          padding: '60px 40px', 
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#374151' }}>
            Connect Your Dytallix Wallet
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '1rem' }}>
            Connect your PQC wallet to view your staking positions and claim rewards.
          </p>
          <button
            onClick={handleConnectWallet}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Connect Dytallix Wallet
          </button>
        </div>
      ) : (
        <div>
          {/* Connected Wallet Info */}
          <div style={{ 
            backgroundColor: '#ecfdf5', 
            border: '1px solid #d1fae5', 
            borderRadius: '8px', 
            padding: '16px', 
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: '#065f46' }}>
                ✅ Wallet Connected
              </div>
              <div style={{ fontSize: '14px', color: '#047857', fontFamily: 'monospace' }}>
                {currentAccount.address}
              </div>
            </div>
            <div style={{ fontSize: '14px', color: '#059669' }}>
              Algorithm: {currentAccount.algo}
            </div>
          </div>

          {/* Staking Overview Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '24px', 
            marginBottom: '40px' 
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '12px', 
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1.1rem' }}>
                Total Staked
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                {stakingData.totalStaked} DGT
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                ~$0.00 USD
              </div>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '12px', 
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1.1rem' }}>
                Pending Rewards
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                {stakingData.rewards} DRT
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                Available to claim
              </div>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '12px', 
              padding: '24px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '1.1rem' }}>
                APY
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>
                ~12.5%
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                Estimated annual yield
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginBottom: '40px',
            flexWrap: 'wrap'
          }}>
            <button style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              Stake DGT
            </button>
            
            <button style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              Claim Rewards
            </button>
            
            <button style={{
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              Unstake
            </button>
          </div>

          {/* Validators Section */}
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '12px', 
            padding: '24px',
            marginBottom: '40px'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.3rem', color: '#374151' }}>
              Active Validators
            </h3>
            
            {stakingData.validators.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                color: '#6b7280' 
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏛️</div>
                <p>No active delegations found.</p>
                <p style={{ fontSize: '14px' }}>Start by staking your DGT tokens to earn rewards.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '12px 0', color: '#374151' }}>Validator</th>
                      <th style={{ textAlign: 'right', padding: '12px 0', color: '#374151' }}>Staked</th>
                      <th style={{ textAlign: 'right', padding: '12px 0', color: '#374151' }}>Rewards</th>
                      <th style={{ textAlign: 'right', padding: '12px 0', color: '#374151' }}>Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakingData.validators.map((validator, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 0' }}>{validator.name}</td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>{validator.staked} DGT</td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>{validator.rewards} DRT</td>
                        <td style={{ padding: '12px 0', textAlign: 'right' }}>{validator.commission}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Information Section */}
      <div style={{ 
        backgroundColor: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '12px', 
        padding: '24px',
        marginBottom: '40px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#374151', fontSize: '1.2rem' }}>
          About Dytallix Staking
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5', fontSize: '1rem' }}>
              🛡️ Quantum-Resistant Security
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Stake using post-quantum cryptographic algorithms that are secure against both classical and quantum attacks.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5', fontSize: '1rem' }}>
              💰 Earn DRT Rewards
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Receive DRT tokens as staking rewards while helping to secure the network and validate transactions.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5', fontSize: '1rem' }}>
              🗳️ Governance Participation
            </h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Use your staked DGT to participate in network governance and help shape the future of Dytallix.
            </p>
          </div>
        </div>
      </div>

      <ConnectDytallixWalletModal 
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSuccess={handleWalletSuccess}
      />
    </div>
  )
}

export default StakingRewardsPage