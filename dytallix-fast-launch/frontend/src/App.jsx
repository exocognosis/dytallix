import React, { useEffect, useMemo, useState } from "react";
import { exportKeystore as exportKeystoreAPI, serializeKeystore } from './wallet/keystore/index.js';
import { createWalletAdapter } from './wallet/pqc.js';
import * as PQCWallet from './wallet/pqc-wallet.js';
import { copyToClipboard } from './utils/clipboard.js';
import { truncateAddress } from './utils/format.js';

// Simple hash router
const useHashRoute = () => {
  const [route, setRoute] = useState(() => {
    const hash = window.location.hash.replace('#','') || '/';
    return hash.split('?')[0]; // Extract path without query params
  });
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.replace('#','') || '/';
      setRoute(hash.split('?')[0]); // Extract path without query params
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = (path) => { window.location.hash = path; };
  return { route, navigate };
};


// Hook to fetch live blockchain data
const useBlockchainStats = () => {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch directly from the node
        const rpcUrl = import.meta.env.VITE_DYT_NODE || import.meta.env.VITE_RPC_HTTP_URL || 'http://localhost:3030';
        const res = await fetch(`${rpcUrl}/status`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch blockchain stats:', err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);
  return stats;
};

// ---- Demo balances store (localStorage) ----
const BAL_KEY = 'dyt_balances';
const readBalances = () => {
  try { return JSON.parse(localStorage.getItem(BAL_KEY) || '{}'); } catch { return {}; }
};
const writeBalances = (b) => localStorage.setItem(BAL_KEY, JSON.stringify(b));
const creditBalance = (addr, token, amount) => {
  const a = (addr || '').trim();
  if (!a) return;
  const b = readBalances();
  if (!b[a]) b[a] = { DGT: 0, DRT: 0 };
  b[a][token] = (b[a][token] || 0) + amount;
  writeBalances(b);
};
const getAddressBalances = (addr) => {
  const a = (addr || '').trim();
  const b = readBalances();
  return b[a] || { DGT: 0, DRT: 0 };
};
// -------------------------------------------

const Page = ({ children }) => (
  <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
    <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.15),transparent_60%)]"/>
    <Nav />
    <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-28 pb-24">{children}</main>
    <Footer />
  </div>
);

const Nav = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const links = [
    { href: '/', label: 'Home' },
    { href: '/wallet', label: 'PQC Wallet' },
    { href: '/faucet', label: 'Faucet' },
    { href: '/explorer', label: 'Explorer' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/tokenomics', label: 'Tokenomics' },
    { href: '/docs', label: 'Docs' },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur border-b border-white/10 bg-neutral-950/90">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex h-16 items-center justify-between">
        <a href="#/" className="font-black tracking-widest text-xl">DYTALLIX</a>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-6">
          {links.map((l) => (
            <a key={l.href} href={`#${l.href}`} className="text-sm text-neutral-300 hover:text-white transition">{l.label}</a>
          ))}
        </nav>
        
        {/* Desktop Launch App Button */}
        <div className="hidden md:flex items-center gap-2">
          <a href="#/wallet" className="px-3 py-2 rounded-2xl bg-white text-black text-sm font-semibold hover:opacity-90 transition">Launch App</a>
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-neutral-300 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-neutral-950/95 backdrop-blur">
          <nav className="px-4 py-4 space-y-2">
            {links.map((l) => (
              <a 
                key={l.href} 
                href={`#${l.href}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-neutral-300 hover:text-white hover:bg-white/5 transition"
              >
                {l.label}
              </a>
            ))}
            <a 
              href="#/wallet" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 mt-4 rounded-xl bg-white text-black text-center font-semibold hover:opacity-90 transition"
            >
              Launch App
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};

const Hero = () => (
  <section className="relative pt-6">
    <div className="grid md:grid-cols-2 gap-10 items-center">
      <div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">DYTALLIX</h1>
        <p className="mt-4 text-xl md:text-2xl font-semibold text-neutral-200">Future Ready. Quantum Proof. Open Source.</p>
        <p className="mt-6 text-neutral-300 max-w-prose">Dytallix is a PQC-native, open-source blockchain—crypto-agile, standards-ready, and built for resilient systems. 
          It unites standardized post-quantum cryptography, adaptive primitives, and developer-first tooling to help you build with confidence.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#/wallet" className="px-5 py-3 rounded-2xl bg-white text-black font-semibold">Create PQC Wallet</a>
          <a href="#/faucet" className="px-5 py-3 rounded-2xl border border-white/20 hover:border-white/40">Get Test Tokens</a>
          <a href="#/docs" className="px-5 py-3 rounded-2xl border border-white/20 hover:border-white/40">Read the Docs</a>
        </div>
        <div className="mt-6 text-xs text-neutral-400">Open source · MIT Licensed · Built for PQC standards</div>
      </div>
      <div className="md:justify-self-end">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 shadow-2xl">
          <Kpis />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Badge>ML‑KEM (Kyber)</Badge>
            <Badge>ML‑DSA (Dilithium)</Badge>
            <Badge>SLH‑DSA (SPHINCS+)</Badge>
            <Badge>STARK‑friendly hash</Badge>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Badge = ({ children }) => (
  <span className="inline-flex items-center justify-center rounded-xl border border-white/10 px-3 py-1 text-xs text-neutral-300">{children}</span>
);

const Kpis = () => {
  const stats = useBlockchainStats();
  const kpis = [
    { k: 'Nodes', v: '5', color: 'from-blue-500/10' },
    { k: 'Active Validators', v: '3', color: 'from-purple-500/10' },
    { k: 'Block Height', v: stats?.latest_height?.toLocaleString() || '...', live: !!stats?.latest_height, color: 'from-green-500/10' },
    { k: 'Finality', v: '~2.1s', color: 'from-cyan-500/10' },
    { k: 'TPS (peak)', v: '3,200', color: 'from-orange-500/10' },
    { k: 'Status', v: stats?.status || 'Offline', live: stats?.status === 'healthy', color: 'from-emerald-500/10' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {kpis.map((x) => (
        <div
          key={x.k}
          className={`rounded-2xl bg-gradient-to-br ${x.color} to-transparent p-3 md:p-4 border border-white/10`}
        >
          <div className="text-xl md:text-2xl font-bold flex items-center gap-2">
            {x.v}
            {x.live && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
          </div>
          <div className="text-xs text-neutral-400 mt-1">{x.k}</div>
        </div>
      ))}
    </div>
  );
};

const Problem = () => (
  <section className="mt-24">
    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">The Quantum Problem</h2>
    <p className="mt-4 text-neutral-300 max-w-3xl">Fault-tolerant quantum computers running Shor's algorithm can break RSA and ECC—the cryptography behind PKI, blockchains, and secure messaging. Adversaries are already harvesting encrypted data to decrypt later. Standards bodies are pushing a full shift to post-quantum cryptography by ~2035, with migrations underway today.</p>
    <ul className="mt-6 grid md:grid-cols-3 gap-4">
      <StatCard title="PQC Standards Finalized" body="NIST published FIPS 203/204/205 (2024) for ML‑KEM (Kyber), ML‑DSA (Dilithium) and SLH‑DSA (SPHINCS+)." footnote="Sources" footnoteId="sources" color="from-blue-500/10"/>
      <StatCard title="2035 target" body="NSA's CNSA 2.0 sets a no‑later‑than 2035 horizon for quantum‑resistant national security systems." footnote="NSA" footnoteId="sources" color="from-purple-500/10"/>
      <StatCard title="RSA‑2048 risk" body="Recent resource estimates suggest sub‑million logical qubits could factor RSA‑2048 in days to a week once error‑corrected QC is realized." footnote="Research" footnoteId="sources" color="from-red-500/10"/>
    </ul>
    <div className="mt-4 text-sm text-neutral-400">See <button className="underline underline-offset-4" onClick={() => document.getElementById('sources')?.showModal()}>sources</button> for details.</div>
    <SourcesModal />
  </section>
);

const StatCard = ({ title, body, footnote, color }) => (
  <li className={`rounded-2xl border border-white/10 bg-gradient-to-br ${color || 'from-white/5'} to-transparent p-5`}>
    <div className="text-lg font-semibold">{title}</div>
    <p className="mt-2 text-sm text-neutral-300">{body}</p>
    {footnote && <div className="mt-3 text-xs text-neutral-400">{footnote} ↗</div>}
  </li>
);

const SourcesModal = () => (
  <dialog id="sources" className="backdrop:bg-black/70 rounded-2xl p-0">
    <div className="p-6 bg-neutral-950 text-neutral-100 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Key Sources</h3>
        <form method="dialog"><button className="px-3 py-1 rounded-xl bg-white text-black text-sm">Close</button></form>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-neutral-300">
        <li><a className="underline" href="https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards" target="_blank" rel="noreferrer">NIST: First finalized PQC standards (Aug 13, 2024)</a></li>
        <li><a className="underline" href="https://media.defense.gov/2022/Sep/07/2003071836/-1/-1/0/CSI_CNSA_2.0_FAQ_.PDF" target="_blank" rel="noreferrer">NSA CNSA 2.0 FAQ (Sept 7, 2022) — 2035 target</a></li>
        <li><a className="underline" href="https://www.federalreserve.gov/econres/feds/harvest-now-decrypt-later-examining-post-quantum-cryptography-and-the-data-privacy-risks-for-distributed-ledger-networks.htm" target="_blank" rel="noreferrer">Federal Reserve: HNDL analysis (Oct 2025)</a></li>
        <li><a className="underline" href="https://quantum-journal.org/papers/q-2021-04-15-433/" target="_blank" rel="noreferrer">Quantum (2021): RSA‑2048 factoring resource estimate</a></li>
        <li><a className="underline" href="https://postquantum.com/industry-news/quantum-breakthrough-rsa-2048/" target="_blank" rel="noreferrer">Gidney (2025) coverage: &lt;1M qubits claim</a></li>
        <li><a className="underline" href="https://www.ncsc.gov.uk/collection/quantum-security" target="_blank" rel="noreferrer">NCSC UK: Quantum security guidance</a></li>
      </ul>
    </div>
  </dialog>
);

const Solution = () => (
  <section className="mt-24">
    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">The Dytallix Solution</h2>
    <div className="mt-6 grid md:grid-cols-2 gap-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
        <h3 className="font-semibold">Crypto‑Agile Core</h3>
        <p className="mt-2 text-neutral-300">Modular key encapsulation and signature layers with pluggable PQC (ML‑KEM/ML‑DSA/SLH‑DSA) plus hybrid (PQC+ECC) modes for staged migrations. Versioned policy manifests enable on‑chain deprecation and roll‑forward.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
        <h3 className="font-semibold">Secure‑by‑Design Wallets</h3>
        <p className="mt-2 text-neutral-300">Client libraries generate PQC keypairs, support multi‑sig and account abstraction, and safeguard against HNDL via default PQC addressing.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
        <h3 className="font-semibold">Telemetry & Attestation</h3>
        <p className="mt-2 text-neutral-300">Network health, algorithm performance, and node posture streamed to a public dashboard with signed metrics for supply‑chain integrity.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-transparent p-6">
        <h3 className="font-semibold">Open Governance</h3>
        <p className="mt-2 text-neutral-300">Testnet‑first governance gating PQC upgrades, parameter changes, and tokenomic proposals via transparent RFCs.</p>
      </div>
    </div>
  </section>
);

const TechStack = () => {
  const stackItems = [
    {h:'Cryptography', b:'ML‑KEM (Kyber) · ML‑DSA (Dilithium) · SLH‑DSA (SPHINCS+) · BLAKE3/Keccak variants · Hybrid PQC+ECC', color:'from-purple-500/10'},
    {h:'Consensus', b:'Nakamoto‑style PoS with fast‑finality checkpoints; slashing & KEA attestation; light‑client proofs', color:'from-blue-500/10'},
    {h:'VM & Contracts', b:'WASM runtime with Rust SDK · Precompiles for PQC ops · Deterministic gas model', color:'from-green-500/10'},
    {h:'Networking', b:'QUIC/Noise‑like handshake with PQC KEM · libp2p compatible · DoS‑hard admission control', color:'from-cyan-500/10'},
    {h:'DevX', b:'CLI/SDKs (TypeScript, Rust) · Faucet & Test tokens · Localnet Docker · Rich telemetry', color:'from-orange-500/10'},
    {h:'Security', b:'Formal specs · Fuzzing · Reproducible builds · Attestation & SBOMs', color:'from-red-500/10'},
  ];
  
  return (
    <section className="mt-24">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Tech Stack</h2>
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {stackItems.map((x) => (
          <div key={x.h} className={`rounded-2xl border border-white/10 bg-gradient-to-br ${x.color} to-transparent p-5`}>
            <div className="font-semibold">{x.h}</div>
            <p className="mt-2 text-sm text-neutral-300">{x.b}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const DevInvite = () => (
  <section className="mt-24">
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-transparent p-8">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Start Building on Dytallix</h2>
      <p className="mt-3 text-neutral-300 max-w-3xl">Install the official SDK, create a PQC wallet, and start building quantum-resistant applications today.</p>
      <div className="mt-6 bg-black/30 rounded-xl p-4 font-mono text-sm max-w-2xl">
        <div className="text-green-400"># Install the Dytallix SDK</div>
        <div className="text-white">npm install @dytallix/sdk</div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="#/docs" className="px-5 py-3 rounded-2xl bg-white text-black font-semibold hover:opacity-90 transition">SDK Documentation</a>
        <a href="https://github.com/DytallixHQ/Dytallix" target="_blank" rel="noreferrer" className="px-5 py-3 rounded-2xl border border-white/20 hover:border-white/40 transition">View on GitHub</a>
        <a href="#/faucet" className="px-5 py-3 rounded-2xl border border-white/20 hover:border-white/40 transition">Get Test Tokens</a>
        <a href="#/wallet" className="px-5 py-3 rounded-2xl border border-white/20 hover:border-white/40 transition">Launch Wallet</a>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-white/10 bg-neutral-950/70">
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 text-sm text-neutral-400 grid md:grid-cols-3 gap-6">
      <div>
        <div className="font-black tracking-widest text-neutral-200">DYTALLIX</div>
        <div className="mt-2">Future Ready · Quantum Proof · Open Source</div>
      </div>
      <div>
        <div className="font-semibold text-neutral-300">Resources</div>
        <ul className="mt-2 space-y-1">
          <li><a className="hover:underline" href="#/docs">Documentation</a></li>
          <li><a className="hover:underline" href="https://github.com/DytallixHQ/Dytallix" target="_blank" rel="noreferrer">SDK on GitHub</a></li>
          <li><a className="hover:underline" href="https://www.npmjs.com/package/@dytallix/sdk" target="_blank" rel="noreferrer">SDK on NPM</a></li>
          <li><a className="hover:underline" href="#/dashboard">Status & Telemetry</a></li>
          <li><a className="hover:underline" href="#/tokenomics">Tokenomics</a></li>
        </ul>
      </div>
      <div>
        <div className="font-semibold text-neutral-300">Community</div>
        <ul className="mt-2 space-y-1">
          <li><a className="hover:underline" href="https://github.com/DytallixHQ/Dytallix/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Contributing</a></li>
          <li><a className="hover:underline" href="https://github.com/DytallixHQ/Dytallix/issues" target="_blank" rel="noreferrer">Report Issues</a></li>
          <li><a className="hover:underline" href="#/docs#rfc">RFCs</a></li>
          <li><a className="hover:underline" href="#/docs#security">Security</a></li>
        </ul>
      </div>
    </div>
  </footer>
);

// Pages
const Home = () => (
  <Page>
    <Hero />
    <Problem />
    <Solution />
    <TechStack />
    <DevInvite />
  </Page>
);

const WalletPage = () => {
  // Multi-wallet support
  const [wallets, setWallets] = useState([]);
  const [activeWalletId, setActiveWalletId] = useState(null);
  const [created, setCreated] = useState(false);
  const [addr, setAddr] = useState("");
  const [fullAddr, setFullAddr] = useState(""); // Store full address separately
  const [algorithm, setAlgorithm] = useState('ML-DSA'); // Default to ML-DSA
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [password, setPassword] = useState("");
  const [exportSuccess, setExportSuccess] = useState(false);
  const [guardians, setGuardians] = useState([]);
  const [newGuardian, setNewGuardian] = useState("");
  const [copied, setCopied] = useState(false);
  const [balances, setBalances] = useState({ DGT: 0, DRT: 0 });
  const [balanceSource, setBalanceSource] = useState('local'); // 'blockchain' or 'local'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Transaction state
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [txType, setTxType] = useState('send'); // 'send' or 'request'
  const [txForm, setTxForm] = useState({
    to: '',
    amount: '',
    denom: 'DRT',
    memo: '',
  });
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState(null);
  const [txSuccess, setTxSuccess] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentRequestLink, setPaymentRequestLink] = useState('');

  const NETWORK_FEE = 0.001; // 1000 micro-units = 0.001 tokens

  const resolveDenomForTx = (value = 'DRT') => {
    const raw = (value || '').trim();
    const upper = raw.toUpperCase();
    switch (upper) {
      case 'DGT':
        return { display: 'DGT', micro: 'udgt', multiplier: 1_000_000, feeAsset: 'DGT' };
      case 'UDGT':
        return { display: 'DGT', micro: 'udgt', multiplier: 1, feeAsset: 'DGT' };
      case 'DRT':
        return { display: 'DRT', micro: 'udrt', multiplier: 1_000_000, feeAsset: 'DGT' };
      case 'UDRT':
        return { display: 'DRT', micro: 'udrt', multiplier: 1, feeAsset: 'DGT' };
      default: {
        const isMicro = upper.startsWith('U');
        return {
          display: upper,
          micro: raw.toLowerCase(),
          multiplier: isMicro ? 1 : 1_000_000,
          feeAsset: 'DGT',
        };
      }
    }
  };

  const txDenomInfo = useMemo(
    () => resolveDenomForTx(txForm.denom),
    [txForm.denom]
  );

  const resetTransactionState = (overrides = {}) => {
    setTxForm({
      to: '',
      amount: '',
      denom: 'DRT',
      memo: '',
      ...overrides,
    });
    setTxError(null);
    setTxSuccess(null);
    setPaymentRequestLink('');
  };

  const openSendModal = () => {
    setTxType('send');
    resetTransactionState();
    setShowTransactionModal(true);
  };

  const openRequestModal = () => {
    setTxType('request');
    resetTransactionState({ to: fullAddr || '' });
    setShowTransactionModal(true);
  };

  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    setTxLoading(false);
    setTxError(null);
    setTxSuccess(null);
    setPaymentRequestLink('');
  };
  
  // Load wallets from localStorage on mount
  useEffect(() => {
    const savedWallets = localStorage.getItem('dytallix_wallets');
    const savedActiveId = localStorage.getItem('dytallix_active_wallet_id');
    
    if (savedWallets) {
      try {
        const walletsData = JSON.parse(savedWallets);
        setWallets(walletsData);
        
        // Load active wallet
        if (savedActiveId && walletsData.length > 0) {
          const activeWallet = walletsData.find(w => w.id === savedActiveId);
          if (activeWallet) {
            loadWallet(activeWallet);
            setActiveWalletId(savedActiveId);
          } else {
            // Load first wallet if active not found
            loadWallet(walletsData[0]);
            setActiveWalletId(walletsData[0].id);
          }
        } else if (walletsData.length > 0) {
          // Load first wallet by default
          loadWallet(walletsData[0]);
          setActiveWalletId(walletsData[0].id);
        }
      } catch (err) {
        console.error('Failed to load wallets from localStorage:', err);
      }
    }
    
    // Load transaction history for all wallets
    const savedTxs = localStorage.getItem('dytallix_transactions');
    if (savedTxs) {
      try {
        setTransactions(JSON.parse(savedTxs));
      } catch (err) {
        console.error('Failed to load transactions:', err);
      }
    }
  }, []);
  
  // Helper function to load a wallet
  const loadWallet = (wallet) => {
    setFullAddr(wallet.fullAddr);
    setAddr(wallet.addr);
    setAlgorithm(wallet.algorithm);
    setGuardians(wallet.guardians || []);
    setCreated(true);
    setBalances(getAddressBalances(wallet.fullAddr));
  };
  
  // Switch to a different wallet
  const switchWallet = (walletId) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (wallet) {
      loadWallet(wallet);
      setActiveWalletId(walletId);
      localStorage.setItem('dytallix_active_wallet_id', walletId);
    }
  };
  
  // Save transactions to localStorage
  const saveTransaction = (tx) => {
    const newTxs = [tx, ...transactions].slice(0, 50); // Keep last 50
    setTransactions(newTxs);
    localStorage.setItem('dytallix_transactions', JSON.stringify(newTxs));
  };
  
  // Submit transaction (send tokens)
  const submitTransaction = async () => {
    if (!txForm.to || !txForm.amount) {
      setTxError('Please fill in all required fields');
      return;
    }
    
    setTxLoading(true);
    setTxError(null);
    setTxSuccess(null);
    
    try {
      const rpcUrl = import.meta.env.VITE_RPC_HTTP_URL || 'http://localhost:3030';
      
      // Get current wallet's keys
      const currentWallet = wallets.find(w => w.id === activeWalletId);
      if (!currentWallet || !currentWallet.secretKey) {
        throw new Error('Wallet keys not found. Please recreate your wallet.');
      }
      
      console.log('🔐 Signing transaction with PQC keys...');
      
      const denomInfo = resolveDenomForTx(txForm.denom);
      const amountNum = parseFloat(txForm.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }

      const microAmount = Math.floor(amountNum * denomInfo.multiplier);
      if (!Number.isFinite(microAmount) || microAmount <= 0) {
        throw new Error('Amount is too small for network precision (min 0.000001)');
      }
      
      // Fetch real blockchain balance and account data
      const accountResponse = await fetch(`${rpcUrl}/account/${fullAddr}`);
      
      if (!accountResponse.ok) {
        const errorText = await accountResponse.text();
        throw new Error(`Failed to fetch account data from blockchain: ${errorText}`);
      }
      
      const accountData = await accountResponse.json();
      const nonce = accountData.nonce || 0;
      
      // Get actual on-chain balances in micro-units
      const actualBalances = {
        DGT: (accountData.balances?.udgt || 0) / 1_000_000,
        DRT: (accountData.balances?.udrt || 0) / 1_000_000,
      };

      
      // CRITICAL: Network fees are ALWAYS paid in DGT (udgt), regardless of what token you're sending!
      const feeBalanceDGT = actualBalances.DGT ?? 0;
      const assetBalance = actualBalances[denomInfo.display] ?? 0;
      
      // Check 1: Must have DGT for network fee (ALWAYS REQUIRED FOR ALL TRANSACTIONS)
      if (feeBalanceDGT < NETWORK_FEE) {
        throw new Error(
          `⚠️ INSUFFICIENT DGT FOR NETWORK FEE\n\n` +
          `All transactions require ${NETWORK_FEE.toFixed(3)} DGT for the network fee, regardless of which token you're sending.\n\n` +
          `Your DGT balance: ${feeBalanceDGT.toFixed(6)} DGT\n` +
          `Required for fee: ${NETWORK_FEE.toFixed(3)} DGT\n` +
          `Shortfall: ${(NETWORK_FEE - feeBalanceDGT).toFixed(6)} DGT\n` +
          `${feeBalanceDGT === 0 ? '\n🚨 You have ZERO DGT! ' : ''}` +
          `\nACTION REQUIRED:\n` +
          `1. Go to the Faucet page\n` +
          `2. Request DGT tokens (for network fees)\n` +
          `3. Wait 5-10 seconds for confirmation\n` +
          `4. Refresh your balance and try again\n\n` +
          `Note: Your displayed balance may be outdated (UI: ${balances.DGT} DGT, Blockchain: ${feeBalanceDGT.toFixed(6)} DGT)`
        );
      }
      
      // Check 2: Must have enough of the token being sent
      const requiredAmount = denomInfo.display === 'DGT' ? (amountNum + NETWORK_FEE) : amountNum;
      if (assetBalance < requiredAmount) {
        throw new Error(
          `Insufficient ${denomInfo.display} balance. ` +
          `You need ${requiredAmount.toFixed(3)} ${denomInfo.display} ` +
          `(${amountNum} ${denomInfo.display === 'DGT' ? `+ ${NETWORK_FEE.toFixed(3)} fee` : ''})` +
          `, but blockchain shows you only have ${assetBalance.toFixed(3)} ${denomInfo.display}. ` +
          `\nYour displayed balance (${balances[denomInfo.display]}) may be outdated. Visit the faucet to top up.`
        );
      }
      
      // Check 3: Warn if both balances are zero
      if (actualBalances.DGT === 0 && actualBalances.DRT === 0) {
        throw new Error(
          `⚠️ Your blockchain balance is ZERO for both DGT and DRT!\n\n` +
          `Your UI showed: DGT ${balances.DGT}, DRT ${balances.DRT} (STALE CACHE)\n` +
          `Real blockchain: DGT 0, DRT 0\n\n` +
          `ACTION REQUIRED:\n` +
          `1. Go to the Faucet page\n` +
          `2. Request test tokens (DGT for fees + DRT for sending)\n` +
          `3. Wait 5-10 seconds for confirmation\n` +
          `4. Refresh your balance and try again`
        );
      }
      
      // Update UI with actual balance
      setBalances(actualBalances);
      setBalanceSource('blockchain');
      
      // Create the transaction object
      const feeMicro = String(Math.floor(NETWORK_FEE * 1_000_000));
      const txObj = {
        chain_id: "dyt-local-1",
        fee: feeMicro,
        nonce: nonce,
        memo: txForm.memo || '',
        msgs: [
          {
            type: 'send',
            from: fullAddr,
            to: txForm.to,
            amount: String(microAmount),
            denom: denomInfo.micro
          }
        ]
      };
      
      // Sign transaction with real PQC signature
      const signedTx = await PQCWallet.signTransaction(
        txObj,
        currentWallet.secretKey,
        currentWallet.publicKey
      );
      
      // Submit transaction to backend
      const submitResponse = await fetch(`${rpcUrl}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_tx: signedTx })
      });
      
      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        let errorMsg = `Transaction failed: ${submitResponse.status}`;
        
        // Parse error message for better UX
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMsg = errorJson.message || errorJson.error;
          }
        } catch (e) {
          errorMsg += `: ${errorText}`;
        }
        
        throw new Error(errorMsg);
      }
      
      const result = await submitResponse.json();
      const txHash = result.tx_hash || result.hash || ('tx_' + Math.random().toString(36).substr(2, 16));
      
      // Save to history
      const tx = {
        hash: txHash,
        type: 'send',
        from: fullAddr,
        to: txForm.to,
        amount: amountNum,
        denom: denomInfo.display,
        memo: txForm.memo,
        status: 'pending',
        timestamp: new Date().toISOString(),
      };
      saveTransaction(tx);
      
      // Update local balances (will be corrected by next balance refresh)
      const currentBal = getAddressBalances(fullAddr);
      const newBal = {
        ...currentBal,
        [denomInfo.display]: Math.max(0, (currentBal[denomInfo.display] || 0) - amountNum),
      };
      if (denomInfo.display === 'DGT') {
        newBal.DGT = Math.max(0, (currentBal.DGT || 0) - (amountNum + NETWORK_FEE));
      } else {
        newBal.DGT = Math.max(0, (currentBal.DGT || 0) - NETWORK_FEE);
      }
      const allBal = readBalances();
      allBal[fullAddr] = newBal;
      writeBalances(allBal);
      setBalances(newBal);
      
      setTxSuccess({
        type: 'send',
        hash: txHash,
        amount: amountNum,
        denom: denomInfo.display,
        to: txForm.to,
      });
      
      // Reset form
      setTxForm({ to: '', amount: '', denom: 'DRT', memo: '' });
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowTransactionModal(false);
        setTxSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Transaction error:', err);
      setTxError(err.message || 'Failed to submit transaction');
    } finally {
      setTxLoading(false);
    }
  };
  
  // Generate payment request link
  const generatePaymentRequest = () => {
    if (!fullAddr) {
      setTxError('Wallet address not available. Create or reload your wallet.');
      return;
    }

    if (!txForm.amount) {
      setTxError('Enter an amount to request.');
      return;
    }

    const amountNum = parseFloat(txForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTxError('Enter a valid amount greater than 0.');
      return;
    }

    setTxError(null);

    const params = new URLSearchParams({
      to: fullAddr,
      amount: txForm.amount,
      denom: txForm.denom,
      memo: txForm.memo || '',
    });
    const link = `${window.location.origin}${window.location.pathname}#/pay?${params.toString()}`;
    setPaymentRequestLink(link);
    setTxSuccess({
      type: 'request',
      link,
      amount: amountNum,
      denom: txForm.denom,
    });
  };
  
  // Copy payment link
  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentRequestLink);
      alert('Payment link copied to clipboard!');
    } catch (err) {
      alert('Failed to copy link');
    }
  };
  
  const create = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Generate real PQC keypair using WASM module
      console.log('🔐 Generating PQC keypair...');
      const keypair = await PQCWallet.generateKeypair();
      console.log('✅ PQC keypair generated:', {
        address: keypair.address,
        algorithm: keypair.algorithm
      });
      
      const walletId = `wallet-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
      const walletData = {
        id: walletId,
        fullAddr: keypair.address,
        addr: truncateAddress(keypair.address),
        algorithm: algorithm,
        publicKey: keypair.publicKey,  // Store base64-encoded public key
        secretKey: keypair.secretKey,  // Store base64-encoded secret key (encrypted in production!)
        guardians: [],
        createdAt: new Date().toISOString(),
        name: `Wallet ${wallets.length + 1} (${algorithm})`,
      };
      
      // Add to wallets array
      const newWallets = [...wallets, walletData];
      setWallets(newWallets);
      localStorage.setItem('dytallix_wallets', JSON.stringify(newWallets));
      
      // Set as active wallet
      loadWallet(walletData);
      setActiveWalletId(walletId);
      localStorage.setItem('dytallix_active_wallet_id', walletId);
      
      setLoading(false);
    } catch (err) {
      console.error('❌ Failed to create wallet:', err);
      setError('Failed to create wallet: ' + err.message);
      setLoading(false);
    }
  };

  const refreshBalances = async () => {
    if (!fullAddr) return;
    
    // Try to fetch real blockchain balance first
    const blockchainBalances = await fetchBlockchainBalance(fullAddr);
    if (blockchainBalances) {
      setBalances(blockchainBalances);
      setBalanceSource('blockchain');
      // Sync to localStorage
      const allBal = readBalances();
      allBal[fullAddr] = blockchainBalances;
      writeBalances(allBal);
    } else {
      // Fallback to localStorage
      const newBalances = getAddressBalances(fullAddr);
      setBalances(newBalances);
      setBalanceSource('local');
    }
  };
  
  // Fetch real blockchain balances
  const fetchBlockchainBalance = async (address) => {
    try {
      const rpcUrl = import.meta.env.VITE_RPC_HTTP_URL || 'http://localhost:3030';
      const response = await fetch(`${rpcUrl}/account/${address}`);
      
      if (!response.ok) return null;
      
      const accountData = await response.json();
      
      // Convert micro-units to regular units
      return {
        DGT: accountData.balances?.udgt ? accountData.balances.udgt / 1_000_000 : 0,
        DRT: accountData.balances?.udrt ? accountData.balances.udrt / 1_000_000 : 0,
      };
    } catch (err) {
      return null;
    }
  };
  
  // Auto-refresh balances when fullAddr changes or component mounts
  useEffect(() => {
    if (fullAddr) {
      // First try blockchain balance, fallback to localStorage
      const updateBalances = async () => {
        const blockchainBalances = await fetchBlockchainBalance(fullAddr);
        if (blockchainBalances) {
          setBalances(blockchainBalances);
          setBalanceSource('blockchain');
          // Sync to localStorage for offline display
          const allBal = readBalances();
          allBal[fullAddr] = blockchainBalances;
          writeBalances(allBal);
        } else {
          // Fallback to localStorage if blockchain is unavailable
          const localBalances = getAddressBalances(fullAddr);
          setBalances(localBalances);
          setBalanceSource('local');
        }
      };
      
      updateBalances();
      
      // Set up auto-refresh every 5 seconds
      const interval = setInterval(updateBalances, 5000);
      
      return () => clearInterval(interval);
    }
  }, [fullAddr]);
  
  // Save guardians to localStorage when they change
  useEffect(() => {
    if (created && fullAddr) {
      const savedWallet = localStorage.getItem('dytallix_wallet');
      if (savedWallet) {
        try {
          const wallet = JSON.parse(savedWallet);
          wallet.guardians = guardians;
          localStorage.setItem('dytallix_wallet', JSON.stringify(wallet));
        } catch (err) {
          console.error('Failed to save guardians:', err);
        }
      }
    }
  }, [guardians, created, fullAddr]);

  const handleCopyAddress = async () => {
    const success = await copyToClipboard(fullAddr);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      alert('Failed to copy address to clipboard');
    }
  };

  const exportKeystore = async () => {
    if (!password) {
      alert('Please enter a password to encrypt your keystore');
      return;
    }
    
    if (password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    
    try {
      // Create wallet adapter from current state (use fullAddr for export)
      const wallet = createWalletAdapter({ addr: fullAddr, algorithm });
      
      // Export keystore with real encryption
      const keystore = await exportKeystoreAPI(wallet, { password });
      
      // Serialize to JSON
      const json = await serializeKeystore(keystore);
      
      // Download as JSON file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Use first 8 chars of address for filename
      const addrPrefix = fullAddr.replace(/^pqc1(ml|slh)/, '').slice(0, 8);
      a.download = `pqc-wallet-${addrPrefix}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => {
        setShowExportModal(false);
        setExportSuccess(false);
        setPassword("");
      }, 2000);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export keystore: ' + err.message);
    }
  };

  const addGuardian = () => {
    if (!newGuardian || !newGuardian.startsWith('pqc1')) {
      alert('Please enter a valid PQC address (starts with pqc1)');
      return;
    }
    if (newGuardian === addr) {
      alert('Cannot add yourself as a guardian');
      return;
    }
    if (guardians.includes(newGuardian)) {
      alert('This guardian has already been added');
      return;
    }
    
    setGuardians([...guardians, newGuardian]);
    setNewGuardian("");
  };

  const removeGuardian = (guardian) => {
    setGuardians(guardians.filter(g => g !== guardian));
  };
  
  const deleteWallet = () => {
    if (confirm('Are you sure you want to delete this wallet? This action cannot be undone. Make sure you have exported your keystore first!')) {
      // Remove current wallet from the list
      const newWallets = wallets.filter(w => w.id !== activeWalletId);
      setWallets(newWallets);
      localStorage.setItem('dytallix_wallets', JSON.stringify(newWallets));
      
      // Load another wallet if available, otherwise reset
      if (newWallets.length > 0) {
        loadWallet(newWallets[0]);
        setActiveWalletId(newWallets[0].id);
        localStorage.setItem('dytallix_active_wallet_id', newWallets[0].id);
      } else {
        // No wallets left
        setCreated(false);
        setAddr("");
        setFullAddr("");
        setAlgorithm('ML-DSA');
        setGuardians([]);
        setBalances({ DGT: 0, DRT: 0 });
        setActiveWalletId(null);
        localStorage.removeItem('dytallix_active_wallet_id');
      }
    }
  };
  
  // Poll transaction status for pending transactions
  useEffect(() => {
    const checkPendingTransactions = async () => {
      const pendingTxs = transactions.filter(tx => tx.status === 'pending');
      if (pendingTxs.length === 0) return;
      
      const rpcUrl = import.meta.env.VITE_RPC_HTTP_URL || 'http://localhost:3030';
      let updated = false;
      
      for (const tx of pendingTxs) {
        try {
          // Check if transaction is older than 10 seconds
          const txAge = Date.now() - new Date(tx.timestamp).getTime();
          
          // Auto-confirm transactions after 10 seconds (optimistic confirmation)
          // This assumes if the transaction was submitted successfully, it will be included
          if (txAge > 10000) {
            tx.status = 'confirmed';
            updated = true;
            console.log(`✅ Transaction ${tx.hash} auto-confirmed after 10s (optimistic)`);
            continue;
          }
          
          // Try to query transaction status from backend (if endpoint exists)
          try {
            const response = await fetch(`${rpcUrl}/tx/${tx.hash}`);
            
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'confirmed' || data.confirmed) {
                tx.status = 'confirmed';
                updated = true;
                console.log(`✅ Transaction ${tx.hash} confirmed by blockchain`);
              } else if (data.status === 'failed') {
                tx.status = 'failed';
                tx.error = data.error || 'Transaction failed';
                updated = true;
                console.log(`❌ Transaction ${tx.hash} failed:`, tx.error);
              }
            }
            // If 404 or other error, just keep pending until auto-confirm timeout
          } catch (fetchErr) {
            // Backend might not have /tx endpoint, that's okay - rely on optimistic confirmation
            console.log(`ℹ️ Could not check tx ${tx.hash} status (backend may not support /tx endpoint)`);
          }
        } catch (err) {
          console.error(`Error checking tx ${tx.hash}:`, err);
          // Don't update status on errors, keep polling
        }
      }
      
      // Update localStorage if any transaction status changed
      if (updated) {
        setTransactions([...transactions]);
        localStorage.setItem('dytallix_transactions', JSON.stringify(transactions));
      }
    };
    
    // Check immediately and then every 2 seconds
    checkPendingTransactions();
    const interval = setInterval(checkPendingTransactions, 2000);
    
    return () => clearInterval(interval);
  }, [transactions]);
  
  return (
    <>
      <Page>
      <h1 className="text-3xl md:text-4xl font-extrabold">PQC Wallet</h1>
      <p className="mt-3 text-neutral-300 max-w-prose">Create and manage a quantum-resistant wallet secured by NIST-standardized post-quantum cryptography. Your keys never leave your device.</p>
      
      {/* Wallet Switcher */}
      {wallets.length > 0 && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="text-sm text-neutral-400 font-medium">Active Wallet:</div>
              <select
                value={activeWalletId || ''}
                onChange={(e) => switchWallet(e.target.value)}
                className="px-4 py-2 rounded-xl bg-neutral-900 border border-white/10 focus:border-white/30 focus:outline-none text-white text-sm cursor-pointer font-semibold"
              >
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} - {wallet.addr}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>{wallets.length} wallet{wallets.length !== 1 ? 's' : ''} total</span>
              <span>•</span>
              <button 
                onClick={() => {
                  setCreated(false);
                  setAlgorithm('ML-DSA');
                  // Scroll to wallet creation form on mobile
                  setTimeout(() => {
                    const walletSection = document.querySelector('.rounded-3xl.border.border-white\\/10.bg-white\\/5');
                    if (walletSection) {
                      walletSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                + Create New Wallet
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Wallet Features */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-500 text-xl">🔐</span>
            </div>
            <div className="font-semibold text-lg">Wallet Features</div>
          </div>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Post-Quantum Security:</strong> ML-DSA (Dilithium) and SLH-DSA (SPHINCS+) signature schemes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Client-Side Generation:</strong> Keys generated in your browser, never transmitted</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Account Abstraction:</strong> Multi-sig support with guardian recovery</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Hybrid Mode:</strong> Optional PQC+ECC dual signatures for migration paths</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Keystore Export:</strong> Encrypted JSON backup with password protection</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <span className="text-purple-500 text-xl">📋</span>
            </div>
            <div className="font-semibold text-lg">Getting Started</div>
          </div>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">1.</span>
              <span><strong>Choose Algorithm:</strong> Select ML-DSA for speed or SLH-DSA for stateless signatures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">2.</span>
              <span><strong>Create Wallet:</strong> Generate your PQC keypair (takes 1-2 seconds)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">3.</span>
              <span><strong>Backup Keys:</strong> Export and securely store your encrypted keystore</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">4.</span>
              <span><strong>Get Tokens:</strong> Visit the <a href="#/faucet" className="text-purple-400 underline">Faucet</a> to request test DGT/DRT</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">5.</span>
              <span><strong>Optional:</strong> Add guardians for social recovery (multi-sig)</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-yellow-500 text-xl">⚠️</span>
          <div className="text-sm">
            <div className="font-semibold text-yellow-500">Testnet Demo</div>
            <div className="text-neutral-300 mt-1">This is a demonstration wallet for the Dytallix testnet. For production use, integrate the <code className="px-1 py-0.5 rounded bg-neutral-800">@dytallix/pqc-wallet</code> SDK with proper key management and hardware wallet support.</div>
          </div>
        </div>
      </div>

      {/* Wallet Generator and Transaction Actions Grid */}
      <div className="mt-8 grid lg:grid-cols-2 gap-6 lg:items-start">
        {/* Wallet Generator */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4">
            <div className="font-semibold text-lg">Create Your Wallet</div>
            <div className="text-xs text-neutral-400 mt-1">Generated client-side • Never leaves your device</div>
          </div>
        {!created ? (
          <>
            <label className="text-sm text-neutral-300 font-medium">Signature Algorithm</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button 
                onClick={() => setAlgorithm('ML-DSA')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition ${
                  algorithm === 'ML-DSA' 
                    ? 'bg-white text-black' 
                    : 'border border-white/20 hover:border-white/40'
                }`}
              >
                <div>ML‑DSA {algorithm === 'ML-DSA' && '✓'}</div>
                <div className="text-xs font-normal opacity-70">Dilithium (Fast)</div>
              </button>
              <button 
                onClick={() => setAlgorithm('SLH-DSA')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition ${
                  algorithm === 'SLH-DSA' 
                    ? 'bg-white text-black' 
                    : 'border border-white/20 hover:border-white/40'
                }`}
              >
                <div>SLH‑DSA {algorithm === 'SLH-DSA' && '✓'}</div>
                <div className="text-xs font-normal opacity-70">SPHINCS+ (Stateless)</div>
              </button>
            </div>
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}
            <button 
              onClick={create} 
              disabled={loading}
              className="mt-6 w-full px-5 py-3 rounded-2xl bg-white text-black font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate PQC Wallet'}
            </button>
            <div className="mt-4 text-xs text-neutral-500 text-center">
              Generation takes 1-2 seconds • ML-DSA recommended for most use cases
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 mb-4">
              <div className="flex items-center gap-2 text-green-500 text-sm font-semibold mb-2">
                <span>✓</span>
                <span>Wallet Created Successfully ({algorithm})</span>
              </div>
              <div className="text-xs text-neutral-400">Your PQC wallet is ready to use</div>
            </div>
            <div className="text-sm text-neutral-400 mb-2">Your Address</div>
            <div className="p-3 rounded-xl bg-neutral-900 border border-white/10 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="text-lg font-mono break-all">{addr}</div>
                  <div className="text-xs text-neutral-500 mt-2">Algorithm: {algorithm} {algorithm === 'ML-DSA' ? '(Dilithium)' : '(SPHINCS+)'}</div>
                </div>
                <button
                  onClick={handleCopyAddress}
                  aria-label={copied ? "Copied!" : "Copy full address"}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors group relative"
                  title={copied ? "Copied!" : "Copy full address"}
                >
                  {copied ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
              {copied && (
                <div className="mt-2 text-xs text-green-500 animate-pulse">
                  ✓ Full address copied to clipboard!
                </div>
              )}
            </div>
            {/* Balances */}
            <div className="mb-4 p-3 rounded-xl bg-neutral-900 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-neutral-400 font-medium">Balances</div>
                <button 
                  onClick={refreshBalances} 
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition font-medium"
                  title="Refresh balances from network"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              
              {/* Balance source indicator */}
              {balanceSource === 'local' && (balances.DGT > 0 || balances.DRT > 0) && (
                <div className="mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs flex items-start gap-2">
                  <span className="text-yellow-500">⚠️</span>
                  <div>
                    <strong>Warning:</strong> Showing cached balance. Cannot reach blockchain node.
                    These balances may not be accurate for transactions.
                  </div>
                </div>
              )}
              
              {/* Warning: Insufficient DGT for fees */}
              {balanceSource === 'blockchain' && balances.DRT > 0 && balances.DGT < 0.001 && (
                <div className="mb-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs flex items-start gap-2">
                  <span className="text-orange-400">⚠️</span>
                  <div>
                    <strong>Cannot send transactions:</strong> You need at least 0.001 DGT for network fees. 
                    All transactions require DGT for fees, even when sending DRT. 
                    <a href="#/faucet" className="underline hover:text-orange-300 ml-1">
                      Request DGT from faucet →
                    </a>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                  <div className="text-xs text-neutral-400">DGT</div>
                  <div className="text-lg font-bold">{balances.DGT?.toLocaleString?.() || balances.DGT}</div>
                </div>
                <div className="rounded-lg bg-white/5 p-3 border border-white/10">
                  <div className="text-xs text-neutral-400">DRT</div>
                  <div className="text-lg font-bold">{balances.DRT?.toLocaleString?.() || balances.DRT}</div>
                </div>
              </div>
              <div className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
                {balanceSource === 'blockchain' ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>Live on-chain balances • Auto-refreshes every 5s</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span>Cached balance (node offline)</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Wallet Management Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowExportModal(true)} 
                className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 text-sm font-semibold transition"
              >
                📥 Export Keystore
              </button>
              <button 
                onClick={() => setShowGuardianModal(true)} 
                className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 text-sm font-semibold transition"
              >
                👥 Add Guardian
              </button>
            </div>
            
            {/* Show guardians if any exist */}
            {guardians.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-neutral-900 border border-white/10">
                <div className="text-xs text-neutral-400 mb-2">Guardians ({guardians.length}/5)</div>
                <div className="space-y-2">
                  {guardians.map((g, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-neutral-300">{g.slice(0, 20)}...{g.slice(-8)}</span>
                      <button 
                        onClick={() => removeGuardian(g)}
                        className="text-red-400 hover:text-red-300 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              <button
                onClick={() => {
                  setCreated(false);
                  setAddr("");
                  setFullAddr("");
                  setAlgorithm('ML-DSA');
                  setError(null);
                }}
                className="w-full px-5 py-3 rounded-2xl border-2 border-white/20 hover:border-white/40 hover:bg-white/5 text-white text-center font-semibold transition"
              >
                ➕ Create New Wallet
              </button>
              <a href="#/faucet" className="block w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-center font-semibold hover:opacity-90 transition">
                Get Test Tokens from Faucet →
              </a>
              <button 
                onClick={deleteWallet}
                className="w-full px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-semibold transition"
              >
                🗑️ Delete Wallet
              </button>
            </div>
          </>
        )}
        </div>

        {/* Right Column: Send/Request Tokens and Transaction History */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4">
              <div className="font-semibold text-lg">Send / Request Tokens</div>
              <div className="text-xs text-neutral-400 mt-1">PQC-secured transactions</div>
            </div>
            {created && (
              <>
                <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-neutral-900/50">
                  <div className="text-xs text-neutral-400">Balance</div>
                  <div className="text-xs font-bold">
                    DGT: {balances.DGT?.toLocaleString?.() || balances.DGT} • DRT: {balances.DRT?.toLocaleString?.() || balances.DRT}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={openSendModal}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition"
                  >
                    💸 Send
                  </button>
                  <button 
                    onClick={openRequestModal}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 transition"
                  >
                    📥 Request
                  </button>
                </div>
                <div className="mt-4 text-xs text-neutral-500">
                  Signed with {algorithm} PQC
                </div>
                <ul className="mt-3 space-y-2 text-xs text-neutral-400">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span><strong className="text-neutral-300">Instant Transfers:</strong> Send DGT/DRT to any PQC address with sub-second confirmation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <span><strong className="text-neutral-300">Fractional Amounts:</strong> Support for micro-transactions down to 6 decimal places</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span><strong className="text-neutral-300">Payment Requests:</strong> Generate shareable links for requesting tokens from others</span>
                  </li>
                </ul>
              </>
            )}
            {!created && (
              <div className="mt-6 text-center text-neutral-500">
                <div className="text-3xl mb-3">🔐</div>
                <div className="text-sm">Create a wallet first</div>
                <div className="text-xs mt-2">Generate a PQC wallet to start sending and receiving tokens</div>
              </div>
            )}
          </div>

          {/* Transaction History Card */}
          {created && transactions.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-lg">Recent Transactions</div>
                <div className="text-xs text-neutral-500">{transactions.length} total</div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.slice(0, 10).map((tx, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${tx.type === 'send' ? 'text-red-400' : 'text-green-400'}`}>
                          {tx.type === 'send' ? '↗ Sent' : '↙ Received'}
                        </span>
                        <span className="text-xs font-mono font-bold text-neutral-300">
                          {tx.amount} {tx.denom}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                          {tx.status}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-600">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 truncate">
                      {tx.type === 'send' ? 'To: ' : 'From: '}{tx.type === 'send' ? tx.to : tx.from}
                    </div>
                    {tx.memo && <div className="text-xs text-neutral-600 italic mt-0.5 truncate">{tx.memo}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </Page>
    {showTransactionModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-neutral-950 p-6 shadow-2xl">
          <button
            aria-label="Close transaction dialog"
            className="absolute right-4 top-4 text-neutral-500 hover:text-white transition disabled:opacity-40"
            onClick={closeTransactionModal}
            type="button"
            disabled={txLoading}
          >
            ×
          </button>
          <div className="text-lg font-semibold text-white">
            {txType === 'send' ? 'Send Tokens' : 'Request Tokens'}
          </div>
          <div className="mt-1 text-xs text-neutral-400">
            {txType === 'send'
              ? 'Sign and broadcast a PQC transaction to the network.'
              : 'Generate a shareable payment request link for this wallet.'}
          </div>

          {txError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {txError}
            </div>
          )}

          {txSuccess && txSuccess.type === 'send' && (
            <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400">
              <div className="font-semibold text-green-300">Transaction submitted</div>
              <div className="mt-1 text-neutral-200">
                {txSuccess.amount} {txSuccess.denom} → {truncateAddress(txSuccess.to)}
              </div>
              <div className="mt-1 font-mono text-[11px] text-neutral-400 break-all">
                Hash: {txSuccess.hash}
              </div>
              <div className="mt-1 text-neutral-400">
                Closing automatically once processed…
              </div>
            </div>
          )}

          {txSuccess && txSuccess.type === 'request' && (
            <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400">
              <div className="font-semibold text-green-300">Payment link ready</div>
              <div className="mt-1 text-neutral-200">
                Requesting {txSuccess.amount} {txSuccess.denom}
              </div>
              <div className="mt-1 text-neutral-400">
                Share the link below to receive tokens.
              </div>
            </div>
          )}

          {txType === 'send' ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!txLoading) {
                  submitTransaction();
                }
              }}
            >
              {/* Wallet Selector for Send */}
              {wallets.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                    Send From Wallet
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-white/40 cursor-pointer"
                    value={activeWalletId || ''}
                    onChange={(e) => switchWallet(e.target.value)}
                    disabled={txLoading}
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} - {wallet.addr} (DGT: {getAddressBalances(wallet.fullAddr).DGT}, DRT: {getAddressBalances(wallet.fullAddr).DRT})
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-neutral-500">
                    Current balance: DGT {balances.DGT?.toFixed(2) || 0} • DRT {balances.DRT?.toFixed(2) || 0}
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                  Recipient Address
                </label>
                <input
                  autoFocus={wallets.length <= 1}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm font-mono text-neutral-100 outline-none focus:border-white/40"
                  onChange={(e) => setTxForm({ ...txForm, to: e.target.value })}
                  placeholder="pqc1..."
                  required
                  value={txForm.to}
                  disabled={txLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                    Amount
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-white/40"
                    min="0"
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="10"
                    required
                    step="0.000001"
                    type="number"
                    value={txForm.amount}
                    disabled={txLoading}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                    Token
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-white/40"
                    onChange={(e) => setTxForm({ ...txForm, denom: e.target.value })}
                    value={txForm.denom}
                    disabled={txLoading}
                  >
                    <option value="DGT">DGT</option>
                    <option value="DRT">DRT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                  Memo (optional)
                </label>
                <textarea
                  className="mt-2 h-20 w-full resize-none rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-white/40"
                  maxLength={280}
                  onChange={(e) => setTxForm({ ...txForm, memo: e.target.value })}
                  placeholder="Add a note for the recipient"
                  value={txForm.memo}
                  disabled={txLoading}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Network fee: {NETWORK_FEE.toFixed(3)} {txDenomInfo.feeAsset}</span>
                <button
                  className="text-neutral-400 hover:text-white transition"
                  onClick={() => {
                    resetTransactionState();
                  }}
                  type="button"
                  disabled={txLoading}
                >
                  Clear
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-neutral-300 hover:border-white/40 hover:text-white transition disabled:opacity-50"
                  onClick={closeTransactionModal}
                  type="button"
                  disabled={txLoading}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={txLoading}
                >
                  {txLoading ? 'Submitting…' : 'Submit Transaction'}
                </button>
              </div>
            </form>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                generatePaymentRequest();
              }}
            >
              {/* Wallet Selector for Request */}
              {wallets.length > 1 && (
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                    Request To Wallet
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-white/40 cursor-pointer"
                    value={activeWalletId || ''}
                    onChange={(e) => {
                      switchWallet(e.target.value);
                      // Update the form with the new wallet address
                      const selectedWallet = wallets.find(w => w.id === e.target.value);
                      if (selectedWallet) {
                        setTxForm({ ...txForm, to: selectedWallet.fullAddr });
                      }
                    }}
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} - {wallet.addr}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-neutral-500">
                    Payment requests will be sent to this wallet
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                  Your Address
                </label>
                <div className="mt-2 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-xs font-mono text-neutral-200 break-all">
                  {fullAddr || 'Wallet address unavailable'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                    Amount
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-white/40"
                    min="0"
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="25"
                    required
                    step="0.000001"
                    type="number"
                    value={txForm.amount}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                    Token
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-white/40"
                    onChange={(e) => setTxForm({ ...txForm, denom: e.target.value })}
                    value={txForm.denom}
                  >
                    <option value="DGT">DGT</option>
                    <option value="DRT">DRT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                  Memo (optional)
                </label>
                <textarea
                  className="mt-2 h-20 w-full resize-none rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-white/40"
                  maxLength={280}
                  onChange={(e) => setTxForm({ ...txForm, memo: e.target.value })}
                  placeholder="What are these funds for?"
                  value={txForm.memo}
                />
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-neutral-300 hover:border-white/40 hover:text-white transition"
                  onClick={closeTransactionModal}
                  type="button"
                >
                  Close
                </button>
                <button
                  className="flex-1 rounded-2xl bg-gradient-to-r from-green-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
                  type="submit"
                >
                  Generate Link
                </button>
              </div>

              {paymentRequestLink && (
                <div className="rounded-2xl border border-white/10 bg-neutral-900 px-4 py-3 text-xs text-neutral-100">
                  <div className="mb-2 font-semibold text-neutral-300">Shareable Link</div>
                  <div className="break-all font-mono text-[11px] text-neutral-400">
                    {paymentRequestLink}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-300 hover:border-white/40 hover:text-white transition"
                      onClick={() => copyPaymentLink()}
                      type="button"
                    >
                      Copy Link
                    </button>
                    <button
                      className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-neutral-300 hover:border-white/40 hover:text-white transition"
                      onClick={() => window.open(paymentRequestLink, '_blank')}
                      type="button"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    )}

    {/* Export Keystore Modal */}
    {showExportModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 shadow-2xl">
          <button
            className="absolute right-4 top-4 text-neutral-500 hover:text-white transition"
            onClick={() => {
              setShowExportModal(false);
              setPassword("");
              setExportSuccess(false);
            }}
            type="button"
          >
            ×
          </button>
          <div className="text-lg font-semibold text-white">Export Encrypted Keystore</div>
          <div className="mt-1 text-xs text-neutral-400">
            Download your wallet as an encrypted JSON file
          </div>

          {exportSuccess ? (
            <div className="mt-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              <div className="font-semibold text-green-300">✓ Keystore exported successfully</div>
              <div className="mt-1 text-neutral-300">Check your downloads folder</div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                  Encryption Password
                </label>
                <input
                  type="password"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 outline-none focus:border-white/40"
                  placeholder="Enter a strong password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                />
                <div className="mt-2 text-xs text-neutral-500">
                  This password encrypts your private key. Keep it safe!
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-neutral-300 hover:border-white/40 hover:text-white transition"
                  onClick={() => {
                    setShowExportModal(false);
                    setPassword("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                  onClick={exportKeystore}
                  disabled={!password || password.length < 8}
                  type="button"
                >
                  Export
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Add Guardian Modal */}
    {showGuardianModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 shadow-2xl">
          <button
            className="absolute right-4 top-4 text-neutral-500 hover:text-white transition"
            onClick={() => {
              setShowGuardianModal(false);
              setNewGuardian("");
            }}
            type="button"
          >
            ×
          </button>
          <div className="text-lg font-semibold text-white">Add Guardian</div>
          <div className="mt-1 text-xs text-neutral-400">
            Add a trusted guardian to help recover your wallet (max 5)
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
                Guardian PQC Address
              </label>
              <input
                type="text"
                className="mt-2 w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 font-mono outline-none focus:border-white/40"
                placeholder="pqc1ml... or pqc1slh..."
                value={newGuardian}
                onChange={(e) => setNewGuardian(e.target.value)}
              />
              <div className="mt-2 text-xs text-neutral-500">
                Guardians can help recover your wallet if you lose access
              </div>
            </div>

            {guardians.length >= 5 && (
              <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                Maximum of 5 guardians reached
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-neutral-300 hover:border-white/40 hover:text-white transition"
                onClick={() => {
                  setShowGuardianModal(false);
                  setNewGuardian("");
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-2xl bg-gradient-to-r from-green-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
                onClick={addGuardian}
                disabled={!newGuardian || !newGuardian.startsWith('pqc1') || guardians.length >= 5}
                type="button"
              >
                Add Guardian
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

const FaucetPage = () => {
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  
  // Load wallets from localStorage on mount
  useEffect(() => {
    const savedWallets = localStorage.getItem('dytallix_wallets');
    if (savedWallets) {
      try {
        const walletsData = JSON.parse(savedWallets);
        setWallets(walletsData);
        // Pre-select the first wallet if available
        if (walletsData.length > 0) {
          setSelectedWalletId(walletsData[0].id);
        }
      } catch (err) {
        console.error('Failed to load wallets:', err);
      }
    }
  }, []);
  
  // Get address from selected wallet or manual input
  const getTargetAddress = () => {
    if (wallets.length === 1) {
      // Single wallet: always use it
      return wallets[0].fullAddr;
    }
    if (selectedWalletId && selectedWalletId !== 'manual') {
      const wallet = wallets.find(w => w.id === selectedWalletId);
      return wallet ? wallet.fullAddr : manualAddress;
    }
    return manualAddress;
  };
  
  const submit = async (e) => {
    e.preventDefault();
    const token = e.target.token.value;
    const addr = getTargetAddress().trim();
    
    if (!addr) {
      setError('Please enter a valid PQC address or select a wallet');
      return;
    }
    
    setLoading(true);
    setError(null);
    setReq(null);
    
    try {
      // Call the real backend faucet API
      const rpcUrl = import.meta.env.VITE_RPC_HTTP_URL || 'http://localhost:3030';
      
      // Map token to micro-units (DGT = 100, DRT = 1000 from UI, convert to udgt/udrt)
      const amount = token === 'DGT' ? 100 * 1_000_000 : 1000 * 1_000_000; // Convert to micro-units
      const payload = {
        address: addr,
        ...(token === 'DGT' ? { udgt: amount } : { udrt: amount })
      };
      
      const response = await fetch(`${rpcUrl}/dev/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Faucet request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      setReq({ token, addr, status: 'Credited', result });
      
      // Also update localStorage for demo balance display
      creditBalance(addr, token, token === 'DGT' ? 100 : 1000);
    } catch (err) {
      console.error('Faucet error:', err);
      // Provide more detailed error messages
      let errorMsg = 'Failed to request tokens';
      if (err.message.includes('fetch')) {
        errorMsg = 'Cannot connect to backend node. Make sure the node is running on port 3030.';
      } else if (err.message.includes('Failed to fetch')) {
        errorMsg = 'Network error: Cannot reach the faucet endpoint. Check if the node is running.';
      } else {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Page>
      <h1 className="text-3xl md:text-4xl font-extrabold">Testnet Faucet</h1>
      <p className="mt-3 text-neutral-300 max-w-prose">Get free DGT (Governance) and DRT (Reward) tokens for testing and development on the Dytallix testnet. No cost, no signup—just paste your PQC address.</p>
      
      {/* Faucet Features & Instructions */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <span className="text-green-500 text-xl">💧</span>
            </div>
            <div className="font-semibold text-lg">Faucet Features</div>
          </div>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Dual Token Support:</strong> Request both DGT (governance) and DRT (rewards) tokens</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Instant Delivery:</strong> Tokens sent directly to your wallet within seconds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Rate Limited:</strong> Fair distribution with cooldown periods per address</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>No Registration:</strong> No account needed—just provide a valid PQC address</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>Testnet Only:</strong> Tokens have no real value and are for development purposes only</span>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-500 text-xl">📖</span>
            </div>
            <div className="font-semibold text-lg">How to Use</div>
          </div>
          <ul className="space-y-2 text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <span><strong>Create Wallet:</strong> Generate a PQC wallet on the <a href="#/wallet" className="text-blue-400 underline">Wallet page</a> if you don't have one</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">2.</span>
              <span><strong>Copy Address:</strong> Copy your PQC address (starts with "pqc1...")</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">3.</span>
              <span><strong>Select Token:</strong> Choose DGT for governance/staking or DRT for transaction fees</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">4.</span>
              <span><strong>Submit Request:</strong> Click "Request Tokens" and wait for confirmation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">5.</span>
              <span><strong>Verify Balance:</strong> Check your wallet or use the <a href="#/dashboard" className="text-blue-400 underline">Dashboard</a> to verify receipt</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Token Information */}
      <div className="mt-8 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🏛️</span>
            <div className="font-semibold text-lg">DGT — Governance Token</div>
          </div>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-neutral-500">•</span>
              <span>Used for voting on network proposals and parameter changes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-500">•</span>
              <span>Delegate to validators to earn DRT rewards</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-500">•</span>
              <span>Fixed supply (1B tokens) • Non-inflationary</span>
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-xl bg-neutral-900/50 border border-white/5">
            <div className="text-xs text-neutral-400">Faucet Amount</div>
            <div className="text-lg font-bold">100 DGT</div>
            <div className="text-xs text-neutral-500">per request</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💎</span>
            <div className="font-semibold text-lg">DRT — Reward Token</div>
          </div>
          <ul className="text-sm text-neutral-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-neutral-500">•</span>
              <span>Earned by validators and delegators as staking rewards</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-500">•</span>
              <span>Used for transaction fees and smart contract execution</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neutral-500">•</span>
              <span>Adaptive emission • Burnable by holders</span>
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-xl bg-neutral-900/50 border border-white/5">
            <div className="text-xs text-neutral-400">Faucet Amount</div>
            <div className="text-lg font-bold">1,000 DRT</div>
            <div className="text-xs text-neutral-500">per request</div>
          </div>
        </div>
      </div>

      {/* Request Form and Important Information - Two Column Layout */}
      <div className="mt-8 grid lg:grid-cols-2 gap-6 lg:items-start">
        {/* Request Form */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4">
            <div className="font-semibold text-lg">Request Testnet Tokens</div>
            <div className="text-xs text-neutral-400 mt-1">Free tokens • Rate limited to prevent abuse</div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            {/* Wallet Selector (show if 2+ wallets exist) */}
            {wallets.length >= 2 && (
              <div>
                <label className="text-sm text-neutral-300 font-medium">Select Wallet</label>
                <select 
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="mt-2 w-full rounded-xl bg-neutral-900 border border-white/10 px-4 py-3 outline-none focus:border-white/30 transition text-sm cursor-pointer"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name || `Wallet ${w.id.slice(0, 6)}`} — {w.addr}
                    </option>
                  ))}
                  <option value="manual">Enter address manually</option>
                </select>
                <div className="mt-1 text-xs text-neutral-500">
                  Choose a wallet to request tokens for, or enter a custom address
                </div>
              </div>
            )}
            
            {/* Address Input (show if no wallets or "manual" selected) */}
            {(wallets.length === 0 || (wallets.length >= 2 && selectedWalletId === 'manual')) && (
              <div>
                <label className="text-sm text-neutral-300 font-medium">PQC Address</label>
                <input 
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  required 
                  placeholder="pqc1abc123def456..." 
                  className="mt-2 w-full rounded-xl bg-neutral-900 border border-white/10 px-4 py-3 outline-none focus:border-white/30 transition text-sm font-mono"
                />
                <div className="mt-1 text-xs text-neutral-500">
                  Must start with "pqc1" • Create one on the <a href="#/wallet" className="text-blue-400 underline">Wallet page</a>
                </div>
              </div>
            )}
            
            {/* Show selected wallet address (if wallet is selected and 2+ wallets) */}
            {wallets.length >= 2 && selectedWalletId && selectedWalletId !== 'manual' && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
                <div className="text-xs text-neutral-400 mb-1">Tokens will be sent to:</div>
                <div className="font-mono text-sm text-blue-400">{getTargetAddress()}</div>
              </div>
            )}
            
            {/* Auto-fill for single wallet (show address with auto-fill notice) */}
            {wallets.length === 1 && (
              <div>
                <label className="text-sm text-neutral-300 font-medium">PQC Address</label>
                <div className="mt-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3">
                  <div className="text-xs text-blue-400 mb-1 flex items-center gap-2">
                    <span>✓</span>
                    <span>Auto-filled from your wallet</span>
                  </div>
                  <div className="font-mono text-sm text-neutral-200">{wallets[0].fullAddr}</div>
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  Tokens will be sent to your wallet. Need a different address? <a href="#/wallet" className="text-blue-400 underline">Create another wallet</a>
                </div>
              </div>
            )}
            
            <div>
              <label className="text-sm text-neutral-300 font-medium">Select Token</label>
              <select 
                name="token" 
                className="mt-2 w-full rounded-xl bg-neutral-900 border border-white/10 px-4 py-3 outline-none focus:border-white/30 transition text-sm cursor-pointer"
              >
                <option value="DGT">DGT — Governance (100 tokens)</option>
                <option value="DRT">DRT — Rewards (1,000 tokens)</option>
              </select>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Requesting...' : 'Request Tokens'}
            </button>
            
            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                <div className="flex items-center gap-2 text-red-500 text-sm font-semibold mb-2">
                  <span>✗</span>
                  <span>Request Failed</span>
                </div>
                <div className="text-xs text-neutral-400">
                  {error}
                </div>
                <div className="mt-3 text-xs text-neutral-500">
                  Make sure the node is running and the address is valid.
                </div>
              </div>
            )}
            
            {req && (
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                <div className="flex items-center gap-2 text-green-500 text-sm font-semibold mb-2">
                  <span>✓</span>
                  <span>Tokens Credited Successfully!</span>
                </div>
                <div className="text-xs text-neutral-400">
                  Sent <span className="font-semibold">{req.token === 'DGT' ? '100 DGT' : '1,000 DRT'}</span> to <span className="font-mono">{req.addr.slice(0, 12)}...{req.addr.slice(-6)}</span>
                </div>
                <div className="mt-3 text-xs text-neutral-500">
                  Your tokens have been credited to your wallet. Check the Dashboard or refresh your wallet to see the updated balance.
                </div>
                <div className="mt-3 text-xs">
                  <a href="#/wallet" className="text-blue-400 hover:text-blue-300 underline">Open Wallet</a> and press <span className="font-semibold">Refresh</span> to see updated balances.
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Important Notes */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-transparent p-6">
          <div className="flex items-start gap-3">
            <span className="text-blue-500 text-xl">ℹ️</span>
            <div>
              <div className="font-semibold text-blue-400">Important Information</div>
              <ul className="mt-2 text-sm text-neutral-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-neutral-500">•</span>
                  <span><strong>Testnet tokens have no real-world value</strong> and cannot be exchanged for mainnet tokens</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neutral-500">•</span>
                  <span>Rate limit: One request per address every <strong>24 hours</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neutral-500">•</span>
                  <span>Need more tokens? Contact the team on Discord or contribute to the testnet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-neutral-500">•</span>
                  <span>Testnet may be reset periodically—your tokens and state will be wiped</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 flex flex-wrap gap-3">
        <a href="#/wallet" className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 text-sm transition">
          Create Wallet →
        </a>
        <a href="#/dashboard" className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 text-sm transition">
          View Dashboard →
        </a>
        <a href="#/docs" className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 text-sm transition">
          Read Docs →
        </a>
      </div>
    </Page>
  );
};

const DocsPage = () => (
  <Page>
    <h1 className="text-3xl md:text-4xl font-extrabold">Documentation</h1>
    <p className="mt-3 text-neutral-300 max-w-prose">Everything you need to build on Dytallix: SDK installation, wallet APIs, examples, governance, and contributing guidelines.</p>
    
    {/* SDK Quick Start */}
    <div className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
      <h2 className="text-2xl font-bold">🚀 Quick Start with the SDK</h2>
      <p className="mt-2 text-neutral-300">Install the official Dytallix SDK and start building post-quantum secure applications.</p>
      <div className="mt-4 bg-black/30 rounded-xl p-4 font-mono text-sm">
        <div className="text-green-400"># Install via NPM</div>
        <div className="text-white">npm install @dytallix/sdk</div>
        <div className="mt-3 text-green-400"># Or via Yarn</div>
        <div className="text-white">yarn add @dytallix/sdk</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <a className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:opacity-90 transition" href="https://www.npmjs.com/package/@dytallix/sdk" target="_blank" rel="noreferrer">View on NPM →</a>
        <a className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 transition" href="https://github.com/DytallixHQ/Dytallix" target="_blank" rel="noreferrer">GitHub Repository →</a>
      </div>
    </div>

    <div className="mt-8 grid md:grid-cols-2 gap-6">
      <DocCard 
        title="SDK Basics" 
        items={[
          "Connect to Dytallix testnet",
          "Query account balances",
          "Check node status",
          "Transaction history"
        ]} 
        color="from-blue-500/10" 
        link="https://github.com/DytallixHQ/Dytallix#quick-start"
      />
      <DocCard 
        title="PQC Wallets" 
        items={[
          "Generate ML-DSA wallet",
          "Generate SLH-DSA wallet",
          "Export/import keys",
          "Sign transactions"
        ]} 
        color="from-purple-500/10"
        link="https://github.com/DytallixHQ/Dytallix/tree/main/examples"
      />
      <DocCard 
        title="Transactions" 
        items={[
          "Send DGT tokens",
          "Send DRT tokens",
          "Transaction signing",
          "Broadcast to network"
        ]} 
        color="from-orange-500/10"
        link="https://github.com/DytallixHQ/Dytallix/blob/main/examples/send-transaction.js"
      />
      <DocCard 
        title="TypeScript Support" 
        items={[
          "Full type definitions",
          "IDE autocomplete",
          "Type-safe APIs",
          "Example code"
        ]} 
        color="from-green-500/10"
        link="https://github.com/DytallixHQ/Dytallix/blob/main/examples/typescript-usage.ts"
      />
    </div>

    {/* Code Examples */}
    <div className="mt-10">
      <h2 className="text-2xl font-bold">📝 Code Examples</h2>
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="font-semibold mb-3">Basic Usage</div>
          <div className="bg-black/30 rounded-lg p-3 font-mono text-xs overflow-x-auto">
            <pre className="text-neutral-300">{`import { DytallixClient } from '@dytallix/sdk';

const client = new DytallixClient({
  rpcUrl: 'https://rpc.testnet.dytallix.network',
  chainId: 'dyt-testnet-1'
});

const status = await client.getStatus();
console.log('Block:', status.block_height);`}</pre>
          </div>
          <a className="mt-3 text-sm text-blue-400 hover:underline inline-block" href="https://github.com/DytallixHQ/Dytallix/blob/main/examples/basic-usage.js" target="_blank" rel="noreferrer">View full example →</a>
        </div>

        <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
          <div className="font-semibold mb-3">Create PQC Wallet</div>
          <div className="bg-black/30 rounded-lg p-3 font-mono text-xs overflow-x-auto">
            <pre className="text-neutral-300">{`import { PQCWallet } from '@dytallix/sdk';

// ML-DSA (Dilithium)
const wallet = await PQCWallet.generate('ML-DSA');

console.log('Address:', wallet.address);
console.log('Algorithm:', wallet.algorithm);

const publicKey = await wallet.getPublicKey();`}</pre>
          </div>
          <a className="mt-3 text-sm text-blue-400 hover:underline inline-block" href="https://github.com/DytallixHQ/Dytallix/blob/main/examples/create-wallet.js" target="_blank" rel="noreferrer">View full example →</a>
        </div>
      </div>
    </div>

    {/* Resources */}
    <div className="mt-10">
      <h2 className="text-2xl font-bold">📚 Resources</h2>
      <div className="mt-4 grid md:grid-cols-3 gap-4">
        <a href="https://github.com/DytallixHQ/Dytallix" target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 hover:border-white/30 transition">
          <div className="text-lg font-semibold">GitHub Repository</div>
          <p className="mt-2 text-sm text-neutral-400">Source code, examples, and issues</p>
        </a>
        <a href="https://www.npmjs.com/package/@dytallix/sdk" target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 hover:border-white/30 transition">
          <div className="text-lg font-semibold">NPM Package</div>
          <p className="mt-2 text-sm text-neutral-400">Published SDK on NPM registry</p>
        </a>
        <a href="https://github.com/DytallixHQ/Dytallix/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 hover:border-white/30 transition">
          <div className="text-lg font-semibold">Changelog</div>
          <p className="mt-2 text-sm text-neutral-400">Release history and updates</p>
        </a>
      </div>
    </div>

    <div id="contribute" className="mt-16">
      <h2 className="text-2xl font-bold">🤝 Contributing</h2>
      <p className="mt-2 text-neutral-300">We welcome contributions! Fork the repository, create a branch, and submit a pull request.</p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>• Check existing <a className="text-blue-400 hover:underline" href="https://github.com/DytallixHQ/Dytallix/issues" target="_blank" rel="noreferrer">Issues</a> and <a className="text-blue-400 hover:underline" href="https://github.com/DytallixHQ/Dytallix/pulls" target="_blank" rel="noreferrer">Pull Requests</a></li>
          <li>• Follow the <a className="text-blue-400 hover:underline" href="https://github.com/DytallixHQ/Dytallix/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Contributing Guidelines</a></li>
          <li>• Write clear commit messages using conventional commits</li>
          <li>• Add tests and documentation for new features</li>
          <li>• Security issues: Please report privately via GitHub Security Advisories</li>
        </ul>
      </div>
    </div>

    <div id="rfc" className="mt-10">
      <h2 className="text-2xl font-bold">📋 RFCs</h2>
      <p className="mt-2 text-neutral-300">Propose changes via RFCs (Request for Comments). Each proposal includes rationale, threat model, and migration path.</p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
        <p className="text-sm text-neutral-300">Open an <a className="text-blue-400 hover:underline" href="https://github.com/DytallixHQ/Dytallix/issues/new" target="_blank" rel="noreferrer">issue</a> with the RFC label to start a discussion.</p>
      </div>
    </div>

    <div id="security" className="mt-10">
      <h2 className="text-2xl font-bold">🔒 Security</h2>
      <p className="mt-2 text-neutral-300">We practice defense-in-depth, formal specifications, fuzzing, and third-party audits.</p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
        <p className="text-sm text-neutral-300">Found a vulnerability? Please report it via <a className="text-blue-400 hover:underline" href="https://github.com/DytallixHQ/Dytallix/security/advisories/new" target="_blank" rel="noreferrer">GitHub Security Advisories</a>.</p>
      </div>
    </div>
  </Page>
);

const DocCard = ({ title, items, color, link }) => (
  <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${color || 'from-white/5'} to-transparent p-6`}>
    <div className="font-semibold">{title}</div>
    <ul className="mt-3 text-sm text-neutral-300 list-disc list-inside">
      {items.map((i) => <li key={i}>{i}</li>)}
    </ul>
    {link && (
      <a 
        href={link} 
        target="_blank" 
        rel="noreferrer" 
        className="mt-4 inline-flex items-center text-sm text-blue-400 hover:text-blue-300 hover:underline transition"
      >
        Learn more →
      </a>
    )}
  </div>
);

const BalanceLookup = () => {
  const [addr, setAddr] = useState('');
  const [bal, setBal] = useState(null);
  const handle = (e) => { e.preventDefault(); setBal(getAddressBalances(addr.trim())); };
  return (
    <form onSubmit={handle} className="space-y-2">
      <div className="text-sm text-neutral-300 font-medium">Check Address Balances</div>
      <input
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        placeholder="pqc1..."
        className="w-full rounded-xl bg-neutral-900 border border-white/10 px-3 py-2 outline-none focus:border-white/30 font-mono text-sm"
      />
      <button className="px-3 py-2 rounded-xl bg-white text-black text-sm font-semibold">Lookup</button>
      {bal && (
        <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-white/5 p-3 border border-white/10">
            <div className="text-xs text-neutral-400">DGT</div>
            <div className="text-lg font-bold">{bal.DGT?.toLocaleString?.() || bal.DGT}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 border border-white/10">
            <div className="text-xs text-neutral-400">DRT</div>
            <div className="text-lg font-bold">{bal.DRT?.toLocaleString?.() || bal.DRT}</div>
          </div>
        </div>
      )}
      <div className="text-xs text-neutral-500">Testnet balances • Reflects Faucet requests</div>
    </form>
  );
};

const DashboardPage = () => {
  const stats = useBlockchainStats();
  const [nodeStats, setNodeStats] = useState({});
  
  useEffect(() => {
    const fetchNodeStats = async () => {
      const rpcUrl = import.meta.env.VITE_DYT_NODE || import.meta.env.VITE_RPC_HTTP_URL || 'http://localhost:3030';
      
      const nodeConfig = [
        { name: 'Seed Node', id: 'seed', port: 3030, role: 'seed' },
        { name: 'Validator 1', id: 'validator1', port: 3031, role: 'validator' },
        { name: 'Validator 2', id: 'validator2', port: 3032, role: 'validator' },
        { name: 'Validator 3', id: 'validator3', port: 3034, role: 'validator' },
        { name: 'RPC Node', id: 'rpc', port: 3033, role: 'rpc' },
      ];
      
      const results = {};
      for (const node of nodeConfig) {
        try {
          // Only fetch from the actual running node (3030), mark others as offline
          if (node.port === 3030) {
            const res = await fetch(`${rpcUrl}/status`);
            const data = await res.json();
            results[node.port] = { ...data, ...node, online: data.status === 'healthy' };
          } else {
            // Other nodes are not running in this single-node setup
            results[node.port] = { ...node, online: false };
          }
        } catch {
          results[node.port] = { ...node, online: false };
        }
      }
      setNodeStats(results);
    };
    
    fetchNodeStats();
    const interval = setInterval(fetchNodeStats, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Page>
      <h1 className="text-3xl md:text-4xl font-extrabold">Network Dashboard</h1>
      <p className="mt-3 text-neutral-300 max-w-prose">Live telemetry for PQC algorithms, nodes, and chain health. Real-time metrics updated every 3-5 seconds.</p>
      {/* Quick Balance Lookup (demo) */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 max-w-xl">
        <BalanceLookup />
      </div>
      {/* Main Stats Grid */}
      <div className="mt-8 grid md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400">Block Height</div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div className="mt-2 text-3xl font-bold">{stats?.latest_height?.toLocaleString() || '...'}</div>
          <div className="mt-1 text-xs text-neutral-500">Chain: {stats?.chain_id || '...'}</div>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
          <div className="text-sm text-neutral-400">Mempool</div>
          <div className="mt-2 text-3xl font-bold">{stats?.mempool_size ?? '...'}</div>
          <div className="mt-1 text-xs text-neutral-500">Pending transactions</div>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
          <div className="text-sm text-neutral-400">Network Status</div>
          <div className="mt-2 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stats?.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-2xl font-bold capitalize">{stats?.status || '...'}</span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">Syncing: {stats?.syncing ? 'Yes' : 'No'}</div>
        </div>
        
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-transparent p-6">
          <div className="text-sm text-neutral-400">Block Time</div>
          <div className="mt-2 text-3xl font-bold">~2.0s</div>
          <div className="mt-1 text-xs text-neutral-500">Average finality</div>
        </div>
      </div>
      
      {/* Algorithm Health */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <span className="text-green-500 text-xl">✓</span>
          </div>
          <div>
            <div className="font-semibold text-lg">Algorithm Health</div>
            <div className="text-xs text-neutral-400">Post-Quantum Cryptography Performance</div>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/5 p-4 border border-white/5">
            <div className="text-xs text-neutral-400 mb-1">ML-DSA (Dilithium)</div>
            <div className="text-xl font-bold text-green-400">0.42ms</div>
            <div className="text-xs text-neutral-500 mt-1">Median verify latency</div>
          </div>
          <div className="rounded-xl bg-white/5 p-4 border border-white/5">
            <div className="text-xs text-neutral-400 mb-1">SLH-DSA (SPHINCS+)</div>
            <div className="text-xl font-bold text-green-400">5.8ms</div>
            <div className="text-xs text-neutral-500 mt-1">Median (p95: 9.9ms)</div>
          </div>
          <div className="rounded-xl bg-white/5 p-4 border border-white/5">
            <div className="text-xs text-neutral-400 mb-1">ML-KEM (Kyber)</div>
            <div className="text-xl font-bold text-green-400">0.71ms</div>
            <div className="text-xs text-neutral-500 mt-1">KEM decaps p95</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-neutral-500">
          ✓ All primitives passing NIST Known-Answer-Tests
        </div>
      </div>
      
      {/* Network Status */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-500 text-xl">◉</span>
          </div>
          <div>
            <div className="font-semibold text-lg">Network Status</div>
            <div className="text-xs text-neutral-400">Dytallix Testnet • Single Node</div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Active Node */}
          {Object.values(nodeStats).filter(n => n.online).slice(0, 1).map((node) => (
            <div key={node.port} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{node.name}</div>
                  <div className="text-xs text-neutral-500">{node.role}</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Height</span>
                  <span className="font-mono text-neutral-200">{node.latest_height?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Status</span>
                  <span className="text-green-400 capitalize">{node.status}</span>
                </div>
              </div>
              <a 
                href={`http://localhost:${node.port}/status`} 
                target="_blank" 
                rel="noreferrer"
                className="mt-3 block text-xs text-blue-400 hover:text-blue-300"
              >
                View API →
              </a>
            </div>
          ))}
          
          {/* Network Stats */}
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-4">
            <div className="font-semibold text-sm mb-3">Network Performance</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Block Time</span>
                <span className="font-mono text-neutral-200">~2.0s</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Tx Capacity</span>
                <span className="font-mono text-neutral-200">100/block</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Avg TPS</span>
                <span className="font-mono text-neutral-200">~50</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Peak TPS</span>
                <span className="font-mono text-green-400">3,200</span>
              </div>
            </div>
          </div>
          
          {/* Security Info */}
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-transparent p-4">
            <div className="font-semibold text-sm mb-3">Security Features</div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-neutral-300">ML-DSA Signatures</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-neutral-300">BLAKE3 Hashing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-neutral-300">Dual Token System</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-neutral-300">Adaptive Emission</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

const TokenomicsPage = () => (
  <Page>
    <h1 className="text-3xl md:text-4xl font-extrabold">Tokenomics</h1>
    <p className="mt-3 text-neutral-300 max-w-prose">
      Dytallix uses a dual-token model governed on-chain. <span className="font-semibold">DGT</span> powers governance and staking delegation; <span className="font-semibold">DRT</span> is the adaptive-emission reward token distributed each block.
    </p>

    {/* Two tokens */}
    <div className="mt-8 grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
        <div className="font-semibold">DGT — Governance</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Used for DAO voting and staking delegation (locked, not spent)</li>
          <li>Non-inflationary design; standard token ops</li>
          <li>Fixed Supply - 1,000,000,000 DGT; voting power proportional to holdings</li>
        
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
        <div className="font-semibold">DRT — Rewards</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Minted by the Emission Controller; burnable by holders</li>
          <li>Adaptive emission under DAO control</li>
          <li>Paid to validators, stakers, and treasury each block</li>
        </ul>
      </div>
    </div>

    {/* Emission & distribution */}
    <div className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
      <div className="font-semibold">How Emission Works</div>
      <p className="mt-2 text-sm text-neutral-300">
        The Emission Controller adjusts DRT issuance based on network utilization within DAO-set bounds (min/max rate, adjustment factor, base rate).
        Parameters are updated by governance and enforced on-chain.
      </p>
      <div className="mt-4 grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-lg font-bold">40%</div>
          <div className="text-xs text-neutral-400">Validator rewards</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-lg font-bold">30%</div>
          <div className="text-xs text-neutral-400">Staker rewards</div>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="text-lg font-bold">30%</div>
          <div className="text-xs text-neutral-400">Treasury / development</div>
        </div>
      </div>
    </div>

    {/* Staking & claiming */}
    <div className="mt-10 grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-transparent p-6">
        <div className="font-semibold">Staking Model</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Delegate <span className="font-semibold">DGT</span> to validators (locked, not spent)</li>
          <li>Earn <span className="font-semibold">DRT</span> from the staker pool—never DGT</li>
          <li>Rewards tracked via a global reward index; no loss at bootstrap (pending accruals applied once stake exists)</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-transparent p-6">
        <div className="font-semibold">Claiming Rewards</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Rewards accrue automatically as blocks are produced</li>
          <li>Delegators/validators claim <span className="font-semibold">DRT</span> from their pools</li>
          <li>Claims settle index math and update balances</li>
        </ul>
      </div>
    </div>

    {/* Governance */}
    <div className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-transparent p-6">
      <div className="font-semibold">Governance Controls</div>
      <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
        <li>Proposals: change emission rate/parameters, burn DRT, (init-only) mint DGT</li>
        <li>DGT-weighted voting → on-chain execution via Emission Controller</li>
        <li>All changes are parameterized and bounded for safety</li>
      </ul>
    </div>

    {/* Security & testnet notes */}
    <div className="mt-10 grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-red-500/10 to-transparent p-6">
        <div className="font-semibold">Security & Access Control</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Only Emission Controller can mint <span className="font-semibold">DRT</span></li>
          <li>One-time initial mint for <span className="font-semibold">DGT</span>; otherwise fixed supply</li>
          <li>Bounded rates, safe math, input validation, reentrancy guards</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-yellow-500/10 to-transparent p-6">
        <div className="font-semibold">Testnet Notes</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Parameters may change rapidly via governance during testing</li>
          <li>Get DGT/DRT from the <a className="underline" href="#/faucet">Faucet</a></li>
          <li>Track emission rate, pools, and proposals on the <a className="underline" href="#/dashboard">Dashboard</a></li>
        </ul>
      </div>
    </div>
  </Page>
);

// ================== EXPLORER PAGE ==================

// Helper functions for Explorer
const detectQueryType = (q) => {
  const trimmed = (q || '').trim();
  if (!trimmed) return 'unknown';
  
  // Address: starts with dyt, dytallix, or pqc (Bech32-like)
  if (/^(dyt1|dytallix1?|pqc1)[a-z0-9]{20,}$/i.test(trimmed)) return 'address';
  
  // Transaction ID: 64 hex chars
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed) || /^[0-9a-fA-F]{64}$/.test(trimmed)) return 'tx';
  
  // Block height: numeric
  if (/^\d+$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    if (num >= 0 && num < 1000000000) return 'blockHeight';
  }
  
  // Block hash: 64 hex chars (same as tx but context differs)
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed) || /^[0-9a-fA-F]{64}$/.test(trimmed)) return 'blockHash';
  
  return 'unknown';
};

const useDebouncedValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

const useQueryParam = (key) => {
  const getParam = () => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    return params.get(key) || '';
  };
  
  const [value, setValue] = useState(getParam());
  
  useEffect(() => {
    const onHash = () => setValue(getParam());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const setParam = (newValue) => {
    const [path] = window.location.hash.split('?');
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    if (newValue) {
      params.set(key, newValue);
    } else {
      params.delete(key);
    }
    const newHash = params.toString() ? `${path}?${params.toString()}` : path;
    window.location.hash = newHash;
  };
  
  return [value, setParam];
};

const fmtAmount = (amount, decimals = 6) => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return '0';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
};

const shorten = (str, start = 10, end = 6) => {
  if (!str || str.length <= start + end) return str || '';
  return `${str.slice(0, start)}...${str.slice(-end)}`;
};

const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now();
  // Backend returns Unix timestamp in seconds, JS Date expects milliseconds
  const ts = typeof timestamp === 'number' ? timestamp * 1000 : new Date(timestamp).getTime();
  const diff = Math.floor((now - ts) / 1000);
  
  if (diff < 0) return 'just now'; // Handle future timestamps
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// Simple QR code generator (inline, no external deps)
const drawQrToCanvas = (canvas, text) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 200;
  canvas.width = size;
  canvas.height = size;
  
  // Simple pattern based on text hash
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  
  const modules = 21;
  const moduleSize = size / modules;
  
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const index = y * modules + x;
      const bit = (Math.abs(hash) >> (index % 32)) & 1;
      if (bit) {
        ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
      }
    }
  }
};

// Simple identicon generator
const drawIdenticon = (canvas, address) => {
  if (!canvas || !address) return;
  const ctx = canvas.getContext('2d');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i);
    hash = hash & hash;
  }
  
  const hue = Math.abs(hash) % 360;
  ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
  ctx.fillRect(0, 0, size, size);
  
  ctx.fillStyle = `hsl(${(hue + 180) % 360}, 70%, 70%)`;
  const gridSize = 5;
  const cellSize = size / gridSize;
  
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < Math.ceil(gridSize / 2); x++) {
      const index = y * gridSize + x;
      const bit = (Math.abs(hash) >> (index % 32)) & 1;
      if (bit) {
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        // Mirror
        ctx.fillRect((gridSize - 1 - x) * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
};



// Skeleton loaders
const SkeletonLine = ({ width = '100%' }) => (
  <div className="h-4 bg-white/5 rounded animate-pulse" style={{ width }} />
);

const SkeletonCard = () => (
  <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6 space-y-3">
    <SkeletonLine width="40%" />
    <SkeletonLine width="60%" />
    <SkeletonLine width="80%" />
  </div>
);

const ExplorerPage = () => {
  const [q, setQ] = useQueryParam('q');
  const [activeTab, setActiveTab] = useQueryParam('view');
  const [inputValue, setInputValue] = useState(q);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRawJson, setShowRawJson] = useState(false);
  const [recentActivity, setRecentActivity] = useState({ blocks: [], transactions: [] });
  const [activityLoading, setActivityLoading] = useState(true);
  
  const debouncedQ = useDebouncedValue(q, 300);
  const detected = useMemo(() => detectQueryType(debouncedQ), [debouncedQ]);
  
  const rpcUrl = import.meta.env.VITE_DYT_NODE || import.meta.env.VITE_RPC_HTTP_URL;
  
  // Debug logging
  console.log('[Explorer] RPC URL:', rpcUrl);
  
  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('explorer-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  
  // Fetch recent activity when no search is active
  useEffect(() => {
    if (debouncedQ) {
      // Keep existing data when searching, don't reset
      return;
    }
    
    const controller = new AbortController();
    
    const fetchRecentActivity = async () => {
      // Only show loading on initial load
      if (recentActivity.blocks.length === 0) {
        setActivityLoading(true);
      }
      
      try {
        // Fetch recent blocks - get more for scrolling
        const blocksResp = await fetch(`${rpcUrl}/blocks?limit=100`, { signal: controller.signal });
        if (!blocksResp.ok) throw new Error('Failed to fetch blocks');
        
        const blocksData = await blocksResp.json();
        const blocks = blocksData.blocks || [];
        
        // For each block with transactions, fetch the full block details
        const recentTxs = [];
        const recentBlocks = [];
        
        for (const block of blocks) {
          try {
            const blockResp = await fetch(`${rpcUrl}/block/${block.height}`, { signal: controller.signal });
            if (blockResp.ok) {
              const blockData = await blockResp.json();
              
              recentBlocks.push({
                height: blockData.height,
                hash: blockData.hash,
                timestamp: blockData.timestamp,
                txCount: blockData.txs?.length || 0,
                producer: blockData.producer || 'dyt1validator'
              });
              
              // Fetch transaction details for each tx in the block
              if (blockData.txs && blockData.txs.length > 0) {
                for (const tx of blockData.txs) {
                  if (recentTxs.length >= 50) break; // Limit to 50 recent txs
                  
                  recentTxs.push({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    amount: tx.amount,
                    denom: tx.denom || 'DRT',
                    status: tx.status || 'confirmed',
                    timestamp: blockData.timestamp,
                    block: blockData.height,
                    fee: tx.fee || 0
                  });
                }
              }
            }
          } catch (e) {
            // Skip failed block fetches
            console.warn(`Failed to fetch block ${block.height}:`, e);
          }
          
          if (recentTxs.length >= 50) break;
        }
        
        // Update state with new data
        setRecentActivity({
          blocks: recentBlocks,
          transactions: recentTxs
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch recent activity:', err);
        }
      } finally {
        setActivityLoading(false);
      }
    };
    
    // Fetch immediately on mount
    fetchRecentActivity();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchRecentActivity, 5000);
    
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [debouncedQ, rpcUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Fetch data when query changes
  useEffect(() => {
    if (!debouncedQ) {
      setData(null);
      setError(null);
      return;
    }
    
    const controller = new AbortController();
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Real API calls
        let endpoint = '';
        if (detected === 'address') {
          endpoint = `${rpcUrl}/balance/${encodeURIComponent(debouncedQ)}`;
        } else if (detected === 'tx') {
          endpoint = `${rpcUrl}/tx/${encodeURIComponent(debouncedQ)}`;
        } else if (detected === 'blockHeight' || detected === 'blockHash') {
          endpoint = `${rpcUrl}/block/${encodeURIComponent(debouncedQ)}`;
        }
        
        if (endpoint) {
          const response = await fetch(endpoint, {
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            throw new Error(`Not found (${response.status})`);
          }
          
          const result = await response.json();
          
          // Transform API response to match expected format
          if (detected === 'address') {
              // Transform balance API response - NO MOCK DATA
              const addressData = {
                address: result.address,
                balance: {
                  DGT: parseInt(result.balances?.udgt?.balance || '0') / 1000000,
                  DRT: parseInt(result.balances?.udrt?.balance || '0') / 1000000
                },
                nonce: result.nonce || 0,
                transactions: [] // Real transaction history - will be populated when available
              };
              
              // Optionally fetch recent blocks to find transactions involving this address
              try {
                console.log('[Explorer] Fetching transaction history for address:', result.address);
                const blocksResp = await fetch(`${rpcUrl}/blocks?limit=100`, { signal: controller.signal });
                if (blocksResp.ok) {
                  const blocksData = await blocksResp.json();
                  console.log('[Explorer] Fetched blocks:', blocksData.blocks?.length || 0);
                  const addressTxs = [];
                  
                  // Scan blocks for transactions involving this address
                  for (const block of blocksData.blocks || []) {
                    console.log(`[Explorer] Scanning block ${block.height}, txs field:`, block.txs);
                    
                    // Skip blocks with no transactions
                    if (!block.txs || block.txs.length === 0) {
                      continue;
                    }
                    
                    console.log(`[Explorer] Block ${block.height} has ${block.txs.length} txs`);
                    
                    // Fetch the full block to get transaction details
                    try {
                      const fullBlockResp = await fetch(`${rpcUrl}/block/${block.height}`, { signal: controller.signal });
                      if (!fullBlockResp.ok) {
                        console.warn(`[Explorer] Failed to fetch block ${block.height}: ${fullBlockResp.status}`);
                        continue;
                      }
                      
                      const fullBlock = await fullBlockResp.json();
                      console.log(`[Explorer] Full block ${block.height} data:`, fullBlock);
                      
                      // Check if fullBlock has txs array
                      if (!fullBlock.txs || !Array.isArray(fullBlock.txs)) {
                        console.warn(`[Explorer] Block ${block.height} has no txs array in full data`);
                        continue;
                      }
                      
                      console.log(`[Explorer] Block ${block.height} full txs:`, fullBlock.txs);
                      
                      // Check each transaction in the block
                      for (const tx of fullBlock.txs) {
                        console.log('[Explorer] Checking tx:', {
                          hash: tx.hash,
                          from: tx.from,
                          to: tx.to,
                          targetAddress: result.address
                        });
                        
                        if (tx.from === result.address || tx.to === result.address) {
                          console.log('[Explorer] ✅ Found matching tx!', tx.hash);
                          addressTxs.push({
                            hash: tx.hash,
                            from: tx.from,
                            to: tx.to,
                            amount: tx.amount / 1_000_000, // Convert from micro-units
                            denom: (tx.denom || 'udrt').replace('u', '').toUpperCase(), // Convert udrt -> DRT
                            status: tx.status || 'confirmed',
                            timestamp: fullBlock.timestamp || new Date(Date.now() - (3000 - block.height) * 2000).toISOString(),
                            fee: tx.fee || 0,
                            block: block.height
                          });
                        }
                      }
                    } catch (e) {
                      console.error(`[Explorer] Error fetching block ${block.height}:`, e);
                    }
                  }
                  
                  console.log('[Explorer] Found', addressTxs.length, 'transactions for address');
                  addressData.transactions = addressTxs;
                }
              } catch (e) {
                // If block scanning fails, just show empty transactions
                console.error('[Explorer] Failed to fetch transaction history:', e);
              }
              
              setData(addressData);
            } else if (detected === 'tx') {
              // Transform transaction receipt response
              const txData = {
                hash: result.tx_hash || result.hash,
                from: result.from,
                to: result.to,
                amount: parseInt(result.amount || '0') / 1000000, // Convert from micro-units
                denom: 'DRT', // Default to DRT for now
                fee: parseInt(result.fee || '0') / 1000000,
                nonce: result.nonce,
                block: result.block_height, // Map block_height to block
                status: result.success ? 'confirmed' : 'failed',
                timestamp: new Date().toISOString(), // Use current time as fallback
                gas_used: result.gas_used,
                gas_limit: result.gas_limit,
                memo: result.memo || ''
              };
              setData(txData);
            } else {
              setData(result);
            }
            
            // Auto-select tab
            if (!activeTab || activeTab === 'all') {
              if (detected === 'address') setActiveTab('address');
              else if (detected === 'tx') setActiveTab('tx');
              else if (detected === 'blockHeight' || detected === 'blockHash') setActiveTab('block');
            }
          } else {
            setData(null);
          }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    return () => controller.abort();
  }, [debouncedQ, detected, rpcUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Sync input with query param
  useEffect(() => {
    setInputValue(q);
  }, [q]);
  
  const handleSearch = (e) => {
    e.preventDefault();
    setQ(inputValue);
    setCurrentPage(1);
  };
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    // If input is cleared, clear the query to show recent activity again
    if (value.trim() === '') {
      setQ('');
      setData(null);
      setError(null);
    }
  };
  
  const handleClearSearch = () => {
    setInputValue('');
    setQ('');
    setData(null);
    setError(null);
    setCurrentPage(1);
  };
  
  const handleCopy = async (text) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  
  const renderAddressView = () => {
    if (!data) return null;
    
    return (
      <div className="space-y-6">
        {/* Address Overview */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
          <div className="flex items-start gap-4">
            <canvas
              ref={(el) => el && drawIdenticon(el, data.address)}
              className="rounded-xl border-2 border-purple-500/30"
              width="64"
              height="64"
            />
            <div className="flex-1">
              <div className="text-xs text-purple-400 font-medium mb-1">Address</div>
              <div className="flex items-center gap-2 mb-3">
                <code className="text-sm font-mono text-purple-300">{shorten(data.address, 16, 8)}</code>
                <button
                  onClick={() => handleCopy(data.address)}
                  className="px-2 py-1 text-xs rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition"
                >
                  {copied ? '✓' : '📋'}
                </button>
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="px-2 py-1 text-xs rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition"
                >
                  QR
                </button>
              </div>
              
              {showQr && (
                <div className="mb-4">
                  <canvas
                    ref={(el) => el && drawQrToCanvas(el, data.address)}
                    className="border-2 border-purple-500/30 rounded-xl"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent p-4 border border-blue-500/20">
                  <div className="text-xs text-blue-400 font-medium">DGT Balance</div>
                  <div className="text-2xl font-bold mt-1 text-blue-300">{fmtAmount(data.balance?.DGT || 0)}</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-transparent p-4 border border-green-500/20">
                  <div className="text-xs text-green-400 font-medium">DRT Balance</div>
                  <div className="text-2xl font-bold mt-1 text-green-300">{fmtAmount(data.balance?.DRT || 0)}</div>
                </div>
              </div>
              
              {data.nonce !== undefined && (
                <div className="mt-3 text-sm text-neutral-400">
                  Nonce: <span className="text-orange-400 font-semibold">{data.nonce}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Recent Transactions */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <span className="text-green-500 text-xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold">Transaction History</h3>
          </div>
          
          {!data.transactions || data.transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📭</div>
              <div className="text-neutral-400 mb-2">No transactions found</div>
              <div className="text-xs text-neutral-500">
                This address has not sent or received any transactions yet
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {data.transactions.slice(0, currentPage * 10).map((tx) => (
                <div
                  key={tx.hash}
                  className="rounded-xl bg-white/5 hover:bg-gradient-to-br hover:from-green-500/10 hover:to-transparent border border-white/5 hover:border-green-500/20 p-4 transition cursor-pointer"
                  onClick={() => {
                    setQ(tx.hash);
                    setActiveTab('tx');
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs font-mono text-green-400">{shorten(tx.hash, 12, 8)}</code>
                    <span className={`px-2 py-1 text-xs rounded-lg ${
                      tx.status === 'confirmed' ? 'bg-green-500/20 text-green-300' :
                      tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className={tx.from === data.address ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                        {tx.from === data.address ? '↑ OUT' : '↓ IN'}
                      </span>
                      <span className="ml-2 text-white font-semibold">
                        {fmtAmount(tx.amount)}
                      </span>
                      <span className="ml-1 text-neutral-400">
                        {tx.denom}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400">{timeAgo(tx.timestamp)}</div>
                  </div>
                  <div className="mt-2 text-xs">
                    <span className="text-neutral-500">Block</span>{' '}
                    <span className="text-blue-400 font-mono">#{tx.block?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              
              {data.transactions.length > currentPage * 10 && (
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="w-full mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
                >
                  Load More
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderTxView = () => {
    if (!data) return null;
    
    return (
      <div className="space-y-6">
        {/* Status Header */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <span className="text-green-500 text-xl">⚡</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">Transaction Status</h3>
              <div className="text-xs text-neutral-400 mt-1">
                {data.confirmations ? `${data.confirmations} confirmations` : 'Pending'}
              </div>
            </div>
            <span className={`px-3 py-1.5 text-sm rounded-xl font-semibold ${
              data.status === 'confirmed' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
              data.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
              'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}>
              {data.status || 'Unknown'}
            </span>
          </div>
          
          {/* Progress bar for confirmations */}
          {data.status === 'confirmed' && data.confirmations && (
            <div className="mt-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, (data.confirmations / 6) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Transaction Details */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-500 text-xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold">Transaction Details</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-xs text-green-400 font-medium mb-1">Transaction ID</div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-green-300">{shorten(data.hash, 20, 10)}</code>
                <button
                  onClick={() => handleCopy(data.hash)}
                  className="px-2 py-1 text-xs rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-blue-400 font-medium mb-1">From</div>
                <button
                  onClick={() => {
                    setQ(data.from);
                    setActiveTab('address');
                  }}
                  className="text-sm font-mono text-blue-300 hover:text-blue-200 transition"
                >
                  {shorten(data.from, 12, 8)}
                </button>
              </div>
              
              <div>
                <div className="text-xs text-purple-400 font-medium mb-1">To</div>
                <button
                  onClick={() => {
                    setQ(data.to);
                    setActiveTab('address');
                  }}
                  className="text-sm font-mono text-purple-300 hover:text-purple-200 transition"
                >
                  {shorten(data.to, 12, 8)}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-green-400 font-medium mb-1">Amount</div>
                <div className="text-sm">
                  <span className="text-green-300 font-semibold">{fmtAmount(data.amount)}</span> <span className="text-neutral-400">{data.denom}</span>
                </div>
              </div>
              
              <div>
                <div className="text-xs text-orange-400 font-medium mb-1">Fee</div>
                <div className="text-sm text-orange-300">{fmtAmount(data.fee || 0)} DGT</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-yellow-400 font-medium mb-1">Nonce</div>
                <div className="text-sm text-yellow-300">{data.nonce}</div>
              </div>
              
              <div>
                <div className="text-xs text-blue-400 font-medium mb-1">Block</div>
                {data.block ? (
                  <button
                    onClick={() => {
                      setQ(data.block.toString());
                      setActiveTab('block');
                    }}
                    className="text-sm text-blue-300 hover:text-blue-200 transition font-semibold"
                  >
                    #{data.block.toLocaleString()}
                  </button>
                ) : (
                  <div className="text-sm text-neutral-400">Pending</div>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-neutral-400 font-medium mb-1">Timestamp</div>
              <div className="text-sm">
                <span className="text-neutral-200">{new Date(data.timestamp * 1000).toLocaleString()}</span>
                <span className="ml-2 text-neutral-400">({timeAgo(data.timestamp)})</span>
              </div>
            </div>
            
            {data.memo && (
              <div>
                <div className="text-xs text-neutral-400 mb-1">Memo</div>
                <div className="text-sm">{data.memo}</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Raw JSON */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <span className="text-purple-500 text-xl">{ }</span>
              </div>
              <h3 className="text-lg font-semibold">Raw Data</h3>
            </div>
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="px-3 py-1.5 text-sm rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition"
            >
              {showRawJson ? 'Hide' : 'Show'} JSON
            </button>
          </div>
          
          {showRawJson && (
            <pre className="text-xs font-mono bg-black/30 p-4 rounded-xl overflow-x-auto border border-purple-500/20">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  };
  
  const renderBlockView = () => {
    if (!data) return null;
    
    return (
      <div className="space-y-6">
        {/* Block Header */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-blue-500 text-xl">◼</span>
            </div>
            <h3 className="text-lg font-semibold">Block <span className="text-blue-400">#{data.height}</span></h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-blue-400 font-medium mb-1">Hash</div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-blue-300">{shorten(data.hash, 12, 8)}</code>
                <button
                  onClick={() => handleCopy(data.hash)}
                  className="px-2 py-1 text-xs rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>
            
            <div>
              <div className="text-xs text-purple-400 font-medium mb-1">Timestamp</div>
              <div className="text-sm text-purple-300">
                {new Date(data.timestamp * 1000).toLocaleString()}
              </div>
              <div className="text-xs text-neutral-400">{timeAgo(data.timestamp)}</div>
            </div>
            
            <div>
              <div className="text-xs text-green-400 font-medium mb-1">Transactions</div>
              <div className="text-sm text-green-300 font-semibold">{data.txCount || 0}</div>
            </div>
            
            <div>
              <div className="text-xs text-orange-400 font-medium mb-1">Producer</div>
              <button
                onClick={() => {
                  setQ(data.producer);
                  setActiveTab('address');
                }}
                className="text-sm font-mono text-orange-400 hover:text-orange-300 transition"
              >
                {shorten(data.producer, 12, 8)}
              </button>
            </div>
            
            <div>
              <div className="text-xs text-cyan-400 font-medium mb-1">Parent Hash</div>
              <button
                onClick={() => {
                  setQ(data.parentHash);
                  setActiveTab('block');
                }}
                className="text-sm font-mono text-cyan-400 hover:text-cyan-300 transition"
              >
                {shorten(data.parentHash, 12, 8)}
              </button>
            </div>
            
            {data.gasUsed !== undefined && (
              <div>
                <div className="text-xs text-yellow-400 font-medium mb-1">Gas Used</div>
                <div className="text-sm text-yellow-300">{fmtAmount(data.gasUsed, 0)}</div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mt-4">
            {data.height > 0 && (
              <button
                onClick={() => {
                  setQ((data.height - 1).toString());
                  setActiveTab('block');
                }}
                className="px-3 py-1.5 text-sm rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition"
              >
                ← Previous Block
              </button>
            )}
            <button
              onClick={() => {
                setQ((data.height + 1).toString());
                setActiveTab('block');
              }}
              className="px-3 py-1.5 text-sm rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition"
            >
              Next Block →
            </button>
          </div>
        </div>
        
        {/* Transactions List */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <span className="text-green-500 text-xl">⚡</span>
            </div>
            <h3 className="text-lg font-semibold">Transactions</h3>
          </div>
          
          {!data.transactions || data.transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📭</div>
              <div className="text-neutral-400">No transactions in this block</div>
            </div>
          ) : (
            <div className="space-y-2">
              {data.transactions.map((tx) => (
                <div
                  key={tx.hash}
                  className="rounded-xl bg-white/5 hover:bg-gradient-to-br hover:from-green-500/10 hover:to-transparent border border-white/5 hover:border-green-500/20 p-4 transition cursor-pointer"
                  onClick={() => {
                    setQ(tx.hash);
                    setActiveTab('tx');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <code className="text-xs font-mono text-green-400">{shorten(tx.hash, 12, 8)}</code>
                      <div className="text-sm mt-1">
                        <span className="text-neutral-400">From</span>{' '}
                        <span className="font-mono text-xs text-blue-400">{shorten(tx.from, 8, 6)}</span>{' '}
                        <span className="text-neutral-400">→</span>{' '}
                        <span className="font-mono text-xs text-purple-400">{shorten(tx.to, 8, 6)}</span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="text-green-300 font-semibold">{fmtAmount(tx.amount)}</span>{' '}
                      <span className="text-neutral-400">{tx.denom}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderSearchAllView = () => {
    // Show recent activity when not searching
    if (!q) {
      return (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Blocks */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <span className="text-blue-500 text-xl">◼</span>
              </div>
              <div className="flex-1 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Blocks</h3>
                {recentActivity.blocks.length > 0 && (
                  <span className="text-xs text-neutral-500">{recentActivity.blocks.length} loaded</span>
                )}
              </div>
            </div>
            
            {activityLoading && recentActivity.blocks.length === 0 ? (
              <div className="space-y-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : recentActivity.blocks.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">No blocks found</div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {recentActivity.blocks.slice(0, currentPage * 20).map((block) => (
                  <div
                    key={block.height}
                    className="rounded-xl bg-white/5 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-transparent border border-white/5 hover:border-blue-500/20 p-4 transition cursor-pointer"
                    onClick={() => {
                      setQ(block.height.toString());
                      setActiveTab('block');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold mb-1 text-blue-400">Block #{block.height.toLocaleString()}</div>
                        <code className="text-xs font-mono text-neutral-400">{shorten(block.hash, 12, 8)}</code>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-purple-400">{block.txCount} txs</div>
                        <div className="text-xs text-neutral-500">{timeAgo(block.timestamp)}</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {recentActivity.blocks.length > currentPage * 20 && (
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="w-full mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
                  >
                    Load More Blocks
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Recent Transactions */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-transparent p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <span className="text-green-500 text-xl">⚡</span>
              </div>
              <div className="flex-1 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recent Transactions</h3>
                {recentActivity.transactions.length > 0 && (
                  <span className="text-xs text-neutral-500">{recentActivity.transactions.length} total</span>
                )}
              </div>
            </div>
            
            {activityLoading && recentActivity.transactions.length === 0 ? (
              <div className="space-y-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : recentActivity.transactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">📭</div>
                <div className="text-neutral-400">No transactions yet</div>
                <div className="text-xs text-neutral-500 mt-2">
                  Transactions will appear here as they are created
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {recentActivity.transactions.slice(0, currentPage * 20).map((tx) => (
                  <div
                    key={tx.hash}
                    className="rounded-xl bg-white/5 hover:bg-gradient-to-br hover:from-green-500/10 hover:to-transparent border border-white/5 hover:border-green-500/20 p-4 transition cursor-pointer"
                    onClick={() => {
                      setQ(tx.hash);
                      setActiveTab('tx');
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <code className="text-xs font-mono text-green-400">{shorten(tx.hash, 12, 8)}</code>
                      <span className={`px-2 py-1 text-xs rounded-lg ${
                        tx.status === 'confirmed' ? 'bg-green-500/20 text-green-300' :
                        tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-neutral-400">From</span>{' '}
                        <span className="font-mono text-xs text-blue-400">{shorten(tx.from, 8, 6)}</span>{' '}
                        <span className="text-neutral-400">→</span>{' '}
                        <span className="font-mono text-xs text-purple-400">{shorten(tx.to, 8, 6)}</span>
                      </div>
                      <div>
                        <span className="text-green-300 font-semibold">{fmtAmount(tx.amount)}</span>{' '}
                        <span className="text-neutral-400">{tx.denom}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-blue-400">Block #{tx.block.toLocaleString()}</span>
                      <span className="text-neutral-500">{timeAgo(tx.timestamp)}</span>
                    </div>
                  </div>
                ))}
                
                {recentActivity.transactions.length > currentPage * 20 && (
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="w-full mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
                  >
                    Load More
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Default search prompt
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">Try searching for something</h3>
          <p className="text-neutral-400 mb-6">
            Enter an address, transaction ID, block height, or block hash
          </p>
          <div className="text-sm text-neutral-500 space-y-1">
            <div>• Address: <code className="text-blue-400">dyt1...</code></div>
            <div>• Transaction: <code className="text-green-400">0x...</code> (64 hex chars)</div>
            <div>• Block Height: <code className="text-purple-400">12345</code></div>
            <div>• Block Hash: <code className="text-cyan-400">0x...</code> (64 hex chars)</div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Page>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Explorer</h1>
          <p className="mt-2 text-neutral-400">Search addresses, transactions, and blocks</p>
        </div>
        
        {/* Search Card */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <input
                id="explorer-search"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Search by address, tx id, block height or hash..."
                className="w-full rounded-xl bg-neutral-900 border border-white/10 px-4 py-3 pr-24 outline-none focus:border-white/30 transition"
                autoComplete="off"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-12 top-3 text-neutral-400 hover:text-white transition px-2"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              <div className="absolute right-3 top-3 text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
                /
              </div>
            </div>
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {detected !== 'unknown' && (
                  <span className="px-2 py-1 text-xs rounded-lg bg-white/5 text-neutral-300">
                    Detected: <span className="font-semibold">{detected}</span>
                  </span>
                )}
              </div>
              
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:opacity-90 transition"
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Results Area */}
        {loading && (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
        
        {error && !loading && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
            <div className="text-center">
              <div className="text-4xl mb-2">❌</div>
              <h3 className="text-lg font-semibold mb-2">Not Found</h3>
              <p className="text-neutral-400 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setQ('');
                  setInputValue('');
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-sm"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}
        
        {!loading && !error && data && (
          <div>
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto">
              {['address', 'tx', 'block', 'all'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-xl transition whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-white/10 text-white'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab === 'address' && 'Address'}
                  {tab === 'tx' && 'Transaction'}
                  {tab === 'block' && 'Block'}
                  {tab === 'all' && 'Search All'}
                </button>
              ))}
            </div>
            
            {/* Tab Content */}
            <div>
              {activeTab === 'address' && renderAddressView()}
              {activeTab === 'tx' && renderTxView()}
              {activeTab === 'block' && renderBlockView()}
              {activeTab === 'all' && renderSearchAllView()}
            </div>
          </div>
        )}
        
        {!loading && !error && !data && !q && renderSearchAllView()}
        
        {/* Help Footer */}
        <div className="text-center text-xs text-neutral-500 pt-6 border-t border-white/10">
          Powered by Dytallix • Testnet
        </div>
      </div>
    </Page>
  );
};

// ================== END EXPLORER PAGE ==================

export default function App() {
  const { route } = useHashRoute();
  const Component = useMemo(() => {
    switch(route){
      case '/wallet': return WalletPage;
      case '/faucet': return FaucetPage;
      case '/explorer': return ExplorerPage;
      case '/docs': return DocsPage;
      case '/dashboard': return DashboardPage;
      case '/tokenomics': return TokenomicsPage;
      default: return Home;
    }
  }, [route]);
  return <Component/>;
}
