import { Play, Activity, CheckCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const migrationData = [
    { name: 'Jan', value: 5 },
    { name: 'Feb', value: 15 },
    { name: 'Mar', value: 25 },
    { name: 'Apr', value: 40 },
    { name: 'May', value: 55 },
    { name: 'Jun', value: 60 },
];

const pieData = [
    { name: 'Asset Encryption', value: 45, color: '#3b82f6' }, // Blue
    { name: 'PQC Type', value: 25, color: '#10b981' }, // Green
    { name: 'PQC Rate', value: 20, color: '#a855f7' }, // Purple
    { name: 'Other', value: 10, color: '#9ca3af' }, // Gray
];

export default function Dashboard() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-textMuted">Migrating Classically Encrypted Assets to PQC Compliant</p>
                </div>
                <button className="btn-primary px-6 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all">
                    Start Migration
                </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Migration Progress Chart */}
                <div className="card-glass p-6 bg-[#161b22] border-white/5 col-span-1 lg:col-span-1 min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-medium text-white mb-6">Migration Progress</h3>
                    <div className="flex-1 w-full h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={migrationData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                                <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Asset Pie Chart */}
                <div className="card-glass p-6 bg-[#161b22] border-white/5 col-span-1 lg:col-span-1 min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-medium text-white mb-6">Asset Encryption Types</h3>
                    <div className="flex gap-4 text-xs mb-4 flex-wrap">
                        {pieData.map(d => (
                            <div key={d.name} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-textMuted">{d.name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                            {/* Could put total here */}
                        </div>
                    </div>
                </div>

                {/* Recent Jobs List */}
                <div className="card-glass p-6 bg-[#161b22] border-white/5 col-span-1 lg:col-span-1 min-h-[300px] flex flex-col">
                    <h3 className="text-lg font-medium text-white mb-6">Recent Jobs</h3>
                    <div className="flex-1 space-y-4 overflow-auto">
                        {[1, 2, 3, 4].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                        <Activity size={16} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm text-white">QuantumVault</p>
                                        <p className="text-xs text-textMuted">2 hours ago - Status</p>
                                    </div>
                                </div>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Status
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
