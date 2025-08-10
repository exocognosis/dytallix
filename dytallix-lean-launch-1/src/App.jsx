import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import Faucet from './pages/Faucet.jsx'
import TechSpecs from './pages/TechSpecs.jsx'
import Modules from './pages/Modules.jsx'
import Roadmap from './pages/Roadmap.jsx'
import DevResources from './pages/DevResources.jsx'
import Wallet from './pages/Wallet.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Explorer from './pages/Explorer.jsx'
import Deploy from './pages/Deploy.jsx'

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/faucet" element={<Faucet />} />
          <Route path="/deploy" element={<Deploy />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Back-compat alias */}
          <Route path="/analytics" element={<Dashboard />} />
          <Route path="/tech-specs" element={<TechSpecs />} />
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
