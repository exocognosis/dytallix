'use client';

import React, { useState } from 'react';
import {
    Settings,
    FileCode,
    CheckCircle2,
    ShieldAlert,
} from 'lucide-react';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { accessAPI, adminAPI } from '@/lib/api';

type AdminActivityItem = {
    id: string;
    eventId: string;
    timestamp: string;
    source: string;
    function: string;
    action: string;
    result: string;
    actor: string;
    resource?: string | null;
    resourceId?: string | null;
    targetLabel?: string | null;
    summary: string;
    ip?: string | null;
    location?: string | null;
    networkZone?: string | null;
    pipelineRunId?: string | null;
    pipelineAssetId?: string | null;
};

type ActivePipelineRun = {
    id: string;
    status: string;
    startedAt?: string | null;
    updatedAt: string;
    completedAt?: string | null;
    totalFound: number;
    processed: number;
    skipped: number;
    failed: number;
    progressPercent: number;
    sourceRoot?: string | null;
    destinationRoot?: string | null;
};

type ActivityFeedResponse = {
    generatedAt: string;
    counts?: {
        total?: number;
        byFunction?: Record<string, number>;
        byResult?: Record<string, number>;
        activePipelineRuns?: number;
    };
    activePipelineRuns?: ActivePipelineRun[];
    items?: AdminActivityItem[];
};

type ActivityFilters = {
    functionKey: string;
    source: string;
    result: string;
    actor: string;
    search: string;
    from: string;
    to: string;
    limit: number;
};

type RiskRulesFormState = {
    maxRiskScoreAutoApprove: string;
    requireApprovalAtRiskLevel: string;
    maxAssetsPerRun: string;
};

type ApprovalStatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type LegalHoldFilter = 'all' | 'held' | 'available';

const ACTIVITY_FUNCTION_OPTIONS = [
    { value: 'all', label: 'All Functions' },
    { value: 'auth', label: 'Auth' },
    { value: 'access', label: 'Access' },
    { value: 'pipeline', label: 'Pipeline' },
    { value: 'credentials', label: 'Credentials' },
    { value: 'service_accounts', label: 'Service Accounts' },
    { value: 'governance', label: 'Key Governance' },
    { value: 'controls', label: 'Admin Controls' },
    { value: 'assets', label: 'Assets' },
    { value: 'system', label: 'System' },
] as const;

const ACTIVITY_SOURCE_OPTIONS = [
    { value: 'all', label: 'All Sources' },
    { value: 'audit_log', label: 'Audit Log' },
    { value: 'audit_ledger', label: 'Audit Ledger' },
    { value: 'pipeline_run', label: 'Pipeline Runs' },
] as const;

const ACTIVITY_RESULT_OPTIONS = [
    { value: 'all', label: 'All Results' },
    { value: 'success', label: 'Success' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'denied', label: 'Denied' },
    { value: 'failed', label: 'Failed' },
    { value: 'info', label: 'Info' },
] as const;

function padDateSegment(value: number) {
    return String(value).padStart(2, '0');
}

function toLocalDateTimeInputValue(date: Date) {
    return `${date.getFullYear()}-${padDateSegment(date.getMonth() + 1)}-${padDateSegment(date.getDate())}T${padDateSegment(date.getHours())}:${padDateSegment(date.getMinutes())}`;
}

function toIsoFromLocalDateTime(value: string): string | undefined {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return undefined;
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function buildDefaultActivityFilters(): ActivityFilters {
    return {
        functionKey: 'all',
        source: 'all',
        result: 'all',
        actor: '',
        search: '',
        from: toLocalDateTimeInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        to: '',
        limit: 150,
    };
}

function truncateMiddle(value: string, leading = 14, trailing = 8) {
    if (!value || value.length <= leading + trailing + 3) {
        return value;
    }
    return `${value.slice(0, leading)}...${value.slice(-trailing)}`;
}

function getActivityFunctionBadgeClass(functionKey: string) {
    switch (functionKey) {
        case 'auth':
            return 'bg-sky-500/15 text-sky-200 border border-sky-500/20';
        case 'access':
            return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/20';
        case 'pipeline':
            return 'bg-amber-500/15 text-amber-200 border border-amber-500/20';
        case 'credentials':
        case 'service_accounts':
            return 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/20';
        case 'governance':
            return 'bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-500/20';
        case 'controls':
        case 'assets':
            return 'bg-red-500/15 text-red-200 border border-red-500/20';
        default:
            return 'bg-white/10 text-white/70 border border-white/10';
    }
}

function getActivityResultBadgeClass(result: string) {
    switch (result) {
        case 'success':
            return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/20';
        case 'active':
            return 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/20';
        case 'pending':
            return 'bg-amber-500/15 text-amber-200 border border-amber-500/20';
        case 'denied':
            return 'bg-orange-500/15 text-orange-200 border border-orange-500/20';
        case 'failed':
            return 'bg-red-500/15 text-red-200 border border-red-500/20';
        default:
            return 'bg-white/10 text-white/70 border border-white/10';
    }
}

export default function AdminPage() {
    const [health, setHealth] = useState<any>(null);
    const [healthError, setHealthError] = useState<string | null>(null);
    const [runtime, setRuntime] = useState<any>(null);
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [activityFeed, setActivityFeed] = useState<ActivityFeedResponse | null>(null);
    const [activityError, setActivityError] = useState<string | null>(null);
    const [activityRefreshing, setActivityRefreshing] = useState(false);
    const [activityFilters, setActivityFilters] = useState<ActivityFilters>(() => buildDefaultActivityFilters());
    const [activityFilterDraft, setActivityFilterDraft] = useState<ActivityFilters>(() => buildDefaultActivityFilters());
    const [algos, setAlgos] = useState<any[]>([]);
    const [algosError, setAlgosError] = useState<string | null>(null);
    const [systemControls, setSystemControls] = useState<any[]>([]);
    const [controlsLoaded, setControlsLoaded] = useState(false);
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
    const [approvalsStatusFilter, setApprovalsStatusFilter] = useState<ApprovalStatusFilter>('PENDING');
    const [approvalsSearch, setApprovalsSearch] = useState('');
    const [riskRules, setRiskRules] = useState<RiskRulesFormState>({
        maxRiskScoreAutoApprove: '',
        requireApprovalAtRiskLevel: '',
        maxAssetsPerRun: '',
    });
    const [riskRulesConfigured, setRiskRulesConfigured] = useState(false);
    const [riskRulesError, setRiskRulesError] = useState<string | null>(null);
    const [savingRiskRules, setSavingRiskRules] = useState(false);
    const [deactivatingRiskRules, setDeactivatingRiskRules] = useState(false);
    const [serviceAccounts, setServiceAccounts] = useState<any[]>([]);
    const [serviceAccountsError, setServiceAccountsError] = useState<string | null>(null);
    const [serviceAccountUpdatingId, setServiceAccountUpdatingId] = useState<string | null>(null);
    const [serviceAccountMessage, setServiceAccountMessage] = useState<string | null>(null);
    const [serviceAccountSearch, setServiceAccountSearch] = useState('');
    const [editingServiceAccountId, setEditingServiceAccountId] = useState<string | null>(null);
    const [serviceAccountDraft, setServiceAccountDraft] = useState({
        displayName: '',
        description: '',
        role: 'VIEWER',
        clearanceLevel: 'L0_INTERNAL',
        department: '',
        projectMemberships: '',
        allowedNetworkZones: 'INTERNAL,VPN',
    });
    const [legalHoldAssets, setLegalHoldAssets] = useState<any[]>([]);
    const [legalHoldError, setLegalHoldError] = useState<string | null>(null);
    const [legalHoldSearch, setLegalHoldSearch] = useState('');
    const [legalHoldUpdatingId, setLegalHoldUpdatingId] = useState<string | null>(null);
    const [legalHoldFilter, setLegalHoldFilter] = useState<LegalHoldFilter>('all');
    const [keyGovernanceStatus, setKeyGovernanceStatus] = useState<any>(null);
    const [keyGovernanceError, setKeyGovernanceError] = useState<string | null>(null);
    const [keyGovernanceMessage, setKeyGovernanceMessage] = useState<string | null>(null);
    const [keyGovernanceUpdatingKey, setKeyGovernanceUpdatingKey] = useState<string | null>(null);

    const fetchSystemControls = async () => {
        try {
            const data = await adminAPI.getSystemControls();
            setSystemControls(Array.isArray(data) ? data : []);
            setControlsError(null);
        } catch (err) {
            setControlsError('Failed to load system controls');
            setSystemControls([]);
        } finally {
            setControlsLoaded(true);
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

    const fetchApprovals = async (status: ApprovalStatusFilter = approvalsStatusFilter, search?: string) => {
        try {
            const data = await adminAPI.getApprovals(status, search);
            setApprovals(Array.isArray(data) ? data : []);
            setApprovalsError(null);
        } catch (err) {
            setApprovals([]);
            setApprovalsError('Failed to load approval queue');
        }
    };

    const fetchRiskRules = async () => {
        try {
            const data = await adminAPI.getRiskRules();
            const configured = Boolean(data?.configured);
            setRiskRulesConfigured(configured);
            setRiskRules({
                maxRiskScoreAutoApprove: data?.maxRiskScoreAutoApprove != null ? String(data.maxRiskScoreAutoApprove) : '',
                requireApprovalAtRiskLevel: data?.requireApprovalAtRiskLevel != null ? String(data.requireApprovalAtRiskLevel) : '',
                maxAssetsPerRun: data?.maxAssetsPerRun != null ? String(data.maxAssetsPerRun) : '',
            });
            setRiskRulesError(null);
        } catch (err) {
            setRiskRulesConfigured(false);
            setRiskRules({
                maxRiskScoreAutoApprove: '',
                requireApprovalAtRiskLevel: '',
                maxAssetsPerRun: '',
            });
            setRiskRulesError('Failed to load risk rules');
        }
    };

    const fetchRuntime = async () => {
        try {
            const data = await adminAPI.getRuntime();
            setRuntime(data);
            setRuntimeError(null);
        } catch (err) {
            setRuntime(null);
            setRuntimeError('Failed to load runtime summary');
        }
    };

    const fetchHealth = async () => {
        try {
            const data = await adminAPI.getHealth();
            setHealth(data);
            setHealthError(null);
        } catch (err: any) {
            setHealthError('Failed to load system health');
            setHealth(null);
        }
    };

    const fetchServiceAccounts = async (search?: string) => {
        try {
            const data = await adminAPI.getServiceAccounts(search);
            setServiceAccounts(Array.isArray(data) ? data : []);
            setServiceAccountsError(null);
        } catch (err) {
            setServiceAccounts([]);
            setServiceAccountsError('Failed to load service accounts');
        }
    };

    const fetchLegalHoldAssets = async (search?: string, filter: LegalHoldFilter = legalHoldFilter) => {
        try {
            const data = await accessAPI.getAssets({
                legalHold: filter === 'held' ? true : filter === 'available' ? false : undefined,
                search: search || undefined,
            });
            setLegalHoldAssets(Array.isArray(data) ? data : []);
            setLegalHoldError(null);
        } catch (err) {
            setLegalHoldAssets([]);
            setLegalHoldError('Failed to load legal-hold assets');
        }
    };

    const fetchKeyGovernanceStatus = async () => {
        try {
            const data = await adminAPI.getKeyGovernanceStatus();
            setKeyGovernanceStatus(data);
            setKeyGovernanceError(null);
        } catch (err) {
            setKeyGovernanceStatus(null);
            setKeyGovernanceError('Failed to load PQC key governance status');
        }
    };

    const fetchActivity = async (filters: ActivityFilters = activityFilters, silent = false) => {
        if (!silent) {
            setActivityRefreshing(true);
        }

        try {
            const data = await adminAPI.getActivity({
                function: filters.functionKey !== 'all' ? filters.functionKey : undefined,
                source: filters.source !== 'all' ? filters.source : undefined,
                result: filters.result !== 'all' ? filters.result : undefined,
                actor: filters.actor.trim() || undefined,
                search: filters.search.trim() || undefined,
                from: toIsoFromLocalDateTime(filters.from),
                to: toIsoFromLocalDateTime(filters.to),
                limit: Number(filters.limit) || undefined,
            });
            setActivityFeed(data as ActivityFeedResponse);
            setActivityError(null);
        } catch (err) {
            setActivityError('Failed to load live activity');
        } finally {
            if (!silent) {
                setActivityRefreshing(false);
            }
        }
    };

    React.useEffect(() => {
        fetchHealth();
        fetchRuntime();
        fetchAlgos();
        fetchSystemControls();
        fetchUsers();
        fetchAssetsForFreeze();
        fetchApprovals();
        fetchRiskRules();
        fetchServiceAccounts();
        fetchLegalHoldAssets();
        fetchKeyGovernanceStatus();

        const intervalId = window.setInterval(() => {
            fetchHealth();
            fetchRuntime();
        }, 15000);

        return () => window.clearInterval(intervalId);
    }, []);

    React.useEffect(() => {
        fetchActivity(activityFilters);
        const intervalId = window.setInterval(() => {
            fetchActivity(activityFilters, true);
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [activityFilters]);

    const toggleSystemControl = async (controlKey: string, currentEnabled: boolean) => {
        const nextEnabled = !currentEnabled;
        const actionText = nextEnabled ? 'pause' : 'resume';
        const confirmed = window.confirm(`Are you sure you want to ${actionText} this operation?`);
        if (!confirmed) {
            return;
        }

        const defaultReason = nextEnabled
            ? 'Paused from Administrator Console'
            : 'Resumed from Administrator Console';
        const reason = window.prompt('Reason (optional):', defaultReason) || defaultReason;

        setUpdatingControlKey(controlKey);
        try {
            await adminAPI.updateSystemControl(
                controlKey,
                nextEnabled,
                reason,
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
        if (
            !riskRules.maxRiskScoreAutoApprove.trim()
            || !riskRules.requireApprovalAtRiskLevel.trim()
            || !riskRules.maxAssetsPerRun.trim()
        ) {
            setRiskRulesError('All risk rule fields are required.');
            return;
        }

        setSavingRiskRules(true);
        try {
            await adminAPI.updateRiskRules({
                maxRiskScoreAutoApprove: Number(riskRules.maxRiskScoreAutoApprove),
                requireApprovalAtRiskLevel: riskRules.requireApprovalAtRiskLevel,
                maxAssetsPerRun: Number(riskRules.maxAssetsPerRun),
            });
            await fetchRiskRules();
            setRiskRulesConfigured(true);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to update risk rules';
            setRiskRulesError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setSavingRiskRules(false);
        }
    };

    const deactivateRiskRules = async () => {
        if (!window.confirm('Deactivate admin risk rules? Approval gating will stop enforcing until rules are reactivated.')) {
            return;
        }

        setDeactivatingRiskRules(true);
        try {
            await adminAPI.clearRiskRules();
            await fetchRiskRules();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to deactivate risk rules';
            setRiskRulesError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setDeactivatingRiskRules(false);
        }
    };

    const submitServiceAccount = async () => {
        const targetId = editingServiceAccountId || 'create';
        setServiceAccountUpdatingId(targetId);
        setServiceAccountMessage(null);
        try {
            const payload = {
                displayName: serviceAccountDraft.displayName,
                description: serviceAccountDraft.description || undefined,
                role: serviceAccountDraft.role,
                clearanceLevel: serviceAccountDraft.clearanceLevel,
                department: serviceAccountDraft.department || undefined,
                projectMemberships: serviceAccountDraft.projectMemberships
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean),
                allowedNetworkZones: serviceAccountDraft.allowedNetworkZones
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean),
            };
            const result = editingServiceAccountId
                ? await adminAPI.updateServiceAccount(editingServiceAccountId, {
                    ...payload,
                    reason: 'Updated from Administrator Console',
                })
                : await adminAPI.createServiceAccount(payload);
            setServiceAccountMessage(
                editingServiceAccountId
                    ? `Updated ${result.clientId}.`
                    : `Created ${result.clientId}. Secret: ${result.clientSecret}`,
            );
            setServiceAccountDraft({
                displayName: '',
                description: '',
                role: 'VIEWER',
                clearanceLevel: 'L0_INTERNAL',
                department: '',
                projectMemberships: '',
                allowedNetworkZones: 'INTERNAL,VPN',
            });
            setEditingServiceAccountId(null);
            await fetchServiceAccounts(serviceAccountSearch.trim() || undefined);
            await fetchRuntime();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to save service account';
            setServiceAccountsError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setServiceAccountUpdatingId(null);
        }
    };

    const rotateServiceAccountSecret = async (id: string) => {
        setServiceAccountUpdatingId(id);
        setServiceAccountMessage(null);
        try {
            const result = await adminAPI.rotateServiceAccountSecret(id);
            setServiceAccountMessage(`Rotated ${result.clientId}. New secret: ${result.clientSecret}`);
            await fetchServiceAccounts(serviceAccountSearch.trim() || undefined);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to rotate service-account secret';
            setServiceAccountsError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setServiceAccountUpdatingId(null);
        }
    };

    const updateServiceAccountActive = async (id: string, isActive: boolean) => {
        const actionLabel = isActive ? 'activate' : 'deactivate';
        if (!window.confirm(`Are you sure you want to ${actionLabel} this service account?`)) {
            return;
        }

        const reason = window.prompt('Reason (optional):', '') || undefined;
        setServiceAccountUpdatingId(id);
        setServiceAccountMessage(null);
        try {
            await adminAPI.setServiceAccountActive(id, isActive, reason);
            await fetchServiceAccounts(serviceAccountSearch.trim() || undefined);
            await fetchRuntime();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to update service-account status';
            setServiceAccountsError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setServiceAccountUpdatingId(null);
        }
    };

    const editServiceAccount = (serviceAccount: any) => {
        setEditingServiceAccountId(serviceAccount.id);
        setServiceAccountDraft({
            displayName: serviceAccount.displayName || '',
            description: serviceAccount.description || '',
            role: serviceAccount.role || 'VIEWER',
            clearanceLevel: serviceAccount.clearanceLevel || 'L0_INTERNAL',
            department: serviceAccount.department || '',
            projectMemberships: Array.isArray(serviceAccount.projectMemberships) ? serviceAccount.projectMemberships.join(', ') : '',
            allowedNetworkZones: Array.isArray(serviceAccount.allowedNetworkZones) ? serviceAccount.allowedNetworkZones.join(', ') : 'INTERNAL,VPN',
        });
        setServiceAccountsError(null);
        setServiceAccountMessage(null);
    };

    const cancelServiceAccountEdit = () => {
        setEditingServiceAccountId(null);
        setServiceAccountDraft({
            displayName: '',
            description: '',
            role: 'VIEWER',
            clearanceLevel: 'L0_INTERNAL',
            department: '',
            projectMemberships: '',
            allowedNetworkZones: 'INTERNAL,VPN',
        });
    };

    const updateLegalHold = async (assetId: string, enabled: boolean) => {
        const actionLabel = enabled ? 'apply' : 'release';
        if (!window.confirm(`Are you sure you want to ${actionLabel} a legal hold for this asset?`)) {
            return;
        }

        const reasonPrompt = enabled ? 'Legal-hold reason:' : 'Release reason (optional):';
        const reason = window.prompt(reasonPrompt, '') || undefined;
        setLegalHoldUpdatingId(assetId);
        try {
            await accessAPI.setLegalHold(assetId, enabled, reason);
            await fetchLegalHoldAssets(legalHoldSearch.trim() || undefined, legalHoldFilter);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to update legal hold';
            setLegalHoldError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setLegalHoldUpdatingId(null);
        }
    };

    const rotateAttestationSigner = async () => {
        const reason = window.prompt('Rotation reason:', 'scheduled_rotation') || 'scheduled_rotation';
        const changeTicket = window.prompt('Change ticket (optional):', '') || undefined;
        setKeyGovernanceUpdatingKey('attestation-rotate');
        setKeyGovernanceMessage(null);
        try {
            const result = await adminAPI.rotateAttestationSigner({
                reason,
                changeTicket,
                requestedBy: 'administrator_console',
            });
            setKeyGovernanceMessage(`Rotated attestation signer to ${truncateMiddle(result?.current?.signerKeyId || 'new key')}.`);
            await fetchKeyGovernanceStatus();
            await fetchActivity(activityFilters, true);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to rotate attestation signer';
            setKeyGovernanceError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setKeyGovernanceUpdatingKey(null);
        }
    };

    const rotateTransportKeys = async () => {
        const reason = window.prompt('Rotation reason:', 'scheduled_rotation') || 'scheduled_rotation';
        const changeTicket = window.prompt('Change ticket (optional):', '') || undefined;
        setKeyGovernanceUpdatingKey('transport-rotate');
        setKeyGovernanceMessage(null);
        try {
            const result = await adminAPI.rotateTransportKeys({
                reason,
                changeTicket,
                requestedBy: 'administrator_console',
            });
            setKeyGovernanceMessage(`Rotated transport keys to ${truncateMiddle(result?.currentKemKeyId || 'new keys')}.`);
            await fetchKeyGovernanceStatus();
            await fetchActivity(activityFilters, true);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to rotate transport keys';
            setKeyGovernanceError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setKeyGovernanceUpdatingKey(null);
        }
    };

    const runKeyRecoveryTest = async (scope: 'attestation' | 'transport' | 'all') => {
        setKeyGovernanceUpdatingKey(`recovery-${scope}`);
        setKeyGovernanceMessage(null);
        try {
            const result = await adminAPI.runKeyRecoveryTests({
                scope,
                requestedBy: 'administrator_console',
            });
            setKeyGovernanceMessage(`Recovery test completed for ${scope}.`);
            await fetchKeyGovernanceStatus();
            await fetchActivity(activityFilters, true);
            console.debug('Key recovery test result', result);
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to run key recovery test';
            setKeyGovernanceError(Array.isArray(message) ? message.join(', ') : String(message));
        } finally {
            setKeyGovernanceUpdatingKey(null);
        }
    };

    const applyActivityFilters = () => {
        setActivityFilters({
            ...activityFilterDraft,
            actor: activityFilterDraft.actor.trim(),
            search: activityFilterDraft.search.trim(),
            limit: Number(activityFilterDraft.limit) || 150,
        });
    };

    const resetActivityFilters = () => {
        const defaults = buildDefaultActivityFilters();
        setActivityFilterDraft(defaults);
        setActivityFilters(defaults);
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

    const hasVisibleHealthValue = (value: unknown): boolean => {
        if (value === null || value === undefined) {
            return false;
        }

        if (typeof value === 'string') {
            const normalized = value.trim();
            return normalized !== '' && normalized !== '-' && normalized.toLowerCase() !== 'n/a';
        }

        return true;
    };

    const getVisibleHealthEntries = (componentKey: string, componentValue: Record<string, unknown>) => {
        const entries = Object.entries(componentValue || {}).filter(([entryKey, entryValue]) => (
            entryKey !== 'status'
            && entryKey !== 'dataSource'
            && hasVisibleHealthValue(entryValue)
        ));

        if (componentKey !== 'blockchain') {
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
    };

    const activityItems = activityFeed?.items || [];
    const livePipelineRuns = activityFeed?.activePipelineRuns || [];
    const activityCounts = activityFeed?.counts;

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
                                            const entries = getVisibleHealthEntries(key, val || {});
                                            if (entries.length === 0) {
                                                return (
                                                    <div className="text-xs text-white/35">
                                                        No live telemetry reported.
                                                    </div>
                                                );
                                            }

                                            return entries.map(([k, v]: [string, any]) => (
                                                <div key={k} className="flex justify-between text-xs">
                                                    <span className="text-white/40 capitalize">{formatHealthLabel(k)}</span>
                                                    <span className={`text-white/80 font-mono ${k === 'endpoint' ? 'max-w-[58%] truncate text-right' : ''}`}>
                                                        {formatHealthValue(k, v)}
                                                    </span>
                                                </div>
                                            ));
                                        })()}
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
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-cyan-300" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Runtime Surfaces</h2>
                        <p className="text-sm text-white/50">Storage, blockchain, queue depth, and control-plane counts</p>
                    </div>
                </div>

                {runtimeError ? (
                    <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg">{runtimeError}</div>
                ) : !runtime ? (
                    <div className="text-white/40 text-sm">Loading runtime summary...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Storage</div>
                            <div className="mt-3 text-white font-medium">{runtime.storage?.backend || 'Unavailable'}</div>
                            <div className="mt-2 text-xs text-white/55">Available: {String(runtime.storage?.available ?? false)}</div>
                            {runtime.storage?.bucket || runtime.storage?.root ? (
                                <div className="text-xs text-white/40 mt-1 break-all">{runtime.storage?.bucket || runtime.storage?.root}</div>
                            ) : runtime.storage?.error ? (
                                <div className="text-xs text-red-300/70 mt-1 break-all">{runtime.storage.error}</div>
                            ) : null}
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Blockchain</div>
                            <div className="mt-3 text-white font-medium">{runtime.blockchain?.available ? 'Anchoring enabled' : 'Unavailable'}</div>
                            <div className="mt-2 text-xs text-white/55">Backend: {runtime.blockchain?.backend || 'Unavailable'}</div>
                            {runtime.blockchain?.endpoint ? (
                                <div className="text-xs text-white/40 mt-1 break-all">{runtime.blockchain.endpoint}</div>
                            ) : null}
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Queues</div>
                            <div className="mt-3 text-white font-medium">
                                {Object.values(runtime.queues || {}).reduce((total: number, entry: any) => total + Number(entry?.waiting || 0), 0)} waiting
                            </div>
                            <div className="mt-2 text-xs text-white/55">Access audit: {runtime.queues?.accessAudit?.waiting || 0} waiting</div>
                            <div className="text-xs text-white/40 mt-1">SIEM export: {runtime.queues?.siemExport?.waiting || 0} waiting</div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Controls</div>
                            <div className="mt-3 text-white font-medium">{runtime.controls?.serviceAccounts?.active || 0} active service accounts</div>
                            <div className="mt-2 text-xs text-white/55">Legal holds: {runtime.controls?.legalHolds || 0}</div>
                            <div className="text-xs text-white/40 mt-1">Pending approvals: {runtime.controls?.pendingApprovals || 0}</div>
                        </div>
                    </div>
                )}
            </GlassPanel>

            <GlassPanel className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <FileCode className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Live Operations Console</h2>
                        <p className="text-sm text-white/50">Real-time auth, access, pipeline, and governance activity with server-side filters.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
                    <label className="text-xs text-white/55 flex flex-col gap-1.5">
                        Function
                        <select
                            value={activityFilterDraft.functionKey}
                            onChange={(event) => setActivityFilterDraft((current) => ({ ...current, functionKey: event.target.value }))}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        >
                            {ACTIVITY_FUNCTION_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs text-white/55 flex flex-col gap-1.5">
                        Source
                        <select
                            value={activityFilterDraft.source}
                            onChange={(event) => setActivityFilterDraft((current) => ({ ...current, source: event.target.value }))}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        >
                            {ACTIVITY_SOURCE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs text-white/55 flex flex-col gap-1.5">
                        Result
                        <select
                            value={activityFilterDraft.result}
                            onChange={(event) => setActivityFilterDraft((current) => ({ ...current, result: event.target.value }))}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        >
                            {ACTIVITY_RESULT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs text-white/55 flex flex-col gap-1.5">
                        Actor
                        <input
                            value={activityFilterDraft.actor}
                            onChange={(event) => setActivityFilterDraft((current) => ({ ...current, actor: event.target.value }))}
                            placeholder="Email or actor"
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white placeholder:text-white/30"
                        />
                    </label>
                    <label className="text-xs text-white/55 flex flex-col gap-1.5">
                        Search
                        <input
                            value={activityFilterDraft.search}
                            onChange={(event) => setActivityFilterDraft((current) => ({ ...current, search: event.target.value }))}
                            placeholder="Action, asset, run, location"
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white placeholder:text-white/30"
                        />
                    </label>
                    <label className="text-xs text-white/55 flex flex-col gap-1.5">
                        From
                        <input
                            type="datetime-local"
                            value={activityFilterDraft.from}
                            onChange={(event) => setActivityFilterDraft((current) => ({ ...current, from: event.target.value }))}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        />
                    </label>
                    <label className="text-xs text-white/55 flex flex-col gap-1.5">
                        To
                        <input
                            type="datetime-local"
                            value={activityFilterDraft.to}
                            onChange={(event) => setActivityFilterDraft((current) => ({ ...current, to: event.target.value }))}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        />
                    </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label className="text-xs text-white/55 flex items-center gap-2">
                        <span>Rows</span>
                        <select
                            value={activityFilterDraft.limit}
                            onChange={(event) => setActivityFilterDraft((current) => ({ ...current, limit: Number(event.target.value) }))}
                            className="px-2.5 py-1.5 bg-black/30 border border-white/10 rounded text-white"
                        >
                            {[50, 100, 150, 250].map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        onClick={applyActivityFilters}
                        className="px-3 py-1.5 rounded text-xs font-semibold bg-orange-500/20 text-orange-200 hover:bg-orange-500/30"
                    >
                        APPLY FILTERS
                    </button>
                    <button
                        onClick={resetActivityFilters}
                        className="px-3 py-1.5 rounded text-xs font-semibold bg-white/10 text-white/75 hover:bg-white/15"
                    >
                        RESET
                    </button>
                    <button
                        onClick={() => fetchActivity(activityFilters)}
                        disabled={activityRefreshing}
                        className={`px-3 py-1.5 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 ${activityRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {activityRefreshing ? 'REFRESHING...' : 'REFRESH NOW'}
                    </button>
                    <div className="text-[11px] text-white/35">
                        Polling every 5s{activityFeed?.generatedAt ? ` • Last update ${new Date(activityFeed.generatedAt).toLocaleTimeString()}` : ''}
                    </div>
                </div>

                {activityError ? (
                    <div className="mt-4 text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg">{activityError}</div>
                ) : null}

                {!activityFeed ? (
                    <div className="mt-5 text-white/40 text-sm">Loading live operations…</div>
                ) : (
                    <>
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Events</div>
                                <div className="mt-2 text-2xl font-semibold text-white">{activityCounts?.total || 0}</div>
                                <div className="mt-1 text-xs text-white/45">Current filtered view</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Live Pipelines</div>
                                <div className="mt-2 text-2xl font-semibold text-white">{activityCounts?.activePipelineRuns || 0}</div>
                                <div className="mt-1 text-xs text-white/45">Runs currently in progress</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Access</div>
                                <div className="mt-2 text-2xl font-semibold text-white">{activityCounts?.byFunction?.access || 0}</div>
                                <div className="mt-1 text-xs text-white/45">Access-layer events</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Auth</div>
                                <div className="mt-2 text-2xl font-semibold text-white">{activityCounts?.byFunction?.auth || 0}</div>
                                <div className="mt-1 text-xs text-white/45">Authentication activity</div>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)] gap-6">
                            <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                                <div className="overflow-x-auto max-h-[560px]">
                                    <table className="min-w-full text-sm">
                                        <thead className="sticky top-0 bg-black/70 backdrop-blur border-b border-white/10">
                                            <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-white/35">
                                                <th className="px-4 py-3">Time</th>
                                                <th className="px-4 py-3">Function</th>
                                                <th className="px-4 py-3">Result</th>
                                                <th className="px-4 py-3">Action</th>
                                                <th className="px-4 py-3">Actor</th>
                                                <th className="px-4 py-3">Target</th>
                                                <th className="px-4 py-3">Summary</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activityItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-10 text-center text-white/40">
                                                        No activity matches the current filters.
                                                    </td>
                                                </tr>
                                            ) : activityItems.map((item) => (
                                                <tr key={item.id} className="border-b border-white/5 align-top">
                                                    <td className="px-4 py-3 text-xs text-white/45 whitespace-nowrap">
                                                        {new Date(item.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${getActivityFunctionBadgeClass(item.function)}`}>
                                                            {formatHealthLabel(item.function)}
                                                        </span>
                                                        <div className="mt-1 text-[11px] text-white/35">{formatHealthLabel(item.source)}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${getActivityResultBadgeClass(item.result)}`}>
                                                            {formatHealthLabel(item.result)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-mono text-[12px] text-white/85">{item.action}</div>
                                                        {item.resource ? (
                                                            <div className="mt-1 text-[11px] text-white/35">{formatHealthLabel(item.resource)}</div>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-white/80">{item.actor}</div>
                                                        <div className="mt-1 text-[11px] text-white/35">
                                                            {[item.location, item.networkZone, item.ip].filter(Boolean).join(' • ') || 'n/a'}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-white/80 break-all">{item.targetLabel || item.resourceId || 'n/a'}</div>
                                                        {(item.pipelineRunId || item.pipelineAssetId) ? (
                                                            <div className="mt-1 text-[11px] text-white/35 break-all">
                                                                {[item.pipelineRunId ? `run ${item.pipelineRunId}` : null, item.pipelineAssetId ? `asset ${item.pipelineAssetId}` : null].filter(Boolean).join(' • ')}
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-4 py-3 text-white/70 max-w-[360px]">
                                                        <div className="break-words">{item.summary}</div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-xs uppercase tracking-[0.2em] text-white/40">Pipeline Watch</div>
                                            <div className="mt-2 text-white font-medium">Active PQC Runs</div>
                                        </div>
                                        <div className="text-2xl font-semibold text-white">{livePipelineRuns.length}</div>
                                    </div>
                                    <div className="mt-2 text-xs text-white/45">
                                        Live tracker for current pipeline executions from the administrator page.
                                    </div>
                                </div>

                                {livePipelineRuns.length === 0 ? (
                                    <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/45">
                                        No pipeline runs are active right now.
                                    </div>
                                ) : livePipelineRuns.map((run) => (
                                    <div key={run.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium text-white break-all">{run.id}</div>
                                                <div className="mt-1 text-[11px] text-white/40">
                                                    Started {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'n/a'}
                                                </div>
                                            </div>
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${getActivityResultBadgeClass(run.status === 'IN_PROGRESS' ? 'active' : run.status === 'FAILED' ? 'failed' : 'success')}`}>
                                                {formatHealthLabel(run.status)}
                                            </span>
                                        </div>
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-xs text-white/55 mb-1.5">
                                                <span>Progress</span>
                                                <span>{run.progressPercent}%</span>
                                            </div>
                                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                                <div
                                                    className={`h-full ${run.status === 'FAILED' ? 'bg-red-500' : 'bg-cyan-500'}`}
                                                    style={{ width: `${run.progressPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/55">
                                            <div>Total: <span className="text-white/80">{run.totalFound}</span></div>
                                            <div>Processed: <span className="text-white/80">{run.processed}</span></div>
                                            <div>Skipped: <span className="text-white/80">{run.skipped}</span></div>
                                            <div>Failed: <span className="text-white/80">{run.failed}</span></div>
                                        </div>
                                        <div className="mt-3 text-[11px] text-white/40 break-all">
                                            {run.sourceRoot || 'source n/a'} {'->'} {run.destinationRoot || 'destination n/a'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </GlassPanel>

            <section className="space-y-4">
                <div className="px-1">
                    <div className="text-xs uppercase tracking-[0.24em] text-white/35">Group 1</div>
                    <h2 className="mt-2 text-xl font-semibold text-white">Response &amp; Containment</h2>
                    <p className="mt-1 text-sm text-white/50">Emergency controls, freeze actions, and legal-preservation workflows for active incidents.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <ShieldAlert className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">System Controls</h3>
                                <p className="text-sm text-white/50">Emergency pause controls for critical operations</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {controlsError ? (
                                <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg">{controlsError}</div>
                            ) : !controlsLoaded ? (
                                <div className="text-white/40 text-sm">Loading system controls...</div>
                            ) : systemControls.length === 0 ? (
                                <div className="text-white/40 text-sm">No system controls configured.</div>
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
                                                    {control.configured === false ? (
                                                        <div className="text-[11px] text-amber-300/80 mt-2">
                                                            Legacy default state detected. Review and save on first change before relying on this control.
                                                        </div>
                                                    ) : null}
                                                    <div className="text-[11px] text-white/40 mt-2">
                                                        Last update: {control.updatedAt && control.configured !== false ? new Date(control.updatedAt).toLocaleString() : 'Not explicitly configured'}
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

                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                                <ShieldAlert className="w-5 h-5 text-sky-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Freeze Center</h3>
                                <p className="text-sm text-white/50">Manage user activation and asset freeze status</p>
                            </div>
                        </div>

                        {freezeError ? (
                            <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg mb-4">{freezeError}</div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-4">
                            <div className="border border-white/10 bg-white/5 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3 gap-2">
                                    <h4 className="text-sm font-semibold text-white">Users</h4>
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
                                    <h4 className="text-sm font-semibold text-white">Assets</h4>
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
                </div>

                <GlassPanel className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-amber-300" />
                        </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Legal Hold Operations</h3>
                                <p className="text-sm text-white/50">Search assets, apply holds, and release holds from one queue</p>
                            </div>
                    </div>

                    {legalHoldError ? (
                        <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg mb-4">{legalHoldError}</div>
                    ) : null}

                    <div className="flex gap-3 mb-4">
                        <select
                            value={legalHoldFilter}
                            onChange={(e) => setLegalHoldFilter(e.target.value as LegalHoldFilter)}
                            className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        >
                            <option value="all">All Assets</option>
                            <option value="held">Held Assets</option>
                            <option value="available">Assets Without Hold</option>
                        </select>
                        <input
                            value={legalHoldSearch}
                            onChange={(e) => setLegalHoldSearch(e.target.value)}
                            placeholder="Search legal-hold assets"
                            className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                        />
                        <button
                            onClick={() => fetchLegalHoldAssets(legalHoldSearch.trim() || undefined, legalHoldFilter)}
                            className="px-4 py-2 rounded text-sm font-semibold bg-white/10 text-white/70 hover:bg-white/15"
                        >
                            FILTER
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                        {legalHoldAssets.length === 0 ? (
                            <div className="text-white/40 text-sm">
                                {legalHoldFilter === 'held'
                                    ? 'No pipeline assets are currently on legal hold.'
                                    : legalHoldFilter === 'available'
                                        ? 'No available assets matched the current filter.'
                                        : 'No pipeline assets matched the current filter.'}
                            </div>
                        ) : legalHoldAssets.map((asset) => (
                            <div key={asset.id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-white font-medium text-sm break-all">{asset.relativePath}</div>
                                        <div className="text-[11px] text-white/45 mt-1">
                                            {asset.classificationLevel} • {asset.ownerDepartment || 'unassigned'} • {asset.lifecycleState} • {asset.legalHold ? 'HOLD ACTIVE' : 'NO HOLD'}
                                        </div>
                                        {asset.legalHold ? (
                                            <div className="text-[11px] text-white/35 mt-1">
                                                Reason: {asset.legalHoldReason || 'not provided'}
                                            </div>
                                        ) : null}
                                    </div>
                                    <button
                                        onClick={() => updateLegalHold(asset.id, !asset.legalHold)}
                                        disabled={legalHoldUpdatingId === asset.id}
                                        className={`px-2.5 py-1 rounded text-[11px] font-semibold ${asset.legalHold
                                            ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                            : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                                            } ${legalHoldUpdatingId === asset.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        {asset.legalHold ? 'RELEASE' : 'APPLY HOLD'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassPanel>
            </section>

            <section className="space-y-4">
                <div className="px-1">
                    <div className="text-xs uppercase tracking-[0.24em] text-white/35">Group 2</div>
                    <h2 className="mt-2 text-xl font-semibold text-white">Access Review &amp; Policy</h2>
                    <p className="mt-1 text-sm text-white/50">Decision queues and policy thresholds that govern operational approval paths.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <FileCode className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Approval Queue</h3>
                                <p className="text-sm text-white/50">Review pending requests and inspect approval history</p>
                            </div>
                        </div>

                        {approvalsError ? (
                            <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg mb-4">{approvalsError}</div>
                        ) : null}

                        <div className="flex flex-col gap-3 mb-4 md:flex-row">
                            <select
                                value={approvalsStatusFilter}
                                onChange={(e) => setApprovalsStatusFilter(e.target.value as ApprovalStatusFilter)}
                                className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                            >
                                <option value="PENDING">Pending</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                                <option value="ALL">All statuses</option>
                            </select>
                            <input
                                value={approvalsSearch}
                                onChange={(e) => setApprovalsSearch(e.target.value)}
                                placeholder="Search operation, resource, or actor"
                                className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                            />
                            <button
                                onClick={() => fetchApprovals(approvalsStatusFilter, approvalsSearch.trim() || undefined)}
                                className="px-4 py-2 rounded text-sm font-semibold bg-white/10 text-white/70 hover:bg-white/15"
                            >
                                FILTER
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                            {approvals.length === 0 ? (
                                <div className="text-white/40 text-sm">No approvals matched the current filter.</div>
                            ) : (
                                approvals.map((approval) => {
                                    const busy = approvalUpdatingId === approval.id;
                                    const isPending = approval.status === 'PENDING';
                                    return (
                                        <div key={approval.id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-white font-medium text-sm">{approval.operationType}</div>
                                                    <div className="text-xs text-white/50 mt-1">{approval.resourceType} • {approval.resourceId || 'n/a'}</div>
                                                    <div className="text-[11px] text-white/40 mt-1">
                                                        Requested by {approval.requestedBy || 'unknown'} • {new Date(approval.createdAt).toLocaleString()}
                                                    </div>
                                                    {!isPending ? (
                                                        <div className="text-[11px] text-white/35 mt-1">
                                                            Reviewed by {approval.reviewedBy || 'unknown'} • {approval.reviewedAt ? new Date(approval.reviewedAt).toLocaleString() : 'n/a'}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                {isPending ? (
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
                                                ) : (
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${getActivityResultBadgeClass(approval.status === 'APPROVED' ? 'success' : 'failed')}`}>
                                                        {approval.status}
                                                    </span>
                                                )}
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

                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                <Settings className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Risk Rules</h3>
                                <p className="text-sm text-white/50">Configure thresholds for auto-approval and run limits</p>
                            </div>
                        </div>

                        {riskRulesError ? (
                            <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg mb-4">{riskRulesError}</div>
                        ) : null}

                        {!riskRulesConfigured && !riskRulesError ? (
                            <div className="text-amber-300 text-sm p-4 border border-amber-500/20 bg-amber-500/10 rounded-lg mb-4">
                                Risk rules are not active yet. Review the values below and save them to make approval gating enforceable.
                            </div>
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
                                        maxRiskScoreAutoApprove: e.target.value,
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
                                    <option value="">Select risk level</option>
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
                                        maxAssetsPerRun: e.target.value,
                                    }))}
                                    className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                                />
                            </label>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                onClick={submitRiskRules}
                                disabled={savingRiskRules}
                                className={`px-4 py-2 rounded text-sm font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 ${savingRiskRules ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {savingRiskRules ? 'SAVING...' : riskRulesConfigured ? 'SAVE RISK RULES' : 'ACTIVATE RISK RULES'}
                            </button>
                            <button
                                onClick={deactivateRiskRules}
                                disabled={deactivatingRiskRules || !riskRulesConfigured}
                                className={`px-4 py-2 rounded text-sm font-semibold bg-white/10 text-white/70 hover:bg-white/15 ${deactivatingRiskRules || !riskRulesConfigured ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {deactivatingRiskRules ? 'DEACTIVATING...' : 'DEACTIVATE RULES'}
                            </button>
                        </div>
                    </GlassPanel>
                </div>
            </section>

            <section className="space-y-4">
                <div className="px-1">
                    <div className="text-xs uppercase tracking-[0.24em] text-white/35">Group 3</div>
                    <h2 className="mt-2 text-xl font-semibold text-white">Identity &amp; Crypto Governance</h2>
                    <p className="mt-1 text-sm text-white/50">Provision internal principals and manage approved post-quantum algorithms from one governance surface.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                <Settings className="w-5 h-5 text-cyan-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Service Accounts</h3>
                                <p className="text-sm text-white/50">Create, edit, rotate, and disable internal application identities</p>
                            </div>
                        </div>

                        {serviceAccountsError ? (
                            <div className="text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg mb-4">{serviceAccountsError}</div>
                        ) : null}
                        {serviceAccountMessage ? (
                            <div className="text-cyan-100 text-sm p-4 border border-cyan-500/20 bg-cyan-500/10 rounded-lg mb-4 break-all">{serviceAccountMessage}</div>
                        ) : null}

                        <div className="flex flex-col gap-3 mb-4 md:flex-row">
                            <input
                                value={serviceAccountSearch}
                                onChange={(e) => setServiceAccountSearch(e.target.value)}
                                placeholder="Search service accounts"
                                className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                            />
                            <button
                                onClick={() => fetchServiceAccounts(serviceAccountSearch.trim() || undefined)}
                                className="px-4 py-2 rounded text-sm font-semibold bg-white/10 text-white/70 hover:bg-white/15"
                            >
                                FILTER
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <input
                                value={serviceAccountDraft.displayName}
                                onChange={(e) => setServiceAccountDraft((prev) => ({ ...prev, displayName: e.target.value }))}
                                placeholder="Display name"
                                className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                            />
                            <input
                                value={serviceAccountDraft.department}
                                onChange={(e) => setServiceAccountDraft((prev) => ({ ...prev, department: e.target.value }))}
                                placeholder="Department"
                                className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                            />
                            <select
                                value={serviceAccountDraft.role}
                                onChange={(e) => setServiceAccountDraft((prev) => ({ ...prev, role: e.target.value }))}
                                className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                            >
                                <option value="VIEWER">VIEWER</option>
                                <option value="SECURITY_ENGINEER">SECURITY_ENGINEER</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                            <select
                                value={serviceAccountDraft.clearanceLevel}
                                onChange={(e) => setServiceAccountDraft((prev) => ({ ...prev, clearanceLevel: e.target.value }))}
                                className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white"
                            >
                                <option value="L0_INTERNAL">L0_INTERNAL</option>
                                <option value="L1_SENSITIVE">L1_SENSITIVE</option>
                                <option value="L2_CONFIDENTIAL">L2_CONFIDENTIAL</option>
                                <option value="L3_RESTRICTED">L3_RESTRICTED</option>
                                <option value="L4_CRITICAL">L4_CRITICAL</option>
                            </select>
                            <input
                                value={serviceAccountDraft.projectMemberships}
                                onChange={(e) => setServiceAccountDraft((prev) => ({ ...prev, projectMemberships: e.target.value }))}
                                placeholder="Projects (comma separated)"
                                className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white md:col-span-2"
                            />
                            <input
                                value={serviceAccountDraft.allowedNetworkZones}
                                onChange={(e) => setServiceAccountDraft((prev) => ({ ...prev, allowedNetworkZones: e.target.value }))}
                                placeholder="Allowed network zones"
                                className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white md:col-span-2"
                            />
                            <textarea
                                value={serviceAccountDraft.description}
                                onChange={(e) => setServiceAccountDraft((prev) => ({ ...prev, description: e.target.value }))}
                                placeholder="Description"
                                className="px-3 py-2 bg-black/30 border border-white/10 rounded text-white md:col-span-2 min-h-[86px]"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={submitServiceAccount}
                                disabled={serviceAccountUpdatingId === (editingServiceAccountId || 'create')}
                                className={`px-4 py-2 rounded text-sm font-semibold bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 ${serviceAccountUpdatingId === (editingServiceAccountId || 'create') ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {serviceAccountUpdatingId === (editingServiceAccountId || 'create')
                                    ? (editingServiceAccountId ? 'SAVING...' : 'CREATING...')
                                    : (editingServiceAccountId ? 'SAVE CHANGES' : 'CREATE SERVICE ACCOUNT')}
                            </button>
                            {editingServiceAccountId ? (
                                <button
                                    onClick={cancelServiceAccountEdit}
                                    className="px-4 py-2 rounded text-sm font-semibold bg-white/10 text-white/70 hover:bg-white/15"
                                >
                                    CANCEL EDIT
                                </button>
                            ) : null}
                        </div>

                        <div className="space-y-3 mt-5 max-h-[420px] overflow-y-auto pr-1">
                            {serviceAccounts.length === 0 ? (
                                <div className="text-white/40 text-sm">No service accounts configured.</div>
                            ) : serviceAccounts.map((serviceAccount) => {
                                const busy = serviceAccountUpdatingId === serviceAccount.id;
                                return (
                                    <div key={serviceAccount.id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-white font-medium text-sm">{serviceAccount.displayName}</div>
                                                <div className="text-xs text-cyan-200/80 mt-1">{serviceAccount.clientId}</div>
                                                <div className="text-[11px] text-white/45 mt-1">
                                                    {serviceAccount.role} • {serviceAccount.clearanceLevel} • {serviceAccount.shadowUserEmail}
                                                </div>
                                                <div className="text-[11px] text-white/35 mt-1">
                                                    Last used: {serviceAccount.lastUsedAt ? new Date(serviceAccount.lastUsedAt).toLocaleString() : 'never'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => editServiceAccount(serviceAccount)}
                                                    disabled={busy}
                                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold bg-white/10 text-white/80 hover:bg-white/15 ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    onClick={() => rotateServiceAccountSecret(serviceAccount.id)}
                                                    disabled={busy}
                                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    ROTATE
                                                </button>
                                                <button
                                                    onClick={() => updateServiceAccountActive(serviceAccount.id, !serviceAccount.isActive)}
                                                    disabled={busy}
                                                    className={`px-2.5 py-1 rounded text-[11px] font-semibold ${serviceAccount.isActive ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'} ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    {serviceAccount.isActive ? 'DISABLE' : 'ENABLE'}
                                                </button>
                                            </div>
                                        </div>
                                        {serviceAccount.description ? (
                                            <div className="text-xs text-white/55 mt-2">{serviceAccount.description}</div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </GlassPanel>

                    <GlassPanel className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <FileCode className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">PQC Governance</h3>
                                <p className="text-sm text-white/50">Manage approved algorithms and key-rotation ceremonies</p>
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

                        {keyGovernanceError ? (
                            <div className="mt-4 text-red-400 text-sm p-4 border border-red-500/20 bg-red-500/10 rounded-lg">{keyGovernanceError}</div>
                        ) : null}
                        {keyGovernanceMessage ? (
                            <div className="mt-4 text-fuchsia-100 text-sm p-4 border border-fuchsia-500/20 bg-fuchsia-500/10 rounded-lg">{keyGovernanceMessage}</div>
                        ) : null}

                        <div className="mt-5 space-y-3">
                            <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-white font-medium">Attestation Signer</div>
                                        <div className="text-[11px] text-white/45 mt-1">
                                            Key ID: {truncateMiddle(keyGovernanceStatus?.attestation?.signerKeyId || 'n/a')}
                                        </div>
                                        <div className="text-[11px] text-white/35 mt-1">
                                            Rotated: {keyGovernanceStatus?.attestation?.rotatedAt ? new Date(keyGovernanceStatus.attestation.rotatedAt).toLocaleString() : 'never'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={rotateAttestationSigner}
                                        disabled={keyGovernanceUpdatingKey === 'attestation-rotate'}
                                        className={`px-3 py-1.5 rounded text-[11px] font-semibold bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/30 ${keyGovernanceUpdatingKey === 'attestation-rotate' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        {keyGovernanceUpdatingKey === 'attestation-rotate' ? 'ROTATING...' : 'ROTATE'}
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-white font-medium">Transport Keys</div>
                                        <div className="text-[11px] text-white/45 mt-1">
                                            KEM: {truncateMiddle(keyGovernanceStatus?.transport?.kem?.keyId || 'n/a')}
                                        </div>
                                        <div className="text-[11px] text-white/35 mt-1">
                                            Identity: {truncateMiddle(keyGovernanceStatus?.transport?.identity?.keyId || 'n/a')}
                                        </div>
                                    </div>
                                    <button
                                        onClick={rotateTransportKeys}
                                        disabled={keyGovernanceUpdatingKey === 'transport-rotate'}
                                        className={`px-3 py-1.5 rounded text-[11px] font-semibold bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/30 ${keyGovernanceUpdatingKey === 'transport-rotate' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        {keyGovernanceUpdatingKey === 'transport-rotate' ? 'ROTATING...' : 'ROTATE'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => runKeyRecoveryTest('attestation')}
                                    disabled={keyGovernanceUpdatingKey === 'recovery-attestation'}
                                    className={`px-3 py-1.5 rounded text-[11px] font-semibold bg-white/10 text-white/80 hover:bg-white/15 ${keyGovernanceUpdatingKey === 'recovery-attestation' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {keyGovernanceUpdatingKey === 'recovery-attestation' ? 'RUNNING...' : 'TEST ATTESTATION'}
                                </button>
                                <button
                                    onClick={() => runKeyRecoveryTest('transport')}
                                    disabled={keyGovernanceUpdatingKey === 'recovery-transport'}
                                    className={`px-3 py-1.5 rounded text-[11px] font-semibold bg-white/10 text-white/80 hover:bg-white/15 ${keyGovernanceUpdatingKey === 'recovery-transport' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {keyGovernanceUpdatingKey === 'recovery-transport' ? 'RUNNING...' : 'TEST TRANSPORT'}
                                </button>
                                <button
                                    onClick={() => runKeyRecoveryTest('all')}
                                    disabled={keyGovernanceUpdatingKey === 'recovery-all'}
                                    className={`px-3 py-1.5 rounded text-[11px] font-semibold bg-white/10 text-white/80 hover:bg-white/15 ${keyGovernanceUpdatingKey === 'recovery-all' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {keyGovernanceUpdatingKey === 'recovery-all' ? 'RUNNING...' : 'TEST ALL'}
                                </button>
                            </div>
                        </div>
                    </GlassPanel>
                </div>
            </section>

        </div>
    );
}
