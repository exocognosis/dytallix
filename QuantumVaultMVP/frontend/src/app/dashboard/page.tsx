'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { dashboardAPI, assetsAPI, policiesAPI, anchorsAPI, authAPI } from '@/lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Shield, AlertTriangle, CheckCircle, Activity, TrendingUp, Lock, Database, FileCheck } from 'lucide-react';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [kpis, setKpis] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [anchors, setAnchors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userResponse, kpisResponse, trendsResponse, assetsResponse, policiesResponse, anchorsResponse] = await Promise.all([
        authAPI.getMe(),
        dashboardAPI.getKPIs(),
        dashboardAPI.getTrends(30),
        assetsAPI.getAssets(),
        policiesAPI.getPolicies(),
        anchorsAPI.getAnchors(),
      ]);

      setUser(userResponse);
      setKpis(kpisResponse);
      setTrends(trendsResponse);
      setAssets(assetsResponse);
      setPolicies(policiesResponse);
      setAnchors(anchorsResponse);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Image src="/QuantumVault.png" alt="QuantumVault" width={40} height={40} />
            <h1 className="text-2xl font-bold text-white">QuantumVault</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Logged in as</p>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 flex space-x-1 border-t border-slate-700">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'assets', label: 'Assets', icon: Database },
            { id: 'policies', label: 'Policies', icon: FileCheck },
            { id: 'attestations', label: 'Attestations', icon: CheckCircle },
            { id: 'anchors', label: 'Anchoring Jobs', icon: Lock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="p-4 max-w-screen-2xl mx-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm">Total Assets</h3>
                  <Database className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-3xl font-bold text-white">{kpis.totalAssets}</p>
                <p className="text-xs text-slate-500 mt-1">Discovered: {kpis.discoveredAssets}</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm">Wrapped Assets</h3>
                  <Lock className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">{kpis.wrappedAssets}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {kpis.totalAssets > 0 ? ((kpis.wrappedAssets / kpis.totalAssets) * 100).toFixed(1) : 0}% of total
                </p>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm">Attested Assets</h3>
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-bold text-white">{kpis.attestedAssets}</p>
                <p className="text-xs text-slate-500 mt-1">Blockchain verified</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-slate-400 text-sm">Avg Risk Score</h3>
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-3xl font-bold text-white">{kpis.avgRiskScore.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-1">Out of 100</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Risk Distribution */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-white text-lg font-semibold mb-4">Risk Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Migration Progress */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-white text-lg font-semibold mb-4">Migration Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Discovered</span>
                      <span className="text-white">{kpis.discoveredAssets}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(kpis.discoveredAssets / kpis.totalAssets) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Wrapped</span>
                      <span className="text-white">{kpis.wrappedAssets}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(kpis.wrappedAssets / kpis.totalAssets) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Attested</span>
                      <span className="text-white">{kpis.attestedAssets}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(kpis.attestedAssets / kpis.totalAssets) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Status Breakdown */}
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-white text-lg font-semibold mb-4">Asset Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-slate-300 text-sm">Critical Risk</span>
                    </div>
                    <span className="text-white font-semibold">{kpis.criticalRiskAssets}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-slate-300 text-sm">High Risk</span>
                    </div>
                    <span className="text-white font-semibold">{kpis.highRiskAssets}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-slate-300 text-sm">Medium Risk</span>
                    </div>
                    <span className="text-white font-semibold">{kpis.mediumRiskAssets}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-slate-300 text-sm">Low Risk</span>
                    </div>
                    <span className="text-white font-semibold">{kpis.lowRiskAssets}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trends Chart */}
            {trends.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <h3 className="text-white text-lg font-semibold mb-4">30-Day Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="timestamp" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalAssets" stroke="#3b82f6" name="Total Assets" />
                    <Line type="monotone" dataKey="wrappedAssets" stroke="#10b981" name="Wrapped" />
                    <Line type="monotone" dataKey="attestedAssets" stroke="#8b5cf6" name="Attested" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
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
