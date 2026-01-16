'use client';

import { useState } from 'react';
import {
  Activity,
  Key,
  ShieldCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  Lock,
  Database,
  Cpu,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MetricCard } from '@/components/ui/MetricCard';
import { Tooltip } from '@/components/ui/Tooltip';
import { mockMetrics, quantumRiskTimeline } from '@/lib/mockData';

export default function OverviewPage() {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const getHndlStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-amber-400';
      case 'high': return 'text-red-400';
      default: return 'text-white';
    }
  };

  const getHndlBgColor = (status: string) => {
    switch (status) {
      case 'low': return 'bg-green-500/20 border-green-500/30';
      case 'medium': return 'bg-amber-500/20 border-amber-500/30';
      case 'high': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-white/10 border-white/20';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Overview Dashboard
          </h1>
          <p className="text-white/60 mt-1">
            Real-time quantum security status and <Tooltip term="HNDL">HNDL</Tooltip> exposure monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Sessions"
          value={mockMetrics.activeSessions.toLocaleString()}
          icon={Activity}
          trend={{ value: 12, label: 'vs last week' }}
          variant="default"
        />
        <MetricCard
          title="Key Rotations (24h)"
          value={mockMetrics.keyRotations24h}
          icon={Key}
          subtitle="Auto-rotation enabled"
          variant="info"
        />
        <MetricCard
          title="Compliance Score"
          value={`${mockMetrics.complianceScore}%`}
          icon={ShieldCheck}
          trend={{ value: 2 }}
          variant="success"
        />
        <div className={`glass-card p-5 relative overflow-hidden ${getHndlBgColor(mockMetrics.hndlExposure)}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-white/60 font-medium">
              <Tooltip term="HNDL">HNDL</Tooltip> Exposure Risk
            </p>
            <div className="hex-icon w-10 h-10">
              <AlertTriangle className={`hex-icon-inner w-5 h-5 ${getHndlStatusColor(mockMetrics.hndlExposure)}`} />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-3xl font-bold uppercase tracking-wider ${getHndlStatusColor(mockMetrics.hndlExposure)}`}>
              {mockMetrics.hndlExposure}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-2">94% of assets secured with <Tooltip term="PQC">PQC</Tooltip></p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quantum Risk Timeline Chart */}
        <div className="lg:col-span-8">
          <GlassPanel className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  Quantum Risk Timeline
                </h2>
                <p className="text-sm text-white/50 mt-1">
                  Projected <Tooltip term="Y2Q">Y2Q</Tooltip> horizon: 2030-2035
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                  <span className="text-white/60">Risk Level</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-0.5 bg-red-400" />
                  <span className="text-white/60"><Tooltip term="CRQC">CRQC</Tooltip> Threshold</span>
                </div>
              </div>
            </div>

            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={quantumRiskTimeline}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00BFFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1976D2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="year"
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    fontSize={12}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 15, 30, 0.95)',
                      border: '1px solid rgba(0, 191, 255, 0.2)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`${value}%`, 'Risk Level']}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                  <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Critical', fill: '#ef4444', fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="riskLevel"
                    stroke="#00BFFF"
                    strokeWidth={2}
                    fill="url(#riskGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Timeline Labels */}
            <div className="flex justify-between mt-4 px-8 text-xs text-white/50">
              <span>Current State</span>
              <span className="text-amber-400">Elevated Risk Zone</span>
              <span className="text-red-400"><Tooltip term="CRQC">CRQC</Tooltip> Expected</span>
            </div>
          </GlassPanel>
        </div>

        {/* Right Column - Quick Stats */}
        <div className="lg:col-span-4 space-y-4">
          {/* System Health */}
          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              System Health
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Key Management</span>
                <span className="text-sm font-medium text-green-400">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Encryption Engine</span>
                <span className="text-sm font-medium text-green-400">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Secure Transport</span>
                <span className="text-sm font-medium text-green-400">Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Policy Engine</span>
                <span className="text-sm font-medium text-green-400">Operational</span>
              </div>
            </div>
          </GlassPanel>

          {/* Quick Stats */}
          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-white">{mockMetrics.totalKeys.toLocaleString()}</div>
                <div className="text-xs text-white/50">Total Keys</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-white">{mockMetrics.encryptedObjects.toLocaleString()}</div>
                <div className="text-xs text-white/50">Encrypted Objects</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-white">{mockMetrics.pqcTunnels}</div>
                <div className="text-xs text-white/50"><Tooltip term="PQC">PQC</Tooltip> Tunnels</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-white">{mockMetrics.activePolicies}</div>
                <div className="text-xs text-white/50">Active Policies</div>
              </div>
            </div>
          </GlassPanel>

          {/* Info Card */}
          <GlassPanel className="p-5 quantum-border">
            <div className="flex gap-3">
              <div className="shrink-0">
                <Info className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Quantum Ready</h4>
                <p className="text-xs text-white/60 leading-relaxed">
                  Your organization is protected against <Tooltip term="HNDL">HNDL</Tooltip> attacks
                  with NIST-standardized <Tooltip term="ML-KEM">ML-KEM</Tooltip> and <Tooltip term="ML-DSA">ML-DSA</Tooltip> algorithms.
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
