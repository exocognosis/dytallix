import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/global.css'



const Home = () => {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="section" style={{
        background: 'radial-gradient(800px 400px at 50% -10%, rgba(96,165,250,0.12) 0%, rgba(96,165,250,0) 60%)',
        paddingTop: '120px',
      }}>
        <div className="container center">
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h1 className="section-title" style={{ fontSize: '3rem', marginBottom: 16, whiteSpace: 'nowrap' }}>
              Quantum-Secure. AI-Enhanced. Future-Ready.
            </h1>
            <p className="muted" style={{ fontSize: '1.125rem', margin: '0 auto 0', textAlign: 'center', whiteSpace: 'nowrap' }}>
              Dytallix is an L1 blockchain platform and post-quantum cryptocurrency, built from the ground up
            </p>
            <p className="muted" style={{ fontSize: '1.125rem', margin: '0 auto 36px', textAlign: 'center', whiteSpace: 'nowrap' }}>
              to resist quantum attacks and support secure, intelligent applications.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Updated hero buttons */}
              <Link to="/faucet" className="btn btn-primary glow">Join the Testnet</Link>
              <a
                href="https://discord.gg/dytallix"
                className="btn btn-primary glow"
                target="_blank"
                rel="noopener noreferrer"
              >
                Join the Discord
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why Dytallix? Section (inserted) */}
      <section className="section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <h2 className="section-title">Why Dytallix?</h2>
            <p className="section-subtitle" style={{ maxWidth: 900, margin: '0 auto 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
              Dytallix is built to meet the quantum threat. We secure digital assets with post-quantum
            </p>
            <p className="section-subtitle" style={{ maxWidth: 900, margin: '0 auto 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
              cryptography, zero-knowledge privacy, and decentralized AI governance.
            </p>
            <p className="section-subtitle" style={{ maxWidth: 900, margin: '0 auto', fontWeight: 600 }}>
              Our mission is to evolve blockchain before it is outpaced by the future.
            </p>
          </div>

          {/* Ensure equal-height cards and center content */}
          <div className="grid grid-3" style={{ alignItems: 'stretch' }}>
            {/* Card 1 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: 10, textAlign: 'center' }}>🛡️</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>Quantum-Resistant Future</h3>
                <p className="muted" style={{ lineHeight: 1.6, marginBottom: 12 }}>
                  The quantum threat is real. Dytallix implements NIST-approved post-quantum cryptography today
                  to secure assets before legacy encryption fails.
                </p>
                <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                  {[
                    'Dilithium & Falcon signatures',
                    'SPHINCS+ quantum-secure hashing',
                    'PQC key exchange',
                    'Crypto-agile architecture',
                  ].map((t, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
                      <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%' }} />
                      <span className="muted">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0 10px' }} />
              <div style={{ color: 'var(--primary-400)', fontWeight: 700 }}>Quantum attack resistance</div>
            </div>

            {/* Card 2 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: 10, textAlign: 'center' }}>🧠</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>On-Chain AI Intelligence</h3>
                <p className="muted" style={{ lineHeight: 1.6, marginBottom: 12 }}>
                  Enterprise-ready AI modules run directly on chain, enabling autonomous threat detection, smart contract auditing, and predictive analytics without centralized control.
                </p>
                <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                  {[
                    'Real-time anomaly detection',
                    'Automated smart contract audits',
                    'Predictive market analytics',
                    'Decentralized AI governance',
                  ].map((t, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
                      <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%' }} />
                      <span className="muted">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0 10px' }} />
              <div style={{ color: 'var(--primary-400)', fontWeight: 700 }}>Autonomous AI modules</div>
            </div>

            {/* Card 3 */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: 10, textAlign: 'center' }}>⚡</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>Uncompromising Security</h3>
                <p className="muted" style={{ lineHeight: 1.6, marginBottom: 12 }}>
                  Zero-knowledge proofs, multi-signature wallets, and hardware security modules combine to
                  protect your digital assets with enterprise-grade assurance.
                </p>
                <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                  {[
                    'Zero-knowledge privacy',
                    'Multi-signature protection',
                    'Hardware security integration',
                    'Advanced threat monitoring',
                  ].map((t, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
                      <span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: '50%' }} />
                      <span className="muted">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '12px 0 10px' }} />
              <div style={{ color: 'var(--primary-400)', fontWeight: 700 }}>Military-grade encryption</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Key Features</h2>
            <p className="section-subtitle" style={{ textAlign: 'center', whiteSpace: 'nowrap', margin: '0 auto 6px' }}>
              Engineered for the quantum era with next-gen security, AI-driven
            </p>
            <p className="section-subtitle" style={{ textAlign: 'center', whiteSpace: 'nowrap', margin: '0 auto' }}>
              defense and enterprise-grade performance.
            </p>
          </div>

          <div className="grid grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              {
                icon: '🛡️',
                title: 'Post-Quantum Security',
                desc: 'NIST-approved PQC algorithms (Dilithium, Falcon, SPHINCS+) secure every layer: consensus, transactions, and contracts.'
              },
              {
                icon: '🤖',
                title: 'AI-Enhanced Protection',
                desc: 'On-chain AI monitors transactions, detects anomalies, and audits smart contracts in real time.'
              },
              {
                icon: '⚡',
                title: 'High-Performance Consensus',
                desc: 'Quantum-Proof Delegated Proof of Stake delivers fast finality and optimized throughput without sacrificing security.'
              },
              {
                icon: '🔗',
                title: 'Cross-Chain Interoperability',
                desc: 'A modular, crypto-agile bridge connects Dytallix with other blockchains and supports seamless algorithm upgrades.'
              },
              {
                icon: '🧩',
                title: 'Developer-Ready Architecture',
                desc: 'EVM compatibility and migration tools let teams port existing dApps with minimal changes.'
              },
              {
                icon: '🏛',
                title: 'Governance & Tokenomics',
                desc: 'Dual-token design: DGT for governance and DRT for rewards. Deflationary mechanics align incentives.'
              }
            ].map((f, i) => (
              <div className="card" key={i}>
                <div style={{ fontSize: 32, marginBottom: 16, textAlign: 'center' }}>{f.icon}</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p className="muted" style={{ lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Started Section */}
      <section className="section" style={{ background: 'radial-gradient(700px 300px at 50% -10%, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0) 60%)' }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center' }}>
            <h2 className="section-title">Ready to Build on Dytallix?</h2>
            <p className="section-subtitle" style={{ maxWidth: 900, margin: '0 auto' }}>
              Spin up a wallet, claim test tokens, and deploy a contract on the Dytallix testnet.
            </p>
          </div>

          <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {/* Step 1 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-400)', color: '#0b1220', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Create or Connect Wallet</h3>
              </div>
              <p className="muted" style={{ marginBottom: 12 }}>Use the quantum-secure wallet to generate keys and manage addresses.</p>
              <div><Link to="/wallet" className="btn btn-primary">Open Wallet</Link></div>
            </div>

            {/* Step 2 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-400)', color: '#0b1220', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Get Test Tokens</h3>
              </div>
              <p className="muted" style={{ marginBottom: 12 }}>Request DGT or DRT from the faucet to fund transactions and deployments.</p>
              <div><Link to="/faucet" className="btn btn-primary">Open Faucet</Link></div>
            </div>

            {/* Step 3 */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-400)', color: '#0b1220', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Deploy and Explore</h3>
              </div>
              <p className="muted" style={{ marginBottom: 12 }}>Deploy a contract and watch transactions in real time with the explorer.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to="/contracts" className="btn btn-primary glow">Contracts</Link>
                <Link to="/explorer" className="btn btn-primary glow">Explorer</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home