import React, { useState, useEffect } from 'react'
import styles from '../styles/FaucetForm.module.css'
import dgtIcon from '../assets/dgt.svg'
import drtIcon from '../assets/drt.svg'

// Cosmos network configuration from environment variables
const COSMOS_CONFIG = {
  lcdUrl: import.meta.env.VITE_LCD_HTTP_URL || 'https://lcd-testnet.dytallix.com',
  rpcUrl: import.meta.env.VITE_RPC_HTTP_URL || 'https://rpc-testnet.dytallix.com',
  chainId: import.meta.env.VITE_CHAIN_ID || 'dytallix-testnet-1',
  faucetApiUrl: import.meta.env.VITE_FAUCET_API_URL || '/api/faucet'
}

const FaucetForm = () => {
  const [address, setAddress] = useState('')
  const [selectedToken, setSelectedToken] = useState('DRT')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'
  const [cooldowns, setCooldowns] = useState({ DGT: 0, DRT: 0 })

  // Token configurations
  const tokenConfig = {
    DGT: {
      name: 'DGT (Dytallix Governance Tokens)',
      description: 'On-chain governance and protocol control',
      amount: 2,
      icon: dgtIcon,
      cooldownMinutes: 1440, // 24 hours
      successMessage: '2 DGT allocated. Governance token claim successful (for testnet use only).'
    },
    DRT: {
      name: 'DRT (Dytallix Reward Tokens)',
      description: 'Fuel AI module usage, reward testnet actions',
      amount: 5,
      icon: drtIcon,
      cooldownMinutes: 360, // 6 hours  
      successMessage: '5 DRT sent to your wallet. Thanks for supporting the testnet!'
    }
  }

  // Load cooldowns from localStorage on component mount
  useEffect(() => {
    const savedCooldowns = localStorage.getItem('dytallix-faucet-cooldowns')
    if (savedCooldowns) {
      try {
        const parsed = JSON.parse(savedCooldowns)
        const now = Date.now()
        const activeCooldowns = {}
        
        Object.keys(parsed).forEach(token => {
          if (parsed[token] > now) {
            activeCooldowns[token] = parsed[token]
          }
        })
        
        setCooldowns(activeCooldowns)
      } catch (error) {
        console.error('Error loading cooldowns:', error)
      }
    }

    // Load selected token preference
    const savedToken = localStorage.getItem('dytallix-faucet-selected-token')
    if (savedToken && tokenConfig[savedToken]) {
      setSelectedToken(savedToken)
    }
  }, [])

  // Save selected token preference
  useEffect(() => {
    localStorage.setItem('dytallix-faucet-selected-token', selectedToken)
  }, [selectedToken])

  // Check if token is on cooldown
  const isOnCooldown = (token) => {
    return cooldowns[token] && cooldowns[token] > Date.now()
  }

  // Get remaining cooldown time in minutes
  const getCooldownMinutes = (token) => {
    if (!cooldowns[token]) return 0
    const remaining = cooldowns[token] - Date.now()
    return Math.max(0, Math.ceil(remaining / (1000 * 60)))
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!address.trim()) {
      setMessage('Please enter a valid wallet address')
      setMessageType('error')
      return
    }

    // Validate Cosmos address format (bech32)
    if (!address.startsWith('dytallix1') || address.length < 39) {
      setMessage('Please enter a valid Dytallix address (starting with dytallix1)')
      setMessageType('error')
      return
    }

    // Check cooldown
    if (isOnCooldown(selectedToken)) {
      const remaining = getCooldownMinutes(selectedToken)
      setMessage(`Please wait ${remaining} more minutes before requesting ${selectedToken} again.`)
      setMessageType('error')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      // Make actual API call to Cosmos faucet endpoint
      const response = await fetch(COSMOS_CONFIG.faucetApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address.trim(),
          token: selectedToken,
          chainId: COSMOS_CONFIG.chainId
        })
      })

      if (response.ok) {
        const result = await response.json()
        const config = tokenConfig[selectedToken]
        setMessage(result.message || config.successMessage)
        setMessageType('success')
        setAddress('')
        
        // Set cooldown
        const cooldownEnd = Date.now() + (config.cooldownMinutes * 60 * 1000)
        const newCooldowns = { ...cooldowns, [selectedToken]: cooldownEnd }
        setCooldowns(newCooldowns)
        
        // Save cooldowns to localStorage
        localStorage.setItem('dytallix-faucet-cooldowns', JSON.stringify(newCooldowns))
      } else {
        const error = await response.json().catch(() => ({}))
        setMessage(error.message || `Failed to send ${selectedToken} tokens. Please try again later.`)
        setMessageType('error')
      }
    } catch (error) {
      console.error('Faucet request failed:', error)
      // Fallback to mock behavior for development if faucet API is not available
      if (import.meta.env.VITE_DEV_MODE === 'true') {
        // Simulate success/error with higher success rate for testing
        await new Promise(resolve => setTimeout(resolve, 1000))
        const success = Math.random() > 0.2
        
        if (success) {
          const config = tokenConfig[selectedToken]
          setMessage(`${config.successMessage} (Development Mode)`)
          setMessageType('success')
          setAddress('')
          
          // Set cooldown
          const cooldownEnd = Date.now() + (config.cooldownMinutes * 60 * 1000)
          const newCooldowns = { ...cooldowns, [selectedToken]: cooldownEnd }
          setCooldowns(newCooldowns)
          
          // Save cooldowns to localStorage
          localStorage.setItem('dytallix-faucet-cooldowns', JSON.stringify(newCooldowns))
        } else {
          setMessage(`Failed to send ${selectedToken} tokens. Please try again later. (Development Mode)`)
          setMessageType('error')
        }
      } else {
        setMessage('Faucet service is currently unavailable. Please try again later.')
        setMessageType('error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputGroup}>
        <label htmlFor="token-selection" className={styles.label}>
          Select Token Type
        </label>
        <div className={styles.tokenSelector}>
          {Object.keys(tokenConfig).map(token => (
            <div
              key={token}
              className={`${styles.tokenOption} ${selectedToken === token ? styles.selected : ''}`}
              onClick={() => setSelectedToken(token)}
            >
              <div className={styles.tokenHeader}>
                <img src={tokenConfig[token].icon} alt={`${token} icon`} className={styles.tokenIcon} />
                <div className={styles.tokenInfo}>
                  <div className={styles.tokenName}>{tokenConfig[token].name}</div>
                  <div className={styles.tokenDescription}>{tokenConfig[token].description}</div>
                </div>
              </div>
              <div className={styles.tokenAmount}>
                {tokenConfig[token].amount} {token}
                {isOnCooldown(token) ? (
                  <div className={styles.cooldownInfo}>
                    Cooldown: {getCooldownMinutes(token)}m
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="wallet-address" className={styles.label}>
          Wallet Address
        </label>
        <input
          id="wallet-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="dytallix1... (Cosmos bech32 address)"
          className={styles.input}
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !address.trim() || isOnCooldown(selectedToken)}
        className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner}></span>
            Sending {selectedToken}...
          </>
        ) : isOnCooldown(selectedToken) ? (
          `Wait ${getCooldownMinutes(selectedToken)}m for ${selectedToken}`
        ) : (
          `Request ${tokenConfig[selectedToken].amount} ${selectedToken}`
        )}
      </button>

      {message && (
        <div className={`${styles.message} ${styles[messageType]}`}>
          {message}
        </div>
      )}

      <div className={styles.info}>
        <p>
          <strong>Note:</strong> This is a testnet faucet. Tokens have no real value 
          and are only for testing purposes.
        </p>
      </div>
    </form>
  )
}

export default FaucetForm