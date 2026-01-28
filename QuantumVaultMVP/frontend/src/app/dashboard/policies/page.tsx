'use client';

import { useState, useEffect } from 'react';
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
    XCircle,
    Play,
    Pause,
    User,
    Users,
    FileText,
    Database,
    Building,
    Clock,
    Calendar,
    Briefcase,
    HardDrive
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { mockPolicies } from '@/lib/mockData';
import { policiesAPI } from '@/lib/api';

// Frontend Policy Interface matching the UI needs
export interface Policy {
    id: string;
    name: string;
    description: string;
    type: 'rotation' | 'revocation' | 'geo-fencing' | 'access';
    status: 'enforced' | 'monitoring' | 'disabled';
    lastUpdated: string;
    isActive?: boolean;
}

export default function PoliciesPage() {
    const [loading, setLoading] = useState(true);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'activate' | 'deactivate'; policy: Policy } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'rotation',
        isActive: false
    });

    const [advancedConfig, setAdvancedConfig] = useState({
        fileTypes: [] as string[],
        storageLocations: [] as string[],
        departments: [] as string[],
        people: [] as string[],
        timeFrequency: { value: 30, unit: 'days' }
    });

    const toggleSelection = (field: keyof typeof advancedConfig, value: string) => {
        setAdvancedConfig(prev => {
            const list = prev[field] as string[];
            const newList = list.includes(value)
                ? list.filter(item => item !== value)
                : [...list, value];
            return { ...prev, [field]: newList };
        });
    };

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            const data = await policiesAPI.getPolicies();

            const mappedPolicies: Policy[] = data.map((p: any) => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                type: 'access', // Default as backend doesn't store type explicitly yet
                status: p.isActive ? 'enforced' : 'disabled',
                lastUpdated: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                isActive: p.isActive
            }));

            setPolicies(mappedPolicies);
        } catch (error) {
            console.error('Failed to fetch policies:', error);
            // Fallback for demo - minimal mapping for error case
            setPolicies([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

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

    const [comprehensiveFormData, setComprehensiveFormData] = useState({
        name: '',
        description: '',
        isActive: false
    });

    const defaultAdvancedConfig = {
        fileTypes: [] as string[],
        storageLocations: [] as string[],
        departments: [] as string[],
        people: [] as string[],
        timeFrequency: { value: 30, unit: 'days' }
    };

    const handleQuickCreatePolicy = async () => {
        try {
            await policiesAPI.createPolicy({
                name: formData.name || 'New Policy',
                description: formData.description || 'Created via dashboard',
                rules: [defaultAdvancedConfig], // Use default config for quick create
                isActive: formData.isActive
            });
            // Reset form and refresh
            setFormData({ name: '', description: '', type: 'rotation', isActive: false });
            fetchPolicies();
            alert('Policy created successfully!');
        } catch (error) {
            console.error('Failed to create policy:', error);
            alert(`Failed to create policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleComprehensiveCreatePolicy = async () => {
        try {
            await policiesAPI.createPolicy({
                name: comprehensiveFormData.name || 'New Policy',
                description: comprehensiveFormData.description || 'Comprehensive Policy',
                rules: [advancedConfig], // Use selected advanced config
                isActive: comprehensiveFormData.isActive
            });
            // Reset form and refresh
            setComprehensiveFormData({ name: '', description: '', isActive: false });
            setAdvancedConfig(defaultAdvancedConfig);
            fetchPolicies();
            alert('Comprehensive Policy created successfully!');
        } catch (error) {
            console.error('Failed to create policy:', error);
            alert(`Failed to create policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const executeAction = async () => {
        if (!confirmAction) return;

        try {
            if (confirmAction.type === 'delete') {
                await policiesAPI.deletePolicy(confirmAction.policy.id);
            } else if (confirmAction.type === 'activate') {
                await policiesAPI.activatePolicy(confirmAction.policy.id);
            } else if (confirmAction.type === 'deactivate') {
                await policiesAPI.deactivatePolicy(confirmAction.policy.id);
            }
            fetchPolicies();
        } catch (error) {
            console.error(`Failed to ${confirmAction.type} policy:`, error);
        } finally {
            setConfirmAction(null);
            setSelectedPolicy(null);
        }
    };

    const handleDelete = (policy: Policy) => {
        setConfirmAction({ type: 'delete', policy });
    };

    const handleToggleActive = (policy: Policy) => {
        setConfirmAction({
            type: policy.isActive ? 'deactivate' : 'activate',
            policy
        });
    };

    const policyStats = {
        total: policies.length,
        enforced: policies.filter(p => p.status === 'enforced').length,
        monitoring: policies.filter(p => p.status === 'monitoring').length,
    };

    // No longer needed since buttons are independent
    // const isAdvancedConfigModified = ...

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
                <Button variant="primary" className="flex items-center gap-2 opacity-50 cursor-not-allowed hidden">
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

            {/* Policy Form - Quick Creation */}
            <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Policy Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Policy Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Auto Key Rotation"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Description</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Policy description..."
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Policy Type</label>
                        <select
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="rotation">Key Rotation</option>
                            <option value="revocation">Revocation</option>
                            <option value="geo-fencing">Geo-Fencing</option>
                            <option value="access">Access Control</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Initial Status</label>
                        <div className="flex items-center gap-3 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="accent-cyan-400 w-4 h-4"
                                />
                                <span className="text-white text-sm">Active</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button variant="primary" onClick={handleQuickCreatePolicy} disabled={!formData.name}>
                        Create Policy
                    </Button>
                </div>
            </GlassPanel>

            {/* Policy Creation - Granular Controls */}
            <GlassPanel className="p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Shield className="w-24 h-24 text-cyan-400" />
                </div>

                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-cyan-400" />
                    Policy Creation
                </h3>

                {/* Comprehensive Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 pb-8 border-b border-white/10">
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Policy Name</label>
                        <input
                            type="text"
                            value={comprehensiveFormData.name}
                            onChange={(e) => setComprehensiveFormData({ ...comprehensiveFormData, name: e.target.value })}
                            placeholder="e.g., Comprehensive Security Policy"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Description</label>
                        <input
                            type="text"
                            value={comprehensiveFormData.description}
                            onChange={(e) => setComprehensiveFormData({ ...comprehensiveFormData, description: e.target.value })}
                            placeholder="Detailed policy description..."
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-white/60 mb-2">Initial Status</label>
                        <div className="flex items-center gap-3 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={comprehensiveFormData.isActive}
                                    onChange={(e) => setComprehensiveFormData({ ...comprehensiveFormData, isActive: e.target.checked })}
                                    className="accent-cyan-400 w-4 h-4"
                                />
                                <span className="text-white text-sm">Active</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Column 1: Asset Scope */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-medium text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Asset Scope
                        </h4>

                        <div className="space-y-3">
                            <label className="text-xs text-white/50 block">File Types</label>
                            <div className="flex flex-wrap gap-2">
                                {['PDF', 'DOCX', 'XLSX', 'Source Code', 'Keys'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => toggleSelection('fileTypes', type)}
                                        className={`px-3 py-1.5 rounded-md text-xs border transition-all ${advancedConfig.fileTypes.includes(type)
                                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs text-white/50 block">Storage Locations</label>
                            <div className="space-y-2">
                                {['AWS S3 (us-east-1)', 'On-Premise Vault', 'Azure Blob', 'Google Drive (Corporate)'].map(loc => (
                                    <label key={loc} className="flex items-center gap-2 cursor-pointer group">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${advancedConfig.storageLocations.includes(loc)
                                            ? 'bg-cyan-500 border-cyan-500'
                                            : 'border-white/30 group-hover:border-white/50'
                                            }`}
                                            onClick={() => toggleSelection('storageLocations', loc)}
                                        >
                                            {advancedConfig.storageLocations.includes(loc) && <CheckCircle className="w-3 h-3 text-black" />}
                                        </div>
                                        <span className={`text-sm ${advancedConfig.storageLocations.includes(loc) ? 'text-white' : 'text-white/60'
                                            }`}>{loc}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Entities & Access */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-medium text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4" /> Entities & Access
                        </h4>

                        <div className="space-y-3">
                            <label className="text-xs text-white/50 block">Departments</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Engineering', 'HR', 'Finance', 'Legal', 'Operations', 'Executive'].map(dept => (
                                    <button
                                        key={dept}
                                        onClick={() => toggleSelection('departments', dept)}
                                        className={`px-3 py-2 rounded-lg text-xs text-left transition-all flex items-center gap-2 ${advancedConfig.departments.includes(dept)
                                            ? 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/50'
                                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        <Building className="w-3 h-3" />
                                        {dept}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs text-white/50 block">Specific Personnel</label>
                            <div className="bg-black/20 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                                {['Alice Chen (CISO)', 'Bob Smith (DevOps)', 'Carol Wu (Legal)', 'David Miller (HR)'].map(person => (
                                    <div
                                        key={person}
                                        onClick={() => toggleSelection('people', person)}
                                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer ${advancedConfig.people.includes(person) ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'
                                            }`}
                                    >
                                        <User className="w-3 h-3" />
                                        <span className="text-xs">{person}</span>
                                        {advancedConfig.people.includes(person) && <CheckCircle className="w-3 h-3 ml-auto text-cyan-400" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Timeline & Actions */}
                    <div className="space-y-6">
                        <h4 className="text-sm font-medium text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Frequency & Retension
                        </h4>

                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <label className="text-xs text-white/50 block mb-3">Rotation/Review Frequency</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={advancedConfig.timeFrequency.value}
                                    onChange={(e) => setAdvancedConfig({
                                        ...advancedConfig,
                                        timeFrequency: { ...advancedConfig.timeFrequency, value: parseInt(e.target.value) || 0 }
                                    })}
                                    className="w-20 bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-center focus:border-cyan-400 focus:outline-none"
                                />
                                <select
                                    value={advancedConfig.timeFrequency.unit}
                                    onChange={(e) => setAdvancedConfig({
                                        ...advancedConfig,
                                        timeFrequency: { ...advancedConfig.timeFrequency, unit: e.target.value as any }
                                    })}
                                    className="flex-1 bg-black/40 border border-white/20 rounded px-3 py-2 text-white/80 focus:border-cyan-400 focus:outline-none"
                                >
                                    <option value="days">Days</option>
                                    <option value="weeks">Weeks</option>
                                    <option value="months">Months</option>
                                    <option value="years">Years</option>
                                </select>
                            </div>
                            <p className="text-xs text-white/40 mt-2 flex items-center gap-1.5">
                                <RotateCw className="w-3 h-3" />
                                Next rotation: {new Date(Date.now() + advancedConfig.timeFrequency.value * (
                                    advancedConfig.timeFrequency.unit === 'days' ? 86400000 :
                                        advancedConfig.timeFrequency.unit === 'weeks' ? 604800000 :
                                            advancedConfig.timeFrequency.unit === 'months' ? 2592000000 : 31536000000
                                )).toLocaleDateString()}
                            </p>
                        </div>

                        <div className="pt-4">
                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full h-12 text-sm uppercase tracking-wide shadow-lg shadow-cyan-500/20"
                                onClick={handleComprehensiveCreatePolicy}
                                disabled={!comprehensiveFormData.name}
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                Create Comprehensive Policy
                            </Button>
                        </div>
                    </div>
                </div>
            </GlassPanel>

            {/* Policies Table */}
            <GlassPanel className="overflow-hidden">
                <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Active Policies</h3>
                </div>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-white/50 animate-pulse">Loading policies...</div>
                    ) : (
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
                                                    onClick={() => handleToggleActive(policy)}
                                                    className={`p-1.5 rounded hover:bg-white/10 transition-colors ${policy.isActive ? 'text-green-400' : 'text-white/40'}`}
                                                    title={policy.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    {policy.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-cyan-400 transition-colors"
                                                    title="Edit"
                                                    onClick={() => setSelectedPolicy(policy)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                    onClick={() => handleDelete(policy)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </GlassPanel>

            {/* Policy Detail Modal */}
            <Modal
                isOpen={!!selectedPolicy && !confirmAction}
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
                            <Button variant="ghost" onClick={() => handleDelete(selectedPolicy)} className="flex-1 text-red-400 hover:bg-red-500/10">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={executeAction}
                title={confirmAction?.type === 'delete' ? 'Delete Policy?' : confirmAction?.type === 'activate' ? 'Activate Policy?' : 'Deactivate Policy?'}
                message={
                    confirmAction?.type === 'delete'
                        ? `Are you sure you want to delete "${confirmAction.policy.name}"? This action cannot be undone.`
                        : `Are you sure you want to ${confirmAction?.type} "${confirmAction?.policy.name}"?`
                }
                confirmLabel={confirmAction?.type === 'delete' ? 'Delete' : confirmAction?.type === 'activate' ? 'Activate' : 'Deactivate'}
                variant={confirmAction?.type === 'delete' ? 'danger' : 'default'}
            />
        </div>
    );
}
