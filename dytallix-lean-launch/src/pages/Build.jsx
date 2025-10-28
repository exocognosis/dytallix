import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/global.css'

const apiFeatures = [
  {
    title: 'Secure Signing API',
    detail: 'Access lattice-based signatures, deterministic nonce handling, and crypto-agile key rotation from day one.'
  },
  {
    title: 'Vault & Secrets SDK',
    detail: 'Manage PQC-protected secrets, shared custody flows, and encrypted backups with just a few lines of code.'
  },
  {
    title: 'Telemetry Hooks',
    detail: 'Stream signing metrics, anomaly events, and policy outcomes straight into your observability stack.'
  }
]

const docsHighlights = [
  {
    title: 'Reference Architectures',
    detail: 'Opinionated blueprints for wallets, cross-chain bridges, and confidential compute pipelines.',
    link: '/docs'
  },
  {
    title: 'OpenAPI Specs',
    detail: 'Automate client generation with up-to-date schemas and test fixtures.',
    link: '/dev-resources'
  },
  {
    title: 'Governance Playbooks',
    detail: 'Understand how Dytallix handles token economics, treasury operations, and upgrade governance.',
    link: '/governance'
  }
]

const tutorialTracks = [
  {
    name: 'TypeScript starter',
    summary: 'Spin up PQC signing inside a Next.js app with end-to-end validation tests.',
    action: 'View guide',
    href: '/dev-resources'
  },
  {
    name: 'Rust validator kit',
    summary: 'Compile secure validator nodes with optimized PQC primitives and metrics exporters.',
    action: 'Open tutorial',
    href: '/modules'
  },
  {
    name: 'Bridge hardening lab',
    summary: 'Instrument cross-chain transfers with anomaly detection using Dytallix AI modules.',
    action: 'Launch lab',
    href: '/modules'
  }
]

const communityLinks = [
  { label: 'GitHub', url: 'https://github.com/dytallix' },
  { label: 'Discord', url: 'https://discord.gg/dytallix' },
  { label: 'Developer Updates', url: 'https://medium.com/@dytallix' },
  { label: 'Status Page', url: '/status' }
]

const Build = () => {
  return (
    <div className="marketing-page build-page">
      <section className="page-hero page-hero--developer" aria-labelledby="build-hero">
        <div className="container page-hero__grid">
          <div className="page-hero__copy">
            <p className="eyebrow">Developer platform</p>
            <h1 id="build-hero">Build Quantum-Safe Systems — With Dytallix Build.</h1>
            <p className="lead">
              Ship faster with SDKs, starter architectures, and real-time tooling that inherit the same QuantumShield core used
              by the world’s most regulated teams.
            </p>
            <div className="page-hero__actions">
              <a href="mailto:hello@dytallix.com?subject=API%20Keys" className="btn btn-primary glow">
                Get API Keys
              </a>
              <a href="https://discord.gg/dytallix" className="btn btn-outline" target="_blank" rel="noreferrer">
                Join Developer Preview
              </a>
            </div>
          </div>
          <div className="page-hero__visual" aria-hidden="true">
            <div className="page-hero__stat page-hero__stat--developer">
              <span>SDK v2</span>
              <p>QuantumShield primitives packaged for TypeScript, Rust, Go, and Python</p>
            </div>
            <div className="page-hero__stat page-hero__stat--developer">
              <span>99.9%</span>
              <p>Developer preview uptime backed by distributed PQC signing clusters</p>
            </div>
            <p className="page-hero__note">All developer calls proxy through the QuantumShield core for production parity.</p>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section__header">
            <h2>APIs & SDKs</h2>
            <p>Everything you need to add post-quantum guarantees to new or existing apps.</p>
          </div>
          <div className="marketing-grid marketing-grid--three">
            {apiFeatures.map((feature) => (
              <article key={feature.title} className="marketing-card marketing-card--developer">
                <h3>{feature.title}</h3>
                <p className="muted">{feature.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--resources">
        <div className="container">
          <div className="marketing-section__header">
            <h2>Architecture Docs</h2>
            <p>Stay aligned with the core protocol, reference deployments, and governance guardrails.</p>
          </div>
          <div className="marketing-grid marketing-grid--three">
            {docsHighlights.map((doc) => (
              <article key={doc.title} className="marketing-card marketing-card--developer">
                <h3>{doc.title}</h3>
                <p className="muted">{doc.detail}</p>
                <Link to={doc.link} className="btn btn-secondary">Open docs</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section__header">
            <h2>Tutorials & Examples</h2>
            <p>Step-by-step guides to accelerate pilots, hackathons, and production launches.</p>
          </div>
          <div className="marketing-grid marketing-grid--three">
            {tutorialTracks.map((track) => (
              <article key={track.name} className="marketing-card marketing-card--developer">
                <h3>{track.name}</h3>
                <p className="muted">{track.summary}</p>
                <Link to={track.href} className="btn btn-outline">{track.action}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section__header">
            <h2>Community & GitHub</h2>
            <p>Connect with maintainers, file feature requests, and follow the roadmap in real time.</p>
          </div>
          <div className="marketing-grid marketing-grid--two">
            {communityLinks.map((link) => (
              <article key={link.label} className="marketing-card marketing-card--developer">
                <h3>{link.label}</h3>
                <a
                  href={link.url}
                  className="btn btn-secondary"
                  target={link.url.startsWith('http') ? '_blank' : undefined}
                  rel={link.url.startsWith('http') ? 'noreferrer' : undefined}
                >
                  Visit
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--cta">
        <div className="container marketing-cta">
          <div>
            <h2>Transparency Promise</h2>
            <p className="muted">
              Every SDK release ships with changelogs, reproducible builds, and PQC regression suites. Incidents, maintenance
              windows, and roadmap updates are published to the status page in real time.
            </p>
          </div>
          <div className="marketing-cta__actions">
            <Link to="/quantumshield" className="btn btn-secondary">Powered by QuantumShield Core</Link>
            <a href="mailto:hello@dytallix.com?subject=Developer%20Preview" className="btn btn-outline">
              Request enterprise sandbox
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Build
