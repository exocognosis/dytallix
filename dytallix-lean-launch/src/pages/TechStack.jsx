import React from 'react'
import { Section, Grid, Card, Stat, StatGrid } from '../components/ui'

const TechStack = () => {
  const colorFor = (accent) => {
    switch (accent) {
      case 'primary': return 'var(--color-primary-400)'
      case 'accent': return 'var(--color-accent-500)'
      case 'success': return 'var(--color-success-500)'
      case 'warning': return 'var(--color-warning-500)'
      case 'danger': return 'var(--color-danger-500)'
      case 'info':
      default: return 'var(--color-primary-400)'
    }
  }

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

  return (
    <Section 
      title="Tech Stack"
      subtitle="Core stack components and performance characteristics of the Dytallix blockchain."
    >
      {/* KPI overview with colored accents */}
      <Card style={{ marginBottom: 24 }}>
        <StatGrid columns={4}>
          <Stat label="Block Time" value="~50ms" />
          <Stat label="Finality" value="Instant" />
          <Stat label="Validators" value="Up to 1000" />
          <Stat label="Throughput" value="10,000 TPS" />
          <Stat label="Fee" value="0.001 DYTX" />
          <Stat label="Smart Contracts" value="WASM" />
        </StatGrid>
      </Card>

      {/* Architecture Overview */}
      <Card accent="primary" borderTop style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16, color: 'var(--color-primary-400)' }}>
          Architecture Overview
        </h2>
        <div style={{ display: 'grid', gap: 16 }}>
          <p className="text-muted" style={{ lineHeight: 1.7 }}>
            Dytallix uses a modular design that separates consensus, execution, and data availability layers. This design allows for maximum flexibility
            and upgradeability while maintaining security guarantees.
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            <h3 style={{ fontWeight: 700 }}>Core Components:</h3>
            <ul style={{ paddingLeft: 20 }}>
              <li className="text-muted"><strong style={{ color: 'var(--color-text-primary)' }}>Consensus Layer:</strong> Byzantine Fault Tolerant PoS with instant finality</li>
              <li className="text-muted"><strong style={{ color: 'var(--color-text-primary)' }}>Execution Layer:</strong> WASM-based virtual machine for smart contracts</li>
              <li className="text-muted"><strong style={{ color: 'var(--color-text-primary)' }}>Data Layer:</strong> Merkle-compressed state with rollup support</li>
              <li className="text-muted"><strong style={{ color: 'var(--color-text-primary)' }}>Network Layer:</strong> LibP2P with custom PQC transport encryption</li>
              <li className="text-muted"><strong style={{ color: 'var(--color-text-primary)' }}>AI Layer:</strong> Integrated machine learning for security and optimization</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Stack Components (for developers) */}
      <Card accent="accent" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16 }}>Stack Components</h2>
        <Grid columns={3}>
          <Card accent="primary" borderTop>
            <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-primary-400)' }}>Consensus & Execution</h3>
            <ul style={{ paddingLeft: 18 }}>
              <li className="text-muted">BFT Proof of Stake with instant finality</li>
              <li className="text-muted">WASM-based smart contract runtime</li>
              <li className="text-muted">EVM compatibility for portability</li>
            </ul>
          </Card>

          <Card accent="accent" borderTop>
            <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-accent-500)' }}>Cryptography</h3>
            <ul style={{ paddingLeft: 18 }}>
              <li className="text-muted">CRYSTALS-Dilithium & Falcon signatures</li>
              <li className="text-muted">CRYSTALS-Kyber key exchange</li>
              <li className="text-muted">BLAKE3 with SHA-3 fallback</li>
              <li className="text-muted">Crypto-agile upgrades</li>
            </ul>
          </Card>

          <Card accent="info" borderTop>
            <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-primary-400)' }}>Networking</h3>
            <ul style={{ paddingLeft: 18 }}>
              <li className="text-muted">libp2p with PQC transport encryption</li>
              <li className="text-muted">Gossip-based mempool</li>
              <li className="text-muted">QUIC where available</li>
            </ul>
          </Card>

          <Card accent="warning" borderTop>
            <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-warning-500)' }}>Data & Storage</h3>
            <ul style={{ paddingLeft: 18 }}>
              <li className="text-muted">Merkle Patricia Trie with compression</li>
              <li className="text-muted">Rollup-friendly state & snapshots</li>
              <li className="text-muted">Pruning and checkpointing</li>
            </ul>
          </Card>

          <Card accent="success" borderTop>
            <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-success-500)' }}>AI / ML</h3>
            <ul style={{ paddingLeft: 18 }}>
              <li className="text-muted">Python services (TensorFlow/PyTorch)</li>
              <li className="text-muted">On-chain anomaly detection</li>
              <li className="text-muted">Contract static analysis</li>
            </ul>
          </Card>

          <Card accent="primary" borderTop>
            <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--color-primary-400)' }}>Tooling & SDKs</h3>
            <ul style={{ paddingLeft: 18 }}>
              <li className="text-muted">TypeScript SDK & CLI</li>
              <li className="text-muted">Hardhat/Foundry configs</li>
              <li className="text-muted">Explorer, Faucet, Wallet</li>
            </ul>
          </Card>
        </Grid>
      </Card>

      {/* Detailed categories with accents */}
      <Grid columns={2}>
        {specifications.map((category, index) => (
          <Card key={index} accent={category.accent} borderTop>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16, color: colorFor(category.accent) }}>
              {category.category}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {category.specs.map((spec, specIndex) => (
                <div key={specIndex} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <span style={{ fontWeight: 600 }}>
                    {spec.label}:
                  </span>
                  <span className="text-muted" style={{ textAlign: 'right', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </Grid>

      {/* Single shared note below the four cards */}
      <Card variant="tinted" className="card-tint-info" style={{ marginTop: 12 }}>
        <strong className="text-muted" style={{ fontSize: '0.9rem' }}>Note:</strong>
        <p className="text-muted" style={{ marginTop: 4, fontSize: '0.9rem' }}>
          Specifications are subject to change as we iterate on performance and security.
        </p>
      </Card>
    </Section>
  )
}

export default TechStack