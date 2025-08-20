import React from 'react'
import { Link } from 'react-router-dom'

const Changelog = () => {
  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">Changelog</h1>
          <p className="section-subtitle">
            Track the evolution of the Dytallix platform with detailed release notes and version history
          </p>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="card" style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0' }}>
                Release History
              </h2>
              <a 
                href="https://github.com/HisMadRealm/dytallix/blob/main/dytallix-lean-launch/CHANGELOG.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.9rem', padding: '8px 16px', textDecoration: 'none' }}
              >
                View on GitHub →
              </a>
            </div>
            <p className="muted" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
              This changelog follows <a href="https://keepachangelog.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#93C5FD' }}>Keep a Changelog</a> format 
              and <a href="https://semver.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#93C5FD' }}>Semantic Versioning</a> principles.
            </p>
          </div>

          {/* Recent Release Highlights */}
          <div className="grid grid-1" style={{ gap: '24px' }}>
            
            {/* Unreleased */}
            <div className="card card-outline-primary">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0' }}>
                  Unreleased
                </h3>
                <span className="badge badge-primary">In Development</span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <h4 style={{ color: '#86EFAC', fontWeight: 600, marginBottom: '8px' }}>Added</h4>
                  <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }} className="muted">
                    <li>Standardized directory layout (node/, faucet/, explorer/, web/, src/, server/, ops/, scripts/, docs/, reports/, artifacts/)</li>
                    <li>Environment configuration template consolidation (.env.example with legacy + new VITE_* vars)</li>
                    <li>Security-focused ignore patterns (.gitignore, .dockerignore)</li>
                    <li>Dual-token nomenclature enforcement in CLI: governance token DGT, reward token DRT</li>
                  </ul>
                </div>
                <div>
                  <h4 style={{ color: '#FCD34D', fontWeight: 600, marginBottom: '8px' }}>Changed</h4>
                  <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }} className="muted">
                    <li>README unification: monorepo layout, branching overview, Cosmos-only focus</li>
                    <li>CLI package/binary renamed from `dyt` to `dcli`</li>
                    <li>Environment variable prefix migrated from `DYT_` to `DX_`</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* v1.1.1 */}
            <div className="card card-outline-success">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0' }}>
                  v1.1.1
                </h3>
                <span className="badge badge-success">2025-08-12</span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <h4 style={{ color: '#FCD34D', fontWeight: 600, marginBottom: '8px' }}>Changed</h4>
                  <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }} className="muted">
                    <li>Removed all Hardhat/EVM artifacts and configs from dytallix-lean-launch</li>
                    <li>Migrated faucet and backend to CosmJS; uses LCD/RPC/WS from environment</li>
                    <li>Moved EVM audit log to artifacts/hardhat_audit/MATCHES.md</li>
                  </ul>
                </div>
                <div>
                  <h4 style={{ color: '#F87171', fontWeight: 600, marginBottom: '8px' }}>Security / PQC</h4>
                  <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }} className="muted">
                    <li>Post-quantum cryptography productionization foundations</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* v1.1.0 */}
            <div className="card card-outline-accent">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0' }}>
                  v1.1.0
                </h3>
                <span className="badge badge-accent">2025-08-12</span>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <h4 style={{ color: '#86EFAC', fontWeight: 600, marginBottom: '8px' }}>Added - Post-Quantum Cryptography</h4>
                  <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }} className="muted">
                    <li>Post-quantum cryptography productionization: Dilithium3, Falcon-512, SPHINCS+-128s-simple via PQClean WASM</li>
                    <li>Deterministic build pipeline with pinned emscripten 3.1.57 and optional manifest signing</li>
                    <li>Integrity manifest + runtime verification</li>
                    <li>Unified PQC facade</li>
                    <li>CI workflow for build, hash, test, audit</li>
                  </ul>
                </div>
                <div>
                  <h4 style={{ color: '#F87171', fontWeight: 600, marginBottom: '8px' }}>Security Enhancements</h4>
                  <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }} className="muted">
                    <li>Zeroization of key derivation buffers</li>
                    <li>Integrity checks for WASM modules</li>
                    <li>Vendored minimal PQClean subset to reduce supply chain risk</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* Links to related resources */}
          <div className="card" style={{ marginTop: '32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '16px' }}>
              📋 Related Resources
            </h2>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <Link to="/roadmap" className="muted" style={{ textDecoration: 'none', padding: '12px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)' }}>
                🗺️ Development Roadmap
              </Link>
              <Link to="/tech-stack" className="muted" style={{ textDecoration: 'none', padding: '12px', borderRadius: '8px', background: 'rgba(139,92,246,0.1)' }}>
                🏗️ Tech Stack
              </Link>
              <a href="https://github.com/HisMadRealm/dytallix/releases" target="_blank" rel="noopener noreferrer" className="muted" style={{ textDecoration: 'none', padding: '12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)' }}>
                🏷️ GitHub Releases
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Changelog