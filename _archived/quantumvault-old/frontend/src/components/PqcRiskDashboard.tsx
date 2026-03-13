import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import {
    ShieldAlert, ShieldCheck, Shield, Activity, Search, Filter,
    AlertTriangle, CheckCircle2, XCircle, AlertOctagon
} from 'lucide-react';
import clsx from 'clsx';
import { getRiskSummary, getRiskAssets, RiskSummary, Asset } from '../api/client';

const PqcRiskDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<RiskSummary | null>(null);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [summaryData, assetsData] = await Promise.all([
                    getRiskSummary(),
                    getRiskAssets()
                ]);
                setSummary(summaryData);
                setAssets(assetsData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading || !summary) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    // Chart Data Preparation
    const riskDistributionData = [
        { name: 'Critical', value: summary.by_risk_class.Critical, color: '#ef4444' },
        { name: 'High', value: summary.by_risk_class.High, color: '#f97316' },
        { name: 'Medium', value: summary.by_risk_class.Medium, color: '#eab308' },
        { name: 'Low', value: summary.by_risk_class.Low, color: '#22c55e' },
    ].filter(d => d.value > 0);

    const protectionData = [
        { name: 'Protected', value: assets.filter(a => a.encryption_profile?.protected).length, color: '#3b82f6' },
        { name: 'Unprotected', value: assets.filter(a => !a.encryption_profile?.protected).length, color: '#64748b' },
    ];

    // Mock trend data for the area chart (replace with real historical data later)
    const trendData = [
        { month: 'Jan', risk: 85 }, { month: 'Feb', risk: 82 },
        { month: 'Mar', risk: 78 }, { month: 'Apr', risk: 75 },
        { month: 'May', risk: 72 }, { month: 'Jun', risk: 68 },
    ];

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.owner.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Risk Overview
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Real-time PQC readiness assessment and vulnerability tracking
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                    <div className="px-3 py-1 rounded bg-blue-500/10 text-blue-400 text-sm font-medium">
                        System Healthy
                    </div>
                    <div className="h-4 w-px bg-slate-800" />
                    <div className="text-sm text-slate-400">
                        Last scan: <span className="text-slate-200">2 mins ago</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Total Assets"
                    value={summary.total_assets}
                    icon={Shield}
                    trend="+12% vs last month"
                    trendUp={true}
                />
                <KpiCard
                    title="Avg Risk Score"
                    value={summary.average_risk_score.toFixed(1)}
                    icon={Activity}
                    trend="-5.2% improvement"
                    trendUp={false} // Lower risk is better
                    inverseTrend
                />
                <KpiCard
                    title="Critical Vulnerabilities"
                    value={summary.by_risk_class.Critical}
                    icon={AlertOctagon}
                    color="text-red-500"
                    trend="Requires attention"
                    trendUp={false}
                />
                <KpiCard
                    title="Protected Assets"
                    value={assets.filter(a => a.encryption_profile?.protected).length}
                    icon={ShieldCheck}
                    color="text-blue-500"
                    trend="+8 new this week"
                    trendUp={true}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Trend */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Risk Score Trend
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="month" stroke="#64748b" axisLine={false} tickLine={false} />
                                <YAxis stroke="#64748b" axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                    itemStyle={{ color: '#3b82f6' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="risk"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRisk)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk Distribution */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Risk Distribution
                    </h3>
                    <div className="h-[300px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={riskDistributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {riskDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">{summary.total_assets}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider">Assets</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Assets Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        Recent Assets
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all w-full sm:w-64"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium">Asset Name</th>
                                <th className="p-4 font-medium">Type</th>
                                <th className="p-4 font-medium">Risk Score</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Owner</th>
                                <th className="p-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredAssets.slice(0, 5).map((asset) => (
                                <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="p-4">
                                        <div className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                                            {asset.name}
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{asset.id.slice(0, 8)}...</div>
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
                                    <td className="p-4 text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-400">
                                                {asset.owner.slice(0, 2).toUpperCase()}
                                            </div>
                                            {asset.owner}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => navigate(`/assets`)}
                                            className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Helper Components & Functions
const KpiCard = ({ title, value, icon: Icon, trend, trendUp, inverseTrend, color }: any) => {
    const isPositive = inverseTrend ? !trendUp : trendUp;
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm hover:border-slate-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={clsx("p-3 rounded-lg bg-slate-950 group-hover:scale-110 transition-transform duration-300", color || "text-slate-400")}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <span className={clsx("text-xs font-medium px-2 py-1 rounded-full",
                        isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}>
                        {trend}
                    </span>
                )}
            </div>
            <div className="text-3xl font-bold text-white mb-1">{value}</div>
            <div className="text-sm text-slate-500">{title}</div>
        </div>
    );
};

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

export default PqcRiskDashboard;
