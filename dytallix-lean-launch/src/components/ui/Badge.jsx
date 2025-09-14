import React from 'react'

const badgeVariants = {
  success: 'badge badge-success',
  warning: 'badge badge-warning', 
  info: 'badge badge-info',
  neutral: 'badge badge-neutral',
  danger: 'badge badge-danger'
}

/**
 * Badge component - Based on global.css badge patterns
 * Used for status indicators, tags, and labels
 */
export const Badge = ({ 
  children,
  variant = 'neutral',
  icon,
  dot = false,
  className = '',
  ...props 
}) => {
  const badgeClasses = badgeVariants[variant] || badgeVariants.neutral
  
  return (
    <span className={`${badgeClasses} ${className}`} {...props}>
      {dot && (
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          marginRight: icon || children ? '6px' : 0
        }} />
      )}
      {icon && (
        <span style={{ marginRight: children ? '6px' : 0 }}>
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}

// Pre-configured badge variants
export const SuccessBadge = (props) => (
  <Badge variant="success" {...props} />
)

export const WarningBadge = (props) => (
  <Badge variant="warning" {...props} />
)

export const InfoBadge = (props) => (
  <Badge variant="info" {...props} />
)

export const DangerBadge = (props) => (
  <Badge variant="danger" {...props} />
)

export const NeutralBadge = (props) => (
  <Badge variant="neutral" {...props} />
)

// Status badge for API states
export const StatusBadge = ({ status, ...props }) => {
  const statusVariants = {
    online: 'success',
    offline: 'danger', 
    pending: 'warning',
    loading: 'info',
    error: 'danger',
    success: 'success',
    warning: 'warning',
    info: 'info'
  }
  
  const variant = statusVariants[status] || 'neutral'
  
  return (
    <Badge variant={variant} dot {...props}>
      {status}
    </Badge>
  )
}

// Network status badge
export const NetworkBadge = ({ network, ...props }) => {
  const networkVariants = {
    mainnet: 'success',
    testnet: 'warning',
    devnet: 'info',
    local: 'neutral'
  }
  
  const variant = networkVariants[network] || 'neutral'
  
  return (
    <Badge variant={variant} {...props}>
      {network}
    </Badge>
  )
}

// Token badge for cryptocurrency displays
export const TokenBadge = ({ symbol, icon, ...props }) => (
  <Badge variant="info" icon={icon} {...props}>
    {symbol}
  </Badge>
)

// Count badge for notifications/counters
export const CountBadge = ({ count, max = 99, ...props }) => {
  const displayCount = count > max ? `${max}+` : count
  
  return (
    <Badge 
      variant="danger" 
      style={{ 
        minWidth: '20px',
        height: '20px',
        borderRadius: '10px',
        padding: '2px 6px',
        fontSize: '0.75rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      {...props}
    >
      {displayCount}
    </Badge>
  )
}