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

            {/* Pipeline Context Area */}
            <div className="mt-8 p-5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-500/20 p-2 rounded-lg shrink-0 mt-1">
                        <FolderSearch className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-white font-medium">How the PQC Pipeline Works</h3>
                        <p className="text-sm text-white/70 leading-relaxed">
                            The QuantumVault Pipeline is an automated engine designed to migrate your classical cryptographic assets to quantum-safe standards. By defining the origin and destination directories, you initiate a multi-step process:
                        </p>
                        <ul className="text-sm text-white/60 space-y-2 list-disc list-inside ml-2">
                            <li><strong className="text-white/80">Asset Discovery:</strong> Scans the origin directory for vulnerable keys, certificates, and operational data.</li>
                            <li><strong className="text-white/80">Policy Application:</strong> Automatically applies the appropriate Post-Quantum Cryptography (PQC) wrapping level based on file type and domain.</li>
                            <li><strong className="text-white/80">Quantum Wrapping:</strong> Re-encrypts assets using NIST-approved algorithms like ML-KEM and ML-DSA before moving them to the destination.</li>
                            <li><strong className="text-white/80">Attestation & Anchoring:</strong> Anchors the newly wrapped assets to the blockchain to guarantee cryptographic lineage and integrity.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
