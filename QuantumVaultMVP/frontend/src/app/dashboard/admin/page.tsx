'use client';

import React, { useState } from 'react';
import {
    Settings,
    FileCode,
    CheckCircle2,
    ShieldAlert,
} from 'lucide-react';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { adminAPI } from '@/lib/api';

export default function AdminPage() {
    const [health, setHealth] = useState<any>(null);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [logsError, setLogsError] = useState<string | null>(null);
    const [algos, setAlgos] = useState<any[]>([]);
    const [algosError, setAlgosError] = useState<string | null>(null);
    const [systemControls, setSystemControls] = useState<any[]>([]);
    const [controlsError, setControlsError] = useState<string | null>(null);
    const [updatingControlKey, setUpdatingControlKey] = useState<string | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [assetsForFreeze, setAssetsForFreeze] = useState<any[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [assetSearch, setAssetSearch] = useState('');
    const [freezeError, setFreezeError] = useState<string | null>(null);
    const [freezeUpdatingKey, setFreezeUpdatingKey] = useState<string | null>(null);
    const [approvals, setApprovals] = useState<any[]>([]);
    const [approvalsError, setApprovalsError] = useState<string | null>(null);
    const [approvalUpdatingId, setApprovalUpdatingId] = useState<string | null>(null);
    const [riskRules, setRiskRules] = useState({
        maxRiskScoreAutoApprove: 70,
        requireApprovalAtRiskLevel: 'HIGH',
        maxAssetsPerRun: 1000,
    });
    const [riskRulesError, setRiskRulesError] = useState<string | null>(null);
    const [savingRiskRules, setSavingRiskRules] = useState(false);

    const fetchSystemControls = async () => {
        try {
            const data = await adminAPI.getSystemControls();
            setSystemControls(Array.isArray(data) ? data : []);
            setControlsError(null);
        } catch (err) {
            setControlsError('Failed to load system controls');
            setSystemControls([]);
        }
    };

    const fetchAlgos = async () => {
        try {
            const data = await adminAPI.getAlgos();
            setAlgos(data);
            setAlgosError(null);
        } catch (err) {
            setAlgosError('Failed to load algorithms');
            setAlgos([]);
        }
    };

    const fetchUsers = async (search?: string) => {
        try {
            const data = await adminAPI.getUsers(search);
            setUsers(Array.isArray(data) ? data : []);
            setFreezeError(null);
        } catch (err) {
            setUsers([]);
            setFreezeError('Failed to load users for freeze center');
        }
    };

    const fetchAssetsForFreeze = async (search?: string) => {
        try {
            const data = await adminAPI.getAssetsForFreeze(search);
            setAssetsForFreeze(Array.isArray(data) ? data : []);
            setFreezeError(null);
        } catch (err) {
            setAssetsForFreeze([]);
            setFreezeError('Failed to load assets for freeze center');
        }
    };

    const fetchApprovals = async () => {
        try {
            const data = await adminAPI.getApprovals('PENDING');
            setApprovals(Array.isArray(data) ? data : []);
            setApprovalsError(null);
        } catch (err) {
            setApprovals([]);
            setApprovalsError('Failed to load pending approvals');
        }
    };

    const fetchRiskRules = async () => {
        try {
            const data = await adminAPI.getRiskRules();
            setRiskRules({
                maxRiskScoreAutoApprove: Number(data?.maxRiskScoreAutoApprove) || 70,
                requireApprovalAtRiskLevel: String(data?.requireApprovalAtRiskLevel || 'HIGH'),
                maxAssetsPerRun: Number(data?.maxAssetsPerRun) || 1000,
            });
            setRiskRulesError(null);
        } catch (err) {
            setRiskRulesError('Failed to load risk rules');
        }
    };

    React.useEffect(() => {
        const fetchHealth = async () => {
            try {
                const data = await adminAPI.getHealth();
                setHealth(data);
            } catch (err: any) {
                setHealthError('Failed to load system health');
                setHealth(null);
            }
        };

        const fetchLogs = async () => {
            try {
                const data = await adminAPI.getLogs();
                setLogs(data);
            } catch (err) {
                setLogsError('Failed to load audit logs');
                setLogs([]);
            }
        };

        fetchHealth();
        fetchLogs();
        fetchAlgos();
        fetchSystemControls();
        fetchUsers();
        fetchAssetsForFreeze();
        fetchApprovals();
        fetchRiskRules();
    }, []);

    const toggleSystemControl = async (controlKey: string, currentEnabled: boolean) => {
        const nextEnabled = !currentEnabled;
        const actionText = nextEnabled ? 'pause' : 'resume';
        const confirmed = window.confirm(`Are you sure you want to ${actionText} this operation?`);
        if (!confirmed) {
            return;
        }

        setUpdatingControlKey(controlKey);
        try {
            await adminAPI.updateSystemControl(
                controlKey,
                nextEnabled,
                nextEnabled
                    ? 'Paused from Administrator Console'
                    : 'Resumed from Administrator Console',
            );
            await fetchSystemControls();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to update system control';
            setControlsError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setUpdatingControlKey(null);
        }
    };

    const toggleAlgo = async (id: string, currentStatus: string, manageable: boolean) => {
        if (!manageable) {
            setAlgosError('This algorithm is governance-managed and read-only in this panel.');
            return;
        }

        const enable = currentStatus !== 'enabled';
        try {
            const result = await adminAPI.updateAlgo(id, enable);
            if (!result?.success) {
                throw new Error(result?.message || 'Algorithm update rejected');
            }
            await fetchAlgos();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update algorithm';
            setAlgosError(message);
        }
    };

    const updateUserActive = async (userId: string, isActive: boolean) => {
        const actionLabel = isActive ? 'activate' : 'deactivate';
        const confirmed = window.confirm(`Are you sure you want to ${actionLabel} this user?`);
        if (!confirmed) {
            return;
        }

        const reason = window.prompt('Reason (optional):', '') || undefined;
        const updatingKey = `user:${userId}`;
        setFreezeUpdatingKey(updatingKey);
        try {
            await adminAPI.setUserActive(userId, isActive, reason);
            await fetchUsers(userSearch.trim() || undefined);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to update user status';
            setFreezeError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setFreezeUpdatingKey(null);
        }
    };

    const updateAssetFrozen = async (assetId: string, isFrozen: boolean) => {
        const actionLabel = isFrozen ? 'freeze' : 'unfreeze';
        const confirmed = window.confirm(`Are you sure you want to ${actionLabel} this asset?`);
        if (!confirmed) {
            return;
        }

        const reasonPrompt = isFrozen ? 'Freeze reason (optional):' : 'Unfreeze reason (optional):';
        const reason = window.prompt(reasonPrompt, '') || undefined;
        const updatingKey = `asset:${assetId}`;
        setFreezeUpdatingKey(updatingKey);
        try {
            await adminAPI.setAssetFrozen(assetId, isFrozen, reason);
            await fetchAssetsForFreeze(assetSearch.trim() || undefined);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to update asset freeze status';
            setFreezeError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setFreezeUpdatingKey(null);
        }
    };

    const reviewApproval = async (approvalId: string, approve: boolean) => {
        const actionLabel = approve ? 'approve' : 'reject';
        const confirmed = window.confirm(`Are you sure you want to ${actionLabel} this request?`);
        if (!confirmed) {
            return;
        }

        const reasonPrompt = approve ? 'Approval reason (optional):' : 'Rejection reason (optional):';
        const reason = window.prompt(reasonPrompt, '') || undefined;
        setApprovalUpdatingId(approvalId);

        try {
            if (approve) {
                await adminAPI.approveApproval(approvalId, reason);
            } else {
                await adminAPI.rejectApproval(approvalId, reason);
            }
            await fetchApprovals();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to review approval request';
            setApprovalsError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setApprovalUpdatingId(null);
        }
    };

    const submitRiskRules = async () => {
        setSavingRiskRules(true);
        try {
            await adminAPI.updateRiskRules({
                maxRiskScoreAutoApprove: Number(riskRules.maxRiskScoreAutoApprove),
                requireApprovalAtRiskLevel: riskRules.requireApprovalAtRiskLevel,
                maxAssetsPerRun: Number(riskRules.maxAssetsPerRun),
            });
            await fetchRiskRules();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to update risk rules';
            setRiskRulesError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setSavingRiskRules(false);
        }
    };

    const formatHealthLabel = (raw: string): string => {
        const spaced = raw
            .replace(/_/g, ' ')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .trim();

        const upperAcronyms = new Set(['id', 'api', 'rpc', 'tps']);
        return spaced
            .split(/\s+/)
            .map((segment) => {
                const lower = segment.toLowerCase();
                if (upperAcronyms.has(lower)) {
                    return lower.toUpperCase();
                }
                return lower.charAt(0).toUpperCase() + lower.slice(1);
            })
            .join(' ');
    };

    const formatHealthValue = (key: string, value: unknown): string => {
        if (value === null || value === undefined || value === '') {
            return 'n/a';
        }

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value.toLocaleString() : 'n/a';
        }

        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }

        if (key === 'updatedAt' && typeof value === 'string') {
            const parsed = new Date(value);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toLocaleString();
            }
        }

        return String(value);
    };

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 shrink-0">
                    <Settings className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Administrator Console</h1>
                    <p className="text-white/60">Manage system health, governance controls, and audit visibility.</p>
                </div>
            </div>

            {/* System Health Card */}
            <GlassPanel className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">System Health</h2>
                        <p className="text-sm text-white/50">Real-time status of critical components</p>
                    </div>
                </div>

                {
                    healthError ? (
                        <div className="text-red-400 text-sm mt-4 p-4 border border-red-500/20 bg-red-500/10 rounded-lg">{healthError}</div>
                    ) : health ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(health).map(([key, val]: [string, any]) => (
                                <div key={key} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="capitalize text-white/70 font-medium">{formatHealthLabel(key)}</span>
                                        <div
                                            className={`w-2 h-2 rounded-full ${val?.status === 'online'
                                                ? 'bg-green-400'
                                                : val?.status === 'degraded'
                                                    ? 'bg-amber-400'
                                                    : 'bg-red-400'
                                                }`}
                                        />
                                    </div>
                                    {key === 'blockchain' && val.dataSource && (
                                        <div className="text-[11px] text-cyan-300/80 mb-2">
                                            Data source: {val.dataSource}
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        {(() => {
                                            const entries = Object.entries(val || {}).filter(([k]) => k !== 'status');
                                            if (key !== 'blockchain') {
                                                return entries;
                                            }

                                            const orderedKeys = [
                                                'height',
                                                'sync',
                                                'peers',
                                                'tps',
                                                'blockTime',
                                                'validators',
                                                'finality',
                                                'chainId',
                                                'backend',
                                                'network',
                                                'latency',
                                                'updatedAt',
                                                'endpoint',
                                            ];

                                            const rank = new Map(orderedKeys.map((item, index) => [item, index]));
                                            return entries.sort(([a], [b]) => {
                                                const ra = rank.get(a) ?? Number.MAX_SAFE_INTEGER;
                                                const rb = rank.get(b) ?? Number.MAX_SAFE_INTEGER;
                                                return ra - rb;
                                            });
                                        })().map(([k, v]: [string, any]) => (
                                            <div key={k} className="flex justify-between text-xs">
                                                <span className="text-white/40 capitalize">{formatHealthLabel(k)}</span>
                                                <span className={`text-white/80 font-mono ${k === 'endpoint' ? 'max-w-[58%] truncate text-right' : ''}`}>
                                                    {formatHealthValue(k, v)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-white/40 text-sm animate-pulse">Loading system health...</div>
                    )
                }
            </GlassPanel >

            <GlassPanel className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">System Controls</h2>
                        <p className="text-sm text-white/50">Emergency pause controls for critical operations</p>
                    </div>
                </div>

                <div className="space-y-3">
                    {controlsError ? (
                        <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg">{controlsError}</div>
                    ) : systemControls.length === 0 ? (
                        <div className="text-white/40 text-sm">Loading system controls...</div>
                    ) : (
                        systemControls.map((control) => {
                            const isPaused = Boolean(control.isEnabled);
                            const isUpdating = updatingControlKey === control.controlKey;
                            return (
                                <div key={control.controlKey} className="p-4 rounded-lg border border-white/10 bg-white/5">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <div className="text-white font-medium">{control.label}</div>
                                            <div className="text-xs text-white/50 mt-1">{control.description}</div>
                                            <div className="text-[11px] text-white/40 mt-2">
                                                Last update: {control.updatedAt ? new Date(control.updatedAt).toLocaleString() : 'n/a'}
                                                {control.updatedBy ? ` • ${control.updatedBy}` : ''}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => toggleSystemControl(control.controlKey, isPaused)}
                                            disabled={isUpdating}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${isPaused
                                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'} ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                            {isUpdating ? 'UPDATING...' : isPaused ? 'PAUSED' : 'ACTIVE'}
                                        </button>
                                    </div>

                                    {control.reason ? (
                                        <div className="mt-2 text-xs text-white/50">Reason: {control.reason}</div>
                                    ) : null}
                                </div>
                            );
                        })
                    )}
                </div>
            </GlassPanel>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <GlassPanel className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Freeze Center</h2>
                            <p className="text-sm text-white/50">Manage user activation and asset freeze status</p>
                        </div>
                    </div>

                    {freezeError ? (
                        <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg mb-4">{freezeError}</div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4">
                        <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3 gap-2">
                                <h3 className="text-sm font-semibold text-white">Users</h3>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        placeholder="Search by email or id"
                                        className="px-2.5 py-1.5 text-xs bg-black/30 border border-white/10 rounded text-white placeholder:text-white/30"
                                    />
                                    <button
                                        onClick={() => fetchUsers(userSearch.trim() || undefined)}
                                        className="px-2.5 py-1.5 text-xs rounded bg-white/10 text-white/80 hover:bg-white/20"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {users.length === 0 ? (
                                    <div className="text-white/40 text-xs">No users found.</div>
                                ) : (
                                    users.map((user) => {
                                        const busy = freezeUpdatingKey === `user:${user.id}`;
                                        return (
                                            <div key={user.id} className="p-3 rounded border border-white/10 bg-black/20">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm text-white font-medium">{user.email}</div>
                                                        <div className="text-[11px] text-white/40">{user.role} • {user.isActive ? 'ACTIVE' : 'INACTIVE'}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => updateUserActive(user.id, !user.isActive)}
                                                        disabled={busy}
                                                        className={`px-2.5 py-1 rounded text-[11px] font-semibold ${user.isActive
                                                            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                                            : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'} ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                    >
                                                        {busy ? 'UPDATING...' : user.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3 gap-2">
                                <h3 className="text-sm font-semibold text-white">Assets</h3>
                                <div className="flex items-center gap-2">
                                    <input
                                        value={assetSearch}
                                        onChange={(e) => setAssetSearch(e.target.value)}
                                        placeholder="Search name/fingerprint"
                                        className="px-2.5 py-1.5 text-xs bg-black/30 border border-white/10 rounded text-white placeholder:text-white/30"
                                    />
                                    <button
                                        onClick={() => fetchAssetsForFreeze(assetSearch.trim() || undefined)}
                                        className="px-2.5 py-1.5 text-xs rounded bg-white/10 text-white/80 hover:bg-white/20"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {assetsForFreeze.length === 0 ? (
                                    <div className="text-white/40 text-xs">No assets found.</div>
                                ) : (
                                    assetsForFreeze.map((asset) => {
                                        const busy = freezeUpdatingKey === `asset:${asset.id}`;
                                        return (
                                            <div key={asset.id} className="p-3 rounded border border-white/10 bg-black/20">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm text-white font-medium">{asset.name || asset.id}</div>
                                                        <div className="text-[11px] text-white/40">
                                                            {asset.riskLevel || 'UNKNOWN'} • score {asset.riskScore ?? 'n/a'} • {asset.isFrozen ? 'FROZEN' : 'ACTIVE'}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => updateAssetFrozen(asset.id, !asset.isFrozen)}
                                                        disabled={busy}
                                                        className={`px-2.5 py-1 rounded text-[11px] font-semibold ${asset.isFrozen
                                                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                                            : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'} ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                    >
                                                        {busy ? 'UPDATING...' : asset.isFrozen ? 'UNFREEZE' : 'FREEZE'}
                                                    </button>
                                                </div>
                                                {asset.freezeReason ? (
                                                    <div className="text-[11px] text-white/40 mt-1">Reason: {asset.freezeReason}</div>
                                                ) : null}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <FileCode className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Pending Approvals</h2>
                            <p className="text-sm text-white/50">Review high-risk operation requests</p>
                        </div>
                    </div>

                    {approvalsError ? (
                        <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg mb-4">{approvalsError}</div>
                    ) : null}

                    <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                        {approvals.length === 0 ? (
                            <div className="text-white/40 text-sm">No pending approvals.</div>
                        ) : (
                            approvals.map((approval) => {
                                const busy = approvalUpdatingId === approval.id;
                                return (
                                    <div key={approval.id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-white font-medium text-sm">{approval.operationType}</div>
                                                <div className="text-xs text-white/50 mt-1">{approval.resourceType} • {approval.resourceId || 'n/a'}</div>
                                                <div className="text-[11px] text-white/40 mt-1">
                                                    Requested by {approval.requestedBy || 'unknown'} • {new Date(approval.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => reviewApproval(approval.id, true)}
                                                    disabled={busy}
                                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    APPROVE
                                                </button>
                                                <button
                                                    onClick={() => reviewApproval(approval.id, false)}
                                                    disabled={busy}
                                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold bg-red-500/20 text-red-300 hover:bg-red-500/30 ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    REJECT
                                                </button>
                                            </div>
                                        </div>
                                        {approval.reason ? (
                                            <div className="text-xs text-white/60 mt-2">Reason: {approval.reason}</div>
                                        ) : null}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </GlassPanel>
            </div>

            <GlassPanel className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Risk Rules</h2>
                        <p className="text-sm text-white/50">Configure thresholds for auto-approval and run limits</p>
                    </div>
                </div>

                {riskRulesError ? (
                    <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg mb-4">{riskRulesError}</div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="text-sm text-white/70 flex flex-col gap-1.5">
                        Max Risk Score Auto-Approve
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={riskRules.maxRiskScoreAutoApprove}
                            onChange={(e) => setRiskRules((prev) => ({
                                ...prev,
                                maxRiskScoreAutoApprove: Number(e.target.value),
                            }))}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        />
                    </label>

                    <label className="text-sm text-white/70 flex flex-col gap-1.5">
                        Require Approval At Risk Level
                        <select
                            value={riskRules.requireApprovalAtRiskLevel}
                            onChange={(e) => setRiskRules((prev) => ({
                                ...prev,
                                requireApprovalAtRiskLevel: e.target.value,
                            }))}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="CRITICAL">CRITICAL</option>
                        </select>
                    </label>

                    <label className="text-sm text-white/70 flex flex-col gap-1.5">
                        Max Assets Per Run
                        <input
                            type="number"
                            min={1}
                            value={riskRules.maxAssetsPerRun}
                            onChange={(e) => setRiskRules((prev) => ({
                                ...prev,
                                maxAssetsPerRun: Number(e.target.value),
                            }))}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        />
                    </label>
                </div>

                <div className="mt-4">
                    <button
                        onClick={submitRiskRules}
                        disabled={savingRiskRules}
                        className={`px-4 py-2 rounded text-sm font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 ${savingRiskRules ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {savingRiskRules ? 'SAVING...' : 'SAVE RISK RULES'}
                    </button>
                </div>
            </GlassPanel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Algorithm Governance */}
                <GlassPanel className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <FileCode className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">PQC Governance</h2>
                            <p className="text-sm text-white/50">Manage approved cryptographic algorithms</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {algosError ? (
                            <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg">{algosError}</div>
                        ) : algos.length === 0 ? (
                            <div className="text-white/40 text-sm text-center py-4">No active algorithms found or loading...</div>
                        ) : (
                            algos.map((algo) => (
                                <div key={algo.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium">{algo.name}</span>
                                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/60">{algo.type}</span>
                                        </div>
                                        <div className="text-xs text-white/40 mt-1">Security Level: {algo.securityLevel}</div>
                                    </div>
                                    <button
                                        onClick={() => toggleAlgo(algo.id, algo.status, Boolean(algo.manageable))}
                                        disabled={!algo.manageable}
                                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${algo.status === 'enabled'
                                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                            : algo.status === 'warning'
                                                ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                            } ${!algo.manageable ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        title={algo.manageable ? 'Toggle algorithm status' : 'Governance-managed (read-only from this panel)'}
                                    >
                                        {algo.status.toUpperCase()}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </GlassPanel>

                {/* Audit Logs */}
                <GlassPanel className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <FileCode className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Audit Logs</h2>
                            <p className="text-sm text-white/50">Recent system activities and security events</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {logsError ? (
                            <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg">{logsError}</div>
                        ) : logs.length === 0 ? (
                            <div className="text-white/40 text-sm text-center py-4">No recent audit logs available.</div>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="text-sm border-l-2 border-white/10 pl-3 py-1">
                                    <div className="flex justify-between text-xs mb-0.5">
                                        <span className={`font-mono ${log.action.includes('FAILED') ? 'text-red-400' :
                                            log.action.includes('SUCCESS') ? 'text-green-400' : 'text-blue-400'
                                            }`}>
                                            {log.action}
                                        </span>
                                        <span className="text-white/30">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-white/80">{log.details}</p>
                                    <div className="flex gap-2 text-xs text-white/30 mt-1">
                                        <span>{log.user}</span>
                                        <span>•</span>
                                        <span>{log.ip}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </GlassPanel>
            </div>

        </div>
    );
}
