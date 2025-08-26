import React, { useState, useEffect } from 'react'

/**
 * Real-time Anomaly Panel Component
 * Displays live anomalies detected by the PulseScan anomaly detection engine
 */
const AnomalyPanel = () => {
  const [anomalies, setAnomalies] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [filter, setFilter] = useState({
    type: '',
    severity: '',
    limit: 50
  })
  const [status, setStatus] = useState('healthy')

  // Fetch anomalies from the API
  const fetchAnomalies = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      
      if (filter.type) queryParams.append('type', filter.type)
      if (filter.severity) queryParams.append('severity', filter.severity)
      if (filter.limit) queryParams.append('limit', filter.limit.toString())
      
      const response = await fetch(`/anomaly?${queryParams}`)
      const data = await response.json()
      
      if (data.ok) {
        setAnomalies(data.anomalies || [])
        setStatus(data.status || 'healthy')
        setLastUpdate(new Date().toLocaleTimeString())
      } else {
        console.error('Failed to fetch anomalies:', data)
      }
    } catch (error) {
      console.error('Error fetching anomalies:', error)
    } finally {
      setLoading(false)
    }
  }

  // Force anomaly detection
  const forceDetection = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/anomaly/run', { method: 'POST' })
      const data = await response.json()
      
      if (data.ok) {
        console.log('Force detection result:', data.message)
        // Refresh anomalies after force detection
        setTimeout(fetchAnomalies, 1000)
      }
    } catch (error) {
      console.error('Error forcing detection:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh anomalies every 3 seconds
  useEffect(() => {
    fetchAnomalies()
    const interval = setInterval(fetchAnomalies, 3000)
    return () => clearInterval(interval)
  }, [filter])

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc2626' // red-600
      case 'high': return '#ea580c' // orange-600  
      case 'medium': return '#d97706' // amber-600
      case 'low': return '#2563eb' // blue-600
      default: return '#6b7280' // gray-500
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return '#dc2626'
      case 'warning': return '#d97706'
      case 'degraded': return '#ea580c'
      case 'healthy': return '#16a34a'
      default: return '#6b7280'
    }
  }

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '4px' }}>
            🔍 Real-time Anomaly Detection
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Live blockchain network health monitoring
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            padding: '4px 12px', 
            borderRadius: '16px',
            backgroundColor: getStatusColor(status) + '20',
            border: `1px solid ${getStatusColor(status)}40`,
            color: getStatusColor(status),
            fontWeight: 600,
            fontSize: '14px'
          }}>
            {status.toUpperCase()}
          </div>
          {lastUpdate && (
            <span className="muted" style={{ fontSize: '12px' }}>
              Updated: {lastUpdate}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'end'
        }}>
          <div>
            <label className="form-label">Filter by Type</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
              className="select"
            >
              <option value="">All Types</option>
              <option value="tx_spike">Transaction Spike</option>
              <option value="validator_downtime">Validator Downtime</option>
              <option value="double_sign">Double Sign</option>
            </select>
          </div>

          <div>
            <label className="form-label">Filter by Severity</label>
            <select
              value={filter.severity}
              onChange={(e) => setFilter(prev => ({ ...prev, severity: e.target.value }))}
              className="select"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="form-label">Limit</label>
            <select
              value={filter.limit}
              onChange={(e) => setFilter(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
              className="select"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchAnomalies}
              disabled={loading}
              className="btn btn-secondary"
              style={{ minWidth: '100px' }}
            >
              {loading ? '⟳' : '🔄'} Refresh
            </button>
            <button
              onClick={forceDetection}
              disabled={loading}
              className="btn btn-primary"
              style={{ minWidth: '120px' }}
            >
              {loading ? '⟳' : '⚡'} Force Scan
            </button>
          </div>
        </div>
      </div>

      {/* Anomalies List */}
      {anomalies.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h3 style={{ marginBottom: '8px' }}>No Anomalies Detected</h3>
          <p className="muted">
            The system is operating normally. All blockchain metrics are within expected ranges.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {anomalies.map((anomaly, index) => (
            <div
              key={anomaly.id || index}
              className="card"
              style={{
                borderLeft: `4px solid ${getSeverityColor(anomaly.severity)}`,
                backgroundColor: getSeverityColor(anomaly.severity) + '08'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, color: getSeverityColor(anomaly.severity) }}>
                      {anomaly.type.replace('_', ' ').toUpperCase()}
                    </h4>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: getSeverityColor(anomaly.severity),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      {anomaly.severity.toUpperCase()}
                    </span>
                    {anomaly.entity && (
                      <span className="muted" style={{ fontSize: '14px' }}>
                        {anomaly.entity.kind}: {anomaly.entity.id}
                      </span>
                    )}
                  </div>
                  
                  <p style={{ margin: 0, marginBottom: '12px', lineHeight: 1.5 }}>
                    {anomaly.explanation}
                  </p>

                  {anomaly.metrics && (
                    <details style={{ marginTop: '8px' }}>
                      <summary style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                        View Metrics
                      </summary>
                      <pre style={{ 
                        fontSize: '12px', 
                        backgroundColor: '#f8f9fa', 
                        padding: '8px', 
                        borderRadius: '4px',
                        marginTop: '8px',
                        overflow: 'auto'
                      }}>
                        {JSON.stringify(anomaly.metrics, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>
                  {formatTime(anomaly.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AnomalyPanel