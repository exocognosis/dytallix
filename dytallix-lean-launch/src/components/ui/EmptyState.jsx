import React from 'react'

/**
 * EmptyState component - For displaying empty/loading states
 * Provides consistent patterns for when there's no data to show
 */
export const EmptyState = ({ 
  icon,
  title,
  description,
  action,
  className = '',
  ...props 
}) => {
  return (
    <div 
      className={`empty-state ${className}`}
      style={{
        textAlign: 'center',
        padding: 'var(--spacing-3xl) var(--spacing-xl)',
        color: 'var(--color-text-muted)'
      }}
      {...props}
    >
      {icon && (
        <div style={{
          fontSize: '3rem',
          marginBottom: 'var(--spacing-lg)',
          opacity: 0.6
        }}>
          {icon}
        </div>
      )}
      {title && (
        <h3 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-sm)',
          color: 'var(--color-text-primary)'
        }}>
          {title}
        </h3>
      )}
      {description && (
        <p style={{
          fontSize: 'var(--font-size-base)',
          lineHeight: 'var(--line-height-normal)',
          marginBottom: action ? 'var(--spacing-xl)' : 0,
          maxWidth: '400px',
          margin: action ? '0 auto var(--spacing-xl)' : '0 auto'
        }}>
          {description}
        </p>
      )}
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  )
}

/**
 * LoadingState component - For displaying loading states
 */
export const LoadingState = ({ 
  message = 'Loading...',
  className = '',
  ...props 
}) => {
  return (
    <EmptyState
      icon={<div className="spinner" />}
      title={message}
      className={className}
      {...props}
    />
  )
}

/**
 * ErrorState component - For displaying error states
 */
export const ErrorState = ({ 
  title = 'Something went wrong',
  description = 'An error occurred while loading the data.',
  retry,
  className = '',
  ...props 
}) => {
  return (
    <EmptyState
      icon="⚠️"
      title={title}
      description={description}
      action={retry && (
        <button 
          className="btn btn-secondary"
          onClick={retry}
        >
          Try Again
        </button>
      )}
      className={className}
      {...props}
    />
  )
}

/**
 * NoDataState component - For when there's no data to display
 */
export const NoDataState = ({ 
  title = 'No data available',
  description = 'There is no data to display at this time.',
  action,
  icon = '📊',
  className = '',
  ...props 
}) => {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
      {...props}
    />
  )
}

/**
 * NotFoundState component - For 404-style states
 */
export const NotFoundState = ({ 
  title = 'Not Found',
  description = 'The item you are looking for could not be found.',
  action,
  className = '',
  ...props 
}) => {
  return (
    <EmptyState
      icon="🔍"
      title={title}
      description={description}
      action={action}
      className={className}
      {...props}
    />
  )
}

/**
 * WelcomeState component - For onboarding/welcome states
 */
export const WelcomeState = ({ 
  title = 'Welcome!',
  description = 'Get started by taking your first action.',
  action,
  icon = '👋',
  className = '',
  ...props 
}) => {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      className={className}
      {...props}
    />
  )
}

/**
 * MaintenanceState component - For maintenance mode
 */
export const MaintenanceState = ({ 
  title = 'Under Maintenance',
  description = 'This feature is temporarily unavailable while we perform maintenance.',
  className = '',
  ...props 
}) => {
  return (
    <EmptyState
      icon="🔧"
      title={title}
      description={description}
      className={className}
      {...props}
    />
  )
}

/**
 * OfflineState component - For offline/network error states
 */
export const OfflineState = ({ 
  title = 'Connection Lost',
  description = 'Please check your internet connection and try again.',
  retry,
  className = '',
  ...props 
}) => {
  return (
    <EmptyState
      icon="📡"
      title={title}
      description={description}
      action={retry && (
        <button 
          className="btn btn-primary"
          onClick={retry}
        >
          Retry Connection
        </button>
      )}
      className={className}
      {...props}
    />
  )
}