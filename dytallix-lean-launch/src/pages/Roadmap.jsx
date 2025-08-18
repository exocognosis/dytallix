import React from 'react'

const Roadmap = () => {
  const roadmapItems = [
    {
      phase: "Phase 1: Foundation",
      status: "completed",
      quarter: "Q1 2024",
      items: [
        "Core blockchain architecture implementation",
        "Post-quantum cryptographic integration",
        "Basic consensus mechanism deployment",
        "Initial testnet launch"
      ]
    },
    {
      phase: "Phase 2: AI Integration",
      status: "completed",
      quarter: "Q2 2024",
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
      quarter: "Q3 2024",
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
      quarter: "Q4 2024",
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
      quarter: "Q1 2025",
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
      quarter: "Q2 2025",
      items: [
        "Enterprise partnerships",
        "Layer 2 scaling solutions",
        "Advanced AI features",
        "Global expansion initiatives"
      ]
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return { bg: 'rgba(16,185,129,0.12)', text: '#86EFAC', border: 'rgba(16,185,129,0.28)' }
      case 'in-progress': return { bg: 'rgba(245,158,11,0.12)', text: '#FCD34D', border: 'rgba(245,158,11,0.28)' }
      case 'planned': return { bg: 'rgba(243,244,246,0.06)', text: '#E5E7EB', border: 'rgba(209,213,219,0.12)' }
      default: return { bg: 'rgba(243,244,246,0.06)', text: '#E5E7EB', border: 'rgba(209,213,219,0.12)' }
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅'
      case 'in-progress': return '🚧'
      case 'planned': return '📋'
      default: return '📋'
    }
  }

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">Development Roadmap</h1>
          <p className="section-subtitle">
            Our strategic plan for building the future of post-quantum blockchain technology
          </p>
        </div>

        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: 24,
              top: 60,
              bottom: 60,
              width: 2,
              background: 'linear-gradient(to bottom, rgba(59,130,246,0.9), rgba(139,92,246,0.9))',
              zIndex: 1
            }} />

            <div style={{ display: 'grid', gap: 28 }}>
              {roadmapItems.map((item, index) => {
                const colors = getStatusColor(item.status)
                return (
                  <div key={index} style={{ position: 'relative', display: 'flex', gap: 20 }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: 'relative',
                      zIndex: 2,
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      background: colors.bg,
                      border: `2px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0
                    }}>
                      {getStatusIcon(item.status)}
                    </div>

                    {/* Content */}
                    <div className="card" style={{ flex: 1, marginTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                          {item.phase}
                        </h2>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ padding: '4px 10px', background: colors.bg, color: colors.text, borderRadius: 14, fontSize: '0.85rem', fontWeight: 700, border: `1px solid ${colors.border}`, textTransform: 'capitalize' }}>
                            {item.status.replace('-', ' ')}
                          </span>
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
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card" style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 12 }}>
              Key Milestones
            </h2>
            {/* Updated to enforce a 2x2 grid layout */}
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <div className="card" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }}>
                <h3 style={{ color: '#93C5FD', marginBottom: 8, fontSize: '1.05rem' }}>
                  🎯 Testnet Milestone
                </h3>
                <p className="muted" style={{ margin: 0 }}>
                  Successfully deployed and tested post-quantum cryptographic functions with AI-enhanced security monitoring.
                </p>
              </div>
              <div className="card" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.28)' }}>
                <h3 style={{ color: '#FCD34D', marginBottom: 8, fontSize: '1.05rem' }}>
                  🚀 Current Focus
                </h3>
                <p className="muted" style={{ margin: 0 }}>
                  Building advanced smart contract capabilities and cross-chain interoperability for the ecosystem.
                </p>
              </div>
              <div className="card" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.28)' }}>
                <h3 style={{ color: '#86EFAC', marginBottom: 8, fontSize: '1.05rem' }}>
                  🔮 Vision 2025
                </h3>
                <p className="muted" style={{ margin: 0 }}>
                  Become the leading post-quantum blockchain platform with AI-powered security and enterprise adoption.
                </p>
              </div>
              <div className="card" style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.28)' }}>
                <h3 style={{ color: '#C4B5FD', marginBottom: 8, fontSize: '1.05rem' }}>
                  🌍 Long-term Goal
                </h3>
                <p className="muted" style={{ margin: 0 }}>
                  Establish global quantum-safe blockchain infrastructure for the next generation of digital assets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Roadmap