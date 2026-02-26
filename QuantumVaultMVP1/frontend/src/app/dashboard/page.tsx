import { Activity, Shield, KeyRound, Lock } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { mockMetrics } from '@/lib/mockData';

export default function DashboardIndexPage() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400" />
          Overview
        </h1>
        <p className="text-white/60 mt-1">QuantumVault system status at a glance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <GlassPanel className="p-4">
          <p className="text-xs text-white/60 uppercase tracking-wide">Active Sessions</p>
          <p className="text-2xl font-bold text-white mt-2">{mockMetrics.activeSessions}</p>
        </GlassPanel>

        <GlassPanel className="p-4">
          <p className="text-xs text-white/60 uppercase tracking-wide">Total Keys</p>
          <p className="text-2xl font-bold text-white mt-2">{mockMetrics.totalKeys}</p>
        </GlassPanel>

        <GlassPanel className="p-4">
          <p className="text-xs text-white/60 uppercase tracking-wide">Compliance Score</p>
          <p className="text-2xl font-bold text-white mt-2">{mockMetrics.complianceScore}%</p>
        </GlassPanel>

        <GlassPanel className="p-4">
          <p className="text-xs text-white/60 uppercase tracking-wide">HNDL Exposure</p>
          <p className="text-2xl font-bold text-white mt-2 uppercase">{mockMetrics.hndlExposure}</p>
        </GlassPanel>
      </div>

      <GlassPanel className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Platform Posture</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-4">
            <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Policy Enforcement</p>
              <p className="text-white/60 text-sm">{mockMetrics.activePolicies} active cryptographic policies.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-4">
            <KeyRound className="w-5 h-5 text-violet-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Key Rotation</p>
              <p className="text-white/60 text-sm">{mockMetrics.keyRotations24h} key rotations in the last 24 hours.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-4">
            <Lock className="w-5 h-5 text-cyan-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">PQC Transport</p>
              <p className="text-white/60 text-sm">{mockMetrics.pqcTunnels} active PQC-secured tunnels.</p>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
