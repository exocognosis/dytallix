import React from 'react'

/**
 * Stat component - Based on KPI patterns from global.css
 * Used for displaying metrics, statistics, and key performance indicators
 */
export const Stat = ({ 
  label,
  value,
  change,
  trend,
  icon,
  className = '',
  ...props 
}) => {
  return (
    <div className={`kpi-tile ${className}`} {...props}>
      {icon && (
        <div style={{ 
          marginBottom: '8px', 
          fontSize: '1.5rem',
          textAlign: 'center'
        }}>
          {icon}
        </div>
      )}
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {change && (
        <div style={{
          marginTop: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: trend === 'up' ? 'var(--color-success-500)' : 
                trend === 'down' ? 'var(--color-danger-500)' : 
                'var(--color-text-muted)'
        }}>
          {trend === 'up' && '↗ '}
          {trend === 'down' && '↘ '}
          {change}
        </div>
      )}
    </div>
  )
}

/**
 * StatGrid component - Container for multiple stats
 */
export const StatGrid = ({ children, columns = 3, className = '', ...props }) => {
  const gridClass = `kpi-grid ${className}`
  
  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
  }
  
  return (
    <div className={gridClass} style={gridStyle} {...props}>
      {children}
    </div>
  )
}

/**
 * MetricCard component - Enhanced stat with more visual prominence
 */
export const MetricCard = ({ 
  label,
  value,
  change,
  trend,
  icon,
  status,
  className = '',
  ...props 
}) => {
  const statusStyles = {
    pending: { color: 'var(--color-primary-400)' },
    unclaimed: { color: 'var(--color-accent-400)' },
    claimed: { color: 'var(--color-success-500)' },
    error: { color: 'var(--color-danger-500)' }
  }
  
  return (
    <div className={`metric-card ${className}`} {...props}>
      {icon && (
        <div style={{ 
          marginBottom: '12px', 
          fontSize: '2rem',
          textAlign: 'center',
          opacity: 0.8
        }}>
          {icon}
        </div>
      )}
      <div className="metric-label">{label}</div>
      <div 
        className={`metric-value ${status || ''}`}
        style={status ? statusStyles[status] : {}}
      >
        {value}
      </div>
      {change && (
        <div style={{
          marginTop: '8px',
          fontSize: '0.875rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          color: trend === 'up' ? 'var(--color-success-500)' : 
                trend === 'down' ? 'var(--color-danger-500)' : 
                'var(--color-text-muted)'
        }}>
          {trend === 'up' && <span>↗</span>}
          {trend === 'down' && <span>↘</span>}
          <span>{change}</span>
        </div>
      )}
    </div>
  )
}

/**
 * ProgressStat component - Stat with progress indicator
 */
export const ProgressStat = ({ 
  label,
  value,
  progress = 0,
  max = 100,
  className = '',
  ...props 
}) => {
  const percentage = Math.min((progress / max) * 100, 100)
  
  return (
    <div className={`kpi-tile ${className}`} {...props}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="progress-mini">
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

/**
 * ComparisonStat component - Stat showing before/after or comparison values
 */
export const ComparisonStat = ({ 
  label,
  current,
  previous,
  format = (val) => val,
  className = '',
  ...props 
}) => {
  const change = current - previous
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  const changePercent = previous !== 0 ? ((change / previous) * 100).toFixed(1) : 0
  
  return (
    <div className={`kpi-tile ${className}`} {...props}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{format(current)}</div>
      <div style={{
        marginTop: '4px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: trend === 'up' ? 'var(--color-success-500)' : 
              trend === 'down' ? 'var(--color-danger-500)' : 
              'var(--color-text-muted)'
      }}>
        {trend === 'up' && '↗ '}
        {trend === 'down' && '↘ '}
        {trend !== 'neutral' && `${changePercent}%`}
        {trend === 'neutral' && 'No change'}
      </div>
    </div>
  )
}