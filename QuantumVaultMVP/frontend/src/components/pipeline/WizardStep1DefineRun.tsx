'use client';

import { FolderSearch, Database } from 'lucide-react';

type Config = {
    originDatabase: string;
    destinationDatabase: string;
};

type Props = {
    config: Config;
    onChange: (update: Partial<Config>) => void;
};

const ORIGIN_PRESETS = [
    { label: 'Test Data', path: '/opt/quantumvault-test/QuantumVaultTestData' },
    { label: 'Keys Dir', path: '/opt/quantumvault-test/keys' },
    { label: 'Certs Dir', path: '/opt/quantumvault-test/certs' },
];

const DEST_PRESETS = [
    { label: 'PQC Output', path: '/opt/quantumvault/encrypted' },
    { label: 'Staging', path: '/opt/quantumvault/staging' },
];

export function WizardStep1DefineRun({ config, onChange }: Props) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-white">Step 1 · Define the Run</h2>
                <p className="text-sm text-white/50">Drop in the origin and destination directories for this run.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Origin */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70 flex items-center gap-2">
                        <FolderSearch className="w-4 h-4" /> Origin Directory
                    </label>
                    <input
                        type="text"
                        value={config.originDatabase}
                        onChange={(e) => onChange({ originDatabase: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60"
                        placeholder="/path/to/source-assets"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {ORIGIN_PRESETS.map((p) => (
                            <button
                                key={p.path}
                                type="button"
                                onClick={() => onChange({ originDatabase: p.path })}
                                className={`px-2 py-0.5 rounded text-xs transition-colors ${config.originDatabase === p.path
                                        ? 'bg-cyan-500/30 border border-cyan-400/60 text-cyan-300'
                                        : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {config.originDatabase && (
                        <div className="text-xs font-mono text-cyan-400/70 truncate">
                            ↳ {config.originDatabase}
                        </div>
                    )}
                </div>

                {/* Destination */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-white/70 flex items-center gap-2">
                        <Database className="w-4 h-4" /> Destination Directory
                    </label>
                    <input
                        type="text"
                        value={config.destinationDatabase}
                        onChange={(e) => onChange({ destinationDatabase: e.target.value })}
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-green-400/60"
                        placeholder="/path/to/pqc-output"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {DEST_PRESETS.map((p) => (
                            <button
                                key={p.path}
                                type="button"
                                onClick={() => onChange({ destinationDatabase: p.path })}
                                className={`px-2 py-0.5 rounded text-xs transition-colors ${config.destinationDatabase === p.path
                                        ? 'bg-green-500/30 border border-green-400/60 text-green-300'
                                        : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                    {config.destinationDatabase && (
                        <div className="text-xs font-mono text-green-400/70 truncate">
                            ↳ {config.destinationDatabase}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
