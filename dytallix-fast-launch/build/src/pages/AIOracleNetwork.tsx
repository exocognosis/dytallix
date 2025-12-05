import React from 'react';
import { Section } from '../components/layout/section';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Brain, Shield, Activity, Lock, Code, Zap } from 'lucide-react';

const AIOracleNetwork: React.FC = () => {
    // Mock Data for Active Modules
    const activeModules = [
        {
            id: 'risk-v1',
            name: 'Quantum Risk Oracle',
            description: 'Real-time assessment of transaction quantum vulnerability using ML-DSA-87 signatures.',
            technicalDetails: 'Analyzes wallet age, interaction history, and cryptographic primitives. Signs risk scores with NIST Level 5 ML-DSA-87 for on-chain verification.',
            status: 'Active on TestNet',
            mainnetStatus: 'Planned for MainNet',
            lastUpdate: '2 mins ago',
            transactionsScored: '14,205',
            icon: Shield,
            color: 'text-accent-blue',
            bg: 'bg-accent-blue/10'
        },
        {
            id: 'code-auditor',
            name: 'Smart Contract Auditor',
            description: 'AI-driven static analysis for smart contract vulnerabilities before deployment.',
            technicalDetails: 'Combines static analysis with symbolic execution to identify reentrancy, overflow, and logic errors before code reaches the chain.',
            status: 'Active on TestNet',
            mainnetStatus: 'Planned for MainNet',
            lastUpdate: '1 hour ago',
            transactionsScored: '842',
            icon: Code,
            color: 'text-green-500',
            bg: 'bg-green-500/10'
        }
    ];

    // Mock Data for Planned Modules
    const plannedModules = [
        {
            id: 'defi-sentry-v2',
            name: 'DeFi Sentry v2',
            description: 'Advanced anomaly detection for liquidity pools and bridge transactions.',
            technicalDetails: 'Monitors liquidity flows and flash loan patterns in real-time using isolation forest algorithms to detect potential exploits.',
            status: 'In Development',
            eta: 'Q2 2026',
            icon: Activity,
            color: 'text-accent-red',
            bg: 'bg-accent-red/10'
        },
        {
            id: 'gov-bot-alpha',
            name: 'Governance Bot Alpha',
            description: 'Automated proposal analysis and impact simulation for DAO voting.',
            technicalDetails: 'Simulates proposal execution in a sandboxed EVM environment to predict economic impact and identify governance attacks.',
            status: 'Testing',
            eta: 'Q3 2026',
            icon: Brain,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        }
    ];

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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeModules.map((module) => (
                            <GlassPanel key={module.id} className="p-6 relative overflow-hidden group flex flex-col h-full" hoverEffect={true}>
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
                                            <span className="text-muted-foreground">Tx Scored</span>
                                            <span className="text-foreground font-mono">{module.transactionsScored}</span>
                                        </div>
                                    </div>

                                    <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/10">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">How it works</h4>
                                        <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                                            {module.technicalDetails}
                                        </p>
                                        {module.id === 'code-auditor' && (
                                            <a
                                                href="/smart-contract-auditor"
                                                className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white transition-colors bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                            >
                                                Launch Auditor
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </GlassPanel>
                        ))}
                    </div>
                </div>

                {/* Planned Modules Section */}
                <div>
                    <div className="flex items-center gap-3 mb-8">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-2xl font-bold text-muted-foreground">Planned Modules</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plannedModules.map((module) => (
                            <GlassPanel key={module.id} className="p-6 opacity-75 hover:opacity-100 transition-opacity flex flex-col h-full" hoverEffect={true}>
                                <div className={`h-12 w-12 rounded-xl ${module.bg} flex items-center justify-center ${module.color} mb-4`}>
                                    <module.icon className="h-6 w-6" />
                                </div>

                                <h3 className="text-xl font-bold mb-2">{module.name}</h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    {module.description}
                                </p>

                                <div className="pt-4 border-t border-border/50 flex-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <span className="text-accent-blue font-medium">{module.status}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-2">
                                        <span className="text-muted-foreground">Est. Arrival</span>
                                        <span className="text-foreground">{module.eta}</span>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/10">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">How it works</h4>
                                    <p className="text-sm text-foreground/80 leading-relaxed">
                                        {module.technicalDetails}
                                    </p>
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
