import React from 'react'

/**
 * Input component - Based on global.css input patterns
 * Supports all form input types with consistent styling
 */
export const Input = ({ 
  label,
  error,
  helper,
  className = '',
  style = {},
  type = 'text',
  ...props 
}) => {
  const inputClasses = [
    'input',
    'focus-ring',
    error ? 'error' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className="input-group">
      {label && (
        <label className="form-label">
          {label}
          {props.required && <span style={{ color: 'var(--color-danger-500)' }}> *</span>}
        </label>
      )}
      <input
        type={type}
        className={inputClasses}
        style={style}
        {...props}
      />
      {error && (
        <div style={{ 
          marginTop: '4px', 
          fontSize: '0.875rem', 
          color: 'var(--color-danger-500)' 
        }}>
          {error}
        </div>
      )}
      {helper && !error && (
        <div style={{ 
          marginTop: '4px', 
          fontSize: '0.875rem', 
          color: 'var(--color-text-muted)' 
        }}>
          {helper}
        </div>
      )}
    </div>
  )
}

/**
 * Textarea component - Based on global.css textarea patterns
 */
export const Textarea = ({ 
  label,
  error,
  helper,
  className = '',
  style = {},
  rows = 4,
  ...props 
}) => {
  const textareaClasses = [
    'textarea',
    'focus-ring',
    error ? 'error' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className="input-group">
      {label && (
        <label className="form-label">
          {label}
          {props.required && <span style={{ color: 'var(--color-danger-500)' }}> *</span>}
        </label>
      )}
      <textarea
        rows={rows}
        className={textareaClasses}
        style={style}
        {...props}
      />
      {error && (
        <div style={{ 
          marginTop: '4px', 
          fontSize: '0.875rem', 
          color: 'var(--color-danger-500)' 
        }}>
          {error}
        </div>
      )}
      {helper && !error && (
        <div style={{ 
          marginTop: '4px', 
          fontSize: '0.875rem', 
          color: 'var(--color-text-muted)' 
        }}>
          {helper}
        </div>
      )}
    </div>
  )
}

/**
 * Select component - Based on global.css select patterns
 */
export const Select = ({ 
  label,
  error,
  helper,
  options = [],
  placeholder,
  className = '',
  style = {},
  ...props 
}) => {
  const selectClasses = [
    'select',
    'focus-ring',
    error ? 'error' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className="input-group">
      {label && (
        <label className="form-label">
          {label}
          {props.required && <span style={{ color: 'var(--color-danger-500)' }}> *</span>}
        </label>
      )}
      <select
        className={selectClasses}
        style={style}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option 
            key={option.value || index} 
            value={option.value || option}
          >
            {option.label || option}
          </option>
        ))}
      </select>
      {error && (
        <div style={{ 
          marginTop: '4px', 
          fontSize: '0.875rem', 
          color: 'var(--color-danger-500)' 
        }}>
          {error}
        </div>
      )}
      {helper && !error && (
        <div style={{ 
          marginTop: '4px', 
          fontSize: '0.875rem', 
          color: 'var(--color-text-muted)' 
        }}>
          {helper}
        </div>
      )}
    </div>
  )
}

/**
 * Input group for related inputs
 */
export const InputGroup = ({ children, className = '', ...props }) => (
  <div className={`input-group ${className}`} {...props}>
    {children}
  </div>
)

/**
 * Form component for wrapping multiple inputs
 */
export const Form = ({ children, className = '', onSubmit, ...props }) => (
  <form 
    className={`form ${className}`}
    onSubmit={onSubmit}
    {...props}
  >
    {children}
  </form>
)