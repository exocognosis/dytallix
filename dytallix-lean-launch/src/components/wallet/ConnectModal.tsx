// Dytallix PQC Wallet Connect Modal
// Replaces traditional "Connect Wallet" with PQC-specific wallet creation/connection

import React, { useState } from 'react'
import type { Algo } from '../../lib/wallet/types'

export interface ConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (account: any) => void
}

const ALGORITHMS: Array<{ value: Algo; label: string; description: string }> = [
  { value: 'dilithium', label: 'Dilithium', description: 'NIST standardized, balanced security/performance' },
  { value: 'falcon', label: 'Falcon', description: 'Compact signatures, faster verification' },
  { value: 'sphincs+', label: 'SPHINCS+', description: 'Conservative choice, hash-based security' }
]

export default function ConnectModal({ isOpen, onClose, onConnect }: ConnectModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'import' | 'existing'>('create')
  const [algo, setAlgo] = useState<Algo>('dilithium')
  const [label, setLabel] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [confirmPassphrase, setConfirmPassphrase] = useState('')
  const [importData, setImportData] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleCreateKey = async () => {
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match')
      return
    }
    
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      // TODO: Integrate with actual wallet provider
      const mockAccount = {
        address: `dytallix1${Math.random().toString(36).substring(2, 50)}`,
        pubkey: 'mock_pubkey',
        algo,
        label
      }
      
      onConnect(mockAccount)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportKey = async () => {
    if (!importData.trim()) {
      setError('Please provide import data')
      return
    }
    
    if (!passphrase) {
      setError('Passphrase is required')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      // TODO: Integrate with actual wallet provider
      const mockAccount = {
        address: `dytallix1imported${Math.random().toString(36).substring(2, 40)}`,
        pubkey: 'imported_pubkey',
        algo: 'dilithium' as Algo,
        label: 'Imported Key'
      }
      
      onConnect(mockAccount)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import key')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExistingKey = async () => {
    if (!passphrase) {
      setError('Passphrase is required to unlock existing wallet')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      // TODO: Integrate with actual wallet provider to unlock existing wallet
      const mockAccount = {
        address: 'dytallix1existing123456789012345678901234567890',
        pubkey: 'existing_pubkey',
        algo: 'dilithium' as Algo,
        label: 'Existing Wallet'
      }
      
      onConnect(mockAccount)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock wallet')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 50
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '8px',
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid var(--border-color)'
      }}>
        <div className="modal-header" style={{
          padding: '24px 24px 0 24px',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>PQC Wallet Access</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ display: 'flex', marginTop: '16px' }}>
            {(['create', 'import', 'existing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: activeTab === tab ? 'var(--accent-primary)' : 'transparent',
                  color: activeTab === tab ? 'white' : 'var(--text-muted)',
                  borderRadius: '4px',
                  marginRight: '8px',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'create' ? 'Create New' : tab === 'import' ? 'Import Key' : 'Existing Wallet'}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-body" style={{ padding: '0 24px 24px 24px' }}>
          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderRadius: '4px',
              marginBottom: '16px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {error}
            </div>
          )}

          {activeTab === 'create' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Algorithm
                </label>
                <select
                  value={algo}
                  onChange={(e) => setAlgo(e.target.value as Algo)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                >
                  {ALGORITHMS.map((alg) => (
                    <option key={alg.value} value={alg.value}>
                      {alg.label} - {alg.description}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Label (optional)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="My PQC Wallet"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Passphrase
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Secure passphrase (min 8 chars)"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Confirm Passphrase
                </label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Confirm passphrase"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                />
              </div>

              <button
                onClick={handleCreateKey}
                disabled={isLoading || !passphrase || passphrase !== confirmPassphrase}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: (isLoading || !passphrase || passphrase !== confirmPassphrase) ? 0.6 : 1
                }}
              >
                {isLoading ? 'Creating...' : 'Create PQC Wallet'}
              </button>
            </div>
          )}

          {activeTab === 'import' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Import Data
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Paste encrypted JSON keystore or mnemonic phrase..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Passphrase
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Passphrase to decrypt"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                />
              </div>

              <button
                onClick={handleImportKey}
                disabled={isLoading || !importData.trim() || !passphrase}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: (isLoading || !importData.trim() || !passphrase) ? 0.6 : 1
                }}
              >
                {isLoading ? 'Importing...' : 'Import PQC Key'}
              </button>
            </div>
          )}

          {activeTab === 'existing' && (
            <div>
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
                  Unlock your existing PQC wallet stored in this browser.
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Wallet Passphrase
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter your wallet passphrase"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)'
                  }}
                />
              </div>

              <button
                onClick={handleExistingKey}
                disabled={isLoading || !passphrase}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: (isLoading || !passphrase) ? 0.6 : 1
                }}
              >
                {isLoading ? 'Unlocking...' : 'Unlock Existing Wallet'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}