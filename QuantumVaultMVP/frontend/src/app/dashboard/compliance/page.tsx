'use client';

import { useState, useEffect } from 'react';
import {
    FileCheck,
    CheckCircle,
    AlertTriangle,
    Clock,
    Shield,
    ExternalLink
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Tooltip } from '@/components/ui/Tooltip';
import { complianceAPI } from '@/lib/api';

export interface ComplianceItem {
    id: string;
    standard: string;
    requirement: string;
    status: 'compliant' | 'partial' | 'non-compliant' | 'in-progress';
    lastAudit: string;
}

export default function CompliancePage() {
    const [complianceData, setComplianceData] = useState<ComplianceItem[]>([]);
    const [migrationProgress, setMigrationProgress] = useState({
        overall: 0,
        discovery: 0,
        assessment: 0,
        migration: 0,
        validation: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [standardsData, progressData] = await Promise.all([
                    complianceAPI.getStandards(),
                    complianceAPI.getMigrationProgress()
                ]);
                setComplianceData(standardsData);
                setMigrationProgress(progressData);
            } catch (error) {
                console.error('Failed to fetch compliance data:', error);
                setError('Failed to load compliance standards and migration progress from server.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getStatusIcon = (status: ComplianceItem['status']) => {
        switch (status) {
            case 'compliant': return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'partial': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            case 'in-progress': return <Clock className="w-5 h-5 text-blue-400" />;
            case 'non-compliant': return <AlertTriangle className="w-5 h-5 text-red-400" />;
        }
    };

    const getStatusClass = (status: ComplianceItem['status']) => {
        switch (status) {
            case 'compliant': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'partial': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case 'in-progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'non-compliant': return 'bg-red-500/20 text-red-400 border-red-500/30';
        }
    };

    const nistStandards = complianceData.filter(c => c.standard.includes('NIST'));
    const regulatoryCompliance = complianceData.filter(c => !c.standard.includes('NIST'));

    const complianceStats = {
        compliant: complianceData.filter(c => c.status === 'compliant').length,
        partial: complianceData.filter(c => c.status === 'partial').length,
        inProgress: complianceData.filter(c => c.status === 'in-progress').length,
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                    <FileCheck className="w-8 h-8 text-cyan-400" />
                    Compliance & Standards
                </h1>
                <p className="text-white/60 mt-1">
                    <Tooltip term="NIST">NIST</Tooltip> FIPS alignment and regulatory compliance status
                </p>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {loading ? (
                <div className="text-white/40 text-center animate-pulse p-12">Loading compliance details...</div>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <GlassPanel className="p-4 text-center">
                            <div className="text-2xl font-bold text-white">{complianceData.length}</div>
                            <div className="text-xs text-white/50">Total Standards</div>
                        </GlassPanel>
                        <GlassPanel className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-400">{complianceStats.compliant}</div>
                            <div className="text-xs text-white/50">Compliant</div>
                        </GlassPanel>
                        <GlassPanel className="p-4 text-center">
                            <div className="text-2xl font-bold text-amber-400">{complianceStats.partial}</div>
                            <div className="text-xs text-white/50">Partial</div>
                        </GlassPanel>
                        <GlassPanel className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-400">{complianceStats.inProgress}</div>
                            <div className="text-xs text-white/50">In Progress</div>
                        </GlassPanel>
                    </div>

                    {/* NIST PQC Standards */}
                    <GlassPanel className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-cyan-400" />
                            <Tooltip term="NIST">NIST</Tooltip> PQC Standards
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {nistStandards.map((item) => (
                                <div
                                    key={item.id}
                                    className={`p-4 rounded-lg border ${getStatusClass(item.status)}`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        {getStatusIcon(item.status)}
                                        <span className="text-xs opacity-70">{item.lastAudit}</span>
                                    </div>
                                    <h4 className="font-semibold text-white mb-1">{item.standard}</h4>
                                    <p className="text-sm opacity-80">{item.requirement}</p>
                                </div>
                            ))}
                        </div>
                    </GlassPanel>

                    {/* Migration Progress */}
                    <GlassPanel className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-cyan-400" />
                                <Tooltip term="NIST">NIST</Tooltip> SP 800-208 Migration Progress
                            </h3>
                            <span className="text-2xl font-bold quantum-gradient-text">{migrationProgress.overall}%</span>
                        </div>

                        {/* Overall Progress Bar */}
                        <div className="mb-6">
                            <div className="progress-bar h-3">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${migrationProgress.overall}%` }}
                                />
                            </div>
                        </div>

                        {/* Phase Progress */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white/60">Discovery</span>
                                    <span className="text-sm font-bold text-green-400">{migrationProgress.discovery}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-bar-fill" style={{ width: `${migrationProgress.discovery}%` }} />
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white/60">Assessment</span>
                                    <span className="text-sm font-bold text-green-400">{migrationProgress.assessment}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-bar-fill" style={{ width: `${migrationProgress.assessment}%` }} />
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white/60">Migration</span>
                                    <span className="text-sm font-bold text-cyan-400">{migrationProgress.migration}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-bar-fill" style={{ width: `${migrationProgress.migration}%` }} />
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-white/60">Validation</span>
                                    <span className="text-sm font-bold text-amber-400">{migrationProgress.validation}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-bar-fill" style={{ width: `${migrationProgress.validation}%` }} />
                                </div>
                            </div>
                        </div>
                    </GlassPanel>

                    {/* Regulatory Compliance */}
                    <GlassPanel className="overflow-hidden">
                        <div className="p-4 border-b border-white/10">
                            <h3 className="text-lg font-semibold text-white">Regulatory Compliance</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="quantum-table">
                                <thead>
                                    <tr>
                                        <th>Standard</th>
                                        <th>Requirement</th>
                                        <th>Status</th>
                                        <th>Last Audit</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {regulatoryCompliance.map((item) => (
                                        <tr key={item.id}>
                                            <td className="font-medium text-white">{item.standard}</td>
                                            <td className="text-white/70 text-sm">{item.requirement}</td>
                                            <td>
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${getStatusClass(item.status)}`}>
                                                    {getStatusIcon(item.status)}
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="text-white/50 text-sm">{item.lastAudit}</td>
                                            <td>
                                                <button className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-cyan-400 transition-colors">
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </GlassPanel>
                </>
            )}
        </div>
    );
}
