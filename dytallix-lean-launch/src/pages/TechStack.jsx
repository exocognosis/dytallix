import React from 'react'
import '../styles/global.css'

const TechStack = () => {
  const specifications = [
    {
      category: 'Consensus Mechanism',
      accent: 'primary',
      specs: [
        { label: 'Algorithm', value: 'Proof of Stake (PoS) with Byzantine Fault Tolerance' },
        { label: 'Block Time', value: '~50ms average' },
        { label: 'Finality', value: 'Instant finality with >67% validator consensus' },
        { label: 'Validators', value: 'Up to 1000 active validators' }
      ]
    },
    {
      category: 'Post-Quantum Cryptography',
      accent: 'accent',
      specs: [
        { label: 'Digital Signatures', value: 'CRYSTALS-Dilithium (NIST PQC Standard)' },
        { label: 'Key Encapsulation', value: 'CRYSTALS-KYBER (NIST PQC Standard)' },
        { label: 'Hash Function', value: 'BLAKE3 with SHA-3 fallback' },
        { label: 'Quantum Resistance', value: '256-bit post-quantum security level' }
      ]
    },
    {
      category: 'Performance',
      accent: 'success',
      specs: [
        { label: 'Throughput', value: 'Up to 10,000 TPS' },
        { label: 'Transaction Fee', value: '0.001 DYTX (adjustable)' },
        { label: 'Smart Contract VM', value: 'WebAssembly (WASM) based' },
        { label: 'Storage', value: 'Merkle Patricia Trie with compression' }
      ]
    },
    {
      category: 'AI Integration',
      accent: 'info',
      specs: [
        { label: 'Anomaly Detection', value: 'Real-time transaction pattern analysis' },
        { label: 'Contract Analysis', value: 'Automated vulnerability scanning' },
        { label: 'Network Optimization', value: 'ML-based parameter tuning' },
        { label: 'Threat Prevention', value: '99.9% malicious activity detection' }
      ]
    }
  ]

  const outlineClass = (accent) => `card-outline-${accent}`
  const tintClass = (accent) => `card card-tint-${accent}`

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">Tech Stack</h1>
          <p className="section-subtitle nowrap-full maxw-none">
            Core stack components and performance characteristics of the Dytallix blockchain.
          </p>
        </div>

        {/* KPI overview */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="kpi-grid">
            <div className="kpi-tile">
              <div className="kpi-label">Block Time</div>
              <div className="kpi-value">~50ms</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Finality</div>
              <div className="kpi-value">Instant</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Validators</div>
              <div className="kpi-value">Up to 1000</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Throughput</div>
              <div className="kpi-value">10,000 TPS</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Fee</div>
              <div className="kpi-value">0.001 DYTX</div>
            </div>
            <div className="kpi-tile">
              <div className="kpi-label">Smart Contracts</div>
              <div className="kpi-value">WASM</div>
            </div>
          </div>
        </div>

        {/* Architecture Overview moved ABOVE Stack Components */}
        <div className="card card-outline-primary" style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>
            Architecture Overview
          </h2>
          <div style={{ display: 'grid', gap: 16 }}>
            <p className="muted" style={{ lineHeight: 1.7 }}>
              Dytallix uses a modular design that separates consensus, execution, and data availability layers. This design allows for maximum flexibility
              and upgradeability while maintaining security guarantees.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              <h3 style={{ fontWeight: 700 }}>Core Components:</h3>
              <ul style={{ paddingLeft: 20 }}>
                <li className="muted"><strong style={{ color: 'var(--text-primary)' }}>Consensus Layer:</strong> Byzantine Fault Tolerant PoS with instant finality</li>
                <li className="muted"><strong style={{ color: 'var(--text-primary)' }}>Execution Layer:</strong> WASM-based virtual machine for smart contracts</li>
                <li className="muted"><strong style={{ color: 'var(--text-primary)' }}>Data Layer:</strong> Merkle-compressed state with rollup support</li>
                <li className="muted"><strong style={{ color: 'var(--text-primary)' }}>Network Layer:</strong> LibP2P with custom PQC transport encryption</li>
                <li className="muted"><strong style={{ color: 'var(--text-primary)' }}>AI Layer:</strong> Integrated machine learning for security and optimization</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stack Components (for developers) */}
        <div className="card card-outline-accent" style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>Stack Components</h2>
          <div className="grid grid-3">
            <div className="card card-outline-primary">
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Consensus & Execution</h3>
              <ul style={{ paddingLeft: 18 }}>
                <li className="muted">BFT Proof of Stake with instant finality</li>
                <li className="muted">WASM-based smart contract runtime</li>
                <li className="muted">EVM compatibility for portability</li>
              </ul>
            </div>

            <div className="card card-outline-accent">
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Cryptography</h3>
              <ul style={{ paddingLeft: 18 }}>
                <li className="muted">CRYSTALS-Dilithium & Falcon signatures</li>
                <li className="muted">CRYSTALS-Kyber key exchange</li>
                <li className="muted">BLAKE3 with SHA-3 fallback</li>
                <li className="muted">Crypto-agile upgrades</li>
              </ul>
            </div>

            <div className="card card-outline-info">
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Networking</h3>
              <ul style={{ paddingLeft: 18 }}>
                <li className="muted">libp2p with PQC transport encryption</li>
                <li className="muted">Gossip-based mempool</li>
                <li className="muted">QUIC where available</li>
              </ul>
            </div>

            <div className="card card-outline-warning">
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Data & Storage</h3>
              <ul style={{ paddingLeft: 18 }}>
                <li className="muted">Merkle Patricia Trie with compression</li>
                <li className="muted">Rollup-friendly state & snapshots</li>
                <li className="muted">Pruning and checkpointing</li>
              </ul>
            </div>

            <div className="card card-outline-success">
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>AI / ML</h3>
              <ul style={{ paddingLeft: 18 }}>
                <li className="muted">Python services (TensorFlow/PyTorch)</li>
                <li className="muted">On-chain anomaly detection</li>
                <li className="muted">Contract static analysis</li>
              </ul>
            </div>

            <div className="card card-outline-primary">
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Tooling & SDKs</h3>
              <ul style={{ paddingLeft: 18 }}>
                <li className="muted">TypeScript SDK & CLI</li>
                <li className="muted">Hardhat/Foundry configs</li>
                <li className="muted">Explorer, Faucet, Wallet</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Detailed categories with accents */}
        <div className="grid grid-2x2">
          {specifications.map((category, index) => (
            <div key={index} className={`card ${outlineClass(category.accent)}`}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>
                {category.category}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {category.specs.map((spec, specIndex) => (
                  <div key={specIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <span style={{ fontWeight: 600 }}>
                      {spec.label}:
                    </span>
                    <span className="muted" style={{ textAlign: 'right', fontSize: '0.95rem', lineHeight: 1.5 }}>
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
              {/* nested highlight example */}
              <div className={tintClass(category.accent)} style={{ marginTop: 12 }}>
                <strong className="muted" style={{ fontSize: '0.9rem' }}>Note:</strong>
                <p className="muted" style={{ marginTop: 4, fontSize: '0.9rem' }}>
                  Specifications are subject to change as we iterate on performance and security.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TechStack
