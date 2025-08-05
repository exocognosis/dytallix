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

        <div style={{ display: 'grid', gap: '60px' }}>
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
                🔍 Transaction Anomaly Detection
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1.125rem', lineHeight: '1.6' }}>
                Our AI continuously monitors transaction patterns to detect suspicious activities 
                and potential security threats in real-time.
              </p>
            </div>
            <AnomalyDemo />
          </div>

          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '16px', color: '#1f2937' }}>
                🛡️ Smart Contract Security Scanner
              </h2>
              <p style={{ color: '#6b7280', fontSize: '1.125rem', lineHeight: '1.6' }}>
                Advanced static analysis powered by machine learning to identify vulnerabilities 
                and security issues in smart contract code.
              </p>
            </div>
            <ContractScannerDemo />
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>
              Available AI Modules
            </h2>
            
            <div className="grid grid-2" style={{ gap: '24px' }}>
              <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <h3 style={{ color: '#374151', marginBottom: '12px' }}>Network Optimization</h3>
                <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  ML algorithms optimize network parameters in real-time based on usage patterns and performance metrics.
                </p>
              </div>
              
              <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <h3 style={{ color: '#374151', marginBottom: '12px' }}>Fraud Prevention</h3>
                <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Advanced pattern recognition to identify and prevent fraudulent transactions and activities.
                </p>
              </div>
              
              <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <h3 style={{ color: '#374151', marginBottom: '12px' }}>Gas Estimation</h3>
                <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  Intelligent gas price prediction and optimization for efficient transaction processing.
                </p>
              </div>
              
              <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <h3 style={{ color: '#374151', marginBottom: '12px' }}>Validator Selection</h3>
                <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  AI-driven validator selection and rotation to maximize network security and decentralization.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Modules