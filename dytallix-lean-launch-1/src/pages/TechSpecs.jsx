import React from 'react'

const TechSpecs = () => {
  const specifications = [
    {
      category: 'Consensus Mechanism',
      specs: [
        { label: 'Algorithm', value: 'Proof of Stake (PoS) with Byzantine Fault Tolerance' },
        { label: 'Block Time', value: '~50ms average' },
        { label: 'Finality', value: 'Instant finality with >67% validator consensus' },
        { label: 'Validators', value: 'Up to 1000 active validators' }
      ]
    },
    {
      category: 'Post-Quantum Cryptography',
      specs: [
        { label: 'Digital Signatures', value: 'CRYSTALS-Dilithium (NIST PQC Standard)' },
        { label: 'Key Encapsulation', value: 'CRYSTALS-KYBER (NIST PQC Standard)' },
        { label: 'Hash Function', value: 'BLAKE3 with SHA-3 fallback' },
        { label: 'Quantum Resistance', value: '256-bit post-quantum security level' }
      ]
    },
    {
      category: 'Performance',
      specs: [
        { label: 'Throughput', value: 'Up to 10,000 TPS' },
        { label: 'Transaction Fee', value: '0.001 DYTX (adjustable)' },
        { label: 'Smart Contract VM', value: 'WebAssembly (WASM) based' },
        { label: 'Storage', value: 'Merkle Patricia Trie with compression' }
      ]
    },
    {
      category: 'AI Integration',
      specs: [
        { label: 'Anomaly Detection', value: 'Real-time transaction pattern analysis' },
        { label: 'Contract Analysis', value: 'Automated vulnerability scanning' },
        { label: 'Network Optimization', value: 'ML-based parameter tuning' },
        { label: 'Threat Prevention', value: '99.9% malicious activity detection' }
      ]
    }
  ]

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">Technical Specifications</h1>
          <p className="section-subtitle">
            Deep dive into the technical architecture and capabilities of the Dytallix blockchain
          </p>
        </div>

        <div className="grid grid-2">
          {specifications.map((category, index) => (
            <div key={index} className="card">
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
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>
            Architecture Overview
          </h2>
          <div style={{ display: 'grid', gap: 16 }}>
            <p className="muted" style={{ lineHeight: 1.7 }}>
              Dytallix is built on a modular architecture that separates concerns between consensus,
              execution, and data availability layers. This design allows for maximum flexibility
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
      </div>
    </div>
  )
}

export default TechSpecs