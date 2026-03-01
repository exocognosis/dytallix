'use client';

import { useState, useCallback, useRef } from 'react';
import {
    Upload, Shield, FileText, Send, CheckCircle, ChevronRight, ChevronLeft,
    File, FolderOpen, Database, HardDrive, Globe, Lock, Key, Hash,
    Download, Plus, Trash2, Server, Fingerprint, Tag, Zap, ShieldCheck, Archive,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { assetsAPI, adminAPI } from '@/lib/api';
import { useEffect } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
type WizardStep = 1 | 2 | 3 | 4 | 5;
type AssetType = 'file' | 'directory' | 'data-object' | 'database-record';
type ClassificationLevel = '' | 'Public' | 'Internal' | 'Confidential' | 'Restricted';
type DestinationType = 'quantumvault' | 'ipfs' | 'on-prem' | 'hybrid';

interface PQCAlgorithm {
    id: string; name: string; standard: string; keySize: string;
    useCase: string; icon: React.ReactNode; color: string;
    paramOptions: string[];
}

interface MetadataTag { key: string; value: string; }

interface IntakeState {
    assetType: AssetType;
    fileName: string; fileSize: number; fileMimeType: string;
    directoryPath: string;
    pqcAlgorithm: string; pqcParamLevel: string; hybridMode: boolean;
    assetName: string; classification: ClassificationLevel;
    owner: string; sensitivityTags: string[];
    description: string; retentionPolicy: string;
    complianceFrameworks: string[]; customMetadata: MetadataTag[];
    destination: DestinationType; region: string;
    accessRoles: string[]; webhookUrl: string;
    blockchainAnchor: boolean; chainTarget: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const STEP_LABELS = ['Asset Selection', 'PQC Encryption', 'Metadata', 'Destination', 'Review'];

const PQC_ALGORITHMS: PQCAlgorithm[] = [
    {
        id: 'ml-kem', name: 'ML-KEM', standard: 'FIPS 203', keySize: '768 / 1024 / 1536 bits',
        useCase: 'Key encapsulation — secures data-at-rest encryption keys',
        icon: <Key className="h-6 w-6" />, color: 'from-blue-500 to-cyan-500',
        paramOptions: ['ML-KEM-512', 'ML-KEM-768', 'ML-KEM-1024']
    },
    {
        id: 'ml-dsa', name: 'ML-DSA', standard: 'FIPS 204', keySize: '1312 / 1952 / 2592 bytes',
        useCase: 'Digital signatures — tamper-proof audit trail',
        icon: <Fingerprint className="h-6 w-6" />, color: 'from-purple-500 to-indigo-500',
        paramOptions: ['ML-DSA-44', 'ML-DSA-65', 'ML-DSA-87']
    },
    {
        id: 'slh-dsa', name: 'SLH-DSA', standard: 'FIPS 205', keySize: '32 / 48 / 64 bytes',
        useCase: 'Hash-based signatures — stateless, conservative security',
        icon: <Hash className="h-6 w-6" />, color: 'from-green-500 to-emerald-500',
        paramOptions: ['SLH-DSA-128s', 'SLH-DSA-128f', 'SLH-DSA-192s', 'SLH-DSA-256s']
    },
    {
        id: 'bike', name: 'BIKE', standard: 'Round 4 Candidate', keySize: '1541 / 3083 / 5122 bytes',
        useCase: 'Code-based KEM — lightweight alternative encapsulation',
        icon: <Zap className="h-6 w-6" />, color: 'from-amber-500 to-orange-500',
        paramOptions: ['BIKE-L1', 'BIKE-L3', 'BIKE-L5']
    },
    {
        id: 'hqc', name: 'HQC', standard: 'Round 4 Candidate', keySize: '2249 / 4522 / 7245 bytes',
        useCase: 'Code-based KEM — Hamming Quasi-Cyclic encapsulation',
        icon: <ShieldCheck className="h-6 w-6" />, color: 'from-rose-500 to-red-500',
        paramOptions: ['HQC-128', 'HQC-192', 'HQC-256']
    },
];

const SENSITIVITY_TAGS = ['PII', 'PHI', 'PCI', 'Financial', 'IP / Trade Secret', 'Legal / Contract', 'Classified', 'Export-Controlled'];
const COMPLIANCE_FRAMEWORKS = ['GDPR', 'HIPAA', 'PCI DSS', 'SOX', 'NIST 800-53', 'ISO 27001', 'SOC 2', 'FedRAMP', 'DORA', 'CCPA/CPRA'];
const REGIONS = ['US-East', 'US-West', 'EU-Frankfurt', 'EU-Dublin', 'UK-London', 'APAC-Singapore', 'APAC-Sydney'];
const ACCESS_ROLES = ['Admin', 'Security Officer', 'Compliance Auditor', 'Data Owner', 'Read-Only Viewer'];
const CHAINS = ['Dytallix Mainnet', 'Dytallix Testnet', 'Ethereum (Anchor)', 'Polygon (Anchor)'];
const RETENTION_POLICIES = ['30 Days', '90 Days', '1 Year', '3 Years', '7 Years', 'Indefinite'];

const DEFAULT_STATE: IntakeState = {
    assetType: 'file', fileName: '', fileSize: 0, fileMimeType: '',
    directoryPath: '',
    pqcAlgorithm: '', pqcParamLevel: '', hybridMode: false,
    assetName: '', classification: '', owner: '', sensitivityTags: [],
    description: '', retentionPolicy: '', complianceFrameworks: [], customMetadata: [],
    destination: 'quantumvault', region: '', accessRoles: [],
    webhookUrl: '', blockchainAnchor: false, chainTarget: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtBytes = (b: number) => {
    if (b === 0) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
};

const genAssetId = () => `QV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const getSecurityLevel = (param: string) => {
    if (/256|1024|87|L5/.test(param)) return { label: 'Maximum', width: '100%' };
    if (/192|768|65|L3/.test(param)) return { label: 'High', width: '66%' };
    return { label: 'Standard', width: '40%' };
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function AssetIntakePage() {
    const [step, setStep] = useState<WizardStep>(1);
    const [state, setState] = useState<IntakeState>(DEFAULT_STATE);
    const [dragOver, setDragOver] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [assetId, setAssetId] = useState(genAssetId);
    const fileRef = useRef<HTMLInputElement>(null);

    const [algos, setAlgos] = useState<any[]>([]);

    useEffect(() => {
        adminAPI.getAlgos().then(setAlgos).catch(() => console.warn('Failed to fetch algos'));
    }, []);

    const set = <K extends keyof IntakeState>(k: K, v: IntakeState[K]) => setState(p => ({ ...p, [k]: v }));
    const toggleArr = (k: 'sensitivityTags' | 'complianceFrameworks' | 'accessRoles', v: string) =>
        setState(p => { const c = p[k] as string[]; return { ...p, [k]: c.includes(v) ? c.filter(x => x !== v) : [...c, v] }; });

    const handleFile = useCallback((f: File | null) => {
        if (!f) return;
        setState(p => ({
            ...p,
            fileName: f.name,
            fileSize: f.size,
            fileMimeType: f.type || 'application/octet-stream',
            assetName: p.assetName || f.name.replace(/\.[^.]+$/, ''),
        }));
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0] ?? null); }, [handleFile]);

    const canProceed = (s: WizardStep) => {
        switch (s) {
            case 1: return state.assetType === 'file' ? !!state.fileName : state.assetType === 'directory' ? !!state.directoryPath : true;
            case 2: return !!state.pqcAlgorithm && !!state.pqcParamLevel;
            case 3: return !!state.assetName && !!state.classification && !!state.owner;
            case 4: return !!state.destination && !!state.region;
            default: return true;
        }
    };

    const next = () => { if (step < 5 && canProceed(step)) setStep((step + 1) as WizardStep); };
    const back = () => { if (step > 1) setStep((step - 1) as WizardStep); };

    const exportManifest = () => {
        const manifest = { assetId, generatedAt: new Date().toISOString(), ...state };
        const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `asset-intake-${assetId}.json`;
        document.body.appendChild(a); a.click();
        URL.revokeObjectURL(url); document.body.removeChild(a);
    };

    const submitIntake = async () => {
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const payload = {
                name: state.assetName,
                type: state.assetType === 'file' ? 'GENERIC_SECRET' : state.assetType === 'directory' ? 'FILE_STORAGE' : 'DATABASE_CREDENTIAL',
                exposure: state.classification === 'Public' ? 'PUBLIC' : state.classification === 'Restricted' ? 'RESTRICTED' : state.classification === 'Confidential' ? 'CONFIDENTIAL' : 'INTERNAL',
                sensitivity: state.sensitivityTags.length > 3 ? 'CRITICAL' : state.sensitivityTags.length > 1 ? 'HIGH' : 'MEDIUM',
                criticality: 'MEDIUM',
                metadata: {
                    owner: state.owner,
                    fileName: state.fileName,
                    fileSize: state.fileSize,
                    mimeType: state.fileMimeType,
                    directoryPath: state.directoryPath,
                    retentionPolicy: state.retentionPolicy,
                    tags: state.sensitivityTags,
                    compliance: state.complianceFrameworks,
                    custom: state.customMetadata,
                    destination: state.destination,
                    region: state.region,
                    accessRoles: state.accessRoles,
                    blockchainAnchor: state.blockchainAnchor,
                    chainTarget: state.chainTarget,
                },
                targetAlgorithm: state.pqcAlgorithm,
            };

            const response = await assetsAPI.intakeAsset(payload);
            setAssetId(response.id);
            setSubmitted(true);
        } catch (error: any) {
            console.error('Submission failed', error);
            setSubmitError(error.response?.data?.message || error.message || 'Failed to submit intake.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedAlgo = PQC_ALGORITHMS.find(a => a.id === state.pqcAlgorithm);
    const secLevel = getSecurityLevel(state.pqcParamLevel);

    // ── Success State ──────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="p-6 lg:p-8">
                <div className="max-w-2xl mx-auto">
                    <GlassPanel className="p-10 text-center space-y-6">
                        <div className="inline-flex items-center justify-center p-4 rounded-full bg-emerald-500/10">
                            <CheckCircle className="w-12 h-12 text-emerald-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white">Asset Intake Submitted</h2>
                        <p className="text-white/60">Your asset has been queued for PQC encryption and routing.</p>
                        <div className="space-y-2 text-left rounded-lg p-4 bg-white/5 border border-white/10">
                            <p className="text-sm"><span className="text-white/50">Asset ID:</span> <span className="font-mono text-white">{assetId}</span></p>
                            <p className="text-sm"><span className="text-white/50">Asset:</span> <span className="text-white">{state.assetName}</span></p>
                            <p className="text-sm"><span className="text-white/50">Algorithm:</span> <span className="text-white">{selectedAlgo?.name} ({state.pqcParamLevel})</span></p>
                            <p className="text-sm"><span className="text-white/50">Destination:</span> <span className="text-white capitalize">{state.destination}</span></p>
                        </div>
                        <div className="flex gap-3 justify-center pt-2">
                            <Button variant="outline" onClick={exportManifest}><Download className="h-4 w-4 mr-2" /> Export Manifest</Button>
                            <Button onClick={() => { setSubmitted(false); setState(DEFAULT_STATE); setStep(1); }}>New Intake</Button>
                        </div>
                    </GlassPanel>
                </div>
            </div>
        );
    }

    // ── Step Renderers ─────────────────────────────────────────────────────────
    const renderStep1 = () => (
        <GlassPanel className="p-6 space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-white">Asset Selection</h2>
                <p className="text-sm text-white/50 mt-1">Choose the type of asset and upload or specify its location.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([['file', 'File', <File key="f" className="h-5 w-5" />], ['directory', 'Directory', <FolderOpen key="d" className="h-5 w-5" />],
                ['data-object', 'Data Object', <Database key="do" className="h-5 w-5" />], ['database-record', 'DB Record', <HardDrive key="db" className="h-5 w-5" />]] as [AssetType, string, React.ReactNode][])
                    .map(([id, label, icon]) => (
                        <button key={id} onClick={() => set('assetType', id)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${state.assetType === id
                                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-500/5'
                                : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:bg-white/10'}`}>
                            {icon}<span className="text-sm font-medium">{label}</span>
                        </button>
                    ))}
            </div>

            {state.assetType === 'file' && (
                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
                    className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer ${dragOver ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/20 hover:border-white/30 hover:bg-white/5'}`}
                    onClick={() => fileRef.current?.click()}>
                    <input ref={fileRef} type="file" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
                    <Upload className={`h-10 w-10 mx-auto mb-3 transition-colors ${dragOver ? 'text-cyan-400' : 'text-white/40'}`} />
                    <p className="text-white font-medium">{state.fileName || 'Drop file here or click to browse'}</p>
                    {state.fileName && <p className="text-xs text-white/40 mt-1">{fmtBytes(state.fileSize)} · {state.fileMimeType}</p>}
                    {!state.fileName && <p className="text-xs text-white/40 mt-1">Any file type supported</p>}
                </div>
            )}
            {state.assetType === 'directory' && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/60">Directory Path</label>
                    <input value={state.directoryPath} onChange={e => set('directoryPath', e.target.value)} placeholder="/data/secure/documents"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all" />
                </div>
            )}
            {(state.assetType === 'data-object' || state.assetType === 'database-record') && (
                <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-center">
                    <Database className="h-8 w-8 mx-auto text-white/40 mb-2" />
                    <p className="text-sm text-white/50">Data object details will be captured in the metadata step.</p>
                </div>
            )}
        </GlassPanel>
    );

    const renderStep2 = () => (
        <GlassPanel className="p-6 space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-white">PQC Encryption Configuration</h2>
                <p className="text-sm text-white/50 mt-1">Select a post-quantum cryptographic algorithm and parameter set.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PQC_ALGORITHMS.map(algo => (
                    <button key={algo.id} onClick={() => { set('pqcAlgorithm', algo.id); set('pqcParamLevel', algo.paramOptions[0]); }}
                        className={`text-left p-5 rounded-xl border transition-all duration-300 ${state.pqcAlgorithm === algo.id
                            ? 'border-cyan-500/50 bg-cyan-500/5 shadow-lg shadow-cyan-500/5'
                            : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 hover:-translate-y-0.5'}`}>
                        <div className={`inline-flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br ${algo.color} text-white mb-3`}>{algo.icon}</div>
                        <h3 className="text-lg font-bold text-white">{algo.name}</h3>
                        <p className="text-xs font-mono text-white/40 mt-0.5">{algo.standard}</p>
                        <p className="text-sm text-white/60 mt-2 leading-relaxed">{algo.useCase}</p>
                        <p className="text-xs text-white/30 mt-2">Key: {algo.keySize}</p>
                    </button>
                ))}
            </div>

            {selectedAlgo && (
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-white/60">Parameter Level</label>
                        <div className="flex flex-wrap gap-2">
                            {selectedAlgo.paramOptions.map(p => (
                                <button key={p} onClick={() => set('pqcParamLevel', p)}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${state.pqcParamLevel === p
                                        ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:border-white/20 transition-all">
                        <input type="checkbox" checked={state.hybridMode} onChange={e => set('hybridMode', e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 text-cyan-500 focus:ring-cyan-500 bg-white/5" />
                        <div><span className="text-sm font-medium text-white">Hybrid Mode</span>
                            <p className="text-xs text-white/40">Combine PQC with classical AES-256 fallback for defense-in-depth</p></div>
                    </label>
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-white/50"><span>Security Level</span>
                            <span className="text-emerald-400 font-medium">{secLevel.label}</span></div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                                style={{ width: secLevel.width }} />
                        </div>
                    </div>
                </div>
            )}
        </GlassPanel>
    );

    const renderStep3 = () => {
        const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all';
        return (
            <GlassPanel className="p-6 space-y-6">
                <div>
                    <h2 className="text-xl font-semibold text-white">Metadata & Auditability</h2>
                    <p className="text-sm text-white/50 mt-1">Tag the asset for compliance, classification, and audit trails.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Asset Name *</label>
                        <input value={state.assetName} onChange={e => set('assetName', e.target.value)} placeholder="e.g. Q4 Financial Report" className={inputCls} /></div>
                    <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Owner / Custodian *</label>
                        <input value={state.owner} onChange={e => set('owner', e.target.value)} placeholder="e.g. Jane Doe, Security Team" className={inputCls} /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Classification Level *</label>
                        <select value={state.classification} onChange={e => set('classification', e.target.value as ClassificationLevel)} className={inputCls}>
                            <option value="">Select…</option>
                            {['Public', 'Internal', 'Confidential', 'Restricted'].map(v => <option key={v} value={v}>{v}</option>)}
                        </select></div>
                    <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Retention Policy</label>
                        <select value={state.retentionPolicy} onChange={e => set('retentionPolicy', e.target.value)} className={inputCls}>
                            <option value="">Select…</option>{RETENTION_POLICIES.map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                </div>

                <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Description</label>
                    <textarea value={state.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Optional notes for auditors…" className={inputCls} /></div>

                <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Sensitivity Tags</label>
                    <div className="flex flex-wrap gap-2">{SENSITIVITY_TAGS.map(t => (
                        <button key={t} onClick={() => toggleArr('sensitivityTags', t)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${state.sensitivityTags.includes(t)
                                ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'}`}>{t}</button>
                    ))}</div></div>

                <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Compliance Frameworks</label>
                    <div className="flex flex-wrap gap-2">{COMPLIANCE_FRAMEWORKS.map(f => (
                        <button key={f} onClick={() => toggleArr('complianceFrameworks', f)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${state.complianceFrameworks.includes(f)
                                ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20'}`}>{f}</button>
                    ))}</div></div>

                {/* Custom metadata */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between"><label className="text-sm font-medium text-white/60">Custom Metadata</label>
                        <button onClick={() => set('customMetadata', [...state.customMetadata, { key: '', value: '' }])}
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"><Plus className="h-3 w-3" /> Add Field</button></div>
                    {state.customMetadata.map((m, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <input value={m.key} placeholder="Key" onChange={e => { const c = [...state.customMetadata]; c[i] = { ...c[i], key: e.target.value }; set('customMetadata', c); }} className={inputCls + ' flex-1'} />
                            <input value={m.value} placeholder="Value" onChange={e => { const c = [...state.customMetadata]; c[i] = { ...c[i], value: e.target.value }; set('customMetadata', c); }} className={inputCls + ' flex-1'} />
                            <button onClick={() => set('customMetadata', state.customMetadata.filter((_, j) => j !== i))} className="p-2 text-white/40 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    ))}
                </div>

                {/* Auto-generated */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
                    <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">Auto-Generated</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div><span className="text-white/40">Asset ID</span><p className="font-mono text-white text-xs mt-0.5">{assetId}</p></div>
                        <div><span className="text-white/40">Timestamp</span><p className="font-mono text-white text-xs mt-0.5">{new Date().toISOString().slice(0, 19)}</p></div>
                        <div><span className="text-white/40">Status</span><p className="text-emerald-400 text-xs mt-0.5 font-medium">Ready for Intake</p></div>
                    </div>
                </div>
            </GlassPanel>
        );
    };

    const renderStep4 = () => (
        <GlassPanel className="p-6 space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-white">Destination & Routing</h2>
                <p className="text-sm text-white/50 mt-1">Choose where the encrypted asset will be stored and who can access it.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([['quantumvault', 'QuantumVault', <Shield key="qv" className="h-5 w-5" />], ['ipfs', 'IPFS', <Globe key="ip" className="h-5 w-5" />],
                ['on-prem', 'On-Prem', <Server key="op" className="h-5 w-5" />], ['hybrid', 'Hybrid', <Archive key="hy" className="h-5 w-5" />]] as [DestinationType, string, React.ReactNode][])
                    .map(([id, label, icon]) => (
                        <button key={id} onClick={() => set('destination', id)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 ${state.destination === id
                                ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-500/5'
                                : 'border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:bg-white/10'}`}>
                            {icon}<span className="text-sm font-medium">{label}</span>
                        </button>
                    ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Region / Zone *</label>
                    <select value={state.region} onChange={e => set('region', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all">
                        <option value="">Select region…</option>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Webhook URL (optional)</label>
                    <input value={state.webhookUrl} onChange={e => set('webhookUrl', e.target.value)} placeholder="https://hooks.example.com/intake"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all" /></div>
            </div>

            <div className="space-y-2"><label className="block text-sm font-medium text-white/60">Access Roles</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{ACCESS_ROLES.map(r => (
                    <label key={r} className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/5 cursor-pointer hover:border-white/20 transition-all">
                        <input type="checkbox" checked={state.accessRoles.includes(r)} onChange={() => toggleArr('accessRoles', r)}
                            className="w-4 h-4 rounded border-white/20 text-cyan-500 focus:ring-cyan-500 bg-white/5" />
                        <span className="text-sm text-white">{r}</span></label>
                ))}</div></div>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:border-white/20 transition-all">
                <input type="checkbox" checked={state.blockchainAnchor} onChange={e => set('blockchainAnchor', e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 text-cyan-500 focus:ring-cyan-500 bg-white/5" />
                <div><span className="text-sm font-medium text-white">Blockchain Anchoring</span>
                    <p className="text-xs text-white/40">Write an immutable proof-of-intake hash to a blockchain</p></div>
            </label>
            {state.blockchainAnchor && (
                <div className="space-y-2 pl-4 border-l-2 border-cyan-500/30 ml-2">
                    <label className="block text-sm font-medium text-white/60">Target Chain</label>
                    <select value={state.chainTarget} onChange={e => set('chainTarget', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all">
                        <option value="">Select chain…</option>{CHAINS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            )}
        </GlassPanel>
    );

    const renderStep5 = () => {
        const sections = [
            {
                title: 'Asset', icon: <File className="h-4 w-4" />, items: [
                    ['Type', state.assetType], ['Name', state.assetName],
                    ...(state.fileName ? [['File', `${state.fileName} (${fmtBytes(state.fileSize)})`]] : []),
                    ...(state.directoryPath ? [['Path', state.directoryPath]] : []),
                ]
            },
            {
                title: 'Encryption', icon: <Lock className="h-4 w-4" />, items: [
                    ['Algorithm', selectedAlgo?.name ?? ''], ['Parameter', state.pqcParamLevel],
                    ['Standard', selectedAlgo?.standard ?? ''], ['Hybrid Mode', state.hybridMode ? 'Enabled' : 'Disabled'],
                ]
            },
            {
                title: 'Metadata', icon: <Tag className="h-4 w-4" />, items: [
                    ['Classification', state.classification], ['Owner', state.owner],
                    ['Sensitivity', state.sensitivityTags.join(', ') || 'None'],
                    ['Compliance', state.complianceFrameworks.join(', ') || 'None'],
                    ['Retention', state.retentionPolicy || 'Not set'],
                ]
            },
            {
                title: 'Destination', icon: <Send className="h-4 w-4" />, items: [
                    ['Target', state.destination], ['Region', state.region],
                    ['Access Roles', state.accessRoles.join(', ') || 'None'],
                    ['Blockchain', state.blockchainAnchor ? (state.chainTarget || 'Enabled') : 'Disabled'],
                ]
            },
        ];

        return (
            <GlassPanel className="p-6 space-y-6">
                <div>
                    <h2 className="text-xl font-semibold text-white">Review & Submit</h2>
                    <p className="text-sm text-white/50 mt-1">Verify all details before submitting the asset for PQC encryption and routing.</p>
                </div>

                {sections.map(sec => (
                    <div key={sec.title} className="p-4 rounded-xl border border-white/10 bg-white/5">
                        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-white">{sec.icon} {sec.title}</div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
                            {(sec.items as string[][]).map(([k, v]) => (
                                <span key={k} className="contents">
                                    <span className="text-white/40">{k}</span>
                                    <span className="text-white font-medium capitalize">{v || '—'}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-sm">
                    <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    <span className="text-white">All required fields are complete. Ready for submission.</span>
                </div>

                {submitError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm text-center">
                        {submitError}
                    </div>
                )}
            </GlassPanel>
        );
    };

    const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

    // ── Main Render ────────────────────────────────────────────────────────────
    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                    <Upload className="w-8 h-8 text-cyan-400" />
                    Single Asset Intake
                </h1>
                <p className="text-white/60 mt-1">Secure a single asset with post-quantum encryption, metadata tagging, and auditable routing.</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center justify-between max-w-3xl">
                {STEP_LABELS.map((label, i) => {
                    const s = (i + 1) as WizardStep;
                    const active = step === s;
                    const done = step > s;
                    return (
                        <span key={label} className="contents">
                            {i > 0 && <div className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${done ? 'bg-cyan-500' : 'bg-white/10'}`} />}
                            <button onClick={() => { if (done || active) setStep(s); }} disabled={!done && !active}
                                className="flex flex-col items-center gap-1.5 group">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${active ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-110' : done ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/10 text-white/40'}`}>
                                    {done ? <CheckCircle className="h-4 w-4" /> : s}
                                </div>
                                <span className={`text-xs font-medium transition-colors hidden sm:block ${active ? 'text-cyan-400' : 'text-white/40'}`}>{label}</span>
                            </button>
                        </span>
                    );
                })}
            </div>

            {/* Step content */}
            {stepRenderers[step - 1]()}

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={back} disabled={step === 1}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={exportManifest}>
                        <Download className="h-4 w-4 mr-2" /> Export
                    </Button>
                    {step < 5
                        ? <Button onClick={next} disabled={!canProceed(step)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
                        : <Button onClick={submitIntake} disabled={isSubmitting}
                            className="bg-gradient-to-r from-cyan-500 to-emerald-500 text-white border-0 hover:opacity-90 disabled:opacity-50">
                            <Send className="h-4 w-4 mr-2" /> {isSubmitting ? 'Submitting...' : 'Submit Intake'}
                        </Button>}
                </div>
            </div>
        </div>
    );
}
