import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/global.css'

const threatSignals = [
  {
    title: 'Harvest now, decrypt later is accelerating',
    detail:
      'Nation-state actors are warehousing encrypted records today. QuantumShield rotates keys and re-protects legacy archives with PQC before that data window opens.'
  },
  {
    title: 'Regulators are updating mandates',
    detail:
      'FFIEC, ENISA, and CSA updates require quantum transition plans. QuantumShield produces audit-ready reports aligned to these frameworks.'
  },
  {
    title: 'Crown-jewel data needs zero trust',
    detail:
      'Hardware enclaves and policy engines enforce least privilege across jurisdictions with continuous anomaly scoring.'
  }
]

const architectureLayers = [
  {
    name: 'PQC Core',
    description: 'Dilithium / Falcon signing, SPHINCS+ hashing, and crypto-agile key rotation orchestrated through HSM connectors.'
  },
  {
    name: 'Policy Orchestration',
    description: 'Dynamic access workflows map to classifications, retention schedules, and compliance attestations.'
  },
  {
    name: 'Threat Intelligence',
    description: 'On-chain AI models detect anomalous access, unusual partner requests, and potential data ex-filtration in real time.'
  },
  {
    name: 'Evidence Engine',
    description: 'Immutable logging and tamper-evident reports tie every action back to owners for audits and board briefings.'
  }
]

const valueStack = [
  {
    headline: 'Protect future revenues',
    copy: 'Keep customer trust and avoid breach remediation costs by securing records before quantum adversaries can expose them.'
  },
  {
    headline: 'Reduce audit fatigue',
    copy: 'Generate pre-built evidence packs for FFIEC, GDPR, and NIST reviews with one-click exports and chain-of-custody trails.'
  },
  {
    headline: 'Accelerate modernization',
    copy: 'Use QuantumShield adapters to modernize encryption without re-platforming critical workloads or delaying cloud migrations.'
  }
]

const industries = [
  { name: 'Financial Services', focus: 'Protect trade logs, settlement instructions, and cross-border payment archives.' },
  { name: 'Healthcare & Life Sciences', focus: 'Shield genomic research, patient data, and telehealth workflows from future compromise.' },
  { name: 'Public Sector', focus: 'Safeguard citizen services, diplomatic cables, and classified archives across regions.' },
  { name: 'Energy & Critical Infrastructure', focus: 'Secure SCADA telemetry, predictive maintenance, and grid analytics.' },
  { name: 'Telecommunications', focus: 'Defend subscriber metadata, roaming agreements, and 6G R&D.' },
  { name: 'Technology & SaaS', focus: 'Protect AI training data, IP, and customer vaults without slowing release cycles.' }
]

const roadmap = [
  {
    step: '1. Quantum readiness workshop',
    detail: 'Assess cryptographic inventory, identify PQC migration priorities, and align stakeholders on sequencing.'
  },
  {
    step: '2. Pilot enclave & policy mapping',
    detail: 'Activate QuantumShield vaults for crown-jewel datasets and integrate existing identity providers and HSMs.'
  },
  {
    step: '3. Enterprise rollout',
    detail: 'Expand coverage to additional business units with automated rotation schedules and AI-driven anomaly scoring.'
  },
  {
    step: '4. Continuous assurance',
    detail: 'Generate evidence packs, track new standards, and iterate with the Dytallix Build ecosystem.'
  }
]

const QuantumShield = () => {
  return (
    <div className="marketing-page quantumshield-page">
      <section className="page-hero page-hero--enterprise" aria-labelledby="quantumshield-hero">
        <div className="container page-hero__grid">
          <div className="page-hero__copy">
            <p className="eyebrow">Enterprise protection</p>
            <h1 id="quantumshield-hero">Defend Your Future Data — Before Quantum Decryption Begins.</h1>
            <p className="lead">
              QuantumShield helps CISOs harden archives, active workloads, and compliance operations with post-quantum controls
              that deploy in weeks, not quarters.
            </p>
            <div className="page-hero__actions">
              <a
                href="mailto:hello@dytallix.com?subject=QuantumShield%20Demo"
                className="btn btn-primary glow"
              >
                Book a 30-Minute Demo
              </a>
              <Link to="/build" className="btn btn-outline">Share with your engineering leads</Link>
            </div>
          </div>
          <div className="page-hero__visual" aria-hidden="true">
            <div className="page-hero__stat">
              <span>90%</span>
              <p>of security leaders expect PQC migrations to impact roadmaps before 2028*</p>
            </div>
            <div className="page-hero__stat">
              <span>30 days</span>
              <p>Average time to secure a priority data vault using QuantumShield adapters</p>
            </div>
            <p className="page-hero__note">*Source: Dytallix threat research brief, 2025.</p>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section__header">
            <h2>The “Harvest Now, Decrypt Later” Reality</h2>
            <p>
              QuantumShield counters data hoarding campaigns by encrypting archives with NIST-selected algorithms, monitoring
              access patterns, and ensuring every retrieval is provable.
            </p>
          </div>
          <div className="marketing-grid marketing-grid--three">
            {threatSignals.map((signal) => (
              <article key={signal.title} className="marketing-card marketing-card--enterprise">
                <h3>{signal.title}</h3>
                <p className="muted">{signal.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section__header">
            <h2>How QuantumShield Works</h2>
            <p>
              A layered architecture unifies PQC cryptography, policy enforcement, and AI-driven monitoring so you can upgrade
              defenses without re-platforming legacy systems.
            </p>
          </div>
          <div className="marketing-grid marketing-grid--two">
            {architectureLayers.map((layer) => (
              <article key={layer.name} className="marketing-card marketing-card--enterprise">
                <h3>{layer.name}</h3>
                <p className="muted">{layer.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--resources">
        <div className="container">
          <div className="marketing-section__header">
            <h2>Business Value & ROI</h2>
            <p>Demonstrate measurable impact to your board with executive-ready outcomes.</p>
          </div>
          <div className="marketing-grid marketing-grid--three">
            {valueStack.map((value) => (
              <article key={value.headline} className="marketing-card marketing-card--enterprise">
                <h3>{value.headline}</h3>
                <p className="muted">{value.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="marketing-section__header">
            <h2>Use Cases by Industry</h2>
            <p>Activate the same cryptographic backbone across your vertical-specific workflows.</p>
          </div>
          <div className="marketing-grid marketing-grid--three">
            {industries.map((industry) => (
              <article key={industry.name} className="marketing-card marketing-card--enterprise">
                <h3>{industry.name}</h3>
                <p className="muted">{industry.focus}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--cta">
        <div className="container marketing-timeline">
          {roadmap.map((item) => (
            <article key={item.step} className="marketing-card marketing-card--enterprise marketing-card--roadmap">
              <h3>{item.step}</h3>
              <p className="muted">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section">
        <div className="container marketing-cta">
          <div>
            <h2>Bring your developers into the conversation</h2>
            <p className="muted">
              Pair QuantumShield deployments with the Dytallix Build platform for SDKs, integration examples, and community
              support tailored to your engineering teams.
            </p>
          </div>
          <div className="marketing-cta__actions">
            <Link to="/build" className="btn btn-secondary">Explore Dytallix Build</Link>
            <a
              href="mailto:hello@dytallix.com?subject=QuantumShield%20Deployment"
              className="btn btn-outline"
            >
              Talk with a solutions architect
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}

export default QuantumShield
