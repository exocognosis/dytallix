import React, { useMemo, useRef, useState } from 'react'
import { Link, useInRouterContext } from 'react-router-dom'
import '../styles/modules.css'

// Lightweight validators
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/
const MAX_CODE_BYTES = 100 * 1024
const byteLen = (s) => new TextEncoder().encode(s).length

function StatusPill({ status }) {
  const map = {
    alpha: { bg: 'rgba(99,102,241,0.18)', bd: 'rgba(99,102,241,0.38)', fg: 'rgb(167, 139, 250)', label: 'Alpha' },
    beta: { bg: 'rgba(16,185,129,0.18)', bd: 'rgba(16,185,129,0.38)', fg: 'rgb(16,185,129)', label: 'Beta' },
    soon: { bg: 'rgba(255,255,255,0.08)', bd: 'rgba(255,255,255,0.16)', fg: 'rgba(255,255,255,0.75)', label: 'Coming soon' },
  }
  const s = map[status] || map.soon
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
      background: s.bg, border: `1px solid ${s.bd}`, color: s.fg
    }}>{s.label}</span>
  )
}

function useCarousel(count) {
  const [index, setIndex] = useState(0)
  const clamp = (i) => (i + count) % count
  return { index, next: () => setIndex(i => clamp(i + 1)), prev: () => setIndex(i => clamp(i - 1)), goTo: (i) => setIndex(clamp(i)) }
}

export default function Modules() {
  // PulseGuard state
  const [txHash, setTxHash] = useState('')
  const [windowSize, setWindowSize] = useState('100tx')
  const [anLoading, setAnLoading] = useState(false)
  const [anResult, setAnResult] = useState(null)
  const [anError, setAnError] = useState('')

  // CodeShield state
  const [code, setCode] = useState(`// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract DytallixToken {\n  mapping(address => uint256) public balanceOf;\n  function deposit() external payable { balanceOf[msg.sender] += msg.value; }\n  function withdraw(uint256 v) external { require(balanceOf[msg.sender] >= v); (bool ok,) = msg.sender.call{value: v}(""); require(ok); balanceOf[msg.sender] -= v; }\n}`)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanError, setScanError] = useState('')

  const carousel = useCarousel(2)
  const [hover, setHover] = useState(null)
  const anomalyRef = useRef(null)

  // Mocked actions (replace with real API calls when backend is wired)
  async function runAnomaly() {
    setAnLoading(true); setAnError(''); setAnResult(null)
    try {
      if (!TX_HASH_RE.test(txHash)) throw new Error('Invalid tx hash format')
      await new Promise(r => setTimeout(r, 650))
      setAnResult({
        riskScore: 62,
        summary: 'Anomaly score elevated by value spike and novel counterparty',
        hints: [
          'Outlier transfer value vs rolling median',
          'First-time interaction with contract in last 1,000 tx',
          'Counterparty recently associated with 3 flagged addresses'
        ]
      })
    } catch (e) { setAnError(e.message || 'Failed to run detection') }
    finally { setAnLoading(false) }
  }

  async function runScan() {
    setScanLoading(true); setScanError(''); setScanResult(null)
    try {
      if (!code.trim()) throw new Error('Code required')
      if (byteLen(code) > MAX_CODE_BYTES) throw new Error('Code exceeds 100KB limit')
      await new Promise(r => setTimeout(r, 700))
      setScanResult({
        meta: { ranAt: Date.now() },
        summary: { total: 3, bySeverity: { high: 1, medium: 1, low: 1 } },
        issues: [
          { id: 'R001', rule: 'Reentrancy risk', severity: 'high', line: 6, recommendation: 'Use checks-effects-interactions or reentrancy guard' },
          { id: 'G013', rule: 'Gas optimization', severity: 'low', line: 2, recommendation: 'Consolidate storage reads' },
          { id: 'U020', rule: 'Unchecked low-level call', severity: 'medium', line: 6, recommendation: 'Validate return values' },
        ]
      })
    } catch (e) { setScanError(e.message || 'Scan failed') }
    finally { setScanLoading(false) }
  }

  const badge = (text, tone = 'neutral') => {
    const cls = tone === 'good' ? 'badge badge-success' : tone === 'bad' ? 'badge badge-danger' : 'badge badge-neutral'
    return <span className={cls}>{text}</span>
  }

  const highlightedCode = useMemo(() => {
    const kw = /\b(contract|function|mapping|public|external|returns|pragma|solidity|uint256|address|require|if|else|return)\b/g
    const esc = (s)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
    let html = esc(code)
    html = html.replace(/\/\/.*$/gm, m=>`<span style="opacity:0.6">${esc(m)}</span>`)
    html = html.replace(kw, m=>`<span style="color:#93c5fd">${m}</span>`)
    if (scanResult?.issues?.length){
      const lines = html.split(/\n/)
      const issueLines = new Set(scanResult.issues.map(i=>i.line))
      html = lines.map((l,idx)=>{
        const ln = idx+1
        const flag = issueLines.has(ln)
        return `<div style="background:${flag?'rgba(239,68,68,0.12)':'transparent'}; padding:0 4px"><code>${l||'\u00A0'}</code></div>`
      }).join('\n')
    } else {
      html = html.split(/\n/).map(l=>`<div><code>${l||'\u00A0'}</code></div>`).join('\n')
    }
    return html
  }, [code, scanResult])

  const inRouter = (()=>{ try { return useInRouterContext() } catch { return false } })()

  const moduleCards = [
    { key: 'pulseguard', title: 'PulseGuard', desc: 'Flags outliers across transaction graph and behavior features in real time.', status: 'alpha', cta: 'Open preview', href: '#pulseguard' },
    { key: 'codeshield', title: 'CodeShield', desc: 'Static analysis engine detecting vulnerabilities pre-deployment.', status: 'alpha', cta: 'Open preview', href: '#codeshield' },
    { key: 'stakebalancer', title: 'StakeBalancer', desc: 'Suggests validator rotations and weights to improve liveness and decentralization.', status: 'beta', cta: 'Request access', href: '#' },
    { key: 'flowrate', title: 'FlowRate', desc: 'Predictive gas/fee quotes and optimal submit windows to reduce reverts.', status: 'soon', cta: 'Notify me', href: '#' },
    { key: 'netflux', title: 'NetFlux', desc: 'Continuously tunes network params to keep latency low under bursty load.', status: 'soon', cta: 'Notify me', href: '#' },
  ]

  const codeTooLarge = byteLen(code) > MAX_CODE_BYTES
  const txInvalid = txHash && !TX_HASH_RE.test(txHash)

  return (
    <div className="modules-page">
      <div className="section">
        <div className="app-container">
          <div className="section-header">
            <h1 className="section-title">AI Modules</h1>
            <p className="section-subtitle">Deploy AI modules for contract scanning, anomaly detection, and validator optimization.</p>
          </div>

          {/* Carousel */}
          <div className="modules-carousel" role="region" aria-label="AI tools" tabIndex={0}>
            <div className="carousel-viewport">
              <div className="carousel-mask">
                <div
                  style={{ display:'flex', transition:'transform 300ms ease', transform:`translateX(-${carousel.index * 50}%)`, width:'200%', minHeight:520 }}
                >
                  {/* PulseGuard */}
                  <div className="carousel-slide left" id="pulseguard" ref={anomalyRef}>
                    <div className="card accent-purple tool-card" style={{height:'100%',display:'flex',flexDirection:'column'}}>
                      <div className="tool-head">
                        <h2 className="tool-title">🔍 PulseGuard – Transaction Anomaly Detection</h2>
                        <p className="muted tool-sub">Enter a transaction hash and window to analyze suspicious activity (preview).</p>
                      </div>
                      <div style={{ display:'grid', gap:12, gridTemplateColumns:'1.3fr 0.7fr' }}>
                        <input value={txHash} onChange={e=>setTxHash(e.target.value)} placeholder="Transaction hash (0x...)" className={`input ${txInvalid?'error':''}`} />
                        <select value={windowSize} onChange={e=>setWindowSize(e.target.value)} className="input">
                          <option value="50tx">Last 50 tx</option>
                          <option value="100tx">Last 100 tx</option>
                          <option value="500tx">Last 500 tx</option>
                        </select>
                      </div>
                      <button className="btn btn-primary" style={{ marginTop:12 }} onClick={runAnomaly} disabled={anLoading || txInvalid}>{anLoading ? 'Running…' : 'Run Anomaly Detection'}</button>

                      <ul className="feature-list">
                        <li>Traverses transaction graph data structures to detect significant deviations</li>
                        <li>Flags anomalies such as outlier value spikes or novel counterparties</li>
                        <li>Computes risk score using weighted heuristics and rolling windows</li>
                        <li>Applies z-score and percentile rank math for thresholding</li>
                      </ul>

                      {anError && <div className="card card-tint-danger" style={{marginTop:12}}>{anError}</div>}
                      {anResult && (
                        <div className="card card-tint-info" style={{ marginTop: 14 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                            <div style={{ fontWeight:700 }}>Risk Score: {anResult.riskScore}</div>
                            <span className="muted" style={{ fontSize:12 }}>Window: {windowSize}</span>
                          </div>
                          <div className="muted" style={{ marginTop:6 }}>{anResult.summary}</div>
                          <div style={{ display:'grid', gap:8, marginTop:10 }}>
                            {anResult.hints.map((h,i)=> <div key={i} className="hint-pill">{h}</div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CodeShield */}
                  <div className="carousel-slide right" id="codeshield">
                    <div className="card accent-blue tool-card" style={{height:'100%',display:'flex',flexDirection:'column'}}>
                      <div className="tool-head">
                        <h2 className="tool-title">🛡️ CodeShield – Smart Contract Analysis</h2>
                        <p className="muted tool-sub">Paste Solidity code and run a scan to detect vulnerabilities.</p>
                      </div>
                      <div className="card-inner" style={{ borderRadius:12, padding:12, border:'1px solid rgba(148,163,184,0.18)' }}>
                        <div className="codebox" dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                      </div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
                        <button className="btn btn-primary" onClick={runScan} disabled={scanLoading || codeTooLarge}>{scanLoading ? 'Scanning…' : 'Scan Contract'}</button>
                        <button className="btn" onClick={()=>navigator.clipboard?.writeText(code)}>Copy</button>
                        <button className="btn" onClick={()=>setCode(code.trim())}>Format</button>
                        <label className="muted" style={{ marginLeft:'auto', fontSize:12 }}>{(byteLen(code)/1024).toFixed(1)} KB / 100 KB</label>
                      </div>
                      {codeTooLarge && <div className="card card-tint-danger" style={{ marginTop:12 }}>Code exceeds 100KB limit.</div>}
                      {scanError && <div className="card card-tint-danger" style={{ marginTop:12 }}>{scanError}</div>}
                      {scanResult && (
                        <div style={{ marginTop: 14 }}>
                          <div className="card card-tint-info" style={{ padding: 16 }}>
                            <div style={{ display:'flex', gap:12, alignItems:'center', justifyContent:'space-between' }}>
                              <div>
                                <strong>Findings:</strong> {scanResult.summary.total} &nbsp;
                                {badge(`High ${scanResult.summary.bySeverity.high}`, 'bad')} &nbsp;
                                {badge(`Med ${scanResult.summary.bySeverity.medium}`, 'neutral')} &nbsp;
                                {badge(`Low ${scanResult.summary.bySeverity.low}`, 'good')}
                              </div>
                              <span className="muted" style={{ fontSize: 12 }}>Scanned at {new Date(scanResult.meta.ranAt).toLocaleString()}</span>
                            </div>
                            <div style={{ marginTop: 12, display:'grid', gap:10 }}>
                              {scanResult.issues.map(i => {
                                const outline = i.severity === 'high' ? 'card-outline-danger' : i.severity === 'medium' ? 'card-outline-warning' : 'card-outline-success'
                                return (
                                  <div key={i.id} className={`card ${outline}`} style={{ padding: 12 }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12 }}>
                                      <div style={{ fontWeight:700 }}>{i.rule}</div>
                                      {badge(i.severity.toUpperCase(), i.severity === 'high' ? 'bad' : i.severity === 'low' ? 'good' : 'neutral')}
                                    </div>
                                    <div className="muted" style={{ marginTop:6 }}>Line {i.line} – {i.recommendation}</div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Carousel controls */}
              <button aria-label="Previous tool" onClick={carousel.prev} onMouseEnter={()=>setHover('left')} onMouseLeave={()=>setHover(null)} className={`carousel-arrow left ${hover==='left'?'hover':''}`}>
                <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10.354 14.354a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 1 1 .708.708L4.707 8l5.647 5.646a.5.5 0 0 1 0 .708z"/>
                </svg>
              </button>
              <button aria-label="Next tool" onClick={carousel.next} onMouseEnter={()=>setHover('right')} onMouseLeave={()=>setHover(null)} className={`carousel-arrow right ${hover==='right'?'hover':''}`}>
                <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 1 1-.708-.708L11.293 8 5.646 2.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:10 }}>
              {[0,1].map(i => (
                <button key={i} onClick={()=>carousel.goTo(i)} aria-label={`Go to slide ${i+1}`} className={`carousel-dots-btn ${carousel.index===i?'active':''}`} />
              ))}
            </div>
          </div>

          {/* Module Directory */}
          <div className="card accent-cyan" style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12 }}>Module Directory</h2>
            <div className="module-grid">
              {moduleCards.map(m => (
                <div key={m.key} className={`card module-card ${m.key==='pulseguard'?'accent-purple': m.key==='codeshield'?'accent-blue': m.key==='stakebalancer'?'accent-amber':'accent-cyan'}`}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                    <h3 style={{ margin:0 }}>{m.title}</h3>
                    <StatusPill status={m.status} />
                  </div>
                  <p className="muted" style={{ fontSize:'0.95rem', lineHeight:1.6, flex:1 }}>{m.desc}</p>
                  {inRouter ? <Link to={m.href} className="btn btn-primary">{m.cta}</Link> : <a href={m.href} className="btn btn-primary">{m.cta}</a>}
                </div>
              ))}
            </div>
          </div>

          {/* Editor for CodeShield input (collapsible simple version) */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="form-label">Contract source</div>
            <textarea className="input textarea" rows={8} value={code} onChange={e=>setCode(e.target.value)} spellCheck={false} />
            <div className="muted" style={{ marginTop:8, fontSize:12 }}>Tip: Use the editor above to tweak CodeShield input. The preview card uses the same buffer.</div>
          </div>

        </div>
      </div>
    </div>
  )
}
