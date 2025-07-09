import { Routes, Route } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Dashboard } from './pages/Dashboard'
import { Wallet } from './pages/Wallet'
import { Explorer } from './pages/Explorer'
import { Analytics } from './pages/Analytics'
import { SmartContracts } from './pages/SmartContracts'
import { Tokenomics } from './pages/Tokenomics'
import { Settings } from './pages/Settings'
// import { useWebSocket } from './hooks/useWebSocket'

function App() {
  // Initialize WebSocket connection for real-time updates
  // TODO: Enable when backend WebSocket endpoint is ready
  // useWebSocket()

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/contracts" element={<SmartContracts />} />
            <Route path="/tokenomics" element={<Tokenomics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App
