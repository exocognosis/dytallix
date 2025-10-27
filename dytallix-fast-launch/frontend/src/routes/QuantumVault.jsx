import React, { useState, useEffect } from 'react';
import StorageSelector from '../components/quantum/StorageSelector';
import ProofGenerationCard from '../components/quantum/ProofGenerationCard';
import VerificationCertificate from '../components/quantum/VerificationCertificate';
import FileVerifier from '../components/quantum/FileVerifier';

const API_URL = import.meta.env.VITE_QUANTUMVAULT_API_URL || 'http://localhost:3031';

/**
 * QuantumVault v2 - Storage-Agnostic Cryptographic Verification
 * Route: #/quantumvault
 * 
 * Features:
 * - User-controlled storage (local, S3, Azure, IPFS, custom)
 * - Client-side encryption (AES-256-GCM)
 * - Zero-knowledge architecture
 * - Blockchain anchoring on Dytallix
 * - Compliance certificates
 * - File verification
 */

// Navigation component (matches App.jsx structure)
const Nav = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = [
    { href: '/', label: 'Home' },
    { href: '/wallet', label: 'PQC Wallet' },
    { href: '/quantumvault', label: 'QuantumVault' },
    { href: '/faucet', label: 'Faucet' },
    { href: '/explorer', label: 'Explorer' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/tokenomics', label: 'Tokenomics' },
    { href: '/docs', label: 'Docs' },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur border-b border-white/10 bg-neutral-950/90">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex h-16 items-center justify-between">
        <a href="#/" className="font-black tracking-widest text-xl">DYTALLIX</a>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          {links.map((l) => (
            <a key={l.href} href={`#${l.href}`} className="text-sm text-neutral-300 hover:text-white transition">{l.label}</a>
          ))}
        </nav>
        
        {/* Desktop Wallet Button */}
        <div className="hidden md:flex items-center gap-2">
          <a href="#/wallet" className="px-3 py-2 rounded-2xl bg-white text-black text-sm font-semibold hover:opacity-90 transition">Open Wallet</a>
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-neutral-300 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-neutral-950/95 backdrop-blur">
          <nav className="px-4 py-4 space-y-2">
            {links.map((l) => (
              <a 
                key={l.href} 
                href={`#${l.href}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/5 transition"
              >
                {l.label}
              </a>
            ))}
            <a 
              href="#/wallet" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 mt-4 rounded-xl bg-white text-black text-center font-semibold hover:opacity-90 transition"
            >
              Open Wallet
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};

// Footer component (matches App.jsx structure)
const Footer = () => (
  <footer className="border-t border-white/10 bg-neutral-950/70">
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 text-sm text-neutral-400 grid md:grid-cols-3 gap-6">
      <div>
        <div className="font-black tracking-widest text-neutral-200">DYTALLIX</div>
        <div className="mt-2">Future Ready · Quantum Proof · Open Source</div>
      </div>
      <div>
        <div className="font-semibold text-neutral-300">Resources</div>
        <ul className="mt-2 space-y-1">
          <li><a className="hover:underline" href="#/docs">Documentation</a></li>
          <li><a className="hover:underline" href="https://github.com/DytallixHQ/Dytallix" target="_blank" rel="noreferrer">SDK on GitHub</a></li>
          <li><a className="hover:underline" href="https://www.npmjs.com/package/@dytallix/sdk" target="_blank" rel="noreferrer">SDK on NPM</a></li>
          <li><a className="hover:underline" href="#/dashboard">Status & Telemetry</a></li>
          <li><a className="hover:underline" href="#/tokenomics">Tokenomics</a></li>
        </ul>
      </div>
      <div>
        <div className="font-semibold text-neutral-300">Community</div>
        <ul className="mt-2 space-y-1">
          <li><a className="hover:underline" href="https://github.com/DytallixHQ/Dytallix/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Contributing</a></li>
          <li><a className="hover:underline" href="https://github.com/DytallixHQ/Dytallix/issues" target="_blank" rel="noreferrer">Report Issues</a></li>
          <li><a className="hover:underline" href="#/docs#rfc">RFCs</a></li>
          <li><a className="hover:underline" href="#/docs#security">Security</a></li>
        </ul>
      </div>
    </div>
  </footer>
);

// Page wrapper component (matches App.jsx structure)
const Page = ({ children }) => (
  <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
    <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.15),transparent_60%)]"/>
    <Nav />
    <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-28 pb-24">{children}</main>
    <Footer />
  </div>
);

const QuantumVaultContent = () => {
  const [storageLocation, setStorageLocation] = useState(null);
  const [proofResult, setProofResult] = useState(null);
  const [anchored, setAnchored] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [activeTab, setActiveTab] = useState('generate'); // 'generate', 'verify'
  const [serviceStatus, setServiceStatus] = useState({
    quantumvault: null,
    blockchain: null,
    loading: true
  });

  // Check service connectivity on mount
  useEffect(() => {
    checkServiceConnectivity();
  }, []);

  const checkServiceConnectivity = async (retryCount = 0) => {
    setServiceStatus(prev => ({ ...prev, loading: true }));
    
    const results = { quantumvault: false, blockchain: false, loading: false };
    
    // Check QuantumVault API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const qvResponse = await fetch(`${API_URL}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      results.quantumvault = qvResponse.ok;
      if (qvResponse.ok) {
        console.log('✅ QuantumVault API connected');
      }
    } catch (error) {
      console.warn('⚠️ QuantumVault API not accessible:', error.message);
      if (retryCount === 0) {
        setTimeout(() => checkServiceConnectivity(1), 2000);
        return;
      }
    }
    
    // Check Blockchain status via QuantumVault API
    try {
      const bcResponse = await fetch(`${API_URL}/blockchain/status`);
      if (bcResponse.ok) {
        const status = await bcResponse.json();
        results.blockchain = status.blockchain?.connected || false;
        console.log('✅ Blockchain connected:', status);
      }
    } catch (error) {
      console.warn('⚠️ Blockchain check failed:', error.message);
    }
    
    setServiceStatus(results);
  };

  const handleStorageSelect = (storage) => {
    setStorageLocation(storage);
  };

  const handleProofComplete = (result) => {
    console.log('[QuantumVault] Proof generated:', result);
    setProofResult(result);
  };

  const anchorProof = async () => {
    if (!proofResult?.proofId || anchored) return;

    try {
      setAnchoring(true);

      const response = await fetch(`${API_URL}/anchor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId: proofResult.proofId })
      });

      if (!response.ok) {
        throw new Error('Anchoring failed');
      }

      const result = await response.json();
      console.log('[QuantumVault] Anchored:', result);
      
      setAnchored(true);
      
      // Update proof result with anchoring info
      setProofResult({
        ...proofResult,
        proof: {
          ...proofResult.proof,
          anchored: true,
          blockchainTxHash: result.transaction.hash,
          blockchainBlock: result.transaction.blockHeight
        }
      });

    } catch (error) {
      console.error('[QuantumVault] Anchoring error:', error);
      alert('Failed to anchor proof on blockchain');
    } finally {
      setAnchoring(false);
    }
  };

  const reset = () => {
    setStorageLocation(null);
    setProofResult(null);
    setAnchored(false);
    setActiveTab('generate');
  };

  return (
    <Page>
      <div>
        {/* Hero Section */}
        <section className="mb-16">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4">QuantumVault</h1>
            <p className="text-lg text-neutral-300 mb-4">
              QuantumVault is a PQC-compliant, content-agnostic permissionless asset that secures high value data against classical and quantum threats through client-side encryption, decentralized storage, and blockchain anchoring.
            </p>
          </div>

          {/* Quantum Threat Warning */}
          <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent p-6 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">The Quantum Threat is Real</h3>
                <ul className="space-y-2 text-sm text-neutral-300">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span><strong>Quantum computers</strong> will break today's encryption standards (RSA, ECC) within the next decade, compromising all data encrypted with classical algorithms</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span><strong>"Harvest Now, Decrypt Later" attacks</strong> are happening today – adversaries are collecting encrypted data now to decrypt it once quantum computers become available</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span><strong>Data with long-term value</strong> (medical records, financial data, government secrets, intellectual property) is especially vulnerable and needs protection NOW</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span><strong>QuantumVault protects against both threats</strong> by using post-quantum cryptography (PQC) algorithms standardized by NIST, ensuring your data remains secure even against future quantum attacks</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Features & Functions */}
          <h2 className="text-3xl font-bold mb-8">Features & Functions</h2>

          {/* Key Benefits - Why QuantumVault v2? */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-5">
              <div className="text-3xl mb-2">👤</div>
              <div className="text-blue-400 font-semibold mb-2">User-Controlled Storage</div>
              <p className="text-sm text-neutral-300">Store your encrypted files wherever you want - S3, IPFS, local storage, or any cloud provider. You own the data.</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-5">
              <div className="text-3xl mb-2">🔐</div>
              <div className="text-purple-400 font-semibold mb-2">Zero-Knowledge Encryption</div>
              <p className="text-sm text-neutral-300">We never see your files or passwords. All encryption happens client-side in your browser using AES-256-GCM.</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 p-5">
              <div className="text-3xl mb-2">⚓</div>
              <div className="text-green-400 font-semibold mb-2">Blockchain Anchored</div>
              <p className="text-sm text-neutral-300">Cryptographic proofs are anchored on the blockchain for immutable, timestamped verification records.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-5">
              <div className="text-3xl mb-2">📜</div>
              <div className="text-orange-400 font-semibold mb-2">Compliance Ready</div>
              <p className="text-sm text-neutral-300">Generate verification certificates and audit trails for regulatory compliance (SOC2, HIPAA, GDPR, etc).</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 p-5">
              <div className="text-3xl mb-2">⚡</div>
              <div className="text-yellow-400 font-semibold mb-2">Fast & Efficient</div>
              <p className="text-sm text-neutral-300">Client-side processing means no upload delays. Generate proofs instantly without network bottlenecks.</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 p-5">
              <div className="text-3xl mb-2">🔄</div>
              <div className="text-cyan-400 font-semibold mb-2">Batch Processing</div>
              <p className="text-sm text-neutral-300">Process multiple files at once with batch proof generation and verification (Enterprise feature).</p>
            </div>
          </div>

          {/* Service Status Banner */}
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${serviceStatus.quantumvault ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-sm text-neutral-400">API: </span>
                  <span className={`text-sm font-semibold ${serviceStatus.quantumvault ? 'text-green-400' : 'text-red-400'}`}>
                    {serviceStatus.loading ? 'Checking...' : serviceStatus.quantumvault ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${serviceStatus.blockchain ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-sm text-neutral-400">Blockchain: </span>
                  <span className={`text-sm font-semibold ${serviceStatus.blockchain ? 'text-green-400' : 'text-red-400'}`}>
                    {serviceStatus.loading ? 'Checking...' : serviceStatus.blockchain ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => checkServiceConnectivity(0)}
                className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition text-sm"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </section>

        {/* Try QuantumVault - Interactive Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Try QuantumVault</h2>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'generate'
                  ? 'bg-purple-500/20 border-2 border-purple-500/50 text-purple-400'
                  : 'bg-white/5 border-2 border-white/10 text-neutral-400 hover:border-white/20'
              }`}
            >
              Generate Proof
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
                activeTab === 'verify'
                  ? 'bg-green-500/20 border-2 border-green-500/50 text-green-400'
                  : 'bg-white/5 border-2 border-white/10 text-neutral-400 hover:border-white/20'
              }`}
            >
              Verify File
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'generate' ? (
            <div className="space-y-8">
              {/* Workflow Steps */}
              <div className="grid md:grid-cols-5 gap-4 mb-8">
                <div className={`rounded-xl border p-4 text-center transition ${
                  !storageLocation ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-white/5'
                }`}>
                  <div className="text-2xl mb-2">📁</div>
                  <div className="text-sm font-semibold mb-1">1. Choose Storage</div>
                  <div className="text-xs text-neutral-400">Select where to store your file</div>
                </div>
                <div className={`rounded-xl border p-4 text-center transition ${
                  storageLocation && !proofResult ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-white/5'
                }`}>
                  <div className="text-2xl mb-2">🔐</div>
                  <div className="text-sm font-semibold mb-1">2. Encrypt & Hash</div>
                  <div className="text-xs text-neutral-400">Generate cryptographic proof</div>
                </div>
                <div className={`rounded-xl border p-4 text-center transition ${
                  proofResult && !anchored ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-white/5'
                }`}>
                  <div className="text-2xl mb-2">📜</div>
                  <div className="text-sm font-semibold mb-1">3. Download</div>
                  <div className="text-xs text-neutral-400">Get file & certificate</div>
                </div>
                <div className={`rounded-xl border p-4 text-center transition ${
                  proofResult && !anchored ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10 bg-white/5'
                }`}>
                  <div className="text-2xl mb-2">⚓</div>
                  <div className="text-sm font-semibold mb-1">4. Anchor</div>
                  <div className="text-xs text-neutral-400">Register on blockchain</div>
                </div>
                <div className={`rounded-xl border p-4 text-center transition ${
                  anchored ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 bg-white/5'
                }`}>
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-semibold mb-1">5. Complete</div>
                  <div className="text-xs text-neutral-400">Verification ready</div>
                </div>
              </div>

              {/* Step 1: Storage Selection */}
              {!storageLocation && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Step 1: Choose Your Storage Location</h3>
                  <StorageSelector onSelect={handleStorageSelect} />
                </div>
              )}

              {/* Step 2: Proof Generation */}
              {storageLocation && !proofResult && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Step 2: Generate Cryptographic Proof</h3>
                    <button
                      onClick={reset}
                      className="text-sm text-neutral-400 hover:text-white transition"
                    >
                      ← Change Storage
                    </button>
                  </div>
                  <ProofGenerationCard 
                    storageLocation={storageLocation}
                    onComplete={handleProofComplete}
                  />
                </div>
              )}

              {/* Step 3 & 4: Certificate Display and Anchoring */}
              {proofResult && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">
                      {anchored ? '✅ Proof Anchored Successfully' : 'Step 3 & 4: Certificate & Blockchain Anchoring'}
                    </h3>
                    <button
                      onClick={reset}
                      className="text-sm text-neutral-400 hover:text-white transition"
                    >
                      ← Start Over
                    </button>
                  </div>
                  
                  <VerificationCertificate 
                    proof={proofResult.proof}
                    proofId={proofResult.proofId}
                    storageLocation={storageLocation}
                    onAnchor={anchorProof}
                    anchored={anchored}
                    anchoring={anchoring}
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-semibold mb-4">Verify File Integrity</h3>
              <FileVerifier />
            </div>
          )}
        </section>

          {/* Use Cases by Vertical */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Industry Use Cases</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Government & Defense */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-red-500/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <span className="text-red-400 text-xl">🏛️</span>
                </div>
                <h3 className="text-xl font-semibold">Government & Defense</h3>
              </div>
              <ul className="space-y-3 text-sm text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span><strong>Classified Document Storage:</strong> Secure intelligence reports, strategic plans, and sensitive communications with quantum-resistant encryption</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span><strong>Digital Evidence Chain:</strong> Immutable proof of evidence integrity for legal proceedings and investigations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span><strong>Treaty & Policy Archives:</strong> Long-term preservation of critical agreements with verifiable authenticity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span><strong>Secure Communications:</strong> Diplomatic cables and inter-agency communications protected against quantum decryption</span>
                </li>
              </ul>
            </div>

            {/* Healthcare & Life Sciences */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 text-xl">🏥</span>
                </div>
                <h3 className="text-xl font-semibold">Healthcare & Life Sciences</h3>
              </div>
              <ul className="space-y-3 text-sm text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span><strong>Patient Records (PHI):</strong> HIPAA-compliant storage of medical histories, genomic data, and treatment records</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span><strong>Clinical Trial Data:</strong> Tamper-proof research data with verifiable integrity for FDA submissions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span><strong>Medical Imaging:</strong> Secure storage of MRI, CT, and X-ray images with proof of authenticity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span><strong>Drug Development:</strong> Protect proprietary research, formulations, and clinical study documentation</span>
                </li>
              </ul>
            </div>

            {/* Financial Services */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-yellow-500/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <span className="text-yellow-400 text-xl">🏦</span>
                </div>
                <h3 className="text-xl font-semibold">Financial Services</h3>
              </div>
              <ul className="space-y-3 text-sm text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span><strong>Transaction Records:</strong> Immutable audit trails for regulatory compliance and fraud prevention</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span><strong>Customer Data (KYC/AML):</strong> Secure storage of identity verification and anti-money laundering documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span><strong>Trading Algorithms:</strong> Protect proprietary quantitative models and investment strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span><strong>Risk Assessment Models:</strong> Secure AI models used for credit scoring and risk evaluation</span>
                </li>
              </ul>
            </div>

            {/* Technology & Software */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 text-xl">💻</span>
                </div>
                <h3 className="text-xl font-semibold">Technology & Software</h3>
              </div>
              <ul className="space-y-3 text-sm text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span><strong>Source Code Protection:</strong> Secure proprietary algorithms, AI models, and intellectual property</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span><strong>Software Releases:</strong> Cryptographic proof of software integrity and authenticity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span><strong>API Keys & Secrets:</strong> Quantum-safe storage of cryptographic keys and sensitive credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">•</span>
                  <span><strong>User Data:</strong> Privacy-preserving storage of customer information and usage analytics</span>
                </li>
              </ul>
            </div>

            {/* Design & Creative */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-400 text-xl">🎨</span>
                </div>
                <h3 className="text-xl font-semibold">Design & Creative Industries</h3>
              </div>
              <ul className="space-y-3 text-sm text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong>Digital Art & NFTs:</strong> Provable ownership and authenticity of digital creative works</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong>Design Files:</strong> Protect CAD models, architectural blueprints, and engineering designs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong>Media Assets:</strong> Secure storage of high-value video, audio, and graphic content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span><strong>Brand Assets:</strong> Immutable proof of trademark, logo, and brand design ownership</span>
                </li>
              </ul>
            </div>

            {/* Pharmaceutical & Research */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/5 to-transparent p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-400 text-xl">🧬</span>
                </div>
                <h3 className="text-xl font-semibold">Pharmaceutical & Research</h3>
              </div>
              <ul className="space-y-3 text-sm text-neutral-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span><strong>Drug Formulations:</strong> Protect billion-dollar research investments in new therapeutic compounds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span><strong>Laboratory Data:</strong> Secure research findings, experimental results, and peer review materials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span><strong>Patent Documentation:</strong> Immutable proof of invention dates and prior art for patent applications</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span><strong>Regulatory Submissions:</strong> Tamper-proof data packages for FDA, EMA, and other regulatory bodies</span>
                </li>
              </ul>
            </div>

          </div>
        </section>

        {/* How It Works - Detailed Technical Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">How QuantumVault Works</h2>
          
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            
            {/* Security Architecture */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 h-full">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-blue-400">🛡️</span>
                  Security Architecture
                </h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-semibold text-blue-400 mb-1">Client-Side Encryption</div>
                    <p className="text-neutral-300">All encryption happens in your browser using WebAssembly-compiled post-quantum algorithms. Your keys never leave your device.</p>
                  </div>
                  <div>
                    <div className="font-semibold text-purple-400 mb-1">Zero-Knowledge Storage</div>
                    <p className="text-neutral-300">Only encrypted ciphertext is stored. Even if servers are compromised, your data remains protected.</p>
                  </div>
                  <div>
                    <div className="font-semibold text-green-400 mb-1">Quantum Resistance</div>
                    <p className="text-neutral-300">NIST-standardized algorithms protect against both classical and quantum computer attacks.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cryptographic Primitives */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 h-full">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="text-purple-400">🧮</span>
                  Cryptographic Primitives
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-blue-400 mb-2">Hashing</div>
                    <div className="space-y-1 text-neutral-300">
                      <div>• <strong>BLAKE3:</strong> Cryptographic hash function</div>
                      <div>• <strong>Merkle Trees:</strong> Efficient integrity proofs</div>
                      <div>• <strong>Content Addressing:</strong> Deduplication support</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-purple-400 mb-2">Post-Quantum Signatures</div>
                    <div className="space-y-1 text-neutral-300">
                      <div>• <strong>ML-DSA (Dilithium):</strong> Lattice-based signatures</div>
                      <div>• <strong>SLH-DSA (SPHINCS+):</strong> Hash-based signatures</div>
                      <div>• <strong>Falcon:</strong> NTRU lattice signatures</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-green-400 mb-2">Symmetric Encryption</div>
                    <div className="space-y-1 text-neutral-300">
                      <div>• <strong>XChaCha20-Poly1305:</strong> Authenticated encryption</div>
                      <div>• <strong>Key Derivation:</strong> PBKDF2 / Argon2</div>
                      <div>• <strong>Random Nonces:</strong> WebCrypto secure random</div>
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-orange-400 mb-2">Blockchain Integration</div>
                    <div className="space-y-1 text-neutral-300">
                      <div>• <strong>Smart Contracts:</strong> Immutable proof registry</div>
                      <div>• <strong>Merkle Anchoring:</strong> Efficient batch verification</div>
                      <div>• <strong>Timestamping:</strong> Cryptographic proof of existence</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step-by-Step Process - MOVED TO INDIVIDUAL COMPONENTS */}
          {/*
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-orange-400">⚡</span>
              Step-by-Step Process
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/30 flex items-center justify-center">
                  <span className="text-2xl">📁</span>
                </div>
                <div className="font-semibold text-blue-400 mb-2">1. Upload & Hash</div>
                <p className="text-sm text-neutral-300">Select your file (up to 10MB). BLAKE3 hash is computed client-side for integrity verification.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-transparent border border-purple-500/30 flex items-center justify-center">
                  <span className="text-2xl">�</span>
                </div>
                <div className="font-semibold text-purple-400 mb-2">2. Encrypt & Sign</div>
                <p className="text-sm text-neutral-300">File is encrypted with XChaCha20-Poly1305. Post-quantum signature proves authenticity and non-repudiation.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-transparent border border-green-500/30 flex items-center justify-center">
                  <span className="text-2xl">📜</span>
                </div>
                <div className="font-semibold text-green-400 mb-2">3. Generate Proof</div>
                <p className="text-sm text-neutral-300">Cryptographic proof bundle contains hash, signature, metadata, and verification instructions.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-500/30 flex items-center justify-center">
                  <span className="text-2xl">⚓</span>
                </div>
                <div className="font-semibold text-orange-400 mb-2">4. Blockchain Anchor</div>
                <p className="text-sm text-neutral-300">Proof hash is registered on-chain, creating immutable timestamp and existence proof.</p>
              </div>
            </div>
          </div>
          */}
        </section>

        {/* Security & Compliance */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Security & Compliance</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-transparent p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">

                NIST Compliance
              </h3>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li>• FIPS 140-2 validated algorithms</li>
                <li>• NIST SP 800-208 post-quantum standards</li>
                <li>• Common Criteria EAL4+ security</li>
                <li>• Federal quantum-readiness guidelines</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/5 to-transparent p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-green-400">🏥</span>
                Regulatory Standards
              </h3>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li>• HIPAA compliant (Healthcare)</li>
                <li>• GDPR compliant (EU Privacy)</li>
                <li>• SOX compliant (Financial)</li>
                <li>• FedRAMP authorized (Government)</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/5 to-transparent p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-purple-400">🔐</span>
                Enterprise Security
              </h3>
              <ul className="space-y-2 text-sm text-neutral-300">
                <li>• Zero-trust architecture</li>
                <li>• End-to-end encryption</li>
                <li>• Multi-signature workflows</li>
                <li>• Audit trail immutability</li>
              </ul>
            </div>

          </div>
        </section>
      </div>
    </Page>
  );
};

// Export as QuantumVault page component
const QuantumVault = () => <QuantumVaultContent />;

export default QuantumVault;
