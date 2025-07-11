import { Routes, Route } from 'react-router-dom'
import { Navigation } from './components/Navigation'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Homepage } from './pages/Homepage'
import { About } from './pages/About'
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
      <div className="min-h-screen bg-gray-900 text-white relative">
        <Navigation />
        <main className="container mx-auto px-4 py-8 relative z-10">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/about" element={<About />} />
            <Route path="/dashboard" element={<Dashboard />} />
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
