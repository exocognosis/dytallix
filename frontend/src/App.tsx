import { Routes, Route } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Homepage } from './pages/Homepage'
import { About } from './pages/About'
import { Dashboard } from './pages/Dashboard'
import { EnterpriseAI } from './pages/EnterpriseAI'
import { Wallet } from './pages/Wallet'
import { Explorer } from './pages/Explorer'
import { Governance } from './pages/Governance'
import { Staking } from './pages/Staking'
import { Analytics } from './pages/Analytics'
import { SmartContracts } from './pages/SmartContracts'
import { Tokenomics } from './pages/Tokenomics'
import { Settings } from './pages/Settings'
import { TestnetDiagnostics } from './pages/TestnetDiagnostics'
import { TestnetDashboard } from './pages/TestnetDashboard'
import { Faucet } from './pages/Faucet'
import { useWebSocket } from './hooks/useWebSocket'
import config from './services/config'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

function App() {
  // Initialize WebSocket connection for real-time updates
  const webSocket = useWebSocket()

  useEffect(() => {
    // Show environment indicator
    if (config.isTestnet) {
      toast(`🚀 Connected to ${config.get().networkName} testnet`, { 
        duration: 5000,
        icon: '🧪'
      })
    } else if (config.isDevelopment) {
      toast(`🔧 Development mode active`, { 
        duration: 3000,
        icon: '⚙️'
      })
    }
  }, [])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-dashboard-bg text-dashboard-text relative">
        {/* Environment indicator */}
        {(config.isTestnet || config.isDevelopment) && (
          <div className="bg-gradient-to-r from-primary-600 to-quantum-600 text-white px-4 py-1 text-center text-sm">
            {config.environment.toUpperCase()} ENVIRONMENT - {config.get().networkName}
            {config.isTestnet && (
              <span className="ml-4">
                <a href="/#/testnet-diagnostics" className="underline hover:no-underline">
                  View Diagnostics
                </a>
              </span>
            )}
          </div>
        )}
        
        <Navigation />
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/about" element={<About />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/enterprise-ai" element={<EnterpriseAI />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/staking" element={<Staking />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/contracts" element={<SmartContracts />} />
            <Route path="/tokenomics" element={<Tokenomics />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/testnet" element={<TestnetDashboard />} />
            <Route path="/faucet" element={<Faucet />} />
            {(config.isTestnet || config.isDevelopment) && (
              <Route path="/testnet-diagnostics" element={<TestnetDiagnostics />} />
            )}
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App
