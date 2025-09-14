import React from 'react'
import AnomalyPanel from '../components/AnomalyPanel.jsx'
import '../styles/global.css'

const PulseGuard = () => {
  return (
    <div className="pulseguard-page">
      {/* Hero Section */}
      <section className="section" style={{
        background: 'radial-gradient(800px 400px at 50% -10%, rgba(96,165,250,0.10) 0%, rgba(96,165,250,0) 65%)',
        paddingTop: '110px'
      }}>
        <div className="container center" style={{ maxWidth: 1200 }}>
          <h1 className="section-title" style={{ fontSize: '2.6rem', marginBottom: 14, textAlign: 'center' }}>PulseGuard</h1>
          <p className="muted" style={{ fontSize: '1.15rem', margin: '0 auto 36px', maxWidth: 840, textAlign: 'center' }}>
            Flags outliers across transaction graph and behavior features in real time.
          </p>

          {/* Video Placeholder */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 960, margin: '0 auto', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 18px -4px rgba(0,0,0,0.6)' }}>
            <iframe
              title="PulseGuard Demo"
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
            <div className="card accent-purple" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Pain Point Solved</h3>
              {/* Added concise description + solution bullets */}
              <p className="muted" style={{ fontSize: '.85rem', lineHeight: 1.5, margin: '0 0 12px' }}>
                Rapidly evolving adversarial patterns outpace static rule engines, causing undetected exploit chains, laundering flows, and noisy false positives.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Real-time fusion of mempool, finalized blocks, behavioral & entity metadata',
                  'Graph + streaming feature extraction with anomaly & ensemble classifiers',
                  'Sub-100ms risk scoring and prioritized alerting with explainability',
                  'Multi-hop laundering & exploit path tracing and clustering',
                  'PQC-secured pipelines & integrity attestations'
                ].map((item,i)=>(
                  <li key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ width:8, height:8, marginTop:7, background:'var(--accent-500)', borderRadius:'50%', boxShadow:'0 0 0 3px rgba(139,92,246,0.20)' }} />
                    <span className="muted" style={{ lineHeight:1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tech Stack */}
            <div className="card accent-purple" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Tech Stack</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Graph analytics over dynamic address–contract interaction DAG',
                  'Streaming feature engine (temporal + structural embeddings)',
                  'Hybrid ML: gradient boosted classifiers + anomaly scoring ensemble',
                  'On-chain AI signaling + explainability metadata',
                  'PQC-secured transport + integrity attestations',
                  'Real-time risk scoring API (sub-100ms P95)'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'var(--accent-500)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(139,92,246,0.20)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Use Cases */}
            <div className="card accent-purple" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Use Cases</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'DeFi protocols: flash-loan exploit pattern detection pre-execution',
                  'Fintech rails: velocity / structuring / mule cluster interdiction',
                  'Exchanges: cross-venue wash trade & layering surveillance',
                  'Bridges: rapid multi-hop laundering flow interruption',
                  'Stablecoin issuers: real-time synthetic mint / burn anomaly guard'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'var(--accent-500)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(139,92,246,0.20)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ROI Snapshot */}
            <div className="card accent-purple" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.10))' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 12 }}>ROI Snapshot</h3>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '.25px', color: 'var(--primary-300)', margin: 0 }}>
                Detects &gt;99% malicious anomalies in &lt;100ms.
              </p>
              <p className="muted" style={{ fontSize: '.8rem', marginTop: 10 }}>Internal Alpha metric; final audited benchmarks forthcoming.</p>
            </div>

            {/* CTA */}
            <div className="card accent-purple" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>Deep Dive & Architecture</h3>
              <p className="muted" style={{ maxWidth: 460, margin: '0 auto 20px' }}>
                Download the whitepaper for data pipeline, model governance, and PQC security layers.
              </p>
              <a
                href="/whitepapers/pulseguard.pdf"
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

      {/* Live Anomaly Detection Panel */}
      <section className="section">
        <div className="container" style={{ maxWidth: 1200 }}>
          <AnomalyPanel />
        </div>
      </section>
    </div>
  )
}

export default PulseGuard
