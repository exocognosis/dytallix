import React, { useEffect } from 'react'
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
import Documentation from './pages/Documentation.jsx'
import Changelog from './pages/Changelog.jsx'
import NotFound from './pages/NotFound.jsx'
import QuantumShield from './pages/QuantumShield.jsx'
import Build from './pages/Build.jsx'
import { validateConfig } from './config/cosmos.js'
import Wallet from './pages/Wallet.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Explorer from './pages/Explorer.jsx'
import Deploy from './pages/Deploy.jsx'
import QuantumBackground from './components/QuantumBackground'
import PulseGuard from './pages/PulseGuard.jsx'
import FlowRate from './pages/FlowRate.jsx'
import StakeBalancer from './pages/StakeBalancer.jsx'
import NetFlux from './pages/NetFlux.jsx'
import CodeShield from './pages/CodeShield.jsx'
import ToasterProvider from './components/common/Toaster.jsx'
import Governance from './pages/Governance.jsx'
import TxPage from './pages/Tx.jsx'
import BlockPage from './pages/Block.jsx'
import ContractsPage from './pages/Contracts.jsx'
import StakingPage from './pages/staking/StakingPage.jsx'
import TransactionsPage from './pages/transactions/TransactionsPage.jsx'
import AccountsPage from './pages/accounts/AccountsPage.jsx'

function App() {
  // Validate configuration on app load
  useEffect(() => { validateConfig() }, [])

  return (
    <ToasterProvider>
      <div className="app">
        <QuantumBackground className="quantum-bg" />
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/quantumshield" element={<QuantumShield />} />
            <Route path="/build" element={<Build />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/faucet" element={<Faucet />} />
            <Route path="/deploy" element={<Deploy />} />
            <Route path="/explorer" element={<Explorer />} />
            <Route path="/explorer/tx/:hash" element={<TxPage />} />
            <Route path="/tx/:hash" element={<TxPage />} />
            <Route path="/block/:id" element={<BlockPage />} />
            <Route path="/explorer/address/:addr" element={<Explorer />} />
            <Route path="/explorer/contract/:addr" element={<Explorer />} />
            <Route path="/status" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Dashboard />} />
            <Route path="/tech-stack" element={<TechStack />} />
            <Route path="/tech-specs" element={<TechStack />} />
            <Route path="/techspecs" element={<TechStack />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/dev-resources" element={<DevResources />} />
            <Route path="/docs" element={<Documentation />} />
            <Route path="/changelog" element={<Changelog />} />
            
            {/* Enhanced Explorer Routes */}
            <Route path="/governance" element={<Governance />} />
            <Route path="/governance/:proposalId" element={<Governance />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/contracts/:contractAddress" element={<ContractsPage />} />
            <Route path="/staking" element={<StakingPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/accounts/:address" element={<AccountsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            
            {/* Updated module routes */}
            <Route path="/pulseguard" element={<PulseGuard />} />
            <Route path="/flowrate" element={<FlowRate />} />
            <Route path="/stakebalancer" element={<StakeBalancer />} />
            <Route path="/netflux" element={<NetFlux />} />
            <Route path="/codeshield" element={<CodeShield />} />
            {/* 404 catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ToasterProvider>
  )
}

export default App
