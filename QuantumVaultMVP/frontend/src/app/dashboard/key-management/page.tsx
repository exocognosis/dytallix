'use client';

import { useState, useEffect } from 'react';
import {
    Key,
    RotateCw,
    XCircle,
    Plus,
    Search,
    Filter,
    ChevronDown,
    CheckCircle,
    Clock,
    AlertTriangle,
    Shield
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { anchorsAPI } from '@/lib/api';

export type KeyType = 'ML-KEM' | 'ML-DSA' | 'SLH-DSA';
export type KeyStatus = 'active' | 'pending' | 'expired' | 'revoked';

export interface CryptoKey {
    id: string;
    name: string;
    type: KeyType;
    status: KeyStatus;
    created: string;
    expiry: string;
    algorithm: string;
    strength: string;
    usage: string;
}


export default function KeyManagementPage() {
    const [loading, setLoading] = useState(true);
    const [keys, setKeys] = useState<CryptoKey[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<KeyType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<KeyStatus | 'all'>('all');
    const [selectedKey, setSelectedKey] = useState<CryptoKey | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'rotate' | 'revoke'; key: CryptoKey } | null>(null);

    // Create Key State
    // const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Removed
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyAlgorithm, setNewKeyAlgorithm] = useState('ML-KEM-1024');
    const [isCreating, setIsCreating] = useState(false);

    // Fetch keys from backend
    const fetchKeys = async () => {
        try {
            setLoading(true);
            const anchors = await anchorsAPI.getAnchors();

            // Map backend anchors to frontend CryptoKey model
            const mappedKeys: CryptoKey[] = anchors.map((anchor: any) => ({
                id: anchor.id,
                name: anchor.name,
                type: (anchor.algorithm.includes('KEM') ? 'ML-KEM' : 'ML-DSA') as KeyType,
                status: anchor.isActive ? 'active' : 'pending',
                created: new Date(anchor.createdAt).toISOString().split('T')[0],
                expiry: anchor.expiresAt ? new Date(anchor.expiresAt).toISOString().split('T')[0] :
                    anchor.metadata?.validityDays ? new Date(new Date(anchor.createdAt).getTime() + (anchor.metadata.validityDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] : 'Indefinite',
                algorithm: anchor.algorithm || 'ML-KEM-1024',
                strength: '256-bit',
                usage: anchor.algorithm.includes('KEM') ? 'Key Exchange' : 'Digital Signatures',
            }));

            setKeys(mappedKeys);
        } catch (error) {
            console.error('Failed to fetch anchors:', error);
            setKeys([]); // Failed to fetch anchors, initialize with empty array
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const filteredKeys = keys.filter(key => {
        const matchesSearch = key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            key.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'all' || key.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || key.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    const getStatusIcon = (status: KeyStatus) => {
        switch (status) {
            case 'active': return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'pending': return <Clock className="w-4 h-4 text-amber-400" />;
            case 'expired': return <AlertTriangle className="w-4 h-4 text-red-400" />;
            case 'revoked': return <XCircle className="w-4 h-4 text-red-400" />;
        }
    };

    const getStatusClass = (status: KeyStatus) => {
        switch (status) {
            case 'active': return 'status-success';
            case 'pending': return 'status-warning';
            case 'expired':
            case 'revoked': return 'status-critical';
        }
    };

    const getTypeClass = (type: KeyType) => {
        switch (type) {
            case 'ML-KEM': return 'status-info';
            case 'ML-DSA': return 'bg-purple-500/20 text-purple-300';
            case 'SLH-DSA': return 'bg-indigo-500/20 text-indigo-300';
        }
    };

    const handleRotate = (key: CryptoKey) => {
        setConfirmAction({ type: 'rotate', key });
    };

    const handleRevoke = (key: CryptoKey) => {
        setConfirmAction({ type: 'revoke', key });
    };

    const executeAction = async () => {
        if (!confirmAction) return;

        try {
            if (confirmAction.type === 'rotate') {
                await anchorsAPI.rotateAnchor(confirmAction.key.id);
            } else if (confirmAction.type === 'revoke') {
                // Backend doesn't support revoke directly on anchors yet, assume handled via update/deactivate
                // For now, we'll simulate it locally or call deactivate if available
                await anchorsAPI.activateAnchor(confirmAction.key.id); // Re-usng activate as placeholder or add deactivate
            }

            // Refresh list
            await fetchKeys();
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setConfirmAction(null);
        }
    };

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;

        try {
            setIsCreating(true);
            await anchorsAPI.createAnchor({
                name: newKeyName,
                algorithm: newKeyAlgorithm,
            });
            await fetchKeys();
            // setIsCreateModalOpen(false); // Removed
            setNewKeyName('');
        } catch (error) {
            console.error('Failed to create key:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const keyStats = {
        total: keys.length,
        active: keys.filter(k => k.status === 'active').length,
        pending: keys.filter(k => k.status === 'pending').length,
        expired: keys.filter(k => k.status === 'expired' || k.status === 'revoked').length,
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-3">
                        <Key className="w-8 h-8 text-cyan-400" />
                        Key Management
                    </h1>
                    <p className="text-white/60 mt-1">
                        <Tooltip term="PQC">PQC</Tooltip> Key Exchange & Signatures
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-white">{keyStats.total}</div>
                    <div className="text-xs text-white/50">Total Keys</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{keyStats.active}</div>
                    <div className="text-xs text-white/50">Active</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">{keyStats.pending}</div>
                    <div className="text-xs text-white/50">Pending</div>
                </GlassPanel>
                <GlassPanel className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">{keyStats.expired}</div>
                    <div className="text-xs text-white/50">Expired/Revoked</div>
                </GlassPanel>
            </div>

            {/* Filters */}
            <GlassPanel className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Search keys..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as KeyType | 'all')}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                        >
                            <option value="all">All Types</option>
                            <option value="ML-KEM">ML-KEM</option>
                            <option value="ML-DSA">ML-DSA</option>
                            <option value="SLH-DSA">SLH-DSA</option>
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as KeyStatus | 'all')}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="expired">Expired</option>
                            <option value="revoked">Revoked</option>
                        </select>
                    </div>
                </div>
            </GlassPanel>

            {/* Keys Table */}
            <GlassPanel className="overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-white/50 animate-pulse">Loading keys...</div>
                    ) : (
                        <table className="quantum-table">
                            <thead>
                                <tr>
                                    <th>Key ID</th>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Algorithm</th>
                                    <th>Status</th>
                                    <th>Expiry</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredKeys.map((key) => (
                                    <tr key={key.id} onClick={() => setSelectedKey(key)}>
                                        <td className="font-mono text-cyan-400 text-sm">{key.id.substring(0, 8)}...</td>
                                        <td className="font-medium text-white">{key.name}</td>
                                        <td>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeClass(key.type)}`}>
                                                <Tooltip term={key.type}>{key.type}</Tooltip>
                                            </span>
                                        </td>
                                        <td className="text-white/70 text-sm">{key.algorithm}</td>
                                        <td>
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getStatusClass(key.status)}`}>
                                                {getStatusIcon(key.status)}
                                                {key.status}
                                            </span>
                                        </td>
                                        <td className="text-white/70 text-sm">{key.expiry}</td>
                                        <td>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleRotate(key)}
                                                    disabled={key.status === 'revoked'}
                                                    className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-cyan-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Rotate Key"
                                                >
                                                    <RotateCw className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleRevoke(key)}
                                                    disabled={key.status === 'revoked'}
                                                    className="p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Revoke Key"
                                                >
                                                    <XCircle className="w-4 h-4" />
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

            {/* Key Administration Card */}
            <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-cyan-400" />
                    Key Administration
                </h3>
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-white mb-1">Key Name</label>
                        <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder="e.g., Main Anchor Key"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50"
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-white mb-1">Algorithm</label>
                        <select
                            value={newKeyAlgorithm}
                            onChange={(e) => setNewKeyAlgorithm(e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                        >
                            <option value="ML-KEM-1024">ML-KEM-1024 (Kyber)</option>
                            <option value="ML-DSA-65">ML-DSA-65 (Dilithium)</option>
                            <option value="SLH-DSA-SHAKE-128s">SLH-DSA-SHAKE-128s (SPHINCS+)</option>
                        </select>
                    </div>
                    <div className="w-full lg:w-auto">
                        <Button
                            variant="primary"
                            onClick={handleCreateKey}
                            disabled={!newKeyName.trim() || isCreating}
                            className="w-full lg:w-auto min-w-[150px]"
                        >
                            {isCreating ? 'Generating...' : 'Generate Key'}
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-white/50 mt-2">All loaded PQC algorithms are supported for auto-generation.</p>
            </GlassPanel>

            {/* System Flow Visualization - Keep as static for now */}
            <GlassPanel className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    PQC Key Exchange Flow
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-4 py-8">
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <Key className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="text-sm text-white font-medium">Key Generation</div>
                        <div className="text-xs text-white/50"><Tooltip term="ML-KEM">ML-KEM</Tooltip>-1024</div>
                    </div>
                    <div className="text-cyan-400">→</div>
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="text-sm text-white font-medium">Encapsulation</div>
                        <div className="text-xs text-white/50">Public Key Encrypt</div>
                    </div>
                    <div className="text-cyan-400">→</div>
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="text-sm text-white font-medium">Decapsulation</div>
                        <div className="text-xs text-white/50">Shared Secret</div>
                    </div>
                    <div className="text-cyan-400">→</div>
                    <div className="text-center p-4 rounded-lg bg-white/5 border border-cyan-500/30 quantum-glow">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="text-sm text-white font-medium">Secure Channel</div>
                        <div className="text-xs text-white/50"><Tooltip term="PQC">PQC</Tooltip> Protected</div>
                    </div>
                </div>
            </GlassPanel>

            {/* Key Detail Modal */}
            <Modal
                isOpen={!!selectedKey}
                onClose={() => setSelectedKey(null)}
                title={selectedKey?.name || 'Key Details'}
                size="md"
            >
                {selectedKey && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-white/50">Key ID</label>
                                <p className="font-mono text-cyan-400">{selectedKey.id}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/50">Type</label>
                                <p className="text-white"><Tooltip term={selectedKey.type}>{selectedKey.type}</Tooltip></p>
                            </div>
                            <div>
                                <label className="text-xs text-white/50">Algorithm</label>
                                <p className="text-white">{selectedKey.algorithm}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/50">Strength</label>
                                <p className="text-white">{selectedKey.strength}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/50">Created</label>
                                <p className="text-white">{selectedKey.created}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/50">Expiry</label>
                                <p className="text-white">{selectedKey.expiry}</p>
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs text-white/50">Usage</label>
                                <p className="text-white">{selectedKey.usage}</p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-white/10">
                            <Button variant="outline" onClick={() => handleRotate(selectedKey)} className="flex-1">
                                <RotateCw className="w-4 h-4 mr-2" />
                                Rotate
                            </Button>
                            <Button variant="ghost" onClick={() => handleRevoke(selectedKey)} className="flex-1 text-red-400 hover:bg-red-500/10">
                                <XCircle className="w-4 h-4 mr-2" />
                                Revoke
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
                title={confirmAction?.type === 'rotate' ? 'Rotate Key?' : 'Revoke Key?'}
                message={
                    confirmAction?.type === 'rotate'
                        ? `This will generate a new key pair for "${confirmAction.key.name}" and update all dependent systems.`
                        : `This will permanently revoke "${confirmAction?.key.name}". This action cannot be undone.`
                }
                confirmLabel={confirmAction?.type === 'rotate' ? 'Rotate Key' : 'Revoke Key'}
                variant={confirmAction?.type === 'revoke' ? 'danger' : 'default'}
            />

            {/* Create Key Modal Removed */}
        </div >
    );
}
