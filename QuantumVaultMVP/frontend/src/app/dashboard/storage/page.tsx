'use client';

import {
    Database,
    Shield,
    Lock,
    HardDrive,
    Users,
    Layers
} from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    Legend
} from 'recharts';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MetricCard } from '@/components/ui/MetricCard';
import { Tooltip } from '@/components/ui/Tooltip';
import { storageMetrics, storageByTenant } from '@/lib/mockData';

export default function StoragePage() {
    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                    <Database className="w-8 h-8 text-cyan-400" />
                    Storage Encryption
                </h1>
                <p className="text-white/60 mt-1">
                    Envelope encryption with <Tooltip term="PQC">PQC</Tooltip> key wrapping
                </p>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Encrypted Objects"
                    value={storageMetrics.totalEncrypted.toLocaleString()}
                    icon={Lock}
                    variant="default"
                    trend={{ value: 8, label: 'this month' }}
                />
                <MetricCard
                    title="Storage Blocks"
                    value={storageMetrics.totalBlocks.toLocaleString()}
                    icon={HardDrive}
                    variant="info"
                />
                <MetricCard
                    title="Envelope Protected"
                    value={storageMetrics.envelopeProtected.toLocaleString()}
                    icon={Shield}
                    variant="success"
                    subtitle="DEK wrapped with KEK"
                />
                <MetricCard
                    title="Active Tenants"
                    value={storageMetrics.tenantsActive}
                    icon={Users}
                    variant="default"
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Storage by Tenant Chart */}
                <div className="lg:col-span-5">
                    <GlassPanel className="p-6 h-full">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Layers className="w-5 h-5 text-cyan-400" />
                            Storage by Tenant
                        </h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={storageByTenant}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {storageByTenant.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(10, 15, 30, 0.95)',
                                            border: '1px solid rgba(0, 191, 255, 0.2)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                        }}
                                        formatter={(value) => [String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' objects', 'Count']}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value) => <span className="text-white/70 text-sm">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassPanel>
                </div>

                {/* Encryption Details */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Envelope Encryption Diagram */}
                    <GlassPanel className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-cyan-400" />
                            Envelope Encryption Architecture
                        </h3>
                        <div className="py-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                {/* Data */}
                                <div className="text-center flex-1">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <Database className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <div className="text-sm text-white font-medium">Plaintext Data</div>
                                    <div className="text-xs text-white/50 mt-1">Customer assets</div>
                                </div>

                                <div className="text-cyan-400 text-2xl">→</div>

                                {/* DEK */}
                                <div className="text-center flex-1">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-green-500/20 flex items-center justify-center">
                                        <Lock className="w-8 h-8 text-green-400" />
                                    </div>
                                    <div className="text-sm text-white font-medium">DEK Encryption</div>
                                    <div className="text-xs text-white/50 mt-1">AES-256-GCM</div>
                                </div>

                                <div className="text-cyan-400 text-2xl">→</div>

                                {/* KEK */}
                                <div className="text-center flex-1">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                        <Shield className="w-8 h-8 text-purple-400" />
                                    </div>
                                    <div className="text-sm text-white font-medium">KEK Wrapping</div>
                                    <div className="text-xs text-white/50 mt-1"><Tooltip term="ML-KEM">ML-KEM</Tooltip>-1024</div>
                                </div>

                                <div className="text-cyan-400 text-2xl">→</div>

                                {/* Storage */}
                                <div className="text-center flex-1">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 quantum-glow">
                                        <HardDrive className="w-8 h-8 text-cyan-400" />
                                    </div>
                                    <div className="text-sm text-white font-medium">Secure Storage</div>
                                    <div className="text-xs text-white/50 mt-1">Quantum-safe</div>
                                </div>
                            </div>
                        </div>
                    </GlassPanel>

                    {/* Isolation Domains */}
                    <GlassPanel className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-cyan-400" />
                            Isolation Domains
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {storageByTenant.map((tenant) => (
                                <div
                                    key={tenant.name}
                                    className="p-3 rounded-lg bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors"
                                >
                                    <div
                                        className="w-3 h-3 rounded-full mx-auto mb-2"
                                        style={{ backgroundColor: tenant.color }}
                                    />
                                    <div className="text-sm text-white font-medium">{tenant.name}</div>
                                    <div className="text-xs text-white/50">{tenant.value.toLocaleString()} objects</div>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>
                </div>
            </div>

            {/* Encryption Stats Table */}
            <GlassPanel className="overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Encryption Statistics</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="quantum-table">
                        <thead>
                            <tr>
                                <th>Tenant</th>
                                <th>Objects</th>
                                <th>Encryption</th>
                                <th>Key Wrapping</th>
                                <th>Last Rotation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {storageByTenant.map((tenant) => (
                                <tr key={tenant.name}>
                                    <td className="font-medium text-white">{tenant.name}</td>
                                    <td className="text-white/70">{tenant.value.toLocaleString()}</td>
                                    <td><span className="text-green-400">AES-256-GCM</span></td>
                                    <td><span className="text-cyan-400"><Tooltip term="ML-KEM">ML-KEM</Tooltip>-1024</span></td>
                                    <td className="text-white/50">2024-06-10</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassPanel>
        </div>
    );
}
