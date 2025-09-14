import React from 'react'
import '../styles/global.css'

const Roadmap = () => {
  const roadmapItems = [
    {
      phase: "Phase 1: Foundation",
      status: "completed",
      quarter: "Q4 2025",
      items: [
        "Core blockchain architecture implementation",
        "Post-quantum cryptographic integration",
        "Basic consensus mechanism deployment",
        "Initial testnet launch"
      ]
    },
    {
      phase: "Phase 2: AI Integration",
      status: "in-progress",
      quarter: "Q4 2025",
      items: [
        "AI anomaly detection system",
        "Smart contract security scanner",
        "Network optimization algorithms",
        "Developer tools and SDK"
      ]
    },
    {
      phase: "Phase 3: Enhancement",
      status: "in-progress",
      quarter: "Q1 2026",
      items: [
        "Advanced smart contract capabilities",
        "Cross-chain bridge development",
        "Enhanced AI modules",
        "Performance optimizations"
      ]
    },
    {
      phase: "Phase 4: Ecosystem",
      status: "planned",
      quarter: "Q2 2026",
      items: [
        "DeFi protocol integrations",
        "NFT marketplace support",
        "Governance token launch",
        "Community incentive programs"
      ]
    },
    {
      phase: "Phase 5: Mainnet",
      status: "planned",
      quarter: "Q2 2026",
      items: [
        "Mainnet launch preparation",
        "Security audits completion",
        "Token migration tools",
        "Production monitoring systems"
      ]
    },
    {
      phase: "Phase 6: Growth",
      status: "planned",
      quarter: "Q3-4 2026",
      items: [
        "Enterprise partnerships",
        "Layer 2 scaling solutions",
        "Advanced AI features",
        "Global expansion initiatives"
      ]
    }
  ]

  // Helpers: match Home.jsx accent color usage
  const colorFor = (accent) => {
    switch (accent) {
      case 'primary': return 'var(--primary-400)'
      case 'accent': return 'var(--accent-500)'
      case 'success': return 'var(--success-500)'
      case 'warning': return 'var(--warning-500)'
      case 'danger': return 'var(--danger-500)'
      case 'info':
      default: return 'var(--primary-400)'
    }
  }

  const hueForStatus = (status) => {
    if (status === 'completed') return 'success'
    if (status === 'in-progress') return 'warning'
    return 'primary' // planned
  }

  const statusPill = (status) => {
    const map = {
      completed: { bg: 'rgba(16,185,129,0.12)', bd: 'rgba(16,185,129,0.28)', fg: '#86EFAC', label: 'Completed' },
      'in-progress': { bg: 'rgba(245,158,11,0.12)', bd: 'rgba(245,158,11,0.28)', fg: '#FCD34D', label: 'In Progress' },
      planned: { bg: 'rgba(243,244,246,0.06)', bd: 'rgba(209,213,219,0.12)', fg: '#E5E7EB', label: 'Planned' },
    }
    const s = map[status] || map.planned
    return (
      <span style={{ padding: '4px 10px', borderRadius: 14, fontSize: '0.85rem', fontWeight: 700, background: s.bg, border: `1px solid ${s.bd}`, color: s.fg }}>
        {s.label}
      </span>
    )
  }

  const statusIcon = (status) => status === 'completed' ? '✅' : status === 'in-progress' ? '🚧' : '📋'

  return (
    <div className="roadmap">
      {/* Hero Section to match Home */}
      <section className="section" style={{
        background: 'radial-gradient(800px 400px at 50% -10%, rgba(96,165,250,0.12) 0%, rgba(96,165,250,0) 60%)',
        paddingTop: '120px',
      }}>
        <div className="container center">
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <h1 className="section-title" style={{ fontSize: '3rem', marginBottom: 12, textAlign: 'center', lineHeight: 1.15 }}>
              Development Roadmap
            </h1>
            <p className="muted" style={{ fontSize: '1.125rem', margin: '0 auto 0', textAlign: 'center' }}>
              Our strategic plan for building the future of post-quantum blockchain technology.
            </p>
            <p className="muted" style={{ fontSize: '1.125rem', margin: '0 auto 36px', textAlign: 'center' }}>
              Track progress across foundation, AI integration, ecosystem, and mainnet.
            </p>
          </div>
        </div>
      </section>

      {/* Roadmap Phases (Home-style card grid with accent top borders) */}
      <section className="section">
        <div className="container">
          {/* Removed local section header as requested */}
          <div className="grid" style={{ alignItems: 'stretch', display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {roadmapItems.map((item, index) => (
              <div key={index} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderTop: `3px solid ${colorFor(hueForStatus(item.status))}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: colorFor(hueForStatus(item.status)) }}>
                    {statusIcon(item.status)} {item.phase}
                  </h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {statusPill(item.status)}
                    <span style={{ padding: '4px 10px', background: 'rgba(241,245,249,0.06)', color: '#93A3B7', borderRadius: 14, fontSize: '0.85rem', fontWeight: 700 }}>
                      {item.quarter}
                    </span>
                  </div>
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
                  {item.items.map((task, taskIndex) => (
                    <li key={taskIndex} className="muted" style={{ lineHeight: 1.6 }}>
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Milestones (accent-tinted cards) */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Key Milestones</h2>
            <p className="section-subtitle" style={{ textAlign: 'center', margin: '0 auto' }}>
              High-impact deliverables on the path to mainnet.
            </p>
          </div>

          <div className="grid" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div className="card" style={{ borderTop: `3px solid ${colorFor('primary')}`, background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }}>
              <h3 style={{ color: '#93C5FD', marginBottom: 8, fontSize: '1.05rem' }}>🎯 Testnet Milestone</h3>
              <p className="muted" style={{ margin: 0 }}>Successfully deployed and tested post-quantum cryptographic functions with AI-enhanced security monitoring.</p>
            </div>
            <div className="card" style={{ borderTop: `3px solid ${colorFor('warning')}`, background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.28)' }}>
              <h3 style={{ color: '#FCD34D', marginBottom: 8, fontSize: '1.05rem' }}>🚀 Current Focus</h3>
              <p className="muted" style={{ margin: 0 }}>Building advanced smart contract capabilities and cross-chain interoperability for the ecosystem.</p>
            </div>
            <div className="card" style={{ borderTop: `3px solid ${colorFor('success')}`, background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.28)' }}>
              <h3 style={{ color: '#86EFAC', marginBottom: 8, fontSize: '1.05rem' }}>🔮 Vision 2025</h3>
              <p className="muted" style={{ margin: 0 }}>Become the leading post-quantum blockchain platform with AI-powered security and enterprise adoption.</p>
            </div>
            <div className="card" style={{ borderTop: `3px solid ${colorFor('accent')}`, background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.28)' }}>
              <h3 style={{ color: '#C4B5FD', marginBottom: 8, fontSize: '1.05rem' }}>🌍 Long-term Goal</h3>
              <p className="muted" style={{ margin: 0 }}>Establish global quantum-safe blockchain infrastructure for the next generation of digital assets.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Module Status (badges inside accent-top card) */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="card" style={{ borderTop: `3px solid ${colorFor('primary')}` }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 12, color: colorFor('primary') }}>Module Status</h2>
            {(() => {
              const modules = [
                { name: 'Governance (read-only)', status: 'Live', color: '#86EFAC' },
                { name: 'Staking (queries only)', status: 'Live', color: '#86EFAC' },
                { name: 'Oracle Indicators', status: 'Live', color: '#86EFAC' },
                { name: 'Contracts', status: 'Stub', color: '#FCD34D' },
                { name: 'Advanced Contracts', status: 'Next', color: '#93C5FD' }
              ]
              const firstRow = modules.slice(0, 3)
              const secondRow = modules.slice(3)
              const badgeStyle = {
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 9999,
                background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.22)'
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {firstRow.map(m => (
                      <div key={m.name} style={badgeStyle}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                        <span style={{ fontWeight: 700 }}>{m.name}</span>
                        <span className="muted" style={{ fontSize: '0.85rem' }}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {secondRow.map(m => (
                      <div key={m.name} style={badgeStyle}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color }} />
                        <span style={{ fontWeight: 700 }}>{m.name}</span>
                        <span className="muted" style={{ fontSize: '0.85rem' }}>{m.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
            <div className="muted" style={{ marginTop: 8, fontSize: '0.9rem', textAlign: 'center' }}>
              Governance and staking transactions are flag-gated. Queries remain available by design.
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Roadmap
