// Dytallix PQC Wallet Provider
// Main API surface for wallet operations

import type { Account, Balance, TxPayload, SignedTx, Algo, WalletConfig, WalletEventMap } from './types'
import { Vault } from './vault'
import { generateKeypair, getPublicKey, sign } from './crypto'
import { deriveAddress } from '../../lib/crypto/address'

export interface CreateKeyParams {
  algo: Algo
  label?: string
  passphrase: string
}

export interface ImportKeyParams {
  mnemonic?: string
  encryptedJson?: string
  passphrase: string
}

export interface ExportKeyParams {
  address: string
  format: 'mnemonic' | 'encryptedJson'
  passphrase: string
}

export interface SignTxParams {
  address: string
  algo: Algo
  payload: TxPayload
}

export interface BroadcastTxParams {
  signedTx: SignedTx
}

export class DytallixWalletProvider {
  private vault: Vault
  private config: WalletConfig
  private eventListeners: Map<keyof WalletEventMap, Set<Function>> = new Map()

  constructor(config: WalletConfig = {}) {
    this.config = {
      autoLockMs: 10 * 60 * 1000, // 10 minutes default
      rpcUrl: 'https://rpc-testnet.dytallix.com',
      restUrl: 'https://lcd-testnet.dytallix.com',
      chainId: 'dytallix-testnet-1',
      ...config
    }
    
    this.vault = new Vault(this.config.autoLockMs)
    
    // Setup event listeners
    this.eventListeners.set('lock', new Set())
    this.eventListeners.set('unlock', new Set())
    this.eventListeners.set('accountChanged', new Set())
  }

  /**
   * Initialize the provider
   */
  async init(config?: Partial<WalletConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    // Provider is ready
  }

  /**
   * Create a new PQC key
   */
  async createKey({ algo, label, passphrase }: CreateKeyParams): Promise<Account> {
    const keypair = await generateKeypair(algo)
    const address = await deriveAddress(keypair.publicKey, algo)
    
    const account: Account = {
      address,
      pubkey: keypair.publicKey,
      algo,
      label
    }
    
    this.vault.addAccount(account, keypair.secretKey)
    await this.vault.saveToStorage(passphrase)
    
    this.emit('accountChanged', account)
    return account
  }

  /**
   * Import a key from mnemonic or encrypted JSON
   */
  async importKey({ mnemonic, encryptedJson, passphrase }: ImportKeyParams): Promise<Account> {
    // TODO: Implement mnemonic and encrypted JSON import
    // For now, this is a placeholder
    throw new Error('Key import not yet implemented')
  }

  /**
   * Export a key as mnemonic or encrypted JSON
   */
  async exportKey({ address, format, passphrase }: ExportKeyParams): Promise<string> {
    // TODO: Implement key export
    // For now, this is a placeholder
    throw new Error('Key export not yet implemented')
  }

  /**
   * List all accounts
   */
  listAccounts(): Account[] {
    return this.vault.getAccounts()
  }

  /**
   * Get active account
   */
  getActiveAccount(): Account | null {
    return this.vault.getActiveAccount()
  }

  /**
   * Set active account
   */
  setActiveAccount(address: string): void {
    this.vault.setActiveAccount(address)
    const account = this.vault.getActiveAccount()
    this.emit('accountChanged', account)
  }

  /**
   * Lock the wallet
   */
  lock(): void {
    this.vault.lock()
    this.emit('lock')
  }

  /**
   * Unlock the wallet
   */
  async unlock(passphrase: string): Promise<boolean> {
    try {
      await this.vault.unlock(passphrase)
      this.emit('unlock')
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Check if wallet is locked
   */
  isLocked(): boolean {
    return this.vault.isLocked()
  }

  /**
   * Get balances for an address
   */
  async getBalances(address: string): Promise<Balance> {
    // TODO: Implement RPC call to get balances
    // For now, return mock data
    return {
      address,
      udgt: '0',
      udrt: '0'
    }
  }

  /**
   * Sign a transaction
   */
  async signTx({ address, algo, payload }: SignTxParams): Promise<string> {
    if (this.vault.isLocked()) {
      throw new Error('Wallet is locked')
    }
    
    const secretKey = this.vault.getSecretKey(address)
    if (!secretKey) {
      throw new Error('Secret key not found for address')
    }
    
    // Serialize payload for signing
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
    
    // Sign with PQC algorithm
    const signature = await sign(secretKey, payloadBytes, algo)
    
    return signature
  }

  /**
   * Broadcast a signed transaction
   */
  async broadcastTx({ signedTx }: BroadcastTxParams): Promise<{ txHash: string }> {
    // TODO: Implement RPC call to broadcast transaction
    // For now, return mock hash
    const mockHash = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return { txHash: mockHash }
  }

  /**
   * Add event listener
   */
  on<K extends keyof WalletEventMap>(event: K, listener: WalletEventMap[K]): void {
    const listeners = this.eventListeners.get(event) || new Set()
    listeners.add(listener)
    this.eventListeners.set(event, listeners)
  }

  /**
   * Remove event listener
   */
  off<K extends keyof WalletEventMap>(event: K, listener: WalletEventMap[K]): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * Emit event
   */
  private emit<K extends keyof WalletEventMap>(event: K, ...args: Parameters<WalletEventMap[K]>): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args)
        } catch (error) {
          console.error(`Error in ${event} listener:`, error)
        }
      })
    }
  }

  /**
   * Clear all data and reset
   */
  reset(): void {
    this.vault.clearStorage()
    this.vault.lock()
    this.emit('accountChanged', null)
  }
}