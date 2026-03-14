'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle,
    Clock3,
    Key,
    Laptop,
    MapPin,
    RefreshCw,
    Search,
    ShieldCheck,
    Users,
} from 'lucide-react';

import { adminAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MetricCard } from '@/components/ui/MetricCard';
import { Modal } from '@/components/ui/Modal';

type Notice = {
    kind: 'success' | 'error' | 'info';
    message: string;
};

type DirectoryUser = {
    id: string;
    email: string;
    role: string;
    employeeId?: string | null;
    department?: string | null;
    clearanceLevel?: string | null;
    isActive: boolean;
    createdAt?: string;
    lastLoginAt?: string | null;
};

type ManagedCredentialStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

type ManagedCredentialRecord = {
    id: string;
    displayName: string;
    status: ManagedCredentialStatus;
    assignedUser: {
        id: string;
        email: string;
        employeeId?: string | null;
        department?: string | null;
        clearanceLevel?: string | null;
        role: string;
        isActive: boolean;
    };
    deviceId: string;
    deviceLabel?: string | null;
    deviceKeyAlgorithm: string;
    devicePublicKeyHash: string;
    networkZone: string;
    locationLabel?: string | null;
    locationCode?: string | null;
    issuedReason?: string | null;
    revokedReason?: string | null;
    expiresAt?: string | null;
    lastUsedAt?: string | null;
    issuedBy?: string | null;
    revokedBy?: string | null;
    createdAt: string;
    updatedAt: string;
};

type RuntimeSummary = {
    controls?: {
        managedCredentials?: {
            total?: number;
            active?: number;
        };
    };
};

type CredentialCreateDraft = {
    displayName: string;
    assignedUserId: string;
    deviceId: string;
    deviceLabel: string;
    deviceKeyAlgorithm: string;
    devicePublicKey: string;
    networkZone: string;
    locationLabel: string;
    locationCode: string;
    expiresAt: string;
    reason: string;
};

type CredentialEditDraft = {
    displayName: string;
    deviceLabel: string;
    networkZone: string;
    locationLabel: string;
    locationCode: string;
    expiresAt: string;
    reason: string;
};

const NETWORK_ZONES = ['UNKNOWN', 'INTERNAL', 'VPN', 'RESTRICTED', 'SECURE_ENCLAVE', 'EXTERNAL'] as const;
const DEVICE_KEY_ALGORITHMS = ['ML-KEM-512', 'ML-KEM-768', 'ML-KEM-1024'] as const;
const STATUS_FILTERS = ['ALL', 'ACTIVE', 'REVOKED', 'EXPIRED'] as const;

const CREATE_DRAFT_DEFAULT: CredentialCreateDraft = {
    displayName: '',
    assignedUserId: '',
    deviceId: '',
    deviceLabel: '',
    deviceKeyAlgorithm: 'ML-KEM-768',
    devicePublicKey: '',
    networkZone: 'INTERNAL',
    locationLabel: '',
    locationCode: '',
    expiresAt: '',
    reason: '',
};

function formatDateTime(value?: string | null) {
    if (!value) return 'n/a';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'n/a';
    return date.toLocaleString();
}

function toLocalDateTimeInput(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromLocalDateTimeInput(value: string) {
    if (!value.trim()) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

function formatZone(value?: string | null) {
    return String(value || 'UNKNOWN').replace(/_/g, ' ');
}

function shortenHash(value?: string | null) {
    const normalized = String(value || '').trim();
    if (normalized.length <= 18) return normalized || 'n/a';
    return `${normalized.slice(0, 10)}...${normalized.slice(-8)}`;
}

function isExpiringSoon(value?: string | null) {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const now = Date.now();
    return date.getTime() >= now && date.getTime() <= now + (7 * 24 * 60 * 60 * 1000);
}

function getNoticeClass(kind: Notice['kind']) {
    if (kind === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
    if (kind === 'error') return 'border-rose-500/30 bg-rose-500/10 text-rose-100';
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100';
}

function getBadgeClass(tone: 'default' | 'success' | 'warning' | 'danger' | 'info') {
    const base = 'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium';
    const tones = {
        default: 'border-white/15 bg-white/5 text-white/75',
        success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
        warning: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
        danger: 'border-rose-500/25 bg-rose-500/10 text-rose-200',
        info: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
    };

    return `${base} ${tones[tone]}`;
}

function getStatusTone(status: ManagedCredentialStatus) {
    if (status === 'ACTIVE') return 'success' as const;
    if (status === 'EXPIRED') return 'warning' as const;
    return 'danger' as const;
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
            {message}
        </div>
    );
}

function SectionHeader({
    icon: Icon,
    title,
    subtitle,
    meta,
}: {
    icon: LucideIcon;
    title: string;
    subtitle: string;
    meta?: ReactNode;
}) {
    return (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-cyan-300" />
                <div>
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    <p className="mt-1 text-sm text-white/55">{subtitle}</p>
                </div>
            </div>
            {meta}
        </div>
    );
}

function FieldLabel({ children }: { children: ReactNode }) {
    return <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/40">{children}</label>;
}

const fieldClassName = 'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none';

export default function CredentialsPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('Never');
    const [notice, setNotice] = useState<Notice | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [runtime, setRuntime] = useState<RuntimeSummary | null>(null);
    const [users, setUsers] = useState<DirectoryUser[]>([]);
    const [credentials, setCredentials] = useState<ManagedCredentialRecord[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [credentialSearch, setCredentialSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');
    const [workingKey, setWorkingKey] = useState<string | null>(null);
    const [createDraft, setCreateDraft] = useState<CredentialCreateDraft>(CREATE_DRAFT_DEFAULT);
    const [editTarget, setEditTarget] = useState<ManagedCredentialRecord | null>(null);
    const [editDraft, setEditDraft] = useState<CredentialEditDraft | null>(null);
    const [revokeTarget, setRevokeTarget] = useState<ManagedCredentialRecord | null>(null);
    const [revokeReason, setRevokeReason] = useState('');

    const selectedUser = useMemo(
        () => users.find((user) => user.id === createDraft.assignedUserId) || null,
        [users, createDraft.assignedUserId],
    );

    const expiringSoonCount = useMemo(
        () => credentials.filter((credential) => credential.status === 'ACTIVE' && isExpiringSoon(credential.expiresAt)).length,
        [credentials],
    );

    const revokedCount = useMemo(
        () => credentials.filter((credential) => credential.status === 'REVOKED').length,
        [credentials],
    );

    const loadPage = async ({ silent = false }: { silent?: boolean } = {}) => {
        try {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const [runtimeData, usersData, credentialsData] = await Promise.all([
                adminAPI.getRuntime(),
                adminAPI.getUsers(userSearch.trim() || undefined),
                adminAPI.getManagedCredentials({
                    search: credentialSearch.trim() || undefined,
                    status: statusFilter === 'ALL' ? undefined : statusFilter,
                }),
            ]);

            setRuntime((runtimeData || null) as RuntimeSummary | null);
            setUsers(Array.isArray(usersData) ? (usersData as DirectoryUser[]) : []);
            setCredentials(Array.isArray(credentialsData) ? (credentialsData as ManagedCredentialRecord[]) : []);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setError(typeof message === 'string' ? message : 'Failed to load the credential authority dashboard.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void loadPage();
    }, []);

    const handleCreateCredential = async () => {
        setWorkingKey('create');
        setNotice(null);

        try {
            const created = await adminAPI.createManagedCredential({
                displayName: createDraft.displayName.trim(),
                assignedUserId: createDraft.assignedUserId,
                deviceId: createDraft.deviceId.trim(),
                deviceLabel: createDraft.deviceLabel.trim() || undefined,
                deviceKeyAlgorithm: createDraft.deviceKeyAlgorithm,
                devicePublicKey: createDraft.devicePublicKey.trim(),
                networkZone: createDraft.networkZone,
                locationLabel: createDraft.locationLabel.trim() || undefined,
                locationCode: createDraft.locationCode.trim() || undefined,
                expiresAt: fromLocalDateTimeInput(createDraft.expiresAt),
                reason: createDraft.reason.trim() || undefined,
            });

            setCreateDraft({
                ...CREATE_DRAFT_DEFAULT,
                deviceKeyAlgorithm: createDraft.deviceKeyAlgorithm,
                networkZone: createDraft.networkZone,
            });
            setNotice({
                kind: 'success',
                message: `Managed credential ${created?.displayName || 'record'} issued successfully.`,
            });
            await loadPage({ silent: true });
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setNotice({
                kind: 'error',
                message: typeof message === 'string' ? message : 'Failed to issue managed credential.',
            });
        } finally {
            setWorkingKey(null);
        }
    };

    const openEditModal = (credential: ManagedCredentialRecord) => {
        setEditTarget(credential);
        setEditDraft({
            displayName: credential.displayName,
            deviceLabel: credential.deviceLabel || '',
            networkZone: credential.networkZone,
            locationLabel: credential.locationLabel || '',
            locationCode: credential.locationCode || '',
            expiresAt: toLocalDateTimeInput(credential.expiresAt),
            reason: '',
        });
    };

    const handleUpdateCredential = async () => {
        if (!editTarget || !editDraft) return;

        const workKey = `update:${editTarget.id}`;
        setWorkingKey(workKey);
        setNotice(null);

        try {
            await adminAPI.updateManagedCredential(editTarget.id, {
                displayName: editDraft.displayName.trim(),
                deviceLabel: editDraft.deviceLabel.trim() || null,
                networkZone: editDraft.networkZone,
                locationLabel: editDraft.locationLabel.trim() || null,
                locationCode: editDraft.locationCode.trim() || null,
                expiresAt: fromLocalDateTimeInput(editDraft.expiresAt),
                reason: editDraft.reason.trim() || undefined,
            });

            setNotice({
                kind: 'success',
                message: `Managed credential ${editTarget.displayName} updated.`,
            });
            setEditTarget(null);
            setEditDraft(null);
            await loadPage({ silent: true });
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setNotice({
                kind: 'error',
                message: typeof message === 'string' ? message : 'Failed to update managed credential.',
            });
        } finally {
            setWorkingKey(null);
        }
    };

    const handleRevokeCredential = async () => {
        if (!revokeTarget) return;

        const workKey = `revoke:${revokeTarget.id}`;
        setWorkingKey(workKey);
        setNotice(null);

        try {
            await adminAPI.revokeManagedCredential(revokeTarget.id, revokeReason.trim() || undefined);
            setNotice({
                kind: 'success',
                message: `Managed credential ${revokeTarget.displayName} revoked.`,
            });
            setRevokeTarget(null);
            setRevokeReason('');
            await loadPage({ silent: true });
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setNotice({
                kind: 'error',
                message: typeof message === 'string' ? message : 'Failed to revoke managed credential.',
            });
        } finally {
            setWorkingKey(null);
        }
    };

    if (loading) {
        return (
            <div className="p-6 lg:p-8">
                <GlassPanel className="p-10 text-center text-white/60 animate-pulse">
                    Loading credential authority registry and subject bindings...
                </GlassPanel>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 lg:p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white lg:text-3xl">Credential Authority</h1>
                    <p className="mt-1 max-w-3xl text-white/60">
                        Issue, update, and revoke managed device credentials bound to a person, machine, and network location for local QuantumVault checkout.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-white/45">
                        <Clock3 className="h-4 w-4" />
                        <span>Last updated: {lastUpdated}</span>
                        {refreshing && <span className="text-cyan-300">Refreshing...</span>}
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="glass-card min-w-[240px] px-4 py-3 text-sm">
                        <div className="font-medium text-white">Managed Credential Registry</div>
                        <div className="mt-1 text-white/50">
                            {credentials.length} visible records · {statusFilter === 'ALL' ? 'all statuses' : statusFilter.toLowerCase()}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2"
                        disabled={refreshing}
                        onClick={() => void loadPage({ silent: true })}
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                </div>
            </div>

            {notice && (
                <GlassPanel className={`p-4 text-sm ${getNoticeClass(notice.kind)}`}>
                    {notice.message}
                </GlassPanel>
            )}
            {error && (
                <GlassPanel className="border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                    {error}
                </GlassPanel>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    title="Total Issued"
                    value={runtime?.controls?.managedCredentials?.total ?? credentials.length}
                    icon={Key}
                    subtitle="All managed credentials recorded"
                    variant="default"
                />
                <MetricCard
                    title="Active Bindings"
                    value={runtime?.controls?.managedCredentials?.active ?? credentials.filter((entry) => entry.status === 'ACTIVE').length}
                    icon={ShieldCheck}
                    subtitle="Checkout-eligible credentials"
                    variant="success"
                />
                <MetricCard
                    title="Expiring Soon"
                    value={expiringSoonCount}
                    icon={Clock3}
                    subtitle="Active credentials expiring within 7 days"
                    variant="warning"
                />
                <MetricCard
                    title="Revoked In View"
                    value={revokedCount}
                    icon={AlertTriangle}
                    subtitle="Visible records already revoked"
                    variant="danger"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <GlassPanel className="p-6 xl:col-span-7">
                    <SectionHeader
                        icon={Key}
                        title="Issue Managed Credential"
                        subtitle="Create a device-bound ML-KEM credential assigned to a single internal user and network location."
                        meta={selectedUser ? <span className={getBadgeClass('success')}>{selectedUser.email}</span> : undefined}
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <FieldLabel>Credential Name</FieldLabel>
                            <input
                                className={fieldClassName}
                                placeholder="Finance laptop / Phoenix enclave"
                                value={createDraft.displayName}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, displayName: event.target.value }))}
                            />
                        </div>
                        <div>
                            <FieldLabel>Assigned User</FieldLabel>
                            <select
                                className={fieldClassName}
                                value={createDraft.assignedUserId}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, assignedUserId: event.target.value }))}
                            >
                                <option value="">Select a user</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.email} {user.department ? `· ${user.department}` : ''} {user.clearanceLevel ? `· ${user.clearanceLevel}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel>Device ID</FieldLabel>
                            <input
                                className={fieldClassName}
                                placeholder="phoenix-secure-lt-01"
                                value={createDraft.deviceId}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, deviceId: event.target.value }))}
                            />
                        </div>
                        <div>
                            <FieldLabel>Device Label</FieldLabel>
                            <input
                                className={fieldClassName}
                                placeholder="CFO secure workstation"
                                value={createDraft.deviceLabel}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, deviceLabel: event.target.value }))}
                            />
                        </div>
                        <div>
                            <FieldLabel>Key Algorithm</FieldLabel>
                            <select
                                className={fieldClassName}
                                value={createDraft.deviceKeyAlgorithm}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, deviceKeyAlgorithm: event.target.value }))}
                            >
                                {DEVICE_KEY_ALGORITHMS.map((algorithm) => (
                                    <option key={algorithm} value={algorithm}>{algorithm}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel>Network Zone</FieldLabel>
                            <select
                                className={fieldClassName}
                                value={createDraft.networkZone}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, networkZone: event.target.value }))}
                            >
                                {NETWORK_ZONES.map((zone) => (
                                    <option key={zone} value={zone}>{formatZone(zone)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel>Location Label</FieldLabel>
                            <input
                                className={fieldClassName}
                                placeholder="Phoenix secure room 4"
                                value={createDraft.locationLabel}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, locationLabel: event.target.value }))}
                            />
                        </div>
                        <div>
                            <FieldLabel>Location Code</FieldLabel>
                            <input
                                className={fieldClassName}
                                placeholder="PHX-SR4"
                                value={createDraft.locationCode}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, locationCode: event.target.value }))}
                            />
                        </div>
                        <div>
                            <FieldLabel>Expires At</FieldLabel>
                            <input
                                className={fieldClassName}
                                type="datetime-local"
                                value={createDraft.expiresAt}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, expiresAt: event.target.value }))}
                            />
                        </div>
                        <div>
                            <FieldLabel>Issue Reason</FieldLabel>
                            <input
                                className={fieldClassName}
                                placeholder="Authorized for quarterly reporting edits"
                                value={createDraft.reason}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, reason: event.target.value }))}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <FieldLabel>Device Public Key</FieldLabel>
                            <textarea
                                className={`${fieldClassName} min-h-[148px] resize-y font-mono text-xs leading-6`}
                                placeholder="Base64-encoded ML-KEM public key from the managed endpoint agent"
                                value={createDraft.devicePublicKey}
                                onChange={(event) => setCreateDraft((current) => ({ ...current, devicePublicKey: event.target.value }))}
                            />
                        </div>
                    </div>

                    {selectedUser ? (
                        <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 text-sm text-white/75 sm:grid-cols-3">
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">Person</div>
                                <div className="mt-2 font-medium text-white">{selectedUser.email}</div>
                                <div className="mt-1 text-white/50">{selectedUser.employeeId || 'No employee ID'}</div>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">Department</div>
                                <div className="mt-2 text-white">{selectedUser.department || 'n/a'}</div>
                                <div className="mt-1 text-white/50">{selectedUser.role}</div>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">Clearance</div>
                                <div className="mt-2 text-white">{selectedUser.clearanceLevel || 'n/a'}</div>
                                <div className="mt-1 text-white/50">{selectedUser.isActive ? 'Active subject' : 'Inactive subject'}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/85">
                            Select the internal user first. The issued credential is permanently bound to that person, device ID, public key, and network zone.
                        </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => void loadPage({ silent: true })}
                        >
                            <Search className="h-4 w-4" />
                            Refresh Directory
                        </Button>
                        <Button
                            disabled={workingKey === 'create'}
                            onClick={() => void handleCreateCredential()}
                        >
                            {workingKey === 'create' ? 'Issuing...' : 'Issue Credential'}
                        </Button>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6 xl:col-span-5">
                    <SectionHeader
                        icon={Users}
                        title="Subject Directory"
                        subtitle="Find the internal user who should hold the credential before issuing it."
                        meta={<span className={getBadgeClass('default')}>{users.length} visible users</span>}
                    />

                    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                        <input
                            className={fieldClassName}
                            placeholder="Search email, employee ID, or department"
                            value={userSearch}
                            onChange={(event) => setUserSearch(event.target.value)}
                        />
                        <Button
                            variant="outline"
                            className="gap-2 sm:min-w-[140px]"
                            onClick={() => void loadPage({ silent: true })}
                        >
                            <Search className="h-4 w-4" />
                            Search
                        </Button>
                    </div>

                    <div className="max-h-[620px] space-y-3 overflow-y-auto">
                        {users.length === 0 && (
                            <EmptyState message="No users matched the current directory search." />
                        )}
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className={`rounded-2xl border p-4 ${
                                    createDraft.assignedUserId === user.id
                                        ? 'border-cyan-500/30 bg-cyan-500/10'
                                        : 'border-white/10 bg-white/[0.03]'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-medium text-white">{user.email}</div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className={getBadgeClass(user.isActive ? 'success' : 'danger')}>
                                                {user.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className={getBadgeClass('default')}>{user.role}</span>
                                            {user.clearanceLevel && (
                                                <span className={getBadgeClass('info')}>{user.clearanceLevel}</span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={createDraft.assignedUserId === user.id ? 'primary' : 'outline'}
                                        onClick={() => setCreateDraft((current) => ({ ...current, assignedUserId: user.id }))}
                                    >
                                        {createDraft.assignedUserId === user.id ? 'Selected' : 'Assign'}
                                    </Button>
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-white/60 sm:grid-cols-2">
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-white/35">Employee</div>
                                        <div className="mt-1 text-white/75">{user.employeeId || 'n/a'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-white/35">Department</div>
                                        <div className="mt-1 text-white/75">{user.department || 'n/a'}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-white/35">Created</div>
                                        <div className="mt-1 text-white/75">{formatDateTime(user.createdAt)}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-[0.2em] text-white/35">Last Login</div>
                                        <div className="mt-1 text-white/75">{formatDateTime(user.lastLoginAt)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassPanel>
            </div>

            <GlassPanel className="p-6">
                <SectionHeader
                    icon={ShieldCheck}
                    title="Credential Registry"
                    subtitle="Review live person-machine-location bindings, expiration posture, and revocation state."
                    meta={<span className={getBadgeClass('default')}>{credentials.length} records</span>}
                />

                <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                    <input
                        className={fieldClassName}
                        placeholder="Search by person, device, location, or department"
                        value={credentialSearch}
                        onChange={(event) => setCredentialSearch(event.target.value)}
                    />
                    <select
                        className={fieldClassName}
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number])}
                    >
                        {STATUS_FILTERS.map((status) => (
                            <option key={status} value={status}>
                                {status === 'ALL' ? 'All statuses' : status}
                            </option>
                        ))}
                    </select>
                    <Button variant="outline" className="gap-2" onClick={() => void loadPage({ silent: true })}>
                        <Search className="h-4 w-4" />
                        Apply Filters
                    </Button>
                </div>

                <div className="space-y-4">
                    {credentials.length === 0 && (
                        <EmptyState message="No managed credentials matched the current registry filters." />
                    )}
                    {credentials.map((credential) => (
                        <div key={credential.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="truncate text-lg font-semibold text-white">{credential.displayName}</div>
                                        <span className={getBadgeClass(getStatusTone(credential.status))}>{credential.status}</span>
                                        <span className={getBadgeClass('default')}>{credential.deviceKeyAlgorithm}</span>
                                        <span className={getBadgeClass('info')}>{formatZone(credential.networkZone)}</span>
                                    </div>
                                    <div className="mt-2 text-sm text-white/60">
                                        {credential.assignedUser.email}
                                        {credential.assignedUser.department ? ` · ${credential.assignedUser.department}` : ''}
                                        {credential.assignedUser.clearanceLevel ? ` · ${credential.assignedUser.clearanceLevel}` : ''}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={credential.status !== 'ACTIVE'}
                                        onClick={() => openEditModal(credential)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={credential.status !== 'ACTIVE'}
                                        onClick={() => {
                                            setRevokeTarget(credential);
                                            setRevokeReason('');
                                        }}
                                    >
                                        Revoke
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/35">
                                        <Laptop className="h-4 w-4 text-cyan-300" />
                                        Machine
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">{credential.deviceLabel || credential.deviceId}</div>
                                    <div className="mt-1 text-xs text-white/45">{credential.deviceId}</div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/35">
                                        <MapPin className="h-4 w-4 text-cyan-300" />
                                        Location
                                    </div>
                                    <div className="mt-2 text-sm font-medium text-white">{credential.locationLabel || 'Unspecified'}</div>
                                    <div className="mt-1 text-xs text-white/45">
                                        {credential.locationCode || 'No code'} · {formatZone(credential.networkZone)}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <div className="text-xs uppercase tracking-[0.2em] text-white/35">Public Key Hash</div>
                                    <div className="mt-2 font-mono text-sm text-white">{shortenHash(credential.devicePublicKeyHash)}</div>
                                    <div className="mt-1 text-xs text-white/45">Issued {formatDateTime(credential.createdAt)}</div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                    <div className="text-xs uppercase tracking-[0.2em] text-white/35">Usage</div>
                                    <div className="mt-2 text-sm font-medium text-white">{formatDateTime(credential.lastUsedAt)}</div>
                                    <div className="mt-1 text-xs text-white/45">
                                        Expires {credential.expiresAt ? formatDateTime(credential.expiresAt) : 'never'}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-white/55 md:grid-cols-2">
                                <div>
                                    <span className="text-white/35">Issued by:</span>{' '}
                                    <span className="text-white/75">{credential.issuedBy || 'system'}</span>
                                    {credential.issuedReason ? (
                                        <>
                                            {' '}· <span className="text-white/35">reason:</span>{' '}
                                            <span className="text-white/75">{credential.issuedReason}</span>
                                        </>
                                    ) : null}
                                </div>
                                <div>
                                    <span className="text-white/35">Revocation:</span>{' '}
                                    <span className="text-white/75">{credential.revokedReason || 'n/a'}</span>
                                    {credential.revokedBy ? (
                                        <>
                                            {' '}· <span className="text-white/35">by:</span>{' '}
                                            <span className="text-white/75">{credential.revokedBy}</span>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassPanel>

            <Modal
                isOpen={Boolean(editTarget && editDraft)}
                onClose={() => {
                    setEditTarget(null);
                    setEditDraft(null);
                }}
                title={editTarget ? `Edit ${editTarget.displayName}` : 'Edit Credential'}
                size="lg"
            >
                {editTarget && editDraft && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <FieldLabel>Credential Name</FieldLabel>
                                <input
                                    className={fieldClassName}
                                    value={editDraft.displayName}
                                    onChange={(event) => setEditDraft((current) => current ? { ...current, displayName: event.target.value } : current)}
                                />
                            </div>
                            <div>
                                <FieldLabel>Device Label</FieldLabel>
                                <input
                                    className={fieldClassName}
                                    value={editDraft.deviceLabel}
                                    onChange={(event) => setEditDraft((current) => current ? { ...current, deviceLabel: event.target.value } : current)}
                                />
                            </div>
                            <div>
                                <FieldLabel>Network Zone</FieldLabel>
                                <select
                                    className={fieldClassName}
                                    value={editDraft.networkZone}
                                    onChange={(event) => setEditDraft((current) => current ? { ...current, networkZone: event.target.value } : current)}
                                >
                                    {NETWORK_ZONES.map((zone) => (
                                        <option key={zone} value={zone}>{formatZone(zone)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <FieldLabel>Expires At</FieldLabel>
                                <input
                                    className={fieldClassName}
                                    type="datetime-local"
                                    value={editDraft.expiresAt}
                                    onChange={(event) => setEditDraft((current) => current ? { ...current, expiresAt: event.target.value } : current)}
                                />
                            </div>
                            <div>
                                <FieldLabel>Location Label</FieldLabel>
                                <input
                                    className={fieldClassName}
                                    value={editDraft.locationLabel}
                                    onChange={(event) => setEditDraft((current) => current ? { ...current, locationLabel: event.target.value } : current)}
                                />
                            </div>
                            <div>
                                <FieldLabel>Location Code</FieldLabel>
                                <input
                                    className={fieldClassName}
                                    value={editDraft.locationCode}
                                    onChange={(event) => setEditDraft((current) => current ? { ...current, locationCode: event.target.value } : current)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <FieldLabel>Update Reason</FieldLabel>
                                <textarea
                                    className={`${fieldClassName} min-h-[120px] resize-y`}
                                    placeholder="Explain why this credential binding is being changed"
                                    value={editDraft.reason}
                                    onChange={(event) => setEditDraft((current) => current ? { ...current, reason: event.target.value } : current)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setEditTarget(null);
                                    setEditDraft(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                disabled={workingKey === `update:${editTarget.id}`}
                                onClick={() => void handleUpdateCredential()}
                            >
                                {workingKey === `update:${editTarget.id}` ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={Boolean(revokeTarget)}
                onClose={() => {
                    setRevokeTarget(null);
                    setRevokeReason('');
                }}
                title={revokeTarget ? `Revoke ${revokeTarget.displayName}` : 'Revoke Credential'}
                size="md"
            >
                {revokeTarget && (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                            This will immediately block future local checkout for {revokeTarget.assignedUser.email} on device {revokeTarget.deviceId}.
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm text-white/70 sm:grid-cols-2">
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">Machine</div>
                                <div className="mt-2 text-white">{revokeTarget.deviceLabel || revokeTarget.deviceId}</div>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">Location</div>
                                <div className="mt-2 text-white">{revokeTarget.locationLabel || formatZone(revokeTarget.networkZone)}</div>
                            </div>
                        </div>

                        <div>
                            <FieldLabel>Revocation Reason</FieldLabel>
                            <textarea
                                className={`${fieldClassName} min-h-[128px] resize-y`}
                                placeholder="Explain why the person-machine-location binding is being revoked"
                                value={revokeReason}
                                onChange={(event) => setRevokeReason(event.target.value)}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setRevokeTarget(null);
                                    setRevokeReason('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                disabled={workingKey === `revoke:${revokeTarget.id}`}
                                onClick={() => void handleRevokeCredential()}
                            >
                                {workingKey === `revoke:${revokeTarget.id}` ? 'Revoking...' : 'Revoke Credential'}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
