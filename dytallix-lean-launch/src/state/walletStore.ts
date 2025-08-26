// Zustand Store for Dytallix Wallet State Management
import { create } from 'zustand'
import type { 
  Account, 
  Balance, 
  WalletState, 
  PQCAlgo, 
  TxPayload,
  SignedTx
} from '../lib/wallet/types.js'
import { DytallixWalletProvider, createDefaultConfig } from '../lib/wallet/dytallixProvider.js'
import { 
  buildTransfer, 
  createDGTTransfer, 
  createDRTTransfer,
  validateAddress,
  validateAmount,
  formatTokenAmount
} from '../lib/tx/builders.js'

interface WalletStore extends WalletState {
  // Provider instance
  provider: DytallixWalletProvider | null
  
  // Auto-lock timer
  autoLockTimeoutId: number | null
  autoLockMinutes: number
  
  // Actions
  init: () => Promise<void>
  createVault: (password: string) => Promise<void>
  unlock: (password: string) => Promise<void>
  lock: () => void
  
  // Account management
  createAccount: (algo: PQCAlgo, label?: string) => Promise<Account>
  importAccount: (privateKey: string, algo: PQCAlgo, label?: string) => Promise<Account>
  selectAccount: (address: string) => void
  
  // Balance management
  refreshBalances: (address?: string) => Promise<void>
  getAccountBalance: (address: string, denom: string) => string
  
  // Transaction operations
  signAndBroadcast: (payload: TxPayload, signerAddress: string) => Promise<{ txHash: string; height: number }>
  quickTransfer: (toAddress: string, amount: string, denom: string) => Promise<{ txHash: string; height: number }>
  
  // Utilities
  formatBalance: (amount: string, denom: string) => string
  validateAddress: (address: string) => boolean
  
  // Internal helpers
  _setupAutoLock: () => void
  _resetAutoLock: () => void
  _updateLastActivity: () => void
}

const AUTO_LOCK_MINUTES = 10 // Default 10 minutes

export const useWalletStore = create<WalletStore>((set, get) => ({
  // Initial state
  isUnlocked: false,
  currentAccount: null,
  accounts: [],
  balances: {},
  lastActivity: Date.now(),
  provider: null,
  autoLockTimeoutId: null,
  autoLockMinutes: AUTO_LOCK_MINUTES,
  
  // Initialize the store
  init: async () => {
    const provider = new DytallixWalletProvider(createDefaultConfig())
    
    // Set up event listeners
    provider.onUnlock(() => {
      const accounts = provider.listAccounts()
      set({ 
        isUnlocked: true, 
        accounts,
        currentAccount: accounts[0] || null,
        lastActivity: Date.now()
      })
      get()._setupAutoLock()
    })
    
    provider.onLock(() => {
      set({ 
        isUnlocked: false, 
        currentAccount: null, 
        accounts: [],
        balances: {}
      })
      const { autoLockTimeoutId } = get()
      if (autoLockTimeoutId) {
        clearTimeout(autoLockTimeoutId)
        set({ autoLockTimeoutId: null })
      }
    })
    
    provider.onAccountAdded((account) => {
      const { accounts } = get()
      const newAccounts = [...accounts, account]
      set({ 
        accounts: newAccounts,
        currentAccount: get().currentAccount || account
      })
      get().refreshBalances(account.address)
    })
    
    set({ provider })
    
    // Check if vault exists and auto-unlock is possible
    if (provider.vaultExists()) {
      // Vault exists but is locked
      console.log('Vault found, requires unlock')
    }
  },
  
  // Vault management
  createVault: async (password: string) => {
    const { provider } = get()
    if (!provider) throw new Error('Provider not initialized')
    
    await provider.createVault(password)
    get()._updateLastActivity()
  },
  
  unlock: async (password: string) => {
    const { provider } = get()
    if (!provider) throw new Error('Provider not initialized')
    
    await provider.unlockVault(password)
    get()._updateLastActivity()
  },
  
  lock: () => {
    const { provider } = get()
    if (!provider) return
    
    provider.lockVault()
  },
  
  // Account management
  createAccount: async (algo: PQCAlgo, label?: string) => {
    const { provider } = get()
    if (!provider) throw new Error('Provider not initialized')
    
    const account = await provider.createAccount(algo, label)
    get()._updateLastActivity()
    return account
  },
  
  importAccount: async (privateKey: string, algo: PQCAlgo, label?: string) => {
    const { provider } = get()
    if (!provider) throw new Error('Provider not initialized')
    
    const account = await provider.importAccount(privateKey, algo, label)
    get()._updateLastActivity()
    return account
  },
  
  selectAccount: (address: string) => {
    const { accounts } = get()
    const account = accounts.find(acc => acc.address === address)
    if (account) {
      set({ currentAccount: account })
      get().refreshBalances(address)
      get()._updateLastActivity()
    }
  },
  
  // Balance management
  refreshBalances: async (address?: string) => {
    const { provider, accounts, currentAccount } = get()
    if (!provider) return
    
    const targetAddresses = address ? [address] : accounts.map(acc => acc.address)
    if (!address && currentAccount) {
      targetAddresses.push(currentAccount.address)
    }
    
    const newBalances = { ...get().balances }
    
    for (const addr of targetAddresses) {
      try {
        const balances = await provider.getBalances(addr)
        newBalances[addr] = balances
      } catch (error) {
        console.warn(`Failed to fetch balances for ${addr}:`, error)
        newBalances[addr] = []
      }
    }
    
    set({ balances: newBalances })
    get()._updateLastActivity()
  },
  
  getAccountBalance: (address: string, denom: string) => {
    const { balances } = get()
    const accountBalances = balances[address] || []
    const balance = accountBalances.find(b => b.denom === denom)
    return balance?.amount || '0'
  },
  
  // Transaction operations
  signAndBroadcast: async (payload: TxPayload, signerAddress: string) => {
    const { provider } = get()
    if (!provider) throw new Error('Provider not initialized')
    
    const signedTx = await provider.signTx(payload, signerAddress)
    const result = await provider.broadcastTx(signedTx)
    
    // Refresh balances after successful transaction
    setTimeout(() => get().refreshBalances(signerAddress), 2000)
    
    get()._updateLastActivity()
    return result
  },
  
  quickTransfer: async (toAddress: string, amount: string, denom: string) => {
    const { provider, currentAccount } = get()
    if (!provider || !currentAccount) {
      throw new Error('No active account')
    }
    
    if (!validateAddress(toAddress)) {
      throw new Error('Invalid recipient address')
    }
    
    if (!validateAmount(amount)) {
      throw new Error('Invalid amount')
    }
    
    // Get account info for transaction
    const accountInfo = await provider.getAccountInfo(currentAccount.address)
    
    // Build transfer transaction
    const payload = buildTransfer(
      toAddress,
      [{ denom, amount }],
      {
        chainId: provider['config'].chainId,
        accountNumber: accountInfo.accountNumber,
        sequence: accountInfo.sequence
      }
    )
    
    return get().signAndBroadcast(payload, currentAccount.address)
  },
  
  // Utilities
  formatBalance: (amount: string, denom: string) => {
    const decimals = denom === 'udgt' || denom === 'udrt' ? 6 : 0
    const formatted = formatTokenAmount(amount, decimals)
    const symbol = denom === 'udgt' ? 'DGT' : denom === 'udrt' ? 'DRT' : denom.toUpperCase()
    return `${formatted} ${symbol}`
  },
  
  validateAddress: (address: string) => {
    return validateAddress(address, 'dytallix')
  },
  
  // Internal helpers
  _setupAutoLock: () => {
    const { autoLockMinutes } = get()
    const timeoutId = setTimeout(() => {
      console.log('Auto-locking wallet due to inactivity')
      get().lock()
    }, autoLockMinutes * 60 * 1000)
    
    set({ autoLockTimeoutId: timeoutId })
  },
  
  _resetAutoLock: () => {
    const { autoLockTimeoutId } = get()
    if (autoLockTimeoutId) {
      clearTimeout(autoLockTimeoutId)
    }
    get()._setupAutoLock()
  },
  
  _updateLastActivity: () => {
    set({ lastActivity: Date.now() })
    get()._resetAutoLock()
  }
}))

// Convenience hooks for common operations
export function useWalletActions() {
  const store = useWalletStore()
  return {
    init: store.init,
    createVault: store.createVault,
    unlock: store.unlock,
    lock: store.lock,
    createAccount: store.createAccount,
    importAccount: store.importAccount,
    selectAccount: store.selectAccount,
    refreshBalances: store.refreshBalances,
    quickTransfer: store.quickTransfer
  }
}

export function useWalletState() {
  return useWalletStore(state => ({
    isUnlocked: state.isUnlocked,
    currentAccount: state.currentAccount,
    accounts: state.accounts,
    balances: state.balances,
    provider: state.provider
  }))
}

export function useCurrentAccountBalance() {
  const { currentAccount, balances, formatBalance } = useWalletStore()
  
  if (!currentAccount) return { dgt: '0 DGT', drt: '0 DRT' }
  
  const accountBalances = balances[currentAccount.address] || []
  const dgtAmount = accountBalances.find(b => b.denom === 'udgt')?.amount || '0'
  const drtAmount = accountBalances.find(b => b.denom === 'udrt')?.amount || '0'
  
  return {
    dgt: formatBalance(dgtAmount, 'udgt'),
    drt: formatBalance(drtAmount, 'udrt')
  }
}