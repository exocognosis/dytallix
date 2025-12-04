import React, { useEffect, useState } from 'react';
import { getRiskSummary } from '../../services/quantumVaultClient';

const RiskOverview = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        try {
            setLoading(true);
            const data = await getRiskSummary();
            setSummary(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="muted text-center p-4">Loading risk summary...</div>;
    if (!summary) return <div className="muted text-center p-4">Risk summary unavailable</div>;

    return (
        <div className="grid gap-6 md:grid-cols-4 mb-8">
            <div className="card accent-purple border-t-4 border-purple-500">
                <div className="muted text-sm font-bold uppercase">Avg PQC Score</div>
                <div className="text-3xl font-bold mt-2">{summary.average_pqc_score || 0}</div>
            </div>

            <div className="card accent-red border-t-4 border-red-500">
                <div className="muted text-sm font-bold uppercase">Critical Assets</div>
                <div className="text-3xl font-bold mt-2">{summary.critical_assets_count || 0}</div>
            </div>

            <div className="card accent-blue border-t-4 border-blue-500">
                <div className="muted text-sm font-bold uppercase">Total Assets</div>
                <div className="text-3xl font-bold mt-2">{summary.total_assets || 0}</div>
            </div>

            <div className="card accent-green border-t-4 border-green-500">
                <div className="muted text-sm font-bold uppercase">Protected</div>
                <div className="text-3xl font-bold mt-2">{summary.protected_assets_count || 0}</div>
            </div>
        </div>
    );
};

export default RiskOverview;
