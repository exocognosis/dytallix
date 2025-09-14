import React from 'react'

const buttonVariants = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  outline: 'btn btn-outline',
}

const buttonSizes = {
  sm: { padding: '8px 16px', fontSize: '0.875rem' },
  md: { padding: '12px 20px', fontSize: '1rem' },
  lg: { padding: '16px 24px', fontSize: '1.125rem' },
}

/**
 * Button component - Based on Home.jsx button patterns
 * Supports all the button styles used in Home.jsx including glow effects
 */
export const Button = ({ 
  children,
  variant = 'primary',
  size = 'md',
  glow = false,
  disabled = false,
  className = '',
  style = {},
  as: Component = 'button',
  ...props 
}) => {
  const baseClasses = buttonVariants[variant] || buttonVariants.primary
  const glowClass = glow ? 'glow' : ''
  
  const buttonClasses = [
    baseClasses,
    glowClass,
    disabled ? 'disabled' : '',
    className
  ].filter(Boolean).join(' ')

  const sizeStyles = buttonSizes[size] || buttonSizes.md

  return (
    <Component 
      className={buttonClasses}
      style={{ ...sizeStyles, ...style }}
      disabled={disabled}
      {...props}
    >
      {children}
    </Component>
  )
}

// Specialized button components for common use cases

export const PrimaryButton = (props) => (
  <Button variant="primary" {...props} />
)

export const SecondaryButton = (props) => (
  <Button variant="secondary" {...props} />
)

export const OutlineButton = (props) => (
  <Button variant="outline" {...props} />
)

// CTA Button with glow effect (as used in Home.jsx)
export const CTAButton = (props) => (
  <Button variant="primary" glow {...props} />
)

// Link button for navigation (renders as Link component)
export const LinkButton = ({ to, external = false, ...props }) => {
  if (external) {
    return (
      <Button 
        as="a" 
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        {...props} 
      />
    )
  }
  
  // For internal links, you would import Link from react-router-dom
  // This is a placeholder that renders as an anchor for now
  return (
    <Button 
      as="a" 
      href={to}
      {...props} 
    />
  )
}

// Button group for multiple related actions
export const ButtonGroup = ({ children, gap = 'md', className = '', ...props }) => {
  const gapValue = {
    sm: '8px',
    md: '12px', 
    lg: '20px'
  }[gap] || '12px'

  return (
    <div 
      className={`flex gap-${gap} justify-center flex-wrap ${className}`}
      style={{ gap: gapValue }}
      {...props}
    >
      {children}
    </div>
  )
}

// Icon button for buttons with just icons
export const IconButton = ({ icon, children, size = 'md', ...props }) => {
  const iconSizes = {
    sm: { width: '32px', height: '32px', padding: '6px' },
    md: { width: '40px', height: '40px', padding: '8px' },
    lg: { width: '48px', height: '48px', padding: '12px' },
  }

  const sizeStyle = iconSizes[size] || iconSizes.md

  return (
    <Button 
      size={size}
      style={{ 
        ...sizeStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      {...props}
    >
      {icon}
      {children && <span style={{ marginLeft: '8px' }}>{children}</span>}
    </Button>
  )
}