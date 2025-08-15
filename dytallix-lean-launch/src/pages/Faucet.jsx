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

        {/* Two-column layout: first row has two equal-height cards */}
        <div
          className="grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 24,
            alignItems: 'stretch'
          }}
        >
          {/* Request Test Tokens (left) */}
          <div
            className="card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center' }}
          >
            <h2 style={{ marginBottom: 16 }}>Request Test Tokens</h2>
            <p className="muted" style={{ marginBottom: 24 }}>
              Choose between DGT (Governance) or DRT (Reward) tokens below. Each token type has different request limits and cooldown periods.
            </p>
            <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
              <FaucetForm />
            </div>
          </div>

          {/* Understanding card (right) */}
          <div
            className="card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center' }}
          >
            <h2 style={{ marginBottom: 20 }}>
              Understanding the Dytallix Dual Token System
            </h2>
            <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
              <div className="grid grid-2" style={{ gap: 20, textAlign: 'left' }}>
                {/* DGT Section */}
                <div className="card" style={{ borderColor: 'rgba(59,130,246,0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>DGT</span>
                    </div>
                    <h3 style={{ margin: 0 }}>Dytallix Governance Tokens</h3>
                  </div>
                  <div className="muted" style={{ marginBottom: 8 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Purpose:</strong> On-chain governance and protocol control
                  </div>
                  <div className="muted" style={{ marginBottom: 8 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Usage:</strong> Vote on upgrades, validator onboarding, treasury allocation
                  </div>
                  <div className="muted" style={{ marginBottom: 8 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Distribution:</strong> 100M total supply, with 12-month cliff and 4-year vesting
                  </div>
                  <div className="muted" style={{ marginBottom: 12 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Transferability:</strong> Non-transferable for first 6 months post-mainnet
                  </div>
                  <div className="card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.35)' }}>
                    <strong style={{ color: '#FCA5A5' }}>Testnet Note:</strong>
                    <p className="muted" style={{ marginTop: 4, fontSize: '0.9rem' }}>
                      Claimable only for simulation/testing, no market value
                    </p>
                  </div>
                </div>

                {/* DRT Section */}
                <div className="card" style={{ borderColor: 'rgba(16,185,129,0.28)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>DRT</span>
                    </div>
                    <h3 style={{ margin: 0 }}>Dytallix Reward Tokens</h3>
                  </div>
                  <div className="muted" style={{ marginBottom: 8 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Purpose:</strong> Fuel AI module usage, reward testnet actions, incentivize behavior
                  </div>
                  <div className="muted" style={{ marginBottom: 8 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Usage:</strong> Pay for services, redeem credits, stake
                  </div>
                  <div className="muted" style={{ marginBottom: 8 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Distribution:</strong> Faucet + validator uptime, capped at 1B testnet tokens
                  </div>
                  <div className="muted" style={{ marginBottom: 12 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Transferability:</strong> Freely transferable and usable in testnet
                  </div>
                  <div className="card" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.32)' }}>
                    <strong style={{ color: '#86EFAC' }}>Testnet Benefit:</strong>
                    <p className="muted" style={{ marginTop: 4, fontSize: '0.9rem' }}>
                      Actively used for testing AI modules and network operations
                    </p>
                  </div>
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