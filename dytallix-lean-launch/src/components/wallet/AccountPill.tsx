// Dytallix PQC Wallet Account Pill
// Shows connected account info with actions

import React, { useState } from 'react'
import type { Account, Balance } from '../../lib/wallet/types'

export interface AccountPillProps {
  account: Account
  balances?: Balance
  onCopyAddress: () => void
  onExportKey: () => void
  onLock: () => void
  onDisconnect: () => void
}

const formatAddress = (address: string) => {
  if (address.length <= 20) return address
  return `${address.slice(0, 10)}...${address.slice(-6)}`
}

const formatAmount = (amount: string, decimals: number = 6) => {
  const num = parseFloat(amount) / Math.pow(10, decimals)
  if (num === 0) return '0'
  if (num < 0.001) return '<0.001'
  return num.toFixed(3)
}

const getAlgoBadgeColor = (algo: string) => {
  switch (algo) {
    case 'dilithium': return '#3b82f6'
    case 'falcon': return '#10b981'
    case 'sphincs+': return '#f59e0b'
    default: return '#6b7280'
  }
}

export default function AccountPill({ 
  account, 
  balances, 
  onCopyAddress, 
  onExportKey, 
  onLock, 
  onDisconnect 
}: AccountPillProps) {
  const [showActions, setShowActions] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyAddress = () => {
    onCopyAddress()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div 
        className="account-pill"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          cursor: 'pointer',
          minWidth: '200px'
        }}
        onClick={() => setShowActions(!showActions)}
      >
        {/* Algorithm Badge */}
        <div 
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getAlgoBadgeColor(account.algo),
            flexShrink: 0
          }}
          title={`${account.algo.toUpperCase()} algorithm`}
        />

        {/* Account Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '2px'
          }}>
            {account.label || 'PQC Wallet'}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--text-muted)',
            fontFamily: 'monospace'
          }}>
            {formatAddress(account.address)}
          </div>
        </div>

        {/* Balances */}
        {balances && (
          <div style={{ textAlign: 'right', fontSize: '12px' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
              {formatAmount(balances.udgt)} DGT
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              {formatAmount(balances.udrt)} DRT
            </div>
          </div>
        )}

        {/* Dropdown Arrow */}
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--text-muted)',
          transform: showActions ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </div>
      </div>

      {/* Actions Dropdown */}
      {showActions && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
            overflow: 'hidden'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleCopyAddress()
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {copied ? '✓ Copied!' : '📋 Copy Address'}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onExportKey()
              setShowActions(false)
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            💾 Export Key
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onLock()
              setShowActions(false)
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              borderBottom: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '14px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🔒 Lock Wallet
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onDisconnect()
              setShowActions(false)
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              color: '#ef4444',
              fontSize: '14px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🚪 Disconnect
          </button>
        </div>
      )}

      {/* Click outside to close */}
      {showActions && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 5
          }}
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  )
}