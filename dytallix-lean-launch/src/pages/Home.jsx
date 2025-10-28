import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/global.css'

const stats = [
  { value: '12', label: 'QuantumShield control modules in production pilots' },
  { value: '4.3M+', label: 'Post-quantum transactions simulated across partner datasets' },
  { value: '<120ms', label: 'Average global signing latency with PQC acceleration' }
]

const enterprisePillars = [
  {
    title: 'Harvest-Now Prevention',
    points: [
      'Cryptographically re-encrypt sensitive archives before adversaries can.',
      'Layered PQC key management and zero-trust access controls.'
    ]
  },
  {
    title: 'Operational Continuity',
    points: [
      'Drop-in adapters for hardware security modules and SIEM pipelines.',
      'Governance playbooks aligned with NIST PQ readiness guidance.'
    ]
  }
]

const developerPillars = [
  {
    title: 'Quantum-Ready APIs',
    points: [
      'Unified SDKs for signing, key rotation, and secure storage.',
      'Language support for TypeScript, Rust, Go, and Python teams.'
    ]
  },
  {
    title: 'Accelerated Ship Cycles',
    points: [
      'Starter architectures for wallets, bridges, and confidential compute.',
      'Tutorials and code walkthroughs maintained with every release.'
    ]
  }
]

const timeline = [
  { stage: 'Assess', detail: 'Benchmark current cryptography against QuantumShield threat matrices.' },
  { stage: 'Harden', detail: 'Activate PQC signing, encrypted archival storage, and anomaly analytics.' },
  { stage: 'Deploy', detail: 'Roll out enterprise policy orchestration with audit-ready evidence packs.' },
  { stage: 'Evolve', detail: 'Iterate with the Dytallix Build community and stay aligned with NIST updates.' }
]

const resources = [
  {
    title: 'Download the Whitepaper',
    description: 'Deep dive into lattice cryptography, AI ops, and tokenized governance.',
    link: '/whitepaper.pdf',
    external: false
  },
  {
    title: 'Watch the Explainer',
    description: 'Get the five-minute overview of QuantumShield and Dytallix Build.',
    link: 'https://www.youtube.com/@dytallix',
    external: true
  },
  {
    title: 'Explore the Docs',
    description: 'SDK quickstarts, architecture diagrams, and integration guides.',
    link: '/dev-resources',
    external: false
  }
]

const Home = () => {
  return (
    <div className="marketing-page home">
      <section className="split-hero" aria-labelledby="home-hero-heading">
        <div className="container split-hero__grid">
          <div className="split-hero__copy">
            <p className="eyebrow">Dual-path platform</p>
            <h1 id="home-hero-heading">Securing the Quantum Future — Today.</h1>
            <p className="lead">
              Dytallix develops quantum-safe data protection and developer tooling so security leaders and builders can defend
              against tomorrow’s decryption threats before they land.
            </p>
            <div className="split-hero__actions" role="group" aria-label="Primary navigation paths">
              <Link to="/quantumshield" className="btn btn-primary glow">Explore QuantumShield</Link>
              <Link to="/build" className="btn btn-secondary">Build on Dytallix</Link>
            </div>
            <dl className="split-hero__meta" aria-label="Key platform signals">
              {stats.map((item) => (
                <div key={item.label} className="split-hero__meta-item">
                  <dt>{item.value}</dt>
                  <dd>{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="split-hero__panes" aria-hidden="true">
            <div className="split-hero__visual split-hero__visual--enterprise">
              <div className="split-hero__caption">QuantumShield for the enterprise</div>
              <div className="split-hero__animation" data-animation="enterprise-hero" />
            </div>
            <div className="split-hero__visual split-hero__visual--developer">
              <div className="split-hero__caption">Dytallix Build for developers</div>
              <div className="split-hero__animation" data-animation="developer-hero" />
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section__header">
            <h2>One platform, two mission-critical outcomes</h2>
            <p>
              Choose the enterprise protection track to safeguard regulated workloads, or ship on the developer track with
              composable post-quantum primitives. Both paths share the same cryptographic core and threat intelligence.
            </p>
          </div>
          <div className="marketing-grid marketing-grid--two">
            <article className="marketing-card marketing-card--enterprise">
              <h3>QuantumShield</h3>
              <p className="muted">
                Enterprise-grade vaulting, policy orchestration, and compliance evidence designed for CISOs and security teams.
              </p>
              <ul>
                {enterprisePillars.map((pillar) => (
                  <li key={pillar.title}>
                    <h4>{pillar.title}</h4>
                    <p className="muted">
                      {pillar.points[0]}
                    </p>
                    <p className="muted">
                      {pillar.points[1]}
                    </p>
                  </li>
                ))}
              </ul>
              <Link to="/quantumshield" className="btn btn-outline">See the roadmap</Link>
            </article>

            <article className="marketing-card marketing-card--developer">
              <h3>Dytallix Build</h3>
              <p className="muted">
                APIs, SDKs, and developer previews for engineering teams that need verifiable quantum resilience.
              </p>
              <ul>
                {developerPillars.map((pillar) => (
                  <li key={pillar.title}>
                    <h4>{pillar.title}</h4>
                    {pillar.points.map((point) => (
                      <p key={point} className="muted">{point}</p>
                    ))}
                  </li>
                ))}
              </ul>
              <Link to="/build" className="btn btn-outline">Browse developer tools</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container marketing-section__header">
          <h2>The quantum risk is already here</h2>
          <p>
            Harvest-now, decrypt-later campaigns are underway. Dytallix aligns enterprise security controls with NIST PQ
            milestones while giving developers the tooling to rotate keys, protect data, and ship resilient apps.
          </p>
        </div>
        <div className="container marketing-timeline">
          {timeline.map((item) => (
            <div key={item.stage} className="marketing-timeline__item">
              <span className="marketing-timeline__stage">{item.stage}</span>
              <p className="muted">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-section--resources">
        <div className="container">
          <div className="marketing-section__header">
            <h2>Resources for your next review cycle</h2>
            <p>Brief your stakeholders with the latest collateral from the Dytallix team.</p>
          </div>
          <div className="marketing-grid marketing-grid--three">
            {resources.map((resource) => (
              <article key={resource.title} className="marketing-card marketing-card--resource">
                <h3>{resource.title}</h3>
                <p className="muted">{resource.description}</p>
                {resource.external ? (
                  <a href={resource.link} className="btn btn-secondary" target="_blank" rel="noreferrer">
                    Open in new tab
                  </a>
                ) : (
                  <Link to={resource.link} className="btn btn-secondary">
                    View resource
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--cta">
        <div className="container marketing-cta">
          <div>
            <h2>Ready to choose your path?</h2>
            <p className="muted">
              QuantumShield keeps regulated data safe. Dytallix Build gives engineers the blueprint to launch secure apps.
              Whichever team you lead, we are ready with implementation support.
            </p>
          </div>
          <div className="marketing-cta__actions">
            <Link to="/quantumshield" className="btn btn-primary glow">Schedule a QuantumShield briefing</Link>
            <Link to="/build" className="btn btn-outline">Join the developer preview</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
