import React, { useEffect, useState } from 'react';
import { getAssets, Asset } from '../api/client';
import { Search, Filter, RefreshCw, Box, Shield, AlertTriangle, CheckCircle2, AlertOctagon, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

const AssetList: React.FC = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        try {
            setLoading(true);
            const data = await getAssets();
            setAssets(data);
            setError(null);
        } catch (err) {
            setError('Failed to load assets');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.owner.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getScoreColor = (score?: number) => {
        if (!score) return 'bg-slate-600';
        if (score >= 80) return 'bg-emerald-500';
        if (score >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getRiskBadgeStyles = (riskClass?: string) => {
        switch (riskClass) {
            case 'Critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'High': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'Medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'Low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            default: return 'bg-slate-800 text-slate-400 border-slate-700';
        }
    };

    const getRiskIcon = (riskClass?: string) => {
        switch (riskClass) {
            case 'Critical': return <AlertOctagon className="w-3 h-3" />;
            case 'High': return <ShieldAlert className="w-3 h-3" />;
            case 'Medium': return <AlertTriangle className="w-3 h-3" />;
            case 'Low': return <CheckCircle2 className="w-3 h-3" />;
            default: return <Shield className="w-3 h-3" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Asset Inventory
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Manage and monitor all registered digital assets
                    </p>
                </div>
                <button
                    onClick={loadAssets}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                >
                    <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
                    Refresh
                </button>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name or owner..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                </div>

                {error ? (
                    <div className="p-8 text-center text-red-400 bg-red-500/5">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        {error}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="p-4 font-medium">Asset Name</th>
                                    <th className="p-4 font-medium">Type</th>
                                    <th className="p-4 font-medium">PQC Score</th>
                                    <th className="p-4 font-medium">Risk Class</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Owner</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {loading && assets.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500" />
                                                Loading assets...
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredAssets.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-slate-500">
                                            No assets found matching your search
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAssets.map((asset) => (
                                        <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded bg-slate-800 text-slate-400 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                                        <Box className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                                                            {asset.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{asset.id.slice(0, 8)}...</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-400">{asset.asset_type}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={clsx("h-full rounded-full", getScoreColor(asset.pqc_risk_score))}
                                                            style={{ width: `${asset.pqc_risk_score || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-300">{asset.pqc_risk_score || 0}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={clsx(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                                    getRiskBadgeStyles(asset.risk_class)
                                                )}>
                                                    {getRiskIcon(asset.risk_class)}
                                                    {asset.risk_class || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                                    {asset.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-400">
                                                        {asset.owner.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    {asset.owner}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetList;
