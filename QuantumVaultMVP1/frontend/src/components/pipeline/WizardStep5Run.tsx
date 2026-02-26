'use client';

import Link from 'next/link';
import {
    Play,
    Loader2,
    BarChart3,
    Layers,
} from 'lucide-react';

const PIPELINE_STAGES = [
    'IDENTIFIED',
    'CATEGORIZED',
    'ANALYZED',
    'NIST_ASSIGNED',
    'WRAPPED_PQC',
    'ATTESTED',
    'TRANSFERRED',
];

type PipelineRun = {
    id: string;
    status: string;
    createdAt?: string;
    startedAt?: string;
    completedAt?: string;
    processed?: number;
    skipped?: number;
    failed?: number;
    totalFound?: number;
};

type PipelineAsset = {
    id: string;
    relativePath: string;
    status: string;
    pqcStatus?: string | null;
    pqcProtected?: boolean;
    nistLevel?: number | null;
    dataDomain?: string | null;
    stageTimestamps?: Record<string, string> | null;
    createdAt?: string;
};

type PipelineSummary = {
    success: boolean;
    message?: string;
    totalFound?: number;
    processed?: number;
    skipped?: number;
    failed?: number;
    runId?: string;
};

function getAssetProgress(asset: PipelineAsset): number {
    const stageTimestamps = asset.stageTimestamps || {};
    const completedByTimestamp = PIPELINE_STAGES.filter((stage) =>
        Boolean((stageTimestamps as Record<string, string>)[stage])
    ).length;

    if (completedByTimestamp > 0) {
        return Math.min(100, Math.round((completedByTimestamp / PIPELINE_STAGES.length) * 100));
    }

    const statusProgress: Record<string, number> = {
        IDENTIFIED: 15,
        CATEGORIZED: 30,
        ANALYZED: 45,
        NIST_ASSIGNED: 60,
        WRAPPED_PQC: 80,
        TRANSFERRED: 100,
        SKIPPED: 100,
        FAILED: 100,
    };

    return statusProgress[asset.status] ?? 0;
}

function formatDuration(startedAt?: string, completedAt?: string): string {
    if (!startedAt || !completedAt) return '-';
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return '-';
    const seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}m ${remainder}s`;
}

type Props = {
    configStatus: 'idle' | 'saving' | 'scanning' | 'pqc' | 'success' | 'error';
    configMessage: string;
    onRunPipeline: () => void;
    pipelineSummary: PipelineSummary | null;
    loading: boolean;
    runLoading: boolean;
    runs: PipelineRun[];
    selectedRunId: string | null;
    onSelectRun: (id: string) => void;
    selectedRun: PipelineRun | null;
    runProgress: number;
    assets: PipelineAsset[];
    selectedAssetId: string | null;
    onSelectAsset: (id: string) => void;
    selectedAsset: PipelineAsset | null;
    selectedAssetProgress: number;
};

export function WizardStep5Run({
    configStatus,
    configMessage,
    onRunPipeline,
    pipelineSummary,
    loading,
    runLoading,
    runs,
    selectedRunId,
    onSelectRun,
    selectedRun,
    runProgress,
    assets,
    selectedAssetId,
    onSelectAsset,
    selectedAsset,
    selectedAssetProgress,
}: Props) {
    const runDuration = formatDuration(selectedRun?.startedAt, selectedRun?.completedAt);

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-white">Step 5 · Run PQC Pipeline</h2>
                <p className="text-sm text-white/50">Execute run and monitor overall and per-asset progression.</p>
            </div>

            {/* Run controls */}
            <div className="flex flex-wrap gap-3 items-center">
                <button
                    onClick={onRunPipeline}
                    disabled={configStatus !== 'idle'}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                    <Play className="w-4 h-4" />
                    {configStatus === 'pqc' ? 'Running…' : 'Run PQC Pipeline'}
                </button>
                {configStatus === 'pqc' && (
                    <span className="text-cyan-300 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Running PQC pipeline...
                    </span>
                )}
                {configStatus === 'success' && (
                    <span className="text-green-300 text-sm">{configMessage}</span>
                )}
                {configStatus === 'error' && (
                    <span className="text-red-300 text-sm">{configMessage}</span>
                )}
            </div>

            {/* Pipeline result summary */}
            {pipelineSummary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Total', value: pipelineSummary.totalFound ?? '-' },
                        { label: 'Wrapped', value: pipelineSummary.processed ?? '-' },
                        { label: 'Skipped', value: pipelineSummary.skipped ?? '-' },
                        { label: 'Failed', value: pipelineSummary.failed ?? '-' },
                        { label: 'Success', value: pipelineSummary.success ? 'Yes' : 'No' },
                    ].map((item) => (
                        <div key={item.label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <div className="text-xs text-white/40">{item.label}</div>
                            <div className="text-lg font-semibold text-white">{item.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Run tracker */}
            {loading ? (
                <div className="p-6 rounded-lg border border-white/10 text-white/60 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading run tracker…
                </div>
            ) : runs.length === 0 ? (
                <div className="p-6 rounded-lg border border-white/10 text-white/60">
                    No pipeline runs recorded yet. Click Run PQC Pipeline above to start.
                </div>
            ) : (
                <>
                    {/* Run selector + stats */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                            <div className="flex-1">
                                <label className="text-xs text-white/40 uppercase tracking-wide">Select Run</label>
                                <select
                                    value={selectedRunId || ''}
                                    onChange={(e) => onSelectRun(e.target.value)}
                                    className="mt-2 w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white"
                                >
                                    {runs.map((run) => (
                                        <option key={run.id} value={run.id}>
                                            {run.id.slice(0, 8)} · {run.status}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:w-[480px]">
                                {[
                                    { label: 'Total', value: selectedRun?.totalFound ?? '-' },
                                    { label: 'Processed', value: selectedRun?.processed ?? '-' },
                                    { label: 'Failed', value: selectedRun?.failed ?? '-' },
                                    { label: 'Time', value: runDuration },
                                ].map((item) => (
                                    <div key={item.label} className="bg-black/20 border border-white/10 rounded-lg p-3">
                                        <div className="text-xs text-white/40">{item.label}</div>
                                        <div className="text-base font-semibold text-white">{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Overall progress bar */}
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-white/70 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-cyan-400" /> Overall Run Progress
                                </span>
                                <span className="text-cyan-300 font-semibold">{runProgress}%</span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-cyan-500 transition-all duration-500"
                                    style={{ width: `${runProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Per-asset list */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <Layers className="w-4 h-4 text-cyan-400" /> Per-Asset Progress Runner
                            </h3>
                            {runLoading && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
                        </div>

                        {assets.length === 0 ? (
                            <div className="text-white/50 text-sm">No assets recorded for this run yet.</div>
                        ) : (
                            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                                {assets.map((asset) => {
                                    const assetProgress = getAssetProgress(asset);
                                    return (
                                        <Link
                                            key={asset.id}
                                            href={`/dashboard/assets/${asset.id}`}
                                            className="block border border-white/10 rounded-lg p-3 hover:border-cyan-400/60 transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm text-white truncate">{asset.relativePath}</div>
                                                    <div className="text-xs text-white/50">
                                                        {asset.status} •{' '}
                                                        {asset.pqcStatus || (asset.pqcProtected ? 'PQC_PROTECTED' : 'UNPROTECTED')}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-white/60 w-12 text-right">{assetProgress}%</div>
                                            </div>
                                            <div className="mt-2 w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${asset.status === 'FAILED' ? 'bg-red-500' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${assetProgress}%` }}
                                                />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Selected asset stage inspector */}
                    {selectedAsset && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                                <div className="flex-1">
                                    <label className="text-xs text-white/40 uppercase tracking-wide">Inspect Asset Stages</label>
                                    <select
                                        value={selectedAssetId || ''}
                                        onChange={(e) => onSelectAsset(e.target.value)}
                                        className="mt-2 w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    >
                                        {assets.map((asset) => (
                                            <option key={asset.id} value={asset.id}>
                                                {asset.relativePath} · {asset.status}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="lg:w-72">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <span className="text-white/70">Asset Progress</span>
                                        <span className="text-green-300 font-semibold">{selectedAssetProgress}%</span>
                                    </div>
                                    <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 transition-all duration-500"
                                            style={{ width: `${selectedAssetProgress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 text-xs text-white/60 grid grid-cols-2 md:grid-cols-4 gap-2">
                                {PIPELINE_STAGES.map((stage) => {
                                    const done = Boolean(selectedAsset.stageTimestamps?.[stage]);
                                    return (
                                        <div
                                            key={stage}
                                            className={`px-2 py-1 rounded border ${done
                                                    ? 'border-green-400/40 bg-green-500/10 text-green-300'
                                                    : 'border-white/10 bg-white/5 text-white/40'
                                                }`}
                                        >
                                            {stage}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
