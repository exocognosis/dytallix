import React from 'react'
import { Routes, Route } from 'react-router-dom'
import './styles/global.css'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Faucet from './pages/Faucet.jsx'
import TechStack from './pages/TechStack.jsx'
import Modules from './pages/Modules.jsx'
import Roadmap from './pages/Roadmap.jsx'
import DevResources from './pages/DevResources.jsx'
import Wallet from './pages/Wallet.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Explorer from './pages/Explorer.jsx'
import Deploy from './pages/Deploy.jsx'
import QuantumBackground from './components/QuantumBackground'

function App() {
  return (
    <div className="app">
      <QuantumBackground className="quantum-bg" />
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/faucet" element={<Faucet />} />
          <Route path="/deploy" element={<Deploy />} />
          {/* Explorer index */}
          <Route path="/explorer" element={<Explorer />} />
          {/* Explorer deep links */}
          <Route path="/explorer/tx/:hash" element={<Explorer />} />
          <Route path="/explorer/address/:addr" element={<Explorer />} />
          <Route path="/explorer/contract/:addr" element={<Explorer />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Back-compat alias */}
          <Route path="/analytics" element={<Dashboard />} />
          {/* Tech Stack canonical and aliases */}
          <Route path="/tech-stack" element={<TechStack />} />
          <Route path="/tech-specs" element={<TechStack />} />
          <Route path="/techspecs" element={<TechStack />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/dev-resources" element={<DevResources />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
