import React, { useEffect, useMemo, useState } from 'react';
import { Section } from '../components/ui/Section';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Button } from '../components/ui/Button';
import {
    ClipboardList,
    Building2,
    Globe,
    Scale,
    Database,
    FileText,
    ShieldCheck,
    GraduationCap,
    Download,
    Trash2,
    Copy,
    Check,
    AlertTriangle,
    Info,
} from 'lucide-react';

type ComplexityBand = 'Low' | 'Medium' | 'High';
type DeploymentTrack = 'Standard' | 'Market' | 'Bespoke';

interface OnboardingAssessment {
    // Snapshot
    clientName: string;
    website: string;
    primaryContactName: string;
    primaryContactEmail: string;
    whatTheyDo: string;
    industry: string;
    orgSize: string;
    whereTheyOperate: string; // comma/newline separated

    // Regulatory & audit
    regulatoryFrameworks: string[];
    otherRegulatory: string;
    audits: string[];
    auditCadence: string;
    upcomingAuditDeadlines: string;
    auditNotes: string;

    // Data & files
    dataTypes: string[];
    storageSystems: string[];
    fileFormats: string[];
    fileStructureNotes: string;
    dataNotes: string;

    // Deployment & training
    deploymentModel: string;
    identityProvider: string;
    integrationNotes: string;
    trainingAudience: string;
    trainingNotes: string;
    targetGoLive: string;
    additionalNotes: string;
}

const STORAGE_KEY = 'qv-client-onboarding:v1';

const INDUSTRIES = [
    'Finance & Banking',
    'Healthcare & Pharma',
    'Government & Defense',
    'Energy & Utilities',
    'Telecommunications',
    'Technology',
    'Retail & E-commerce',
    'Legal',
    'Education',
    'Manufacturing',
    'Other',
];

const ORG_SIZES = [
    'Startup (< 50 employees)',
    'SME (50 - 500 employees)',
    'Enterprise (500 - 5000 employees)',
    'Large Enterprise (> 5000 employees)',
];

const DEPLOYMENT_MODELS = [
    'Client-managed Cloud',
    'Dytallix-managed Cloud',
    'On-prem',
    'Hybrid',
    'Air-gapped / Isolated',
];

const IDENTITY_PROVIDERS = [
    'Okta',
    'Azure AD / Entra ID',
    'Google Workspace',
    'Ping Identity',
    'AD/LDAP (legacy)',
    'None / Unknown',
    'Other',
];

const REGULATORY_FRAMEWORKS = [
    'GDPR (EU)',
    'GDPR (UK)',
    'CCPA/CPRA (California)',
    'HIPAA (US Healthcare)',
    'HITRUST',
    'PCI DSS (Payments)',
    'SOX (US Public Co)',
    'GLBA (US Finance)',
    'NYDFS 23 NYCRR 500',
    'SEC / FINRA',
    'DORA (EU Finance)',
    'ISO 27001',
    'SOC 2',
    'NIST 800-53 / FedRAMP',
    'CJIS',
    'ITAR/EAR (Export Controls)',
    'Data Residency / Sovereign Requirements',
];

const AUDIT_TYPES = [
    'SOC 2 Type I',
    'SOC 2 Type II',
    'ISO 27001 Certification',
    'PCI DSS Assessment',
    'HIPAA / HITRUST Assessment',
    'SOX ITGC Audit',
    'FedRAMP Assessment',
    'Regulator Exam (e.g., OCC/FDIC/FINRA)',
    'Internal Audit',
    'Penetration Test',
    'Red Team Exercise',
    'Vendor / Customer Security Questionnaires',
];

const DATA_TYPES = [
    'PII (Personally Identifiable Information)',
    'PHI (Protected Health Information)',
    'PCI (Cardholder Data)',
    'Financial Records',
    'Customer Data',
    'Employee Records',
    'Intellectual Property',
    'Legal / Contract Documents',
    'Source Code / Build Artifacts',
    'Government / Classified or Export-Controlled Data',
    'Logs / Telemetry',
];

const STORAGE_SYSTEMS = [
    'AWS S3',
    'Azure Blob Storage',
    'Google Cloud Storage',
    'SharePoint / OneDrive',
    'Google Drive',
    'Box / Dropbox',
    'On-prem NAS / File Shares (SMB/NFS)',
    'Databases (SQL/NoSQL)',
    'Data Lake / Warehouse',
    'Git Repositories',
    'Email / EML Archives',
];

const FILE_FORMATS = [
    'PDF',
    'DOCX / Office Docs',
    'XLSX / Spreadsheets',
    'PPTX / Slides',
    'CSV',
    'JSON',
    'XML',
    'Parquet',
    'Avro',
    'TXT / Markdown',
    'Images (PNG/JPEG)',
    'Archives (ZIP/TAR/GZ)',
    'Logs (text/ndjson)',
    'Other Binary (custom)',
];

const DEFAULT_ASSESSMENT: OnboardingAssessment = {
    clientName: '',
    website: '',
    primaryContactName: '',
    primaryContactEmail: '',
    whatTheyDo: '',
    industry: '',
    orgSize: '',
    whereTheyOperate: '',

    regulatoryFrameworks: [],
    otherRegulatory: '',
    audits: [],
    auditCadence: '',
    upcomingAuditDeadlines: '',
    auditNotes: '',

    dataTypes: [],
    storageSystems: [],
    fileFormats: [],
    fileStructureNotes: '',
    dataNotes: '',

    deploymentModel: '',
    identityProvider: '',
    integrationNotes: '',
    trainingAudience: '',
    trainingNotes: '',
    targetGoLive: '',
    additionalNotes: '',
};

function uniqueStrings(values: string[]) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of values) {
        const t = v.trim();
        if (!t) continue;
        if (seen.has(t.toLowerCase())) continue;
        seen.add(t.toLowerCase());
        out.push(t);
    }
    return out;
}

function parseList(text: string) {
    return uniqueStrings(
        text
            .split(/[,\n]/g)
            .map(s => s.trim())
            .filter(Boolean),
    );
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function downloadJson(filename: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function isHighSensitivity(dataTypes: string[]) {
    const high = [
        'PHI (Protected Health Information)',
        'PCI (Cardholder Data)',
        'Government / Classified or Export-Controlled Data',
    ];
    return dataTypes.some(t => high.includes(t));
}

function isMediumSensitivity(dataTypes: string[]) {
    const medium = [
        'PII (Personally Identifiable Information)',
        'Financial Records',
        'Intellectual Property',
        'Legal / Contract Documents',
    ];
    return dataTypes.some(t => medium.includes(t));
}

function getSensitivityBand(dataTypes: string[]): ComplexityBand {
    if (isHighSensitivity(dataTypes)) return 'High';
    if (isMediumSensitivity(dataTypes)) return 'Medium';
    return 'Low';
}

function computeComplexityScore(input: {
    regionsCount: number;
    frameworksCount: number;
    auditsCount: number;
    storageCount: number;
    deploymentModel: string;
    dataTypes: string[];
}) {
    let score = 10;

    // Footprint and compliance
    score += clamp(input.regionsCount * 5, 0, 25);
    score += clamp(input.frameworksCount * 4, 0, 24);
    score += clamp(input.auditsCount * 3, 0, 18);

    // Data + storage
    if (isHighSensitivity(input.dataTypes)) score += 20;
    else if (isMediumSensitivity(input.dataTypes)) score += 10;
    score += clamp(Math.max(0, input.storageCount - 2) * 4, 0, 16);

    // Deployment constraints
    const model = input.deploymentModel;
    if (model.includes('Air-gapped')) score += 25;
    else if (model.includes('On-prem')) score += 18;
    else if (model.includes('Hybrid')) score += 12;

    return clamp(score, 0, 100);
}

function getComplexityBand(score: number): ComplexityBand {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
}

function getRecommendedTrack(params: {
    complexityScore: number;
    regulatoryFrameworks: string[];
    deploymentModel: string;
}): DeploymentTrack {
    const frameworks = new Set(params.regulatoryFrameworks);
    const bespokeTriggers = [
        'NIST 800-53 / FedRAMP',
        'CJIS',
        'ITAR/EAR (Export Controls)',
        'Data Residency / Sovereign Requirements',
    ];
    if (params.deploymentModel.includes('Air-gapped')) return 'Bespoke';
    if (bespokeTriggers.some(f => frameworks.has(f))) return 'Bespoke';
    if (params.complexityScore >= 70) return 'Bespoke';
    if (params.complexityScore >= 40) return 'Market';
    return 'Standard';
}

function trackStyles(track: DeploymentTrack) {
    switch (track) {
        case 'Standard':
            return {
                badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                gradient: 'from-emerald-400 to-teal-500',
            };
        case 'Market':
            return {
                badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                gradient: 'from-blue-400 to-indigo-500',
            };
        case 'Bespoke':
            return {
                badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                gradient: 'from-purple-400 to-pink-500',
            };
    }
}

const QuantumVaultClientOnboarding: React.FC = () => {
    const [assessment, setAssessment] = useState<OnboardingAssessment>(DEFAULT_ASSESSMENT);
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState<string | null>(null);
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

    // Load draft
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed?.data) {
                setAssessment({ ...DEFAULT_ASSESSMENT, ...parsed.data });
                if (typeof parsed.savedAt === 'string') setLastSavedAt(parsed.savedAt);
            }
        } catch {
            // Ignore corrupt drafts
        }
    }, []);

    // Autosave draft
    useEffect(() => {
        try {
            const savedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, savedAt, data: assessment }));
            setLastSavedAt(savedAt);
        } catch {
            // Ignore quota/disabled storage
        }
    }, [assessment]);

    const regions = useMemo(() => parseList(assessment.whereTheyOperate), [assessment.whereTheyOperate]);

    const derived = useMemo(() => {
        const regionsCount = regions.length;
        const frameworksCount = assessment.regulatoryFrameworks.length + (assessment.otherRegulatory.trim() ? 1 : 0);
        const auditsCount = assessment.audits.length;
        const storageCount = assessment.storageSystems.length;

        const complexityScore = computeComplexityScore({
            regionsCount,
            frameworksCount,
            auditsCount,
            storageCount,
            deploymentModel: assessment.deploymentModel,
            dataTypes: assessment.dataTypes,
        });
        const complexityBand = getComplexityBand(complexityScore);
        const sensitivityBand = getSensitivityBand(assessment.dataTypes);
        const recommendedTrack = getRecommendedTrack({
            complexityScore,
            regulatoryFrameworks: assessment.regulatoryFrameworks,
            deploymentModel: assessment.deploymentModel,
        });

        // Required-ish fields for completeness
        const requiredChecks: { id: string; label: string; ok: boolean }[] = [
            {
                id: 'snapshot',
                label: 'Client snapshot',
                ok: Boolean(assessment.clientName.trim()) && Boolean(assessment.whatTheyDo.trim()) && Boolean(assessment.industry) && Boolean(assessment.orgSize),
            },
            { id: 'footprint', label: 'Operating footprint', ok: regionsCount > 0 },
            {
                id: 'regulatory',
                label: 'Regulatory scope',
                ok: assessment.regulatoryFrameworks.length > 0 || Boolean(assessment.otherRegulatory.trim()),
            },
            { id: 'audits', label: 'Audit obligations', ok: assessment.audits.length > 0 || Boolean(assessment.auditNotes.trim()) },
            { id: 'data', label: 'Data types', ok: assessment.dataTypes.length > 0 },
            { id: 'storage', label: 'Storage systems', ok: assessment.storageSystems.length > 0 },
            {
                id: 'files',
                label: 'File formats / structure',
                ok: assessment.fileFormats.length > 0 || Boolean(assessment.fileStructureNotes.trim()),
            },
            {
                id: 'deployment',
                label: 'Deployment constraints',
                ok: Boolean(assessment.deploymentModel) && Boolean(assessment.identityProvider),
            },
            {
                id: 'training',
                label: 'Training plan',
                ok: Boolean(assessment.trainingAudience.trim()) || Boolean(assessment.trainingNotes.trim()),
            },
        ];
        const completed = requiredChecks.filter(c => c.ok).length;
        const completeness = Math.round((completed / requiredChecks.length) * 100);

        const onboardingChecklist: { label: string; ok: boolean; hint?: string; icon: React.ReactNode }[] = [
            {
                label: 'Confirm scope and success criteria',
                ok: requiredChecks.find(c => c.id === 'snapshot')?.ok ?? false,
                hint: 'Client snapshot + what they do',
                icon: <Building2 className="h-4 w-4" />,
            },
            {
                label: 'Map operating regions and data residency',
                ok: requiredChecks.find(c => c.id === 'footprint')?.ok ?? false,
                hint: 'Countries/regions served',
                icon: <Globe className="h-4 w-4" />,
            },
            {
                label: 'Lock regulatory framework and audit scope',
                ok: (requiredChecks.find(c => c.id === 'regulatory')?.ok ?? false) && (requiredChecks.find(c => c.id === 'audits')?.ok ?? false),
                hint: 'Frameworks + audits',
                icon: <Scale className="h-4 w-4" />,
            },
            {
                label: 'Inventory sensitive data and storage systems',
                ok: (requiredChecks.find(c => c.id === 'data')?.ok ?? false) && (requiredChecks.find(c => c.id === 'storage')?.ok ?? false),
                hint: 'Data types + storage',
                icon: <Database className="h-4 w-4" />,
            },
            {
                label: 'Capture file formats and structure conventions',
                ok: requiredChecks.find(c => c.id === 'files')?.ok ?? false,
                hint: 'Formats + folder/naming notes',
                icon: <FileText className="h-4 w-4" />,
            },
            {
                label: 'Define deployment constraints and identity integration',
                ok: requiredChecks.find(c => c.id === 'deployment')?.ok ?? false,
                hint: 'Deployment model + IdP',
                icon: <ShieldCheck className="h-4 w-4" />,
            },
            {
                label: 'Plan training and change management',
                ok: requiredChecks.find(c => c.id === 'training')?.ok ?? false,
                hint: 'Audience + training notes',
                icon: <GraduationCap className="h-4 w-4" />,
            },
        ];

        return {
            regionsCount,
            frameworksCount,
            auditsCount,
            storageCount,
            complexityScore,
            complexityBand,
            sensitivityBand,
            recommendedTrack,
            completeness,
            requiredChecks,
            onboardingChecklist,
        };
    }, [assessment, regions]);

    const setField = <K extends keyof OnboardingAssessment>(key: K, value: OnboardingAssessment[K]) => {
        setAssessment(prev => ({ ...prev, [key]: value }));
    };

    const toggleMulti = (key: 'regulatoryFrameworks' | 'audits' | 'dataTypes' | 'storageSystems' | 'fileFormats', value: string) => {
        setAssessment(prev => {
            const current = prev[key];
            const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
            return { ...prev, [key]: updated } as OnboardingAssessment;
        });
    };

    const exportPacket = () => {
        const packet = {
            generatedAt: new Date().toISOString(),
            title: 'QuantumVault Client Onboarding',
            assessment: {
                ...assessment,
                whereTheyOperateParsed: regions,
            },
            derived: {
                regionsCount: derived.regionsCount,
                frameworksCount: derived.frameworksCount,
                auditsCount: derived.auditsCount,
                complexityScore: derived.complexityScore,
                complexityBand: derived.complexityBand,
                sensitivityBand: derived.sensitivityBand,
                recommendedTrack: derived.recommendedTrack,
                completeness: derived.completeness,
            },
        };
        downloadJson('quantumvault-client-onboarding.json', packet);
    };

    const buildSummaryText = () => {
        const lines: string[] = [];
        lines.push('QuantumVault Client Onboarding');
        lines.push('');
        lines.push(`Client: ${assessment.clientName || '(not set)'}`);
        if (assessment.website) lines.push(`Website: ${assessment.website}`);
        if (assessment.primaryContactName || assessment.primaryContactEmail) {
            lines.push(`Primary Contact: ${assessment.primaryContactName || '(name)'} ${assessment.primaryContactEmail ? `<${assessment.primaryContactEmail}>` : ''}`.trim());
        }
        lines.push(`Industry: ${assessment.industry || '(not set)'}`);
        lines.push(`Org Size: ${assessment.orgSize || '(not set)'}`);
        lines.push(`Where They Operate: ${regions.length ? regions.join('; ') : '(not set)'}`);
        lines.push(`Regulatory: ${assessment.regulatoryFrameworks.length ? assessment.regulatoryFrameworks.join('; ') : '(not set)'}${assessment.otherRegulatory ? `; Other: ${assessment.otherRegulatory}` : ''}`);
        lines.push(`Audits: ${assessment.audits.length ? assessment.audits.join('; ') : '(not set)'}`);
        if (assessment.upcomingAuditDeadlines) lines.push(`Upcoming Audit Deadlines: ${assessment.upcomingAuditDeadlines}`);
        lines.push(`Data Types: ${assessment.dataTypes.length ? assessment.dataTypes.join('; ') : '(not set)'}`);
        lines.push(`Storage: ${assessment.storageSystems.length ? assessment.storageSystems.join('; ') : '(not set)'}`);
        lines.push(`File Formats: ${assessment.fileFormats.length ? assessment.fileFormats.join('; ') : '(not set)'}`);
        lines.push(`Deployment Model: ${assessment.deploymentModel || '(not set)'}`);
        lines.push(`Identity Provider: ${assessment.identityProvider || '(not set)'}`);
        if (assessment.targetGoLive) lines.push(`Target Go-Live: ${assessment.targetGoLive}`);
        lines.push('');
        lines.push(`Completeness: ${derived.completeness}%`);
        lines.push(`Complexity: ${derived.complexityScore}/100 (${derived.complexityBand})`);
        lines.push(`Data Sensitivity: ${derived.sensitivityBand}`);
        lines.push(`Recommended Track: ${derived.recommendedTrack}`);
        return lines.join('\n');
    };

    const copySummary = async () => {
        setCopyError(null);
        setCopied(false);
        const text = buildSummaryText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            setCopyError('Copy failed. Your browser may block clipboard access.');
        }
    };

    const clearDraft = () => {
        setAssessment(DEFAULT_ASSESSMENT);
        setCopied(false);
        setCopyError(null);
        setLastSavedAt(null);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Ignore
        }
    };

    const track = derived.recommendedTrack;
    const tStyles = trackStyles(track);

    return (
        <div className="min-h-screen bg-background pt-24 pb-20">
            <Section className="relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-500/10 text-blue-400 mb-6">
                        <ClipboardList className="w-8 h-8" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                        QuantumVault{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-red to-accent-blue">
                            Client Onboarding
                        </span>
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        Organizational assessment to accelerate QuantumVault deployment, onboarding, and client staff training.
                    </p>

                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-input bg-background">
                            <Info className="h-4 w-4" />
                            Draft autosaves locally
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-input bg-background">
                            <ShieldCheck className="h-4 w-4" />
                            Export JSON onboarding packet
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Intake */}
                    <div className="lg:col-span-7 space-y-6">
                        <GlassPanel variant="card" className="p-6 space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Client Snapshot</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        What they do, who they are, and where they operate.
                                    </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-input bg-background">
                                        <Building2 className="h-3.5 w-3.5" />
                                        Snapshot
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Client / Organization Name</label>
                                    <input
                                        value={assessment.clientName}
                                        onChange={(e) => setField('clientName', e.target.value)}
                                        placeholder="Acme Corp"
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Website (optional)</label>
                                    <input
                                        value={assessment.website}
                                        onChange={(e) => setField('website', e.target.value)}
                                        placeholder="https://example.com"
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Primary Contact Name</label>
                                    <input
                                        value={assessment.primaryContactName}
                                        onChange={(e) => setField('primaryContactName', e.target.value)}
                                        placeholder="Name"
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Primary Contact Email</label>
                                    <input
                                        value={assessment.primaryContactEmail}
                                        onChange={(e) => setField('primaryContactEmail', e.target.value)}
                                        placeholder="name@company.com"
                                        type="email"
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">What They Do</label>
                                <textarea
                                    value={assessment.whatTheyDo}
                                    onChange={(e) => setField('whatTheyDo', e.target.value)}
                                    placeholder="Describe the organization, business model, and the teams/systems QuantumVault will touch."
                                    rows={4}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Industry</label>
                                    <select
                                        value={assessment.industry}
                                        onChange={(e) => setField('industry', e.target.value)}
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="">Select Industry...</option>
                                        {INDUSTRIES.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Organization Size</label>
                                    <select
                                        value={assessment.orgSize}
                                        onChange={(e) => setField('orgSize', e.target.value)}
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="">Select Size...</option>
                                        {ORG_SIZES.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Where They Operate</label>
                                <textarea
                                    value={assessment.whereTheyOperate}
                                    onChange={(e) => setField('whereTheyOperate', e.target.value)}
                                    placeholder="US (CA, NY)\nUK\nEU (DE, FR)"
                                    rows={3}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                                <p className="text-xs text-muted-foreground">Comma or newline separated. Parsed count: {derived.regionsCount}</p>
                            </div>
                        </GlassPanel>

                        <GlassPanel variant="card" className="p-6 space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Regulatory Framework & Audits</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Under what regulatory framework they operate, and what audits they face.
                                    </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-input bg-background">
                                        <Scale className="h-3.5 w-3.5" />
                                        Compliance
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Regulatory Frameworks (select all that apply)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {REGULATORY_FRAMEWORKS.map(v => (
                                        <label key={v} className="flex items-start space-x-3 p-3 rounded-lg border border-input bg-background">
                                            <input
                                                type="checkbox"
                                                checked={assessment.regulatoryFrameworks.includes(v)}
                                                onChange={() => toggleMulti('regulatoryFrameworks', v)}
                                                className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary bg-background"
                                            />
                                            <span className="text-sm text-foreground">{v}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Other Regulatory Notes (optional)</label>
                                <input
                                    value={assessment.otherRegulatory}
                                    onChange={(e) => setField('otherRegulatory', e.target.value)}
                                    placeholder="e.g., country-specific banking regs, defense baselines, contractual obligations"
                                    className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Audit Types (select all that apply)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {AUDIT_TYPES.map(v => (
                                        <label key={v} className="flex items-start space-x-3 p-3 rounded-lg border border-input bg-background">
                                            <input
                                                type="checkbox"
                                                checked={assessment.audits.includes(v)}
                                                onChange={() => toggleMulti('audits', v)}
                                                className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary bg-background"
                                            />
                                            <span className="text-sm text-foreground">{v}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Audit Cadence</label>
                                    <select
                                        value={assessment.auditCadence}
                                        onChange={(e) => setField('auditCadence', e.target.value)}
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="">Select Cadence...</option>
                                        <option value="Quarterly">Quarterly</option>
                                        <option value="Semi-Annual">Semi-Annual</option>
                                        <option value="Annual">Annual</option>
                                        <option value="Ad-hoc / Customer-driven">Ad-hoc / Customer-driven</option>
                                        <option value="Unknown">Unknown</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Upcoming Audit Deadlines (optional)</label>
                                    <input
                                        value={assessment.upcomingAuditDeadlines}
                                        onChange={(e) => setField('upcomingAuditDeadlines', e.target.value)}
                                        placeholder="e.g., SOC 2 window starts 2026-04"
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Audit Notes (optional)</label>
                                <textarea
                                    value={assessment.auditNotes}
                                    onChange={(e) => setField('auditNotes', e.target.value)}
                                    placeholder="Evidence requirements, log retention expectations, control owners, auditors, etc."
                                    rows={3}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </GlassPanel>

                        <GlassPanel variant="card" className="p-6 space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Data, File Structures, and Formats</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        What data they handle, how it is stored, and what file structures / formats are in scope.
                                    </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-input bg-background">
                                        <Database className="h-3.5 w-3.5" />
                                        Data
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Data Types (select all that apply)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {DATA_TYPES.map(v => (
                                        <label key={v} className="flex items-start space-x-3 p-3 rounded-lg border border-input bg-background">
                                            <input
                                                type="checkbox"
                                                checked={assessment.dataTypes.includes(v)}
                                                onChange={() => toggleMulti('dataTypes', v)}
                                                className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary bg-background"
                                            />
                                            <span className="text-sm text-foreground">{v}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Storage Systems (select all that apply)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {STORAGE_SYSTEMS.map(v => (
                                        <label key={v} className="flex items-start space-x-3 p-3 rounded-lg border border-input bg-background">
                                            <input
                                                type="checkbox"
                                                checked={assessment.storageSystems.includes(v)}
                                                onChange={() => toggleMulti('storageSystems', v)}
                                                className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary bg-background"
                                            />
                                            <span className="text-sm text-foreground">{v}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">File Formats (select all that apply)</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {FILE_FORMATS.map(v => (
                                        <label key={v} className="flex items-start space-x-3 p-3 rounded-lg border border-input bg-background">
                                            <input
                                                type="checkbox"
                                                checked={assessment.fileFormats.includes(v)}
                                                onChange={() => toggleMulti('fileFormats', v)}
                                                className="mt-1 w-4 h-4 rounded border-input text-primary focus:ring-primary bg-background"
                                            />
                                            <span className="text-sm text-foreground">{v}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">File Structure / Naming Notes (optional)</label>
                                <textarea
                                    value={assessment.fileStructureNotes}
                                    onChange={(e) => setField('fileStructureNotes', e.target.value)}
                                    placeholder="Folder layout, naming conventions, access control patterns, retention folders, departmental shares, etc."
                                    rows={3}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Additional Data Notes (optional)</label>
                                <textarea
                                    value={assessment.dataNotes}
                                    onChange={(e) => setField('dataNotes', e.target.value)}
                                    placeholder="Classification model, retention, data residency constraints, encryption expectations, etc."
                                    rows={3}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </GlassPanel>

                        <GlassPanel variant="card" className="p-6 space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Deployment & Training</h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Constraints that influence a rapid, structured deployment and onboarding/training.
                                    </p>
                                </div>
                                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-input bg-background">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Delivery
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Deployment Model</label>
                                    <select
                                        value={assessment.deploymentModel}
                                        onChange={(e) => setField('deploymentModel', e.target.value)}
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="">Select Model...</option>
                                        {DEPLOYMENT_MODELS.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Identity Provider (SSO)</label>
                                    <select
                                        value={assessment.identityProvider}
                                        onChange={(e) => setField('identityProvider', e.target.value)}
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="">Select IdP...</option>
                                        {IDENTITY_PROVIDERS.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Integration Notes (optional)</label>
                                <textarea
                                    value={assessment.integrationNotes}
                                    onChange={(e) => setField('integrationNotes', e.target.value)}
                                    placeholder="SIEM, ticketing, CMDB, secrets manager, HSM, key ceremonies, API gateways, etc."
                                    rows={3}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Training Audience (optional)</label>
                                    <input
                                        value={assessment.trainingAudience}
                                        onChange={(e) => setField('trainingAudience', e.target.value)}
                                        placeholder="e.g., 10 admins, 50 end users"
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-muted-foreground">Target Go-Live (optional)</label>
                                    <input
                                        value={assessment.targetGoLive}
                                        onChange={(e) => setField('targetGoLive', e.target.value)}
                                        placeholder="YYYY-MM-DD or month"
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Training Notes (optional)</label>
                                <textarea
                                    value={assessment.trainingNotes}
                                    onChange={(e) => setField('trainingNotes', e.target.value)}
                                    placeholder="Training format, required roles, operational runbooks, support model, etc."
                                    rows={3}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-muted-foreground">Additional Notes / Risks (optional)</label>
                                <textarea
                                    value={assessment.additionalNotes}
                                    onChange={(e) => setField('additionalNotes', e.target.value)}
                                    placeholder="Known constraints, blockers, stakeholders, timelines, procurement, etc."
                                    rows={3}
                                    className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                />
                            </div>
                        </GlassPanel>

                        <GlassPanel variant="card" className="p-6 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Export & Actions</h3>
                                    <p className="text-sm text-muted-foreground">Generate a structured onboarding packet for Dytallix deployment and training.</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-input bg-background">
                                        {lastSavedAt ? (
                                            <>
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                Saved
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                Not saved
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button onClick={exportPacket} className="gap-2">
                                    <Download className="h-4 w-4" />
                                    Download JSON
                                </Button>
                                <Button variant="outline" onClick={copySummary} className="gap-2">
                                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                    {copied ? 'Copied' : 'Copy Summary'}
                                </Button>
                                <Button variant="destructive" onClick={clearDraft} className="gap-2">
                                    <Trash2 className="h-4 w-4" />
                                    Clear Draft
                                </Button>
                            </div>

                            {copyError && (
                                <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm">
                                    {copyError}
                                </div>
                            )}
                        </GlassPanel>
                    </div>

                    {/* Right: Summary */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="lg:sticky lg:top-24 space-y-6">
                            <GlassPanel variant="card" className="p-6 space-y-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-foreground">Deployment Readiness</h2>
                                        <p className="text-sm text-muted-foreground mt-1">Live summary based on the intake form.</p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full border text-xs font-medium ${tStyles.badge}`}>
                                        {track}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Completeness</span>
                                        <span className="font-medium">{derived.completeness}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${derived.completeness >= 70 ? 'from-emerald-400 to-teal-500' : derived.completeness >= 40 ? 'from-amber-400 to-orange-500' : 'from-red-400 to-pink-500'}`}
                                            style={{ width: `${derived.completeness}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl border border-input bg-background">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Globe className="h-4 w-4" />
                                            Regions
                                        </div>
                                        <div className="text-2xl font-bold mt-2">{derived.regionsCount}</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-input bg-background">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Scale className="h-4 w-4" />
                                            Frameworks
                                        </div>
                                        <div className="text-2xl font-bold mt-2">{derived.frameworksCount}</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-input bg-background">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <ShieldCheck className="h-4 w-4" />
                                            Audits
                                        </div>
                                        <div className="text-2xl font-bold mt-2">{derived.auditsCount}</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-input bg-background">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Database className="h-4 w-4" />
                                            Storage
                                        </div>
                                        <div className="text-2xl font-bold mt-2">{derived.storageCount}</div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Complexity</span>
                                        <span className="font-medium">{derived.complexityScore}/100 ({derived.complexityBand})</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${tStyles.gradient}`}
                                            style={{ width: `${derived.complexityScore}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Data Sensitivity</span>
                                        <span className={`font-medium ${derived.sensitivityBand === 'High' ? 'text-red-400' : derived.sensitivityBand === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}
                                        >
                                            {derived.sensitivityBand}
                                        </span>
                                    </div>
                                </div>
                            </GlassPanel>

                            <GlassPanel variant="card" className="p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Onboarding Checklist</h3>
                                    <span className="text-xs text-muted-foreground">Structured deployment readiness</span>
                                </div>
                                <div className="space-y-3">
                                    {derived.onboardingChecklist.map((item) => (
                                        <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg border border-input bg-background">
                                            <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center ${item.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {item.ok ? <Check className="h-4 w-4" /> : item.icon}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                                                    <span className={`text-xs ${item.ok ? 'text-emerald-400' : 'text-amber-400'}`}>{item.ok ? 'Ready' : 'Pending'}</span>
                                                </div>
                                                {item.hint && (
                                                    <p className="text-xs text-muted-foreground mt-1">{item.hint}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 rounded-xl border border-white/10 bg-gradient-to-r from-white/5 to-white/0">
                                    <div className="flex items-start gap-3">
                                        {derived.completeness >= 70 ? (
                                            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                <Check className="h-5 w-5" />
                                            </div>
                                        ) : (
                                            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium">Recommended Track: {track}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {track === 'Standard'
                                                    ? 'Single-environment rollout with baseline assurance.'
                                                    : track === 'Market'
                                                        ? 'Multi-region / multi-framework deployment with elevated evidence and controls.'
                                                        : 'High-assurance delivery for sovereign, export-controlled, or isolated environments.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </GlassPanel>

                            <GlassPanel variant="card" className="p-6 space-y-4">
                                <h3 className="text-lg font-semibold">Notes For Dytallix Staff</h3>
                                <div className="text-sm text-muted-foreground space-y-2">
                                    <p className="flex items-start gap-2">
                                        <Info className="h-4 w-4 mt-0.5" />
                                        Use this intake to drive the deployment runbook: topology, key policy, SSO, evidence, and training.
                                    </p>
                                    <p className="flex items-start gap-2">
                                        <Info className="h-4 w-4 mt-0.5" />
                                        Export the JSON packet and attach it to the client onboarding ticket.
                                    </p>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/10 pt-4">
                                    <span>Draft key: {STORAGE_KEY}</span>
                                    <span>{lastSavedAt ? `Last saved: ${new Date(lastSavedAt).toLocaleString()}` : 'Not saved yet'}</span>
                                </div>
                            </GlassPanel>
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
};

export default QuantumVaultClientOnboarding;
