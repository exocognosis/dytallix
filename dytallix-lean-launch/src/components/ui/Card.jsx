import React from 'react'

const cardVariants = {
  default: 'card',
  tinted: 'card card-tint-primary',
  outlined: 'card card-outline-primary',
}

const accentVariants = {
  primary: 'accent-blue',
  accent: 'accent-purple', 
  success: 'accent-cyan',
  warning: 'accent-amber',
  danger: 'accent-amber',
  info: 'accent-blue'
}

/**
 * Card component - Based on Home.jsx card patterns
 * Provides consistent styling with hover effects and accent variants
 */
export const Card = ({ 
  children, 
  variant = 'default',
  accent,
  borderTop = false,
  className = '',
  style = {},
  ...props 
}) => {
  const baseClasses = cardVariants[variant] || cardVariants.default
  const accentClass = accent ? accentVariants[accent] : ''
  const borderTopClass = borderTop && accent ? `border-top-${accent}` : ''
  
  const cardClasses = [
    baseClasses,
    accentClass,
    borderTopClass,
    className
  ].filter(Boolean).join(' ')

  // Inline styles for dynamic border-top colors (matching Home.jsx pattern)
  const dynamicStyles = {}
  if (borderTop && accent) {
    const colorMap = {
      primary: 'var(--color-primary-400)',
      accent: 'var(--color-accent-500)',
      success: 'var(--color-success-500)',
      warning: 'var(--color-warning-500)',
      danger: 'var(--color-danger-500)',
      info: 'var(--color-primary-400)'
    }
    dynamicStyles.borderTop = `3px solid ${colorMap[accent]}`
    dynamicStyles.paddingTop = '12px'
  }

  return (
    <div 
      className={cardClasses} 
      style={{ ...dynamicStyles, ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

// Pre-configured card variants for common use cases
export const FeatureCard = ({ icon, title, description, accent = 'primary', children, ...props }) => (
  <Card accent={accent} borderTop {...props}>
    {icon && (
      <div style={{ fontSize: '2rem', marginBottom: '16px', textAlign: 'center' }}>
        {icon}
      </div>
    )}
    {title && (
      <h3 style={{ 
        fontSize: '1.2rem', 
        fontWeight: 800, 
        marginBottom: '8px',
        color: `var(--color-${accent === 'success' ? 'success' : accent === 'warning' ? 'warning' : accent === 'accent' ? 'accent' : 'primary'}-${accent === 'accent' ? '500' : '400'})`
      }}>
        {title}
      </h3>
    )}
    {description && (
      <p className="muted" style={{ lineHeight: 1.6, marginBottom: children ? '12px' : 0 }}>
        {description}
      </p>
    )}
    {children}
  </Card>
)

// Step card for tutorial/getting started sections
export const StepCard = ({ step, title, description, accent = 'primary', children, ...props }) => (
  <Card accent={accent} borderTop {...props}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
      <div style={{ 
        width: 28, 
        height: 28, 
        borderRadius: 8, 
        background: 'var(--color-primary-400)', 
        color: '#0b1220', 
        fontWeight: 800, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        {step}
      </div>
      <h3 style={{ 
        fontSize: '1.05rem', 
        fontWeight: 700, 
        margin: 0,
        color: `var(--color-${accent === 'success' ? 'success' : accent === 'warning' ? 'warning' : accent === 'accent' ? 'accent' : 'primary'}-${accent === 'accent' ? '500' : '400'})`
      }}>
        {title}
      </h3>
    </div>
    {description && (
      <p className="muted" style={{ marginBottom: children ? '12px' : 0 }}>
        {description}
      </p>
    )}
    {children}
  </Card>
)

// KPI/Metric card for dashboard displays
export const MetricCard = ({ label, value, trend, className = '', ...props }) => (
  <div className={`kpi-tile ${className}`} {...props}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
    {trend && <div className="kpi-trend">{trend}</div>}
  </div>
)