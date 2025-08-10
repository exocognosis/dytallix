import React from 'react'
import AnomalyDemo from '../components/AnomalyDemo.jsx'
import ContractScannerDemo from '../components/ContractScannerDemo.jsx'

const Modules = () => {
  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">AI Modules</h1>
          <p className="section-subtitle">
            Experience the power of AI-enhanced blockchain security and optimization
          </p>
        </div>

        <div style={{ display: 'grid', gap: 28 }}>
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
                🔍 Transaction Anomaly Detection
              </h2>
              <p className="muted" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
                Our AI continuously monitors transaction patterns to detect suspicious activities and potential security threats in real-time.
              </p>
            </div>
            <AnomalyDemo />
          </div>

          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>
                🛡️ Smart Contract Security Scanner
              </h2>
              <p className="muted" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
                Advanced static analysis powered by machine learning to identify vulnerabilities and security issues in smart contract code.
              </p>
            </div>
            <ContractScannerDemo />
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12 }}>
              Available AI Modules
            </h2>
            <div className="grid grid-2" style={{ gap: 16 }}>
              {[{
                title: 'Network Optimization', desc: 'ML algorithms optimize network parameters in real-time based on usage patterns and performance metrics.'
              },{
                title: 'Fraud Prevention', desc: 'Advanced pattern recognition to identify and prevent fraudulent transactions and activities.'
              },{
                title: 'Gas Estimation', desc: 'Intelligent gas price prediction and optimization for efficient transaction processing.'
              },{
                title: 'Validator Selection', desc: 'AI-driven validator selection and rotation to maximize network security and decentralization.'
              }].map((m, i) => (
                <div key={i} className="card" style={{ padding: 20 }}>
                  <h3 style={{ marginBottom: 8 }}>{m.title}</h3>
                  <p className="muted" style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modules