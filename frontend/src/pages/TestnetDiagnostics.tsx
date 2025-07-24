import React, { useState, useEffect } from 'react'
import { testnetMonitor, TestnetHealthReport, TransactionTestResult, WalletTestResult } from '../services/testnet-monitor'
import { useWebSocket } from '../hooks/useWebSocket'
import config from '../services/config'
import toast from 'react-hot-toast'

export function TestnetDiagnostics() {
  const [healthReport, setHealthReport] = useState<TestnetHealthReport | null>(null)
  const [transactionTest, setTransactionTest] = useState<TransactionTestResult | null>(null)
  const [walletTest, setWalletTest] = useState<WalletTestResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  
  const webSocket = useWebSocket()

  useEffect(() => {
    // Load initial health report
    loadHealthReport()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadHealthReport, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadHealthReport = async () => {
    try {
      const report = await testnetMonitor.generateHealthReport()
      setHealthReport(report)
    } catch (error) {
      console.error('Failed to load health report:', error)
      toast.error('Failed to load health report')
    }
  }

  const runTransactionTest = async () => {
    setIsLoading(true)
    try {
      // Use test addresses for testnet
      const testFromAddress = '0x1234567890123456789012345678901234567890'
      const testToAddress = '0x0987654321098765432109876543210987654321'
      const testAmount = 0.001 // Small amount for testing

      const result = await testnetMonitor.testTransactionFlow(testFromAddress, testToAddress, testAmount)
      setTransactionTest(result)
      
      if (result.success) {
        toast.success(`Transaction test completed: ${result.transactionHash}`)
      } else {
        toast.error(`Transaction test failed: ${result.error}`)
      }
    } catch (error: any) {
      toast.error(`Transaction test error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const runWalletTest = async () => {
    setIsLoading(true)
    try {
      const result = await testnetMonitor.testWalletIntegration()
      setWalletTest(result)
      
      if (result.metamask.detected && result.pqc.supported) {
        toast.success('Wallet integration tests passed')
      } else {
        toast.warning('Some wallet tests failed - check details below')
      }
    } catch (error: any) {
      toast.error(`Wallet test error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const exportDiagnostics = () => {
    const data = {
      healthReport,
      transactionTest,
      walletTest,
      webSocketInfo: webSocket.getConnectionInfo(),
      exportTime: new Date().toISOString(),
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dytallix-testnet-diagnostics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'successful':
        return 'text-green-400'
      case 'degraded':
      case 'connecting':
        return 'text-yellow-400'
      case 'down':
      case 'disconnected':
      case 'failed':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'successful':
        return '✅'
      case 'degraded':
      case 'connecting':
        return '⚠️'
      case 'down':
      case 'disconnected':
      case 'failed':
        return '❌'
      default:
        return '❓'
    }
  }

  if (!config.isTestnet && !config.isDevelopment) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-600 border border-yellow-500 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2">⚠️ Testnet Diagnostics Not Available</h2>
            <p>Testnet diagnostics are only available in development and testnet environments.</p>
            <p className="mt-2">Current environment: <span className="font-mono">{config.environment}</span></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">🚀 Dytallix Testnet Diagnostics</h1>
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-blue-600 px-3 py-1 rounded-full text-sm">
              Environment: {config.environment.toUpperCase()}
            </div>
            <div className="bg-green-600 px-3 py-1 rounded-full text-sm">
              Network: {config.get().networkName}
            </div>
            <div className="bg-purple-600 px-3 py-1 rounded-full text-sm">
              Chain ID: {config.get().chainId}
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={loadHealthReport}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              🔄 Refresh Health
            </button>
            
            <button
              onClick={runTransactionTest}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              🧪 Test Transaction Flow
            </button>
            
            <button
              onClick={runWalletTest}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              👛 Test Wallet Integration
            </button>
            
            <button
              onClick={exportDiagnostics}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg"
            >
              📊 Export Diagnostics
            </button>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto Refresh</span>
            </label>
          </div>
        </div>

        {/* Connectivity Status */}
        {healthReport && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">🔗 Connectivity Status</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Blockchain API</span>
                  <div className="flex items-center space-x-2">
                    <span className={getStatusColor(healthReport.connectivity.blockchain.status)}>
                      {getStatusIcon(healthReport.connectivity.blockchain.status)}
                      {healthReport.connectivity.blockchain.status}
                    </span>
                    <span className="text-gray-400 text-sm">
                      ({healthReport.connectivity.blockchain.responseTime}ms)
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>AI Services</span>
                  <div className="flex items-center space-x-2">
                    <span className={getStatusColor(healthReport.connectivity.ai.status)}>
                      {getStatusIcon(healthReport.connectivity.ai.status)}
                      {healthReport.connectivity.ai.status}
                    </span>
                    <span className="text-gray-400 text-sm">
                      ({healthReport.connectivity.ai.responseTime}ms)
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>WebSocket</span>
                  <div className="flex items-center space-x-2">
                    <span className={getStatusColor(webSocket.isConnected ? 'connected' : 'disconnected')}>
                      {getStatusIcon(webSocket.isConnected ? 'connected' : 'disconnected')}
                      {webSocket.isConnected ? 'connected' : 'disconnected'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">📊 Performance Metrics</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total API Calls</span>
                  <span>{healthReport.performance.apiCalls.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className="text-green-400">
                    {healthReport.performance.apiCalls.total > 0 
                      ? Math.round((healthReport.performance.apiCalls.successful / healthReport.performance.apiCalls.total) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Response Time</span>
                  <span>{Math.round(healthReport.performance.apiCalls.averageResponseTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Network Errors</span>
                  <span className="text-red-400">{healthReport.performance.errors.networkErrors}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">⚙️ Network Info</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Chain ID</span>
                  <span>{healthReport.networkInfo.chainId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Network</span>
                  <span>{healthReport.networkInfo.networkName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Confirmations</span>
                  <span>{healthReport.networkInfo.confirmationBlocks}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Update</span>
                  <span className="text-gray-400 text-sm">
                    {new Date(healthReport.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Test Results */}
        {transactionTest && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">🧪 Transaction Test Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className={getStatusColor(transactionTest.success ? 'successful' : 'failed')}>
                      {getStatusIcon(transactionTest.success ? 'successful' : 'failed')}
                      {transactionTest.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  {transactionTest.transactionHash && (
                    <div className="flex justify-between">
                      <span>Transaction Hash</span>
                      <span className="font-mono text-sm">{transactionTest.transactionHash.slice(0, 16)}...</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Confirmations</span>
                    <span>{transactionTest.confirmations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time Taken</span>
                    <span>{transactionTest.timeTaken}ms</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Timeline</h4>
                <div className="space-y-1 text-sm">
                  <div>Submit: {new Date(transactionTest.details.submitTime).toLocaleTimeString()}</div>
                  {transactionTest.details.confirmTime && (
                    <div>First Confirmation: {new Date(transactionTest.details.confirmTime).toLocaleTimeString()}</div>
                  )}
                  {transactionTest.details.finalizeTime && (
                    <div>Finalized: {new Date(transactionTest.details.finalizeTime).toLocaleTimeString()}</div>
                  )}
                </div>
                
                {transactionTest.error && (
                  <div className="mt-4 p-3 bg-red-900 border border-red-700 rounded">
                    <div className="text-red-400 text-sm">{transactionTest.error}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wallet Test Results */}
        {walletTest && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">👛 Wallet Integration Test Results</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">MetaMask Integration</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Detected</span>
                    <span className={getStatusColor(walletTest.metamask.detected ? 'successful' : 'failed')}>
                      {getStatusIcon(walletTest.metamask.detected ? 'successful' : 'failed')}
                      {walletTest.metamask.detected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connected</span>
                    <span className={getStatusColor(walletTest.metamask.connected ? 'successful' : 'failed')}>
                      {getStatusIcon(walletTest.metamask.connected ? 'successful' : 'failed')}
                      {walletTest.metamask.connected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Network Configured</span>
                    <span className={getStatusColor(walletTest.metamask.networkConfigured ? 'successful' : 'failed')}>
                      {getStatusIcon(walletTest.metamask.networkConfigured ? 'successful' : 'failed')}
                      {walletTest.metamask.networkConfigured ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                {walletTest.metamask.error && (
                  <div className="mt-3 p-2 bg-red-900 border border-red-700 rounded text-sm">
                    {walletTest.metamask.error}
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">PQC Wallet Integration</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Supported</span>
                    <span className={getStatusColor(walletTest.pqc.supported ? 'successful' : 'failed')}>
                      {getStatusIcon(walletTest.pqc.supported ? 'successful' : 'failed')}
                      {walletTest.pqc.supported ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Key Generated</span>
                    <span className={getStatusColor(walletTest.pqc.keyGenerated ? 'successful' : 'failed')}>
                      {getStatusIcon(walletTest.pqc.keyGenerated ? 'successful' : 'failed')}
                      {walletTest.pqc.keyGenerated ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Signature Valid</span>
                    <span className={getStatusColor(walletTest.pqc.signatureValid ? 'successful' : 'failed')}>
                      {getStatusIcon(walletTest.pqc.signatureValid ? 'successful' : 'failed')}
                      {walletTest.pqc.signatureValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                {walletTest.pqc.error && (
                  <div className="mt-3 p-2 bg-red-900 border border-red-700 rounded text-sm">
                    {walletTest.pqc.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <div>Running tests...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}