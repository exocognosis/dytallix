import React from 'react'
import { Link } from 'react-router-dom'

const Documentation = () => {
  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">Documentation</h1>
          <p className="section-subtitle">
            Comprehensive guides and references for building on the Dytallix blockchain platform
          </p>
        </div>

        <div style={{ display: 'grid', gap: '32px', maxWidth: '800px', margin: '0 auto' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>
              📚 Welcome to Dytallix Documentation
            </h2>
            <p className="muted" style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '20px' }}>
              This documentation hub provides comprehensive resources for developers, validators, and users 
              of the Dytallix post-quantum blockchain platform. Whether you're building your first dApp or 
              setting up a validator node, you'll find the guidance you need here.
            </p>
            <p className="muted" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
              <strong>Note:</strong> Documentation is currently being expanded. Some sections may be under 
              development as we continue to enhance our developer resources.
            </p>
          </div>

          <div className="grid grid-2">
            <div className="card card-outline-primary">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
                🚀 Getting Started
              </h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                <li className="muted">Quick start guide</li>
                <li className="muted">Environment setup</li>
                <li className="muted">First transaction</li>
                <li className="muted">SDK installation</li>
              </ul>
              <div style={{ marginTop: '16px' }}>
                <Link to="/dev-resources" className="muted" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
                  View developer resources →
                </Link>
              </div>
            </div>

            <div className="card card-outline-accent">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
                🏗️ Architecture
              </h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                <li className="muted">Post-quantum cryptography</li>
                <li className="muted">Consensus mechanism</li>
                <li className="muted">AI integration</li>
                <li className="muted">Network topology</li>
              </ul>
              <div style={{ marginTop: '16px' }}>
                <Link to="/tech-stack" className="muted" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
                  View tech stack →
                </Link>
              </div>
            </div>

            <div className="card card-outline-success">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
                📖 API Reference
              </h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                <li className="muted">REST API endpoints</li>
                <li className="muted">GraphQL queries</li>
                <li className="muted">WebSocket events</li>
                <li className="muted">SDK methods</li>
              </ul>
              <div style={{ marginTop: '16px' }}>
                <span className="muted" style={{ fontSize: '0.9rem' }}>
                  Coming soon...
                </span>
              </div>
            </div>

            <div className="card card-outline-warning">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>
                🔧 Tools & Utilities
              </h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
                <li className="muted">CLI commands</li>
                <li className="muted">Testing frameworks</li>
                <li className="muted">Deployment tools</li>
                <li className="muted">Debugging utilities</li>
              </ul>
              <div style={{ marginTop: '16px' }}>
                <Link to="/dev-resources" className="muted" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>
                  View tools →
                </Link>
              </div>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
              📝 Additional Resources
            </h2>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
              <Link to="/roadmap" className="muted" style={{ textDecoration: 'none', padding: '12px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)' }}>
                🗺️ Development Roadmap
              </Link>
              <Link to="/changelog" className="muted" style={{ textDecoration: 'none', padding: '12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)' }}>
                📋 Changelog
              </Link>
              <a href="https://github.com/HisMadRealm/dytallix" target="_blank" rel="noopener noreferrer" className="muted" style={{ textDecoration: 'none', padding: '12px', borderRadius: '8px', background: 'rgba(243,244,246,0.1)' }}>
                💻 GitHub Repository
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Documentation