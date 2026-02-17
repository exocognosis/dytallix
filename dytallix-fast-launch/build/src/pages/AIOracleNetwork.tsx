import React from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import { buildApiUrl } from '../utils/api';
import { Brain, Shield, Activity, Lock, Zap, Fingerprint } from 'lucide-react';

interface ModuleCard {
    id: string;
    name: string;
    description: string;
    technicalDetails: string;
    status: string;
    mainnetStatus: string;
    lastUpdate: string;
    transactionsScored: string;
    metricLabel: string;
    secondaryMetricLabel: string | null;
    secondaryMetricValue: string | null;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    dashboardPath: string;
}

const AIOracleNetwork: React.FC = () => {
    // State for active modules
    const [activeModules, setActiveModules] = React.useState<ModuleCard[]>([
        {
            id: 'aegis',
            name: 'Aegis',
            description: 'Quantum-resistant active defense system. Real-time assessment of transaction vulnerability using ML-DSA-87 signatures.',
            technicalDetails: 'Analyzes wallet age, interaction history, and cryptographic primitives using Lattice-based cryptography (Kyber-1024). Signs risk scores with NIST Level 5 ML-DSA-87 for on-chain verification.',
            status: 'Loading...',
            mainnetStatus: 'Planned for MainNet',
            lastUpdate: 'Loading...',
            transactionsScored: '0',
            metricLabel: 'Tx Scored',
            secondaryMetricLabel: 'Wallets Tracked',
            secondaryMetricValue: '0',
            icon: Shield,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            dashboardPath: '/aegis-dashboard'
        },
        {
            id: 'vector',
            name: 'Vector',
            description: 'Model-based address reputation feed focused on identity and behavioral risk signals that complement Aegis transaction scoring.',
            technicalDetails: 'Aggregates wallet behavior patterns, counterparty concentration, velocity, and validator outcomes into a signed address reputation + risk-tier attestation feed for dApp policy engines.',
            status: 'Loading...',
            mainnetStatus: 'Pilot on TestNet',
            lastUpdate: 'Loading...',
            transactionsScored: '0',
            metricLabel: 'Profiles Scored',
            secondaryMetricLabel: 'Attestations Relayed',
            secondaryMetricValue: '0',
            icon: Fingerprint,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            dashboardPath: '/vector-dashboard'
        },
        {
            id: 'horizon',
            name: 'Horizon',
            description: 'Agentic network + DeFi monitor that indexes bridge, pool, and mempool telemetry and emits signed incident attestations.',
            technicalDetails: 'Indexes bridge state, emission pools, and pending mempool flow. Detects bridge anomalies, pool drains, and concentration patterns, signs incident attestations, relays them on-chain, and triggers policy circuit breakers.',
            status: 'Loading...',
            mainnetStatus: 'Pilot on TestNet',
            lastUpdate: 'Loading...',
            transactionsScored: '0',
            metricLabel: 'Incidents',
            secondaryMetricLabel: 'Active Breakers',
            secondaryMetricValue: '0',
            icon: Activity,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            dashboardPath: '/horizon-dashboard'
        },
        {
            id: 'garrison',
            name: 'Garrison',
            description: 'Smart-contract compliance oracle with PQC attestations and optional on-chain publication.',
            technicalDetails: 'Current engine runs heuristic static checks (selfdestruct, tx.origin, delegatecall), signs canonical attestations, and can publish audit records to oracle:audit:* for deployment gating.',
            status: 'Loading...',
            mainnetStatus: 'Planned for MainNet',
            lastUpdate: 'Loading...',
            transactionsScored: '0',
            metricLabel: 'Audits',
            secondaryMetricLabel: null,
            secondaryMetricValue: null,
            icon: Lock,
            color: 'text-teal-500',
            bg: 'bg-teal-500/10',
            dashboardPath: '/smart-contract-auditor'
        },
        {
            id: 'consul',
            name: 'Consul',
            description: 'Governance diplomat agent that watches proposals, simulates downside, and posts signed risk attestations on-chain.',
            technicalDetails: 'Runs event-driven proposal simulations, emits ML-DSA-signed governance risk attestations, computes quorum snapshots, and opens disputes when oracle recommendations diverge.',
            status: 'Loading...',
            mainnetStatus: 'Pilot on TestNet',
            lastUpdate: 'Loading...',
            transactionsScored: '0',
            metricLabel: 'Attestations',
            secondaryMetricLabel: null,
            secondaryMetricValue: null,
            icon: Brain,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            dashboardPath: '/consul-dashboard'
        }
    ]);

    // Fetch module stats on mount
    React.useEffect(() => {
        const formatRelativeTime = (dateValue?: string | null) => {
            if (!dateValue) return 'Never';
            const ts = new Date(dateValue);
            if (Number.isNaN(ts.getTime())) return 'Unknown';
            const diffMs = Date.now() - ts.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
            if (diffMins < 1440) {
                const hours = Math.floor(diffMins / 60);
                return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            }
            const days = Math.floor(diffMins / 1440);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        };

        const fetchModuleStats = async () => {
            try {
                const [aegisResponse, consulResponse, garrisonResponse, horizonResponse, vectorResponse] = await Promise.all([
                    fetch(buildApiUrl('/aegis/stats')),
                    fetch(buildApiUrl('/consul/status')),
                    fetch(buildApiUrl('/garrison/status')),
                    fetch(buildApiUrl('/horizon/status')),
                    fetch(buildApiUrl('/vector/status')),
                ]);

                const aegisData = await aegisResponse.json().catch(() => ({}));
                const consulData = await consulResponse.json().catch(() => ({}));
                const garrisonData = await garrisonResponse.json().catch(() => ({}));
                const horizonData = await horizonResponse.json().catch(() => ({}));
                const vectorData = await vectorResponse.json().catch(() => ({}));

                setActiveModules(prev => prev.map(module => {
                    if (module.id === 'aegis') {
                        if (aegisData.success && aegisData.stats) {
                            const scoredTransactions = Number(aegisData.stats.total_transactions ?? 0);
                            const modelWallets = Number(aegisData.stats.total_wallets ?? 0);
                            const chainWallets = Number(aegisData.stats.chain_observed_wallets ?? 0);
                            const walletsTracked = Math.max(modelWallets, chainWallets);
                            const lastObserved = aegisData.stats.last_update
                                || aegisData.stats.last_chain_activity
                                || aegisData.stats.last_wallet_analysis
                                || aegisData.stats.last_analysis;
                            return {
                                ...module,
                                status: 'Active on TestNet',
                                lastUpdate: formatRelativeTime(lastObserved),
                                transactionsScored: scoredTransactions.toLocaleString(),
                                secondaryMetricValue: walletsTracked.toLocaleString()
                            };
                        }
                        return {
                            ...module,
                            status: 'Service Unavailable',
                            lastUpdate: 'Error',
                            transactionsScored: 'N/A',
                            secondaryMetricValue: 'N/A'
                        };
                    }

                    if (module.id === 'horizon') {
                        if (horizonData.success) {
                            const running = Boolean(horizonData?.agent?.running);
                            const incidents = Number(horizonData?.totals?.incidents_detected ?? horizonData?.totals?.incidents_total ?? 0);
                            const activeBreakers = Number(horizonData?.totals?.circuit_breakers_active ?? 0);
                            return {
                                ...module,
                                status: running ? 'Running Cycle' : 'Active on TestNet',
                                lastUpdate: formatRelativeTime(horizonData?.agent?.last_run_at),
                                transactionsScored: incidents.toLocaleString(),
                                secondaryMetricValue: activeBreakers.toLocaleString()
                            };
                        }
                        return {
                            ...module,
                            status: 'Active on TestNet',
                            lastUpdate: 'Awaiting telemetry',
                            transactionsScored: '0',
                            secondaryMetricValue: '0'
                        };
                    }

                    if (module.id === 'vector') {
                        if (vectorData.success) {
                            const running = Boolean(vectorData?.agent?.running);
                            const profiles = Number(vectorData?.totals?.profiles_total ?? 0);
                            const relayed = Number(vectorData?.totals?.attestations_submitted ?? 0);
                            const lastObserved = vectorData?.agent?.last_run_at
                                || vectorData?.totals?.latest_profile_at
                                || vectorData?.totals?.latest_attestation_at;
                            return {
                                ...module,
                                status: running ? 'Running Cycle' : 'Active on TestNet',
                                lastUpdate: formatRelativeTime(lastObserved),
                                transactionsScored: profiles.toLocaleString(),
                                secondaryMetricValue: relayed.toLocaleString(),
                            };
                        }
                        return {
                            ...module,
                            status: 'Active on TestNet',
                            lastUpdate: 'Awaiting telemetry',
                            transactionsScored: '0',
                            secondaryMetricValue: '0'
                        };
                    }

                    if (module.id === 'consul') {
                        if (consulData.success) {
                            const attestationsPosted = consulData?.totals?.attestations_posted ?? 0;
                            const running = Boolean(consulData?.agent?.running);
                            return {
                                ...module,
                                status: running ? 'Running Cycle' : 'Active on TestNet',
                                lastUpdate: formatRelativeTime(consulData?.agent?.last_run_at),
                                transactionsScored: Number(attestationsPosted).toLocaleString()
                            };
                        }
                        return {
                            ...module,
                            status: 'Active on TestNet',
                            lastUpdate: 'Awaiting telemetry',
                            transactionsScored: '0',
                            secondaryMetricValue: null
                        };
                    }

                    if (module.id === 'garrison') {
                        if (garrisonData.success) {
                            const audits = Number(garrisonData?.totals?.auditCalls ?? 0);
                            const running = Boolean(garrisonData?.agent?.running);
                            return {
                                ...module,
                                status: running ? 'Running Cycle' : 'Active on TestNet',
                                lastUpdate: formatRelativeTime(garrisonData?.agent?.last_run_at || garrisonData?.agent?.started_at),
                                transactionsScored: audits.toLocaleString()
                            };
                        }
                        return {
                            ...module,
                            status: 'Service Unavailable',
                            lastUpdate: 'Error',
                            transactionsScored: 'N/A',
                            secondaryMetricValue: null
                        };
                    }

                    return module;
                }));
            } catch (error) {
                console.error('Failed to fetch AI module stats:', error);
                setActiveModules(prev => prev.map(module => {
                    if (module.id === 'consul' || module.id === 'horizon' || module.id === 'vector') {
                        return {
                            ...module,
                            status: 'Active on TestNet',
                            lastUpdate: 'Awaiting telemetry',
                            transactionsScored: '0',
                            secondaryMetricValue: module.secondaryMetricLabel ? '0' : null
                        };
                    }
                    if (module.id === 'aegis' || module.id === 'garrison') {
                        return {
                            ...module,
                            status: 'Service Unavailable',
                            lastUpdate: 'Error',
                            transactionsScored: 'N/A',
                            secondaryMetricValue: module.secondaryMetricLabel ? 'N/A' : null
                        };
                    }
                    return module;
                }));
            }
        };

        fetchModuleStats();

        // Refresh stats every 30 seconds
        const interval = setInterval(fetchModuleStats, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        AI Oracle <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-purple-500">Network</span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Transparently monitoring the AI agents securing the Dytallix ecosystem.
                        Verified on-chain with Post-Quantum Cryptography.
                    </p>
                </div>

                {/* Active Modules Section */}
                <div className="mb-20">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                        <h2 className="text-2xl font-bold">Active Modules</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                        {activeModules.map((module) => (
                            <GlassPanel key={module.id} className="h-[720px] p-6 relative overflow-hidden group flex flex-col" hoverEffect={true}>
                                <div className="absolute top-0 right-0 p-4 opacity-50">
                                    <Zap className="w-24 h-24 text-accent-blue/5 -rotate-12 transform translate-x-8 -translate-y-8" />
                                </div>

                                <div className="relative z-10 flex-1">
                                    <div className={`h-12 w-12 rounded-xl ${module.bg} flex items-center justify-center ${module.color} mb-4`}>
                                        <module.icon className="h-6 w-6" />
                                    </div>

                                    <h3 className="text-xl font-bold mb-2">{module.name}</h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        {module.description}
                                    </p>

                                    <div className="space-y-3 pt-4 border-t border-border/50">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Status</span>
                                            <span className="text-green-500 font-medium flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                {module.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Mainnet</span>
                                            <span className="text-accent-blue font-medium">{module.mainnetStatus}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Last Update</span>
                                            <span className="text-foreground">{module.lastUpdate}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{module.metricLabel}</span>
                                            <span className="text-foreground font-mono">{module.transactionsScored}</span>
                                        </div>
                                        {module.secondaryMetricLabel && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">{module.secondaryMetricLabel}</span>
                                                <span className="text-foreground font-mono">{module.secondaryMetricValue}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/10">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Capabilities</h4>
                                        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                                            {module.technicalDetails}
                                        </p>
                                        <Link
                                            to={module.dashboardPath}
                                            className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white transition-colors bg-accent-blue rounded-md hover:bg-accent-blue/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-blue"
                                        >
                                            Launch {module.name}
                                        </Link>
                                    </div>
                                </div>
                            </GlassPanel>
                        ))}
                    </div>
                </div>

            </Section>
        </div>
    );
};

export default AIOracleNetwork;
