import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
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
import AIOracleNetwork from './pages/AIOracleNetwork'
import SmartContractAuditor from './pages/SmartContractAuditor'
import AegisDashboard from './pages/AegisDashboard'
import AegisReviewQueue from './pages/AegisReviewQueue'
import QuantumVaultPricing from './pages/QuantumVaultPricing'
import C2QAssetMigration from './pages/C2QAssetMigration'
import C2QDeepDive from './pages/C2QDeepDive'
import ConsulGovernanceDiplomat from './pages/ConsulGovernanceDiplomat'
import HorizonNetworkMonitor from './pages/HorizonNetworkMonitor'
import VectorIdentityDashboard from './pages/VectorIdentityDashboard'
import { SecurityPage } from './pages/security'

import { Investor } from "./pages/investor"
import { Deploy } from "./pages/deploy"
import { Resources } from "./pages/resources"
import { FAQ } from "./pages/faq"

// Inner component that can use hooks
function AppRoutes() {
  // Check if we're in report mode - use window.location directly for reliability during initial render
  // This must work synchronously before React Router fully initializes
  const isReportMode = typeof window !== 'undefined' &&
    window.location.pathname === '/quantumrisk' &&
    window.location.search.includes('mode=report');

  if (isReportMode) {
    // Render report without Layout (no navbar/footer) for clean PDF export
    return <QuantumRiskDashboard />;
  }

  return (
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
        <Route path="/quantumrisk" element={<QuantumRiskDashboard />} />
        <Route path="/ai-oracle-network" element={<AIOracleNetwork />} />
        <Route path="/smart-contract-auditor" element={<SmartContractAuditor />} />
        <Route path="/aegis-dashboard" element={<AegisDashboard />} />
        <Route path="/aegis-review-queue" element={<AegisReviewQueue />} />
        <Route path="/consul-dashboard" element={<ConsulGovernanceDiplomat />} />
        <Route path="/horizon-dashboard" element={<HorizonNetworkMonitor />} />
        <Route path="/vector-dashboard" element={<VectorIdentityDashboard />} />
        <Route path="/quantumvaultpricing" element={<QuantumVaultPricing />} />
        <Route path="/C2QAssetMigration" element={<C2QAssetMigration />} />
        <Route path="/C2QDeepDive" element={<C2QDeepDive />} />

        {/* Enterprise Routes */}
        <Route path="/enterprise" element={<EnterpriseHub />} />
        <Route path="/quantumvault" element={<Navigate to="/enterprise" replace />} />

        {/* Info Routes */}
        <Route path="/docs" element={<Docs />} />
        <Route path="/tokenomics" element={<Tokenomics />} />
        <Route path="/tech-stack" element={<TechStack />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/whitepaper" element={<Resources />} />
        <Route path="/whitepapers" element={<Navigate to="/whitepaper" replace />} />
        <Route path="/resources" element={<Navigate to="/whitepaper" replace />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />

        {/* Legal Routes */}
        <Route path="/legal/privacy" element={<Privacy />} />
        <Route path="/legal/terms" element={<Terms />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="dytallix-theme">
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  )
}

export default App

