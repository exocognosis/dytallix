'use client';

type AssetTypeMetadata = {
    extension: string;
    dataDomain: string;
    retentionTag: string;
    owner: string;
};

type Props = {
    assetTypeMetadata: AssetTypeMetadata[];
    onUpdateRow: (index: number, updates: Partial<AssetTypeMetadata>) => void;
};

export function WizardStep3Metadata({ assetTypeMetadata, onUpdateRow }: Props) {
    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-white">Step 3 · Add Metadata to Asset Types</h2>
                <p className="text-sm text-white/50">
                    Define metadata defaults for each file type so assets carry required context.
                </p>
            </div>

            {assetTypeMetadata.length === 0 ? (
                <div className="p-4 rounded-lg border border-white/10 bg-white/5 text-white/50 text-sm">
                    No file type rules added yet. Go back to Step 2 to add policies.
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Header row */}
                    <div className="hidden md:grid grid-cols-4 gap-2 px-1">
                        {['Extension', 'Data Domain', 'Retention Tag', 'Business Owner'].map((h) => (
                            <div key={h} className="text-xs uppercase tracking-wide text-white/40 font-medium">
                                {h}
                            </div>
                        ))}
                    </div>

                    {assetTypeMetadata.map((row, index) => (
                        <div key={`${row.extension}-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            {/* Extension — read-only pill */}
                            <div className="flex items-center bg-black/10 border border-white/10 rounded-lg p-3">
                                <span className="font-mono text-sm text-cyan-300">{row.extension}</span>
                            </div>
                            <input
                                value={row.dataDomain}
                                onChange={(e) => onUpdateRow(index, { dataDomain: e.target.value })}
                                className="bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60"
                                placeholder="e.g. CRYPTO_MATERIAL"
                            />
                            <input
                                value={row.retentionTag}
                                onChange={(e) => onUpdateRow(index, { retentionTag: e.target.value })}
                                className="bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60"
                                placeholder="e.g. long_term"
                            />
                            <input
                                value={row.owner}
                                onChange={(e) => onUpdateRow(index, { owner: e.target.value })}
                                className="bg-black/20 border border-white/10 rounded-lg p-3 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60"
                                placeholder="Business owner"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
