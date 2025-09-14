import React from 'react'
import '../styles/global.css'

const StakeBalancer = () => {
  return (
    <div className="stakebalancer-page">
      {/* Hero Section */}
      <section className="section" style={{
        background: 'radial-gradient(820px 420px at 50% -10%, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0) 65%)',
        paddingTop: '110px'
      }}>
        <div className="container center" style={{ maxWidth: 1200 }}>
          <h1 className="section-title" style={{ fontSize: '2.55rem', marginBottom: 14, textAlign: 'center' }}>StakeBalancer</h1>
          <p className="muted" style={{ fontSize: '1.15rem', margin: '0 auto 36px', maxWidth: 860, textAlign: 'center' }}>
            Suggests validator rotations and weights to improve liveness and decentralization.
          </p>

          {/* Video Placeholder */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 960, margin: '0 auto', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 18px -4px rgba(0,0,0,0.6)' }}>
            <iframe
              title="StakeBalancer Demo"
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
            <div className="card accent-amber" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Pain Point Solved</h3>
              <p className="muted" style={{ fontSize: '.85rem', lineHeight: 1.5, margin: '0 0 12px' }}>
                Stake centralization, correlated infrastructure and slow manual rotation degrade liveness, raise censorship risk and erode trust over time.
              </p>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  'Multi-objective scoring across liveness, entropy, latency & geography',
                  'Correlation clustering (ASN / provider / region) & redundancy analysis',
                  'Stochastic optimization generating rotation & weight proposals',
                  'Missed block & anomaly detection feeding proactive adjustments',
                  'What-if simulation: impact projection before execution'
                ].map((item,i)=>(
                  <li key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ width:8, height:8, marginTop:7, background:'var(--warning-500)', borderRadius:'50%', boxShadow:'0 0 0 3px rgba(245,158,11,0.25)' }} />
                    <span className="muted" style={{ lineHeight:1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tech Stack */}
            <div className="card accent-amber" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Tech Stack</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Stochastic optimization over validator weight distributions',
                  'Multi-objective scoring: liveness, entropy, latency, geography',
                  'PQC-secured telemetry ingestion & attestation layer',
                  'Consensus health & missed-block anomaly detection',
                  'Correlated failure clustering & redundancy analysis',
                  'What-if simulation engine (rotation impact projections)'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'var(--warning-500)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(245,158,11,0.25)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Use Cases */}
            <div className="card accent-amber" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Use Cases</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'L1 / L2 networks seeking resilience & anti-censorship hardening',
                  'Sidechains optimizing validator refresh cadence',
                  'Staking platforms enforcing diversification policies',
                  'Governance DAOs evaluating rotation proposals',
                  'Appchains modeling decentralization improvement paths'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'var(--warning-500)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(245,158,11,0.25)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ROI Snapshot */}
            <div className="card accent-amber" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(56,189,248,0.10))' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 12 }}>ROI Snapshot</h3>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '.25px', color: 'var(--primary-300)', margin: 0 }}>
                Boosts validator decentralization by 25–30% in trials.
              </p>
              <p className="muted" style={{ fontSize: '.8rem', marginTop: 10 }}>Early network cohort analysis; broader validation underway.</p>
            </div>

            {/* CTA */}
            <div className="card accent-amber" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>Deep Dive & Architecture</h3>
              <p className="muted" style={{ maxWidth: 470, margin: '0 auto 20px' }}>
                Review scoring methodology, stochastic rotation algorithms, and PQC telemetry safeguards.
              </p>
              <a
                href="/whitepapers/stakebalancer.pdf"
                className="btn btn-primary glow"
                style={{ fontWeight: 700, padding: '12px 26px', fontSize: '.95rem' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download Whitepaper
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default StakeBalancer
