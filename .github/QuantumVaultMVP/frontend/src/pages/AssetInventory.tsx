import { useEffect, useState } from 'react';
import { AssetApi, ScanApi } from '../api/client';
import { Play, ShieldCheck, ShieldAlert, Monitor, Server } from 'lucide-react';
import clsx from 'clsx';

export function AssetInventory() {
    const [assets, setAssets] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [targetInput, setTargetInput] = useState('google.com, github.com');

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        try {
            const data = await AssetApi.getAll();
            setAssets(data);
        } catch (e) {
            console.error(e);
        }
    }

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const targets = targetInput.split(',').map(s => s.trim()).filter(s => s);
            await ScanApi.runScan(targets);
            // Poll or wait a bit then reload
            setTimeout(loadAssets, 5000);
        } catch (e) { console.error(e); }
        finally { setIsScanning(false); }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Encrypted Assets</h2>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={targetInput}
                        onChange={e => setTargetInput(e.target.value)}
                        className="bg-surface border border-white/10 rounded-lg px-3 mb text-sm w-64"
                        placeholder="Targets (comma sep)"
                    />
                    <button onClick={handleScan} disabled={isScanning} className="btn-primary">
                        {isScanning ? <span className="animate-spin">⟳</span> : <Play size={16} />}
                        {isScanning ? 'Scanning...' : 'Run Discovery Scan'}
                    </button>
                </div>
            </div>

            <div className="card-glass overflow-hidden p-0">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5 text-xs uppercase text-textMuted">
                        <tr>
                            <th className="p-4">Asset Name</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Risk Level</th>
                            <th className="p-4">PQC Status</th>
                            <th className="p-4">Last Scan</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {assets.map((asset: any) => (
                            <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4 font-medium flex items-center gap-3">
                                    <Server size={16} className="text-textMuted" />
                                    {asset.name}
                                </td>
                                <td className="p-4 text-sm text-textMuted">{asset.type}</td>
                                <td className="p-4">
                                    <span className={clsx("badge",
                                        asset.riskLevel === 'CRITICAL' ? 'badge-critical' :
                                            asset.riskLevel === 'HIGH' ? 'badge-high' :
                                                asset.riskLevel === 'MEDIUM' ? 'badge-medium' : 'badge-low'
                                    )}>
                                        {asset.riskLevel}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {asset.pqcCompliance === 'COMPLIANT' ?
                                        <span className="text-accent flex items-center gap-1"><ShieldCheck size={14} /> Compliant</span> :
                                        <span className="text-danger flex items-center gap-1"><ShieldAlert size={14} /> Non-Compliant</span>
                                    }
                                </td>
                                <td className="p-4 text-sm text-textMuted">{new Date(asset.lastScanTimestamp).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <button className="text-primary hover:underline text-sm font-medium">Manage</button>
                                </td>
                            </tr>
                        ))}
                        {assets.length === 0 && (
                            <tr><td colSpan={6} className="p-8 text-center text-textMuted">No assets found. Run a scan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
