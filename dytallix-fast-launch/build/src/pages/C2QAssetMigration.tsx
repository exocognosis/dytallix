import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import {
    Shield, Activity, TrendingUp, AlertTriangle,
    Info, Lock, Unlock, Play,
    FileCheck, Layers, Anchor, RefreshCw, BookOpen,
    Globe, Landmark, Coins, Copy, Download
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Area, AreaChart, LabelList, Cell
} from 'recharts';
import {
    type AssetType,
    type Liquidity,
    type Volatility,
    type Jurisdiction,
    type C2QModelInputs,
    type ScenarioType,
    type ScenarioOutputs,
    type SensitivityDriver,
    DEFAULT_MODEL_INPUTS,
    buildExecutiveBrief,
    computeExecutiveRiskSummary,
    computeSensitivity,
    formatAssetType,
    getJurisdictionBaseMultiplier,
    modelConfig,
    quantumDecay,
    runAllScenarios,
} from '../lib/c2qModel';
import { C2QDeepDiveContent } from './C2QDeepDive';
import './C2QAssetMigration.css';

type AssetCategory = 'Real' | 'Digital' | 'Account-based' | 'Currency';
type StepStatus = 'pending' | 'running' | 'complete' | 'error';
type C2QTab = 'simulation' | 'explanation' | 'executive' | 'historical' | 'math';
type SimulationSubtab = 'pre' | 'post';

type SimConfig = C2QModelInputs;

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
const STEP_ICONS = [
    <FileCheck className="h-5 w-5" key="s0" />,
    <Layers className="h-5 w-5" key="s1" />,
    <TrendingUp className="h-5 w-5" key="s2" />,
    <Unlock className="h-5 w-5" key="s3" />,
    <Lock className="h-5 w-5" key="s4" />,
    <Anchor className="h-5 w-5" key="s5" />,
];

const STRATEGY_OPTIONS: { value: ScenarioType; label: string }[] = [
    { value: 'classic', label: 'Do Nothing' },
    { value: 'hybrid', label: 'Hybrid Retrofit' },
    { value: 'clean_break', label: 'Clean Break' },
];

const TAB_OPTIONS: { value: C2QTab; label: string }[] = [
    { value: 'simulation', label: 'Simulation' },
    { value: 'explanation', label: 'Explanation' },
    { value: 'executive', label: 'Executive Briefing' },
    { value: 'historical', label: 'Historical & Economic Context' },
    { value: 'math', label: 'Mathematical Deep Dive' },
];

function pseudoHash(input: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    const hex = (h >>> 0).toString(16).padStart(8, '0');
    return `0x${hex}${hex}${hex}${hex}`.slice(0, 66);
}

function shamirStub(secret: string, n: number, k: number): string[] {
    const shares: string[] = [];
    for (let i = 1; i <= n; i++) {
        shares.push(`share_${i}_of_${n}[t=${k}]:${pseudoHash(secret + i).slice(0, 20)}`);
    }
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
        case 0:
            return [
                `✓ Asset identified: ${formatAssetType(assetType)} (${cat})`,
                '✓ Ownership chain verified via oracle attestation',
                `✓ Classical signature: ECDSA-secp256k1 — ${classicalHash.slice(0, 22)}...`,
                hasEncumbrances ? '⚠ Encumbrances detected: lien/smart-contract dependency flagged' : '✓ No encumbrances detected',
                `✓ Jurisdiction: ${jurisdiction} — legal novation pathway ${jurisdiction === 'US' ? 'SEC/FinCEN compliant' : jurisdiction === 'EU' ? 'MiCA compliant' : 'multi-jurisdictional'}`,
            ];
        case 1:
            return [
                `✓ Category: ${cat}`,
                `✓ Liquidity profile: ${liquidity} — ${liquidity === 'high' ? 'fast settlement' : 'extended settlement window'}`,
                `✓ Volatility: ${volatility} — ${volatility === 'volatile' ? 'dynamic repricing enabled' : 'fixed-rate settlement'}`,
                `✓ Quantum vulnerability score: ${(100 - quantumDecay(riskHorizon) * 100).toFixed(1)}%`,
                `✓ Risk horizon: ${riskHorizon} years to CRQC — decay factor D(t)=${decay}`,
            ];
        case 2:
            return [
                `✓ Classical nominal value: $${assetValue.toLocaleString()}`,
                `✓ Migration haircut applied: ${haircutPct.toFixed(2)}% -> post-haircut value: $${postHaircutValue.toLocaleString()}`,
                `✓ Demurrage rate: ${demurrageRate.toFixed(2)}%/period -> adjusted value: $${demurrageAdjusted.toLocaleString()}`,
                `✓ Risk-adjusted quantum premium: ${((1 - quantumDecay(riskHorizon)) * 100).toFixed(1)}%`,
                `✓ MPC custody valuation (Shamir 3-of-5): ${shamirStub(classicalHash, 5, 3)[0]}`,
            ];
        case 3:
            return [
                '⚡ Initiating classical key termination...',
                `✓ ECDSA private key binding revoked for ${classicalHash.slice(0, 22)}...`,
                `✓ Classical chain anchor: block #${Math.floor(Math.random() * 1000000 + 18000000)} (finalized)`,
                '✓ Cryptographic lineage severed — no backward-compatible key paths remain',
                `✓ Termination receipt: ${pseudoHash(`termination-${classicalHash}`).slice(0, 34)}...`,
            ];
        case 4:
            return [
                '🔒 Generating PQC keypair (ML-DSA-87 / CRYSTALS-Dilithium5)...',
                `✓ Public key (2592 bytes): ${pqcHash.slice(0, 30)}...`,
                `✓ Asset re-issued under PQC framework — new token ID: ${pseudoHash(`pqc-token-${assetType}`).slice(0, 26)}`,
                '✓ ML-KEM-1024 encapsulation for custody transfer: VERIFIED',
                `✓ Post-quantum value locked: $${demurrageAdjusted.toLocaleString()}`,
            ];
        case 5:
            return [
                '⚓ Broadcasting to Dytallix chain...',
                `✓ Anchored in Dytallix block #${Math.floor(Math.random() * 50000 + 1000)}`,
                `✓ On-chain attestation hash: ${pseudoHash(`dytallix-attest-${pqcHash}`).slice(0, 42)}...`,
                '✓ Governance staking: operator bond verified (slash conditions active)',
                '✓ Migration complete — asset fully quantum-resistant on Dytallix',
            ];
        default:
            return [];
    }
}

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
        content: `**Classical (RSA/ECC):** Relies on the difficulty of factoring large primes (RSA) or solving elliptic curve discrete logarithms (ECC). Shor's algorithm on a quantum computer breaks both in polynomial time.\n\n**Post-Quantum (Lattice/Hash-based):** Algorithms like ML-DSA (CRYSTALS-Dilithium) and ML-KEM (CRYSTALS-Kyber) are built on lattice problems that remain hard even for quantum computers. These survived NIST's multi-year adversarial selection process.\n\n**Key Differences:**\n• Classical signatures: ~64 bytes (ECDSA) -> PQC signatures: ~2,420-4,627 bytes (ML-DSA)\n• Classical key exchange: ~32 bytes -> PQC encapsulation: ~1,568 bytes (ML-KEM-1024)\n• Security: Classical = broken by Shor's; PQC = no known quantum attack`
    },
    {
        title: 'Why This Matters — In Plain Language',
        icon: <BookOpen className="h-5 w-5 text-purple-400" />,
        content: `**Think of it this way:**\n\n🔐 **Classical encryption** is like a lock that seems strong today, but a master key (quantum computer) is being built that will open every one of them — past and future.\n\n🕵️ **HNDL** is like a thief photographing every locked safe they find. They can't open them yet, but they're collecting them for the day the master key is ready.\n\n🏦 **The stakes:** Trillions of dollars in financial assets, property records, identity systems, and smart contracts all depend on locks that will become obsolete. If cryptographic keys can be forged, ownership itself becomes meaningless.\n\n🛡️ **Migration** is moving your valuables from the old, soon-to-be-pickable safe into a new vault built from materials that the master key cannot affect. That's what this dashboard simulates.`
    }
];

const formatCurrency = (value: number): string => `$${Math.round(value).toLocaleString()}`;

const formatBreakEven = (months: number | null): string => {
    if (months === null || !Number.isFinite(months)) return 'No break-even in modeled horizon';
    if (months >= 24) return `${(months / 12).toFixed(1)} years`;
    return `${months.toFixed(1)} months`;
};

const formatBreakEvenRange = (range: [number | null, number | null]): string => {
    if (range[0] === null && range[1] === null) return 'No break-even in either bound';
    if (range[0] !== null && range[1] === null) return `${range[0].toFixed(1)} months to no break-even`;
    if (range[0] !== null && range[1] !== null) return `${range[0].toFixed(1)} to ${range[1].toFixed(1)} months`;
    return 'No break-even in either bound';
};

const formatPct = (value: number, digits = 1): string => `${value.toFixed(digits)}%`;

const C2QAssetMigration: React.FC = () => {
    const [config, setConfig] = useState<SimConfig>(DEFAULT_MODEL_INPUTS);
    const [steps, setSteps] = useState<StepResult[]>(
        STEP_NAMES.map((name, i) => ({ name, status: 'pending', log: [], icon: STEP_ICONS[i] }))
    );
    const [, setCurrentStep] = useState(-1);
    const [isRunning, setIsRunning] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [simulationSubtab, setSimulationSubtab] = useState<SimulationSubtab>('pre');
    const [selectedStrategy, setSelectedStrategy] = useState<ScenarioType>('hybrid');
    const [activeTab, setActiveTab] = useState<C2QTab>('simulation');
    const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

    const postHaircutValue = config.assetValue * (1 - config.haircutPct / 100);
    const finalValue = postHaircutValue * (1 - config.demurrageRate / 100);

    const scenarioResults = useMemo(() => runAllScenarios(config), [config]);
    const executiveSummary = useMemo(
        () => computeExecutiveRiskSummary(config, scenarioResults),
        [config, scenarioResults]
    );
    const sensitivityDrivers = useMemo(() => computeSensitivity(config), [config]);

    const selectedScenarioResult = useMemo((): ScenarioOutputs => {
        if (selectedStrategy === 'clean_break') return scenarioResults.cleanBreak;
        return scenarioResults[selectedStrategy];
    }, [selectedStrategy, scenarioResults]);

    const decayCurveData = useMemo(() => {
        const pts: { year: number; security: number; risk: number }[] = [];
        for (let t = 0; t <= 10; t += 0.5) {
            pts.push({
                year: t,
                security: +(quantumDecay(t) * 100).toFixed(1),
                risk: +((1 - quantumDecay(t)) * 100).toFixed(1),
            });
        }
        return pts;
    }, []);

    const npvComparisonData = useMemo(() => [
        { name: 'Do Nothing', value: scenarioResults.classic.npv, fill: '#ef4444' },
        { name: 'Hybrid', value: scenarioResults.hybrid.npv, fill: '#f59e0b' },
        { name: 'Clean Break', value: scenarioResults.cleanBreak.npv, fill: '#10b981' },
    ], [scenarioResults]);

    const topDriverPreview = useMemo(() => sensitivityDrivers.slice(0, 3), [sensitivityDrivers]);
    const topDrivers = useMemo(() => sensitivityDrivers.slice(0, 5), [sensitivityDrivers]);
    const selectedStrategyLabel = useMemo(() => {
        const selected = STRATEGY_OPTIONS.find(option => option.value === selectedStrategy);
        return selected?.label ?? 'Hybrid Retrofit';
    }, [selectedStrategy]);
    const anchoringPreviewLines = useMemo(() => {
        const fromSimulation = steps[STEP_NAMES.length - 1]?.log ?? [];
        const source = fromSimulation.length > 0 ? fromSimulation : simulateStep(STEP_NAMES.length - 1, config);
        return source.slice(0, 4);
    }, [config, steps]);

    const maxDriverImpact = useMemo(() => {
        if (sensitivityDrivers.length === 0) return 1;
        return Math.max(...sensitivityDrivers.map(driver => driver.impactScore), 1);
    }, [sensitivityDrivers]);

    const recommendationTone = useMemo(() => {
        if (executiveSummary.recommendation === 'clean_break') return 'text-red-400';
        if (executiveSummary.recommendation === 'hybrid') return 'text-amber-400';
        return 'text-sky-400';
    }, [executiveSummary.recommendation]);

    const tailRiskLabel = modelConfig.tailRisk.confidence >= 0.99 ? 'P99' : 'P95';

    useEffect(() => {
        if (copyState === 'idle') return undefined;
        const timer = window.setTimeout(() => setCopyState('idle'), 2400);
        return () => window.clearTimeout(timer);
    }, [copyState]);

    const runFullSimulation = useCallback(async () => {
        setIsRunning(true);
        setShowReport(false);
        setSteps(STEP_NAMES.map((name, i) => ({ name, status: 'pending', log: [], icon: STEP_ICONS[i] })));
        for (let i = 0; i < 6; i++) {
            setSteps(prev => prev.map((s, j) => j === i ? { ...s, status: 'running' } : s));
            setCurrentStep(i);
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
            const logs = simulateStep(i, config);
            setSteps(prev => prev.map((s, j) => j === i ? { ...s, status: 'complete', log: logs } : s));
        }
        setIsRunning(false);
        setShowReport(true);
        setSimulationSubtab('post');
    }, [config]);

    const resetSimulation = useCallback(() => {
        setSteps(STEP_NAMES.map((name, i) => ({ name, status: 'pending', log: [], icon: STEP_ICONS[i] })));
        setCurrentStep(-1);
        setShowReport(false);
        setSimulationSubtab('pre');
    }, []);

    const copySummary = useCallback(async () => {
        try {
            const summaryText = buildExecutiveBrief(config, executiveSummary, topDriverPreview);
            await navigator.clipboard.writeText(summaryText);
            setCopyState('copied');
        } catch {
            setCopyState('error');
        }
    }, [config, executiveSummary, topDriverPreview]);

    const exportPdf = useCallback(() => {
        window.print();
    }, []);

    const completedSteps = steps.filter(s => s.status === 'complete').length;
    const progressPct = (completedSteps / STEP_NAMES.length) * 100;
    const preMigrationVulnerabilityPct = (1 - quantumDecay(config.riskHorizon)) * 100;
    const assetValueBase = Math.max(config.assetValue, 1);
    const classicalLossPct = (executiveSummary.expectedLossClassical / assetValueBase) * 100;
    const tailLossPct = (executiveSummary.tailRiskLoss / assetValueBase) * 100;
    const tailToExpectedMultiple = executiveSummary.expectedLossClassical > 0
        ? executiveSummary.tailRiskLoss / executiveSummary.expectedLossClassical
        : 0;
    const annualizedExpectedLoss = executiveSummary.expectedLossClassical / Math.max(config.riskHorizon, 1);
    const selectedFrictionPct = (selectedScenarioResult.frictionCost / assetValueBase) * 100;
    const selectedNpvUpliftVsClassic = selectedScenarioResult.npv - scenarioResults.classic.npv;
    const selectedNetEconomicBenefit = selectedScenarioResult.expectedLossAvoided - selectedScenarioResult.frictionCost;
    const selectedBenefitCostRatio = selectedScenarioResult.frictionCost > 0
        ? selectedScenarioResult.expectedLossAvoided / selectedScenarioResult.frictionCost
        : null;
    const recommendedScenarioResult = executiveSummary.recommendedScenario === 'clean_break'
        ? scenarioResults.cleanBreak
        : scenarioResults[executiveSummary.recommendedScenario];

    return (
        <div className="c2q-page min-h-screen bg-background pt-24 pb-20">
            <Section className={`relative z-10 ${activeTab === 'historical' ? 'pb-4 md:pb-6' : ''}`} fullWidth>
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-4xl mx-auto mb-8">
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <Shield className="w-12 h-12 text-emerald-400" />
                            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                                C2Q <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Asset Migration</span>
                            </h1>
                        </div>
                        <p className="text-lg text-muted-foreground">
                            Quantify expected loss under classical cryptographic failure and compare migration survival paths.
                        </p>
                    </div>

                    <div className="mb-8">
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                            {TAB_OPTIONS.map(tab => (
                                <button
                                    key={tab.value}
                                    onClick={() => setActiveTab(tab.value)}
                                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${activeTab === tab.value
                                        ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300'
                                        : 'border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeTab === 'simulation' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-4 c2q-print-exclude">
                            <GlassPanel className="p-6" hoverEffect>
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-emerald-400" /> Configuration
                                </h2>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Asset Type</label>
                                    <select
                                        value={config.assetType}
                                        onChange={event => setConfig(current => ({ ...current, assetType: event.target.value as AssetType }))}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-emerald-400/50"
                                    >
                                        {ASSET_OPTIONS.map(group => (
                                            <optgroup key={group.category} label={group.category}>
                                                {group.items.map(item => (
                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Strategy</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {STRATEGY_OPTIONS.map(option => (
                                            <button
                                                key={option.value}
                                                onClick={() => setSelectedStrategy(option.value)}
                                                className={`rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors ${selectedStrategy === option.value
                                                    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300'
                                                    : 'border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Asset Value: <span className="text-emerald-400">{formatCurrency(config.assetValue)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1000000}
                                        step={1000}
                                        value={config.assetValue}
                                        onChange={event => setConfig(current => ({ ...current, assetValue: Number(event.target.value) }))}
                                        className="w-full accent-emerald-400"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>$0</span><span>$1,000,000</span></div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Quantum Risk Horizon: <span className="text-amber-400">{config.riskHorizon.toFixed(1)} years</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={10}
                                        step={0.1}
                                        value={config.riskHorizon}
                                        onChange={event => setConfig(current => ({ ...current, riskHorizon: Number(event.target.value) }))}
                                        className="w-full accent-amber-400"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1 yr</span><span>10 yrs</span></div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Haircut: <span className="text-red-400">{config.haircutPct.toFixed(2)}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={50}
                                        step={0.1}
                                        value={config.haircutPct}
                                        onChange={event => setConfig(current => ({ ...current, haircutPct: Number(event.target.value) }))}
                                        className="w-full accent-red-400"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Demurrage Rate: <span className="text-orange-400">{config.demurrageRate.toFixed(2)}%</span>/period
                                    </label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={8}
                                        step={0.05}
                                        value={config.demurrageRate}
                                        onChange={event => setConfig(current => ({ ...current, demurrageRate: Number(event.target.value) }))}
                                        className="w-full accent-orange-400"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Operational Friction: <span className="text-cyan-400">{config.operationalFrictionPct.toFixed(2)}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={15}
                                        step={0.05}
                                        value={config.operationalFrictionPct}
                                        onChange={event => setConfig(current => ({ ...current, operationalFrictionPct: Number(event.target.value) }))}
                                        className="w-full accent-cyan-400"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Hybrid residual factor: <span className="text-yellow-400">{config.hybridResidualFactor.toFixed(2)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={0.1}
                                        max={0.9}
                                        step={0.01}
                                        value={config.hybridResidualFactor}
                                        onChange={event => setConfig(current => ({ ...current, hybridResidualFactor: Number(event.target.value) }))}
                                        className="w-full accent-yellow-400"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Clean break residual floor: <span className="text-lime-400">{config.cleanBreakResidualFloor.toFixed(3)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={0.005}
                                        max={0.2}
                                        step={0.005}
                                        value={config.cleanBreakResidualFloor}
                                        onChange={event => setConfig(current => ({ ...current, cleanBreakResidualFloor: Number(event.target.value) }))}
                                        className="w-full accent-lime-400"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Discount rate: <span className="text-violet-400">{config.discountRate.toFixed(2)}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={20}
                                        step={0.1}
                                        value={config.discountRate}
                                        onChange={event => setConfig(current => ({ ...current, discountRate: Number(event.target.value) }))}
                                        className="w-full accent-violet-400"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
                                        Jurisdiction risk multiplier: <span className="text-pink-400">{config.jurisdictionRiskMultiplier.toFixed(2)}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={0.8}
                                        max={1.8}
                                        step={0.01}
                                        value={config.jurisdictionRiskMultiplier}
                                        onChange={event => setConfig(current => ({ ...current, jurisdictionRiskMultiplier: Number(event.target.value) }))}
                                        className="w-full accent-pink-400"
                                    />
                                </div>

                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Encumbrances</span>
                                        <button
                                            onClick={() => setConfig(current => ({ ...current, hasEncumbrances: !current.hasEncumbrances }))}
                                            className={`w-12 h-6 rounded-full transition-colors ${config.hasEncumbrances ? 'bg-emerald-500' : 'bg-white/10'} relative`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${config.hasEncumbrances ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {([
                                        ['Liquidity', 'liquidity', ['high', 'low']],
                                        ['Volatility', 'volatility', ['stable', 'volatile']],
                                        ['Jurisdiction', 'jurisdiction', ['US', 'EU', 'Global']]
                                    ] as const).map(([label, key, options]) => (
                                        <div key={key}>
                                            <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                                            <select
                                                value={config[key]}
                                                onChange={event => {
                                                    if (key === 'jurisdiction') {
                                                        const nextJurisdiction = event.target.value as Jurisdiction;
                                                        setConfig(current => ({
                                                            ...current,
                                                            jurisdiction: nextJurisdiction,
                                                            jurisdictionRiskMultiplier: getJurisdictionBaseMultiplier(nextJurisdiction),
                                                        }));
                                                        return;
                                                    }

                                                    if (key === 'liquidity') {
                                                        setConfig(current => ({ ...current, liquidity: event.target.value as Liquidity }));
                                                        return;
                                                    }

                                                    setConfig(current => ({ ...current, volatility: event.target.value as Volatility }));
                                                }}
                                                className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-emerald-400/50"
                                            >
                                                {options.map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <button
                                        onClick={runFullSimulation}
                                        disabled={isRunning}
                                        className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isRunning ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 animate-spin" /> Running...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-4 w-4" /> Run Full Simulation
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={resetSimulation}
                                        className="w-full py-2 rounded-lg border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </GlassPanel>

                        </div>

                        <div className="lg:col-span-8 space-y-6">
                            <GlassPanel className="p-6 border-emerald-500/20 c2q-print-include" hoverEffect>
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-emerald-400" /> Executive Risk Summary
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-1">Decision-grade view for board and treasury posture.</p>
                                    </div>
                                    <div className="flex gap-2 c2q-print-exclude">
                                        <button
                                            onClick={copySummary}
                                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs hover:border-emerald-400/50 hover:text-emerald-300 transition-colors"
                                        >
                                            <Copy className="h-3.5 w-3.5" /> Copy Summary
                                        </button>
                                        <button
                                            onClick={exportPdf}
                                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs hover:border-blue-400/50 hover:text-blue-300 transition-colors"
                                        >
                                            <Download className="h-3.5 w-3.5" /> Export PDF
                                        </button>
                                    </div>
                                </div>

                                {copyState !== 'idle' && (
                                    <p className={`text-xs mb-3 ${copyState === 'copied' ? 'text-emerald-300' : 'text-red-400'}`}>
                                        {copyState === 'copied' ? 'Executive summary copied to clipboard.' : 'Clipboard copy failed. Please use browser permissions and retry.'}
                                    </p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected Loss (Classical)</p>
                                        <p className="text-xl font-semibold text-red-400">{formatCurrency(executiveSummary.expectedLossClassical)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tail Risk ({tailRiskLabel}) Loss</p>
                                        <p className="text-xl font-semibold text-orange-400">{formatCurrency(executiveSummary.tailRiskLoss)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Break-even</p>
                                        <p className="text-xl font-semibold text-blue-300">{formatBreakEven(executiveSummary.breakEvenMonths)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Residual Exposure</p>
                                        <p className="text-xl font-semibold text-amber-300">{executiveSummary.residualExposurePct.toFixed(1)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</p>
                                        <p className={`text-xl font-semibold ${recommendationTone}`}>{executiveSummary.recommendationLabel}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Migration Friction Baseline</p>
                                        <p className="text-xl font-semibold text-slate-300">{formatCurrency(executiveSummary.migrationFrictionCost)}</p>
                                    </div>
                                </div>

                                <div className="mt-4 border-t border-white/10 pt-3 text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">Rationale:</span> {executiveSummary.rationale}
                                </div>
                            </GlassPanel>

                            <GlassPanel className="p-6 c2q-print-include" hoverEffect>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
                                    <div>
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-blue-400" /> Simulation Workspace
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {showReport
                                                ? 'Simulation complete. Switch between pre-migration planning and post-migration outcomes.'
                                                : 'Pre-migration planning view. Configure assumptions and run the full simulation to unlock post-migration outcomes.'}
                                        </p>
                                    </div>
                                    {showReport ? (
                                        <div className="inline-flex items-center rounded-lg border border-white/10 p-1 bg-black/30">
                                            <button
                                                onClick={() => setSimulationSubtab('pre')}
                                                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${simulationSubtab === 'pre'
                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                Pre-Migration
                                            </button>
                                            <button
                                                onClick={() => setSimulationSubtab('post')}
                                                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${simulationSubtab === 'post'
                                                    ? 'bg-blue-500/20 text-blue-300'
                                                    : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                Post-Migration
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground border border-white/10 rounded-md px-3 py-1.5 bg-black/20">
                                            Post-Migration subtab unlocks after "Run Full Simulation".
                                        </span>
                                    )}
                                </div>

                                {(!showReport || simulationSubtab === 'pre') && (
                                    <div className="space-y-5">
                                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                            <h4 className="text-sm font-bold text-foreground mb-2">Pre-Migration Briefing</h4>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                Select strategy and risk inputs on the left, then run the full six-step migration workflow. This briefing combines
                                                process staging, anchoring expectations, path economics, and quantum decay context so leadership can review assumptions
                                                before executing the simulation.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Current Input Snapshot</h4>
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                    <p><span className="text-foreground">Asset:</span> {formatAssetType(config.assetType)} ({formatCurrency(config.assetValue)})</p>
                                                    <p><span className="text-foreground">Selected strategy:</span> {selectedStrategyLabel}</p>
                                                    <p><span className="text-foreground">Risk horizon:</span> {config.riskHorizon.toFixed(1)} years</p>
                                                    <p><span className="text-foreground">Classical vulnerability pressure:</span> {preMigrationVulnerabilityPct.toFixed(1)}%</p>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Migration Process Status</h4>
                                                    <span className="text-xs text-emerald-300 font-mono">{completedSteps}/{STEP_NAMES.length} steps</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                    {steps.map((step, index) => (
                                                        <div key={step.name} className="rounded border border-white/10 px-2 py-1 text-muted-foreground flex items-center gap-2">
                                                            <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${step.status === 'complete' ? 'bg-emerald-500/20 text-emerald-300' : step.status === 'running' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-muted-foreground'}`}>
                                                                {index + 1}
                                                            </span>
                                                            <span className="truncate">{step.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-foreground">Anchoring &amp; Attestation Preview</h4>
                                                <span className="text-[11px] text-muted-foreground">Step 6 / 6</span>
                                            </div>
                                            <div className="space-y-1">
                                                {anchoringPreviewLines.map((line, index) => (
                                                    <p key={`${line}-${index}`} className="text-xs font-mono text-muted-foreground">{line}</p>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                            <h4 className="text-sm font-semibold text-foreground mb-3">3-Path Comparison Snapshot</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {[scenarioResults.classic, scenarioResults.hybrid, scenarioResults.cleanBreak].map(result => (
                                                    <div key={result.scenario} className="rounded border border-white/10 p-3 text-xs bg-black/20">
                                                        <p className="font-semibold text-foreground mb-2">{result.label}</p>
                                                        <div className="space-y-1 text-muted-foreground">
                                                            <p><span className="text-foreground">NPV:</span> {formatCurrency(result.npv)}</p>
                                                            <p><span className="text-foreground">Loss avoided:</span> {formatCurrency(result.expectedLossAvoided)}</p>
                                                            <p><span className="text-foreground">Friction:</span> {formatCurrency(result.frictionCost)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                                <h4 className="text-sm font-semibold text-foreground mb-3">Strategy NPV Comparison</h4>
                                                <ResponsiveContainer width="100%" height={180}>
                                                    <BarChart data={npvComparisonData} margin={{ top: 12, right: 8, left: 6, bottom: 6 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={value => `$${(value / 1000).toFixed(0)}k`} />
                                                        <Tooltip
                                                            cursor={{ fill: 'transparent' }}
                                                            contentStyle={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                                                            formatter={(value: number | string | undefined) => [formatCurrency(Number(value ?? 0)), 'NPV']}
                                                        />
                                                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                            {npvComparisonData.map((entry, index) => (
                                                                <Cell key={`pre-npv-cell-${index}`} fill={entry.fill} />
                                                            ))}
                                                            <LabelList
                                                                dataKey="value"
                                                                position="top"
                                                                fill="#cbd5e1"
                                                                fontSize={10}
                                                                formatter={(value: unknown) => `$${(Number(value ?? 0) / 1000).toFixed(0)}k`}
                                                            />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                                <h4 className="text-sm font-semibold text-foreground mb-3">Quantum Decay Function</h4>
                                                <ResponsiveContainer width="100%" height={180}>
                                                    <AreaChart data={decayCurveData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                        <Tooltip contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                                                        <defs>
                                                            <linearGradient id="preSecGrad" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                            </linearGradient>
                                                            <linearGradient id="preRiskGrad" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                            </linearGradient>
                                                        </defs>
                                                        <Area type="monotone" dataKey="security" stroke="#10b981" fill="url(#preSecGrad)" name="Classical Security %" />
                                                        <Area type="monotone" dataKey="risk" stroke="#ef4444" fill="url(#preRiskGrad)" name="Quantum Risk %" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                                <p className="text-[10px] text-muted-foreground mt-2 text-center font-mono">D(t) = 1 / (1 + e^(α·(t − Z_est))) | α=1, Z_est=5</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {showReport && simulationSubtab === 'post' && (
                                    <div className="space-y-5">
                                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                                            <h4 className="text-sm font-bold text-emerald-300 mb-1">Post-Migration Outcomes</h4>
                                            <p className="text-xs text-muted-foreground">
                                                Full simulation completed. This view replaces pre-migration planning context with asset deltas and top sensitivity drivers.
                                            </p>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                            <h4 className="text-sm font-semibold text-foreground mb-3">Asset Delta: Pre vs Post Migration</h4>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b border-white/10 text-muted-foreground">
                                                            <th className="text-left py-2 pr-3">Metric</th>
                                                            <th className="text-left py-2 pr-3">Pre-Migration</th>
                                                            <th className="text-left py-2 pr-3">Post-Migration ({selectedStrategyLabel})</th>
                                                            <th className="text-left py-2">Delta</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr className="border-b border-white/5">
                                                            <td className="py-2 pr-3 text-foreground">Asset value</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(config.assetValue)}</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(finalValue)}</td>
                                                            <td className="py-2 text-muted-foreground">{formatCurrency(finalValue - config.assetValue)}</td>
                                                        </tr>
                                                        <tr className="border-b border-white/5">
                                                            <td className="py-2 pr-3 text-foreground">Expected loss</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(scenarioResults.classic.expectedLoss)}</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(selectedScenarioResult.expectedLoss)}</td>
                                                            <td className="py-2 text-emerald-300">-{formatCurrency(selectedScenarioResult.expectedLossAvoided)}</td>
                                                        </tr>
                                                        <tr className="border-b border-white/5">
                                                            <td className="py-2 pr-3 text-foreground">Tail-risk loss</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(scenarioResults.classic.tailRiskLoss)}</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(selectedScenarioResult.tailRiskLoss)}</td>
                                                            <td className="py-2 text-emerald-300">-{formatCurrency(selectedScenarioResult.tailRiskAvoided)}</td>
                                                        </tr>
                                                        <tr className="border-b border-white/5">
                                                            <td className="py-2 pr-3 text-foreground">Residual exposure</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{preMigrationVulnerabilityPct.toFixed(1)}% quantum pressure</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{selectedScenarioResult.residualExposurePct.toFixed(1)}%</td>
                                                            <td className="py-2 text-muted-foreground">{(selectedScenarioResult.residualExposurePct - preMigrationVulnerabilityPct).toFixed(1)} pts</td>
                                                        </tr>
                                                        <tr className="border-b border-white/5">
                                                            <td className="py-2 pr-3 text-foreground">Migration friction</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">$0</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(selectedScenarioResult.frictionCost)}</td>
                                                            <td className="py-2 text-muted-foreground">~{selectedScenarioResult.timeToMigrateMonths} months</td>
                                                        </tr>
                                                        <tr>
                                                            <td className="py-2 pr-3 text-foreground">NPV</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(scenarioResults.classic.npv)}</td>
                                                            <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(selectedScenarioResult.npv)}</td>
                                                            <td className={`py-2 ${selectedScenarioResult.npv >= scenarioResults.classic.npv ? 'text-emerald-300' : 'text-red-300'}`}>
                                                                {formatCurrency(selectedScenarioResult.npv - scenarioResults.classic.npv)}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                            <h4 className="text-sm font-semibold text-foreground mb-2">Top Drivers</h4>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Sensitivity computed by varying each key input +/-20% and ranking impact on expected loss and break-even.
                                            </p>
                                            <div className="space-y-3">
                                                {topDrivers.map((driver: SensitivityDriver, index: number) => {
                                                    const width = `${Math.max(8, (driver.impactScore / maxDriverImpact) * 100)}%`;
                                                    return (
                                                        <div key={driver.key} className="rounded-lg border border-white/10 p-3 bg-black/20">
                                                            <div className="flex items-center justify-between text-xs mb-2">
                                                                <span className="font-semibold text-foreground">{index + 1}. {driver.label}</span>
                                                                <span className="text-muted-foreground">impact {driver.impactScore.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                                                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-500" style={{ width }} />
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground space-y-1">
                                                                <p>Input range: <span className="text-foreground">{driver.inputRangeLabel}</span></p>
                                                                <p>Expected loss delta: <span className="text-amber-300">{formatCurrency(driver.expectedLossDelta)}</span></p>
                                                                <p>Break-even delta: <span className="text-sky-300">{driver.breakEvenDeltaMonths.toFixed(1)} months</span> (range {formatBreakEvenRange(driver.breakEvenRangeMonths)})</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </GlassPanel>
                        </div>
                    </div>
                    )}

                    {activeTab === 'explanation' && (
                        <div className="space-y-6">
                            <GlassPanel className="p-6" hoverEffect>
                                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                                    <Info className="h-5 w-5 text-blue-400" /> What This Simulation Is, Does, and Proposes
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">What it is</p>
                                        <p className="text-muted-foreground">A strategic model for C-level planning that quantifies classical cryptographic failure exposure and compares migration paths.</p>
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">What it does</p>
                                        <p className="text-muted-foreground">Runs scenario economics, tracks risk-adjusted outcomes, and estimates break-even, friction, residual exposure, and tail loss.</p>
                                    </div>
                                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">What it proposes</p>
                                        <p className="text-muted-foreground">A decision posture ({executiveSummary.recommendationLabel}) using configurable thresholds and top sensitivity drivers.</p>
                                    </div>
                                </div>
                            </GlassPanel>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {EDUCATION_SECTIONS.map((section, index) => (
                                    <GlassPanel key={index} className="p-6" hoverEffect>
                                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                            {section.icon} {section.title}
                                        </h3>
                                        <div className="space-y-2">
                                            {section.content.split('\n\n').map((paragraph, paragraphIndex) => (
                                                <p
                                                    key={paragraphIndex}
                                                    className="text-sm text-muted-foreground leading-relaxed"
                                                    dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }}
                                                />
                                            ))}
                                        </div>
                                    </GlassPanel>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'executive' && (
                        <div className="space-y-6 c2q-print-include">
                            <GlassPanel className="p-6 border-emerald-500/20" hoverEffect>
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-emerald-400" /> Executive Briefing
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-1">Forwardable decision summary for leadership and treasury teams.</p>
                                    </div>
                                    <div className="flex gap-2 c2q-print-exclude">
                                        <button
                                            onClick={copySummary}
                                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs hover:border-emerald-400/50 hover:text-emerald-300 transition-colors"
                                        >
                                            <Copy className="h-3.5 w-3.5" /> Copy Summary
                                        </button>
                                        <button
                                            onClick={exportPdf}
                                            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs hover:border-blue-400/50 hover:text-blue-300 transition-colors"
                                        >
                                            <Download className="h-3.5 w-3.5" /> Export PDF
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected Loss (Classical)</p>
                                        <p className="text-xl font-semibold text-red-400">{formatCurrency(executiveSummary.expectedLossClassical)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tail Risk ({tailRiskLabel}) Loss</p>
                                        <p className="text-xl font-semibold text-orange-400">{formatCurrency(executiveSummary.tailRiskLoss)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Break-even</p>
                                        <p className="text-xl font-semibold text-blue-300">{formatBreakEven(executiveSummary.breakEvenMonths)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Residual Exposure</p>
                                        <p className="text-xl font-semibold text-amber-300">{executiveSummary.residualExposurePct.toFixed(1)}%</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommendation</p>
                                        <p className={`text-xl font-semibold ${recommendationTone}`}>{executiveSummary.recommendationLabel}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Migration Friction Baseline</p>
                                        <p className="text-xl font-semibold text-slate-300">{formatCurrency(executiveSummary.migrationFrictionCost)}</p>
                                    </div>
                                </div>
                            </GlassPanel>

                            <GlassPanel className="p-6" hoverEffect>
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-400" /> Financial & Economic Context
                                </h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Loss Geometry (Classical Baseline)</p>
                                        <div className="space-y-2 text-xs text-muted-foreground">
                                            <p><span className="text-foreground">Expected loss rate:</span> {formatPct(classicalLossPct)} of asset value ({formatCurrency(executiveSummary.expectedLossClassical)})</p>
                                            <p><span className="text-foreground">Tail loss rate ({tailRiskLabel}):</span> {formatPct(tailLossPct)} of asset value ({formatCurrency(executiveSummary.tailRiskLoss)})</p>
                                            <p><span className="text-foreground">Tail amplification:</span> {tailToExpectedMultiple.toFixed(2)}x expected loss</p>
                                            <p><span className="text-foreground">Annualized expected loss pressure:</span> {formatCurrency(annualizedExpectedLoss)} / year</p>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Decision Economics (Selected Strategy)</p>
                                        <div className="space-y-2 text-xs text-muted-foreground">
                                            <p><span className="text-foreground">Selected strategy:</span> {selectedStrategyLabel}</p>
                                            <p><span className="text-foreground">NPV uplift vs do nothing:</span> {formatCurrency(selectedNpvUpliftVsClassic)}</p>
                                            <p><span className="text-foreground">Net economic benefit (undiscounted):</span> {formatCurrency(selectedNetEconomicBenefit)}</p>
                                            <p><span className="text-foreground">Migration friction load:</span> {formatPct(selectedFrictionPct, 2)} of asset value ({formatCurrency(selectedScenarioResult.frictionCost)})</p>
                                            <p><span className="text-foreground">Benefit / friction ratio:</span> {selectedBenefitCostRatio === null ? 'N/A' : `${selectedBenefitCostRatio.toFixed(2)}x`}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 border-t border-white/10 pt-3 text-xs text-muted-foreground leading-relaxed">
                                    <span className="text-foreground font-semibold">Interpretation:</span> At the current inputs, the model prices classical exposure at {formatPct(classicalLossPct)}
                                    with a {tailToExpectedMultiple.toFixed(2)}x tail multiplier. Recommended posture is <span className="text-foreground">{executiveSummary.recommendationLabel}</span>,
                                    which leaves {formatPct(recommendedScenarioResult.residualExposurePct)} residual exposure and implies break-even of {formatBreakEven(recommendedScenarioResult.breakEvenMonths)}.
                                </div>
                            </GlassPanel>

                            <GlassPanel className="p-6" hoverEffect>
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-400" /> 3-Path Comparison Snapshot
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-left text-muted-foreground border-b border-white/10">
                                                <th className="py-2 pr-3">Strategy</th>
                                                <th className="py-2 pr-3">NPV</th>
                                                <th className="py-2 pr-3">Expected Loss Avoided</th>
                                                <th className="py-2 pr-3">Tail-risk Avoided</th>
                                                <th className="py-2 pr-3">Friction Cost</th>
                                                <th className="py-2 pr-3">Friction % Asset</th>
                                                <th className="py-2 pr-3">Benefit / Cost</th>
                                                <th className="py-2 pr-3">Break-even</th>
                                                <th className="py-2">Time-to-migrate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[scenarioResults.classic, scenarioResults.hybrid, scenarioResults.cleanBreak].map(result => {
                                                const frictionPctOfAsset = (result.frictionCost / assetValueBase) * 100;
                                                const benefitCostRatio = result.frictionCost > 0 ? result.expectedLossAvoided / result.frictionCost : null;
                                                return (
                                                    <tr key={result.scenario} className="border-b border-white/5">
                                                        <td className="py-2 pr-3 text-foreground">{result.label}</td>
                                                        <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(result.npv)}</td>
                                                        <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(result.expectedLossAvoided)}</td>
                                                        <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(result.tailRiskAvoided)}</td>
                                                        <td className="py-2 pr-3 text-muted-foreground">{formatCurrency(result.frictionCost)}</td>
                                                        <td className="py-2 pr-3 text-muted-foreground">{formatPct(frictionPctOfAsset, 2)}</td>
                                                        <td className="py-2 pr-3 text-muted-foreground">{benefitCostRatio === null ? 'N/A' : `${benefitCostRatio.toFixed(2)}x`}</td>
                                                        <td className="py-2 pr-3 text-muted-foreground">{formatBreakEven(result.breakEvenMonths)}</td>
                                                        <td className="py-2 text-muted-foreground">{result.timeToMigrateMonths} months</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassPanel>

                            <GlassPanel className="p-6" hoverEffect>
                                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-400" /> Key Assumption Drivers
                                </h3>
                                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                    Sensitivity ranking uses +/-20% shocks. These are the variables most likely to move board-level outcomes (expected loss and break-even timing).
                                </p>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    {topDriverPreview.map(driver => (
                                        <p key={driver.key}>
                                            <span className="text-foreground font-semibold">{driver.label}:</span> range {driver.inputRangeLabel}, expected loss delta {formatCurrency(driver.expectedLossDelta)}, break-even delta {driver.breakEvenDeltaMonths.toFixed(1)} months
                                        </p>
                                    ))}
                                </div>
                            </GlassPanel>
                        </div>
                    )}

                    {activeTab === 'math' && (
                        <div className="space-y-6">
                            <C2QDeepDiveContent embedded />
                        </div>
                    )}
                </div>
            </Section>

            {/* Historical & Economic Context */}
            {activeTab === 'historical' && (
            <Section className="relative z-10 mt-0 pt-4 md:pt-6 c2q-print-exclude" fullWidth>
                <div className="container mx-auto px-4 space-y-6">
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
            )}
        </div>
    );
};

export default C2QAssetMigration;
