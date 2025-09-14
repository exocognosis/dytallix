import React, { useEffect, useMemo, useRef, useState } from 'react'
import '../styles/global.css'
import { useNavigate } from 'react-router-dom'

// Local storage key used by Wallet page
const LS_KEY = 'dyt_wallet_v1'

// Helpers
const sleep = (ms) => new Promise((res) => setTimeout(res, ms))
const bytesToHex = (u8) => Array.from(u8).map((b) => b.toString(16).padStart(2, '0')).join('')
const randomHex = (nBytes) => bytesToHex(crypto.getRandomValues(new Uint8Array(nBytes)))

async function fetchJson(url, opts = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally { clearTimeout(t) }
}

function loadWallet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') } catch { return null }
}

// Simple analytics stub
const Analytics = {
  log: (event, payload) => {
    try { console.debug('[analytics]', event, payload || {}) } catch {}
  }
}

// Toast helper
function useToast() {
  const [toast, setToast] = useState(null)
  const show = (msg, timeout = 3000) => {
    setToast(msg)
    if (timeout) setTimeout(() => setToast(null), timeout)
  }
  const node = toast ? (
    <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60 }}>
      <div className="badge badge-success" style={{ padding: '10px 12px', fontWeight: 800 }}>{toast}</div>
    </div>
  ) : null
  return { show, node }
}

// Contracts API base (attempt local server, fallback to relative path)
const CONTRACTS_API_BASES = [
  'http://localhost:3030',
  '/contracts-api',
]

async function deployTemplate(templateId, args, log) {
  for (const base of CONTRACTS_API_BASES) {
    try {
      log(`POST ${base}/contracts/deploy-template …`)
      const res = await fetchJson(`${base}/contracts/deploy-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, args })
      })
      if (res?.success) return res.data
      throw new Error(res?.error || 'Template deployment failed')
    } catch (e) {
      log(`API attempt failed at ${base}: ${e.message}`)
    }
  }
  // Fallback simulation
  await sleep(800)
  const address = `0x${randomHex(20)}`
  log('Simulated deployment complete.')
  return {
    address,
    name: templateId,
    templateId,
    network: 'simulation',
    abi: [],
    created_at: Date.now(),
    txHash: `0x${randomHex(32)}`,
  }
}

async function deployCustom(code, abi, log) {
  for (const base of CONTRACTS_API_BASES) {
    try {
      log(`POST ${base}/contracts/deploy …`)
      const res = await fetchJson(`${base}/contracts/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, abi })
      })
      if (res?.success) return res.data
      throw new Error(res?.error || 'Custom deployment failed')
    } catch (e) {
      log(`API attempt failed at ${base}: ${e.message}`)
    }
  }
  // Fallback simulation
  await sleep(800)
  const address = `0x${randomHex(20)}`
  log('Simulated deployment complete.')
  return { address, name: 'CustomContract', templateId: 'custom', network: 'simulation', abi: [], created_at: Date.now(), txHash: `0x${randomHex(32)}` }
}

// Handoff modal component
const HandoffModal = ({ open, onCancel, title, subtext, onViewNow }) => {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
      <div className="card" style={{ maxWidth: 520, width: '100%', display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div className="muted">{subtext}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>Dismiss</button>
          <button className="btn btn-primary" onClick={onViewNow}>View Now</button>
        </div>
      </div>
    </div>
  )
}

// Polling helpers against explorer API
const API = {
  tx: (hash) => `/api/transactions/${hash}`,
  addr: (a) => `/api/addresses/${encodeURIComponent(a)}`,
}
async function waitForIndexed({ txHash, address, timeoutMs = 35000, intervalMs = 1500, log }) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      if (address) {
        const info = await fetchJson(API.addr(address), {}, 8000)
        if (info && (info.address || info.balance != null)) return { kind: 'address' }
      }
      if (txHash) {
        const info = await fetchJson(API.tx(txHash), {}, 8000)
        if (info && (info.hash || info.status)) return { kind: 'tx' }
      }
    } catch {}
    await sleep(intervalMs)
    log && log('Waiting for explorer indexing…')
  }
  return { kind: address ? 'address' : 'tx', timedOut: true }
}

const defaultCustomCode = `// Dytallix PQC-enabled smart contract scaffold
// Notes:
// - On Dytallix, transaction signatures leverage post-quantum primitives.
// - This sample is a minimal Solidity-like scaffold for illustration.
pragma solidity ^0.8.20;

contract CustomContract {
    event ValueChanged(uint256 newValue);
    uint256 private value;
    function setValue(uint256 _v) public {
        value = _v;
        emit ValueChanged(_v);
    }
    function getValue() public view returns (uint256) {
        return value;
    }
}
`

function useMonaco(containerRef, initialValue, onChange) {
  const editorRef = useRef(null)
  useEffect(() => {
    let disposed = false
    let monaco

    async function load() {
      if (!containerRef.current) return
      // Load Monaco from CDN (no build-time dep)
      await new Promise((resolve) => {
        if (window.require && window.monaco) return resolve()
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs/loader.min.js'
        s.onload = () => {
          window.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs' } })
          window.require(['vs/editor/editor.main'], () => resolve())
        }
        document.body.appendChild(s)
      })
      if (disposed) return
      monaco = window.monaco
      const editor = monaco.editor.create(containerRef.current, {
        value: initialValue || '',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        roundedSelection: true,
      })
      editor.onDidChangeModelContent(() => {
        const val = editor.getValue()
        onChange && onChange(val)
      })
      editorRef.current = editor
    }

    load()
    return () => {
      disposed = true
      if (editorRef.current) {
        editorRef.current.dispose()
        editorRef.current = null
      }
    }
  }, [containerRef])
  return editorRef
}

const TemplateCard = ({ title, description, params, onDeploy, onPreview, accentClass }) => (
  <div className={`card ${accentClass || ''}`} style={{ display: 'grid', gap: 10 }}>
    <div>
      <div style={{ fontWeight: 800 }}>{title}</div>
      <div className="muted">{description}</div>
    </div>
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {params}
    </div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button className="btn" onClick={onPreview}>Preview</button>
      <button className="btn btn-primary" onClick={onDeploy}>Deploy</button>
    </div>
  </div>
)

const Deploy = () => {
  const navigate = useNavigate()
  // Wallet
  const [wallet, setWallet] = useState(loadWallet())
  const hasWallet = !!wallet?.address

  // Logs & status
  const [logs, setLogs] = useState([])
  const [isDeploying, setIsDeploying] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [handoffLink, setHandoffLink] = useState(null)
  const [handoffTitle, setHandoffTitle] = useState('Finalizing Deployment…')
  const [handoffSub, setHandoffSub] = useState('Waiting for the explorer to index your contract (this can take a few seconds).')
  const [lastDeployment, setLastDeployment] = useState(null)
  const logRef = useRef(null)
  const { show: showToast, node: toastNode } = useToast()
  const pushLog = (line) => setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  // Template form states
  const [erc20, setErc20] = useState({ name: 'DytalToken', symbol: 'DYT', supply: 1000000 })
  const [nft, setNft] = useState({ name: 'DytalNFT', symbol: 'DNFT', baseURI: 'ipfs://Qm…/' })
  const [msig, setMsig] = useState({ owners: '', threshold: 2 })

  // Custom editor
  const [code, setCode] = useState(defaultCustomCode)
  const editorContainerRef = useRef(null)
  useMonaco(editorContainerRef, code, setCode)

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); pushLog('Copied to clipboard') } catch { pushLog('Copy failed') }
  }

  const requireWallet = () => {
    if (hasWallet) return true
    pushLog('No wallet connected. Please connect a wallet on the Wallet page.')
    return false
  }

  async function afterDeployNavigate({ templateId, txHash, contractAddress }) {
    Analytics.log('deploy_succeeded', { templateId, txHash, contractAddress })
    showToast('Contract deployed. Opening in Explorer…', 2500)

    const templateTag = templateId || 'custom'
    const target = contractAddress ? 'contract' : 'tx'
    Analytics.log('explorer_autolink_navigated', { target })

    const deepLink = contractAddress
      ? `/explorer/contract/${encodeURIComponent(contractAddress)}?from=deploy&template=${encodeURIComponent(templateTag)}`
      : `/explorer/tx/${encodeURIComponent(txHash)}?from=deploy&template=${encodeURIComponent(templateTag)}`

    // Open handoff
    setHandoffOpen(true)
    setHandoffLink(deepLink)

    // Poll for indexing up to ~35s
    const { timedOut } = await waitForIndexed({ txHash, address: contractAddress, log: (m) => pushLog(m) })

    // Regardless of timeout, navigate. If timedOut, Explorer will show syncing state.
    navigate(deepLink)

    // Keep handoff visible briefly to avoid flashing
    setTimeout(() => setHandoffOpen(false), 400)
  }

  async function handleDeployERC20() {
    if (!requireWallet()) return
    setIsDeploying(true); setLogs([]); setLastDeployment(null)
    try {
      Analytics.log('deploy_started', { templateId: 'token' })
      pushLog('Preparing ERC-20 equivalent (PQC-aware) deployment…')
      // Map to template expected by backend
      const args = [erc20.name, erc20.symbol]
      const res = await deployTemplate('erc20-pqc', args, pushLog)
      setLastDeployment(res)
      pushLog(`Deployed at ${res.address}`)
      await afterDeployNavigate({ templateId: 'token', txHash: res.txHash, contractAddress: res.address })
    } catch (e) {
      pushLog(`Error: ${e.message}`)
    } finally { setIsDeploying(false) }
  }

  async function handleDeployNFT() {
    if (!requireWallet()) return
    setIsDeploying(true); setLogs([]); setLastDeployment(null)
    try {
      Analytics.log('deploy_started', { templateId: 'nft' })
      pushLog('Preparing ERC-721 equivalent (PQC-aware) deployment…')
      const args = [nft.name, nft.symbol, nft.baseURI]
      // Not yet implemented in backend; expect fallback simulation
      const res = await deployTemplate('nft-pqc', args, pushLog)
      setLastDeployment(res)
      pushLog(`Deployed at ${res.address}`)
      await afterDeployNavigate({ templateId: 'nft', txHash: res.txHash, contractAddress: res.address })
    } catch (e) { pushLog(`Error: ${e.message}`) } finally { setIsDeploying(false) }
  }

  async function handleDeployMsig() {
    if (!requireWallet()) return
    setIsDeploying(true); setLogs([]); setLastDeployment(null)
    try {
      Analytics.log('deploy_started', { templateId: 'multisig' })
      pushLog('Preparing Multi-Sig Wallet (PQC-aware) deployment…')
      const owners = msig.owners.split(/[ ,\n\t]+/).filter(Boolean)
      const args = [owners, Number(msig.threshold) || 2]
      const res = await deployTemplate('multisig-pqc', args, pushLog)
      setLastDeployment(res)
      pushLog(`Deployed at ${res.address}`)
      await afterDeployNavigate({ templateId: 'multisig', txHash: res.txHash, contractAddress: res.address })
    } catch (e) { pushLog(`Error: ${e.message}`) } finally { setIsDeploying(false) }
  }

  function validateCustom(code) {
    const errors = []
    if (!code || code.trim().length < 20) errors.push('Code is too short')
    if (!/contract\s+\w+/.test(code)) errors.push('No contract declaration found')
    return errors
  }

  async function handleDeployCustom() {
    if (!requireWallet()) return
    const errs = validateCustom(code)
    if (errs.length) { pushLog('Validation failed: ' + errs.join('; ')); return }
    setIsDeploying(true); setLogs([]); setLastDeployment(null)
    try {
      Analytics.log('deploy_started', { templateId: 'custom' })
      pushLog('Deploying custom contract…')
      const res = await deployCustom(code, [], pushLog)
      setLastDeployment(res)
      pushLog(`Deployed at ${res.address}`)
      await afterDeployNavigate({ templateId: 'custom', txHash: res.txHash, contractAddress: res.address })
    } catch (e) { pushLog(`Error: ${e.message}`) } finally { setIsDeploying(false) }
  }

  // Template previews (solidity-like minimal snippets; PQC note in comments)
  const PREVIEWS = {
    erc20: `// PQC-enabled ERC20-equivalent (simplified)
pragma solidity ^0.8.20;
contract DytERC20 {
  // Signatures verified by Dytallix PQC layer
  string public name; string public symbol; uint8 public decimals = 18;
  uint256 public totalSupply; mapping(address=>uint256) public balanceOf;
  event Transfer(address indexed from, address indexed to, uint256 value);
  constructor(string memory n, string memory s, uint256 supply) { name=n; symbol=s; totalSupply=supply; balanceOf[msg.sender]=supply; }
  function transfer(address to, uint256 amt) public returns (bool) { require(balanceOf[msg.sender] >= amt, 'bal'); balanceOf[msg.sender]-=amt; balanceOf[to]+=amt; emit Transfer(msg.sender,to,amt); return true; }
}`,
    nft: `// PQC-enabled ERC721-equivalent (simplified)
pragma solidity ^0.8.20;
contract DytERC721 {
  // Signatures verified by Dytallix PQC layer
  string public name; string public symbol; string public baseURI; uint256 public nextId;
  mapping(uint256=>address) public ownerOf; event Transfer(address indexed from,address indexed to,uint256 indexed tokenId);
  constructor(string memory n,string memory s,string memory b){name=n;symbol=s;baseURI=b;}
  function mint(address to) public returns (uint256 id){id=++nextId; ownerOf[id]=to; emit Transfer(address(0),to,id);} 
}`,
    multisig: `// PQC-aware MultiSig (simplified)
pragma solidity ^0.8.20;
contract DytMultiSig {
  address[] public owners; uint256 public threshold; mapping(bytes32=>uint256) public approvals;
  constructor(address[] memory _owners,uint256 _thr){owners=_owners;threshold=_thr;}
  function submitTx(bytes calldata data) public returns(bytes32 h){h=keccak256(data);} 
  function approve(bytes32 h) public { approvals[h]++; /* PQC signature checks handled off-chain */ }
  function executed(bytes32 h) public view returns(bool){ return approvals[h]>=threshold; }
}`,
  }

  const [preview, setPreview] = useState(null)

  return (
    <div className="section">
      {/* Page-specific responsive styles and local accents */}
      <style>{`
        .deploy-grid { display: grid; gap: 16px; grid-template-columns: 2fr 1fr; }
        @media (max-width: 1024px) { .deploy-grid { grid-template-columns: 1fr; } }
        .editor-container { height: 280px; border: 1px solid var(--surface-border); border-radius: 12px; overflow: hidden; background: #0b1220; }
        .log-console { height: 260px; overflow: auto; background: rgba(2,6,23,0.6); border: 1px solid var(--surface-border); border-radius: 12px; padding: 12px; font-family: Menlo, Monaco, monospace; font-size: 12px; }
        .templates-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .accent-blue{box-shadow: 0 0 0 1px rgba(59,130,246,.35) inset}
        .accent-purple{box-shadow: 0 0 0 1px rgba(139,92,246,.35) inset}
        .accent-amber{box-shadow: 0 0 0 1px rgba(245,158,11,.35) inset}
        .accent-cyan{box-shadow: 0 0 0 1px rgba(34,211,238,.35) inset}
        .pill{padding:2px 8px;border-radius:9999px;font-size:.75rem}
        .pill.good{background:rgba(16,185,129,.15);color:#34D399}
        .pill.bad{background:rgba(239,68,68,.15);color:#F87171}
        .kpi{display:flex;justify-content:space-between;align-items:center}
      `}</style>
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">Deploy</h1>
          <p className="section-subtitle">Deploy PQC-aware contracts to your Dytallix testnet or local node.</p>
        </div>

        <div className="deploy-grid">
          {/* Left: Templates and Custom */}
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Wallet Connection */}
            <div className="card" style={{ borderTop: '3px solid var(--primary-400)', paddingTop: 16 }}>
              <div className="kpi">
                <div style={{ fontWeight: 800, color: 'var(--primary-400)' }}>Wallet Connection</div>
                <span className={`pill ${hasWallet ? 'good' : 'bad'}`}>{hasWallet ? 'Connected' : 'Disconnected'}</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div className="muted" style={{ overflowWrap: 'anywhere' }}>{hasWallet ? wallet.address : 'No wallet detected.'}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {hasWallet ? (
                    <a className="btn" href="/wallet">Manage Wallet</a>
                  ) : (
                    <a className="btn" href="/wallet">Connect Wallet</a>
                  )}
                </div>
              </div>
            </div>

            {/* Contract Templates */}
            <div className="card" style={{ display: 'grid', gap: 12, borderTop: '3px solid var(--primary-400)', paddingTop: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--primary-400)' }}>Build & Deploy</h3>
              <p className="muted">Choose a template and deploy. Inputs are compact for speed.</p>
              <div className="templates-grid">

              {/* ERC-20 */}
              <TemplateCard
                title="Token Contract (ERC-20 equivalent)"
                description="Fungible tokens for governance and utility."
                params={(
                  <>
                    <div>
                      <label className="form-label">Name</label>
                      <input className="input" value={erc20.name} onChange={(e) => setErc20({ ...erc20, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Symbol</label>
                      <input className="input" value={erc20.symbol} onChange={(e) => setErc20({ ...erc20, symbol: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Initial Supply</label>
                      <input type="number" className="input" value={erc20.supply} onChange={(e) => setErc20({ ...erc20, supply: Number(e.target.value || 0) })} />
                    </div>
                  </>
                )}
                onPreview={() => setPreview({ title: 'Token Contract Preview', code: PREVIEWS.erc20 })}
                onDeploy={handleDeployERC20}
                accentClass="accent-blue"
              />

              {/* ERC-721 */}
              <TemplateCard
                title="NFT Contract (ERC-721 equivalent)"
                description="Unique asset minting with base URI."
                params={(
                  <>
                    <div>
                      <label className="form-label">Name</label>
                      <input className="input" value={nft.name} onChange={(e) => setNft({ ...nft, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Symbol</label>
                      <input className="input" value={nft.symbol} onChange={(e) => setNft({ ...nft, symbol: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Base URI</label>
                      <input className="input" value={nft.baseURI} onChange={(e) => setNft({ ...nft, baseURI: e.target.value })} />
                    </div>
                  </>
                )}
                onPreview={() => setPreview({ title: 'NFT Contract Preview', code: PREVIEWS.nft })}
                onDeploy={handleDeployNFT}
                accentClass="accent-purple"
              />

              {/* MultiSig */}
              <TemplateCard
                title="Multi-Sig Wallet Contract"
                description="Secure multi-signature approvals."
                params={(
                  <>
                    <div>
                      <label className="form-label">Owners (comma or space separated)</label>
                      <input className="input" value={msig.owners} onChange={(e) => setMsig({ ...msig, owners: e.target.value })} placeholder="0xabc.. 0xdef.. 0x123.." />
                    </div>
                    <div>
                      <label className="form-label">Threshold</label>
                      <input type="number" className="input" value={msig.threshold} onChange={(e) => setMsig({ ...msig, threshold: Number(e.target.value || 1) })} />
                    </div>
                  </>
                )}
                onPreview={() => setPreview({ title: 'Multi-Sig Preview', code: PREVIEWS.multisig })}
                onDeploy={handleDeployMsig}
                accentClass="accent-amber"
              />
              </div>
            </div>
          </div>

          {/* Right: Guide & Status */}
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="card" style={{ display: 'grid', gap: 10, borderTop: '3px solid var(--primary-400)', paddingTop: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--primary-400)' }}>How to Deploy</h3>
              <ol style={{ marginLeft: 18, color: 'var(--text-muted)' }}>
                <li>Connect your Dytallix wallet on the Wallet page.</li>
                <li>Pick a template or write a custom contract.</li>
                <li>Fill required params: <code>name</code>, <code>symbol</code>, <code>baseURI</code>, <code>owners</code>, etc.</li>
                <li>Click Deploy and watch live logs.</li>
                <li>Copy the contract address and open it in the Explorer.</li>
              </ol>
            </div>

            <div className="card" style={{ display: 'grid', gap: 10, borderTop: '3px solid var(--success-500)', paddingTop: 16 }}>
              <h3 style={{ margin: 0, color: 'var(--success-500)' }}>Deployment Status</h3>
              <div className="log-console" ref={logRef}>
                {logs.length ? logs.map((l, i) => (<div key={i}>{l}</div>)) : <div className="muted">No logs yet.</div>}
              </div>
              {isDeploying && <div className="badge badge-info" style={{ width: 'fit-content' }}>Deploying…</div>}
              {!isDeploying && (lastDeployment ? (
                <div className="badge badge-success" style={{ width: 'fit-content' }}>Success</div>
              ) : (logs.some(l => l.includes('Error:')) && <div className="badge badge-danger" style={{ width: 'fit-content' }}>Error</div>))}
              {lastDeployment && (
                <div className="card" style={{ background: 'rgba(30,41,59,0.35)', borderColor: 'rgba(148,163,184,0.25)' }}>
                  <div style={{ fontWeight: 800 }}>Deployed Contract</div>
                  <div className="muted">Address</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <code style={{ wordBreak: 'break-all' }}>{lastDeployment.address}</code>
                    <button className="btn" onClick={() => copy(lastDeployment.address)}>Copy</button>
                    <button className="btn btn-secondary" onClick={() => afterDeployNavigate({ templateId: lastDeployment.templateId || 'custom', txHash: lastDeployment.txHash, contractAddress: lastDeployment.address })}>Open in Explorer</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Custom Contract (full width) */}
        <div className="card accent-cyan" style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <h3 style={{ margin: 0 }}>Custom Contract</h3>
          <p className="muted">Basic validation runs client-side.</p>
          <div ref={editorContainerRef} className="editor-container" />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleDeployCustom} disabled={isDeploying}>Deploy Custom Contract</button>
          </div>
        </div>
      </div>

      {/* Handoff modal */}
      <HandoffModal
        open={handoffOpen}
        title={handoffTitle}
        subtext={handoffSub}
        onCancel={() => setHandoffOpen(false)}
        onViewNow={() => { if (handoffLink) navigate(handoffLink) }}
      />

      {/* Preview Modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 900, width: '100%', display: 'grid', gap: 12 }}>
            <h3 style={{ marginTop: 0 }}>{preview.title}</h3>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', background: 'rgba(2,6,23,0.5)', padding: 12, border: '1px solid var(--surface-border)', borderRadius: 10 }}><code>{preview.code}</code></pre>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setPreview(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toastNode}
    </div>
  )
}

export default Deploy
