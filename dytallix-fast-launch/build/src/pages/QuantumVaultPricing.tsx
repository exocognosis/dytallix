import React, { useMemo, useState } from 'react';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import {
    Shield, Info, Lock, Sparkles, Server
} from 'lucide-react';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------
interface FeatureTier {
    label: string;
    description: string;
    licenseMultiplier: number;
    implementationMultiplier: number;
}

interface TierDefaults {
    rootCAs: number;
    gateways: number;
    sites: number;
    complianceClass: string;
    marketDiscount: number;
}

// -------------------------------------------------------------------
// Component
// -------------------------------------------------------------------
const QuantumVaultPricing: React.FC = () => {
    // ----------------------------
    // Per-unit pricing (no arbitrary base costs)
    // Anchored at $50,000 per Root CA annual license
    // ----------------------------
    const CA_LICENSE = 50_000;         // Annual license per Root CA
    const GATEWAY_LICENSE = 25_000;    // Annual license per Gateway
    const CA_IMPLEMENTATION = 50_000;  // One-time per Root CA (ceremony, HSM, policy)
    const GATEWAY_IMPLEMENTATION = 15_000; // One-time per Gateway (deployment)
    const SITE_IMPLEMENTATION = 25_000;    // One-time per Site (coordination, validation)

    // ----------------------------
    // Tier packages (feature scope / customisation)
    // ----------------------------
    const FEATURE_TIERS: Record<string, FeatureTier> = useMemo(
        () => ({
            Standard: {
                label: 'Standard',
                description:
                    'Core QuantumVault deployment with baseline assurance and single-environment support.',
                licenseMultiplier: 1.0,
                implementationMultiplier: 1.0,
            },
            Market: {
                label: 'Market',
                description:
                    'Expanded operational scope, higher assurance rigor, and multi-environment support for early institutional adoption.',
                licenseMultiplier: 1.25,
                implementationMultiplier: 1.15,
            },
            Bespoke: {
                label: 'Bespoke',
                description:
                    'Custom-tailored cryptographic workflows, policy graphs, and assurance posture for complex or sovereign deployments.',
                licenseMultiplier: 1.6,
                implementationMultiplier: 1.4,
            },
        }),
        [],
    );

    // ----------------------------
    // Compliance posture classes
    // ----------------------------
    const complianceMultipliers: Record<string, number> = useMemo(
        () => ({
            None: 0,
            SOX: 0.15,
            HIPAA: 0.15,
            ITAR: 0.25,
            Sovereign: 0.4,
        }),
        [],
    );

    const complianceDescriptions: Record<string, string[]> = useMemo(
        () => ({
            SOX: [
                'Stricter change control and evidence trails.',
                'Expanded audit logging and retention expectations.',
                'Higher documentation and validation burden.',
            ],
            HIPAA: [
                'Access control rigor and auditability of actions.',
                'Incident response and breach readiness requirements.',
                'Policy enforcement and reporting expectations.',
            ],
            ITAR: [
                'Export-controlled posture and restricted access.',
                'Stronger isolation requirements across domains.',
                'Higher validation and deployment discipline.',
            ],
            Sovereign: [
                'Air-gapped / isolated operations and constrained update paths.',
                'Increased key ceremony overhead and custody discipline.',
                'Highest assurance and validation cost class.',
            ],
        }),
        [],
    );

    // ----------------------------
    // Tier defaults (applied when a tier card is clicked)
    // ----------------------------
    const TIER_DEFAULTS: Record<string, TierDefaults> = useMemo(
        () => ({
            Standard: { rootCAs: 1, gateways: 2, sites: 1, complianceClass: 'None', marketDiscount: 20 },
            Market:   { rootCAs: 3, gateways: 6, sites: 3, complianceClass: 'SOX', marketDiscount: 15 },
            Bespoke:  { rootCAs: 6, gateways: 12, sites: 6, complianceClass: 'Sovereign', marketDiscount: 10 },
        }),
        [],
    );

    // ----------------------------
    // State
    // ----------------------------
    const [featureTier, setFeatureTier] = useState('Standard');
    const [rootCAs, setRootCAs] = useState(1);
    const [gateways, setGateways] = useState(1);
    const [sites, setSites] = useState(1);
    const [complianceClass, setComplianceClass] = useState('None');
    const [marketDiscount, setMarketDiscount] = useState(0);
    const [showComplianceInfo, setShowComplianceInfo] = useState(false);

    const applyTierDefaults = (tierKey: string) => {
        const defaults = TIER_DEFAULTS[tierKey];
        if (!defaults) return;
        setFeatureTier(tierKey);
        setRootCAs(defaults.rootCAs);
        setGateways(defaults.gateways);
        setSites(defaults.sites);
        setComplianceClass(defaults.complianceClass);
        setMarketDiscount(defaults.marketDiscount);
    };

    // ----------------------------
    // Calculations (purely from user inputs)
    // ----------------------------
    const pricing = useMemo(() => {
        const complexityMultiplier = 1 + (complianceMultipliers[complianceClass] ?? 0);

        const annualLicenseBase = rootCAs * CA_LICENSE + gateways * GATEWAY_LICENSE;
        const annualLicense =
            annualLicenseBase * FEATURE_TIERS[featureTier].licenseMultiplier;

        const implementationBase =
            (rootCAs * CA_IMPLEMENTATION + gateways * GATEWAY_IMPLEMENTATION + sites * SITE_IMPLEMENTATION)
            * complexityMultiplier;
        const implementation =
            implementationBase * FEATURE_TIERS[featureTier].implementationMultiplier;

        const totalBeforeDiscount = annualLicense + implementation;
        const discountAmount = totalBeforeDiscount * (marketDiscount / 100);
        const totalYearOne = totalBeforeDiscount - discountAmount;

        return { annualLicense, implementation, discountAmount, totalYearOne };
    }, [rootCAs, gateways, sites, featureTier, complianceClass, marketDiscount, complianceMultipliers, FEATURE_TIERS]);

    // ----------------------------
    // Helpers
    // ----------------------------
    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'Standard': return 'from-teal-400 to-emerald-600';
            case 'Market': return 'from-blue-400 to-indigo-600';
            case 'Bespoke': return 'from-purple-400 to-pink-600';
            default: return 'from-teal-400 to-emerald-600';
        }
    };

    // ----------------------------
    // Render
    // ----------------------------
    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                {/* Hero */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 text-purple-500 mb-6">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        QuantumVault{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                            Pricing
                        </span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Licensed cryptographic authority + assurance. Scales with topology and
                        operational footprint — not users, transactions, or data volume.
                    </p>
                </div>

                {/* ===== PRICING MODEL ===== */}
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

                        {/* Feature Tier Selector */}
                        <GlassPanel className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-500" />
                                Feature Tier
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {Object.entries(FEATURE_TIERS).map(([key, tier]) => (
                                    <button
                                        key={key}
                                        onClick={() => applyTierDefaults(key)}
                                        className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                                            featureTier === key
                                                ? 'border-purple-500/50 bg-purple-500/5 shadow-lg shadow-purple-500/10'
                                                : 'border-border hover:border-border/80 hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span
                                                className={`text-sm font-bold ${
                                                    featureTier === key
                                                        ? `text-transparent bg-clip-text bg-gradient-to-r ${getTierColor(key)}`
                                                        : 'text-foreground'
                                                }`}
                                            >
                                                {tier.label}
                                            </span>
                                            {featureTier === key && (
                                                <span className="inline-flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {tier.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </GlassPanel>

                        {/* Infrastructure Sliders */}
                        <GlassPanel className="p-6">
                            <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                                <Server className="w-5 h-5 text-blue-500" />
                                Infrastructure Topology
                            </h3>

                            <div className="space-y-8">
                                {/* Root CAs */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Root Certificate Authorities (Trust Anchors)
                                        </label>
                                        <span className="text-sm font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                                            {rootCAs}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Each Root CA is an independent cryptographic authority domain. Primary driver of isolation and assurance complexity.
                                    </p>
                                    <input
                                        type="range"
                                        min={1}
                                        max={10}
                                        step={1}
                                        value={rootCAs}
                                        onChange={(e) => setRootCAs(Number(e.target.value))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-purple-500"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>1</span>
                                        <span>10</span>
                                    </div>
                                </div>

                                {/* Gateways */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Gateway / Site Nodes
                                        </label>
                                        <span className="text-sm font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                                            {gateways}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Gateways represent locations where cryptographic authority is exercised. Each expands operational surface area.
                                    </p>
                                    <input
                                        type="range"
                                        min={1}
                                        max={20}
                                        step={1}
                                        value={gateways}
                                        onChange={(e) => setGateways(Number(e.target.value))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-purple-500"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>1</span>
                                        <span>20</span>
                                    </div>
                                </div>

                                {/* Physical Sites */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-foreground">
                                            Physical Sites
                                        </label>
                                        <span className="text-sm font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                                            {sites}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Physical sites add deployment coordination and validation overhead. Affects one-time implementation services only.
                                    </p>
                                    <input
                                        type="range"
                                        min={1}
                                        max={15}
                                        step={1}
                                        value={sites}
                                        onChange={(e) => setSites(Number(e.target.value))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-purple-500"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>1</span>
                                        <span>15</span>
                                    </div>
                                </div>
                            </div>
                        </GlassPanel>

                        {/* Compliance Class */}
                        <GlassPanel className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-amber-500" />
                                    Compliance Class
                                </h3>
                                <button
                                    onClick={() => setShowComplianceInfo(!showComplianceInfo)}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Info className="h-4 w-4" />
                                    What is this?
                                </button>
                            </div>

                            {showComplianceInfo && (
                                <GlassPanel variant="card" className="p-4 mb-4 animate-fade-in">
                                    <p className="font-medium text-sm mb-2 text-foreground">
                                        Compliance Class — binary posture selected by regime
                                    </p>
                                    <ul className="text-xs text-muted-foreground space-y-1.5">
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 mt-0.5">•</span>
                                            <span><strong className="text-foreground">None:</strong> Standard commercial assurance.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 mt-0.5">•</span>
                                            <span><strong className="text-foreground">SOX:</strong> Auditability, change control, retention, evidence.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 mt-0.5">•</span>
                                            <span><strong className="text-foreground">HIPAA:</strong> Privacy controls, access logging, incident rigor.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 mt-0.5">•</span>
                                            <span><strong className="text-foreground">ITAR:</strong> Export-controlled handling, restricted access paths.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-purple-500 mt-0.5">•</span>
                                            <span><strong className="text-foreground">Sovereign:</strong> Air-gapped / isolated operations, constrained patch pathways.</span>
                                        </li>
                                    </ul>
                                </GlassPanel>
                            )}

                            <p className="text-xs text-muted-foreground mb-4">
                                Select the governing compliance regime. This posture class increases assurance and validation burden.
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {(['None', 'SOX', 'HIPAA', 'ITAR', 'Sovereign'] as const).map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setComplianceClass(c)}
                                        className={`relative rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 flex items-center justify-between ${
                                            complianceClass === c
                                                ? 'border-purple-500/50 bg-purple-500/10 text-foreground shadow-lg shadow-purple-500/10'
                                                : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/30 hover:text-foreground'
                                        }`}
                                    >
                                        <span>{c}</span>
                                        {c !== 'None' && (
                                            <Lock className={`h-3.5 w-3.5 ${
                                                complianceClass === c ? 'text-purple-500' : 'text-muted-foreground/50'
                                            }`} />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Show selected compliance details */}
                            {complianceClass !== 'None' && complianceDescriptions[complianceClass] && (
                                <div className="mt-4 pt-4 border-t border-border/50 animate-fade-in">
                                    <p className="text-sm font-medium text-foreground mb-2">{complianceClass} Posture</p>
                                    <ul className="text-xs text-muted-foreground space-y-1.5">
                                        {complianceDescriptions[complianceClass].map((desc, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-amber-500 mt-0.5">•</span>
                                                <span>{desc}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </GlassPanel>

                        {/* Market Discount */}
                        <GlassPanel className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-foreground">
                                    New-to-Market Pricing Adjustment
                                </h3>
                                <span className="text-sm font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                                    {marketDiscount}%
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-3">
                                Temporary concession for early-market entry. Applied uniformly to year-one pricing only. List price remains visible for renewal anchoring.
                            </p>
                            <input
                                type="range"
                                min={0}
                                max={40}
                                step={5}
                                value={marketDiscount}
                                onChange={(e) => setMarketDiscount(Number(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-purple-500"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>0%</span>
                                <span>40%</span>
                            </div>
                        </GlassPanel>

                        {/* Results Panel */}
                        <GlassPanel variant="dark" className="p-6" key={`results-${pricing.totalYearOne}`}>
                            <p className="text-xs text-muted-foreground mb-4">
                                Calculations based on licensed infrastructure complexity. Annual license scales mechanically with Root CAs and Gateways.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                                    <p className="text-xs text-muted-foreground mb-1">Annual Platform License</p>
                                    <p className="text-2xl font-bold text-foreground" key={`lic-${pricing.annualLicense}`}>
                                        ${pricing.annualLicense.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">List price before concession</p>
                                </div>
                                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                                    <p className="text-xs text-muted-foreground mb-1">One-Time Implementation</p>
                                    <p className="text-2xl font-bold text-foreground" key={`impl-${pricing.implementation}`}>
                                        ${pricing.implementation.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">List price before concession</p>
                                </div>
                            </div>

                            {marketDiscount > 0 && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" key={`disc-${pricing.discountAmount}`}>
                                    <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                                    New-to-market discount: −${pricing.discountAmount.toLocaleString()}
                                </div>
                            )}

                            <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-6 text-center">
                                <p className="text-sm text-muted-foreground mb-1">Year-One Total</p>
                                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500" key={`total-${pricing.totalYearOne}`}>
                                    ${pricing.totalYearOne.toLocaleString()}
                                </p>
                            </div>
                        </GlassPanel>
                    </div>
            </Section>
        </div>
    );
};

export default QuantumVaultPricing;
