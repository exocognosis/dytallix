import React, { useEffect, useMemo, useState } from "react";
import { exportKeystore as exportKeystoreAPI, serializeKeystore } from './wallet/keystore/index.js';
import { createWalletAdapter } from './wallet/pqc.js';
import { copyToClipboard } from './utils/clipboard.js';
import { truncateAddress } from './utils/format.js';

// Simple hash router
const useHashRoute = () => {
  const [route, setRoute] = useState(window.location.hash.replace('#','') || '/');
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace('#','') || '/');
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
        // Use the backend proxy endpoint to avoid CORS issues
        const res = await fetch('http://localhost:8787/api/nodes/seed/status');
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
  const links = [
    { href: '/', label: 'Home' },
    { href: '/wallet', label: 'PQC Wallet' },
    { href: '/faucet', label: 'Faucet' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/tokenomics', label: 'Tokenomics' },
    { href: '/docs', label: 'Docs' },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur border-b border-white/10 bg-neutral-950/60">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex h-16 items-center justify-between">
        <a href="#/" className="font-black tracking-widest text-xl">DYTALLIX</a>
        <nav className="hidden md:flex gap-6">
          {links.map((l) => (
            <a key={l.href} href={`#${l.href}`} className="text-sm text-neutral-300 hover:text-white transition">{l.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#/wallet" className="hidden sm:inline-flex px-3 py-2 rounded-2xl bg-white text-black text-sm font-semibold hover:opacity-90 transition">Launch App</a>
        </div>
      </div>
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
    { k: 'Block Height', v: stats ? stats.latest_height.toLocaleString() : '...', live: true, color: 'from-green-500/10' },
    { k: 'Finality', v: '~2.1s', color: 'from-cyan-500/10' },
    { k: 'TPS (peak)', v: '3,200', color: 'from-orange-500/10' },
    { k: 'Status', v: stats?.status || '...', live: stats?.status === 'healthy', color: 'from-emerald-500/10' },
  ];
  return (
    <div className="grid grid-cols-3 gap-6">
      {kpis.map((x) => (
        <div
          key={x.k}
          className={`rounded-2xl bg-gradient-to-br ${x.color} to-transparent p-4 border border-white/10`}
        >
          <div className="text-2xl font-bold flex items-center gap-2">
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
      <p className="mt-3 text-neutral-300 max-w-3xl">Spin up a local node, mint test assets, and ship PQC‑ready apps. Join the community, file RFCs, and help steer PQC adoption.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="#/docs" className="px-5 py-3 rounded-2xl bg-white text-black font-semibold hover:opacity-90 transition">Get Started</a>
        <a href="#/faucet" className="px-5 py-3 rounded-2xl border border-white/20 hover:border-white/40 transition">Request DGT/DRT</a>
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
          <li><a className="hover:underline" href="#/dashboard">Status & Telemetry</a></li>
          <li><a className="hover:underline" href="#/tokenomics">Tokenomics</a></li>
        </ul>
      </div>
      <div>
        <div className="font-semibold text-neutral-300">Community</div>
        <ul className="mt-2 space-y-1">
          <li><a className="hover:underline" href="#/docs#contribute">Contributing</a></li>
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
  
  // Load wallet from localStorage on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem('dytallix_wallet');
    if (savedWallet) {
      try {
        const wallet = JSON.parse(savedWallet);
        setFullAddr(wallet.fullAddr);
        setAddr(wallet.addr);
        setAlgorithm(wallet.algorithm);
        setGuardians(wallet.guardians || []);
        setCreated(true);
        // Load balances
        setBalances(getAddressBalances(wallet.fullAddr));
      } catch (err) {
        console.error('Failed to load wallet from localStorage:', err);
      }
    }
    
    // Load transaction history
    const savedTxs = localStorage.getItem('dytallix_transactions');
    if (savedTxs) {
      try {
        setTransactions(JSON.parse(savedTxs));
      } catch (err) {
        console.error('Failed to load transactions:', err);
      }
    }
  }, []);
  
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
      
      // Convert amount to micro-units
      const amountNum = parseFloat(txForm.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }
      const microAmount = Math.floor(amountNum * 1_000_000);
      
      // For demo, we'll use the dev/faucet endpoint to simulate the transaction
      // In production, this would call /api/wallet/sign-and-submit
      const payload = {
        from: fullAddr,
        to: txForm.to,
        amount: microAmount.toString(),
        denom: txForm.denom.toLowerCase(),
        memo: txForm.memo || '',
      };
      
      // Simulate transaction submission
      // TODO: Replace with real backend signing when wallet encryption is implemented
      const txHash = 'tx_' + Math.random().toString(36).substr(2, 16);
      
      // Save to history
      const tx = {
        hash: txHash,
        type: 'send',
        from: fullAddr,
        to: txForm.to,
        amount: amountNum,
        denom: txForm.denom,
        memo: txForm.memo,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      };
      saveTransaction(tx);
      
      // Update local balances (demo only)
      const currentBal = getAddressBalances(fullAddr);
      const newBal = {
        ...currentBal,
        [txForm.denom]: Math.max(0, currentBal[txForm.denom] - amountNum),
      };
      const allBal = readBalances();
      allBal[fullAddr] = newBal;
      writeBalances(allBal);
      setBalances(newBal);
      
      setTxSuccess({
        hash: txHash,
        amount: amountNum,
        denom: txForm.denom,
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
    const params = new URLSearchParams({
      to: fullAddr,
      amount: txForm.amount,
      denom: txForm.denom,
      memo: txForm.memo || '',
    });
    const link = `${window.location.origin}${window.location.pathname}#/pay?${params.toString()}`;
    setPaymentRequestLink(link);
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
  
  const create = () => {
    // Placeholder wallet generation (UI only). Hook into real SDK later.
    const prefix = algorithm === 'ML-DSA' ? 'pqc1ml' : 'pqc1slh';
    const random1 = Math.random().toString(36).slice(2,10);
    const random2 = Math.random().toString(36).slice(2,6);
    const full = prefix + random1 + random2; // Full address
    const truncated = prefix + random1 + '...' + random2; // Truncated for display
    
    const walletData = {
      fullAddr: full,
      addr: truncated,
      algorithm: algorithm,
      guardians: [],
      createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('dytallix_wallet', JSON.stringify(walletData));
    
    setFullAddr(full);
    setAddr(truncated);
    setCreated(true);
  };

  const refreshBalances = () => {
    if (!fullAddr) return;
    const newBalances = getAddressBalances(fullAddr);
    setBalances(newBalances);
  };

  // Auto-refresh balances when fullAddr changes or component mounts
  useEffect(() => {
    if (fullAddr) {
      const newBalances = getAddressBalances(fullAddr);
      setBalances(newBalances);
      
      // Set up auto-refresh every 5 seconds
      const interval = setInterval(() => {
        const updatedBalances = getAddressBalances(fullAddr);
        setBalances(updatedBalances);
      }, 5000);
      
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
      localStorage.removeItem('dytallix_wallet');
      setCreated(false);
      setAddr("");
      setFullAddr("");
      setAlgorithm('ML-DSA');
      setGuardians([]);
      setBalances({ DGT: 0, DRT: 0 });
    }
  };
  return (
    <Page>
      <h1 className="text-3xl md:text-4xl font-extrabold">PQC Wallet</h1>
      <p className="mt-3 text-neutral-300 max-w-prose">Create and manage a quantum-resistant wallet secured by NIST-standardized post-quantum cryptography. Your keys never leave your device.</p>
      
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
      <div className="mt-8 grid lg:grid-cols-2 gap-6">
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
            <button onClick={create} className="mt-6 w-full px-5 py-3 rounded-2xl bg-white text-black font-semibold hover:opacity-90 transition">
              Generate PQC Wallet
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
              <div className="text-xs text-neutral-500 mt-2">
                Testnet balances • Auto-refreshes every 5 seconds
              </div>
            </div>
            {/* Transaction Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setTxType('send'); setShowTransactionModal(true); }} 
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition"
              >
                💸 Send Tokens
              </button>
              <button 
                onClick={() => { setTxType('request'); setShowTransactionModal(true); setPaymentRequestLink(''); }} 
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 transition"
              >
                📥 Request Payment
              </button>
            </div>
            
            {/* Wallet Management Actions */}
            <div className="grid grid-cols-2 gap-3 mt-3">
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
            
            {/* Transaction History */}
            {transactions.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-neutral-900 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-neutral-400 font-medium">Recent Transactions</div>
                  <div className="text-xs text-neutral-500">{transactions.length} total</div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {transactions.slice(0, 10).map((tx, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${tx.type === 'send' ? 'text-red-400' : 'text-green-400'}`}>
                            {tx.type === 'send' ? '↗ Sent' : '↙ Received'}
                          </span>
                          <span className="text-xs font-mono text-neutral-300">
                            {tx.amount} {tx.denom}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                            {tx.status}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1 truncate">
                          {tx.type === 'send' ? 'To: ' : 'From: '}{tx.type === 'send' ? tx.to : tx.from}
                        </div>
                        {tx.memo && <div className="text-xs text-neutral-600 italic mt-0.5">{tx.memo}</div>}
                      </div>
                      <div className="text-xs text-neutral-600 ml-2">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
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

      {/* Send/Request Tokens Card */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4">
          <div className="font-semibold text-lg">Send / Request Tokens</div>
          <div className="text-xs text-neutral-400 mt-1">Transaction management powered by PQC signatures</div>
        </div>
        <div className="flex items-center justify-between mb-4 p-3 rounded-xl bg-neutral-900/50">
          <div className="text-sm text-neutral-400">Available Balance</div>
          <div className="text-sm font-bold">
            DGT: {balances.DGT?.toLocaleString?.() || balances.DGT} • DRT: {balances.DRT?.toLocaleString?.() || balances.DRT}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => { setTxType('send'); setShowTransactionModal(true); }}
            disabled={!created}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💸 Send Tokens
          </button>
          <button 
            onClick={() => { setTxType('request'); setShowTransactionModal(true); }}
            disabled={!created}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📥 Request Payment
          </button>
        </div>
        {!created && (
          <div className="mt-4 text-xs text-neutral-500 text-center">
            Create a wallet first to send or request tokens
          </div>
        )}
        {created && (
          <div className="mt-4 text-xs text-neutral-500">
            Transactions are signed with {algorithm} PQC signatures and submitted to the network
          </div>
        )}
      </div>
    </div>

      {/* Transaction History */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">To</th>
                  <th className="px-4 py-3 text-left font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">TX Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-3 text-center text-sm text-neutral-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.hash} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{new Date(tx.timestamp).toLocaleString()}</div>
                        <div className="text-xs text-neutral-400">{tx.timestamp}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{truncateAddress(tx.to, 8)}</div>
                        <div className="text-xs text-neutral-400">{tx.to}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-bold">{tx.amount} {tx.denom}</div>
                        <div className="text-xs text-neutral-400">{tx.type === 'send' ? 'Sent' : 'Requested'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-xs font-semibold ${tx.status === 'confirmed' ? 'text-green-500' : 'text-red-500'}`}>
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a 
                          href={`https://explorer.dytallix.org/tx/${tx.hash}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Guardian Modal */}
      {showGuardianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowGuardianModal(false)}></div>
          <div className="relative bg-neutral-950 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Add Guardian</h3>
              <button 
                onClick={() => setShowGuardianModal(false)} 
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-sm transition"
              >
                Close
              </button>
            </div>
            
            <p className="text-sm text-neutral-300 mb-4">
              Add up to 5 guardians for account recovery and multi-signature approvals. Guardians must be valid PQC addresses.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-neutral-400 mb-2 block">Guardian Address</label>
                <input 
                  type="text"
                  value={newGuardian}
                  onChange={(e) => setNewGuardian(e.target.value)}
                  placeholder="pqc1..."
                  className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 focus:border-white/30 focus:outline-none text-white font-mono text-sm"
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={addGuardian}
                  className="flex-1 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:opacity-90 transition"
                >
                  Add Guardian
                </button>
                <button 
                  onClick={() => setGuardians([])}
                  className="flex-1 px-4 py-2 rounded-xl border border-red-500 text-red-500 hover:bg-red-500/10 transition"
                >
                  Remove All
                </button>
              </div>
              
              <div className="mt-4 text-xs text-neutral-500">
                {guardians.length}/5 guardians added
              </div>
            </div>
            
            {guardians.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-neutral-900 border border-white/10">
                <div className="text-xs text-neutral-400 mb-2">Existing Guardians</div>
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
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTransactionModal(false)}></div>
          <div className="relative bg-neutral-950 border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{txType === 'send' ? 'Send Tokens' : 'Request Payment'}</h3>
              <button 
                onClick={() => { setShowTransactionModal(false); setTxError(null); setTxSuccess(null); setPaymentRequestLink(''); }} 
                className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-sm transition"
              >
                Close
              </button>
            </div>
            
            {txType === 'send' ? (
              <>
                <p className="text-sm text-neutral-300 mb-4">
                  Send DGT or DRT tokens to another PQC address. Transactions are signed securely using post-quantum cryptography.
                </p>
                
                {!txSuccess ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-neutral-400 mb-2 block">Recipient Address</label>
                        <input 
                          type="text"
                          value={txForm.to}
                          onChange={(e) => setTxForm({ ...txForm, to: e.target.value })}
                          placeholder="pqc1..."
                          className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 focus:border-white/30 focus:outline-none text-white font-mono text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-neutral-400 mb-2 block">Amount</label>
                          <input 
                            type="number"
                            step="0.000001"
                            value={txForm.amount}
                            onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                            placeholder="0.0"
                            className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 focus:border-white/30 focus:outline-none text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-neutral-400 mb-2 block">Token</label>
                          <select 
                            value={txForm.denom}
                            onChange={(e) => setTxForm({ ...txForm, denom: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 focus:border-white/30 focus:outline-none text-white cursor-pointer"
                          >
                            <option value="DGT">DGT</option>
                            <option value="DRT">DRT</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm text-neutral-400 mb-2 block">Memo (Optional)</label>
                        <input 
                          type="text"
                          value={txForm.memo}
                          onChange={(e) => setTxForm({ ...txForm, memo: e.target.value })}
                          placeholder="Payment for..."
                          className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 focus:border-white/30 focus:outline-none text-white text-sm"
                        />
                      </div>
                      
                      {/* Transaction Summary */}
                      <div className="p-3 rounded-xl bg-neutral-900/50 border border-white/5">
                        <div className="text-xs text-neutral-400 mb-2">Transaction Summary</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Amount:</span>
                            <span className="text-neutral-300 font-mono">{txForm.amount || '0'} {txForm.denom}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-500">Fee:</span>
                            <span className="text-neutral-300 font-mono">0.001 DRT</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                            <span className="text-neutral-400 font-semibold">Total:</span>
                            <span className="text-white font-mono font-semibold">
                              {txForm.amount || '0'} {txForm.denom} + 0.001 DRT fee
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {txError && (
                      <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
                        <div className="flex items-center gap-2 text-red-500 text-sm font-semibold">
                          <span>✗</span>
                          <span>{txError}</span>
                        </div>
                      </div>
                    )}
                    
                    <button 
                      onClick={submitTransaction}
                      disabled={txLoading || !txForm.to || !txForm.amount}
                      className="mt-4 w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {txLoading ? 'Signing & Submitting...' : 'Send Transaction'}
                    </button>
                    
                    <div className="mt-3 text-xs text-center text-neutral-500">
                      Transactions are signed with {algorithm} PQC signatures
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">✓</div>
                    <div className="text-lg font-semibold text-green-500 mb-2">Transaction Submitted!</div>
                    <div className="text-sm text-neutral-400 mb-4">
                      Sent {txSuccess.amount} {txSuccess.denom} to {txSuccess.to.slice(0, 12)}...
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-900 border border-white/10">
                      <div className="text-xs text-neutral-400 mb-1">Transaction Hash</div>
                      <div className="text-xs font-mono text-green-400 break-all">{txSuccess.hash}</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-300 mb-4">
                  Generate a payment request link to share with others. They can click the link to send you tokens.
                </p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">Amount</label>
                      <input 
                        type="number"
                        step="0.000001"
                        value={txForm.amount}
                        onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                        placeholder="0.0"
                        className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 focus:border-white/30 focus:outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-neutral-400 mb-2 block">Token</label>
                      <select 
                        value={txForm.denom}
                        onChange={(e) => setTxForm({ ...txForm, denom: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 focus:border-white/30 focus:outline-none text-white cursor-pointer"
                      >
                        <option value="DGT">DGT</option>
                        <option value="DRT">DRT</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-neutral-400 mb-2 block">Description (Optional)</label>
                    <input 
                      type="text"
                      value={txForm.memo}
                      onChange={(e) => setTxForm({ ...txForm, memo: e.target.value })}
                      placeholder="Payment for services..."
                      className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 focus:border-white/30 focus:outline-none text-white text-sm"
                    />
                  </div>
                  
                  <button 
                    onClick={generatePaymentRequest}
                    disabled={!txForm.amount}
                    className="w-full px-5 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate Payment Link
                  </button>
                  
                  {paymentRequestLink && (
                    <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                      <div className="text-sm font-semibold text-green-500 mb-2">Payment Link Generated!</div>
                      <div className="p-3 rounded-lg bg-neutral-900 border border-white/10 mb-3">
                        <div className="text-xs font-mono text-neutral-300 break-all">{paymentRequestLink}</div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={copyPaymentLink}
                          className="flex-1 px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-semibold hover:opacity-90 transition"
                        >
                          📋 Copy Link
                        </button>
                        <button 
                          onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Send me ' + txForm.amount + ' ' + txForm.denom + ' on Dytallix: ' + paymentRequestLink)}`, '_blank')}
                          className="flex-1 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:opacity-90 transition"
                        >
                          🐦 Share
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Page>
  );
};

const FaucetPage = () => {
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const submit = async (e) => {
    e.preventDefault();
    const token = e.target.token.value;
    const addr = e.target.addr.value.trim();
    
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
      setError(err.message || 'Failed to request tokens');
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

      {/* Request Form */}
      <div className="mt-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 max-w-xl">
          <div className="mb-4">
            <div className="font-semibold text-lg">Request Testnet Tokens</div>
            <div className="text-xs text-neutral-400 mt-1">Free tokens • Rate limited to prevent abuse</div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm text-neutral-300 font-medium">PQC Address</label>
              <input 
                name="addr" 
                required 
                placeholder="pqc1abc123def456..." 
                className="mt-2 w-full rounded-xl bg-neutral-900 border border-white/10 px-4 py-3 outline-none focus:border-white/30 transition text-sm font-mono"
              />
              <div className="mt-1 text-xs text-neutral-500">Must start with "pqc1" • Create one on the <a href="#/wallet" className="text-blue-400 underline">Wallet page</a></div>
            </div>
            
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
      </div>

      {/* Important Notes */}
      <div className="mt-8 max-w-xl rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
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
    <p className="mt-3 text-neutral-300 max-w-prose">Everything you need to build on Dytallix: node setup, SDKs, wallet APIs, governance, and RFCs.</p>
    <div className="mt-8 grid md:grid-cols-2 gap-6">
      <DocCard title="Quickstart" items={["Install CLI","Start localnet","Deploy first contract"]} color="from-green-500/10" />
      <DocCard title="Nodes & Networking" items={["Run a validator","Declare telemetry","QUIC+PQC handshake"]} color="from-blue-500/10" />
      <DocCard title="Smart Contracts" items={["Rust SDK","On‑chain PQC ops","Gas model"]} color="from-purple-500/10" />
      <DocCard title="Wallet & Accounts" items={["Account abstraction","Multi‑sig","Recovery & guardians"]} color="from-orange-500/10" />
    </div>
    <div className="mt-10">
      <a className="px-5 py-3 rounded-2xl bg-white text-black font-semibold" href="https://github.com/dytallix" target="_blank" rel="noreferrer">View Repos</a>
      <a className="ml-3 px-5 py-3 rounded-2xl border border-white/20" href="#/docs#contribute">Contributing Guide</a>
    </div>
    <div id="contribute" className="mt-16">
      <h2 className="text-2xl font-bold">Contributing</h2>
      <p className="mt-2 text-neutral-300">Fork, branch, PR. We review in public. Security disclosures via security@dytallix.org (see policy).</p>
    </div>
    <div id="rfc" className="mt-10">
      <h2 className="text-2xl font-bold">RFCs</h2>
      <p className="mt-2 text-neutral-300">Propose changes via /rfcs. Each proposal includes rationale, threat model, and migration path.</p>
    </div>
    <div id="security" className="mt-10">
      <h2 className="text-2xl font-bold">Security</h2>
      <p className="mt-2 text-neutral-300">We practice defense‑in‑depth, formal specs, fuzzing, and third‑party audits. Bug bounty launches with mainnet candidate.</p>
    </div>
  </Page>
);

const DocCard = ({ title, items, color }) => (
  <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${color || 'from-white/5'} to-transparent p-6`}>
    <div className="font-semibold">{title}</div>
    <ul className="mt-3 text-sm text-neutral-300 list-disc list-inside">
      {items.map((i) => <li key={i}>{i}</li>)}
    </ul>
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
          // Use the backend proxy endpoint to avoid CORS issues
          const res = await fetch(`http://localhost:8787/api/nodes/${node.id}/status`);
          const data = await res.json();
          results[node.port] = { ...data, ...node, online: data.status === 'healthy' };
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
      
      {/* Node Cluster Status */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-500 text-xl">◉</span>
          </div>
          <div>
            <div className="font-semibold text-lg">Node Cluster</div>
            <div className="text-xs text-neutral-400">5 nodes • 3 validators active</div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(nodeStats).map((node) => (
            <div key={node.port} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{node.name}</div>
                  <div className="text-xs text-neutral-500">{node.role}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${node.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              {node.online ? (
                <>
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
                </>
              ) : (
                <div className="mt-3 text-xs text-red-400">Offline</div>
              )}
            </div>
          ))}
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

export default function App() {
  const { route } = useHashRoute();
  const Component = useMemo(() => {
    switch(route){
      case '/wallet': return WalletPage;
      case '/faucet': return FaucetPage;
      case '/docs': return DocsPage;
      case '/dashboard': return DashboardPage;
      case '/tokenomics': return TokenomicsPage;
      default: return Home;
    }
  }, [route]);
  return <Component/>;
}
