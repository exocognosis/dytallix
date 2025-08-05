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
      case 'completed': return { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' }
      case 'in-progress': return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
      case 'planned': return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
      default: return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
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
              left: '24px',
              top: '60px',
              bottom: '60px',
              width: '2px',
              background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6)',
              zIndex: 1
            }}></div>

            <div style={{ display: 'grid', gap: '48px' }}>
              {roadmapItems.map((item, index) => {
                const colors = getStatusColor(item.status)
                return (
                  <div key={index} style={{ position: 'relative', display: 'flex', gap: '32px' }}>
                    {/* Timeline dot */}
                    <div style={{
                      position: 'relative',
                      zIndex: 2,
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: colors.bg,
                      border: `3px solid ${colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      flexShrink: 0
                    }}>
                      {getStatusIcon(item.status)}
                    </div>

                    {/* Content */}
                    <div className="card" style={{ flex: 1, marginTop: '8px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <h2 style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: '600', 
                          color: '#1f2937',
                          margin: 0
                        }}>
                          {item.phase}
                        </h2>
                        
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{
                            padding: '4px 12px',
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderRadius: '16px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            border: `1px solid ${colors.border}`,
                            textTransform: 'capitalize'
                          }}>
                            {item.status.replace('-', ' ')}
                          </span>
                          
                          <span style={{
                            padding: '4px 12px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            borderRadius: '16px',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                          }}>
                            {item.quarter}
                          </span>
                        </div>
                      </div>

                      <ul style={{ 
                        margin: 0, 
                        paddingLeft: '20px',
                        display: 'grid',
                        gap: '8px'
                      }}>
                        {item.items.map((task, taskIndex) => (
                          <li key={taskIndex} style={{ 
                            color: '#6b7280',
                            lineHeight: '1.5'
                          }}>
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

          <div className="card" style={{ marginTop: '60px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>
              Key Milestones
            </h2>
            
            <div className="grid grid-2" style={{ gap: '24px' }}>
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f0f9ff', 
                borderRadius: '12px',
                border: '1px solid #bae6fd'
              }}>
                <h3 style={{ color: '#0369a1', marginBottom: '12px', fontSize: '1.125rem' }}>
                  🎯 Testnet Milestone
                </h3>
                <p style={{ color: '#0c4a6e', margin: 0, lineHeight: '1.5' }}>
                  Successfully deployed and tested post-quantum cryptographic functions 
                  with AI-enhanced security monitoring.
                </p>
              </div>
              
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#fef3c7', 
                borderRadius: '12px',
                border: '1px solid #fcd34d'
              }}>
                <h3 style={{ color: '#92400e', marginBottom: '12px', fontSize: '1.125rem' }}>
                  🚀 Current Focus
                </h3>
                <p style={{ color: '#78350f', margin: 0, lineHeight: '1.5' }}>
                  Building advanced smart contract capabilities and cross-chain 
                  interoperability for the ecosystem.
                </p>
              </div>
              
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#f0fdf4', 
                borderRadius: '12px',
                border: '1px solid #bbf7d0'
              }}>
                <h3 style={{ color: '#166534', marginBottom: '12px', fontSize: '1.125rem' }}>
                  🔮 Vision 2025
                </h3>
                <p style={{ color: '#14532d', margin: 0, lineHeight: '1.5' }}>
                  Become the leading post-quantum blockchain platform with 
                  AI-powered security and enterprise adoption.
                </p>
              </div>
              
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#faf5ff', 
                borderRadius: '12px',
                border: '1px solid #d8b4fe'
              }}>
                <h3 style={{ color: '#6b21a8', marginBottom: '12px', fontSize: '1.125rem' }}>
                  🌍 Long-term Goal
                </h3>
                <p style={{ color: '#581c87', margin: 0, lineHeight: '1.5' }}>
                  Establish global quantum-safe blockchain infrastructure 
                  for the next generation of digital assets.
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