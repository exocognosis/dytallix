'use client';

import { Calendar, FileType, Plus, Trash2 } from 'lucide-react';

type FileTypePolicy = {
    extension: string;
    level: 'baseline' | 'enhanced' | 'maximum';
};

const LEVEL_TO_KEM = {
    baseline: 'ML-KEM-512',
    enhanced: 'ML-KEM-768',
    maximum: 'ML-KEM-1024',
} as const;

type Config = {
    minDate: string;
    maxDate: string;
    maxFiles: string;
    maxFileSizeBytes: string;
    defaultPqcLevel: 'baseline' | 'enhanced' | 'maximum';
    kemAlgorithm: string;
    enableDilithium: boolean;
    enableSphincs: boolean;
};

type Props = {
    config: Config;
    onChange: (update: Partial<Config>) => void;
    fileTypePolicies: FileTypePolicy[];
    normalizedExtensions: string[];
    onAddPolicy: () => void;
    onUpdatePolicy: (index: number, updates: Partial<FileTypePolicy>) => void;
    onRemovePolicy: (index: number) => void;
};

export function WizardStep2FileTypes({
    config,
    onChange,
    fileTypePolicies,
    normalizedExtensions,
    onAddPolicy,
    onUpdatePolicy,
    onRemovePolicy,
}: Props) {
    const fileSizeMB = Number(config.maxFileSizeBytes) / (1024 * 1024);

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-white">Step 2 · File Types, PQC Levels, and Dates</h2>
                <p className="text-sm text-white/50">Map each asset type to a PQC wrapping level and define the discovery window.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date range */}
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Creation Date (From)
                    </label>
                    <input
                        type="date"
                        value={config.minDate}
                        onChange={(e) => onChange({ minDate: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-400/60"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> Creation Date (To)
                    </label>
                    <input
                        type="date"
                        value={config.maxDate}
                        onChange={(e) => onChange({ maxDate: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-400/60"
                    />
                </div>

                {/* Max files */}
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Max Files</label>
                    <input
                        type="number"
                        min={1}
                        value={config.maxFiles}
                        onChange={(e) => onChange({ maxFiles: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-400/60"
                    />
                </div>

                {/* Max file size — MB-friendly */}
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Max File Size</label>
                    <div className="relative">
                        <input
                            type="number"
                            min={1}
                            value={fileSizeMB}
                            onChange={(e) =>
                                onChange({ maxFileSizeBytes: String(Math.round(Number(e.target.value) * 1024 * 1024)) })
                            }
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 pr-14 text-white focus:outline-none focus:border-cyan-400/60"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40 pointer-events-none">
                            MB
                        </span>
                    </div>
                    <div className="text-xs text-white/30 mt-1">{config.maxFileSizeBytes} bytes</div>
                </div>

                {/* Default PQC level */}
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Default PQC Level</label>
                    <select
                        value={config.defaultPqcLevel}
                        onChange={(e) => {
                            const nextLevel = e.target.value as 'baseline' | 'enhanced' | 'maximum';
                            onChange({
                                defaultPqcLevel: nextLevel,
                                kemAlgorithm: LEVEL_TO_KEM[nextLevel],
                                enableDilithium: nextLevel === 'baseline' ? false : config.enableDilithium,
                                enableSphincs: nextLevel === 'maximum' ? true : config.enableSphincs,
                            });
                        }}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-400/60"
                    >
                        <option value="baseline">Baseline</option>
                        <option value="enhanced">Enhanced</option>
                        <option value="maximum">Maximum</option>
                    </select>
                </div>

                {/* KEM algorithm (read-only) */}
                <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">KEM Algorithm (auto-aligned)</label>
                    <input
                        value={config.kemAlgorithm}
                        readOnly
                        className="w-full bg-black/10 border border-white/10 rounded-lg p-3 text-white/80"
                    />
                </div>
            </div>

            {/* File-type policy table */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-white/70 flex items-center gap-2">
                        <FileType className="w-4 h-4" /> File-Type PQC Policies
                    </label>
                    <button
                        type="button"
                        onClick={onAddPolicy}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Add Rule
                    </button>
                </div>
                <div className="space-y-2">
                    {fileTypePolicies.map((policy, index) => (
                        <div key={`${policy.extension}-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
                            <input
                                type="text"
                                value={policy.extension}
                                onChange={(e) => onUpdatePolicy(index, { extension: e.target.value })}
                                className="bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60"
                                placeholder=".pem, .crt, .key"
                            />
                            <select
                                value={policy.level}
                                onChange={(e) =>
                                    onUpdatePolicy(index, { level: e.target.value as 'baseline' | 'enhanced' | 'maximum' })
                                }
                                className="bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-400/60"
                            >
                                <option value="baseline">Baseline (ML-KEM-512)</option>
                                <option value="enhanced">Enhanced (ML-KEM-768 + ML-DSA-65)</option>
                                <option value="maximum">Maximum (ML-KEM-1024 + ML-DSA-65 + SLH-DSA)</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => onRemovePolicy(index)}
                                className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Signature algo toggles */}
            <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-black/20 text-white/80">
                    <input
                        type="checkbox"
                        checked={config.enableDilithium}
                        onChange={(e) => onChange({ enableDilithium: e.target.checked })}
                        className="accent-cyan-400"
                    />
                    ML-DSA-65 (Dilithium)
                </label>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-black/20 text-white/80">
                    <input
                        type="checkbox"
                        checked={config.enableSphincs}
                        onChange={(e) => onChange({ enableSphincs: e.target.checked })}
                        className="accent-cyan-400"
                    />
                    SLH-DSA-SHAKE-128s (SPHINCS+)
                </label>
            </div>

            <div className="text-xs text-white/50">
                Effective file types for this run:{' '}
                <span className="text-cyan-300">{normalizedExtensions.join(', ') || 'None yet'}</span>
            </div>
        </div>
    );
}
