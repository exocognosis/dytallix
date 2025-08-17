import React from 'react'
import '../styles/global.css'

const FlowRate = () => {
  return (
    <div className="flowrate-page">
      {/* Hero Section */}
      <section className="section" style={{
        background: 'radial-gradient(820px 420px at 50% -10%, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0) 65%)',
        paddingTop: '110px'
      }}>
        <div className="container center" style={{ maxWidth: 1200 }}>
          <h1 className="section-title" style={{ fontSize: '2.55rem', marginBottom: 14, textAlign: 'center' }}>FlowRate</h1>
          <p className="muted" style={{ fontSize: '1.15rem', margin: '0 auto 36px', maxWidth: 820, textAlign: 'center' }}>
            Predictive gas/fee quotes and optimal submit windows to reduce reverts.
          </p>

          {/* Video Placeholder */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 960, margin: '0 auto', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 18px -4px rgba(0,0,0,0.6)' }}>
            <iframe
              title="FlowRate Demo"
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
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Pain Point Solved</h3>
              <p className="muted" style={{ lineHeight: 1.55 }}>
                Gas volatility causes failed transactions, stale quotes, and user churn when fees spike mid-confirmation. Manual gas padding wastes capital while underbidding triggers reverts, MEV griefing, or lost arbitrage windows. Smart Gas Planner models mempool pressure + short-horizon block inclusion probabilities to return adaptive fee lanes and optimal submit windows that stabilize UX.
              </p>
            </div>

            {/* Tech Stack */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Tech Stack</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Predictive analytics over rolling gas micro-buckets',
                  'Mempool modeling + short-term inclusion probability curves',
                  'Adaptive risk bands: fast / balanced / economical modes',
                  'Reinforcement-tuned quote adjustment engine',
                  'PQC-secured API transport & signature verification',
                  'Latency-aware transaction scheduling heuristics'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'var(--primary-400)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(34,197,94,0.15)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Use Cases */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Use Cases</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Startups: embed reliable gas estimator to boost conversion',
                  'DeFi dApps: minimize revert refunds & UX friction',
                  'Wallets: present confidence-scored fee recommendations',
                  'Arb / liquidation bots: optimize inclusion speed cost curve',
                  'Cross-chain bridges: schedule batching at fee troughs'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'var(--primary-400)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(34,197,94,0.15)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ROI Snapshot */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(56,189,248,0.10))' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 12 }}>ROI Snapshot</h3>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '.25px', color: 'var(--primary-300)', margin: 0 }}>
                Reduces failed transactions by 40–60%.
              </p>
              <p className="muted" style={{ fontSize: '.8rem', marginTop: 10 }}>Pilot cohort performance; broader benchmarks in progress.</p>
            </div>

            {/* CTA */}
            <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid rgba(34,197,94,0.25)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>Deep Dive & Architecture</h3>
              <p className="muted" style={{ maxWidth: 470, margin: '0 auto 20px' }}>
                Explore predictive gas pipeline design, mempool feature extraction, and PQC security envelope.
              </p>
              <a
                href="/whitepapers/flowrate.pdf"
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

export default FlowRate
