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
      <div style={{ marginBottom: '16px' }}>
        <label className="form-label">
          Select Transaction to Analyze
        </label>
        <select
          value={selectedTx}
          onChange={(e) => setSelectedTx(e.target.value)}
          className="select"
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
        className={`btn ${isAnalyzing ? 'btn-secondary' : 'btn-primary'}`}
        style={{ width: '100%', marginBottom: 20 }}
      >
        {isAnalyzing ? 'Analyzing Transaction...' : 'Run Anomaly Detection'}
      </button>

      {results && (
        <div className="card" style={{
          borderColor: results.isAnomalous ? 'rgba(239,68,68,0.35)' : 'rgba(59,130,246,0.25)'
        }}>
          <h3 style={{ marginBottom: 12 }}>
            Analysis Results
          </h3>

          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Anomaly Score:</span>
              <span className={results.isAnomalous ? 'badge badge-warning' : 'badge badge-success'}>
                {results.anomalyScore}%
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>Recommendation:</span>
              <span className={results.isAnomalous ? 'badge badge-warning' : 'badge badge-success'}>
                {results.recommendation}
              </span>
            </div>

            <div>
              <h4 style={{ marginBottom: 6, fontWeight: 700 }}>Analysis Factors</h4>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {results.factors.map((factor, index) => (
                  <li key={index} className="muted" style={{ marginBottom: 4 }}>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnomalyDemo