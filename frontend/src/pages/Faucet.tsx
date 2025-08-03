import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import toast from 'react-hot-toast'

interface NetworkStatus {
  status: string
  faucetBalance?: {
    DGT?: { formatted: string }
    DRT?: { formatted: string }
  }
  network?: {
    blockHeight?: number
    connected?: boolean
  }
  chainId?: string
  responseTime?: number
  lastBlockTime?: string
}

interface FaucetForm {
  address: string
  tokenType: 'DGT' | 'DRT' | 'both'
}

interface Transaction {
  hash: string
  token: string
  amount: string
}

export function Faucet() {
  const [form, setForm] = useState<FaucetForm>({ address: '', tokenType: 'both' })
  const [loading, setLoading] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [cooldown, setCooldown] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    checkNetworkStatus()
    const interval = setInterval(checkNetworkStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const checkNetworkStatus = async () => {
    const startTime = Date.now()
    try {
      const response = await fetch('/api/status')
      const responseTime = Date.now() - startTime
      const status = await response.json()
      setNetworkStatus({ ...status, responseTime })
    } catch (error) {
      console.error('Failed to check network status:', error)
      const responseTime = Date.now() - startTime
      try {
        const healthResponse = await fetch('/api/health')
        const healthData = await healthResponse.json()
        if (healthResponse.ok && healthData.status === 'healthy') {
          setNetworkStatus({ status: 'healthy', responseTime })
        }
      } catch {
        setNetworkStatus({ status: 'error', responseTime })
      }
    }
  }

  const validateAddress = (address: string): string | null => {
    if (!address) return 'Address is required'
    if (!address.match(/^dyt1[a-z0-9]{38,59}$/)) {
      return 'Must be a valid Dytallix address starting with "dyt1"'
    }
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const addressError = validateAddress(form.address)
    if (addressError) {
      setErrors({ address: addressError })
      return
    }
    setErrors({})
    submitRequest(form)
  }

  const submitRequest = async (formData: FaucetForm) => {
    setLoading(true)
    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        const tokenDisplay = formData.tokenType === 'both' ? 'DGT + DRT' : formData.tokenType
        toast.success(`Successfully sent ${tokenDisplay} tokens!`, {
          icon: '🎉',
          duration: 5000
        })
        
        if (result.transactions) {
          setRecentTransactions(result.transactions)
        }
        
        setForm({ address: '', tokenType: 'both' })
        setCooldown(1800) // 30 minute cooldown
      } else {
        toast.error(result.message || 'Failed to send tokens', { icon: '❌' })
      }
    } catch (error) {
      toast.error('Network error. Please try again.', { icon: '🔥' })
      console.error('Faucet request failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const showAPIDocumentation = () => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-dashboard-card border border-dashboard-border rounded-xl p-6 shadow-lg`}>
        <h3 className="text-lg font-semibold text-dashboard-text mb-4">Faucet API Documentation</h3>
        <div className="space-y-2 text-sm text-dashboard-text-gray">
          <div><strong>POST /api/faucet</strong> - Request tokens</div>
          <div><strong>GET /api/status</strong> - Check network status</div>
          <div><strong>GET /api/balance/:address</strong> - Check balance</div>
          <div className="mt-4 text-primary-400">
            Base URL: {window.location.origin}/api
          </div>
        </div>
        <Button 
          onClick={() => toast.dismiss(t.id)} 
          variant="outline" 
          className="mt-4 w-full"
        >
          Close
        </Button>
      </div>
    ), { duration: 10000 })
  }

  return (
    <main className="bg-dashboard-bg min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">


        <div className="grid lg:grid-cols-2 gap-8 items-start max-w-6xl mx-auto">
          {/* Left Column - Main Faucet Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full"
          >
            <Card className="bg-dashboard-card border-dashboard-border shadow-xl hover:bg-dashboard-card-hover hover:border-primary-600/50 transition-all duration-300">
              <CardContent className="p-8 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="text-center space-y-2"
                >
                  <h1 className="text-3xl font-bold text-dashboard-text">Dytallix Faucet</h1>
                  <p className="text-dashboard-text-gray">Get DGT & DRT tokens for development</p>
                </motion.div>

                {/* Token Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="bg-dashboard-bg border border-dashboard-border rounded-xl p-4 space-y-4"
                >
                  <div className="text-center">
                    <h3 className="font-semibold text-primary-400 mb-3">Dual Token System</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-dashboard-card rounded-lg border border-dashboard-border-hover">
                      <div>
                        <div className="font-medium text-primary-300">DGT</div>
                        <div className="text-xs text-dashboard-text-gray">Governance Token</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-dashboard-text">10 DGT</div>
                        <div className="text-xs text-dashboard-text-gray">per request</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dashboard-card rounded-lg border border-dashboard-border-hover">
                      <div>
                        <div className="font-medium text-quantum-300">DRT</div>
                        <div className="text-xs text-dashboard-text-gray">Reward Token</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-dashboard-text">100 DRT</div>
                        <div className="text-xs text-dashboard-text-gray">per request</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Form */}
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label htmlFor="address" className="block text-sm font-medium text-dashboard-text">
                      Wallet Address
                    </label>
                    <input
                      id="address"
                      type="text"
                      value={form.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, address: e.target.value })}
                      placeholder="dyt1abc123def456ghi789jkl012mno345pqr678stu901"
                      className={`w-full px-4 py-3 bg-dashboard-bg border rounded-xl text-dashboard-text placeholder-dashboard-text-gray focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 ${
                        errors.address ? 'border-red-500' : 'border-dashboard-border'
                      }`}
                      disabled={loading || cooldown > 0}
                    />
                    {errors.address && (
                      <p className="text-red-400 text-sm">{errors.address}</p>
                    )}
                    {!errors.address && (
                      <p className="text-dashboard-text-gray text-xs">
                        Enter your Dytallix address starting with "dyt1". Need a wallet? See "Need Help?" below.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="tokenType" className="block text-sm font-medium text-dashboard-text">
                      Token Type
                    </label>
                    <select
                      value={form.tokenType}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                        setForm({ ...form, tokenType: e.target.value as 'DGT' | 'DRT' | 'both' })
                      }
                      disabled={loading || cooldown > 0}
                      className="w-full px-4 py-3 bg-dashboard-bg border border-dashboard-border rounded-xl text-dashboard-text focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="both" className="bg-dashboard-card text-dashboard-text">
                        Both (DGT + DRT) - Recommended
                      </option>
                      <option value="DGT" className="bg-dashboard-card text-dashboard-text">
                        DGT Only - Governance Token
                      </option>
                      <option value="DRT" className="bg-dashboard-card text-dashboard-text">
                        DRT Only - Reward Token
                      </option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || cooldown > 0}
                    className="w-full bg-gradient-to-r from-primary-600 to-quantum-600 hover:from-primary-700 hover:to-quantum-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 glow-primary"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : cooldown > 0 ? (
                      `Wait ${formatTime(cooldown)} to request again`
                    ) : (
                      'Request Tokens'
                    )}
                  </Button>
                </motion.form>

                {/* API Documentation Link */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="text-center pt-4 border-t border-dashboard-border"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={showAPIDocumentation}
                    className="text-primary-400 hover:text-primary-300 text-sm"
                  >
                    📚 View API Documentation
                  </Button>
                </motion.div>
              </CardContent>
            </Card>

            {/* Recent Transactions - Below main form if they exist */}
            {recentTransactions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="mt-8"
              >
                <Card className="bg-dashboard-card border-dashboard-border shadow-xl">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-dashboard-text mb-4">Recent Transactions</h3>
                    <div className="space-y-3">
                      {recentTransactions.map((tx, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-dashboard-bg rounded-lg border border-dashboard-border-hover">
                          <div>
                            <div className="font-medium text-dashboard-text">{tx.token}</div>
                            <div className="text-xs text-dashboard-text-gray">{tx.amount}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-primary-400 font-mono">
                              {tx.hash.substring(0, 8)}...{tx.hash.substring(tx.hash.length - 8)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column - Information Cards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-full space-y-8"
          >
            {/* Network Status Card */}
            <Card className="bg-dashboard-card border-dashboard-border shadow-xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-dashboard-text mb-4">Network Status</h3>
                <div className="space-y-3">
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between">
                    <span className="text-dashboard-text-gray">Network Health</span>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${
                      networkStatus?.status === 'operational' || networkStatus?.status === 'healthy'
                        ? 'bg-green-900/20 border border-green-700/30 text-green-400'
                        : 'bg-red-900/20 border border-red-700/30 text-red-400'
                    }`}>
                      {networkStatus?.status === 'operational' || networkStatus?.status === 'healthy' ? (
                        <>
                          <span>✅</span>
                          <span>Healthy</span>
                        </>
                      ) : (
                        <>
                          <span>⚠️</span>
                          <span>Unknown</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Block Height */}
                  {networkStatus?.network?.blockHeight && (
                    <div className="flex items-center justify-between">
                      <span className="text-dashboard-text-gray">Block Height</span>
                      <span className="text-dashboard-text font-mono">
                        #{networkStatus.network.blockHeight.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Response Time */}
                  {networkStatus?.responseTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-dashboard-text-gray">Response Time</span>
                      <span className={`font-mono ${
                        networkStatus.responseTime < 500 ? 'text-green-400' :
                        networkStatus.responseTime < 1000 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {networkStatus.responseTime}ms
                      </span>
                    </div>
                  )}

                  {/* Chain ID */}
                  {networkStatus?.chainId && (
                    <div className="flex items-center justify-between">
                      <span className="text-dashboard-text-gray">Chain ID</span>
                      <span className="text-dashboard-text font-mono">{networkStatus.chainId}</span>
                    </div>
                  )}

                  {/* Faucet Balances */}
                  {(networkStatus?.faucetBalance?.DGT || networkStatus?.faucetBalance?.DRT) && (
                    <div className="pt-2 border-t border-dashboard-border">
                      <div className="text-dashboard-text-gray text-sm mb-2">Faucet Balances</div>
                      {networkStatus.faucetBalance.DGT && (
                        <div className="flex items-center justify-between">
                          <span className="text-primary-300 text-sm">DGT</span>
                          <span className="text-dashboard-text font-mono text-sm">
                            {networkStatus.faucetBalance.DGT.formatted}
                          </span>
                        </div>
                      )}
                      {networkStatus.faucetBalance.DRT && (
                        <div className="flex items-center justify-between">
                          <span className="text-quantum-300 text-sm">DRT</span>
                          <span className="text-dashboard-text font-mono text-sm">
                            {networkStatus.faucetBalance.DRT.formatted}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connection Status */}
                  {networkStatus?.network?.connected !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-dashboard-text-gray">Connection</span>
                      <span className={`text-sm ${
                        networkStatus.network.connected ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {networkStatus.network.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  )}

                  {/* No Data State */}
                  {!networkStatus && (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      <span className="text-dashboard-text-gray text-sm">Checking network status...</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rate Limits Card */}
            <Card className="bg-dashboard-card border-dashboard-border shadow-xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-dashboard-text mb-4">Rate Limits</h3>
                <div className="space-y-2 text-dashboard-text-gray">
                  <div>• Maximum 5 requests per hour per IP</div>
                  <div>• 30-minute cooldown between successful requests</div>
                  <div>• Address validation required</div>
                  <div>• Testnet only - no real value</div>
                </div>
              </CardContent>
            </Card>

            {/* Need Help Card */}
            <Card className="bg-dashboard-card border-dashboard-border shadow-xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-dashboard-text mb-4">Need Help?</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="text-dashboard-text font-medium text-sm">Getting a Wallet Address:</div>
                    <div className="text-dashboard-text-gray text-sm space-y-1 ml-2">
                      <div>• Install Keplr wallet extension</div>
                      <div>• Add Dytallix testnet network</div>
                      <div>• Use CLI: <code className="bg-dashboard-bg px-1 rounded text-primary-400">dytallix keys add &lt;name&gt;</code></div>
                      <div>• Address format: <code className="bg-dashboard-bg px-1 rounded text-primary-400">dyt1...</code></div>
                    </div>
                  </div>
                  
                  <div className="border-t border-dashboard-border pt-3">
                    <div className="text-dashboard-text-gray space-y-1">
                      <div>• Join our Discord for support</div>
                      <div>• Check testnet status in diagnostics</div>
                      <div>• Review API documentation</div>
                      <div>• Report issues on GitHub</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  )
}