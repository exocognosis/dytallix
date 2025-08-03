import React from 'react'
import { WalletIcon } from '@heroicons/react/24/outline'
import { useWallet } from '../context/WalletContext'
import { appKit } from '../utils/web3modal'

interface ConnectWalletButtonProps {
  className?: string
  showFullAddress?: boolean
}

export function ConnectWalletButton({ 
  className = '',
  showFullAddress = false 
}: ConnectWalletButtonProps) {
  const { address, isConnected, isConnecting, connect } = useWallet()

  const truncateAddress = (addr: string) => {
    if (showFullAddress) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleClick = () => {
    if (isConnected) {
      // Open account modal to show disconnect option
      appKit.open({ view: 'Account' })
    } else {
      // Open connection modal
      connect()
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isConnecting}
      className={`
        flex items-center space-x-2 px-3 py-2 rounded-md border transition-all duration-200
        ${isConnecting 
          ? 'border-dashboard-border bg-dashboard-card cursor-not-allowed opacity-75' 
          : isConnected
            ? 'border-dashboard-border-hover bg-dashboard-card hover:bg-dashboard-card-hover'
            : 'border-dashboard-border bg-dashboard-card hover:bg-dashboard-card-hover hover:border-primary-500'
        }
        ${className}
      `}
    >
      {/* Connection Status Indicator */}
      <div className={`
        w-2 h-2 rounded-full transition-all duration-200
        ${isConnecting 
          ? 'bg-yellow-400 animate-pulse' 
          : isConnected 
            ? 'bg-green-400 pulse-green' 
            : 'bg-red-400'
        }
      `} />
      
      {/* Wallet Icon */}
      <WalletIcon className="w-4 h-4 text-dashboard-text-muted" />
      
      {/* Button Text */}
      <span className="text-dashboard-text-muted text-sm">
        {isConnecting 
          ? 'Connecting...' 
          : isConnected && address
            ? truncateAddress(address)
            : 'Connect Wallet'
        }
      </span>
    </button>
  )
}