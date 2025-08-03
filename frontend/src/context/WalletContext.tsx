import React, { createContext, useContext, ReactNode } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi'
import { wagmiAdapter, appKit } from '../utils/web3modal'
import { WagmiProvider } from 'wagmi'

interface WalletContextType {
  // Connection state
  address: string | undefined
  isConnected: boolean
  isConnecting: boolean
  isDisconnected: boolean
  
  // Balance
  balance: string | undefined
  
  // Connection functions
  connect: () => void
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

interface WalletProviderInnerProps {
  children: ReactNode
}

// Inner component that has access to wagmi hooks
function WalletProviderInner({ children }: WalletProviderInnerProps) {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({
    address: address,
  })

  const connect = () => {
    // Open the AppKit modal
    appKit.open()
  }

  const value: WalletContextType = {
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    balance: balance?.formatted,
    connect,
    disconnect,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <WalletProviderInner>
        {children}
      </WalletProviderInner>
    </WagmiProvider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}