'use client';

import { useState, useEffect } from 'react';
import {
    AlertTriangle,
    Shield,
    Info,
    ChevronDown,
    ChevronUp,
    Search
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Tooltip } from '@/components/ui/Tooltip';
import { threatMappings as mockThreatMappings, type ThreatMapping } from '@/lib/mockData';
import { threatsAPI } from '@/lib/api';

export default function ThreatsPage() {
    const [threatMappings, setThreatMappings] = useState<ThreatMapping[]>(mockThreatMappings);
    const [loading, setLoading] = useState(true);
    const [expandedThreat, setExpandedThreat] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchThreats = async () => {
            try {
                setLoading(true);
                const data = await threatsAPI.getMappings();
                setThreatMappings(data);
            } catch (error) {
                console.error('Failed to fetch threats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchThreats();
    }, []);


    const getSeverityClass = (severity: ThreatMapping['severity']) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'high': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
        }
    };

    const filteredThreats = threatMappings.filter(threat =>
        threat.threatVector.toLowerCase().includes(searchQuery.toLowerCase()) ||
        threat.failureWithoutControl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        threat.quantumVaultControl.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const threatStats = {
        critical: threatMappings.filter(t => t.severity === 'critical').length,
        high: threatMappings.filter(t => t.severity === 'high').length,
        medium: threatMappings.filter(t => t.severity === 'medium').length,
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-cyan-400" />
                    Threat Mapping
                </h1>
                <p className="text-white/60 mt-1">
                    Threat-to-control matrix for <Tooltip term="PQC">PQC</Tooltip> security posture
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <GlassPanel className="p-4 text-center border-l-4 border-l-red-500">
                    <div className="text-2xl font-bold text-red-400">{threatStats.critical}</div>
                    <div className="text-xs text-white/50">Critical Threats Mitigated</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center border-l-4 border-l-amber-500">
                    <div className="text-2xl font-bold text-amber-400">{threatStats.high}</div>
                    <div className="text-xs text-white/50">High Threats Mitigated</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center border-l-4 border-l-blue-500">
                    <div className="text-2xl font-bold text-blue-400">{threatStats.medium}</div>
                    <div className="text-xs text-white/50">Medium Threats Mitigated</div>
                </GlassPanel>
            </div>

            {/* Search */}
            <GlassPanel className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search threats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50"
                    />
                </div>
            </GlassPanel>

            {/* Threat Matrix */}
            <GlassPanel className="overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-cyan-400" />
                        Threat-to-Control Matrix
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="quantum-table">
                        <thead>
                            <tr>
                                <th className="w-1/6">Threat Vector</th>
                                <th className="w-1/6">Severity</th>
                                <th className="w-2/6">Failure Without Control</th>
                                <th className="w-2/6">QuantumVault Control</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredThreats.map((threat) => (
                                <tr
                                    key={threat.id}
                                    className={threat.highlighted ? 'bg-cyan-500/5' : ''}
                                    onClick={() => setExpandedThreat(expandedThreat === threat.id ? null : threat.id)}
                                >
                                    <td className="font-medium text-white">
                                        <div className="flex items-center gap-2">
                                            {threat.highlighted && (
                                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                            )}
                                            {threat.threatVector === 'HNDL Attack' ? (
                                                <Tooltip term="HNDL">{threat.threatVector}</Tooltip>
                                            ) : threat.threatVector === 'PKI Collapse' ? (
                                                <span>{threat.threatVector}</span>
                                            ) : (
                                                threat.threatVector
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getSeverityClass(threat.severity)}`}>
                                            {threat.severity}
                                        </span>
                                    </td>
                                    <td className="text-red-300/80 text-sm">{threat.failureWithoutControl}</td>
                                    <td className="text-green-300/80 text-sm">{threat.quantumVaultControl}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassPanel>

            {/* Key Threat Highlights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {threatMappings.filter(t => t.highlighted).map((threat) => (
                    <GlassPanel
                        key={threat.id}
                        className={`p-5 border-l-4 ${threat.severity === 'critical' ? 'border-l-red-500' : 'border-l-amber-500'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <AlertTriangle className={`w-5 h-5 shrink-0 ${threat.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                                }`} />
                            <div>
                                <h4 className="font-semibold text-white mb-2">
                                    {threat.threatVector === 'HNDL Attack' ? (
                                        <Tooltip term="HNDL">{threat.threatVector}</Tooltip>
                                    ) : (
                                        threat.threatVector
                                    )}
                                </h4>
                                <p className="text-sm text-white/60 mb-3">{threat.failureWithoutControl}</p>
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Shield className="w-4 h-4 text-green-400" />
                                        <span className="text-xs font-medium text-green-400">Protected By</span>
                                    </div>
                                    <p className="text-sm text-green-300/80">{threat.quantumVaultControl}</p>
                                </div>
                            </div>
                        </div>
                    </GlassPanel>
                ))}
            </div>

            {/* Info Box */}
            <GlassPanel className="p-5 quantum-border">
                <div className="flex gap-3">
                    <Info className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                        <h4 className="text-sm font-semibold text-white mb-1">Understanding Quantum Threats</h4>
                        <p className="text-xs text-white/60 leading-relaxed">
                            <Tooltip term="CRQC">CRQC</Tooltip> (Cryptographically Relevant Quantum Computer) threats
                            are expected to materialize between 2030-2035. The <Tooltip term="HNDL">HNDL</Tooltip> attack
                            strategy means adversaries are already collecting encrypted data for future decryption.
                            QuantumVault's <Tooltip term="PQC">PQC</Tooltip> implementation provides protection today.
                        </p>
                    </div>
                </div>
            </GlassPanel>
        </div>
    );
}
