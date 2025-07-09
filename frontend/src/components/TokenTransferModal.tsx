import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { TokenBalance, TokenTransferRequest } from '../types/tokenomics'
import { useTokenTransfer } from '../hooks/useTokenomics'
import { useWalletStore } from '../store/wallet'
import toast from 'react-hot-toast'

interface TokenTransferModalProps {
  isOpen: boolean
  onClose: () => void
  balance?: TokenBalance
}

export function TokenTransferModal({ isOpen, onClose, balance }: TokenTransferModalProps) {
  const { activeAccount } = useWalletStore()
  const tokenTransfer = useTokenTransfer()
  
  const [formData, setFormData] = useState({
    tokenType: 'DGT' as 'DGT' | 'DRT',
    to: '',
    amount: '',
    gasLimit: '100000'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeAccount) {
      toast.error('No active account')
      return
    }

    const transferRequest: TokenTransferRequest = {
      tokenType: formData.tokenType,
      to: formData.to,
      amount: formData.amount,
      gasLimit: formData.gasLimit
    }

    try {
      const result = await tokenTransfer.mutateAsync(transferRequest)
      
      if (result.success) {
        toast.success(`${formData.tokenType} transfer successful!`)
        onClose()
        setFormData({
          tokenType: 'DGT',
          to: '',
          amount: '',
          gasLimit: '100000'
        })
      } else {
        toast.error(result.error || 'Transfer failed')
      }
    } catch (error) {
      toast.error('Transfer failed')
    }
  }

  const maxBalance = balance ? 
    (formData.tokenType === 'DGT' ? balance.dgt : balance.drt) : 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Transfer Tokens</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Token Type
            </label>
            <select
              value={formData.tokenType}
              onChange={(e) => setFormData({ ...formData, tokenType: e.target.value as 'DGT' | 'DRT' })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            >
              <option value="DGT">DGT (Governance Token)</option>
              <option value="DRT">DRT (Reward Token)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder="dyt1..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                max={maxBalance}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                required
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, amount: maxBalance.toString() })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 text-sm hover:text-blue-300"
              >
                MAX
              </button>
            </div>
            {balance && (
              <p className="text-sm text-gray-400 mt-1">
                Available: {maxBalance.toLocaleString()} {formData.tokenType}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Gas Limit
            </label>
            <input
              type="number"
              value={formData.gasLimit}
              onChange={(e) => setFormData({ ...formData, gasLimit: e.target.value })}
              placeholder="100000"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={tokenTransfer.isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {tokenTransfer.isLoading ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
