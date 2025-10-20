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
export default function QuantumVault() {
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.15),transparent_60%)]"/>
      
      <main className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-28 pb-24">
        {/* Hero Section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-purple-500/30">
              <span className="text-2xl">🔐</span>
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">QuantumVault</h1>
              <p className="text-neutral-400 mt-1">Permissionless, quantum-secure asset storage</p>
            </div>
          </div>
          <p className="text-lg text-neutral-300 max-w-3xl">
            Securely store and anchor assets with client-side encryption, post-quantum signatures, 
            and on-chain proof anchoring. Upload files up to 10MB with complete privacy and quantum resistance.
          </p>
          
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 text-sm">
              <span className="text-blue-400 font-semibold">✓</span> BLAKE3 Hashing
            </div>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 text-sm">
              <span className="text-purple-400 font-semibold">✓</span> XChaCha20-Poly1305
            </div>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 text-sm">
              <span className="text-green-400 font-semibold">✓</span> PQ Signatures (Dilithium)
            </div>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 text-sm">
              <span className="text-orange-400 font-semibold">✓</span> On-Chain Anchoring
            </div>
          </div>
        </section>

        {/* Main Workflow */}
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

        {/* Info Footer */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
          <h3 className="text-lg font-semibold mb-3">How It Works</h3>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-blue-400 font-semibold mb-1">1. Upload</div>
              <div className="text-neutral-400">Select or drag a file ≤10MB. Client-side hashing with BLAKE3.</div>
            </div>
            <div>
              <div className="text-purple-400 font-semibold mb-1">2. Encrypt</div>
              <div className="text-neutral-400">XChaCha20-Poly1305 encryption with random key & nonce.</div>
            </div>
            <div>
              <div className="text-green-400 font-semibold mb-1">3. Proof</div>
              <div className="text-neutral-400">Generate signed proof JSON with PQ signature (stub).</div>
            </div>
            <div>
              <div className="text-orange-400 font-semibold mb-1">4. Anchor</div>
              <div className="text-neutral-400">Register asset hash on-chain via smart contract.</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
