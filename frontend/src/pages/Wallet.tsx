import React, { useState } from 'react'
import { 
  WalletIcon,
  PlusIcon,
  KeyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { useWalletStore } from '../store/wallet'
import { useBalance, useGenerateKeyPair, useSubmitTransaction } from '../hooks/useAPI'
import { useTokenBalance } from '../hooks/useTokenomics'
import { WalletAccount, TransactionRequest } from '../types'
import toast from 'react-hot-toast'

interface SendFormData {
  to: string
  amount: string
  fee: string
}

export function Wallet() {
  const { accounts, activeAccount, addAccount, setActiveAccount } = useWalletStore()
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [showSendForm, setShowSendForm] = useState(false)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'dilithium' | 'falcon' | 'sphincs'>('dilithium')
  const [sendForm, setSendForm] = useState<SendFormData>({
    to: '',
    amount: '',
    fee: '0.001'
  })

  const { data: balanceData } = useBalance(activeAccount?.address || '')
  const { data: tokenBalanceData } = useTokenBalance(activeAccount?.address || '')
  const generateKeyPair = useGenerateKeyPair()
  const submitTransaction = useSubmitTransaction()

  const balance = balanceData?.data || 0
  const tokenBalance = tokenBalanceData?.data

  const handleCreateAccount = async () => {
    try {
      const result = await generateKeyPair.mutateAsync(selectedAlgorithm)
      if (result.success && result.data) {
        const newAccount: WalletAccount = {
          address: result.data.address,
          balance: 0,
          nonce: 0,
          key_pair: result.data
        }
        addAccount(newAccount)
        setShowCreateAccount(false)
        toast.success('Account created successfully!')
      }
    } catch (error) {
      console.error('Failed to create account:', error)
    }
  }

  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeAccount) {
      toast.error('No active account selected')
      return
    }

    try {
      const transaction: TransactionRequest = {
        from: activeAccount.address,
        to: sendForm.to,
        amount: Math.floor(parseFloat(sendForm.amount) * 1000000), // Convert to smallest unit
        fee: Math.floor(parseFloat(sendForm.fee) * 1000000),
        nonce: activeAccount.nonce + 1
      }

      await submitTransaction.mutateAsync(transaction)
      setShowSendForm(false)
      setSendForm({ to: '', amount: '', fee: '0.001' })
    } catch (error) {
      console.error('Failed to send transaction:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white flex items-center">
          <WalletIcon className="w-8 h-8 mr-3" />
          Wallet
        </h1>
        <p className="mt-2 text-gray-400">
          Manage your Post-Quantum cryptocurrency accounts and transactions
        </p>
      </div>

      {/* Account Selection */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Accounts</h2>
          <button
            onClick={() => setShowCreateAccount(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Account
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <WalletIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-300">No accounts</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first Post-Quantum account to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.address}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  activeAccount?.address === account.address
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-600 hover:border-gray-500'
                }`}
                onClick={() => setActiveAccount(account)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {account.address.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">
                          {account.address.slice(0, 8)}...{account.address.slice(-6)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(account.address)
                          }}
                          className="text-gray-400 hover:text-white"
                        >
                          <DocumentDuplicateIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-400">
                          Balance: {(balance / 1000000).toFixed(6)} DYT
                        </span>
                        {account.key_pair && (
                          <span className="text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded">
                            {account.key_pair.algorithm}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {activeAccount?.address === account.address && (
                    <div className="text-blue-400">
                      <ShieldCheckIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Account Details */}
      {activeAccount && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Info */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Account Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Address
                </label>
                <div className="flex items-center space-x-2">
                  <code className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm">
                    {activeAccount.address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(activeAccount.address)}
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Native Balance
                </label>
                <div className="text-2xl font-bold text-white">
                  {(balance / 1000000).toFixed(6)} DYT
                </div>
              </div>

              {/* Token Balances */}
              {tokenBalance && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      <ScaleIcon className="w-4 h-4 inline mr-1" />
                      DGT (Governance)
                    </label>
                    <div className="text-xl font-bold text-blue-400">
                      {tokenBalance.dgt.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
                      DRT (Rewards)
                    </label>
                    <div className="text-xl font-bold text-green-400">
                      {tokenBalance.drt.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {activeAccount.key_pair && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Private Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <code className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm">
                      {showPrivateKey 
                        ? activeAccount.key_pair.private_key 
                        : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'
                      }
                    </code>
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="p-2 text-gray-400 hover:text-white"
                    >
                      {showPrivateKey ? (
                        <EyeSlashIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                    {showPrivateKey && (
                      <button
                        onClick={() => copyToClipboard(activeAccount.key_pair!.private_key)}
                        className="p-2 text-gray-400 hover:text-white"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
            
            <div className="space-y-3">
              <button
                onClick={() => setShowSendForm(true)}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <ArrowUpIcon className="w-4 h-4 mr-2" />
                Send DYT
              </button>
              
              <button
                onClick={() => copyToClipboard(activeAccount.address)}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <ArrowDownIcon className="w-4 h-4 mr-2" />
                Receive DYT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Account</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Post-Quantum Algorithm
                </label>
                <select
                  value={selectedAlgorithm}
                  onChange={(e) => setSelectedAlgorithm(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                  <option value="dilithium">Dilithium (Recommended)</option>
                  <option value="falcon">Falcon</option>
                  <option value="sphincs">SPHINCS+</option>
                </select>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleCreateAccount}
                  disabled={generateKeyPair.isLoading}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <KeyIcon className="w-4 h-4 mr-2" />
                  {generateKeyPair.isLoading ? 'Creating...' : 'Create Account'}
                </button>
                
                <button
                  onClick={() => setShowCreateAccount(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Transaction Modal */}
      {showSendForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Send DYT</h3>
            
            <form onSubmit={handleSendTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  To Address
                </label>
                <input
                  type="text"
                  value={sendForm.to}
                  onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="dyt1..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Amount (DYT)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={sendForm.amount}
                  onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="0.000000"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Fee (DYT)
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={sendForm.fee}
                  onChange={(e) => setSendForm({ ...sendForm, fee: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submitTransaction.isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitTransaction.isLoading ? 'Sending...' : 'Send Transaction'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowSendForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
