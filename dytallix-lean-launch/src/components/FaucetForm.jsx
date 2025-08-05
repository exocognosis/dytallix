import React, { useState } from 'react'
import styles from '../styles/FaucetForm.module.css'

const FaucetForm = () => {
  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' or 'error'

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!address.trim()) {
      setMessage('Please enter a valid wallet address')
      setMessageType('error')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      // Mock API call - replace with actual faucet endpoint
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate success/error randomly for demo
      const success = Math.random() > 0.3
      
      if (success) {
        setMessage('Success! 100 DYTX tokens have been sent to your wallet.')
        setMessageType('success')
        setAddress('')
      } else {
        setMessage('Failed to send tokens. Please try again later.')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputGroup}>
        <label htmlFor="wallet-address" className={styles.label}>
          Wallet Address
        </label>
        <input
          id="wallet-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x... or dytallix..."
          className={styles.input}
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !address.trim()}
        className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner}></span>
            Sending Tokens...
          </>
        ) : (
          'Request Tokens'
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