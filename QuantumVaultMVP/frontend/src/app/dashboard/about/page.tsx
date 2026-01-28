'use client';

import {
    Info,
    Shield,
    Cpu,
    Lock,
    Server,
    Zap,
    FileKey,
    Network,
    CheckCircle2
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';

export default function AboutPage() {
    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                    <Info className="w-8 h-8 text-cyan-400" />
                    About QuantumVault
                </h1>
                <p className="text-white/60 mt-1">
                    Client-resident cryptographic control plane for the post-quantum era
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* What it is */}
                <GlassPanel className="p-6 lg:col-span-2">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-cyan-400" />
                        What It Is
                    </h2>
                    <ul className="space-y-4">
                        <li className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                            <p className="text-white/80 leading-relaxed">
                                QuantumVault is a client-resident cryptographic control plane designed to eliminate quantum-era cryptographic failure across data, identity, and transport.
                            </p>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                            <p className="text-white/80 leading-relaxed">
                                It protects sensitive data against Harvest-Now-Decrypt-Later (HNDL) and future cryptographically relevant quantum computer (CRQC) attacks.
                            </p>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                            <p className="text-white/80 leading-relaxed">
                                It replaces compromised classical trust anchors with NIST-standardized post-quantum cryptography (PQC), without SaaS custody or external dependencies.
                            </p>
                        </li>
                    </ul>
                </GlassPanel>

                {/* How it works */}
                <GlassPanel className="p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Cpu className="w-6 h-6 text-purple-400" />
                        How It Works
                    </h2>
                    <ul className="space-y-4">
                        {[
                            "Deployed entirely inside the customer’s environment, below applications and above hardware.",
                            "Inserts PQC controls at TLS termination points, storage encryption boundaries, and identity/key management layers.",
                            "Establishes sessions using PQC key encapsulation, encrypts data symmetrically, and protects keys with PQC envelopes.",
                            "Enforces policy-driven key lifecycle management (rotation, revocation, isolation) across tenants, regions, and regulatory domains.",
                            "Operates with zero legacy cryptography inside the protected boundary—no ECC or RSA fallback paths."
                        ].map((item, i) => (
                            <li key={i} className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                                <p className="text-white/80 leading-relaxed text-sm">{item}</p>
                            </li>
                        ))}
                    </ul>
                </GlassPanel>

                {/* What it does */}
                <GlassPanel className="p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Zap className="w-6 h-6 text-amber-400" />
                        What It Does
                    </h2>
                    <ul className="space-y-4">
                        {[
                            "Prevents retroactive decryption of captured traffic and archives.",
                            "Preserves authentication, authorization, and code-signing integrity in a post-quantum threat model.",
                            "Cryptographically isolates tenants and workloads to contain breach blast radius.",
                            "Converts quantum risk from a future contingency into bounded, enforceable engineering controls.",
                            "Enables compliance durability for long-retention and regulated data without emergency migrations."
                        ].map((item, i) => (
                            <li key={i} className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                                <p className="text-white/80 leading-relaxed text-sm">{item}</p>
                            </li>
                        ))}
                    </ul>
                </GlassPanel>
            </div>

            {/* Technical Specifications */}
            <GlassPanel className="p-8">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Server className="w-6 h-6 text-emerald-400" />
                    Technical Specifications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-white/5 rounded-lg p-5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400">
                            <FileKey className="w-5 h-5" />
                            <h3 className="font-semibold">Key Establishment</h3>
                        </div>
                        <p className="text-white/70 text-sm">ML-KEM (NIST FIPS 203)</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="font-semibold">Signatures</h3>
                        </div>
                        <p className="text-white/70 text-sm">ML-DSA (NIST FIPS 204) for auth/integrity; SLH-DSA (NIST FIPS 205) for long-horizon/cold-storage.</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400">
                            <Network className="w-5 h-5" />
                            <h3 className="font-semibold">Transport</h3>
                        </div>
                        <p className="text-white/70 text-sm">PQC-hardened TLS and tunnel profiles resistant to HNDL.</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400">
                            <Lock className="w-5 h-5" />
                            <h3 className="font-semibold">Storage</h3>
                        </div>
                        <p className="text-white/70 text-sm">Block- and object-level encryption with PQC-protected key envelopes.</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400">
                            <Shield className="w-5 h-5" />
                            <h3 className="font-semibold">Security Model</h3>
                        </div>
                        <p className="text-white/70 text-sm">Zero-trust, cryptographic domain isolation, automated instant revocation.</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-5 border border-white/10 hover:border-emerald-500/30 transition-colors">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400">
                            <Server className="w-5 h-5" />
                            <h3 className="font-semibold">Deployment</h3>
                        </div>
                        <p className="text-white/70 text-sm">On-prem / client-side; integrates with existing IAM, HSM, and KMS systems.</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-5 border border-white/10 hover:border-emerald-500/30 transition-colors md:col-span-2 lg:col-span-3 text-center md:text-left">
                        <div className="flex items-center gap-2 mb-2 text-emerald-400 justify-center md:justify-start">
                            <FileKey className="w-5 h-5" />
                            <h3 className="font-semibold">Standards Alignment</h3>
                        </div>
                        <p className="text-white/70 text-sm">NIST PQC standards, SP 800-208 transition guidance, FIPS 140-3–validated module compatibility.</p>
                    </div>
                </div>
            </GlassPanel>
        </div>
    );
}
