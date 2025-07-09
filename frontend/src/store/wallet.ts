import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WalletAccount } from '../types'

interface WalletState {
  // State
  accounts: WalletAccount[]
  activeAccount: WalletAccount | null
  isConnected: boolean
  isLoading: boolean

  // Actions
  addAccount: (account: WalletAccount) => void
  removeAccount: (address: string) => void
  setActiveAccount: (account: WalletAccount | null) => void
  updateBalance: (address: string, balance: number) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      // Initial state
      accounts: [],
      activeAccount: null,
      isConnected: false,
      isLoading: false,

      // Actions
      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
          activeAccount: state.activeAccount || account,
          isConnected: true,
        })),

      removeAccount: (address) =>
        set((state) => {
          const updatedAccounts = state.accounts.filter(
            (acc) => acc.address !== address
          )
          const newActiveAccount =
            state.activeAccount?.address === address
              ? updatedAccounts[0] || null
              : state.activeAccount

          return {
            accounts: updatedAccounts,
            activeAccount: newActiveAccount,
            isConnected: updatedAccounts.length > 0,
          }
        }),

      setActiveAccount: (account) =>
        set({ activeAccount: account, isConnected: !!account }),

      updateBalance: (address, balance) =>
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.address === address ? { ...acc, balance } : acc
          ),
          activeAccount:
            state.activeAccount?.address === address
              ? { ...state.activeAccount, balance }
              : state.activeAccount,
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      reset: () =>
        set({
          accounts: [],
          activeAccount: null,
          isConnected: false,
          isLoading: false,
        }),
    }),
    {
      name: 'dytallix-wallet',
      partialize: (state) => ({
        accounts: state.accounts.map(acc => ({
          ...acc,
          key_pair: undefined // Don't persist private keys
        })),
        activeAccount: state.activeAccount ? {
          ...state.activeAccount,
          key_pair: undefined
        } : null,
      }),
    }
  )
)
