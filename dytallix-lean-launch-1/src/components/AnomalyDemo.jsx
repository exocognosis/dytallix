import React, { useState } from 'react'
import mockTxLogs from '../data/mockTxLogs.json'

const AnomalyDemo = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState(null)
  const [selectedTx, setSelectedTx] = useState('')

  const analyzeTransaction = async () => {
    if (!selectedTx) return

    setIsAnalyzing(true)
    setResults(null)

    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    const tx = mockTxLogs.transactions.find(t => t.hash === selectedTx)
    
    // Mock analysis results
    const anomalyScore = Math.random()
    const isAnomalous = anomalyScore > 0.7

    setResults({
      transaction: tx,
      anomalyScore: (anomalyScore * 100).toFixed(1),
      isAnomalous,
      factors: isAnomalous ? [
        'Unusual transaction pattern detected',
        'Gas usage outside normal range',
        'Transaction frequency anomaly'
      ] : [
        'Normal transaction behavior',
        'Gas usage within expected range',
        'Standard transaction pattern'
      ],
      recommendation: isAnomalous ? 'REVIEW REQUIRED' : 'APPROVED'
    })

    setIsAnalyzing(false)
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'block', 
          fontWeight: '600', 
          marginBottom: '8px',
          color: '#374151' 
        }}>
          Select Transaction to Analyze:
        </label>
        <select
          value={selectedTx}
          onChange={(e) => setSelectedTx(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '1rem',
            backgroundColor: '#fff'
          }}
        >
          <option value="">Choose a transaction...</option>
          {mockTxLogs.transactions.map((tx) => (
            <option key={tx.hash} value={tx.hash}>
              {tx.hash.substring(0, 20)}... - {tx.type}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={analyzeTransaction}
        disabled={!selectedTx || isAnalyzing}
        style={{
          width: '100%',
          padding: '14px 24px',
          backgroundColor: isAnalyzing ? '#9ca3af' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: selectedTx && !isAnalyzing ? 'pointer' : 'not-allowed',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        {isAnalyzing ? (
          <>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Analyzing Transaction...
          </>
        ) : (
          'Run Anomaly Detection'
        )}
      </button>

      {results && (
        <div style={{
          padding: '24px',
          backgroundColor: results.isAnomalous ? '#fef2f2' : '#f0f9ff',
          border: `2px solid ${results.isAnomalous ? '#fecaca' : '#bae6fd'}`,
          borderRadius: '12px'
        }}>
          <h3 style={{ 
            marginBottom: '16px',
            color: results.isAnomalous ? '#991b1b' : '#0369a1'
          }}>
            Analysis Results
          </h3>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '600' }}>Anomaly Score:</span>
              <span style={{ 
                color: results.isAnomalous ? '#dc2626' : '#059669',
                fontWeight: '600'
              }}>
                {results.anomalyScore}%
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '600' }}>Recommendation:</span>
              <span style={{ 
                color: results.isAnomalous ? '#dc2626' : '#059669',
                fontWeight: '600'
              }}>
                {results.recommendation}
              </span>
            </div>

            <div>
              <h4 style={{ marginBottom: '8px', fontWeight: '600' }}>Analysis Factors:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {results.factors.map((factor, index) => (
                  <li key={index} style={{ marginBottom: '4px', color: '#6b7280' }}>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}

export default AnomalyDemo