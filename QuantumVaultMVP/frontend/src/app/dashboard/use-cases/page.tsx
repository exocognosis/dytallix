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
import { Tooltip } from '@/components/ui/Tooltip';
export interface UseCaseMetric {
    label: string;
    value: string | number;
    description: string;
}

export interface UseCase {
    id: string;
    industry: string;
    title: string;
    description: string;
    metrics: UseCaseMetric[];
}

export const useCases: UseCase[] = [
    {
        id: 'financial',
        industry: 'Financial',
        title: 'Financial Services',
        description: 'Protect transaction records, trading algorithms, and customer data with quantum-resistant encryption that exceeds regulatory requirements.',
        metrics: [
            { label: 'Long-Retention Records', value: '7+ years', description: 'Settlement and audit data remains sensitive beyond the Y2Q window' },
            { label: 'Primary Compliance Scope', value: 'PCI DSS', description: 'Payment rails and customer-record workflows need crypto-agile strong-cryptography controls and documented key governance' },
            { label: 'Y2Q Migration Target', value: '2028', description: 'Front-loaded cutover for customer and treasury cryptographic paths' },
        ],
    },
    {
        id: 'healthcare',
        industry: 'Healthcare',
        title: 'Healthcare & Life Sciences',
        description: 'HIPAA-compliant protection for PHI, genomic data, and clinical trial information with long-term data security.',
        metrics: [
            { label: 'PHI Retention Horizon', value: '20+ years', description: 'Clinical archives outlive classical cryptographic safety timelines' },
            { label: 'Clinical Compliance Scope', value: 'HIPAA/FDA', description: 'PQC planning should cover ePHI, connected medical devices, and long-lived research data across care and device lifecycles' },
            { label: 'Y2Q Migration Target', value: '2027', description: 'Care delivery and research systems scheduled for pre-CRQC transition' },
        ],
    },
    {
        id: 'government',
        industry: 'Government',
        title: 'Government & Defense',
        description: 'Classified document protection and secure communications that meet federal PQC mandates ahead of deadlines.',
        metrics: [
            { label: 'Classified Shelf Life', value: '15+ years', description: 'Mission data must survive beyond projected Y2Q and CRQC milestones' },
            { label: 'Federal PQC Baseline', value: 'FIPS 203-205', description: 'Encryption and signature modernization can now align to approved NIST PQC standards for federal environments' },
            { label: 'Y2Q Migration Target', value: '2027', description: 'Federal crypto-agility timeline aligned to early adversary capability risk' },
        ],
    },
    {
        id: 'energy',
        industry: 'Energy',
        title: 'Energy & Utilities',
        description: 'Critical infrastructure protection for SCADA systems, grid operations, and long-lived operational technology.',
        metrics: [
            { label: 'OT Asset Lifetime', value: '15–30 years', description: 'Control systems remain deployed far past classical crypto viability' },
            { label: 'Utility Compliance Scope', value: 'NERC CIP', description: 'Remote access, telemetry, and vendor connectivity need crypto-agile planning across BES and OT trust boundaries' },
            { label: 'Y2Q Migration Target', value: '2028', description: 'Sequenced cutover of high-impact substation and dispatch domains' },
        ],
    },
    {
        id: 'high-tech',
        industry: 'High-Tech',
        title: 'Technology & IP',
        description: 'Intellectual property protection for source code, trade secrets, and R&D data against future quantum threats.',
        metrics: [
            { label: 'IP Secrecy Horizon', value: '10+ years', description: 'Roadmaps and design artifacts retain value throughout the Y2Q window' },
            { label: 'Software Integrity Scope', value: 'SSDF', description: 'Source, build, signing, and release workflows need PQC-ready software integrity and artifact verification planning' },
            { label: 'Y2Q Migration Target', value: '2028', description: 'Product and CI/CD cryptography shifted before quantum decryption risk matures' },
        ],
    },
];

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

const ACRONYM_MAP: Record<string, string> = {
    HDNL: 'HNDL',
    HNDL: 'HNDL',
    CRQ: 'CRQC',
    CRQC: 'CRQC',
    PQC: 'PQC',
    Y2Q: 'Y2Q',
};

function renderNarrativeText(text: string) {
    const parts = text.split(/(HDNL|HNDL|CRQ|CRQC|PQC|Y2Q)/gi);
    return parts.map((part, index) => {
        const normalized = ACRONYM_MAP[part.toUpperCase()];
        if (!normalized) {
            return <span key={`${part}-${index}`}>{part}</span>;
        }
        return (
            <Tooltip key={`${part}-${index}`} term={normalized}>
                {part.toUpperCase()}
            </Tooltip>
        );
    });
}

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
            <div className="flex flex-row overflow-x-auto p-1.5 mb-6 gap-2 bg-black/20 rounded-xl border border-white/5 max-w-full w-fit custom-scrollbar">
                {useCases.map((useCase) => {
                    const Icon = INDUSTRY_ICONS[useCase.industry];
                    const isActive = activeTab === useCase.id;
                    return (
                        <button
                            key={useCase.id}
                            onClick={() => setActiveTab(useCase.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg whitespace-nowrap transition-all text-sm font-medium ${isActive
                                    ? 'bg-white/10 text-white shadow-sm border border-white/10'
                                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
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
                                <p className="text-white/70 max-w-2xl">{renderNarrativeText(activeCase.description)}</p>
                            </div>
                        </div>
                    </GlassPanel>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3 text-xs text-white/50 px-1">
                            {renderNarrativeText('Vertical indicators combine confidentiality horizon, sector compliance scope, and PQC migration posture for each industry profile.')}
                        </div>
                        {activeCase.metrics.map((metric, index) => (
                            <GlassPanel key={index} className="p-6 text-center">
                                <div className={`text-3xl font-bold bg-gradient-to-r ${activeColor} bg-clip-text text-transparent mb-2`}>
                                    {metric.value}
                                </div>
                                <div className="text-sm font-medium text-white mb-1">{renderNarrativeText(metric.label)}</div>
                                <div className="text-xs text-white/50">{renderNarrativeText(metric.description)}</div>
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
                                        <p className="text-sm text-white/60">{renderNarrativeText('SOX and PCI-DSS compliance with quantum-resistant audit trails')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Trading Security</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Proprietary algorithms protected from future quantum adversaries')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Transaction Integrity</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Immutable blockchain-anchored records for dispute resolution')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Customer Trust</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Future-proof protection of sensitive financial data')}</p>
                                    </div>
                                </>
                            )}
                            {activeCase.industry === 'Healthcare' && (
                                <>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">HIPAA Compliance</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('PHI encryption exceeding regulatory minimums')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Long-term Protection</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('50+ year retention with quantum-safe encryption')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Research Security</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Clinical trial data protected from future decryption')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Genomic Privacy</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('DNA and genetic data secured for patient lifetime')}</p>
                                    </div>
                                </>
                            )}
                            {activeCase.industry === 'Government' && (
                                <>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Federal Mandate Ready</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('NIST PQC standards compliance ahead of deadlines')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Classified Protection</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Intelligence documents secured against nation-state threats')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Diplomatic Security</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Secure communications for international relations')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">FedRAMP Authorized</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Cloud-ready deployment for federal agencies')}</p>
                                    </div>
                                </>
                            )}
                            {activeCase.industry === 'Energy' && (
                                <>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Critical Infrastructure</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('SCADA and ICS systems protected from quantum threats')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Grid Security</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Power distribution commands secured end-to-end')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">OT Protection</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Long-lived operational technology secured for decades')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Supply Chain</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Vendor communications and contracts protected')}</p>
                                    </div>
                                </>
                            )}
                            {activeCase.industry === 'High-Tech' && (
                                <>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">IP Protection</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Source code and trade secrets secured from HNDL')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">R&D Security</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Research data protected during long development cycles')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Patent Protection</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Invention disclosures secured before filing')}</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="font-medium text-white mb-2">Competitive Edge</h4>
                                        <p className="text-sm text-white/60">{renderNarrativeText('Algorithms and models protected from theft')}</p>
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
