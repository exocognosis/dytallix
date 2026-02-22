import { GlassPanel } from '@dytallixpay/ui';
import { Shield, Zap, Lock, Network, Cpu, Globe2, Activity } from 'lucide-react';

export default function About() {
    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium">
                    <Shield className="w-4 h-4" />
                    PQC Compliant Financial Infrastructure
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                    Dytallix Pay: The First Quantum-Secure Payment Processor
                </h1>
                <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
                    Built on top of the native Dytallix blockchain, Dytallix Pay represents a paradigm shift in global transaction settlement. By integrating post-quantum cryptography (PQC) natively into our onramp, offramp, and ledger layers, we ensure your financial data is mathematically immune to both classical and future cryptologically relevant quantum computer (CRQC) attacks.
                </p>
            </div>

            {/* Core Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                {/* 1. Cryptography */}
                <GlassPanel className="p-6 space-y-4 hover:-translate-y-1 transition-transform duration-300">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-800/20 border border-purple-500/30 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold">Lattice-Based PQC</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Every DRT transaction and fiat settlement utilizes advanced lattice-based cryptographic algorithms (NIST-standardized ML-KEM/ML-DSA), protecting funds from Shor's algorithm and "Store Now, Decrypt Later" threats.
                    </p>
                </GlassPanel>

                {/* 2. Speed */}
                <GlassPanel className="p-6 space-y-4 hover:-translate-y-1 transition-transform duration-300">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-800/20 border border-emerald-500/30 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold">Sub-Second Finality</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Say goodbye to T+2 settlement. Dytallix Pay leverages a high-throughput, deterministic consensus mechanism achieving instantaneous, mathematically verifiable finality for both intra-network transfers and external anchoring.
                    </p>
                </GlassPanel>

                {/* 3. Integration */}
                <GlassPanel className="p-6 space-y-4 hover:-translate-y-1 transition-transform duration-300">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-800/20 border border-blue-500/30 flex items-center justify-center">
                        <Network className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold">QuantumVault Native</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Direct API integration with the QuantumVault platform allowing legacy digital assets and enterprise ledgers to seamlessly migrate and settle value on the post-quantum perimeter.
                    </p>
                </GlassPanel>
            </div>

            {/* Deep Dive Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <GlassPanel className="p-8 space-y-6 relative overflow-hidden">
                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2" />

                    <Cpu className="w-8 h-8 text-indigo-400" />
                    <h2 className="text-2xl font-bold">Micro-Denomination Architecture</h2>
                    <ul className="space-y-4">
                        <li className="flex gap-3">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30 mt-0.5">1</span>
                            <div>
                                <h4 className="font-medium">Programmable Liquidity</h4>
                                <p className="text-sm text-muted-foreground mt-1">Smart contract integration allows for atomic routing of micro-payments (uDRT) without exorbitant network fees.</p>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30 mt-0.5">2</span>
                            <div>
                                <h4 className="font-medium">Fiat-Pegged Stability</h4>
                                <p className="text-sm text-muted-foreground mt-1">Algorithmic reconciliation ensures seamless on-ramp and off-ramp velocity between USD liquidity pools and native DRT.</p>
                            </div>
                        </li>
                    </ul>
                </GlassPanel>

                <GlassPanel className="p-8 space-y-6 relative overflow-hidden">
                    {/* Background glow */}
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -z-10 -translate-x-1/2 translate-y-1/2" />

                    <Globe2 className="w-8 h-8 text-blue-400" />
                    <h2 className="text-2xl font-bold">Uncompromising Compliance</h2>
                    <ul className="space-y-4">
                        <li className="flex gap-3">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30 mt-0.5">3</span>
                            <div>
                                <h4 className="font-medium">Auditable Zero-Knowledge Enclaves</h4>
                                <p className="text-sm text-muted-foreground mt-1">Transactions are transparent enough for regulators but utilize ZK proofs to keep merchant trading strategies cryptographically opaque.</p>
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30 mt-0.5">4</span>
                            <div>
                                <h4 className="font-medium">Decentralized Identifier (DID) Bindings</h4>
                                <p className="text-sm text-muted-foreground mt-1">Identity verification is natively anchored to wallets, ensuring KYC/AML compliance at the protocol layer.</p>
                            </div>
                        </li>
                    </ul>
                </GlassPanel>
            </div>

            {/* Bottom Status Banner */}
            <GlassPanel className="p-6 bg-gradient-to-r from-background to-indigo-950/20 border-indigo-500/20 flex flex-col items-center justify-center text-center space-y-3 mt-8">
                <Activity className="w-6 h-6 text-indigo-400" />
                <h3 className="font-semibold text-lg">System Telemetry</h3>
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Quantum Threat Entropy:</span>
                        <span className="font-mono text-emerald-400">0.00%</span>
                    </div>
                    <div className="w-px h-4 bg-border hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Encryption Standard:</span>
                        <span className="font-mono text-blue-400">ML-KEM-768</span>
                    </div>
                    <div className="w-px h-4 bg-border hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Network Status:</span>
                        <span className="font-mono text-emerald-400">Live</span>
                    </div>
                </div>
            </GlassPanel>
        </div>
    );
}
