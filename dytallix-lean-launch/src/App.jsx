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

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/faucet" element={<Faucet />} />
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