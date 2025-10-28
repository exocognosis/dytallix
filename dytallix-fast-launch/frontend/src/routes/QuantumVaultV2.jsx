import React, { useState } from 'react';
import StorageSelector from '../components/quantum/StorageSelector';
import ProofGenerationCard from '../components/quantum/ProofGenerationCard';
import VerificationCertificate from '../components/quantum/VerificationCertificate';
import FileVerifier from '../components/quantum/FileVerifier';

const API_URL = import.meta.env.VITE_QUANTUMVAULT_API_URL || 'http://localhost:3031';

/**
 * QuantumVault v2 - Storage-Agnostic Cryptographic Verification
 * 
 * Workflow:
 * 1. Choose storage location (user-controlled)
 * 2. Select file & encrypt with password
 * 3. Generate cryptographic proof (no upload)
 * 4. Download encrypted file & certificate
 * 5. Anchor proof on blockchain
 * 6. Verify file integrity anytime
 */
export default function QuantumVaultV2() {
  const [storageLocation, setStorageLocation] = useState(null);
  const [proofResult, setProofResult] = useState(null);
  const [anchored, setAnchored] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [activeTab, setActiveTab] = useState('generate'); // 'generate', 'verify'
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const handleStorageSelect = (storage) => {
    setStorageLocation(storage);
  };

  const handleProofComplete = (result) => {
    console.log('[QuantumVaultV2] Proof generated:', result);
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
      console.log('[QuantumVaultV2] Anchored:', result);
      
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
      console.error('[QuantumVaultV2] Anchoring error:', error);
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
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-neutral-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">Q</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">QuantumVault v2</h1>
                <p className="text-xs text-neutral-400">Storage-Agnostic Cryptographic Verification</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                API Connected
              </span>
              <a 
                href="#/"
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-sm"
              >
                ← Back to Home
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <div className="inline-block px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm font-semibold mb-4">
            🔐 Zero-Knowledge • User-Controlled Storage • Blockchain-Anchored
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Cryptographic Verification Service
          </h2>
          <p className="text-lg text-neutral-300 max-w-3xl mx-auto">
            Generate tamper-proof cryptographic proofs for your files. Store them anywhere, verify them anytime. Your data, your control.
          </p>
        </section>

        {/* Progress Indicator */}
        {activeTab === 'generate' && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-between">
              {[
                { step: 1, label: 'Choose Storage', active: !storageLocation, completed: !!storageLocation },
                { step: 2, label: 'Generate Proof', active: storageLocation && !proofResult, completed: !!proofResult },
                { step: 3, label: 'Download & Anchor', active: !!proofResult, completed: anchored },
              ].map((item, idx) => (
                <React.Fragment key={item.step}>
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
                      item.completed ? 'bg-green-500 text-white' :
                      item.active ? 'bg-purple-500 text-white' :
                      'bg-white/10 text-neutral-400'
                    }`}>
                      {item.completed ? '✓' : item.step}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${
                      item.active || item.completed ? 'text-white' : 'text-neutral-500'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div className={`flex-1 h-0.5 mx-2 transition ${
                      item.completed ? 'bg-green-500' : 'bg-white/10'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'generate'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-white/5 text-neutral-400 hover:bg-white/10'
            }`}
          >
            🔐 Generate Proof
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'verify'
                ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg'
                : 'bg-white/5 text-neutral-400 hover:bg-white/10'
            }`}
          >
            ✓ Verify File
          </button>
        </div>

        {/* Generate Proof Tab */}
        {activeTab === 'generate' && (
          <div className="space-y-8">
            {/* Step 1: Storage Selection */}
            {!storageLocation && (
              <div className="max-w-4xl mx-auto">
                <StorageSelector
                  onSelect={handleStorageSelect}
                  selectedStorage={storageLocation}
                />
              </div>
            )}

            {/* Step 2: Proof Generation */}
            {storageLocation && !proofResult && (
              <div className="max-w-3xl mx-auto">
                <ProofGenerationCard
                  storageLocation={storageLocation}
                  onComplete={handleProofComplete}
                />
              </div>
            )}

            {/* Step 3: Results */}
            {proofResult && (
              <div className="space-y-6">
                {/* Success Banner */}
                <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 shadow-2xl">
                  <div className="text-center">
                    <div className="text-5xl mb-3">✓</div>
                    <h3 className="text-3xl font-bold mb-2">Proof Generated Successfully!</h3>
                    <p className="text-neutral-300 mb-6">
                      Your file is encrypted and verified. Certificate is ready for download.
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap justify-center gap-3">
                      {!anchored && (
                        <button
                          onClick={anchorProof}
                          disabled={anchoring}
                          className="px-6 py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold transition disabled:opacity-50 shadow-lg"
                        >
                          {anchoring ? '⏳ Anchoring...' : '⚓ Anchor on Blockchain'}
                        </button>
                      )}
                      
                      {anchored && (
                        <div className="px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Anchored on Blockchain
                        </div>
                      )}
                      
                      <button
                        onClick={reset}
                        className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition font-semibold"
                      >
                        Generate Another Proof
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
                  {/* Certificate */}
                  <VerificationCertificate
                    proof={proofResult.proof}
                    proofId={proofResult.proofId}
                    certificate={proofResult.certificate}
                  />

                  {/* File Info */}
                  <div className="space-y-4">
                    {/* Encrypted File */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                          <span className="text-blue-500 text-xl">🔒</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">Encrypted File</h3>
                          <p className="text-xs text-neutral-400">AES-256-GCM with password</p>
                        </div>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="p-3 rounded-xl bg-white/5">
                          <div className="text-neutral-400 text-xs mb-1">Original</div>
                          <div className="font-semibold">{proofResult.file?.name}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-xl bg-white/5">
                            <div className="text-neutral-400 text-xs mb-1">Size</div>
                            <div className="font-semibold">{proofResult.file?.size?.toLocaleString()} bytes</div>
                          </div>
                          <div className="p-3 rounded-xl bg-white/5">
                            <div className="text-neutral-400 text-xs mb-1">Encrypted</div>
                            <div className="font-semibold">{proofResult.encryptedFile?.size?.toLocaleString()} bytes</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Storage Info */}
                    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-transparent p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                          <span className="text-orange-500 text-xl">{storageLocation.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">Storage Location</h3>
                          <p className="text-xs text-neutral-400">User-controlled</p>
                        </div>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="p-3 rounded-xl bg-white/5">
                          <div className="text-neutral-400 text-xs mb-1">Provider</div>
                          <div className="font-semibold">{storageLocation.name}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5">
                          <div className="text-neutral-400 text-xs mb-1">Location</div>
                          <div className="font-mono text-xs break-all">{storageLocation.location}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                          <strong>Note:</strong> QuantumVault does not store your files. You maintain full control.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verify File Tab */}
        {activeTab === 'verify' && (
          <div className="max-w-3xl mx-auto">
            <FileVerifier proofId={proofResult?.proofId} />
          </div>
        )}

        {/* Features Section */}
        <section className="mt-16 pt-16 border-t border-white/10">
          <h3 className="text-3xl font-bold text-center mb-4">Why QuantumVault v2?</h3>
          <p className="text-center text-neutral-400 mb-8 max-w-2xl mx-auto">
            The next generation of cryptographic file verification. Built for compliance, security, and user sovereignty.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/5 to-transparent hover:border-white/20 transition">
              <div className="text-4xl mb-3">👤</div>
              <h4 className="font-semibold text-lg mb-2">User-Controlled Storage</h4>
              <p className="text-sm text-neutral-400">
                Store your encrypted files wherever you want - S3, IPFS, local storage, or any cloud provider. You own the data.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-white/20 transition">
              <div className="text-4xl mb-3">🔐</div>
              <h4 className="font-semibold text-lg mb-2">Zero-Knowledge Encryption</h4>
              <p className="text-sm text-neutral-400">
                We never see your files or passwords. All encryption happens client-side in your browser using AES-256-GCM.
              </p>
            </div>
            
            <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/5 to-transparent hover:border-white/20 transition">
              <div className="text-4xl mb-3">⚓</div>
              <h4 className="font-semibold text-lg mb-2">Blockchain Anchored</h4>
              <p className="text-sm text-neutral-400">
                Cryptographic proofs are anchored on the blockchain for immutable, timestamped verification records.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/5 to-transparent hover:border-white/20 transition">
              <div className="text-4xl mb-3">📜</div>
              <h4 className="font-semibold text-lg mb-2">Compliance Ready</h4>
              <p className="text-sm text-neutral-400">
                Generate verification certificates and audit trails for regulatory compliance (SOC2, HIPAA, GDPR, etc).
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/5 to-transparent hover:border-white/20 transition">
              <div className="text-4xl mb-3">⚡</div>
              <h4 className="font-semibold text-lg mb-2">Fast & Efficient</h4>
              <p className="text-sm text-neutral-400">
                Client-side processing means no upload delays. Generate proofs instantly without network bottlenecks.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-yellow-500/5 to-transparent hover:border-white/20 transition">
              <div className="text-4xl mb-3">🔄</div>
              <h4 className="font-semibold text-lg mb-2">Batch Processing</h4>
              <p className="text-sm text-neutral-400">
                Process multiple files at once with batch proof generation and verification (Enterprise feature).
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-16 p-8 rounded-3xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 border border-white/10 text-center">
          <h3 className="text-2xl font-bold mb-3">Ready to secure your files?</h3>
          <p className="text-neutral-300 mb-6 max-w-2xl mx-auto">
            Join organizations worldwide using QuantumVault for cryptographic verification and compliance.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                reset();
                setActiveTab('generate');
              }}
              className="px-6 py-3 rounded-xl bg-white text-black font-semibold hover:opacity-90 transition"
            >
              Get Started
            </button>
            <a
              href="#/docs"
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition font-semibold"
            >
              View Documentation
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
