import { useState, useEffect } from 'react';
import { AttestationApi, AssetApi } from '../api/client';
import { Activity, CheckCircle, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';

export function Attestation() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [j, a] = await Promise.all([AttestationApi.getJobs(), AssetApi.getAll()]);
        setJobs(j);
        setAssets(a.filter((x: any) => x.riskLevel === 'HIGH' || x.riskLevel === 'CRITICAL'));
    };

    const handleAttest = async () => {
        if (selectedAssets.length === 0) return;
        setLoading(true);
        try {
            await AttestationApi.createJob(selectedAssets);
            await loadData();
            setSelectedAssets([]);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Job Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">New Attestation Job</h2>
                        <button onClick={handleAttest} disabled={loading || selectedAssets.length === 0} className="btn-primary">
                            {loading ? 'Submitting...' : 'Attest Selected'}
                        </button>
                    </div>

                    <div className="card-glass p-0 h-96 overflow-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-xs text-textMuted uppercase sticky top-0 bg-surface">
                                <tr>
                                    <th className="p-3 w-10"></th>
                                    <th className="p-3">Asset</th>
                                    <th className="p-3">Risk</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset: any) => (
                                    <tr key={asset.id} className="hover:bg-white/5 border-b border-white/5">
                                        <td className="p-3">
                                            <input type="checkbox"
                                                checked={selectedAssets.includes(asset.id)}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedAssets([...selectedAssets, asset.id]);
                                                    else setSelectedAssets(selectedAssets.filter(id => id !== asset.id));
                                                }}
                                            />
                                        </td>
                                        <td className="p-3">{asset.name}</td>
                                        <td className="p-3 text-xs text-danger">{asset.riskLevel}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Job History */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Attestation History</h2>
                    <div className="space-y-4">
                        {jobs.map((job: any) => (
                            <div key={job.id} className="card-glass p-4 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Activity size={16} className="text-primary" />
                                        <span className="font-mono text-xs text-textMuted">{job.id.slice(0, 8)}...</span>
                                        <span className={clsx("badge",
                                            job.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                        )}>{job.status}</span>
                                    </div>
                                    <div className="text-sm text-textMuted">
                                        {new Date(job.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div className="flex gap-4 text-sm font-medium">
                                    <span className="text-green-400 flex items-center gap-1"><CheckCircle size={14} /> {job.succeededCount}</span>
                                    <span className="text-red-400 flex items-center gap-1"><XCircle size={14} /> {job.failedCount}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
