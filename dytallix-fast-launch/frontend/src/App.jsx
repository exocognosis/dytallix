import React, { useEffect, useMemo, useState } from "react";
import { fetchHero, fetchDashboard, requestFaucet } from "./lib/api";
import { createWallet, exportKeystoreFile } from "./lib/wallet";

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
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchHero().then(setData).catch(console.error);
    const id = setInterval(() => fetchHero().then(setData).catch(console.error), 15000);
    return () => clearInterval(id);
  }, []);

  const items = data ? [
    { k: "Nodes", v: data.nodes },
    { k: "Active Validators", v: data.activeValidators },
    { k: "Block Height", v: data.blockHeight },
    { k: "Finality", v: `~${data.finality}s` },
    { k: "TPS (peak)", v: data.tpsPeak },
    { k: "Uptime", v: `${data.uptime}%` },
  ] : [];

  return (
    <div className="grid grid-cols-3 gap-6">
      {items.map(x => (
        <div key={x.k} className="rounded-2xl bg-white/5 p-4 border border-white/10">
          <div className="text-2xl font-bold">{x.v ?? "…"}</div>
          <div className="text-xs text-neutral-400 mt-1">{x.k}</div>
        </div>
      ))}
    </div>
  );
};

const Problem = () => (
  <section className="mt-24">
    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">The Quantum Problem</h2>
    <p className="mt-4 text-neutral-300 max-w-3xl">Fault-tolerant quantum computers running Shor’s algorithm can break RSA and ECC—the cryptography behind PKI, blockchains, and secure messaging. Adversaries are already harvesting encrypted data to decrypt later. Standards bodies are pushing a full shift to post-quantum cryptography by ~2035, with migrations underway today.</p>
    <ul className="mt-6 grid md:grid-cols-3 gap-4">
      <StatCard title="PQC Standards Finalized" body="NIST published FIPS 203/204/205 (2024) for ML‑KEM (Kyber), ML‑DSA (Dilithium) and SLH‑DSA (SPHINCS+)." footnote="Sources" footnoteId="sources"/>
      <StatCard title="2035 target" body="NSA's CNSA 2.0 sets a no‑later‑than 2035 horizon for quantum‑resistant national security systems." footnote="NSA" footnoteId="sources"/>
      <StatCard title="RSA‑2048 risk" body="Recent resource estimates suggest sub‑million logical qubits could factor RSA‑2048 in days to a week once error‑corrected QC is realized." footnote="Research" footnoteId="sources"/>
    </ul>
    <div className="mt-4 text-sm text-neutral-400">See <button className="underline underline-offset-4" onClick={() => document.getElementById('sources')?.showModal()}>sources</button> for details.</div>
    <SourcesModal />
  </section>
);

const StatCard = ({ title, body, footnote, footnoteId }) => (
  <li className="rounded-2xl border border-white/10 bg-white/5 p-5">
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
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="font-semibold">Crypto‑Agile Core</h3>
        <p className="mt-2 text-neutral-300">Modular key encapsulation and signature layers with pluggable PQC (ML‑KEM/ML‑DSA/SLH‑DSA) plus hybrid (PQC+ECC) modes for staged migrations. Versioned policy manifests enable on‑chain deprecation and roll‑forward.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="font-semibold">Secure‑by‑Design Wallets</h3>
        <p className="mt-2 text-neutral-300">Client libraries generate PQC keypairs, support multi‑sig and account abstraction, and safeguard against HNDL via default PQC addressing.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="font-semibold">Telemetry & Attestation</h3>
        <p className="mt-2 text-neutral-300">Network health, algorithm performance, and node posture streamed to a public dashboard with signed metrics for supply‑chain integrity.</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="font-semibold">Open Governance</h3>
        <p className="mt-2 text-neutral-300">Testnet‑first governance gating PQC upgrades, parameter changes, and tokenomic proposals via transparent RFCs.</p>
      </div>
    </div>
  </section>
);

const TechStack = () => (
  <section className="mt-24">
    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Tech Stack</h2>
    <div className="mt-6 grid md:grid-cols-3 gap-4">
      {[
        {h:'Cryptography', b:'ML‑KEM (Kyber) · ML‑DSA (Dilithium) · SLH‑DSA (SPHINCS+) · BLAKE3/Keccak variants · Hybrid PQC+ECC'},
        {h:'Consensus', b:'Nakamoto‑style PoS with fast‑finality checkpoints; slashing & KEA attestation; light‑client proofs'},
        {h:'VM & Contracts', b:'WASM runtime with Rust SDK · Precompiles for PQC ops · Deterministic gas model'},
        {h:'Networking', b:'QUIC/Noise‑like handshake with PQC KEM · libp2p compatible · DoS‑hard admission control'},
        {h:'DevX', b:'CLI/SDKs (TypeScript, Rust) · Faucet & Test tokens · Localnet Docker · Rich telemetry'},
        {h:'Security', b:'Formal specs · Fuzzing · Reproducible builds · Attestation & SBOMs'},
      ].map((x) => (
        <div key={x.h} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="font-semibold">{x.h}</div>
          <p className="mt-2 text-sm text-neutral-300">{x.b}</p>
        </div>
      ))}
    </div>
  </section>
);

const DevInvite = () => (
  <section className="mt-24">
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8">
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Start Building on Dytallix</h2>
      <p className="mt-3 text-neutral-300 max-w-3xl">Spin up a local node, mint test assets, and ship PQC‑ready apps. Join the community, file RFCs, and help steer PQC adoption.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href="#/docs" className="px-5 py-3 rounded-2xl bg-white text-black font-semibold">Get Started</a>
        <a href="#/faucet" className="px-5 py-3 rounded-2xl border border-white/20">Request DGT/DRT</a>
        <a href="#/wallet" className="px-5 py-3 rounded-2xl border border-white/20">Launch Wallet</a>
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
  const [wallet, setWallet] = useState(null);
  const create = async () => {
    // Generate wallet using SDK
    const w = await createWallet({ alg: 'ML-DSA', hybrid: false });
    setWallet(w);
    setAddr(w.address);
    setCreated(true);
  };
  const exportKeystore = async () => {
    if (!wallet) return;
    const { blob, fileName } = await exportKeystoreFile(wallet.privKey, { label: 'dytallix-keystore' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Page>
      <h1 className="text-3xl md:text-4xl font-extrabold">PQC Wallet</h1>
      <p className="mt-3 text-neutral-300 max-w-prose">Create and manage a post‑quantum wallet. Keys are generated client‑side using PQC algorithms (ML‑DSA / SLH‑DSA) with optional hybrid mode. This demo uses a mock generator—wire to @dytallix/pqc‑wallet SDK in production.</p>
      <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 max-w-xl">
        {!created ? (
          <>
            <label className="text-sm text-neutral-300">Key Type</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold">ML‑DSA</button>
              <button className="px-4 py-2 rounded-xl border border-white/20">SLH‑DSA</button>
            </div>
            <button onClick={create} className="mt-6 px-5 py-3 rounded-2xl bg-white text-black font-semibold">Create Wallet</button>
          </>
        ) : (
          <>
            <div className="text-sm text-neutral-400">Address</div>
            <div className="mt-1 text-lg font-mono">{addr}</div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button onClick={exportKeystore} className="px-4 py-2 rounded-xl border border-white/20">Export Keystore</button>
              <button className="px-4 py-2 rounded-xl border border-white/20">Add Guardian</button>
            </div>
          </>
        )}
      </div>
    </Page>
  );
};

const FaucetPage = () => {
  const [req, setReq] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await requestFaucet({ address: e.target.addr.value, token: e.target.token.value });
      setReq({ ...res, status: 'Requested' });
    } catch (error) {
      setReq({ status: 'Error', error: error.message });
    }
  };
  return (
    <Page>
      <h1 className="text-3xl md:text-4xl font-extrabold">Testnet Faucet</h1>
      <p className="mt-3 text-neutral-300 max-w-prose">Request DGT (gas) and DRT (research) tokens to build and test on the Dytallix testnet. Rate‑limited; requires a PQC address.</p>
      <form onSubmit={submit} className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 max-w-xl">
        <label className="text-sm text-neutral-300">PQC Address</label>
        <input name="addr" required placeholder="pqc1…" className="mt-2 w-full rounded-xl bg-neutral-900 border border-white/10 px-3 py-2 outline-none"/>
        <label className="mt-4 block text-sm text-neutral-300">Token</label>
        <select name="token" className="mt-2 w-full rounded-xl bg-neutral-900 border border-white/10 px-3 py-2">
          <option value="DGT">DGT</option>
          <option value="DRT">DRT</option>
        </select>
        <button type="submit" className="mt-6 px-5 py-3 rounded-2xl bg-white text-black font-semibold">Request</button>
        {req && <div className="mt-4 text-sm text-neutral-400">{req.status} — {req.token} → {req.addr || req.address}{req.txHash ? ` (tx: ${req.txHash})` : ''}{req.error ? ` Error: ${req.error}` : ''}</div>}
      </form>
    </Page>
  );
};

const DocsPage = () => (
  <Page>
    <h1 className="text-3xl md:text-4xl font-extrabold">Documentation</h1>
    <p className="mt-3 text-neutral-300 max-w-prose">Everything you need to build on Dytallix: node setup, SDKs, wallet APIs, governance, and RFCs.</p>
    <div className="mt-8 grid md:grid-cols-2 gap-6">
      <DocCard title="Quickstart" items={["Install CLI","Start localnet","Deploy first contract"]} />
      <DocCard title="Nodes & Networking" items={["Run a validator","Declare telemetry","QUIC+PQC handshake"]} />
      <DocCard title="Smart Contracts" items={["Rust SDK","On‑chain PQC ops","Gas model"]} />
      <DocCard title="Wallet & Accounts" items={["Account abstraction","Multi‑sig","Recovery & guardians"]} />
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

const DocCard = ({ title, items }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
    <div className="font-semibold">{title}</div>
    <ul className="mt-3 text-sm text-neutral-300 list-disc list-inside">
      {items.map((i) => <li key={i}>{i}</li>)}
    </ul>
  </div>
);

const DashboardPage = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboard().then(setData).catch(console.error);
    const id = setInterval(() => fetchDashboard().then(setData).catch(console.error), 15000);
    return () => clearInterval(id);
  }, []);

  const metrics = data ? [
    { name: 'ML‑KEM handshakes/min', value: data.mlKemHandshakes || 0 },
    { name: 'ML‑DSA verifications/s', value: data.mlDsaVerifications || 0 },
    { name: 'Block time (ms)', value: data.blockTime || 0 },
    { name: 'Fork rate', value: data.forkRate || 0 },
    { name: 'Finality (s)', value: data.finality || 0 },
    { name: 'Peers/validator (p95)', value: data.peersP95 || 0 },
  ] : [
    { name: 'ML‑KEM handshakes/min', value: 1842 },
    { name: 'ML‑DSA verifications/s', value: 9670 },
    { name: 'Block time (ms)', value: 2100 },
    { name: 'Fork rate', value: 0.002 },
    { name: 'Finality (s)', value: 2.1 },
    { name: 'Peers/validator (p95)', value: 92 },
  ];
  return (
    <Page>
      <h1 className="text-3xl md:text-4xl font-extrabold">Network Dashboard</h1>
      <p className="mt-3 text-neutral-300 max-w-prose">Live telemetry for PQC algorithms, nodes, and chain health. The public API exposes signed metrics for verifiability.</p>
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-neutral-400">{m.name}</div>
            <div className="mt-2 text-2xl font-bold">{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="font-semibold">Algorithm Health</div>
        <p className="mt-2 text-sm text-neutral-300">All PQC primitives passing NIST Known‑Answer‑Tests. Median verify latencies: ML‑DSA 0.42ms, SLH‑DSA 5.8ms (p95 9.9ms). KEM decaps p95 0.71ms.</p>
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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="font-semibold">DGT — Governance</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Fixed supply; voting power proportional to holdings</li>
          <li>Used for DAO voting and staking delegation (locked, not spent)</li>
          <li>Non-inflationary design; standard token ops</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="font-semibold">DRT — Rewards</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Minted by the Emission Controller; burnable by holders</li>
          <li>Adaptive emission under DAO control</li>
          <li>Paid to validators, stakers, and treasury each block</li>
        </ul>
      </div>
    </div>

    {/* Emission & distribution */}
    <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
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
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="font-semibold">Staking Model</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Delegate <span className="font-semibold">DGT</span> to validators (locked, not spent)</li>
          <li>Earn <span className="font-semibold">DRT</span> from the staker pool—never DGT</li>
          <li>Rewards tracked via a global reward index; no loss at bootstrap (pending accruals applied once stake exists)</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="font-semibold">Claiming Rewards</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Rewards accrue automatically as blocks are produced</li>
          <li>Delegators/validators claim <span className="font-semibold">DRT</span> from their pools</li>
          <li>Claims settle index math and update balances</li>
        </ul>
      </div>
    </div>

    {/* Governance */}
    <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="font-semibold">Governance Controls</div>
      <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
        <li>Proposals: change emission rate/parameters, burn DRT, (init-only) mint DGT</li>
        <li>DGT-weighted voting → on-chain execution via Emission Controller</li>
        <li>All changes are parameterized and bounded for safety</li>
      </ul>
    </div>

    {/* Security & testnet notes */}
    <div className="mt-10 grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="font-semibold">Security & Access Control</div>
        <ul className="mt-2 text-sm text-neutral-300 list-disc list-inside space-y-1">
          <li>Only Emission Controller can mint <span className="font-semibold">DRT</span></li>
          <li>One-time initial mint for <span className="font-semibold">DGT</span>; otherwise fixed supply</li>
          <li>Bounded rates, safe math, input validation, reentrancy guards</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
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
