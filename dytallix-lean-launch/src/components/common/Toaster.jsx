import React, { createContext, useContext, useState, useCallback } from 'react'

const ToasterContext = createContext()

/**
 * Toaster notification provider for tx actions and system messages
 */
export const ToasterProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    const newToast = { 
      id, 
      ...toast,
      timestamp: Date.now()
    }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto-remove after timeout (unless it's a loading toast)
    if (toast.type !== 'loading') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, toast.duration || 5000)
    }
    
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const updateToast = useCallback((id, updates) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ))
  }, [])

  const success = useCallback((message, options = {}) => 
    addToast({ type: 'success', message, ...options }), [addToast])
  
  const error = useCallback((message, options = {}) => 
    addToast({ type: 'error', message, ...options }), [addToast])
  
  const loading = useCallback((message, options = {}) => 
    addToast({ type: 'loading', message, ...options }), [addToast])
  
  const info = useCallback((message, options = {}) => 
    addToast({ type: 'info', message, ...options }), [addToast])

  return (
    <ToasterContext.Provider value={{ 
      toasts, 
      addToast, 
      removeToast, 
      updateToast, 
      success, 
      error, 
      loading, 
      info 
    }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToasterContext.Provider>
  )
}

const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2" data-testid="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

const Toast = ({ toast, onRemove }) => {
  const typeConfig = {
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: '✓' },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: '✕' },
    loading: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: '⟳' },
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: 'ℹ' }
  }

  const config = typeConfig[toast.type] || typeConfig.info

  return (
    <div 
      className={`${config.bg} border ${config.text} rounded-lg p-4 shadow-lg max-w-sm w-full transition-all duration-300`}
      data-testid={`toast-${toast.type}`}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${toast.type === 'loading' ? 'animate-spin' : ''}`}>
          {config.icon}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{toast.message}</p>
          {toast.details && (
            <p className="mt-1 text-xs opacity-75">{toast.details}</p>
          )}
        </div>
        {toast.type !== 'loading' && (
          <button
            onClick={() => onRemove(toast.id)}
            className="ml-4 flex-shrink-0 text-xs opacity-50 hover:opacity-75"
            aria-label="Close notification"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export const useToaster = () => {
  const context = useContext(ToasterContext)
  if (!context) {
    throw new Error('useToaster must be used within a ToasterProvider')
  }
  return context
}

export default ToasterProvider