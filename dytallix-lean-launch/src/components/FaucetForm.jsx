import React, { useState, useEffect } from 'react'
import styles from '../styles/FaucetForm.module.css'
import dgtIcon from '../assets/dgt.svg'
import drtIcon from '../assets/drt.svg'
import { requestFaucet } from '../lib/api.js'
import { loadMeta } from '../wallet/Keystore'
import { faucetBaseUrl } from '../config/env.ts'

// Cosmos network configuration
const COSMOS_CONFIG = {
  lcdUrl: import.meta.env.VITE_LCD_HTTP_URL || 'https://lcd-testnet.dytallix.com',
  rpcUrl: import.meta.env.VITE_RPC_HTTP_URL || 'https://rpc-testnet.dytallix.com',
  chainId: import.meta.env.VITE_CHAIN_ID || 'dytallix-testnet-1',
  faucetApiUrl: faucetBaseUrl || '/api/faucet'
}

// Token selection options
const TOKEN_OPTIONS = {
  both: { label: 'Both DGT + DRT (Recommended)', description: 'Get both governance and reward tokens', tokens: ['DGT', 'DRT'] },
  DGT: { label: 'DGT Only (Governance)', description: 'On-chain governance and protocol control', tokens: ['DGT'] },
  DRT: { label: 'DRT Only (Rewards)', description: 'Fuel AI module usage, reward testnet actions', tokens: ['DRT'] }
}

const FaucetForm = () => {
  const [address, setAddress] = useState('')
  const [selectedOption, setSelectedOption] = useState('both') // both, DGT, or DRT
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [cooldowns, setCooldowns] = useState({ DGT: 0, DRT: 0 })
  const [connected, setConnected] = useState(false)
  const [walletAutoFilled, setWalletAutoFilled] = useState(false)

  const tokenConfig = {
    DGT: { name: 'DGT (Dytallix Governance Tokens)', description: 'On-chain governance and protocol control', amount: 2, icon: dgtIcon, cooldownMinutes: 1440, successMessage: 'DGT allocation successful.' },
    DRT: { name: 'DRT (Dytallix Reward Tokens)', description: 'Fuel AI module usage, reward testnet actions', amount: 50, icon: drtIcon, cooldownMinutes: 360, successMessage: 'DRT sent to your wallet.' }
  }

  useEffect(() => {
    const savedCooldowns = localStorage.getItem('dytallix-faucet-cooldowns')
    if (savedCooldowns) {
      try {
        const parsed = JSON.parse(savedCooldowns)
        const now = Date.now()
        const activeCooldowns = {}
        Object.keys(parsed).forEach(token => { if (parsed[token] > now) activeCooldowns[token] = parsed[token] })
        setCooldowns(activeCooldowns)
      } catch {}
    }
    const savedOption = localStorage.getItem('dytallix-faucet-selected-option')
    if (savedOption && TOKEN_OPTIONS[savedOption]) setSelectedOption(savedOption)
  }, [])

  useEffect(() => { localStorage.setItem('dytallix-faucet-selected-option', selectedOption) }, [selectedOption])

  // Auto-populate wallet address from PQC wallet
  useEffect(() => {
    try {
      const meta = loadMeta()
      if (meta?.address && !walletAutoFilled && isBech32(meta.address)) { 
        setAddress(meta.address)
        setConnected(true)
        setWalletAutoFilled(true)
        return 
      }
    } catch {}
    
    setConnected(false)
  }, [walletAutoFilled])

  const isOnCooldown = (token) => cooldowns[token] && cooldowns[token] > Date.now()
  const getCooldownMinutes = (token) => { if (!cooldowns[token]) return 0; const remaining = cooldowns[token] - Date.now(); return Math.max(0, Math.ceil(remaining / (1000 * 60))) }
  const shortHash = (h) => (h && h.length > 20 ? `${h.slice(0, 10)}...${h.slice(-8)}` : h)
  const isBech32 = (addr) => typeof addr === 'string' && addr.startsWith('dytallix1') && addr.length >= 39

  // Check if any of the selected tokens are on cooldown
  const selectedTokens = TOKEN_OPTIONS[selectedOption].tokens
  const anyCooldown = selectedTokens.some(token => isOnCooldown(token))
  const maxCooldownMinutes = Math.max(...selectedTokens.map(token => getCooldownMinutes(token)))

  const showMessage = (msg, type) => {
    setMessage(msg)
    setMessageType(type)
    // Auto-clear success messages
    if (type === 'success') {
      setTimeout(() => setMessage(''), 5000)
    }
  }

  // Get last success details for display
  const getLastSuccessDetails = () => {
    try {
      const lastSuccess = localStorage.getItem('dytallix-faucet-last-success')
      if (lastSuccess) {
        const parsed = JSON.parse(lastSuccess)
        const timeDiff = Date.now() - (parsed.timestamp || 0)
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
        if (hoursAgo < 24 && parsed.dispensed && parsed.dispensed.length > 0) {
          const dispensedText = parsed.dispensed.map(d => `${d.amount} ${d.symbol}`).join(' + ')
          return `Last request: ${dispensedText} (${hoursAgo}h ago)`
        }
      }
    } catch {}
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!address.trim() || !isBech32(address.trim())) {
      showMessage('Please enter a valid Dytallix bech32 address', 'error')
      return
    }

    if (anyCooldown) {
      const cooldownTokens = selectedTokens.filter(token => isOnCooldown(token))
      showMessage(`Please wait ${maxCooldownMinutes} more minutes before requesting ${cooldownTokens.join(', ')} again.`, 'cooldown')
      return
    }

    setIsLoading(true)
    try {
      // Use new dual-token API format
      const requestData = {
        address: address.trim(),
        tokens: selectedTokens
      }

      const res = await requestFaucet(requestData)
      
      if (res.success) {
        const dispensedList = res.dispensed.map(d => `${d.amount} ${d.symbol}`).join(' + ')
        const txHashes = res.dispensed.filter(d => d.txHash).map(d => shortHash(d.txHash)).join(', ')
        const txMessage = txHashes ? ` (TX: ${txHashes})` : ''
        
        showMessage(`✅ ${dispensedList} sent successfully!${txMessage}`, 'success')
        
        // Update cooldowns - prioritize backend cooldowns, fall back to config
        const newCooldowns = { ...cooldowns }
        if (res.cooldowns) {
          // Use backend cooldowns if provided
          Object.keys(res.cooldowns).forEach(symbol => {
            newCooldowns[symbol] = res.cooldowns[symbol]
          })
        } else {
          // Fall back to config-based cooldowns
          res.dispensed.forEach(dispensed => {
            const cooldownEnd = Date.now() + (tokenConfig[dispensed.symbol].cooldownMinutes * 60 * 1000)
            newCooldowns[dispensed.symbol] = cooldownEnd
          })
        }
        setCooldowns(newCooldowns)
        localStorage.setItem('dytallix-faucet-cooldowns', JSON.stringify(newCooldowns))
        localStorage.setItem('dytallix-faucet-last-success', JSON.stringify({
          ...res,
          timestamp: Date.now()
        }))
      } else {
        let errorMessage = res.message || 'Request failed'
        if (res.error === 'RATE_LIMIT' && res.retryAfterSeconds) {
          const minutes = Math.ceil(res.retryAfterSeconds / 60)
          errorMessage = `Rate limit exceeded. Please wait ${minutes} minutes before trying again.`
          
          // Update cooldowns from rate limit response if provided
          if (res.cooldowns) {
            const newCooldowns = { ...cooldowns }
            if (res.cooldowns.tokens) {
              Object.keys(res.cooldowns.tokens).forEach(symbol => {
                const tokenCooldown = res.cooldowns.tokens[symbol]
                if (tokenCooldown && tokenCooldown.nextAllowedAt) {
                  let timestamp = tokenCooldown.nextAllowedAt
                  if (timestamp < 1e12) {
                    timestamp = timestamp * 1000
                  }
                  newCooldowns[symbol] = timestamp
                }
              })
            }
            setCooldowns(newCooldowns)
            localStorage.setItem('dytallix-faucet-cooldowns', JSON.stringify(newCooldowns))
          }
        }
        showMessage(errorMessage, 'error')
      }
    } catch (err) {
      console.error('Faucet request error:', err)
      showMessage(err?.message || 'Request failed', 'error')
    } finally { 
      setIsLoading(false) 
    }
  }
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Top card: Token Selection */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label htmlFor="token-selection" className={styles.label} style={{ margin: 0 }}>Select Tokens</label>
          <span
            aria-label="Recommended option"
            title="Recommended option"
            style={{
              display: 'inline-block', padding: '2px 8px', borderRadius: 999,
              background: 'rgba(139,92,246,0.15)', color: 'var(--primary-300)',
              fontSize: 12, fontWeight: 600
            }}
          >Recommended</span>
        </div>
        <div className={styles.tokenSelector}>
          {Object.entries(TOKEN_OPTIONS).map(([key, option]) => {
            const optionOnCooldown = option.tokens.some(token => isOnCooldown(token))
            return (
              <div 
                key={key} 
                className={`${styles.tokenOption} ${selectedOption === key ? styles.selected : ''} ${optionOnCooldown ? styles.disabled : ''}`} 
                onClick={() => !optionOnCooldown && setSelectedOption(key)}
                role="radio"
                aria-checked={selectedOption === key}
                aria-disabled={optionOnCooldown}
                tabIndex={optionOnCooldown ? -1 : 0}
              >
              <div className={styles.tokenHeader}>
                <div className={styles.tokenInfo}>
                  <div className={styles.tokenName}>{option.label}</div>
                  <div className={styles.tokenDescription}>{option.description}</div>
                </div>
              </div>
              <div className={styles.tokenAmount}>
                {option.tokens.map(token => (
                  <div key={token} className={styles.tokenAmountItem}>
                    <img src={tokenConfig[token].icon} alt={`${token} icon`} className={styles.tokenIcon} />
                    {tokenConfig[token].amount} {token}
                    {isOnCooldown(token) && (
                      <div className={styles.cooldownInfo}>Cooldown: {getCooldownMinutes(token)}m</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )
          })}
        </div>
      </div>
      {/* Middle card: Wallet Input */}
      <div className="card" style={{ padding: 16 }}>
        <div className={styles.inputGroup} style={{ margin: 0 }}>
          <label htmlFor="wallet-address" className={styles.label} style={{ marginBottom: 8 }}>
            Wallet Address <span className="muted" style={{ fontWeight: 400 }}>
              {connected ? '(Auto-detected from PQC wallet)' : '(Enter your dytallix1... address)'}
            </span>
          </label>
          <input 
            id="wallet-address" 
            type="text" 
            value={address} 
            onChange={(e) => {
              setAddress(e.target.value)
              if (walletAutoFilled) setWalletAutoFilled(false)
            }}
            placeholder="dytallix1..." 
            className={styles.input} 
            disabled={isLoading}
            data-test="wallet-address-input"
          />
        </div>
      </div>

      {/* Bottom card: Action & Info */}
      <div className="card" style={{ padding: 16 }}>
        <button 
          type="submit" 
          disabled={isLoading || !address.trim() || anyCooldown} 
          className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
          data-test="faucet-submit"
          style={{ width: '100%', marginBottom: 12 }}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner}></span>
              Sending {selectedTokens.join(' + ')}...
            </>
          ) : anyCooldown ? (
            `Wait ${maxCooldownMinutes}m for ${selectedTokens.filter(t => isOnCooldown(t)).join(', ')}`
          ) : (
            'Request Tokens'
          )}
        </button>

        {/* Cooldown notice when tokens are on cooldown */}
        {anyCooldown && (
          <div 
            className={`${styles.message} ${styles.cooldownNotice}`}
            role="status"
            aria-live="polite"
            data-test="cooldown-notice"
            style={{ marginBottom: 12 }}
          >
            ⏳ Cooldown active for {selectedTokens.filter(t => isOnCooldown(t)).join(', ')}. 
            Please wait {maxCooldownMinutes} more minutes.
          </div>
        )}

        {/* Main status message */}
        {message && (
          <div 
            className={`${styles.message} ${styles[messageType]}`}
            role={messageType === 'error' ? 'alert' : 'status'}
            aria-live={messageType === 'error' ? 'assertive' : 'polite'}
            data-test="faucet-status"
            style={{ marginBottom: 12 }}
          >
            {message}
          </div>
        )}

        {/* Last success details */}
        {getLastSuccessDetails() && !message && (
          <div 
            className={styles.lastResult}
            role="status"
            aria-live="polite"
            data-test="last-result"
            style={{ marginBottom: 12 }}
          >
            {getLastSuccessDetails()}
          </div>
        )}

        {/* Faucet Info section */}
        <div className={styles.faucetInfo}>
          <h3 className={styles.faucetInfoTitle}>Faucet Information</h3>
          <div className={styles.faucetInfoPanel}>
            <ul className={styles.faucetInfoList}>
              <li className={`muted ${styles.faucetInfoItem}`}><strong>Network:</strong> Dytallix Testnet</li>
              <li className={`muted ${styles.faucetInfoItem}`}><strong>DGT Amount:</strong> 2 DGT per request (24h cooldown)</li>
              <li className={`muted ${styles.faucetInfoItem}`}><strong>DRT Amount:</strong> 50 DRT per request (6h cooldown)</li>
              <li className={`muted ${styles.faucetInfoItem}`}><strong>Dual Request:</strong> Get both tokens in one request</li>
              <li className={`muted ${styles.faucetInfoItem}`}><strong>Network ID:</strong> {COSMOS_CONFIG.chainId}</li>
            </ul>
          </div>
        </div>

        <div className={styles.info}>
          <p className="muted"><strong>Note:</strong> Tokens have no real value and are for testing purposes only.</p>
        </div>
      </div>
    </form>
  )
}

export default FaucetForm
