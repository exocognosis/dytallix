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

        {/* Two-column responsive layout: left = Request Flow, right = Token Info */}
        <div
          className="grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 24,
            alignItems: 'start'
          }}
        >
          {/* LEFT COLUMN: Request Flow */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0 }}>Request Test Tokens</h2>
            {/* FaucetForm internally renders: Token Selection, Wallet Input, Action & Info */}
            <FaucetForm />
          </div>

          {/* RIGHT COLUMN: Token Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0 }}>Understanding the Dual Token System</h2>

            {/* DGT Card */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>DGT</span>
                </div>
                <h3 style={{ margin: 0 }}>Governance Token (DGT)</h3>
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Purpose:</strong> On-chain governance and protocol control
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Usage:</strong> Vote on upgrades, validator onboarding, treasury allocation
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Distribution:</strong> 100M total supply, 12-month cliff, 4-year vesting
              </div>
              <div className="muted" style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Transferability:</strong> Non-transferable for first 6 months post‑mainnet
              </div>
              <div className="card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.35)' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(239,68,68,0.15)',
                  color: '#FCA5A5',
                  fontSize: 12,
                  fontWeight: 600
                }}>Testnet Only</span>
                <p className="muted" style={{ marginTop: 6, fontSize: '0.9rem' }}>
                  Claimable for simulation/testing only; no market value.
                </p>
              </div>
            </div>

            {/* DRT Card */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>DRT</span>
                </div>
                <h3 style={{ margin: 0 }}>Reward Token (DRT)</h3>
              </div>
              <div className="muted" style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Purpose:</strong> Fuel AI module usage and reward testnet actions
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
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(16,185,129,0.15)',
                  color: '#86EFAC',
                  fontSize: 12,
                  fontWeight: 600
                }}>Testnet Benefit</span>
                <p className="muted" style={{ marginTop: 6, fontSize: '0.9rem' }}>
                  Powers testing flows for AI modules and network activity.
                </p>
              </div>
            </div>

            {/* Dual-Token Characteristics */}
            <div className="card" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ minWidth: 40, height: 40, padding: '0 10px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-500), var(--success-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'white', fontWeight: 'bold', fontSize: 12, letterSpacing: '.5px' }}>DGT+DRT</span>
                </div>
                <h3 style={{ margin: 0 }}>Dual-Token Key Characteristics</h3>
              </div>
              <ul style={{ listStyle: 'disc', paddingLeft: 20, margin: 0, lineHeight: 1.55, fontSize: '.9rem' }} className="muted">
                <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>Separation of roles:</strong> DGT for governance; DRT for utility.</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>Distinct faucet cooldowns:</strong> Independent request timers for each token.</li>
                <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>Incentives for testing:</strong> Rewards active participation and module use.</li>
                <li><strong style={{ color: 'var(--text-primary)' }}>Utility & hardening:</strong> Encourages real usage that strengthens the protocol.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Removed redundant Educational Content Section duplicate */}
      </div>
    </div>
  )
}

export default Faucet
