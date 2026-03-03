import React, { useState } from 'react';
import { Shield, CheckCircle, Lock, Search, FileText, Server, Clock, Database, ArrowRight, Activity, Hexagon } from 'lucide-react';
import { cn } from './utils';

// Mock Data
const MOCK_DB: Record<string, { hash: string, signer: string, timestamp: number, valid: boolean }> = {
  "0x123...abc": {
    hash: "0x123...abc",
    signer: "Pension Fund A",
    timestamp: 1735689600,
    valid: true
  },
};

function App() {
  const [searchHash, setSearchHash] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setResult(MOCK_DB[searchHash] || null);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground p-4 md:p-8">

      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/10 via-background to-background" />

      {/* Main Grid Container (Bento Layout) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">

        {/* Header / Nav Card */}
        <header className="col-span-1 md:col-span-3 lg:col-span-4 glass rounded-3xl p-6 flex items-center justify-between sticky top-4 z-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <span className="font-bold text-xl tracking-tight">QP-IAL</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
            <span className="text-white">Dashboard</span>
            <span className="hover:text-white cursor-pointer transition-colors">Audit Logs</span>
            <span className="hover:text-white cursor-pointer transition-colors">Settings</span>
          </nav>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-400" />
        </header>

        {/* Hero Card */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 glass rounded-3xl p-8 md:p-12 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-all duration-700" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-300 mb-6">
              <Activity className="w-3 h-3" /> Live Audit System
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-white/90 to-white/50 bg-clip-text text-transparent">
              Trust for Deep Time.
            </h1>
            <p className="text-lg text-gray-400 leading-relaxed max-w-md">
              A tamper-proof ledger secured by ML-DSA signatures.
              Ensuring today's records survive the quantum era for pension funds & sovereign wealth.
            </p>
          </div>

          <div className="mt-8 flex gap-4 relative z-10">
            <button className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2">
              Documentation <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Verification Card (Main Interactive Module) */}
        <div className="col-span-1 md:col-span-1 lg:col-span-2 row-span-2 glass rounded-3xl p-8 border border-white/10 flex flex-col relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
              <Search className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-xl font-bold">Verify Record</h2>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  value={searchHash}
                  onChange={(e) => setSearchHash(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-4 pr-12 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.02] transition-all font-mono text-sm"
                  placeholder="Enter PQC Signed Hash..."
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-white/5 rounded-md text-xs text-gray-500 border border-white/5">
                  Hash
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loading ? "Verifying ML-DSA..." : "Verify Integrity"}
              </button>
            </form>

            {/* Result Display */}
            {result && (
              <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1" />
                  <div className="space-y-1">
                    <p className="font-semibold text-green-400">Valid Entry Found</p>
                    <p className="text-xs text-green-400/70">Signature verified against ML-DSA Public Key.</p>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <span className="text-xs text-gray-500 uppercase">Signer</span>
                        <p className="text-sm font-mono text-white">{result.signer}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase">Timestamp</span>
                        <p className="text-sm font-mono text-white">{new Date(result.timestamp * 1000).getFullYear()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!result && !loading && searchHash !== "" && (
              <div className="mt-4 text-center">
                <span className="text-xs text-gray-500">Hint: Try </span>
                <button onClick={() => setSearchHash("0x123...abc")} className="text-xs text-blue-400 hover:underline font-mono">0x123...abc</button>
              </div>
            )}
          </div>
        </div>

        {/* Stat / Info Cards */}
        <StatCard
          icon={<Server className="w-5 h-5 text-purple-400" />}
          label="Ledger Height"
          value="1,402,120"
          sub="Blocks"
        />
        <StatCard
          icon={<Database className="w-5 h-5 text-pink-400" />}
          label="Root Hash (SMT)"
          value="0x8f...2a"
          sub="Finalized"
          mono
        />
        <StatCard
          icon={<Hexagon className="w-5 h-5 text-yellow-400" />}
          label="Active Nodes"
          value="84"
          sub="Global"
        />

        {/* Feature / Compliance Cards */}
        <div className="col-span-1 md:col-span-2 lg:col-span-2 glass rounded-3xl p-8 flex flex-col justify-center">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" /> Compliance Ready
          </h3>
          <div className="space-y-3">
            <ComplianceItem text="Pension Fund Asset Allocation (50yr+)" />
            <ComplianceItem text="Pharma Supply Chain Audits" />
            <ComplianceItem text="Sovereign Wealth Fund Transparency" />
          </div>
        </div>

        <div className="col-span-1 glass rounded-3xl p-8 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-50" />
          <Lock className="w-12 h-12 text-blue-400 mb-4" />
          <h3 className="font-bold mb-2">Quantum Safe</h3>
          <p className="text-xs text-gray-400">Upgrade to ML-DSA <br /> before Y2Q.</p>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, mono }: any) {
  return (
    <div className="col-span-1 glass rounded-3xl p-6 flex flex-col justify-between hover:bg-white/[0.07] transition-colors cursor-default">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-gray-400">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{label}</div>
        <div className={cn("text-2xl font-bold text-white", mono && "font-mono text-xl")}>{value}</div>
        <div className="text-xs text-gray-600 mt-1">{sub}</div>
      </div>
    </div>
  );
}

function ComplianceItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
      <div className="min-w-4 min-h-4 rounded-full border-2 border-blue-500/50" />
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  )
}

export default App;
