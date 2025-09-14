import React from 'react'
import '../styles/global.css'
import { Link } from 'react-router-dom'

const CodeShield = () => {
  return (
    <div className="codeshield-page">
      {/* Hero Section */}
      <section className="section" style={{
        background: 'radial-gradient(800px 400px at 50% -10%, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0) 65%)',
        paddingTop: '110px'
      }}>
        <div className="container center" style={{ maxWidth: 1200 }}>
          <h1 className="section-title" style={{ fontSize: '2.6rem', marginBottom: 14, textAlign: 'center' }}>CodeShield</h1>
          <p className="muted" style={{ fontSize: '1.1rem', margin: '0 auto 36px', maxWidth: 860, textAlign: 'center' }}>
            Static + semantic analysis engine for pre-deployment smart contract assurance. Surfaces exploitable patterns, gas hotspots, upgrade risks & privilege drift before mainnet capital is at stake.
          </p>

          {/* Video Placeholder */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 960, margin: '0 auto', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 18px -4px rgba(0,0,0,0.6)' }}>
            <iframe
              title="CodeShield Demo"
              src="https://www.youtube.com/embed/VIDEO_ID?rel=0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#0d1525' }}
            />
          </div>
        </div>
      </section>

      {/* Content Sections */}
      <section className="section">
        <div className="container" style={{ maxWidth: 1180 }}>
          <div className="grid" style={{ display: 'grid', gap: 28, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {/* Pain Point */}
            <div className="card accent-blue" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Pain Point Solved</h3>
              <p className="muted" style={{ fontSize: '.85rem', lineHeight: 1.5, margin: '0 0 12px' }}>
                Complex upgradeable smart contracts conceal latent exploit paths and gas inefficiencies while existing scanners overwhelm teams with noisy false positives.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Semantic graph + flow tracing over privilege & fund surfaces',
                  'Symbolic execution + heuristic pruning for deep path coverage',
                  'Exploitability-ranked findings with suppressed noise',
                  'Storage layout diffing & proxy integrity validation',
                  'Gas complexity regression & actionable optimization hints'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'var(--primary-400)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(59,130,246,0.25)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tech Stack */}
            <div className="card accent-blue" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Tech Stack</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Canonical AST/IR pipeline (Solidity; Vyper roadmap) + CFG & SSA graphs',
                  'Inter-procedural taint + value flow tracing for fund & privilege surfaces',
                  'Selective symbolic execution + heuristic pruning (bounded depth)',
                  'ML + rule ranking ensemble to suppress noise & prioritize exploitability',
                  'Gas / complexity regression model & SARIF + signed JSON export'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'var(--primary-400)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(59,130,246,0.25)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Use Cases */}
            <div className="card accent-blue" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Use Cases</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Pre-commit & CI gate: block high-severity regression merges',
                  'Pre-audit triage → shrinks external audit scope / hours',
                  'Upgradeable release diff risk scoring & storage integrity',
                  'Bug bounty submission validation & reproducible artifacts',
                  'Vendor / third-party dependency trust assessment'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'var(--primary-400)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(59,130,246,0.25)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ROI Snapshot */}
            <div className="card accent-blue" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.12))' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 12 }}>ROI Snapshot</h3>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '.25px', color: 'var(--primary-300)', margin: 0 }}>
                Cuts manual triage time ≈60% (alpha internal) & prioritizes exploitable risk first.
              </p>
              <p className="muted" style={{ fontSize: '.8rem', marginTop: 10 }}>Pre-production benchmark; external validation & formal coverage report forthcoming.</p>
            </div>

            {/* CTA */}
            <div className="card accent-blue" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>Request Technical Brief</h3>
              <p className="muted" style={{ maxWidth: 480, margin: '0 auto 20px' }}>
                Get the methodology sheet covering analysis phases, ranking model, and planned formal verification extensions.
              </p>
              <Link
                to="/contact"
                className="btn btn-primary glow"
                style={{ fontWeight: 700, padding: '12px 26px', fontSize: '.95rem' }}
              >
                Request Access
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default CodeShield
