import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./contexts/theme-provider"
import { Layout } from "./components/layout/layout"

// Pages
import { Home } from "./pages/home"
import { DeveloperHub } from "./pages/build"
import { WalletPage } from "./pages/build/wallet"
import { BlockchainPage } from "./pages/build/blockchain"
import { FaucetPage } from "./pages/build/faucet"
import { EnterpriseHub } from "./pages/enterprise"
import { Docs } from "./pages/docs"
import { Tokenomics } from "./pages/tokenomics"
import { TechStack } from "./pages/tech-stack"
import { Roadmap } from "./pages/roadmap"
import { Contact } from "./pages/contact"
import { Privacy } from "./pages/legal/privacy"
import { Terms } from "./pages/legal/terms"
import QuantumRiskDashboard from './pages/QuantumRiskDashboard'

import { Investor } from "./pages/investor"
import { Deploy } from "./pages/deploy"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="dytallix-theme">
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />

            {/* Hidden Investor Route */}
            <Route path="/investor" element={<Investor />} />
            <Route path="/deploy" element={<Deploy />} />

            {/* Developer Hub Routes */}
            <Route path="/build" element={<DeveloperHub />} />
            <Route path="/build/wallet" element={<WalletPage />} />
            <Route path="/build/blockchain" element={<BlockchainPage />} />
            <Route path="/build/faucet" element={<FaucetPage />} />

            {/* Tools */}
            <Route path="/quantum-risk" element={<QuantumRiskDashboard />} />

            {/* Enterprise Routes */}
            <Route path="/enterprise" element={<EnterpriseHub />} />

            {/* Info Routes */}
            <Route path="/docs" element={<Docs />} />
            <Route path="/tokenomics" element={<Tokenomics />} />
            <Route path="/tech-stack" element={<TechStack />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/contact" element={<Contact />} />

            {/* Legal Routes */}
            <Route path="/legal/privacy" element={<Privacy />} />
            <Route path="/legal/terms" element={<Terms />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
