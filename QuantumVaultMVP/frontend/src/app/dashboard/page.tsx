'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Key,
  ShieldCheck,
  AlertTriangle,
  Clock,
  TrendingUp,
  Database,
  Cpu,
  Info,
  Shield,
  ShieldAlert,
  Network,
  RefreshCw,
  Lock
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MetricCard } from '@/components/ui/MetricCard';
import { Tooltip } from '@/components/ui/Tooltip';
import { dashboardAPI, policiesAPI, anchorsAPI } from '@/lib/api';

const quantumRiskTimeline = [
  { year: 2024, riskLevel: 15, label: 'Current' },
  { year: 2025, riskLevel: 20, label: '' },
  { year: 2026, riskLevel: 28, label: '' },
  { year: 2027, riskLevel: 38, label: '' },
  { year: 2028, riskLevel: 50, label: 'Elevated Risk' },
  { year: 2029, riskLevel: 62, label: '' },
  { year: 2030, riskLevel: 75, label: 'Y2Q Window Begins' },
  { year: 2031, riskLevel: 82, label: '' },
  { year: 2032, riskLevel: 88, label: '' },
  { year: 2033, riskLevel: 93, label: '' },
  { year: 2034, riskLevel: 96, label: '' },
  { year: 2035, riskLevel: 98, label: 'CRQC Expected' },
];

// Custom Tooltip for our new charts to match GlassPanel dark aesthetic
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a0f1e]/95 border border-cyan-500/20 p-3 rounded-lg text-sm text-white shadow-xl">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mt-1 text-white/80">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}:</span>
            <span className="font-semibold text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<{
    activeSessions: number;
    keyRotations24h: number;
    complianceScore: number;
    hndlExposure: 'low' | 'medium' | 'high';
    totalKeys: number;
    encryptedObjects: number;
    pqcTunnels: number;
    activePolicies: number;
  }>({
    activeSessions: 0,
    keyRotations24h: 0,
    complianceScore: 0,
    hndlExposure: 'low',
    totalKeys: 0,
    encryptedObjects: 0,
    pqcTunnels: 0,
    activePolicies: 0,
  });
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const [migrationData, setMigrationData] = useState<any[]>([]);
  const [hndlData, setHndlData] = useState<any[]>([]);
  const [rotationData, setRotationData] = useState<any[]>([]);
  const [algorithmData, setAlgorithmData] = useState<any[]>([]);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);
        // Fetch all required data in parallel
        const [kpiData, trendsData, policiesData, anchorsData] = await Promise.all([
          dashboardAPI.getKPIs(),
          dashboardAPI.getTrends(30),
          policiesAPI.getPolicies().catch(() => []), // Fallback to empty array if policies fail
          anchorsAPI.getAnchors().catch(() => [])    // Fetch anchors for algorithm & rotation data
        ]);

        setMetrics(prev => ({
          ...prev,
          totalKeys: kpiData.totalAssets || prev.totalKeys,
          complianceScore: Math.round(kpiData.pqcCompliantPercent || 0),
          // Calculate HNDL exposure from avgRiskScore
          hndlExposure: getRiskLabel(kpiData.avgRiskScore || 0),
          // Map other available fields
          encryptedObjects: kpiData.wrappedAssets || prev.encryptedObjects,
          activeSessions: kpiData.recentScans || prev.activeSessions,
          activePolicies: Array.isArray(policiesData) ? policiesData.filter((p: any) => p.status === 'enforced').length : prev.activePolicies,
        }));

        // Use trends data if available, otherwise keep mock timeline
        if (trendsData && trendsData.length > 0) {
          const formattedTrends = trendsData.map((t: any) => {
            const safe = (t.wrappedAssets || 0) + (t.attestedAssets || 0);
            return {
              date: new Date(t.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              total: t.totalAssets || 0,
              safe: safe,
              vulnerable: Math.max(0, (t.totalAssets || 0) - safe)
            };
          });
          setHndlData(formattedTrends);
        }

        // Set Migration Data
        const safeAssets = (kpiData.wrappedAssets || 0) + (kpiData.attestedAssets || 0);
        const legacyAssets = Math.max(0, (kpiData.totalAssets || 0) - safeAssets);
        setMigrationData([
          { name: 'Quantum-Safe', value: safeAssets, color: '#10b981' },
          { name: 'Legacy (RSA/ECC)', value: legacyAssets, color: '#f59e0b' }
        ]);

        // Set Algorithm & Rotation Data
        if (anchorsData && anchorsData.length > 0) {
          const algoCount: Record<string, number> = {};
          anchorsData.forEach((a: any) => {
            algoCount[a.algorithm] = (algoCount[a.algorithm] || 0) + 1;
          });

          const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#10b981'];
          const formattedAlgos = Object.entries(algoCount).map(([name, value], idx) => ({
            name: name.replace(/_/g, '-').toUpperCase(),
            value,
            color: colors[idx % colors.length]
          }));
          setAlgorithmData(formattedAlgos);

          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d;
          });

          const rotations = last7Days.map(date => {
            const dayStr = date.toLocaleDateString(undefined, { weekday: 'short' });
            const count = anchorsData.filter((a: any) => {
              const eventDate = new Date(a.rotatedAt || a.createdAt);
              return eventDate.toDateString() === date.toDateString();
            }).length;
            return { day: dayStr, rotations: count };
          });
          setRotationData(rotations);
        }

        setLastUpdated(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Failed to fetch dashboard KPIs:', error);
        // Keep showing mock data on error for demo purposes
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, []);

  const getRiskLabel = (score: number) => {
    if (score >= 80) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  };

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
          <span>Last updated: {lastUpdated}</span>
          {loading && <span className="text-cyan-400 ml-2 animate-pulse">Updating...</span>}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Sessions"
          value={metrics.activeSessions.toLocaleString()}
          icon={Activity}
          trend={{ value: 12, label: 'vs last week' }}
          variant="default"
        />
        <MetricCard
          title="Key Rotations (24h)"
          value={metrics.keyRotations24h}
          icon={Key}
          subtitle="Auto-rotation enabled"
          variant="info"
        />
        <MetricCard
          title="Compliance Score"
          value={`${metrics.complianceScore}%`}
          icon={ShieldCheck}
          trend={{ value: 2 }}
          variant="success"
        />
        <div className={`glass-card p-5 relative overflow-hidden ${getHndlBgColor(metrics.hndlExposure)}`}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-sm text-white/60 font-medium">
              <Tooltip term="HNDL">HNDL</Tooltip> Exposure Risk
            </p>
            <div className="hex-icon w-10 h-10">
              <AlertTriangle className={`hex-icon-inner w-5 h-5 ${getHndlStatusColor(metrics.hndlExposure)}`} />
            </div>
          </div>
          <div className="flex items-end gap-3">
            <span className={`text-3xl font-bold uppercase tracking-wider ${getHndlStatusColor(metrics.hndlExposure)}`}>
              {metrics.hndlExposure}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-2">94% of assets secured with <Tooltip term="PQC">PQC</Tooltip></p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quantum Risk Timeline Chart */}
        <div className="lg:col-span-8">
          <GlassPanel className="p-6 h-full flex flex-col">
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

            <div className="flex-1 min-h-[300px]">
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
                <div className="text-xl font-bold text-white">{metrics.totalKeys.toLocaleString()}</div>
                <div className="text-xs text-white/50">Total Assets</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-white">{metrics.encryptedObjects.toLocaleString()}</div>
                <div className="text-xs text-white/50">Encrypted Objects</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-white">{metrics.pqcTunnels}</div>
                <div className="text-xs text-white/50"><Tooltip term="PQC">PQC</Tooltip> Tunnels</div>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-xl font-bold text-white">{metrics.activePolicies}</div>
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

      {/* PQC Posture Dashboard Section */}
      <div className="pt-6 border-t border-white/10">
        <h2 className="text-xl lg:text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-400" />
          PQC Posture & Footprint
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Migration Progress */}
          <GlassPanel className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">PQC Migration Progress</h3>
                <p className="text-sm text-white/50">Quantum-safe vs legacy assets</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={migrationData.length > 0 ? migrationData : [{ name: 'No Data', value: 1, color: '#333' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="rgba(255,255,255,0.05)"
                  >
                    {migrationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {/* 2. HNDL Exposure */}
          <GlassPanel className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">HNDL Exposure (30 Days)</h3>
                <p className="text-sm text-white/50">Active sessions by encryption type</p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                <Network className="w-5 h-5" />
              </div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hndlData.length > 0 ? hndlData : [{ date: 'No Data', total: 0, vulnerable: 0, safe: 0 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSafeMetrics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorVulnMetrics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="safe" name="Quantum-Safe" stroke="#10b981" fillOpacity={1} fill="url(#colorSafeMetrics)" />
                  <Area type="monotone" dataKey="vulnerable" name="Vulnerable" stroke="#f59e0b" fillOpacity={1} fill="url(#colorVulnMetrics)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {/* 3. Key Rotation Volume */}
          <GlassPanel className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Cryptographic Agility</h3>
                <p className="text-sm text-white/50">Key rotations over last 7 days</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rotationData.length > 0 ? rotationData : [{ day: 'No Data', rotations: 0 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="rotations" name="Rotations" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#0a0f1e', strokeWidth: 2, stroke: '#3b82f6' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>

          {/* 4. Algorithm Distribution */}
          <GlassPanel className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Algorithm Distribution</h3>
                <p className="text-sm text-white/50">Active ciphers in use</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                <Lock className="w-5 h-5" />
              </div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={algorithmData.length > 0 ? algorithmData : [{ name: 'No Data', value: 1, color: '#333' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="rgba(255,255,255,0.05)"
                  >
                    {algorithmData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
