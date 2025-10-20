import React, { useState } from 'react';
import UploadCard from '../components/quantum/UploadCard';
import ProofPanel from '../components/quantum/ProofPanel';
import AnchorPanel from '../components/quantum/AnchorPanel';
import VerifyPanel from '../components/quantum/VerifyPanel';

/**
 * QuantumVault - Permissionless, quantum-secure asset storage
 * Route: #/quantumvault
 * 
 * Demonstrates:
 * - Client-side BLAKE3 hashing
 * - XChaCha20-Poly1305 encryption
 * - Post-quantum proof generation (Dilithium stub)
 * - On-chain anchoring via registry contract
 * - Verification workflow
 */

const QuantumVaultContent = () => {
  const [proof, setProof] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [anchorResult, setAnchorResult] = useState(null);

  const handleUploadComplete = (result) => {
    setUploadResult(result);
    setProof(result.proof);
  };

  const handleAnchorComplete = (result) => {
    setAnchorResult(result);
  };

  return (
    <div>
        {/* Hero Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/30">
              <span className="text-2xl">🔐</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">QuantumVault</h1>
              <p className="text-neutral-400 mt-1">Next-generation quantum-secure digital asset protection</p>
            </div>
          </div>
          
          <p className="text-xl text-neutral-300 max-w-4xl mb-8">
            QuantumVault is a revolutionary digital asset protection platform that combines post-quantum cryptography, 
            decentralized storage, and blockchain-based proof anchoring to ensure your critical data remains secure 
            against both classical and quantum computing threats.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-4">
              <div className="text-blue-400 font-semibold mb-2">🛡️ Quantum-Resistant</div>
              <p className="text-sm text-neutral-300">NIST-approved post-quantum algorithms protect against future quantum attacks</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-4">
              <div className="text-purple-400 font-semibold mb-2">🔒 Zero-Knowledge</div>
              <p className="text-sm text-neutral-300">Client-side encryption ensures only you have access to your data</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 p-4">
              <div className="text-green-400 font-semibold mb-2">⚡ Immutable Proof</div>
              <p className="text-sm text-neutral-300">Blockchain anchoring provides cryptographic proof of existence and integrity</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 text-sm">
              <span className="text-blue-400 font-semibold">✓</span> BLAKE3 Hashing
            </div>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 text-sm">
              <span className="text-purple-400 font-semibold">✓</span> ML-DSA (Dilithium)
            </div>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 text-sm">
              <span className="text-green-400 font-semibold">✓</span> SLH-DSA (SPHINCS+)
            </div>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 text-sm">
              <span className="text-orange-400 font-semibold">✓</span> Blockchain Anchoring
            </div>
          </div>
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
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="text-blue-400">🔐</span>
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

          {/* Step-by-Step Process */}
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
                  <span className="text-2xl">🔒</span>
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
        </section>

        {/* Main Workflow */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Try QuantumVault</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column: Upload & Proof */}
            <div className="space-y-6">
              <UploadCard onComplete={handleUploadComplete} />
              
              {proof && (
                <ProofPanel 
                  proof={proof} 
                  uploadResult={uploadResult}
                />
              )}
            </div>

            {/* Right Column: Anchor & Verify */}
            <div className="space-y-6">
              {proof && (
                <AnchorPanel 
                  proof={proof}
                  onAnchorComplete={handleAnchorComplete}
                />
              )}
              
              <VerifyPanel anchorResult={anchorResult} />
            </div>
          </div>
        </section>

        {/* Security & Compliance */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Security & Compliance</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-transparent p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="text-blue-400">🛡️</span>
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
  );
};

// Page wrapper component that can be imported from App.jsx or created locally
const Page = ({ children }) => (
  <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
    <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.15),transparent_60%)]"/>
    <Nav />
    <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-28 pb-24">{children}</main>
    <Footer />
  </div>
);

// Navigation component (simplified version - should ideally be imported from App.jsx)
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

// Footer component (simplified version - should ideally be imported from App.jsx)
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

// Main QuantumVault component using the Page wrapper
export default function QuantumVault() {
  return (
    <Page>
      <QuantumVaultContent />
    </Page>
  );
}
