import React from 'react'
import FaucetForm from '../components/FaucetForm.jsx'

const Faucet = () => {
  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">Dytallix Testnet Faucet</h1>
          <p className="section-subtitle">
            Get free test tokens to experiment with our post-quantum blockchain platform's dual-tokenomics system
          </p>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card">
            <h2 style={{ marginBottom: '24px', color: '#1f2937' }}>Request Test Tokens</h2>
            <p style={{ marginBottom: '32px', color: '#6b7280' }}>
              Choose between DGT (Governance) or DRT (Reward) tokens below. 
              Each token type has different request limits and cooldown periods.
            </p>
            <FaucetForm />
          </div>

          <div className="card" style={{ marginTop: '32px' }}>
            <h3 style={{ marginBottom: '16px', color: '#1f2937' }}>Faucet Information</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ margin: '8px 0', color: '#6b7280' }}>
                <strong>Network:</strong> Dytallix Testnet
              </li>
              <li style={{ margin: '8px 0', color: '#6b7280' }}>
                <strong>DGT Amount:</strong> 2 DGT per request (24h cooldown)
              </li>
              <li style={{ margin: '8px 0', color: '#6b7280' }}>
                <strong>DRT Amount:</strong> 5 DRT per request (6h cooldown)
              </li>
              <li style={{ margin: '8px 0', color: '#6b7280' }}>
                <strong>Network ID:</strong> dytallix-testnet-1
              </li>
            </ul>
          </div>
        </div>

        {/* Educational Content Section */}
        <div style={{ maxWidth: '800px', margin: '48px auto 0' }}>
          <div className="card">
            <h2 style={{ marginBottom: '32px', color: '#1f2937', textAlign: 'center' }}>
              Understanding the Dytallix Dual Token System
            </h2>
            
            <div className="grid grid-2" style={{ gap: '24px' }}>
              {/* DGT Section */}
              <div style={{ 
                padding: '24px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '2px solid #3b82f6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: '#3b82f6', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>DGT</span>
                  </div>
                  <h3 style={{ margin: 0, color: '#1e40af' }}>Dytallix Governance Tokens</h3>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#1e40af' }}>Purpose:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#374151' }}>On-chain governance and protocol control</p>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#1e40af' }}>Usage:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#374151' }}>Vote on upgrades, validator onboarding, treasury allocation</p>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#1e40af' }}>Distribution:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#374151' }}>100M total supply, with 12-month cliff and 4-year vesting</p>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#1e40af' }}>Transferability:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#374151' }}>Non-transferable for first 6 months post-mainnet</p>
                </div>
                
                <div style={{ 
                  background: '#fee2e2', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid #fecaca' 
                }}>
                  <strong style={{ color: '#991b1b' }}>Testnet Note:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#991b1b', fontSize: '0.875rem' }}>
                    Claimable only for simulation/testing, no market value
                  </p>
                </div>
              </div>

              {/* DRT Section */}
              <div style={{ 
                padding: '24px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '2px solid #10b981'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: '#10b981', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: '12px'
                  }}>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>DRT</span>
                  </div>
                  <h3 style={{ margin: 0, color: '#059669' }}>Dytallix Reward Tokens</h3>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#059669' }}>Purpose:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#374151' }}>Fuel AI module usage, reward testnet actions, incentivize behavior</p>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#059669' }}>Usage:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#374151' }}>Pay for services, redeem credits, stake</p>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#059669' }}>Distribution:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#374151' }}>Faucet + validator uptime, capped at 1B testnet tokens</p>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: '#059669' }}>Transferability:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#374151' }}>Freely transferable and usable in testnet</p>
                </div>
                
                <div style={{ 
                  background: '#f0fdf4', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid #bbf7d0' 
                }}>
                  <strong style={{ color: '#166534' }}>Testnet Benefit:</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#166534', fontSize: '0.875rem' }}>
                    Actively used for testing AI modules and network operations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Faucet