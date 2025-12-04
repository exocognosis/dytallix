import React, { useEffect, useState } from 'react';
import { getScans, createScan } from '../../services/quantumVaultClient';

const ScanManager = () => {
    const [scans, setScans] = useState([]);
    const [target, setTarget] = useState('');
    const [scanType, setScanType] = useState('Discovery');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadScans();
    }, []);

    const loadScans = async () => {
        try {
            setLoading(true);
            const data = await getScans();
            setScans(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateScan = async (e) => {
        e.preventDefault();
        if (!target) return;

        try {
            setCreating(true);
            setError(null);
            await createScan([target], scanType);
            setTarget('');
            loadScans();
        } catch (err) {
            setError('Failed to start scan');
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div className="card">
                <h3 className="text-xl font-bold mb-4">Start New Scan</h3>
                <form onSubmit={handleCreateScan} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 muted">Target (URL or IP)</label>
                        <input
                            type="text"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            placeholder="e.g. example.com"
                            className="w-full p-2 bg-black/20 border border-white/10 rounded focus:border-primary-500 outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 muted">Scan Type</label>
                        <select
                            value={scanType}
                            onChange={(e) => setScanType(e.target.value)}
                            className="w-full p-2 bg-black/20 border border-white/10 rounded focus:border-primary-500 outline-none"
                        >
                            <option value="Discovery">Discovery</option>
                            <option value="Compliance">Compliance</option>
                            <option value="Vulnerability">Vulnerability</option>
                        </select>
                    </div>
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <button
                        type="submit"
                        disabled={creating}
                        className="btn btn-primary w-full"
                    >
                        {creating ? 'Starting...' : 'Start Scan'}
                    </button>
                </form>
            </div>

            <div className="card">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Recent Scans</h3>
                    <button onClick={loadScans} className="btn btn-secondary btn-sm">Refresh</button>
                </div>
                <div className="overflow-y-auto max-h-[300px]">
                    {loading && scans.length === 0 ? (
                        <div className="text-center muted py-4">Loading...</div>
                    ) : scans.length === 0 ? (
                        <div className="text-center muted py-4">No scans yet</div>
                    ) : (
                        <div className="space-y-2">
                            {scans.map((scan) => (
                                <div key={scan.id} className="p-3 border border-white/10 rounded bg-white/5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold">{scan.scan_type}</div>
                                            <div className="text-xs muted">{new Date(scan.started_at).toLocaleString()}</div>
                                        </div>
                                        <span className={`badge ${getStatusBadgeClass(scan.status)}`}>
                                            {scan.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const getStatusBadgeClass = (status) => {
    switch (status) {
        case 'Completed': return 'badge-success';
        case 'Failed': return 'badge-danger';
        case 'Running': return 'badge-warning';
        default: return 'badge-neutral';
    }
};

export default ScanManager;
