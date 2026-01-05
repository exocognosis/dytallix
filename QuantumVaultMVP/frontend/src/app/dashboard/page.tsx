'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { dashboardAPI, assetsAPI, policiesAPI, anchorsAPI, authAPI } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle, TrendingUp, Lock, Database } from 'lucide-react';
import OneOffFlowPanel from './OneOffFlowPanel';

type User = {
  email?: string;
};

type KPI = {
  totalAssets: number;
  discoveredAssets: number;
  wrappedAssets: number;
  attestedAssets: number;
  avgRiskScore: number;
  criticalRiskAssets: number;
  highRiskAssets: number;
  mediumRiskAssets: number;
  lowRiskAssets: number;
};

type TrendPoint = {
  timestamp: string;
  totalAssets: number;
  wrappedAssets: number;
  attestedAssets: number;
};

type Asset = {
  id: string;
  name: string;
  type: string;
  status: string;
  riskLevel: string;
  riskScore: number;
};

type Policy = {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

type Anchor = {
  id: string;
  name: string;
  algorithm: string;
  isActive?: boolean;
};

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [kpis, setKpis] = useState<KPI | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const [userResponse, kpisResponse, trendsResponse, assetsResponse, policiesResponse, anchorsResponse] = await Promise.all([
          authAPI.getMe(),
          dashboardAPI.getKPIs(),
          dashboardAPI.getTrends(90),
          assetsAPI.getAssets(),
          policiesAPI.getPolicies(),
          anchorsAPI.getAnchors(),
        ]);

        setUser(userResponse as User);
        setKpis(kpisResponse as KPI);
        setTrends((trendsResponse as unknown[] as TrendPoint[]) || []);
        setAssets((assetsResponse as unknown[] as Asset[]) || []);
        setPolicies((policiesResponse as unknown[] as Policy[]) || []);
        setAnchors((anchorsResponse as unknown[] as Anchor[]) || []);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [router]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading || !kpis) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  const riskData = [
    { name: 'Critical', value: kpis.criticalRiskAssets, color: '#ef4444' },
    { name: 'High', value: kpis.highRiskAssets, color: '#f59e0b' },
    { name: 'Medium', value: kpis.mediumRiskAssets, color: '#3b82f6' },
    { name: 'Low', value: kpis.lowRiskAssets, color: '#10b981' },
  ];

  const totalAssets = Number(kpis.totalAssets) || 0;
  const safePercent = (part: number) => {
    if (!totalAssets || totalAssets <= 0) return 0;
    const pct = (Number(part) / totalAssets) * 100;
    if (!Number.isFinite(pct) || pct < 0) return 0;
    return Math.min(100, pct);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-900 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-4">
            <Image src="/QuantumVault.png" alt="QuantumVault" width={44} height={44} />
            <h1 className="text-3xl font-bold text-white tracking-wide">QuantumVault</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-400">Logged in as</p>
              <p className="text-sm text-white font-medium">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md border border-slate-700 transition"
            >
              LOGIN/LOGOUT
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-3 bg-gradient-to-b from-blue-800/70 to-blue-900/70 border-b border-slate-700">
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {[
              { id: 'overview', label: 'OVERVIEW' },
              { id: 'assets', label: 'ASSETS' },
              { id: 'attestations', label: 'ATTESTATIONS' },
              { id: 'policies', label: 'POLICIES' },
              { id: 'anchors', label: 'ANCHORING JOBS' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1 text-lg font-semibold tracking-widest transition ${
                  activeTab === tab.id ? 'text-white' : 'text-blue-100/80 hover:text-blue-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="p-6 max-w-screen-2xl mx-auto">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top row: System Status | Single Asset Intake | Migration Status/Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
                <div className="p-6 flex flex-col items-center justify-center min-h-[220px]">
                  <div className="text-4xl font-extrabold tracking-wide text-white">System</div>
                  <div className="text-4xl font-extrabold tracking-wide text-white">Status</div>

                  <div className="mt-6 w-full max-w-sm space-y-3">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/40 rounded-md border border-slate-700">
                      <span className="text-slate-200 text-sm">Critical</span>
                      <span className="text-white font-semibold">{kpis.criticalRiskAssets}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/40 rounded-md border border-slate-700">
                      <span className="text-slate-200 text-sm">High</span>
                      <span className="text-white font-semibold">{kpis.highRiskAssets}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/40 rounded-md border border-slate-700">
                      <span className="text-slate-200 text-sm">Medium</span>
                      <span className="text-white font-semibold">{kpis.mediumRiskAssets}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900/40 rounded-md border border-slate-700">
                      <span className="text-slate-200 text-sm">Low</span>
                      <span className="text-white font-semibold">{kpis.lowRiskAssets}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
                <div className="p-6 min-h-[220px]">
                  <div className="text-center text-3xl font-extrabold tracking-wide text-white">
                    Single
                  </div>
                  <div className="text-center text-3xl font-extrabold tracking-wide text-white">
                    Asset
                  </div>
                  <div className="text-center text-3xl font-extrabold tracking-wide text-white">
                    Intake
                  </div>

                  <div className="mt-6 max-h-[520px] overflow-auto rounded-md border border-slate-700 bg-slate-900/30 p-4">
                    <OneOffFlowPanel assets={assets} policies={policies} anchors={anchors} variant="embedded" showHeader={false} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
                <div className="p-6 min-h-[220px] flex flex-col justify-center">
                  <div className="text-center text-4xl font-extrabold tracking-wide text-white">Migration</div>
                  <div className="text-center text-4xl font-extrabold tracking-wide text-white">Status/Progress</div>

                  <div className="mt-8 space-y-5">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-200">Discovered</span>
                        <span className="text-white font-semibold">{kpis.discoveredAssets}</span>
                      </div>
                      <div className="w-full bg-slate-900/40 rounded-full h-3 border border-slate-700">
                        <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${safePercent(kpis.discoveredAssets)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-200">Wrapped</span>
                        <span className="text-white font-semibold">{kpis.wrappedAssets}</span>
                      </div>
                      <div className="w-full bg-slate-900/40 rounded-full h-3 border border-slate-700">
                        <div className="bg-green-500 h-3 rounded-full" style={{ width: `${safePercent(kpis.wrappedAssets)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-200">Attested</span>
                        <span className="text-white font-semibold">{kpis.attestedAssets}</span>
                      </div>
                      <div className="w-full bg-slate-900/40 rounded-full h-3 border border-slate-700">
                        <div className="bg-purple-500 h-3 rounded-full" style={{ width: `${safePercent(kpis.attestedAssets)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
                <div className="px-5 py-3 text-center text-sm font-bold tracking-widest text-blue-100 bg-blue-900/30 border-b border-blue-900/40">
                  TOTAL ASSETS
                </div>
                <div className="p-6 flex flex-col items-center justify-center">
                  <Database className="w-7 h-7 text-blue-200 mb-3" />
                  <div className="text-4xl font-extrabold text-white">{kpis.totalAssets}</div>
                  <div className="text-xs text-blue-100/80 mt-2">Discovered: {kpis.discoveredAssets}</div>
                </div>
              </div>

              <div className="bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
                <div className="px-5 py-3 text-center text-sm font-bold tracking-widest text-blue-100 bg-blue-900/30 border-b border-blue-900/40">
                  WRAPPED ASSETS
                </div>
                <div className="p-6 flex flex-col items-center justify-center">
                  <Lock className="w-7 h-7 text-blue-200 mb-3" />
                  <div className="text-4xl font-extrabold text-white">{kpis.wrappedAssets}</div>
                  <div className="text-xs text-blue-100/80 mt-2">{safePercent(kpis.wrappedAssets).toFixed(1)}% of total</div>
                </div>
              </div>

              <div className="bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
                <div className="px-5 py-3 text-center text-sm font-bold tracking-widest text-blue-100 bg-blue-900/30 border-b border-blue-900/40">
                  ATTESTED ASSETS
                </div>
                <div className="p-6 flex flex-col items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-blue-200 mb-3" />
                  <div className="text-4xl font-extrabold text-white">{kpis.attestedAssets}</div>
                  <div className="text-xs text-blue-100/80 mt-2">Blockchain verified</div>
                </div>
              </div>

              <div className="bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
                <div className="px-5 py-3 text-center text-sm font-bold tracking-widest text-blue-100 bg-blue-900/30 border-b border-blue-900/40">
                  AVG. ASSET RISK
                </div>
                <div className="p-6 flex flex-col items-center justify-center">
                  <TrendingUp className="w-7 h-7 text-blue-200 mb-3" />
                  <div className="text-4xl font-extrabold text-white">{kpis.avgRiskScore.toFixed(1)}</div>
                  <div className="text-xs text-blue-100/80 mt-2">Out of 100</div>
                </div>
              </div>
            </div>

            {/* Feature row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
                <div className="px-5 py-3 text-center text-sm font-bold tracking-widest text-blue-100 bg-blue-900/30 border-b border-blue-900/40">
                  ASSET RISK DISTRIBUTION
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={riskData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={95}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {riskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {['FEATURE FUNCTION TBD', 'FEATURE FUNCTION TBD', 'FEATURE FUNCTION TBD'].map((label, idx) => (
                <div key={idx} className="bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
                  <div className="px-5 py-3 text-center text-sm font-bold tracking-widest text-blue-100 bg-blue-900/30 border-b border-blue-900/40">
                    {label}
                  </div>
                  <div className="p-10 flex items-center justify-center min-h-[280px]">
                    <div className="text-center text-3xl font-extrabold tracking-wide text-white">FEATURE\nFUNCTION\nTBD</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trend analysis */}
            <div className="bg-gradient-to-b from-blue-800/60 to-blue-900/60 rounded-lg border border-blue-900/40">
              <div className="p-8 text-center text-4xl font-extrabold tracking-wide text-white">30/60/90 Trend</div>
              <div className="pb-8 text-center text-4xl font-extrabold tracking-wide text-white">Analysis Function</div>
              <div className="px-6 pb-6">
                {trends.length > 0 ? (
                  <div className="bg-slate-900/30 rounded-md border border-slate-700 p-4">
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="timestamp" stroke="#cbd5e1" />
                        <YAxis stroke="#cbd5e1" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                        <Legend />
                        <Line type="monotone" dataKey="totalAssets" stroke="#3b82f6" name="Total Assets" />
                        <Line type="monotone" dataKey="wrappedAssets" stroke="#10b981" name="Wrapped" />
                        <Line type="monotone" dataKey="attestedAssets" stroke="#8b5cf6" name="Attested" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center text-slate-200">No trend data available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Assets</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Risk Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-750">
                      <td className="px-6 py-4 text-sm text-white">{asset.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{asset.type}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          asset.status === 'WRAPPED_PQC' ? 'bg-green-900 text-green-200' :
                          asset.status === 'ATTESTED' ? 'bg-purple-900 text-purple-200' :
                          'bg-blue-900 text-blue-200'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          asset.riskLevel === 'CRITICAL' ? 'bg-red-900 text-red-200' :
                          asset.riskLevel === 'HIGH' ? 'bg-orange-900 text-orange-200' :
                          asset.riskLevel === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-green-900 text-green-200'
                        }`}>
                          {asset.riskLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{asset.riskScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Policies</h2>
            </div>
            <div className="p-6 space-y-4">
              {policies.map((policy) => (
                <div key={policy.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{policy.name}</h3>
                      <p className="text-slate-400 text-sm mt-1">{policy.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      policy.isActive ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {policy.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'attestations' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Blockchain Attestations</h2>
            <p className="text-slate-400">
              {kpis.attestedAssets} assets have been attested on the blockchain
            </p>
          </div>
        )}

        {activeTab === 'anchors' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">PQC Anchors</h2>
            </div>
            <div className="p-6 space-y-4">
              {anchors.map((anchor) => (
                <div key={anchor.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{anchor.name}</h3>
                      <p className="text-slate-400 text-sm mt-1">Algorithm: {anchor.algorithm}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      anchor.isActive ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-300'
                    }`}>
                      {anchor.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
