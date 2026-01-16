'use client';

import { useState } from 'react';
import {
    Shield,
    Plus,
    Edit,
    Trash2,
    CheckCircle,
    AlertTriangle,
    Eye,
    Globe,
    RotateCw,
    XCircle
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { mockPolicies, type Policy } from '@/lib/mockData';

export default function PoliciesPage() {
    const [policies, setPolicies] = useState<Policy[]>(mockPolicies);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const getStatusIcon = (status: Policy['status']) => {
        switch (status) {
            case 'enforced': return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'monitoring': return <Eye className="w-4 h-4 text-amber-400" />;
            case 'disabled': return <XCircle className="w-4 h-4 text-white/40" />;
        }
    };

    const getStatusClass = (status: Policy['status']) => {
        switch (status) {
            case 'enforced': return 'status-success';
            case 'monitoring': return 'status-warning';
            case 'disabled': return 'bg-white/10 text-white/50';
        }
    };

    const getTypeIcon = (type: Policy['type']) => {
        switch (type) {
            case 'rotation': return <RotateCw className="w-4 h-4" />;
            case 'revocation': return <XCircle className="w-4 h-4" />;
            case 'geo-fencing': return <Globe className="w-4 h-4" />;
            case 'access': return <Shield className="w-4 h-4" />;
        }
    };

    const getTypeClass = (type: Policy['type']) => {
        switch (type) {
            case 'rotation': return 'text-cyan-400 bg-cyan-500/20';
            case 'revocation': return 'text-red-400 bg-red-500/20';
            case 'geo-fencing': return 'text-purple-400 bg-purple-500/20';
            case 'access': return 'text-green-400 bg-green-500/20';
        }
    };

    const policyStats = {
        total: policies.length,
        enforced: policies.filter(p => p.status === 'enforced').length,
        monitoring: policies.filter(p => p.status === 'monitoring').length,
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-cyan-400" />
                        Policy Orchestrator
                    </h1>
                    <p className="text-white/60 mt-1">
                        Manage key rotation, revocation, and access policies
                    </p>
                </div>
                <Button variant="primary" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Policy
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-white">{policyStats.total}</div>
                    <div className="text-xs text-white/50">Total Policies</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{policyStats.enforced}</div>
                    <div className="text-xs text-white/50">Enforced</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">{policyStats.monitoring}</div>
                    <div className="text-xs text-white/50">Monitoring</div>
                </GlassPanel>
            </div>

            {/* Policy Form */}
            <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Policy Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Policy Type</label>
                        <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50">
                            <option value="rotation">Key Rotation</option>
                            <option value="revocation">Revocation</option>
                            <option value="geo-fencing">Geo-Fencing</option>
                            <option value="access">Access Control</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Rotation Interval</label>
                        <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50">
                            <option value="30">30 Days</option>
                            <option value="60">60 Days</option>
                            <option value="90">90 Days</option>
                            <option value="180">180 Days</option>
                            <option value="365">365 Days</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Allowed Regions</label>
                        <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50">
                            <option value="all">All Regions</option>
                            <option value="us">United States</option>
                            <option value="eu">European Union</option>
                            <option value="apac">Asia-Pacific</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Enforcement</label>
                        <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50">
                            <option value="enforced">Enforce</option>
                            <option value="monitoring">Monitor Only</option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button variant="primary">
                        Apply Configuration
                    </Button>
                </div>
            </GlassPanel>

            {/* Policies Table */}
            <GlassPanel className="overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Active Policies</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="quantum-table">
                        <thead>
                            <tr>
                                <th>Policy Name</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Last Updated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {policies.map((policy) => (
                                <tr key={policy.id} onClick={() => setSelectedPolicy(policy)}>
                                    <td className="font-medium text-white">{policy.name}</td>
                                    <td>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getTypeClass(policy.type)}`}>
                                            {getTypeIcon(policy.type)}
                                            {policy.type}
                                        </span>
                                    </td>
                                    <td className="text-white/60 text-sm max-w-xs truncate">{policy.description}</td>
                                    <td>
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getStatusClass(policy.status)}`}>
                                            {getStatusIcon(policy.status)}
                                            {policy.status}
                                        </span>
                                    </td>
                                    <td className="text-white/50 text-sm">{policy.lastUpdated}</td>
                                    <td>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-cyan-400 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassPanel>

            {/* Policy Detail Modal */}
            <Modal
                isOpen={!!selectedPolicy}
                onClose={() => setSelectedPolicy(null)}
                title={selectedPolicy?.name || 'Policy Details'}
                size="md"
            >
                {selectedPolicy && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-white/50">Policy ID</label>
                                <p className="font-mono text-cyan-400">{selectedPolicy.id}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/50">Type</label>
                                <p className="text-white capitalize">{selectedPolicy.type}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/50">Status</label>
                                <p className="text-white capitalize">{selectedPolicy.status}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/50">Last Updated</label>
                                <p className="text-white">{selectedPolicy.lastUpdated}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-white/50">Description</label>
                                <p className="text-white/80">{selectedPolicy.description}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-white/10">
                            <Button variant="outline" className="flex-1">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Policy
                            </Button>
                            <Button variant="ghost" className="flex-1 text-red-400 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
