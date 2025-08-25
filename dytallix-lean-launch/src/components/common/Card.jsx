import React from 'react'

/**
 * Enhanced Card component with dark mode support
 * @param {Object} props
 * @param {string} [props.title] - Card title
 * @param {string} [props.subtitle] - Card subtitle
 * @param {React.ReactNode} [props.actions] - Action buttons/elements
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className] - Additional CSS classes
 */
const Card = ({ title, subtitle, actions, children, className = '' }) => {
  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
      data-testid="card"
    >
      {(title || subtitle || actions) && (
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  )
}

export default Card