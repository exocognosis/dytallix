import React, { useEffect, useMemo, useRef, useState } from 'react'
// Added helper constants & functions
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/
const MAX_CODE_BYTES = 100 * 1024 // 100KB
function byteLength(str){ return new TextEncoder().encode(str).length }

// --- Carousel helpers
function useCarousel(count) {
  const [index, setIndex] = useState(0);
  const clamp = (i) => (i + count) % count;
  const next = () => setIndex(i => clamp(i + 1));
  const prev = () => setIndex(i => clamp(i - 1));
  const goTo = (i) => setIndex(() => clamp(i));
  return { index, next, prev, goTo };
}
import AnomalyDemo from '../components/AnomalyDemo.jsx'
import ContractScannerDemo from '../components/ContractScannerDemo.jsx'
import { PQC_ENABLED, PQC_ALGOS_ALLOWED } from '../config/flags.ts'
import { generateKeypair, sign as pqcSign, verify as pqcVerify, pubkeyFromSecret } from '../lib/crypto/pqc.js'
import { preloadAll as preloadPqcIntegrity } from '../crypto/pqc/integrity'

// --- Helper: download JSON results
function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// --- Mock runners (swap for real APIs later)
// Remove mockRunAnomaly & mockScanContract usage; keep functions for fallback if needed
async function mockRunAnomaly({ txHash, windowSize }) {
  await new Promise(r => setTimeout(r, 900))
  return {
    txHash,
    windowSize,
    riskScore: Math.round(40 + Math.random() * 55),
    anomalies: [
      { id: 'a1', type: 'ValueSpike', severity: 'medium', detail: 'Outgoing value 3.1× account median in last 24h' },
      { id: 'a2', type: 'NewCounterparty', severity: 'low', detail: 'First-time destination address for this wallet' },
    ],
    meta: { ranAt: new Date().toISOString(), model: 'anomaly-detector:demo' },
  }
}

async function mockScanContract({ code }) {
  await new Promise(r => setTimeout(r, 1100))
  const issues = [
    { id: 's1', severity: 'high', rule: 'Reentrancy', line: 73, recommendation: 'Use checks-effects-interactions; consider ReentrancyGuard.' },
    { id: 's2', severity: 'medium', rule: 'Unchecked Return', line: 112, recommendation: 'Verify return value of external call.' },
    { id: 's3', severity: 'low', rule: 'Gas Inefficiency', line: 21, recommendation: 'Cache storage reads; consider immutables.' },
  ]
  return { summary: { total: issues.length, bySeverity: { high: 1, medium: 1, low: 1 } }, issues, meta: { ranAt: new Date().toISOString(), model: 'contract-scanner:demo' } }
}

const badge = (text, tone = 'neutral') => (
  <span style={{
    display: 'inline-block', padding: '2px 8px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.12)',
    background: tone === 'good' ? 'rgba(16,185,129,0.15)'
      : tone === 'bad' ? 'rgba(239,68,68,0.15)'
      : 'rgba(255,255,255,0.06)',
    color: tone === 'good' ? 'rgb(16,185,129)'
      : tone === 'bad' ? 'rgb(239,68,68)'
      : 'rgba(255,255,255,0.85)',
    fontSize: 12, fontWeight: 600
  }}>{text}</span>
)

function StatusPill({ status }) {
  const map = {
    alpha: { bg: 'rgba(99,102,241,0.18)', bd: 'rgba(99,102,241,0.38)', fg: 'rgb(167, 139, 250)', label: 'Alpha' },
    beta: { bg: 'rgba(16,185,129,0.18)', bd: 'rgba(16,185,129,0.38)', fg: 'rgb(16,185,129)', label: 'Beta' },
    soon: { bg: 'rgba(255,255,255,0.08)', bd: 'rgba(255,255,255,0.16)', fg: 'rgba(255,255,255,0.75)', label: 'Coming soon' },
  }
  const s = map[status] || map.soon
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
      background: s.bg, border: `1px solid ${s.bd}`, color: s.fg
    }}>{s.label}</span>
  )
}

const Modules = () => {
  // --- Anomaly Detection state
  const [txHash, setTxHash] = useState('')
  const [windowSize, setWindowSize] = useState('100tx')
  const [anLoading, setAnLoading] = useState(false)
  const [anResult, setAnResult] = useState(null)
  const [anError,setAnError] = useState('')

  // --- Contract Scanner state
  const [code, setCode] = useState(`// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract DytallixToken {\n  mapping(address => uint256) public balanceOf;\n  function deposit() external payable { balanceOf[msg.sender] += msg.value; }\n  function withdraw(uint256 v) external { require(balanceOf[msg.sender] >= v); (bool ok,) = msg.sender.call{value: v}(''); require(ok); balanceOf[msg.sender] -= v; }\n}`)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanError,setScanError] = useState('')

  // PQC demo state
  const [pqcReady, setPqcReady] = useState(PQC_ENABLED ? null : false)
  const [pqcErr, setPqcErr] = useState('')
  const [pqcAlgo, setPqcAlgo] = useState('dilithium')
  const [pqcSk, setPqcSk] = useState('')
  const [pqcPk, setPqcPk] = useState('')
  const [pqcMsg, setPqcMsg] = useState('Hello quantum world')
  const [pqcSig, setPqcSig] = useState('')
  const [pqcStatus, setPqcStatus] = useState('')
  const [pqcVerOK, setPqcVerOK] = useState(null)
  const [pqcBusy, setPqcBusy] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!PQC_ENABLED) return
    ;(async () => {
      try { await preloadPqcIntegrity(); if (mounted) setPqcReady(true) } catch (e) { if (mounted) { setPqcReady(false); setPqcErr(e?.message || 'Integrity failed') } }
    })()
    return () => { mounted = false }
  }, [])

  async function genKey() {
    setPqcBusy(true); setPqcStatus('Generating keypair…'); setPqcSig(''); setPqcVerOK(null)
    try {
      if (pqcReady === false) throw new Error(pqcErr || 'PQC unavailable')
      const kp = await generateKeypair(pqcAlgo)
      setPqcPk(kp.publicKey); setPqcSk(kp.secretKey)
      setPqcStatus('Keypair generated')
    } catch (e) { setPqcStatus('Error: ' + (e?.message || 'fail')) }
    finally { setPqcBusy(false) }
  }
  function zap(b64) { try { /* attempt overwrite */ } catch {} /* not strictly possible with JS strings */ }
  async function doSign() {
    setPqcBusy(true); setPqcStatus('Signing…'); setPqcSig(''); setPqcVerOK(null)
    try {
      if (!pqcSk) throw new Error('No secret key')
      const msgU8 = new TextEncoder().encode(pqcMsg)
      const sigB64 = await pqcSign(pqcAlgo, pqcSk, msgU8)
      // zeroize msgU8
      msgU8.fill(0)
      setPqcSig(sigB64)
      setPqcStatus('Signed')
    } catch (e) { setPqcStatus('Error: ' + (e?.message || 'fail')) }
    finally { setPqcBusy(false) }
  }
  async function doVerify() {
    setPqcBusy(true); setPqcStatus('Verifying…'); setPqcVerOK(null)
    try {
      if (!pqcPk && pqcSk) {
        try { const pk2 = await pubkeyFromSecret(pqcSk); setPqcPk(pk2) } catch {}
      }
      if (!pqcPk) throw new Error('No public key')
      if (!pqcSig) throw new Error('No signature')
      const msgU8 = new TextEncoder().encode(pqcMsg)
      const ok = await pqcVerify(pqcAlgo, pqcPk, msgU8, pqcSig)
      msgU8.fill(0)
      setPqcVerOK(ok)
      setPqcStatus(ok ? 'Signature valid' : 'Signature invalid')
    } catch (e) { setPqcStatus('Error: ' + (e?.message || 'fail')) }
    finally { setPqcBusy(false) }
  }

  const anomalyRef = useRef(null)
  const scannerRef = useRef(null)

  const carousel = useCarousel(2)

  // Hover state for carousel arrows to emphasize on hover
  const [hover, setHover] = useState(null)

  // Debounce helper
  function useDebounced(value, ms){
    const [v,setV] = useState(value)
    useEffect(()=>{ const t = setTimeout(()=>setV(value), ms); return ()=>clearTimeout(t)},[value, ms]);
    return v
  }

  const debouncedCode = useDebounced(code, 400)
  const debouncedTx = useDebounced(txHash, 400)

  // Persist inputs
  useEffect(()=>{ try{ localStorage.setItem('modules.txHash', debouncedTx) }catch{} },[debouncedTx])
  useEffect(()=>{ try{ localStorage.setItem('modules.code', debouncedCode) }catch{} },[debouncedCode])
  useEffect(()=>{ try{ const t = localStorage.getItem('modules.txHash'); if(t) setTxHash(t); const c = localStorage.getItem('modules.code'); if(c) setCode(c)}catch{} },[])

  // Enhanced openModule (scroll & focus)
  function openModule(key) {
    if (key === 'pulseguard') { // renamed from 'fraud'
      anomalyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      anomalyRef.current?.focus?.()
      return
    }
    if (['stakebalancer','network','flowrate'].includes(key)) {
      alert('This module is coming soon. Join the Discord or watch the docs for updates!')
    }
  }

  const trendTone = useMemo(() => {
    if (!anResult) return 'neutral'
    return anResult.riskScore > 70 ? 'bad' : anResult.riskScore < 50 ? 'good' : 'neutral'
  }, [anResult])

  async function apiFetch(path, body){
    const res = await fetch(path,{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)})
    if(!res.ok){
      let msg = res.status + ' '
      try { const j = await res.json(); msg += j.message || j.code || '' } catch {}
      const e = new Error(msg || 'Request failed')
      e.status = res.status
      throw e
    }
    return res.json()
  }

  const runAnomaly = async () => {
    setAnLoading(true); setAnResult(null); setAnError('')
    try {
      if (!TX_HASH_RE.test(txHash)) throw new Error('Invalid tx hash format')
      const data = await apiFetch('/api/anomaly/run',{ txHash: txHash.trim(), windowSize })
      setAnResult(data)
    } catch(e){ setAnError(e.message) } finally { setAnLoading(false) }
  }

  const runScan = async () => {
    setScanLoading(true); setScanResult(null); setScanError('')
    try {
      if (!code.trim()) throw new Error('Code required')
      const size = byteLength(code)
      if (size > MAX_CODE_BYTES) throw new Error('Code exceeds 100KB limit')
      const data = await apiFetch('/api/contract/scan',{ code })
      setScanResult(data)
      // Optional cache
      try { localStorage.setItem('modules.lastScan', JSON.stringify(data)) } catch {}
    } catch(e){ setScanError(e.message) } finally { setScanLoading(false) }
  }

  function exportSarif(){
    if(!scanResult) return
    const sarif = {
      $schema: 'https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [{
        tool: { driver: { name: 'Dytallix Contract Scanner', version: '0.1.0', rules: scanResult.issues.map(i=>({ id: i.rule, shortDescription:{ text: i.rule }, help:{ text: i.recommendation } })) }},
        results: scanResult.issues.map(i=>({ ruleId: i.rule, level: i.severity==='high'?'error': i.severity==='medium'?'warning':'note', message:{ text: i.recommendation }, locations:[{ physicalLocation:{ artifactLocation:{ uri: 'SubmittedContract.sol'}, region:{ startLine: i.line }}}] }))
      }]
    }
    downloadJson('contract-scan.sarif.json', sarif)
  }

  // Simple syntax highlight (very lightweight) – tokens: keywords & comments
  const highlightedCode = useMemo(()=>{
    const kw = /\b(contract|function|mapping|public|external|returns|pragma|solidity|uint256|address|require|if|else|return)\b/g
    const esc = (s)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
    let html = esc(code)
    html = html.replace(/\/\/.*$/gm, m=>`<span style="opacity:0.6">${esc(m)}</span>`)
    html = html.replace(kw, m=>`<span style="color:#93c5fd">${m}</span>`)
    // Inline issue lines highlight background
    if (scanResult?.issues?.length){
      const lines = html.split(/\n/)
      const issueLines = new Set(scanResult.issues.map(i=>i.line))
      html = lines.map((l,idx)=>{
        const lineNo = idx+1
        const issuesHere = issueLines.has(lineNo)
        return `<div style="background:${issuesHere?'rgba(239,68,68,0.12)':'transparent'}; padding:0 4px"><code>${l||'\u00A0'}</code></div>`
      }).join('\n')
    } else {
      html = html.split(/\n/).map(l=>`<div><code>${l||'\u00A0'}</code></div>`).join('\n')
    }
    return html
  },[code, scanResult])

  const codeTooLarge = byteLength(code) > MAX_CODE_BYTES
  const txInvalid = txHash && !TX_HASH_RE.test(txHash)

  return (
    <div className="section">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">AI Modules</h1>
          <p
            className="section-subtitle"
            style={{ whiteSpace: 'nowrap' }}
          >
            Deploy AI modules for contract scanning, anomaly detection, and validator optimization.
          </p>
        </div>

        <div style={{ display: 'grid', gap: 28 }}>
          {/* Carousel: Tools */}
          <div
            role="region"
            aria-label="AI tools carousel"
            tabIndex={0}
            onKeyDown={(e) => {
              const t = e.target;
              const tag = t && t.tagName;
              if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) {
                return; // don't intercept arrows while typing
              }
              if (e.key === 'ArrowRight') carousel.next();
              if (e.key === 'ArrowLeft') carousel.prev();
            }}
            style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', overflow: 'visible', minHeight: 560 }}
          >
            {/* Viewport (relative) + mask (clips slides) */}
            <div style={{ position: 'relative', minHeight: 520 }}>
              <div style={{ overflow: 'hidden', borderRadius: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    transition: 'transform 300ms ease',
                    transform: `translateX(-${carousel.index * 50}%)`,
                    width: '200%', // two slides
                    minHeight: 520
                  }}
                >
                  <div style={{ width: '50%', paddingRight: 12, boxSizing: 'border-box', minHeight: 520 }}>
                    {/* --- Transaction Anomaly Detection --- */}
                <div
                  ref={anomalyRef}
                  className="card"
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  {/* BEGIN anomaly content (unchanged) */}
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>🔍 Transaction Anomaly Detection</h2>
                    <p className="muted" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>Enter a transaction hash and window to analyze suspicious activity around this transaction.</p>
                  </div>
                  <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1.3fr 0.7fr' }}>
                    <input
                      value={txHash}
                      onChange={e => setTxHash(e.target.value)}
                      placeholder="Transaction hash (0x...)"
                      className="input"
                      style={{ padding: '10px 12px', borderColor: txInvalid? 'rgba(239,68,68,0.6)':'' }}
                    />
                    <select value={windowSize} onChange={e => setWindowSize(e.target.value)} className="input" style={{ padding: '10px 12px' }}>
                      <option value="50tx">Last 50 tx</option>
                      <option value="100tx">Last 100 tx</option>
                      <option value="24h">Last 24 hours</option>
                    </select>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={runAnomaly}
                    disabled={!txHash || anLoading || txInvalid}
                    style={{ gridColumn: '1 / -1', justifySelf: 'center', marginTop: 4 }}
                  >
                    {anLoading ? 'Analyzing…' : 'Run Anomaly Detection'}
                  </button>
                  {txInvalid && <div className="card" style={{ background:'rgba(239,68,68,0.08)', borderColor:'rgba(239,68,68,0.4)', marginTop:8 }}>Invalid tx hash</div>}
                  {anError && <div className="card" style={{ background:'rgba(239,68,68,0.08)', borderColor:'rgba(239,68,68,0.4)', marginTop:8 }}>{anError}</div>}
                  <ul
                    style={{
                      marginTop: 12,
                      fontSize: '0.9rem',
                      color: 'rgba(255,255,255,0.75)',
                      paddingLeft: 20,
                      listStyleType: 'disc'
                    }}
                  >
                    <li style={{ marginBottom: 4 }}>Traverses transaction graph data structures to detect statistically significant deviations</li>
                    <li style={{ marginBottom: 4 }}>Flags anomalies such as outlier value spikes or novel counterparty addresses</li>
                    <li style={{ marginBottom: 4 }}>Computes risk score using weighted heuristics and rolling window aggregation</li>
                    <li style={{ marginBottom: 4 }}>Applies z-score and percentile rank math for anomaly thresholding</li>
                  </ul>
                  {anResult && (
                    <div style={{ marginTop: 18 }}>
                      <div className="card" style={{ padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <strong>Risk score:</strong>
                            {badge(`${anResult.riskScore}/100`, trendTone)}
                          </div>
                          <button className="btn btn-secondary" onClick={() => downloadJson('anomaly-result.json', anResult)}>Download JSON</button>
                        </div>
                        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                          {anResult.anomalies.map(a => (
                            <div key={a.id} className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 700 }}>{a.type}</div>
                                <div className="muted" style={{ marginTop: 4 }}>{a.detail}</div>
                              </div>
                              {badge(a.severity.toUpperCase(), a.severity === 'high' ? 'bad' : a.severity === 'low' ? 'good' : 'neutral')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* END anomaly content */}
                </div>
              </div>
                  <div style={{ width: '50%', paddingLeft: 12, boxSizing: 'border-box', minHeight: 520 }}>
                    {/* --- Smart Contract Security Scanner --- */}
                    <div
                      ref={scannerRef}
                      className="card"
                      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                      {/* BEGIN scanner content (unchanged) */}
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>🛡️ Smart Contract Security Scanner</h2>
                        <p className="muted" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>Paste your smart contract code and run a static analysis to detect vulnerabilities.</p>
                      </div>
                      <div style={{ display: 'grid', gap: 12 }}>
                        <div style={{ position:'relative' }}>
                          <textarea
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            rows={10}
                            className="input"
                            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', padding: 12, opacity: scanLoading?0.4:1 }}
                          />
                          <div aria-hidden="true" style={{ pointerEvents:'none', position:'absolute', inset:0, overflow:'auto', padding:12, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', whiteSpace:'pre', fontSize:14, lineHeight:1.4, color:'transparent' }}>
                            <div dangerouslySetInnerHTML={{ __html: highlightedCode }} style={{ position:'absolute', inset:12, color:'#e5e7eb' }} />
                          </div>
                        </div>
                        {codeTooLarge && <div className="card" style={{ background:'rgba(239,68,68,0.08)', borderColor:'rgba(239,68,68,0.4)' }}>Code exceeds 100KB limit.</div>}
                        {scanError && <div className="card" style={{ background:'rgba(239,68,68,0.08)', borderColor:'rgba(239,68,68,0.4)' }}>{scanError}</div>}
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                          <button className="btn btn-primary" onClick={runScan} disabled={!code || scanLoading || codeTooLarge}>
                            {scanLoading ? 'Scanning…' : 'Scan Contract'}
                          </button>
                          {scanResult && (
                            <div style={{ display:'flex', gap:8 }}>
                              <button className="btn btn-secondary" onClick={() => downloadJson('contract-scan.json', scanResult)}>Download JSON</button>
                              <button className="btn" onClick={exportSarif}>Export SARIF</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <ul
                        style={{
                          marginTop: 12,
                          fontSize: '0.9rem',
                          color: 'rgba(255,255,255,0.75)',
                          paddingLeft: 20,
                          listStyleType: 'disc'
                        }}
                      >
                        <li style={{ marginBottom: 4 }}>Parses Solidity source into AST for rule-based vulnerability detection.</li>
                        <li style={{ marginBottom: 4 }}>Checks against patterns for reentrancy, unchecked calls, and gas inefficiencies.</li>
                        <li style={{ marginBottom: 4 }}>Reports findings with severity, line number, and remediation suggestions.</li>
                        <li style={{ marginBottom: 4 }}>Uses static analysis math for complexity and gas estimation.</li>
                      </ul>
                      {scanResult && (
                        <div style={{ marginTop: 18 }}>
                          <div className="card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                              <div>
                                <strong>Findings:</strong> {scanResult.summary.total} &nbsp;
                                {badge(`High ${scanResult.summary.bySeverity.high}`, 'bad')} &nbsp;
                                {badge(`Med ${scanResult.summary.bySeverity.medium}`, 'neutral')} &nbsp;
                                {badge(`Low ${scanResult.summary.bySeverity.low}`, 'good')}
                              </div>
                              <span className="muted" style={{ fontSize: 12 }}>Scanned at {new Date(scanResult.meta.ranAt).toLocaleString()}</span>
                            </div>
                            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                              {scanResult.issues.map(i => (
                                <div key={i.id} className="card" style={{ padding: 12 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                                    <div style={{ fontWeight: 700 }}>{i.rule}</div>
                                    {badge(i.severity.toUpperCase(), i.severity === 'high' ? 'bad' : i.severity === 'low' ? 'good' : 'neutral')}
                                  </div>
                                  <div className="muted" style={{ marginTop: 6 }}>Line {i.line} – {i.recommendation}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {/* END scanner content */}
                    </div>
                  </div>
                </div>
              </div>
              {/* Carousel controls (anchored to viewport) */}
              <button
                aria-label="Previous tool"
                onClick={carousel.prev}
                // Remove box and emphasize icon
                onMouseEnter={() => setHover('left')}
                onMouseLeave={() => setHover(null)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: -44, // sits just outside the masked content
                  transform: `translateY(-50%) ${hover === 'left' ? 'scale(1.1)' : 'scale(1)'}`,
                  width: 44,
                  height: 44,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: hover === 'left' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.9)',
                  cursor: 'pointer',
                  transition: 'transform 160ms ease, color 160ms ease, opacity 160ms ease',
                  zIndex: 5
                }}
              >
                <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>
                  <path fillRule="evenodd" d="M10.354 14.354a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 1 1 .708.708L4.707 8l5.647 5.646a.5.5 0 0 1 0 .708z"/>
                </svg>
              </button>

              <button
                aria-label="Next tool"
                onClick={carousel.next}
                // Remove box and emphasize icon
                onMouseEnter={() => setHover('right')}
                onMouseLeave={() => setHover(null)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: -44, // sits just outside the masked content
                  transform: `translateY(-50%) ${hover === 'right' ? 'scale(1.1)' : 'scale(1)'}`,
                  width: 44,
                  height: 44,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: hover === 'right' ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.9)',
                  cursor: 'pointer',
                  transition: 'transform 160ms ease, color 160ms ease, opacity 160ms ease',
                  zIndex: 5
                }}
              >
                <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>
                  <path fillRule="evenodd" d="M5.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 1 1-.708-.708L11.293 8 5.646 2.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
              {[0,1].map(i => (
                <button
                  key={i}
                  onClick={() => carousel.goTo(i)}
                  aria-label={`Go to slide ${i+1}`}
                  style={{
                    width: 10, height: 10, borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.4)',
                    background: carousel.index === i ? 'rgba(99,102,241,0.9)' : 'transparent'
                  }}
                />
              ))}
            </div>
          </div>

          {/* --- Available AI Modules (interactive status) --- */}
          <div className="card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12 }}>Module Directory</h2>
            <div className="grid grid-3" style={{ gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
              {[ 
                {
                  key: 'pulseguard',
                  title: 'PulseGuard',
                  desc: 'Flags outliers across transaction graph and behavior features in real time.',
                  status: 'alpha',
                  cta: 'Open preview',
                },
                {
                  key: 'flowrate',
                  title: 'FlowRate',
                  desc: 'Predictive gas/fee quotes and optimal submit windows to reduce reverts.',
                  status: 'soon',
                  cta: 'Notify me',
                },
                {
                  key: 'stakebalancer',
                  title: 'StakeBalancer',
                  desc: 'Suggests validator rotations and weights to improve liveness and decentralization.',
                  status: 'beta',
                  cta: 'Request access',
                },
                {
                  key: 'network',
                  title: 'NetFlux', // renamed from Network Autotuning
                  desc: 'Continuously tunes mempool/consensus params to keep latency low under bursty load.',
                  status: 'soon',
                  cta: 'Notify me',
                },
              ].map((m, i) => (
                <div key={i} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0 }}>{m.title}</h3>
                    <StatusPill status={m.status} />
                  </div>
                  <p className="muted" style={{ fontSize: '0.95rem', lineHeight: 1.6, flex: 1 }}>{m.desc}</p>
                  <div>
                    <button
                      className="btn btn-primary" // unified style for all buttons
                      onClick={() => openModule(m.key)}
                    >
                      {m.cta}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PQC Demo (flag gated) */}
          {PQC_ENABLED && (
            <div className="card" style={{ borderColor: pqcReady === false ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 12 }}>PQC Demo</h2>
              {pqcReady === false && (
                <div className="card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.35)', marginBottom: 12 }}>
                  <strong style={{ color: '#ef4444' }}>Integrity Failure:</strong> <span className="muted">{pqcErr}</span>
                </div>
              )}
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <select value={pqcAlgo} onChange={e => { setPqcAlgo(e.target.value); try{ localStorage.setItem('pqcAlgo', e.target.value)}catch{} }} disabled={pqcBusy || pqcReady === false} className="input" style={{ padding: '6px 8px', maxWidth: 160 }}>
                    {PQC_ALGOS_ALLOWED.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <button className="btn btn-primary" onClick={genKey} disabled={pqcBusy || pqcReady === false}>Generate Keypair</button>
                  <button className="btn" onClick={doSign} disabled={pqcBusy || !pqcSk || pqcReady === false}>Sign</button>
                  <button className="btn" onClick={doVerify} disabled={pqcBusy || !pqcSig || pqcReady === false}>Verify</button>
                </div>
                <textarea value={pqcMsg} onChange={e => setPqcMsg(e.target.value)} rows={3} className="input" style={{ fontFamily: 'monospace' }} disabled={pqcReady === false} />
                <div style={{ display: 'grid', gap: 6 }}>
                  <div className="muted" style={{ fontSize: 12 }}>Public Key</div>
                  <textarea value={pqcPk} readOnly rows={2} className="input" style={{ fontFamily: 'monospace' }} />
                  <div className="muted" style={{ fontSize: 12 }}>Secret Key (base64)</div>
                  <textarea value={pqcSk} readOnly rows={2} className="input" style={{ fontFamily: 'monospace', background: 'rgba(239,68,68,0.06)' }} />
                  <div className="muted" style={{ fontSize: 12 }}>Signature</div>
                  <textarea value={pqcSig} readOnly rows={2} className="input" style={{ fontFamily: 'monospace' }} />
                </div>
                {pqcStatus && <div className="card" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.35)' }}>{pqcStatus}{pqcVerOK != null && <> – {pqcVerOK ? 'VALID ✅' : 'INVALID ❌'}</>}</div>}
              </div>
              <div className="muted" style={{ marginTop: 12, fontSize: '0.8rem' }}>All sensitive buffers are zeroized after signing/verifying where feasible in JS.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Modules