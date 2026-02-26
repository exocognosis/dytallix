'use client';

import { useState } from 'react';
import {
    Building2,
    Stethoscope,
    Briefcase,
    Cpu,
    Landmark,
    Zap
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useCases } from '@/lib/mockData';

const INDUSTRY_ICONS: Record<string, React.ElementType> = {
    'Financial': Briefcase,
    'Healthcare': Stethoscope,
    'Government': Landmark,
    'Energy': Zap,
    'High-Tech': Cpu,
};

const INDUSTRY_COLORS: Record<string, string> = {
    'Financial': 'from-blue-500 to-cyan-500',
    'Healthcare': 'from-green-500 to-emerald-500',
    'Government': 'from-amber-500 to-orange-500',
    'Energy': 'from-yellow-500 to-amber-500',
    'High-Tech': 'from-purple-500 to-indigo-500',
};

export default function UseCasesPage() {
    const [activeTab, setActiveTab] = useState('financial');

    const activeCase = useCases.find(uc => uc.id === activeTab);
    const ActiveIcon = activeCase ? INDUSTRY_ICONS[activeCase.industry] : Building2;
    const activeColor = activeCase ? INDUSTRY_COLORS[activeCase.industry] : 'from-cyan-500 to-blue-500';

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-cyan-400" />
                    Use Cases
                </h1>
                <p className="text-white/60 mt-1">
                    Industry-specific QuantumVault implementations
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="tab-list overflow-x-auto">
                {useCases.map((useCase) => {
                    const Icon = INDUSTRY_ICONS[useCase.industry];
                    return (
                        <button
                            key={useCase.id}
                            onClick={() => setActiveTab(useCase.id)}
                            className={`tab-button flex items-center gap-2 whitespace-nowrap ${activeTab === useCase.id ? 'active' : ''
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {useCase.industry}
                        </button>
                    );
                })}
            </div>

            {/* Active Use Case Content */}
            {activeCase && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Hero Section */}
                    <GlassPanel className={`p-8 relative overflow-hidden`}>
                        {/* Background gradient */}
                        <div
                            className={`absolute inset-0 bg-gradient-to-br ${activeColor} opacity-10`}
                        />

                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6">
                            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${activeColor} flex items-center justify-center shrink-0`}>
                                <ActiveIcon className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-2">{activeCase.title}</h2>
                                <p className="text-white/70 max-w-2xl">{activeCase.description}</p>
                            </div>
                        </div>
                    </GlassPanel>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {activeCase.metrics.map((metric, index) => (
                            <GlassPanel key={index} className="p-6 text-center">
                                <div className={`text-3xl font-bold bg-gradient-to-r ${activeColor} bg-clip-text text-transparent mb-2`}>
                                    {metric.value}
                                </div>
                                <div className="text-sm font-medium text-white mb-1">{metric.label}</div>
                                <div className="text-xs text-white/50">{metric.description}</div>
                            </GlassPanel>
                        ))}
                    </div>

                    {/* Industry-Specific Benefits */}
                    <GlassPanel className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Key Benefits for {activeCase.industry}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeCase.industry === 'Financial' && (
                                <>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Regulatory Readiness</h4>
                                        <p className="text-sm text-white/60">SOX and PCI-DSS compliance with quantum-resistant audit trails</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Trading Security</h4>
                                        <p className="text-sm text-white/60">Proprietary algorithms protected from future quantum adversaries</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Transaction Integrity</h4>
                                        <p className="text-sm text-white/60">Immutable blockchain-anchored records for dispute resolution</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Customer Trust</h4>
                                        <p className="text-sm text-white/60">Future-proof protection of sensitive financial data</p>
                                    </div>
                                </>
                            )}
                            {activeCase.industry === 'Healthcare' && (
                                <>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">HIPAA Compliance</h4>
                                        <p className="text-sm text-white/60">PHI encryption exceeding regulatory minimums</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Long-term Protection</h4>
                                        <p className="text-sm text-white/60">50+ year retention with quantum-safe encryption</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Research Security</h4>
                                        <p className="text-sm text-white/60">Clinical trial data protected from future decryption</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Genomic Privacy</h4>
                                        <p className="text-sm text-white/60">DNA and genetic data secured for patient lifetime</p>
                                    </div>
                                </>
                            )}
                            {activeCase.industry === 'Government' && (
                                <>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Federal Mandate Ready</h4>
                                        <p className="text-sm text-white/60">NIST PQC standards compliance ahead of deadlines</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Classified Protection</h4>
                                        <p className="text-sm text-white/60">Intelligence documents secured against nation-state threats</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Diplomatic Security</h4>
                                        <p className="text-sm text-white/60">Secure communications for international relations</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">FedRAMP Authorized</h4>
                                        <p className="text-sm text-white/60">Cloud-ready deployment for federal agencies</p>
                                    </div>
                                </>
                            )}
                            {activeCase.industry === 'Energy' && (
                                <>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Critical Infrastructure</h4>
                                        <p className="text-sm text-white/60">SCADA and ICS systems protected from quantum threats</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Grid Security</h4>
                                        <p className="text-sm text-white/60">Power distribution commands secured end-to-end</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">OT Protection</h4>
                                        <p className="text-sm text-white/60">Long-lived operational technology secured for decades</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Supply Chain</h4>
                                        <p className="text-sm text-white/60">Vendor communications and contracts protected</p>
                                    </div>
                                </>
                            )}
                            {activeCase.industry === 'High-Tech' && (
                                <>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">IP Protection</h4>
                                        <p className="text-sm text-white/60">Source code and trade secrets secured from HNDL</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">R&D Security</h4>
                                        <p className="text-sm text-white/60">Research data protected during long development cycles</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Patent Protection</h4>
                                        <p className="text-sm text-white/60">Invention disclosures secured before filing</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Competitive Edge</h4>
                                        <p className="text-sm text-white/60">Algorithms and models protected from theft</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </GlassPanel>
                </div>
            )}
        </div>
    );
}
