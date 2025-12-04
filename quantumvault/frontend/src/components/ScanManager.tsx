import React, { useEffect, useState } from 'react';
import { getScans, createScan, Scan } from '../api/client';
import { Play, RefreshCw, Clock, AlertCircle, CheckCircle2, Scan as ScanIcon, Globe, ShieldAlert, FileText } from 'lucide-react';
import clsx from 'clsx';

const ScanManager: React.FC = () => {
    const [scans, setScans] = useState<Scan[]>([]);
    const [target, setTarget] = useState('');
    const [scanType, setScanType] = useState('Discovery');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const handleCreateScan = async (e: React.FormEvent) => {
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

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case 'Failed': return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'Running': return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
            default: return <Clock className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'Failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'Running': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Discovery': return <Globe className="w-4 h-4" />;
            case 'Vulnerability': return <ShieldAlert className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    Scan Management
                </h1>
                <p className="text-slate-400 mt-1">
                    Initiate and monitor infrastructure scans
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* New Scan Form */}
                <div className="lg:col-span-1">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm sticky top-8">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <Play className="w-5 h-5 text-blue-500" />
                            Start New Scan
                        </h3>
                        <form onSubmit={handleCreateScan} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-slate-400">Target (URL or IP)</label>
                                <input
                                    type="text"
                                    value={target}
                                    onChange={(e) => setTarget(e.target.value)}
                                    placeholder="e.g. example.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-slate-400">Scan Type</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {['Discovery', 'Compliance', 'Vulnerability'].map((type) => (
                                        <label
                                            key={type}
                                            className={clsx(
                                                "flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all",
                                                scanType === type
                                                    ? "bg-blue-600/10 border-blue-500/50 text-blue-400"
                                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="scanType"
                                                value={type}
                                                checked={scanType === type}
                                                onChange={(e) => setScanType(e.target.value)}
                                                className="hidden"
                                            />
                                            {getTypeIcon(type)}
                                            <span className="font-medium">{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full btn btn-primary py-2.5 flex items-center justify-center gap-2 mt-2"
                            >
                                {creating ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Starting Scan...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4" />
                                        Start Scan
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Recent Scans List */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-slate-400" />
                                Recent Scans
                            </h3>
                            <button onClick={loadScans} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                                <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
                            </button>
                        </div>

                        <div className="divide-y divide-slate-800">
                            {loading && scans.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">Loading scans...</div>
                            ) : scans.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No scans found</div>
                            ) : (
                                scans.map((scan) => (
                                    <div key={scan.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={clsx("p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400")}>
                                                {getTypeIcon(scan.scan_type)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-200">{scan.scan_type} Scan</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">
                                                    ID: {scan.id.slice(0, 8)} • Started {new Date(scan.started_at).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={clsx(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                getStatusStyles(scan.status)
                                            )}>
                                                {getStatusIcon(scan.status)}
                                                {scan.status}
                                            </span>
                                            <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-800 rounded text-blue-400 transition-all">
                                                View Report
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScanManager;
