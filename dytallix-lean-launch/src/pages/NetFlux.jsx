import React from 'react'
import '../styles/global.css'

const NetFlux = () => {
  return (
    <div className="netflux-page">
      {/* Hero Section */}
      <section className="section" style={{
        background: 'radial-gradient(820px 420px at 50% -10%, rgba(56,189,248,0.10) 0%, rgba(56,189,248,0) 65%)',
        paddingTop: '110px'
      }}>
        <div className="container center" style={{ maxWidth: 1200 }}>
          <h1 className="section-title" style={{ fontSize: '2.55rem', marginBottom: 14, textAlign: 'center' }}>NetFlux</h1>
          <p className="muted" style={{ fontSize: '1.15rem', margin: '0 auto 36px', maxWidth: 860, textAlign: 'center' }}>
            Continuously tunes mempool and consensus parameters to keep latency low under bursty load.
          </p>

          {/* Video Placeholder */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 960, margin: '0 auto', aspectRatio: '16 / 9', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 18px -4px rgba(0,0,0,0.6)' }}>
            <iframe
              title="NetFlux Demo"
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
            <div className="card accent-cyan" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Pain Point Solved</h3>
              <p className="muted" style={{ fontSize: '.85rem', lineHeight: 1.5, margin: '0 0 12px' }}>
                Bursty traffic surges overwhelm static network parameters, inflating propagation delay and degrading UX before manual tuning can react.
              </p>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  'Predictive backlog + latency modeling for pre-emptive adjustment',
                  'Adaptive tuning of block, gossip, eviction & fee weight params',
                  'Feedback control loops with safety / rollback guardrails',
                  'Dynamic priority lane + congestion shaping optimization',
                  'PQC-secured telemetry ingestion & integrity attestation'
                ].map((item,i)=>(
                  <li key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <span style={{ width:8, height:8, marginTop:7, background:'rgb(34,211,238)', borderRadius:'50%', boxShadow:'0 0 0 3px rgba(34,211,238,0.25)' }} />
                    <span className="muted" style={{ lineHeight:1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tech Stack */}
            <div className="card accent-cyan" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Tech Stack</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Adaptive consensus & mempool parameter tuning engine',
                  'Predictive backlog + latency regression models',
                  'PQC-secured telemetry collection & integrity attestations',
                  'Dynamic fee lane / priority weight recalibration',
                  'Load balancer + p2p gossip pressure feedback loops',
                  'Safety guardrails: rollback & drift constraints'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'rgb(34,211,238)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(34,211,238,0.25)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Use Cases */}
            <div className="card accent-cyan" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 10 }}>Use Cases</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'High-throughput L1 / L2 chains',
                  'Infrastructure-heavy rollup ecosystems',
                  'Gaming / real-time interaction networks',
                  'Appchains managing cyclical traffic bursts',
                  'Bridges smoothing cross-domain surges'
                ].map((item, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 8, height: 8, marginTop: 7, background: 'rgb(34,211,238)', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(34,211,238,0.25)' }} />
                    <span className="muted" style={{ lineHeight: 1.5 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ROI Snapshot */}
            <div className="card accent-cyan" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.10))' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 12 }}>ROI Snapshot</h3>
              <p style={{ fontSize: '1.05rem', fontWeight: 600, letterSpacing: '.25px', color: 'var(--primary-300)', margin: 0 }}>
                Maintains &lt;100ms latency even under 10x traffic spikes.
              </p>
              <p className="muted" style={{ fontSize: '.8rem', marginTop: 10 }}>Stress test scenario results; extended benchmarking forthcoming.</p>
            </div>

            {/* CTA */}
            <div className="card accent-cyan" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 14 }}>Deep Dive & Architecture</h3>
              <p className="muted" style={{ maxWidth: 470, margin: '0 auto 20px' }}>
                Learn control loop design, predictive modeling inputs, and PQC telemetry safeguards.
              </p>
              <a
                href="/whitepapers/netflux.pdf"
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

export default NetFlux
