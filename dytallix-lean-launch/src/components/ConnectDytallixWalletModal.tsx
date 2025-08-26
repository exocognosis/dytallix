// Accessible Modal for Dytallix Wallet Connection and Management
import React, { useState, useEffect, useRef } from 'react'
import type { PQCAlgo } from '../lib/wallet/types.js'
import { useWalletStore, useWalletActions, useWalletState } from '../state/walletStore.js'

interface ConnectDytallixWalletModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ConnectDytallixWalletModal({ isOpen, onClose, onSuccess }: ConnectDytallixWalletModalProps) {
  const [mode, setMode] = useState<'main' | 'create' | 'import' | 'unlock'>('main')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [algorithm, setAlgorithm] = useState<PQCAlgo>('dilithium5')
  const [label, setLabel] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)
  
  const { provider, isUnlocked, accounts } = useWalletState()
  const { init, createVault, unlock, createAccount, importAccount } = useWalletActions()
  
  // Initialize provider on mount
  useEffect(() => {
    if (!provider) {
      init()
    }
  }, [provider, init])
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setConfirmPassword('')
      setPrivateKey('')
      setLabel('')
      setError('')
      setShowPassword(false)
      
      // Determine initial mode
      if (!provider?.vaultExists()) {
        setMode('create')
      } else if (!isUnlocked) {
        setMode('unlock')
      } else {
        setMode('main')
      }
      
      // Focus first input after a short delay
      setTimeout(() => firstInputRef.current?.focus(), 100)
    } else {
      setMode('main')
    }
  }, [isOpen, provider, isUnlocked])
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])
  
  // Trap focus within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return
    
    const modal = modalRef.current
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }
    
    modal.addEventListener('keydown', handleTabKey)
    return () => modal.removeEventListener('keydown', handleTabKey)
  }, [isOpen, mode])
  
  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      await createVault(password)
      setMode('main')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vault')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('Password is required')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      await unlock(password)
      setMode('main')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock vault')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsLoading(true)
    setError('')
    
    try {
      await createAccount(algorithm, label || undefined)
      setMode('main')
      setLabel('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleImportAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!privateKey.trim()) {
      setError('Private key is required')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      await importAccount(privateKey.trim(), algorithm, label || undefined)
      setMode('main')
      setPrivateKey('')
      setLabel('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import account')
    } finally {
      setIsLoading(false)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-modal-title"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 id="wallet-modal-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
            {mode === 'create' && 'Create Dytallix Vault'}
            {mode === 'unlock' && 'Unlock Dytallix Vault'}
            {mode === 'import' && 'Import Account'}
            {mode === 'main' && 'Dytallix Wallet'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>
        
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}
        
        {mode === 'create' && (
          <form onSubmit={handleCreateVault}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="create-password" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Set Vault Password
              </label>
              <input
                ref={firstInputRef}
                id="create-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="confirm-password" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Show passwords
              </label>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Creating Vault...' : 'Create Vault'}
            </button>
          </form>
        )}
        
        {mode === 'unlock' && (
          <form onSubmit={handleUnlock}>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="unlock-password" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Vault Password
              </label>
              <input
                ref={firstInputRef}
                id="unlock-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your vault password"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Show password
              </label>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              {isLoading ? 'Unlocking...' : 'Unlock Vault'}
            </button>
          </form>
        )}
        
        {mode === 'main' && (
          <div>
            {accounts.length === 0 ? (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                  No accounts found. Create a new account or import an existing one.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setMode('create')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Create Account
                  </button>
                  <button
                    onClick={() => setMode('import')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Import Account
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>Your Accounts</h3>
                  {accounts.map((account) => (
                    <div
                      key={account.address}
                      style={{
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        marginBottom: '8px'
                      }}
                    >
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>
                        {account.label || 'Unnamed Account'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                        {account.address}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Algorithm: {account.algo}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setMode('create')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Add Account
                  </button>
                  <button
                    onClick={() => setMode('import')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Import Account
                  </button>
                  <button
                    onClick={onClose}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {mode === 'import' && (
          <form onSubmit={handleImportAccount}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="private-key" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Private Key
              </label>
              <textarea
                ref={firstInputRef}
                id="private-key"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="Enter your private key"
                required
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="import-algorithm" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                PQC Algorithm
              </label>
              <select
                id="import-algorithm"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as PQCAlgo)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              >
                <option value="dilithium5">Dilithium5 (Recommended)</option>
                <option value="falcon1024">Falcon1024</option>
                <option value="sphincs_sha2_256s">SPHINCS+ SHA2-256s</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="import-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Account Label (Optional)
              </label>
              <input
                id="import-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Trading Account"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setMode('main')}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Importing...' : 'Import Account'}
              </button>
            </div>
          </form>
        )}
        
        {(mode === 'create' || mode === 'import') && mode !== 'main' && (
          <form onSubmit={mode === 'create' ? handleCreateAccount : handleImportAccount}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="algorithm" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                PQC Algorithm
              </label>
              <select
                id="algorithm"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as PQCAlgo)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              >
                <option value="dilithium5">Dilithium5 (Recommended)</option>
                <option value="falcon1024">Falcon1024</option>
                <option value="sphincs_sha2_256s">SPHINCS+ SHA2-256s</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="account-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Account Label (Optional)
              </label>
              <input
                id="account-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Main Account"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setMode('main')}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}