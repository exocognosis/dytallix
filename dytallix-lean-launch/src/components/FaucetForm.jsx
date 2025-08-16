import React, { useState, useEffect } from 'react'
import styles from '../styles/FaucetForm.module.css'
import dgtIcon from '../assets/dgt.svg'
import drtIcon from '../assets/drt.svg'
import { requestFaucet } from '../lib/api.js'
import { loadMeta } from '../wallet/Keystore'

<<<<<<< HEAD
// Cosmos network configuration
=======
// Cosmos network configuration (informational)
>>>>>>> origin/main
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
  const [messageType, setMessageType] = useState('')
  const [cooldowns, setCooldowns] = useState({ DGT: 0, DRT: 0 })
  const [connected, setConnected] = useState(false)

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
    const savedToken = localStorage.getItem('dytallix-faucet-selected-token')
    if (savedToken && tokenConfig[savedToken]) setSelectedToken(savedToken)
  }, [])

  useEffect(() => { localStorage.setItem('dytallix-faucet-selected-token', selectedToken) }, [selectedToken])

  useEffect(() => {
    try {
      const meta = loadMeta()
      if (meta?.address) { setAddress(meta.address); setConnected(true); return }
    } catch {}
    setConnected(false)
  }, [])

  const isOnCooldown = (token) => cooldowns[token] && cooldowns[token] > Date.now()
  const getCooldownMinutes = (token) => { if (!cooldowns[token]) return 0; const remaining = cooldowns[token] - Date.now(); return Math.max(0, Math.ceil(remaining / (1000 * 60))) }
  const shortHash = (h) => (h && h.length > 20 ? `${h.slice(0, 10)}...${h.slice(-8)}` : h)
  const isBech32 = (addr) => typeof addr === 'string' && addr.startsWith('dytallix1') && addr.length >= 39

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!address.trim() || !isBech32(address.trim())) {
      setMessage('Please enter a valid Dytallix bech32 address')
      setMessageType('error')
      return
    }

    if (isOnCooldown(selectedToken)) {
      const remaining = getCooldownMinutes(selectedToken)
      setMessage(`Please wait ${remaining} more minutes before requesting ${selectedToken} again.`)
      setMessageType('error')
      return
    }

    setIsLoading(true)
    try {
      const res = await requestFaucet({ address: address.trim(), token: selectedToken })
      setMessage(`${res.amount} ${res.token} sent. Tx: ${shortHash(res.txHash)}`)
      setMessageType('success')
      const cooldownEnd = Date.now() + (tokenConfig[selectedToken].cooldownMinutes * 60 * 1000)
      const newCooldowns = { ...cooldowns, [selectedToken]: cooldownEnd }
      setCooldowns(newCooldowns)
      localStorage.setItem('dytallix-faucet-cooldowns', JSON.stringify(newCooldowns))
      localStorage.setItem('dytallix-faucet-last-success', JSON.stringify(res))
    } catch (err) {
      setMessage(err?.message || 'Request failed')
      setMessageType('error')
    } finally { setIsLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputGroup}>
        <label htmlFor="token-selection" className={styles.label}>Select Token Type</label>
        <div className={styles.tokenSelector}>
          {Object.keys(tokenConfig).map(token => (
            <div key={token} className={`${styles.tokenOption} ${selectedToken === token ? styles.selected : ''}`} onClick={() => setSelectedToken(token)}>
              <div className={styles.tokenHeader}>
                <img src={tokenConfig[token].icon} alt={`${token} icon`} className={styles.tokenIcon} />
                <div className={styles.tokenInfo}>
                  <div className={styles.tokenName}>{tokenConfig[token].name}</div>
                  <div className={styles.tokenDescription}>{tokenConfig[token].description}</div>
                </div>
              </div>
              <div className={styles.tokenAmount}>
                {tokenConfig[token].amount} {token}
                {isOnCooldown(token) ? (<div className={styles.cooldownInfo}>Cooldown: {getCooldownMinutes(token)}m</div>) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="wallet-address" className={styles.label}>Wallet Address {connected ? '(Auto-filled)' : '(Paste bech32 address)'}</label>
        <input id="wallet-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="dytallix1..." className={styles.input} disabled={isLoading} />
      </div>

      <button type="submit" disabled={isLoading || !address.trim() || isOnCooldown(selectedToken)} className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}>
        {isLoading ? (<><span className={styles.spinner}></span>Sending {selectedToken}...</>) : isOnCooldown(selectedToken) ? (
          `Wait ${getCooldownMinutes(selectedToken)}m for ${selectedToken}`) : (
          `Request ${tokenConfig[selectedToken].amount} ${selectedToken}`)}
      </button>

      {message && (<div className={`${styles.message} ${styles[messageType]}`}>{message}</div>)}

      <div className={styles.faucetInfo}>
        <h3 className={styles.faucetInfoTitle}>Faucet Information</h3>
        <div className={styles.faucetInfoPanel}>
          <ul className={styles.faucetInfoList}>
            <li className={`muted ${styles.faucetInfoItem}`}><strong>Network:</strong> Dytallix Testnet</li>
            <li className={`muted ${styles.faucetInfoItem}`}><strong>DGT Amount:</strong> 2 DGT per request (24h cooldown)</li>
            <li className={`muted ${styles.faucetInfoItem}`}><strong>DRT Amount:</strong> 50 DRT per request (6h cooldown)</li>
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