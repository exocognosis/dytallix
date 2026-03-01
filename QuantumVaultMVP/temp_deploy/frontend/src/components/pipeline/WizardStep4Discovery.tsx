'use client';

import { useState } from 'react';
import {
    Play,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

type AnchorReadiness = {
    checked: boolean;
    hasKemAnchor: boolean;
    missingSignatures: string[];
    error?: string;
};

type DiscoveryResult = {
    message?: string;
    totalFound?: number;
    manifestsGenerated?: string[];
    files?: string[];
};

type Props = {
    config: { kemAlgorithm: string; maxFiles: string; maxFileSizeBytes: string };
    normalizedExtensions: string[];
    anchorReadiness: AnchorReadiness;
    onRecheckAnchors: () => void;
    configStatus: 'idle' | 'saving' | 'scanning' | 'pqc' | 'success' | 'error';
    onRunDiscovery: () => void;
    discoveryResult: DiscoveryResult | null;
    discoverySummary: string;
    verificationChecked: boolean;
    onVerificationChange: (checked: boolean) => void;
};

export function WizardStep4Discovery({
    config,
    normalizedExtensions,
    anchorReadiness,
    onRecheckAnchors,
    configStatus,
    onRunDiscovery,
    discoveryResult,
    discoverySummary,
    verificationChecked,
    onVerificationChange,
}: Props) {
    const [showFiles, setShowFiles] = useState(false);

    const allFiles = [
        ...(discoveryResult?.manifestsGenerated ?? []),
        ...(discoveryResult?.files ?? []),
    ];
    const previewFiles = allFiles.slice(0, 50);

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-white">Step 4 · Asset Discovery and Final Verification</h2>
                <p className="text-sm text-white/50">Run discovery, validate size/count, then confirm run attributes.</p>
            </div>

            {/* Run summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-xs text-white/40">Configured File Types</div>
                    <div className="text-lg font-semibold text-white">{normalizedExtensions.length}</div>
                    <div className="text-xs text-cyan-300/70 truncate">{normalizedExtensions.join(', ') || '—'}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-xs text-white/40">Max Files</div>
                    <div className="text-lg font-semibold text-white">{Number(config.maxFiles).toLocaleString()}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-xs text-white/40">Max File Size</div>
                    <div className="text-lg font-semibold text-white">
                        {(Number(config.maxFileSizeBytes) / (1024 * 1024)).toFixed(0)} MB
                    </div>
                </div>
            </div>

            {/* Anchor readiness */}
            <div className="bg-black/20 border border-white/10 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-white/70">Anchor Readiness</div>
                    <button
                        type="button"
                        onClick={onRecheckAnchors}
                        className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        Recheck
                    </button>
                </div>
                {!anchorReadiness.checked ? (
                    <div className="text-sm text-cyan-300 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Checking active anchors…
                    </div>
                ) : (
                    <>
                        <div
                            className={`text-sm flex items-center gap-2 ${anchorReadiness.hasKemAnchor ? 'text-green-300' : 'text-red-300'
                                }`}
                        >
                            {anchorReadiness.hasKemAnchor ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <AlertCircle className="w-4 h-4" />
                            )}
                            {anchorReadiness.hasKemAnchor
                                ? `Active ${config.kemAlgorithm} anchor found`
                                : `No active ${config.kemAlgorithm} anchor found`}
                        </div>
                        <div
                            className={`text-sm flex items-center gap-2 ${anchorReadiness.missingSignatures.length === 0 ? 'text-green-300' : 'text-red-300'
                                }`}
                        >
                            {anchorReadiness.missingSignatures.length === 0 ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <AlertCircle className="w-4 h-4" />
                            )}
                            {anchorReadiness.missingSignatures.length === 0
                                ? 'Required signature anchors are active'
                                : `Missing signature anchors: ${anchorReadiness.missingSignatures.join(', ')}`}
                        </div>
                        {anchorReadiness.error && (
                            <div className="text-sm text-red-300">{anchorReadiness.error}</div>
                        )}
                    </>
                )}
            </div>

            {/* Run discovery button */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={onRunDiscovery}
                    disabled={configStatus !== 'idle'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50"
                >
                    <Play className="w-4 h-4" />
                    {configStatus === 'scanning' ? 'Scanning…' : 'Run Discovery'}
                </button>
                {configStatus === 'scanning' && (
                    <span className="text-cyan-300 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Running discovery...
                    </span>
                )}
            </div>

            {/* Discovery result */}
            {discoveryResult && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="text-sm text-green-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {discoverySummary || discoveryResult.message || 'Discovery complete'}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="text-white/70">
                            Total discovered assets:{' '}
                            <span className="text-white font-semibold">{discoveryResult.totalFound ?? '-'}</span>
                        </div>
                        <div className="text-white/70">
                            Manifest directories:{' '}
                            <span className="text-white font-semibold">
                                {discoveryResult.manifestsGenerated?.length ?? 0}
                            </span>
                        </div>
                    </div>

                    {/* Expandable file list */}
                    {allFiles.length > 0 && (
                        <div>
                            <button
                                type="button"
                                onClick={() => setShowFiles((v) => !v)}
                                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                                {showFiles ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {showFiles ? 'Hide' : 'Show'} discovered paths ({allFiles.length}
                                {allFiles.length > 50 ? ', showing first 50' : ''})
                            </button>
                            {showFiles && (
                                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-black/30 border border-white/10 p-3 space-y-0.5">
                                    {previewFiles.map((f, i) => (
                                        <div key={i} className="text-xs font-mono text-white/60 truncate">
                                            {f}
                                        </div>
                                    ))}
                                    {allFiles.length > 50 && (
                                        <div className="text-xs text-white/30 pt-1">
                                            … and {allFiles.length - 50} more
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Verification checkbox */}
                    <label className="flex items-start gap-2 text-sm text-white/80 pt-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={verificationChecked}
                            onChange={(e) => onVerificationChange(e.target.checked)}
                            className="accent-cyan-400 mt-0.5 shrink-0"
                        />
                        I verify origin/destination, file-type PQC levels, anchors, and discovery counts for this run.
                    </label>
                </div>
            )}
        </div>
    );
}
