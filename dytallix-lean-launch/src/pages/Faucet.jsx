import React from 'react'
import FaucetForm from '../components/FaucetForm.jsx'

const Faucet = () => {
  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">Dytallix Testnet Faucet</h1>
          <p className="section-subtitle">
            Get free DYTX test tokens to experiment with our post-quantum blockchain platform
          </p>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card">
            <h2 style={{ marginBottom: '24px', color: '#1f2937' }}>Request Test Tokens</h2>
            <p style={{ marginBottom: '32px', color: '#6b7280' }}>
              Enter your wallet address below to receive 100 DYTX test tokens. 
              You can request tokens once every 24 hours.
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
                <strong>Token Amount:</strong> 100 DYTX per request
              </li>
              <li style={{ margin: '8px 0', color: '#6b7280' }}>
                <strong>Rate Limit:</strong> Once per 24 hours
              </li>
              <li style={{ margin: '8px 0', color: '#6b7280' }}>
                <strong>Network ID:</strong> dytallix-testnet-1
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Faucet