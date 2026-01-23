'use client';

import {
    Lock,
    Globe,
    Shield,
    Wifi,
    Activity,
    AlertTriangle,
    CheckCircle,
    TrendingUp
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MetricCard } from '@/components/ui/MetricCard';
import { Tooltip } from '@/components/ui/Tooltip';
import { transportMetrics, trafficData, tunnelProfiles } from '@/lib/mockData';

export default function TransportPage() {
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'active': return 'status-success';
            case 'degraded': return 'status-warning';
            case 'down': return 'status-critical';
            default: return '';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'degraded': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
            default: return null;
        }
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                    <Lock className="w-8 h-8 text-cyan-400" />
                    Secure Transport
                </h1>
                <p className="text-white/60 mt-1">
                    <Tooltip term="PQC">PQC</Tooltip>-hardened TLS and secure tunnels
                </p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="PQC Sessions"
                    value={transportMetrics.pqcSessions.toLocaleString()}
                    icon={Activity}
                    trend={{ value: 15, label: 'active now' }}
                    variant="default"
                />
                <MetricCard
                    title="Hybrid Tunnels"
                    value={transportMetrics.hybridTunnels}
                    icon={Globe}
                    variant="info"
                />
                <MetricCard
                    title="Protected Traffic"
                    value={`${transportMetrics.protectedTraffic}%`}
                    icon={Shield}
                    variant="success"
                />
                <MetricCard
                    title="Vulnerable Traffic"
                    value={`${transportMetrics.vulnerableTraffic}%`}
                    icon={AlertTriangle}
                    variant="danger"
                    subtitle="Legacy connections"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Traffic Chart */}
                <div className="lg:col-span-8">
                    <GlassPanel className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-cyan-400" />
                                Traffic Protection Trend
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-green-400" />
                                    <span className="text-white/60">Protected</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-400" />
                                    <span className="text-white/60">Vulnerable</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={trafficData} barGap={8}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis
                                        dataKey="month"
                                        stroke="rgba(255,255,255,0.5)"
                                        fontSize={12}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="rgba(255,255,255,0.5)"
                                        fontSize={12}
                                        tickLine={false}
                                        tickFormatter={(value) => `${value}%`}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(10, 15, 30, 0.95)',
                                            border: '1px solid rgba(0, 191, 255, 0.2)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            color: '#ffffff',
                                        }}
                                        cursor={{ fill: 'rgba(34, 211, 238, 0.1)' }}
                                        formatter={(value) => [`${value}%`]}
                                    />
                                    <Bar dataKey="protected" name="Protected" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="vulnerable" name="Vulnerable" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassPanel>
                </div>

                {/* TLS Protocol Info */}
                <div className="lg:col-span-4 space-y-4">
                    <GlassPanel className="p-5">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-cyan-400" />
                            Protocol Stack
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <div className="text-sm text-green-400 font-medium">TLS 1.3 + <Tooltip term="ML-KEM">ML-KEM</Tooltip></div>
                                <div className="text-xs text-white/50 mt-1">Primary protocol for new connections</div>
                            </div>
                            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                <div className="text-sm text-cyan-400 font-medium">Hybrid Mode</div>
                                <div className="text-xs text-white/50 mt-1">X25519 + <Tooltip term="ML-KEM">ML-KEM</Tooltip>-768</div>
                            </div>
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                <div className="text-sm text-amber-400 font-medium">Legacy Fallback</div>
                                <div className="text-xs text-white/50 mt-1">TLS 1.2 (deprecating Q4)</div>
                            </div>
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-5 quantum-border">
                        <div className="flex gap-3">
                            <Wifi className="w-5 h-5 text-cyan-400 shrink-0" />
                            <div>
                                <h4 className="text-sm font-semibold text-white mb-1">Quantum-Safe TLS</h4>
                                <p className="text-xs text-white/60 leading-relaxed">
                                    All new connections use <Tooltip term="ML-KEM">ML-KEM</Tooltip> for key exchange,
                                    protecting against future <Tooltip term="HNDL">HNDL</Tooltip> attacks.
                                </p>
                            </div>
                        </div>
                    </GlassPanel>
                </div>
            </div>

            {/* Tunnel Profiles Table */}
            <GlassPanel className="overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-cyan-400" />
                        Tunnel Profiles
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="quantum-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Protocol</th>
                                <th>Status</th>
                                <th>Bandwidth</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tunnelProfiles.map((tunnel) => (
                                <tr key={tunnel.id}>
                                    <td className="font-medium text-white">{tunnel.name}</td>
                                    <td className="text-cyan-400 text-sm">{tunnel.protocol}</td>
                                    <td>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getStatusClass(tunnel.status)}`}>
                                            {getStatusIcon(tunnel.status)}
                                            {tunnel.status}
                                        </span>
                                    </td>
                                    <td className="text-white/70">{tunnel.bandwidth}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassPanel>
        </div>
    );
}
