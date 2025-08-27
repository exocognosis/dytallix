// Dytallix PQC Wallet Vault
// In-memory keyring with encrypted-at-rest blob storage

import type { Account, VaultMeta, Algo } from './types'
import { encryptVault, decryptVault } from '../../crypto/vault'
import { zeroize } from './crypto'

export interface VaultState {
  locked: boolean
  accounts: Account[]
  activeAccount: Account | null
  lastActivity: number
}

export interface EncryptedVault {
  meta: VaultMeta
  encryptedData: string
}

const VAULT_STORAGE_KEY = 'dytallix_pqc_vault'
const DEFAULT_AUTO_LOCK_MS = 10 * 60 * 1000 // 10 minutes

export class Vault {
  private state: VaultState
  private secretKeys: Map<string, string> = new Map() // address -> secret key
  private autoLockTimer: number | null = null
  private autoLockMs: number

  constructor(autoLockMs: number = DEFAULT_AUTO_LOCK_MS) {
    this.autoLockMs = autoLockMs
    this.state = {
      locked: true,
      accounts: [],
      activeAccount: null,
      lastActivity: Date.now()
    }
    
    // Auto-lock on visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.lock()
        }
      })
    }
    
    // Auto-lock on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.lock()
      })
    }
  }

  /**
   * Check if vault is locked
   */
  isLocked(): boolean {
    return this.state.locked
  }

  /**
   * Get current accounts (public info only)
   */
  getAccounts(): Account[] {
    return [...this.state.accounts]
  }

  /**
   * Get active account
   */
  getActiveAccount(): Account | null {
    return this.state.activeAccount
  }

  /**
   * Add account to vault
   */
  addAccount(account: Account, secretKey: string): void {
    this.state.accounts.push(account)
    this.secretKeys.set(account.address, secretKey)
    
    if (!this.state.activeAccount) {
      this.state.activeAccount = account
    }
    
    this.updateActivity()
  }

  /**
   * Remove account from vault
   */
  removeAccount(address: string): void {
    this.state.accounts = this.state.accounts.filter(acc => acc.address !== address)
    
    const secretKey = this.secretKeys.get(address)
    if (secretKey) {
      // Zero out secret key
      const keyArray = [secretKey]
      zeroize(keyArray)
      this.secretKeys.delete(address)
    }
    
    if (this.state.activeAccount?.address === address) {
      this.state.activeAccount = this.state.accounts[0] || null
    }
  }

  /**
   * Set active account
   */
  setActiveAccount(address: string): void {
    const account = this.state.accounts.find(acc => acc.address === address)
    if (account) {
      this.state.activeAccount = account
      this.updateActivity()
    }
  }

  /**
   * Get secret key for account (only when unlocked)
   */
  getSecretKey(address: string): string | null {
    if (this.state.locked) {
      return null
    }
    
    this.updateActivity()
    return this.secretKeys.get(address) || null
  }

  /**
   * Lock the vault
   */
  lock(): void {
    // Zero out all secret keys
    for (const [address, secretKey] of this.secretKeys) {
      const keyArray = [secretKey]
      zeroize(keyArray)
    }
    this.secretKeys.clear()
    
    this.state.locked = true
    this.clearAutoLockTimer()
  }

  /**
   * Unlock the vault with password
   */
  async unlock(password: string): Promise<void> {
    const encryptedVault = this.loadFromStorage()
    if (!encryptedVault) {
      throw new Error('No vault found')
    }
    
    try {
      const decryptedData = await decryptVault(encryptedVault.encryptedData, password)
      const vaultData = JSON.parse(new TextDecoder().decode(decryptedData))
      
      this.state.accounts = vaultData.accounts || []
      this.state.activeAccount = vaultData.activeAccount || null
      
      // Restore secret keys
      for (const [address, secretKey] of Object.entries(vaultData.secretKeys || {})) {
        this.secretKeys.set(address, secretKey as string)
      }
      
      this.state.locked = false
      this.updateActivity()
      this.scheduleAutoLock()
      
    } catch (error) {
      throw new Error('Invalid password or corrupted vault')
    }
  }

  /**
   * Save vault to encrypted storage
   */
  async saveToStorage(password: string): Promise<void> {
    const vaultData = {
      accounts: this.state.accounts,
      activeAccount: this.state.activeAccount,
      secretKeys: Object.fromEntries(this.secretKeys)
    }
    
    const plaintext = new TextEncoder().encode(JSON.stringify(vaultData))
    const encryptedData = await encryptVault(plaintext, password)
    
    const vault: EncryptedVault = {
      meta: {
        version: 1,
        createdAt: new Date().toISOString(),
        kdf: 'scrypt',
        algo: 'xsalsa20-poly1305'
      },
      encryptedData
    }
    
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault))
    }
  }

  /**
   * Load vault from storage
   */
  private loadFromStorage(): EncryptedVault | null {
    if (typeof localStorage === 'undefined') {
      return null
    }
    
    try {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  /**
   * Clear vault from storage
   */
  clearStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(VAULT_STORAGE_KEY)
    }
  }

  /**
   * Update last activity timestamp and reset auto-lock timer
   */
  private updateActivity(): void {
    this.state.lastActivity = Date.now()
    if (!this.state.locked) {
      this.scheduleAutoLock()
    }
  }

  /**
   * Schedule auto-lock timer
   */
  private scheduleAutoLock(): void {
    this.clearAutoLockTimer()
    this.autoLockTimer = window.setTimeout(() => {
      this.lock()
    }, this.autoLockMs)
  }

  /**
   * Clear auto-lock timer
   */
  private clearAutoLockTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer)
      this.autoLockTimer = null
    }
  }
}