import React from 'react'
import { Link } from 'react-router-dom'
import { getCosmosConfig } from '../config/cosmos.js'
import { Section, Grid, Card, Badge, StepCard } from '../components/ui'

const DevResources = () => {
  const resources = [
    {
      category: "Development Tools",
      items: [
        { title: "Dytallix SDK", description: "Complete software development kit for building on Dytallix", link: "https://github.com/dytallix/sdk", type: "GitHub" },
        { title: "CLI Tools", description: "Command-line interface for interacting with the blockchain", link: "https://github.com/dytallix/cli", type: "GitHub" },
        { title: "Smart Contract Templates", description: "Pre-built contract templates for common use cases", link: "https://github.com/dytallix/contracts", type: "GitHub" },
        { title: "API Documentation", description: "Complete REST API reference and GraphQL endpoints", link: "/docs", type: "Internal" }
      ]
    },
    {
      category: "Testing & Debugging",
      items: [
        { title: "Testnet Explorer", description: "Block explorer for the Dytallix testnet", link: "https://testnet.dytallix.com", type: "Tool" },
        { title: "Faucet", description: "Get test tokens for development and testing", link: "/faucet", type: "Internal" },
        { title: "Test Suite", description: "Comprehensive testing framework for smart contracts", link: "https://github.com/dytallix/test-suite", type: "GitHub" },
        { title: "Debugging Tools", description: "Debug smart contracts and transaction execution", link: "https://github.com/dytallix/debugger", type: "GitHub" }
      ]
    },
    {
      category: "Community & Support",
      items: [
        { title: "Discord Server", description: "Join our developer community for support and discussions", link: "https://discord.gg/dytallix", type: "Community" },
        { title: "Developer Forum", description: "Ask questions and share knowledge with other developers", link: "https://forum.dytallix.com", type: "Community" },
        { title: "GitHub Organization", description: "Main repository with all open-source projects", link: "https://github.com/HisMadRealm/dytallix", type: "GitHub" },
        { title: "Bug Bounty Program", description: "Report security vulnerabilities and earn rewards", link: "https://bounty.dytallix.com", type: "Program" }
      ]
    },
    {
      category: "Learning Resources",
      items: [
        { title: "Getting Started Guide", description: "Step-by-step tutorial for new developers", link: "/docs", type: "Internal" },
        { title: "Video Tutorials", description: "Video series covering blockchain development basics", link: "https://youtube.com/dytallix", type: "Video" },
        { title: "Example Projects", description: "Sample applications built on Dytallix", link: "https://github.com/HisMadRealm/dytallix/tree/main/examples", type: "GitHub" },
        { title: "Whitepaper", description: "Technical whitepaper explaining our architecture", link: "/whitepaper.pdf", type: "PDF" }
      ]
    },
    {
      category: "Developer Resources",
      items: [
        { title: "GitHub Repository", description: "Main Dytallix repository with source code", link: "https://github.com/HisMadRealm/dytallix", type: "GitHub" },
        { title: "Documentation Root", description: "Complete documentation and guides", link: "/docs", type: "Internal" },
        { title: "Whitepaper PDF", description: "Technical architecture and design whitepaper", link: "/whitepaper.pdf", type: "PDF" },
        { title: "Changelog", description: "Version history and release notes", link: "/changelog", type: "Internal" }
      ]
    }
  ]

  const getBadgeVariant = (type) => {
    const variantMap = {
      GitHub: 'neutral',
      Documentation: 'info',
      Tool: 'success', 
      Community: 'warning',
      Program: 'warning',
      Video: 'danger',
      PDF: 'neutral',
      Internal: 'info'
    }
    return variantMap[type] || 'neutral'
  }

  return (
    <Section 
      title="Developer Resources"
      subtitle="Everything you need to start building on the Dytallix blockchain platform"
    >
      <div style={{ display: 'grid', gap: 32 }}>
        {resources.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 16, textAlign: 'center' }}>
              {category.category}
            </h2>
            <Grid columns={2}>
              {category.items.map((item, itemIndex) => {
                const isInternal = item.type === 'Internal'
                const badgeVariant = getBadgeVariant(item.type)

                const CardContent = () => (
                  <Card style={{ height: '100%', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{item.title}</h3>
                      <Badge variant={badgeVariant} style={{ flexShrink: 0, marginLeft: 12 }}>
                        {item.type}
                      </Badge>
                    </div>
                    <p className="text-muted" style={{ margin: '0 0 12px 0' }}>{item.description}</p>
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', color: 'var(--color-primary-300)', fontSize: '0.9rem', fontWeight: 600 }}>
                      {isInternal ? 'Learn more' : 'Visit resource'} →
                    </div>
                  </Card>
                )

                return (
                  <div key={itemIndex}>
                    {isInternal ? (
                      <Link to={item.link} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <CardContent />
                      </Link>
                    ) : (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <CardContent />
                      </a>
                    )}
                  </div>
                )
              })}
            </Grid>
          </div>
        ))}
      </div>

      {/* Quick Start Section */}
      <Card style={{ marginTop: 32, textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>
          Quick Start Guide
        </h2>
        <p className="text-muted" style={{ fontSize: '1.05rem', margin: '0 auto 20px', maxWidth: 700 }}>
          Ready to start building? Follow these steps to get up and running with Dytallix development.
        </p>
        <div style={{ display: 'grid', gap: 16, textAlign: 'left', maxWidth: 840, margin: '0 auto' }}>
          <StepCard 
            step={1} 
            title="Get Test Tokens" 
            description={
              <>Visit our <Link to="/faucet" style={{ color: 'var(--color-primary-300)', textDecoration: 'none' }}>faucet</Link> to get DYTX test tokens for development and testing.</>
            }
          />
          <StepCard 
            step={2} 
            title="Install the SDK" 
            description={<code>npm install @dytallix/sdk</code>}
          />
          <StepCard 
            step={3} 
            title="Explore Examples" 
            description="Check out our example projects and tutorials to learn best practices and common patterns."
          />
        </div>
      </Card>

      {/* Network Configuration Section (restored) */}
      <div className="network-config-wrapper">
        <Card className="network-config">
          <h2 className="network-config-title">Network Configuration</h2>
          <p className="network-config-subtitle">Current Cosmos SDK endpoints and network settings for this instance.</p>
          <NetworkConfig />
        </Card>
      </div>
    </Section>
  )
}

// Network Configuration Component
const NetworkConfig = () => {
  const config = getCosmosConfig()
  
  const configItems = [
    { label: 'Chain ID', value: config.chainId, description: 'Unique identifier for the blockchain network' },
    { label: 'LCD REST API', value: config.lcdUrl, description: 'Light Client Daemon REST endpoint for queries' },
    { label: 'RPC Endpoint', value: config.rpcUrl, description: 'Tendermint RPC endpoint for direct node communication' },
    { label: 'WebSocket', value: config.wsUrl, description: 'Real-time updates and event subscriptions' },
    { label: 'Faucet Service', value: config.faucetUrl, description: 'Test token distribution endpoint' }
  ]

  return (
    <div>
      <div className="network-config-items">
        {configItems.map((item, i) => (
          <div key={i} className="network-config-item">
            <div className="network-config-item-header">
              <h3>{item.label}</h3>
              <code>{item.value}</code>
            </div>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
      <div className="network-config-note">
        <p><strong>Note:</strong> These endpoints are configured via environment variables. See <code>.env.staging.example</code> for the template.</p>
      </div>
    </div>
  )
}

export default DevResources