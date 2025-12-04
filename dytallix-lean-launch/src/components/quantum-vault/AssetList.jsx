import React, { useEffect, useState } from 'react';
import { getAssets } from '../../services/quantumVaultClient';

const AssetList = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    if (loading) return <div className="p-4 text-center muted">Loading assets...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Assets</h3>
                <button onClick={loadAssets} className="btn btn-secondary btn-sm">Refresh</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="p-3 muted">Name</th>
                            <th className="p-3 muted">Type</th>
                            <th className="p-3 muted">PQC Score</th>
                            <th className="p-3 muted">Risk Class</th>
                            <th className="p-3 muted">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-4 text-center muted">No assets found</td>
                            </tr>
                        ) : (
                            assets.map((asset) => (
                                <tr key={asset.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="p-3 font-mono">{asset.name}</td>
                                    <td className="p-3">{asset.asset_type}</td>
                                    <td className="p-3">
                                        {asset.pqc_risk_score !== null ? (
                                            <span className={`badge ${getPqcBadgeClass(asset.pqc_risk_score)}`}>
                                                {asset.pqc_risk_score}
                                            </span>
                                        ) : (
                                            <span className="muted">-</span>
                                        )}
                                    </td>
                                    <td className="p-3">{asset.risk_class || '-'}</td>
                                    <td className="p-3">{asset.status}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const getPqcBadgeClass = (score) => {
    if (score >= 80) return 'badge-success';
    if (score >= 50) return 'badge-warning';
    return 'badge-danger';
};

export default AssetList;
