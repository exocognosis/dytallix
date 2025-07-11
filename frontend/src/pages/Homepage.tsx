import React from 'react'
import { Link } from 'react-router-dom'

export const Homepage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-700 pb-6">
        <h1 className="text-3xl font-bold text-white">Dytallix</h1>
        <p className="mt-2 text-gray-400">
          Quantum-Safe, AI-Enhanced, Future-Ready.
        </p>
      </div>

      {/* Hero Content */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">What is Dytallix</h2>
        <div>
          <p className="text-lg text-gray-300">
            Dytallix is a next-generation cryptocurrency architected for resilience against quantum computing threats. It integrates <strong>Post-Quantum Cryptography (PQC)</strong> standards such as CRYSTALS-Dilithium, Falcon, and SPHINCS+ with advanced <strong>Artificial Intelligence</strong> to secure digital assets, smart contracts, and decentralized identities through cryptographic agility and adaptive threat detection.
          </p>
        </div>
      </div>

      {/* Problem Statement */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">Crypto's Quantum Problem</h2>
        <div className="space-y-3 text-gray-300">
          <p>• Most cryptocurrencies rely on classical cryptographic primitives (ECDSA, RSA, SHA-2) that are vulnerable to Shor's and Grover's quantum algorithms</p>
          <p>• Quantum adversaries could exploit these vulnerabilities to reconstruct private keys, enabling mass theft and unauthorized contract execution</p>
          <p>• Quantum attacks have the potential to irreversibly compromise blockchain integrity, consensus, and immutability within hours</p>
        </div>
      </div>

      {/* Solution */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">How Dytallix Solves It</h2>
        <div className="space-y-3 text-gray-300">
          <p><strong>Quantum-Safe Security:</strong> Implements NIST-approved PQC algorithms (Dilithium, Falcon, SPHINCS+) for digital signatures and key exchange, ensuring resistance to both classical and quantum attacks</p>
          <p><strong>AI-Driven Protection:</strong> Employs machine learning for real-time anomaly detection, on-chain fraud analytics, and automated smart contract auditing to proactively mitigate evolving threats</p>
          <p><strong>Future-Resilient:</strong> Features a modular, crypto-agile architecture supporting seamless algorithm upgrades and integration of emerging cryptographic primitives as new standards evolve</p>
        </div>
      </div>

      {/* Platform Features */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">Platform Features</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Link to="/wallet" className="block p-3 rounded hover:bg-gray-700 transition-colors group">
              <h4 className="font-semibold text-blue-400 group-hover:text-blue-300 mb-1">
                Digital Wallet →
              </h4>
              <p className="text-gray-400 text-sm">
                Secure quantum-resistant wallet for managing your digital assets
              </p>
            </Link>
            
            <Link to="/explorer" className="block p-3 rounded hover:bg-gray-700 transition-colors group">
              <h4 className="font-semibold text-purple-400 group-hover:text-purple-300 mb-1">
                Blockchain Explorer →
              </h4>
              <p className="text-gray-400 text-sm">
                Explore transactions, blocks, and network activity in real-time
              </p>
            </Link>
            
            <Link to="/analytics" className="block p-3 rounded hover:bg-gray-700 transition-colors group">
              <h4 className="font-semibold text-cyan-400 group-hover:text-cyan-300 mb-1">
                Analytics Dashboard →
              </h4>
              <p className="text-gray-400 text-sm">
                Advanced market analytics and trading insights
              </p>
            </Link>
          </div>
          
          <div className="space-y-3">
            <Link to="/contracts" className="block p-3 rounded hover:bg-gray-700 transition-colors group">
              <h4 className="font-semibold text-green-400 group-hover:text-green-300 mb-1">
                Smart Contracts →
              </h4>
              <p className="text-gray-400 text-sm">
                Deploy and interact with quantum-safe smart contracts
              </p>
            </Link>
            
            <Link to="/tokenomics" className="block p-3 rounded hover:bg-gray-700 transition-colors group">
              <h4 className="font-semibold text-yellow-400 group-hover:text-yellow-300 mb-1">
                Tokenomics →
              </h4>
              <p className="text-gray-400 text-sm">
                Understand DGT/DRT dual-token economics and governance
              </p>
            </Link>
            
            <Link to="/settings" className="block p-3 rounded hover:bg-gray-700 transition-colors group">
              <h4 className="font-semibold text-gray-400 group-hover:text-gray-300 mb-1">
                Settings →
              </h4>
              <p className="text-gray-400 text-sm">
                Configure your account and security preferences
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <Link 
          to="/dashboard"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition-colors"
        >
          View Dashboard
        </Link>
        <Link 
          to="/wallet"
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-white transition-colors"
        >
          Open Wallet
        </Link>
        <Link 
          to="/explorer"
          className="px-6 py-3 border border-blue-500 hover:bg-blue-500/10 rounded-lg font-semibold text-blue-400 transition-colors"
        >
          Explore Blockchain
        </Link>
      </div>

      {/* Contact */}
      <div className="text-center text-gray-400 text-sm">
        <p className="mb-2">
          Interested in partnering to build, promote, or work with us?
        </p>
        <a href="mailto:hello@dytallix.com" className="text-blue-400 hover:text-blue-300 transition-colors">
          hello@dytallix.com
        </a>
        <p className="mt-4">
          © 2025 Dytallix. Quantum-Safe, AI-Enhanced, Future-Ready.
        </p>
      </div>
    </div>
  )
}
