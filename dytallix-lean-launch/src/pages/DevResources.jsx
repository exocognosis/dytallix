import React from 'react'
import { Link } from 'react-router-dom'

const DevResources = () => {
  const resources = [
    {
      category: "Development Tools",
      items: [
        {
          title: "Dytallix SDK",
          description: "Complete software development kit for building on Dytallix",
          link: "https://github.com/dytallix/sdk",
          type: "GitHub"
        },
        {
          title: "CLI Tools",
          description: "Command-line interface for interacting with the blockchain",
          link: "https://github.com/dytallix/cli",
          type: "GitHub"
        },
        {
          title: "Smart Contract Templates",
          description: "Pre-built contract templates for common use cases",
          link: "https://github.com/dytallix/contracts",
          type: "GitHub"
        },
        {
          title: "API Documentation",
          description: "Complete REST API reference and GraphQL endpoints",
          link: "https://docs.dytallix.com/api",
          type: "Documentation"
        }
      ]
    },
    {
      category: "Testing & Debugging",
      items: [
        {
          title: "Testnet Explorer",
          description: "Block explorer for the Dytallix testnet",
          link: "https://testnet.dytallix.com",
          type: "Tool"
        },
        {
          title: "Faucet",
          description: "Get test tokens for development and testing",
          link: "/faucet",
          type: "Internal"
        },
        {
          title: "Test Suite",
          description: "Comprehensive testing framework for smart contracts",
          link: "https://github.com/dytallix/test-suite",
          type: "GitHub"
        },
        {
          title: "Debugging Tools",
          description: "Debug smart contracts and transaction execution",
          link: "https://github.com/dytallix/debugger",
          type: "GitHub"
        }
      ]
    },
    {
      category: "Community & Support",
      items: [
        {
          title: "Discord Server",
          description: "Join our developer community for support and discussions",
          link: "https://discord.gg/dytallix",
          type: "Community"
        },
        {
          title: "Developer Forum",
          description: "Ask questions and share knowledge with other developers",
          link: "https://forum.dytallix.com",
          type: "Community"
        },
        {
          title: "GitHub Organization",
          description: "Main repository with all open-source projects",
          link: "https://github.com/dytallix",
          type: "GitHub"
        },
        {
          title: "Bug Bounty Program",
          description: "Report security vulnerabilities and earn rewards",
          link: "https://bounty.dytallix.com",
          type: "Program"
        }
      ]
    },
    {
      category: "Learning Resources",
      items: [
        {
          title: "Getting Started Guide",
          description: "Step-by-step tutorial for new developers",
          link: "https://docs.dytallix.com/getting-started",
          type: "Documentation"
        },
        {
          title: "Video Tutorials",
          description: "Video series covering blockchain development basics",
          link: "https://youtube.com/dytallix",
          type: "Video"
        },
        {
          title: "Example Projects",
          description: "Sample applications built on Dytallix",
          link: "https://github.com/dytallix/examples",
          type: "GitHub"
        },
        {
          title: "Whitepaper",
          description: "Technical whitepaper explaining our architecture",
          link: "https://dytallix.com/whitepaper.pdf",
          type: "PDF"
        }
      ]
    }
  ]

  const getTypeColor = (type) => {
    switch (type) {
      case 'GitHub': return { bg: '#f6f8fa', text: '#24292f', border: '#d1d9e0' }
      case 'Documentation': return { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' }
      case 'Tool': return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' }
      case 'Community': return { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' }
      case 'Program': return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
      case 'Video': return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' }
      case 'PDF': return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
      case 'Internal': return { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' }
      default: return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
    }
  }

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">Developer Resources</h1>
          <p className="section-subtitle">
            Everything you need to start building on the Dytallix blockchain platform
          </p>
        </div>

        <div style={{ display: 'grid', gap: '48px' }}>
          {resources.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h2 style={{ 
                fontSize: '2rem', 
                fontWeight: '600', 
                marginBottom: '32px',
                color: '#1f2937',
                textAlign: 'center'
              }}>
                {category.category}
              </h2>
              
              <div className="grid grid-2">
                {category.items.map((item, itemIndex) => {
                  const colors = getTypeColor(item.type)
                  const isInternalLink = item.type === 'Internal'
                  
                  const CardContent = () => (
                    <div className="card" style={{ height: '100%', cursor: 'pointer' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '16px'
                      }}>
                        <h3 style={{ 
                          fontSize: '1.25rem', 
                          fontWeight: '600', 
                          color: '#1f2937',
                          margin: 0
                        }}>
                          {item.title}
                        </h3>
                        
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          border: `1px solid ${colors.border}`,
                          flexShrink: 0,
                          marginLeft: '12px'
                        }}>
                          {item.type}
                        </span>
                      </div>
                      
                      <p style={{ 
                        color: '#6b7280',
                        lineHeight: '1.6',
                        margin: '0 0 16px 0'
                      }}>
                        {item.description}
                      </p>
                      
                      <div style={{ 
                        marginTop: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#3b82f6',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {isInternalLink ? 'Learn more' : 'Visit resource'} →
                      </div>
                    </div>
                  )

                  return (
                    <div key={itemIndex}>
                      {isInternalLink ? (
                        <Link to={item.link} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <CardContent />
                        </Link>
                      ) : (
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <CardContent />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Start Section */}
        <div className="card" style={{ marginTop: '60px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '24px', color: '#1f2937' }}>
            Quick Start Guide
          </h2>
          
          <p style={{ 
            fontSize: '1.125rem', 
            color: '#6b7280', 
            marginBottom: '32px',
            maxWidth: '600px',
            margin: '0 auto 32px auto',
            lineHeight: '1.6'
          }}>
            Ready to start building? Follow these steps to get up and running with Dytallix development.
          </p>
          
          <div style={{ 
            display: 'grid', 
            gap: '24px',
            textAlign: 'left',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: '16px',
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                fontSize: '1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                flexShrink: 0
              }}>
                1
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Get Test Tokens</h3>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  Visit our <Link to="/faucet" style={{ color: '#3b82f6', textDecoration: 'none' }}>faucet</Link> to 
                  get DYTX test tokens for development and testing.
                </p>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '16px',
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                fontSize: '1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                flexShrink: 0
              }}>
                2
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Install the SDK</h3>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  <code style={{ backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                    npm install @dytallix/sdk
                  </code>
                </p>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '16px',
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                fontSize: '1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                flexShrink: 0
              }}>
                3
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Explore Examples</h3>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  Check out our example projects and tutorials to learn best practices and common patterns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DevResources