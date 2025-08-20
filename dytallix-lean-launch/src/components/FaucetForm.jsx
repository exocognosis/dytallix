import React, { useState, useEffect } from 'react'
import styles from '../styles/FaucetForm.module.css'
import dgtIcon from '../assets/dgt.svg'
import drtIcon from '../assets/drt.svg'
import { requestFaucet } from '../lib/api.js'
import { loadMeta } from '../wallet/Keystore'

// Cosmos network configuration
const COSMOS_CONFIG = {
  lcdUrl: import.meta.env.VITE_LCD_HTTP_URL || 'https://lcd-testnet.dytallix.com',
  rpcUrl: import.meta.env.VITE_RPC_HTTP_URL || 'https://rpc-testnet.dytallix.com',
  chainId: import.meta.env.VITE_CHAIN_ID || 'dytallix-testnet-1',
  faucetApiUrl: import.meta.env.VITE_FAUCET_API_URL || '/api/faucet'
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

  // Auto-populate wallet address from connected wallet
  useEffect(() => {
    try {
      const meta = loadMeta()
      if (meta?.address && !walletAutoFilled) { 
        setAddress(meta.address)
        setConnected(true)
        setWalletAutoFilled(true)
        return 
      }
    } catch {}
    
    // Try to get address from injected provider (MetaMask, etc.)
    if (typeof window !== 'undefined' && window.ethereum && !walletAutoFilled) {
      checkInjectedProvider()
    }
    
    setConnected(false)
  }, [walletAutoFilled])

  const checkInjectedProvider = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          // For Ethereum addresses, we'd need to convert to Cosmos format
          // For now, just indicate connection detected
          setConnected(true)
          console.log('Injected provider detected with accounts:', accounts)
        }
      }
    } catch (err) {
      console.log('No injected provider or access denied:', err.message)
    }
  }

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
        if (accounts.length > 0) {
          setConnected(true)
          // Note: In production, you'd convert ETH address to Cosmos format
          console.log('Connected to wallet:', accounts[0])
          showMessage('Wallet connected! Please enter your Dytallix address manually.', 'info')
        }
      } else {
        showMessage('No wallet detected. Please install MetaMask or use a Cosmos wallet.', 'error')
      }
    } catch (err) {
      showMessage('Failed to connect wallet: ' + err.message, 'error')
    }
  }

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!address.trim() || !isBech32(address.trim())) {
      showMessage('Please enter a valid Dytallix bech32 address', 'error')
      return
    }

    if (anyCooldown) {
      const cooldownTokens = selectedTokens.filter(token => isOnCooldown(token))
      showMessage(`Please wait ${maxCooldownMinutes} more minutes before requesting ${cooldownTokens.join(', ')} again.`, 'error')
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
        
        // Update cooldowns for all dispensed tokens
        const newCooldowns = { ...cooldowns }
        res.dispensed.forEach(dispensed => {
          const cooldownEnd = Date.now() + (tokenConfig[dispensed.symbol].cooldownMinutes * 60 * 1000)
          newCooldowns[dispensed.symbol] = cooldownEnd
        })
        setCooldowns(newCooldowns)
        localStorage.setItem('dytallix-faucet-cooldowns', JSON.stringify(newCooldowns))
        localStorage.setItem('dytallix-faucet-last-success', JSON.stringify(res))
      } else {
        let errorMessage = res.message || 'Request failed'
        if (res.error === 'RATE_LIMIT' && res.retryAfterSeconds) {
          const minutes = Math.ceil(res.retryAfterSeconds / 60)
          errorMessage = `Rate limit exceeded. Please wait ${minutes} minutes before trying again.`
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
      <div className={styles.inputGroup}>
        <label htmlFor="token-selection" className={styles.label}>Select Tokens</label>
        <div className={styles.tokenSelector}>
          {Object.entries(TOKEN_OPTIONS).map(([key, option]) => (
            <div key={key} className={`${styles.tokenOption} ${selectedOption === key ? styles.selected : ''}`} onClick={() => setSelectedOption(key)}>
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
          ))}
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="wallet-address" className={styles.label}>
          Wallet Address 
          {connected ? '(Auto-detected)' : '(Paste bech32 address)'}
          {!connected && (
            <button type="button" onClick={connectWallet} className={styles.connectButton}>
              Connect Wallet
            </button>
          )}
        </label>
        <input 
          id="wallet-address" 
          type="text" 
          value={address} 
          onChange={(e) => {
            setAddress(e.target.value)
            if (walletAutoFilled) setWalletAutoFilled(false) // Allow manual override
          }}
          placeholder="dytallix1..." 
          className={styles.input} 
          disabled={isLoading} 
        />
      </div>

      <button 
        type="submit" 
        disabled={isLoading || !address.trim() || anyCooldown} 
        className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner}></span>
            Sending {selectedTokens.join(' + ')}...
          </>
        ) : anyCooldown ? (
          `Wait ${maxCooldownMinutes}m for ${selectedTokens.filter(t => isOnCooldown(t)).join(', ')}`
        ) : (
          `Request ${TOKEN_OPTIONS[selectedOption].label}`
        )}
      </button>

      {message && (
        <div className={`${styles.message} ${styles[messageType]}`}>
          {message}
        </div>
      )}

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
        <p><strong>Note:</strong> This is a testnet faucet. Tokens have no real value and are only for testing purposes.</p>
      </div>
    </form>
  )
}

export default FaucetForm