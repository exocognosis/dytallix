import React from 'react'

/**
 * Section component - Based on Home.jsx section patterns
 * Provides consistent section layout with headers and spacing
 */
export const Section = ({ 
  children,
  title,
  subtitle,
  background,
  className = '',
  headerAlign = 'center',
  spacing = 'normal',
  ...props 
}) => {
  const spacingStyles = {
    compact: { padding: '40px 0' },
    normal: { padding: '80px 0' },
    large: { padding: '120px 0' }
  }
  
  const backgroundStyles = {
    hero: { background: 'var(--gradient-hero)' },
    cta: { background: 'var(--gradient-cta)' },
    none: {},
    custom: {}
  }
  
  const sectionStyle = {
    ...spacingStyles[spacing],
    ...(background && background !== 'custom' ? backgroundStyles[background] : {}),
    ...(background === 'custom' ? { background } : {})
  }
  
  return (
    <section 
      className={`section ${className}`}
      style={sectionStyle}
      {...props}
    >
      <div className="container">
        {(title || subtitle) && (
          <SectionHeader 
            title={title}
            subtitle={subtitle}
            align={headerAlign}
          />
        )}
        {children}
      </div>
    </section>
  )
}

/**
 * SectionHeader component - Reusable section header
 */
export const SectionHeader = ({ 
  title,
  subtitle,
  align = 'center',
  className = '',
  ...props 
}) => {
  const alignmentStyles = {
    left: { textAlign: 'left' },
    center: { textAlign: 'center' },
    right: { textAlign: 'right' }
  }
  
  return (
    <div 
      className={`section-header ${className}`}
      style={alignmentStyles[align]}
      {...props}
    >
      {title && <h2 className="section-title">{title}</h2>}
      {subtitle && (
        typeof subtitle === 'string' ? (
          <p className="section-subtitle">{subtitle}</p>
        ) : (
          <div className="section-subtitle">{subtitle}</div>
        )
      )}
    </div>
  )
}

/**
 * Container component - Wraps content with consistent max-width and padding
 */
export const Container = ({ 
  children,
  size = 'default',
  className = '',
  ...props 
}) => {
  const sizeStyles = {
    sm: { maxWidth: '640px' },
    md: { maxWidth: '768px' },
    lg: { maxWidth: '1024px' },
    xl: { maxWidth: '1280px' },
    default: { maxWidth: '1280px' },
    full: { maxWidth: 'none' }
  }
  
  return (
    <div 
      className={`container ${className}`}
      style={sizeStyles[size]}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Grid component - Based on Home.jsx grid patterns
 */
export const Grid = ({ 
  children,
  columns = 'auto',
  gap = 'normal',
  className = '',
  ...props 
}) => {
  const gapStyles = {
    sm: { gap: '1rem' },
    normal: { gap: '2rem' },
    lg: { gap: '2.5rem' }
  }
  
  const columnStyles = {
    1: { gridTemplateColumns: '1fr' },
    2: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    3: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
    4: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
    auto: { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' },
    'auto-2': { gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }
  }
  
  const gridClasses = `grid ${
    typeof columns === 'number' ? `grid-${columns}` : ''
  } ${className}`
  
  return (
    <div 
      className={gridClasses}
      style={{
        ...gapStyles[gap],
        ...columnStyles[columns]
      }}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Hero section component - Specialized section for hero areas
 */
export const HeroSection = ({ 
  title,
  subtitle,
  actions,
  background = 'hero',
  className = '',
  ...props 
}) => {
  return (
    <Section 
      background={background}
      spacing="large"
      className={`hero-section ${className}`}
      style={{ paddingTop: '120px' }}
      {...props}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {title && (
          <h1 
            className="section-title" 
            style={{ 
              fontSize: '3rem', 
              marginBottom: '16px', 
              textAlign: 'center',
              lineHeight: 'var(--line-height-tight)'
            }}
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <div style={{ 
            fontSize: '1.125rem', 
            margin: '0 auto 36px', 
            textAlign: 'center',
            color: 'var(--color-text-muted)'
          }}>
            {subtitle}
          </div>
        )}
        {actions && (
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'center', 
            flexWrap: 'wrap' 
          }}>
            {actions}
          </div>
        )}
      </div>
    </Section>
  )
}