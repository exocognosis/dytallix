import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import {
    Shield, Activity, TrendingUp, AlertTriangle, CheckCircle,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Info, Lock, Unlock, Play,
    FileCheck, Layers, Anchor, RefreshCw, BookOpen,
    Globe, Landmark, Coins
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Area, AreaChart, Cell
} from 'recharts';

// --- Types ---
type AssetType = 'real_estate' | 'invoice' | 'commodity' | 'nft' | 'data_vault' | 'bank_account' | 'tokenized_security' | 'fiat' | 'crypto_btc' | 'crypto_eth';
type AssetCategory = 'Real' | 'Digital' | 'Account-based' | 'Currency';
type Liquidity = 'high' | 'low';
type Volatility = 'stable' | 'volatile';
type Jurisdiction = 'US' | 'EU' | 'Global';
type StepStatus = 'pending' | 'running' | 'complete' | 'error';

interface SimConfig {
    assetType: AssetType;
    assetValue: number;
    riskHorizon: number;
    haircutPct: number;
    demurrageRate: number;
    hasEncumbrances: boolean;
    liquidity: Liquidity;
    volatility: Volatility;
    jurisdiction: Jurisdiction;
}

interface StepResult {
    name: string;
    status: StepStatus;
    log: string[];
    icon: React.ReactNode;
}

const ASSET_OPTIONS: { category: AssetCategory; items: { value: AssetType; label: string }[] }[] = [
    { category: 'Real', items: [{ value: 'real_estate', label: 'Real Estate' }, { value: 'invoice', label: 'Invoice' }, { value: 'commodity', label: 'Commodity' }] },
    { category: 'Digital', items: [{ value: 'nft', label: 'NFT' }, { value: 'data_vault', label: 'Data Vault' }] },
    { category: 'Account-based', items: [{ value: 'bank_account', label: 'Bank Account' }, { value: 'tokenized_security', label: 'Tokenized Security' }] },
    { category: 'Currency', items: [{ value: 'fiat', label: 'Fiat Currency' }, { value: 'crypto_btc', label: 'Crypto (BTC)' }, { value: 'crypto_eth', label: 'Crypto (ETH)' }] },
];

const STEP_NAMES = ['Asset Verification', 'Classification', 'Classical Valuation', 'Cryptographic Lineage Severance', 'PQC Re-Issuance', 'Anchoring & Attestation'];
const STEP_ICONS = [<FileCheck className="h-5 w-5" />, <Layers className="h-5 w-5" />, <TrendingUp className="h-5 w-5" />, <Unlock className="h-5 w-5" />, <Lock className="h-5 w-5" />, <Anchor className="h-5 w-5" />];

// Sigmoid quantum decay
function quantumDecay(t: number, alpha = 1, zEst = 5): number {
    return 1 / (1 + Math.exp(alpha * (t - zEst)));
}

// Simulated SHA-256 stub
function pseudoHash(input: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    const hex = (h >>> 0).toString(16).padStart(8, '0');
    return `0x${hex}${hex}${hex}${hex}`.slice(0, 66);
}

// Shamir secret sharing stub (k-of-n threshold)
function shamirStub(secret: string, n: number, k: number): string[] {
    const shares: string[] = [];
    for (let i = 1; i <= n; i++) { shares.push(`share_${i}_of_${n}[t=${k}]:${pseudoHash(secret + i).slice(0, 20)}`); }
    return shares;
}

function getCategory(t: AssetType): AssetCategory {
    if (['real_estate', 'invoice', 'commodity'].includes(t)) return 'Real';
    if (['nft', 'data_vault'].includes(t)) return 'Digital';
    if (['bank_account', 'tokenized_security'].includes(t)) return 'Account-based';
    return 'Currency';
}

function simulateStep(stepIdx: number, config: SimConfig): string[] {
    const { assetType, assetValue, riskHorizon, haircutPct, demurrageRate, hasEncumbrances, liquidity, volatility, jurisdiction } = config;
    const cat = getCategory(assetType);
    const postHaircutValue = assetValue * (1 - haircutPct / 100);
    const demurrageAdjusted = postHaircutValue * (1 - demurrageRate / 100);
    const classicalHash = pseudoHash(`${assetType}-${assetValue}-classical`);
    const pqcHash = pseudoHash(`${assetType}-${assetValue}-pqc-mldsa87`);
    const decay = quantumDecay(riskHorizon).toFixed(4);

    switch (stepIdx) {
        case 0: return [
            `✓ Asset identified: ${assetType.replace(/_/g, ' ')} (${cat})`,
            `✓ Ownership chain verified via oracle attestation`,
            `✓ Classical signature: ECDSA-secp256k1 — ${classicalHash.slice(0, 22)}...`,
            hasEncumbrances ? `⚠ Encumbrances detected: lien/smart-contract dependency flagged` : `✓ No encumbrances detected`,
            `✓ Jurisdiction: ${jurisdiction} — legal novation pathway ${jurisdiction === 'US' ? 'SEC/FinCEN compliant' : jurisdiction === 'EU' ? 'MiCA compliant' : 'multi-jurisdictional'}`
        ];
        case 1: return [
            `✓ Category: ${cat}`,
            `✓ Liquidity profile: ${liquidity} — ${liquidity === 'high' ? 'fast settlement' : 'extended settlement window'}`,
            `✓ Volatility: ${volatility} — ${volatility === 'volatile' ? 'dynamic repricing enabled' : 'fixed-rate settlement'}`,
            `✓ Quantum vulnerability score: ${(100 - quantumDecay(riskHorizon) * 100).toFixed(1)}%`,
            `✓ Risk horizon: ${riskHorizon} years to CRQC — decay factor D(t)=${decay}`
        ];
        case 2: return [
            `✓ Classical nominal value: $${assetValue.toLocaleString()}`,
            `✓ Migration haircut applied: ${haircutPct}% → post-haircut value: $${postHaircutValue.toLocaleString()}`,
            `✓ Demurrage rate: ${demurrageRate}%/period → adjusted value: $${demurrageAdjusted.toLocaleString()}`,
            `✓ Risk-adjusted quantum premium: ${((1 - quantumDecay(riskHorizon)) * 100).toFixed(1)}%`,
            `✓ MPC custody valuation (Shamir 3-of-5): ${shamirStub(classicalHash, 5, 3)[0]}`
        ];
        case 3: return [
            `⚡ Initiating classical key termination...`,
            `✓ ECDSA private key binding revoked for ${classicalHash.slice(0, 22)}...`,
            `✓ Classical chain anchor: block #${Math.floor(Math.random() * 1000000 + 18000000)} (finalized)`,
            `✓ Cryptographic lineage severed — no backward-compatible key paths remain`,
            `✓ Termination receipt: ${pseudoHash('termination-' + classicalHash).slice(0, 34)}...`
        ];
        case 4: return [
            `🔒 Generating PQC keypair (ML-DSA-87 / CRYSTALS-Dilithium5)...`,
            `✓ Public key (2592 bytes): ${pqcHash.slice(0, 30)}...`,
            `✓ Asset re-issued under PQC framework — new token ID: ${pseudoHash('pqc-token-' + assetType).slice(0, 26)}`,
            `✓ ML-KEM-1024 encapsulation for custody transfer: VERIFIED`,
            `✓ Post-quantum value locked: $${demurrageAdjusted.toLocaleString()}`
        ];
        case 5: return [
            `⚓ Broadcasting to Dytallix chain...`,
            `✓ Anchored in Dytallix block #${Math.floor(Math.random() * 50000 + 1000)}`,
            `✓ On-chain attestation hash: ${pseudoHash('dytallix-attest-' + pqcHash).slice(0, 42)}...`,
            `✓ Governance staking: operator bond verified (slash conditions active)`,
            `✓ Migration complete — asset fully quantum-resistant on Dytallix`
        ];
        default: return [];
    }
}

// --- Educational Content ---
const EDUCATION_SECTIONS = [
    {
        title: 'Economic Functions',
        icon: <TrendingUp className="h-5 w-5 text-emerald-400" />,
        content: `**Value Preservation:** Oracles provide real-time price feeds; haircuts account for migration friction and counterparty risk. The goal is to preserve economic value across the cryptographic boundary.\n\n**Risk Pricing:** Quantum probability is modeled via the sigmoid decay function D(t). As CRQC approaches, the cost of remaining on classical infrastructure increases exponentially.\n\n**Incentives:** Demurrage rates penalize delayed migration — assets left on classical chains lose value over time, encouraging early adoption.\n\n**Governance:** Operators must stake collateral; slashing conditions enforce honest migration. Validators who attest fraudulent migrations lose their bond.`
    },
    {
        title: 'HNDL — Harvest Now, Decrypt Later',
        icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
        content: `Nation-state adversaries and sophisticated attackers are **capturing encrypted traffic today** with the intent to decrypt it once quantum computers become available. This is called "Harvest Now, Decrypt Later" (HNDL).\n\nEvery transaction, key exchange, and signature on classical chains is being recorded. When a cryptographically relevant quantum computer (CRQC) arrives, all historically captured data becomes retroactively vulnerable.\n\n**The risk is not theoretical** — intelligence agencies have publicly acknowledged HNDL as an active threat vector. Data with long-term sensitivity (financial records, identity, ownership proofs) is already compromised in storage.`
    },
    {
        title: 'Classical vs PQC Encryption',
        icon: <Lock className="h-5 w-5 text-blue-400" />,
        content: `**Classical (RSA/ECC):** Relies on the difficulty of factoring large primes (RSA) or solving elliptic curve discrete logarithms (ECC). Shor's algorithm on a quantum computer breaks both in polynomial time.\n\n**Post-Quantum (Lattice/Hash-based):** Algorithms like ML-DSA (CRYSTALS-Dilithium) and ML-KEM (CRYSTALS-Kyber) are built on lattice problems that remain hard even for quantum computers. These survived NIST's multi-year adversarial selection process.\n\n**Key Differences:**\n• Classical signatures: ~64 bytes (ECDSA) → PQC signatures: ~2,420–4,627 bytes (ML-DSA)\n• Classical key exchange: ~32 bytes → PQC encapsulation: ~1,568 bytes (ML-KEM-1024)\n• Security: Classical = broken by Shor's; PQC = no known quantum attack`
    },
    {
        title: 'Why This Matters — In Plain Language',
        icon: <BookOpen className="h-5 w-5 text-purple-400" />,
        content: `**Think of it this way:**\n\n🔐 **Classical encryption** is like a lock that seems strong today, but a master key (quantum computer) is being built that will open every one of them — past and future.\n\n🕵️ **HNDL** is like a thief photographing every locked safe they find. They can't open them yet, but they're collecting them for the day the master key is ready.\n\n🏦 **The stakes:** Trillions of dollars in financial assets, property records, identity systems, and smart contracts all depend on locks that will become obsolete. If cryptographic keys can be forged, ownership itself becomes meaningless.\n\n🛡️ **Migration** is moving your valuables from the old, soon-to-be-pickable safe into a new vault built from materials that the master key cannot affect. That's what this dashboard simulates.`
    }
];

// --- Main Component ---
const C2QAssetMigration: React.FC = () => {
    const [config, setConfig] = useState<SimConfig>({
        assetType: 'real_estate', assetValue: 500000, riskHorizon: 5,
        haircutPct: 10, demurrageRate: 2, hasEncumbrances: false,
        liquidity: 'high', volatility: 'stable', jurisdiction: 'US'
    });
    const [steps, setSteps] = useState<StepResult[]>(
        STEP_NAMES.map((name, i) => ({ name, status: 'pending', log: [], icon: STEP_ICONS[i] }))
    );
    const [, setCurrentStep] = useState(-1);
    const [isRunning, setIsRunning] = useState(false);
    const [expandedEdu, setExpandedEdu] = useState<number | null>(null);
    const [showReport, setShowReport] = useState(false);
    const [viewedStep, setViewedStep] = useState(0);

    const postHaircutValue = config.assetValue * (1 - config.haircutPct / 100);
    const finalValue = postHaircutValue * (1 - config.demurrageRate / 100);

    // Quantum decay curve data
    const decayCurveData = useMemo(() => {
        const pts = [];
        for (let t = 0; t <= 10; t += 0.5) {
            pts.push({ year: t, security: +(quantumDecay(t) * 100).toFixed(1), risk: +((1 - quantumDecay(t)) * 100).toFixed(1) });
        }
        return pts;
    }, []);

    const valueComparisonData = useMemo(() => [
        { name: 'Classical Value', value: config.assetValue, fill: '#ef4444' },
        { name: 'Post-Haircut', value: postHaircutValue, fill: '#f59e0b' },
        { name: 'PQC Final Value', value: finalValue, fill: '#10b981' },
    ], [config.assetValue, postHaircutValue, finalValue]);

    const runStep = useCallback((idx: number) => {
        const logs = simulateStep(idx, config);
        setSteps(prev => prev.map((s, i) =>
            i === idx ? { ...s, status: 'complete', log: logs } :
                i < idx ? { ...s, status: s.status === 'complete' ? 'complete' : s.status } : s
        ));
        setCurrentStep(idx);
    }, [config]);

    const runFullSimulation = useCallback(async () => {
        setIsRunning(true);
        setShowReport(false);
        setSteps(STEP_NAMES.map((name, i) => ({ name, status: 'pending', log: [], icon: STEP_ICONS[i] })));
        for (let i = 0; i < 6; i++) {
            setSteps(prev => prev.map((s, j) => j === i ? { ...s, status: 'running' } : s));
            setCurrentStep(i);
            setViewedStep(i);
            await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
            const logs = simulateStep(i, config);
            setSteps(prev => prev.map((s, j) => j === i ? { ...s, status: 'complete', log: logs } : s));
        }
        setIsRunning(false);
        setShowReport(true);
    }, [config]);

    const resetSimulation = useCallback(() => {
        setSteps(STEP_NAMES.map((name, i) => ({ name, status: 'pending', log: [], icon: STEP_ICONS[i] })));
        setCurrentStep(-1);
        setShowReport(false);
    }, []);

    const completedSteps = steps.filter(s => s.status === 'complete').length;
    const progressPct = (completedSteps / 6) * 100;

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                {/* Hero */}
                <div className="text-center max-w-4xl mx-auto mb-8">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <Shield className="w-12 h-12 text-emerald-400" />
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                            C2Q <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Asset Migration</span>
                        </h1>
                    </div>
                    <p className="text-lg text-muted-foreground">
                        Simulate the end-to-end migration of classical assets to the Dytallix post-quantum cryptography native chain
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Sidebar Controls */}
                    <div className="lg:col-span-4 space-y-4">
                        <GlassPanel className="p-6" hoverEffect>
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Activity className="h-5 w-5 text-emerald-400" /> Configuration
                            </h2>

                            {/* Asset Type */}
                            <div className="mb-4">
                                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Asset Type</label>
                                <select
                                    value={config.assetType}
                                    onChange={e => setConfig(c => ({ ...c, assetType: e.target.value as AssetType }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-emerald-400/50"
                                >
                                    {ASSET_OPTIONS.map(g => (
                                        <optgroup key={g.category} label={g.category}>
                                            {g.items.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            {/* Asset Value */}
                            <div className="mb-4">
                                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                    Asset Value: <span className="text-emerald-400">${config.assetValue.toLocaleString()}</span>
                                </label>
                                <input type="range" min={0} max={1000000} step={1000} value={config.assetValue}
                                    onChange={e => setConfig(c => ({ ...c, assetValue: +e.target.value }))}
                                    className="w-full accent-emerald-400" />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>$0</span><span>$1,000,000</span></div>
                            </div>

                            {/* Risk Horizon */}
                            <div className="mb-4">
                                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                    Quantum Risk Horizon: <span className="text-amber-400">{config.riskHorizon} years</span>
                                </label>
                                <input type="range" min={1} max={10} value={config.riskHorizon}
                                    onChange={e => setConfig(c => ({ ...c, riskHorizon: +e.target.value }))}
                                    className="w-full accent-amber-400" />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1 yr</span><span>10 yrs</span></div>
                            </div>

                            {/* Haircut */}
                            <div className="mb-4">
                                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                    Haircut: <span className="text-red-400">{config.haircutPct}%</span>
                                </label>
                                <input type="range" min={0} max={50} value={config.haircutPct}
                                    onChange={e => setConfig(c => ({ ...c, haircutPct: +e.target.value }))}
                                    className="w-full accent-red-400" />
                            </div>

                            {/* Demurrage */}
                            <div className="mb-4">
                                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                    Demurrage Rate: <span className="text-orange-400">{config.demurrageRate}%</span>/period
                                </label>
                                <input type="range" min={0} max={5} step={0.1} value={config.demurrageRate}
                                    onChange={e => setConfig(c => ({ ...c, demurrageRate: +e.target.value }))}
                                    className="w-full accent-orange-400" />
                            </div>

                            {/* Toggles */}
                            <div className="space-y-3 mb-4">
                                {([['Encumbrances', 'hasEncumbrances', config.hasEncumbrances]] as const).map(([label, key]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">{label}</span>
                                        <button onClick={() => setConfig(c => ({ ...c, [key]: !c[key as keyof SimConfig] }))}
                                            className={`w-12 h-6 rounded-full transition-colors ${config[key as keyof SimConfig] ? 'bg-emerald-500' : 'bg-white/10'} relative`}>
                                            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${config[key as keyof SimConfig] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Selects row */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {([
                                    ['Liquidity', 'liquidity', ['high', 'low']],
                                    ['Volatility', 'volatility', ['stable', 'volatile']],
                                    ['Jurisdiction', 'jurisdiction', ['US', 'EU', 'Global']]
                                ] as const).map(([label, key, opts]) => (
                                    <div key={key}>
                                        <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                                        <select value={config[key]}
                                            onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-emerald-400/50">
                                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                <button onClick={runFullSimulation} disabled={isRunning}
                                    className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isRunning ? <><RefreshCw className="h-4 w-4 animate-spin" /> Running...</> : <><Play className="h-4 w-4" /> Run Full Simulation</>}
                                </button>
                                <button onClick={resetSimulation} className="w-full py-2 rounded-lg border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
                                    Reset
                                </button>
                            </div>
                        </GlassPanel>

                        {/* Educational Sections */}
                        <GlassPanel className="p-6" hoverEffect>
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Info className="h-5 w-5 text-blue-400" /> Understanding the Migration
                            </h2>
                            <div className="space-y-2">
                                {EDUCATION_SECTIONS.map((sec, i) => (
                                    <div key={i} className="border border-white/5 rounded-lg overflow-hidden">
                                        <button onClick={() => setExpandedEdu(expandedEdu === i ? null : i)}
                                            className="w-full p-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors">
                                            <div className="flex items-center gap-3">
                                                {sec.icon}
                                                <span className="font-semibold text-sm">{sec.title}</span>
                                            </div>
                                            {expandedEdu === i ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                        </button>
                                        {expandedEdu === i && (
                                            <div className="px-4 pb-4 pl-12 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {sec.content.split('\n\n').map((para, pi) => (
                                                    <p key={pi} className="text-sm text-muted-foreground leading-relaxed mb-2"
                                                        dangerouslySetInnerHTML={{ __html: para.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <Link to="/C2QDeepDive"
                                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-blue-400/30 text-sm text-blue-400 hover:bg-blue-400/10 hover:border-blue-400/50 transition-all">
                                <BookOpen className="h-4 w-4" /> Mathematical Deep Dive
                            </Link>
                        </GlassPanel>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Progress Bar */}
                        <GlassPanel className="p-6" hoverEffect>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-lg font-bold">Migration Progress</h2>
                                <span className="text-sm text-emerald-400 font-mono">{completedSteps}/6 steps</span>
                            </div>
                            <div className="h-3 bg-black/40 rounded-full overflow-hidden mb-4">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-1">
                                {steps.map((step, i) => (
                                    <div key={i} className="text-center">
                                        <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1 transition-all duration-300 ${step.status === 'complete' ? 'bg-emerald-500/20 text-emerald-400' :
                                            step.status === 'running' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
                                                'bg-white/5 text-muted-foreground'
                                            }`}>
                                            {step.status === 'complete' ? <CheckCircle className="h-4 w-4" /> :
                                                step.status === 'running' ? <RefreshCw className="h-4 w-4 animate-spin" /> :
                                                    <span>{i + 1}</span>}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground leading-tight">{step.name.split(' ')[0]}</p>
                                    </div>
                                ))}
                            </div>
                        </GlassPanel>

                        {/* Step Card Carousel */}
                        <div className="relative">
                            {/* Left Arrow */}
                            <button
                                onClick={() => setViewedStep(v => Math.max(0, v - 1))}
                                disabled={viewedStep === 0}
                                className="absolute -left-3 md:-left-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            {/* Right Arrow */}
                            <button
                                onClick={() => setViewedStep(v => Math.min(5, v + 1))}
                                disabled={viewedStep === 5}
                                className="absolute -right-3 md:-right-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>

                            {/* Single Step Card */}
                            {(() => {
                                const step = steps[viewedStep];
                                return (
                                    <GlassPanel className={`p-5 transition-all duration-300 min-h-[180px] ${step.status === 'complete' ? 'border-emerald-500/20' : step.status === 'running' ? 'border-amber-500/20' : ''}`} hoverEffect>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${step.status === 'complete' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    step.status === 'running' ? 'bg-amber-500/10 text-amber-400' :
                                                        'bg-white/5 text-muted-foreground'
                                                    }`}>{step.icon}</div>
                                                <div>
                                                    <h3 className="font-semibold text-sm">{step.name}</h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        {step.status === 'complete' ? 'Completed' : step.status === 'running' ? 'Processing...' : 'Pending'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {step.status === 'pending' && !isRunning && (
                                                    <button onClick={() => runStep(viewedStep)}
                                                        className="px-3 py-1 text-xs rounded border border-white/10 hover:border-emerald-400/30 hover:text-emerald-400 transition-colors">
                                                        Run Step
                                                    </button>
                                                )}
                                                <span className="text-xs text-muted-foreground font-mono">{viewedStep + 1}/6</span>
                                            </div>
                                        </div>
                                        {step.log.length > 0 ? (
                                            <div className="pt-3 border-t border-white/5 space-y-1">
                                                {step.log.map((l, li) => (
                                                    <p key={li} className="text-xs font-mono text-muted-foreground leading-relaxed">{l}</p>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="pt-3 border-t border-white/5">
                                                <p className="text-xs text-muted-foreground italic">
                                                    {step.status === 'running' ? 'Processing step...' : 'Step not yet executed. Click "Run Step" or "Run Full Simulation" to begin.'}
                                                </p>
                                            </div>
                                        )}
                                    </GlassPanel>
                                );
                            })()}

                            {/* Dot Indicators */}
                            <div className="flex items-center justify-center gap-2 mt-3">
                                {steps.map((step, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setViewedStep(i)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === viewedStep
                                            ? step.status === 'complete' ? 'bg-emerald-400 scale-125' : step.status === 'running' ? 'bg-amber-400 scale-125 animate-pulse' : 'bg-white/60 scale-125'
                                            : step.status === 'complete' ? 'bg-emerald-500/40' : step.status === 'running' ? 'bg-amber-500/40 animate-pulse' : 'bg-white/10'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <GlassPanel className="p-6" hoverEffect>
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-400" /> Value Comparison
                                </h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={valueComparisonData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                                            formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, 'Value']} />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                            {valueComparisonData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </GlassPanel>

                            <GlassPanel className="p-6" hoverEffect>
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-400" /> Quantum Decay Timeline
                                </h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={decayCurveData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Years to CRQC', position: 'insideBottom', offset: -5, style: { fontSize: 10, fill: '#64748b' } }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                                        <defs>
                                            <linearGradient id="secGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="security" stroke="#10b981" fill="url(#secGrad)" name="Classical Security %" />
                                        <Area type="monotone" dataKey="risk" stroke="#ef4444" fill="url(#riskGrad)" name="Quantum Risk %" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                <p className="text-[10px] text-muted-foreground mt-2 text-center font-mono">D(t) = 1 / (1 + e^(α·(t − Z_est))) | α=1, Z_est=5</p>
                            </GlassPanel>
                        </div>

                        {/* Simulation Report */}
                        {showReport && (
                            <GlassPanel className="p-6 border-emerald-500/20 animate-fade-in" hoverEffect>
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-emerald-400" /> Migration Report
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    {[
                                        ['Asset', config.assetType.replace(/_/g, ' '), 'text-foreground'],
                                        ['Original', `$${config.assetValue.toLocaleString()}`, 'text-red-400'],
                                        ['Final PQC Value', `$${finalValue.toLocaleString()}`, 'text-emerald-400'],
                                        ['Decay Factor', quantumDecay(config.riskHorizon).toFixed(4), 'text-amber-400'],
                                    ].map(([label, val, color]) => (
                                        <div key={label as string} className="text-center">
                                            <p className="text-xs text-muted-foreground">{label}</p>
                                            <p className={`text-lg font-bold ${color}`}>{val}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1 border-t border-white/5 pt-3">
                                    <p>✓ All 6 migration steps completed successfully</p>
                                    <p>✓ PQC Framework: ML-DSA-87 (CRYSTALS-Dilithium5) + ML-KEM-1024</p>
                                    <p>✓ Anchored and attested on Dytallix chain</p>
                                    <p>✓ Classical cryptographic lineage fully severed — zero backward compatibility</p>
                                </div>
                            </GlassPanel>
                        )}


                    </div>
                </div>
            </Section>

            {/* Historical & Economic Context */}
            <Section className="relative z-10 mt-0">
                <div>
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                                Historical &amp; Economic Context
                            </span>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto text-sm md:text-base">
                            The migration from classical to post-quantum cryptography is arguably the <strong className="text-foreground">largest coordinated economic
                                and financial infrastructure challenge in human history</strong>. No single historical parallel captures its full scope.
                            However, a combination of precedents — each involving forced discontinuity, massive coordination cost, and
                            value preservation under systemic threat — offers instructive context for what lies ahead.
                        </p>
                    </div>

                    <div className="space-y-8">

                        {/* 1. Nixon Shock */}
                        <GlassPanel className="p-8" hoverEffect>
                            <div className="flex items-start gap-4 mb-5">
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                                    <Landmark className="h-7 w-7 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground mb-1">1. The Nixon Shock: Abandoning the Gold Standard</h3>
                                    <p className="text-xs text-muted-foreground font-mono tracking-wider">AUGUST 1971</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                In August 1971, President Richard Nixon unilaterally ended the U.S. dollar's convertibility to gold, closing the
                                "gold window" and ending the Bretton Woods system. Facing gold reserve depletion — U.S. holdings had fallen sharply amid
                                foreign redemptions — and mounting inflation, Nixon imposed a 90-day wage-price freeze, a 10% import surcharge, and
                                suspended gold backing, effectively shifting to fiat currency backed by government trust rather than a physical commodity.
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                Short-term effects included immediate market volatility and the 1973–1975 recession, with long-term consequences like
                                1970s stagflation and dollar devaluation. Adjusted for inflation and economic scale, the policy's ripple effects reshaped
                                global wealth in ways that, over decades, translated to trillions in redistributed economic outcomes — with estimates
                                suggesting the U.S. economy could be <strong className="text-foreground">$8 trillion larger</strong> today under sustained higher pre-1971 growth rates.
                            </p>
                            <div className="border-t border-amber-500/10 pt-5">
                                <h4 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Parallel to Quantum Migration
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-400 mt-1 shrink-0">▸</span>
                                        <span>A forced <strong className="text-foreground">"hard discontinuity"</strong> — severing ties to a vulnerable backing (gold reserves) to prevent a run or collapse. Quantum migration demands the same: terminating classical cryptographic lineages to avoid inheriting Shor-vulnerable signatures.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-400 mt-1 shrink-0">▸</span>
                                        <span>Value was preserved through <strong className="text-foreground">phased reforms and new flexibility</strong> (floating exchange rates), much like dynamic haircuts, oracle-based valuations, and incentive mechanisms (subsidies or demurrage) can buffer quantum risks while reissuing assets in a more resilient form.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber-400 mt-1 shrink-0">▸</span>
                                        <span>Demonstrates that <strong className="text-foreground">delaying inevitably costs more</strong> — the longer the classical "gold window" remained open, the greater the systemic risk of a catastrophic run.</span>
                                    </li>
                                </ul>
                            </div>
                        </GlassPanel>

                        {/* 2. IPv4 → IPv6 */}
                        <GlassPanel className="p-8" hoverEffect>
                            <div className="flex items-start gap-4 mb-5">
                                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
                                    <Globe className="h-7 w-7 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground mb-1">2. IPv4 to IPv6: The Internet's Address Exhaustion Crisis</h3>
                                    <p className="text-xs text-muted-foreground font-mono tracking-wider">1990s – ONGOING</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                IPv4's 4.3 billion addresses ran out by 2011, triggering a slow, costly shift to IPv6's vastly larger address space.
                                Global adoption hovers around 40% in 2025–2026, with full transition projected into the 2040s. Enterprise costs
                                average <strong className="text-foreground">$2.4 million per organization</strong> (with 3–5 year ROI), while global estimates from early
                                assessments reached tens of billions annually at peak. IPv4 scarcity has driven address prices to $25–60+ each on
                                secondary markets, forcing reliance on workarounds like NAT and dual-stack operations.
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                The transition's drag stems from incompatibility, high upfront costs, and inertia — many networks still run both
                                protocols to avoid disruption.
                            </p>
                            <div className="border-t border-blue-500/10 pt-5">
                                <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Parallel to Quantum Migration
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-400 mt-1 shrink-0">▸</span>
                                        <span>IPv4 exhaustion mirrors classical crypto's <strong className="text-foreground">vulnerability horizon</strong> — a known deadline where the old system becomes untenable.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-400 mt-1 shrink-0">▸</span>
                                        <span>Dual-stack hybrids (running old and new simultaneously) created <strong className="text-foreground">"technical debt"</strong> and delayed benefits, warning against temporary quantum patches or wrappers that preserve backward exposure to vulnerable chains.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-400 mt-1 shrink-0">▸</span>
                                        <span>Successful paths (e.g., government mandates in the U.S. and South Korea) emphasize <strong className="text-foreground">phased adoption, incentives for early movers</strong>, and isolation of new systems — aligning with one-way "airlock" gateways that ingest classical assets, verify solvency via ZK proofs, apply risk-adjusted haircuts, and reissue under quantum-resistant primitives (ML-DSA, ML-KEM).</span>
                                    </li>
                                </ul>
                            </div>
                        </GlassPanel>

                        {/* 3. Euro Rollout */}
                        <GlassPanel className="p-8" hoverEffect>
                            <div className="flex items-start gap-4 mb-5">
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                                    <Coins className="h-7 w-7 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground mb-1">3. The Euro Rollout: Phasing Out National Currencies</h3>
                                    <p className="text-xs text-muted-foreground font-mono tracking-wider">1999 – 2002</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                The euro's launch unified 11 (later more) EU currencies into a single monetary system. Virtual adoption began
                                in 1999 for accounting and payments; physical notes and coins circulated from January 2002, with dual-currency
                                periods (up to two months) allowing gradual exchange. National currencies were fully phased out by early 2002.
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                                Benefits included boosted intra-EU trade (<strong className="text-foreground">15–30% increase</strong> in the first decade), reduced transaction
                                costs, lower exchange-rate volatility, and enhanced global influence as the euro became a major reserve currency.
                                Challenges arose from convergence strains — some economies faced crises (e.g., Greece in 2009) — but the overall
                                shift stabilized and integrated a multi-trillion-euro economy.
                            </p>
                            <div className="border-t border-emerald-500/10 pt-5">
                                <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                                    <Shield className="h-4 w-4" /> Parallel to Quantum Migration
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-400 mt-1 shrink-0">▸</span>
                                        <span>The euro's <strong className="text-foreground">"big bang" yet phased model</strong> (virtual first, physical second) offers a template: start with valuation and proof-of-reserves in the "book" phase (oracles and ZK solvency proofs), then reissue in the new secure form.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-400 mt-1 shrink-0">▸</span>
                                        <span>Dual-currency periods mitigated disruption, paralleling <strong className="text-foreground">temporary buffers</strong> (insurance pools, overcollateralization) during migration windows.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-emerald-400 mt-1 shrink-0">▸</span>
                                        <span>Governance convergence (e.g., ECB rules) parallels <strong className="text-foreground">staking and slashing mechanisms</strong> to enforce security standards — preventing fragmented value loss when migrating across heterogeneous chains.</span>
                                    </li>
                                </ul>
                            </div>
                        </GlassPanel>

                    </div>
                </div>
            </Section>
        </div>
    );
};

export default C2QAssetMigration;
