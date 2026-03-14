'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle,
    Clock3,
    Database,
    Download,
    Eye,
    FileKey2,
    Lock,
    RefreshCw,
    Shield,
    ShieldAlert,
    Upload,
} from 'lucide-react';

import { accessAPI, authAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { MetricCard } from '@/components/ui/MetricCard';
import { Modal } from '@/components/ui/Modal';

type AccessAction = 'VIEW' | 'DOWNLOAD' | 'CONTROLLED_DOWNLOAD';

type Notice = {
    kind: 'success' | 'error' | 'info';
    message: string;
};

type CurrentUser = {
    id: string;
    email: string;
    role: string;
    authSource?: string;
    department?: string | null;
    clearanceLevel?: string | null;
    identityType?: string;
    serviceAccountId?: string | null;
    createdAt?: string;
    lastLoginAt?: string | null;
};

type MonitoringClassification = {
    classificationLevel: string;
    count: number;
};

type MonitoringSession = {
    id: string;
    expiresAt: string;
    requesterUser?: {
        email?: string | null;
        department?: string | null;
    } | null;
    pipelineAsset?: {
        relativePath?: string | null;
        classificationLevel?: string | null;
    } | null;
};

type LegalHoldRecord = {
    id: string;
    relativePath: string;
    ownerDepartment?: string | null;
    legalHoldReason?: string | null;
    classificationLevel: string;
};

type IntegrityCheckRecord = {
    id: string;
    relativePath: string;
    integrityCheckTimestamp?: string | null;
    classificationLevel: string;
    encryptionState?: string | null;
};

type MonitoringSummary = {
    assetsByClassification: MonitoringClassification[];
    activeSessions: MonitoringSession[];
    expiringSessions: MonitoringSession[];
    deniedAttempts24h: number;
    pendingApprovals: number;
    legalHolds: LegalHoldRecord[];
    latestIntegrityChecks: IntegrityCheckRecord[];
};

type PolicyMatrixRow = {
    classificationLevel: string;
    allowedActions: string[];
    ttlSeconds: number;
    minDeviceCompliance: string;
    requireMfa: boolean;
    requireStepUp: boolean;
    allowedNetworkZones: string[];
    approvalRequired: boolean;
    controlledViewerRequired: boolean;
    policyVersion: string;
};

type RegistryAsset = {
    id: string;
    relativePath: string;
    classificationLevel: string;
    ownerDepartment?: string | null;
    lifecycleState: string;
    encryptionState: string;
    legalHold: boolean;
    retentionPolicy?: string | null;
    accessSessions?: Array<{ id: string }>;
    _count?: {
        accessRequests?: number;
    };
};

type AccessRequestRecord = {
    id: string;
    pipelineAssetId: string;
    requestedAction: string;
    classificationLevel: string;
    requestedAt: string;
    decision: string;
    decisionReason?: string | null;
    requesterClearanceLevel?: string | null;
    pipelineAsset?: {
        relativePath?: string | null;
    } | null;
    approval?: {
        status?: string | null;
    } | null;
};

type AccessSessionRecord = {
    id: string;
    pipelineAssetId: string;
    allowedAction: string;
    expiresAt: string;
    status: string;
    metadata?: {
        controlledViewerRequired?: boolean;
        checkout?: {
            bundleId?: string;
            credentialId?: string;
            state?: 'issued' | 'checked_in';
            issuedAt?: string;
            checkedInAt?: string;
            checkedInAssetId?: string;
            versionNumber?: number;
        };
    };
    pipelineAsset?: {
        relativePath?: string | null;
        classificationLevel?: string | null;
    } | null;
};

type ManagedCredentialRecord = {
    id: string;
    displayName: string;
    status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
    deviceId: string;
    deviceLabel?: string | null;
    deviceKeyAlgorithm: string;
    devicePublicKey: string;
    devicePublicKeyHash: string;
    networkZone: string;
    locationLabel?: string | null;
    locationCode?: string | null;
    expiresAt?: string | null;
    lastUsedAt?: string | null;
    issuedReason?: string | null;
    revokedReason?: string | null;
    createdAt: string;
    updatedAt: string;
};

type CheckoutBundleRecord = {
    schemaVersion?: string;
    bundleId?: string;
    filename?: string;
    expiresAt?: string;
    signature?: {
        signatureHex?: string;
        signingDigestHex?: string;
    };
    device?: {
        credentialId?: string;
        credentialName?: string;
        deviceId?: string;
        deviceLabel?: string | null;
        keyAlgorithm?: string;
    };
    [key: string]: unknown;
};

type AuditEventRecord = {
    id: string;
    action: string;
    eventType: string;
    result: string;
    createdAt: string;
    eventHash: string;
    blockchainTxHash?: string | null;
};

type ViewerState = {
    open: boolean;
    title: string;
    mimeType: string;
    contentBase64: string;
    previewText: string | null;
    viewerUrl: string | null;
    disposition: string;
    controlledViewerRequired: boolean;
    expiresAt?: string | Date;
};

const SESSION_TOKEN_STORAGE_KEY = 'qv-access-session-tokens';
const CHECKOUT_BUNDLE_STORAGE_KEY = 'qv-access-checkout-bundles';

function readSessionTokenMap(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writeSessionTokenMap(nextValue: Record<string, string>) {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, JSON.stringify(nextValue));
}

function storeSessionToken(sessionId: string, token: string) {
    const current = readSessionTokenMap();
    current[sessionId] = token;
    writeSessionTokenMap(current);
}

function getSessionToken(sessionId: string) {
    return readSessionTokenMap()[sessionId] || '';
}

function removeSessionToken(sessionId: string) {
    const current = readSessionTokenMap();
    delete current[sessionId];
    writeSessionTokenMap(current);
}

function readCheckoutBundleMap(): Record<string, CheckoutBundleRecord> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.sessionStorage.getItem(CHECKOUT_BUNDLE_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writeCheckoutBundleMap(nextValue: Record<string, CheckoutBundleRecord>) {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(CHECKOUT_BUNDLE_STORAGE_KEY, JSON.stringify(nextValue));
}

function storeCheckoutBundle(sessionId: string, bundle: CheckoutBundleRecord) {
    const current = readCheckoutBundleMap();
    current[sessionId] = bundle;
    writeCheckoutBundleMap(current);
}

function getCheckoutBundle(sessionId: string) {
    return readCheckoutBundleMap()[sessionId] || null;
}

function removeCheckoutBundle(sessionId: string) {
    const current = readCheckoutBundleMap();
    delete current[sessionId];
    writeCheckoutBundleMap(current);
}

function formatDateTime(value?: string | Date | null) {
    if (!value) return 'n/a';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'n/a';
    return date.toLocaleString();
}

function formatTtlLabel(ttlSeconds?: number) {
    const seconds = Number(ttlSeconds || 0);
    if (!seconds) return 'n/a';
    if (seconds % 3600 === 0) return `${seconds / 3600}h`;
    return `${Math.round(seconds / 60)}m`;
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

function getClassificationTone(level: string) {
    if (level === 'L4_CRITICAL') return 'danger' as const;
    if (level === 'L3_RESTRICTED') return 'warning' as const;
    if (level === 'L2_CONFIDENTIAL') return 'info' as const;
    if (level === 'L1_SENSITIVE') return 'success' as const;
    return 'default' as const;
}

function getDecisionTone(decision: string) {
    if (decision === 'APPROVED') return 'success' as const;
    if (decision === 'APPROVAL_REQUIRED') return 'warning' as const;
    if (decision === 'DENIED') return 'danger' as const;
    return 'default' as const;
}

function getSessionTone(status: string) {
    if (status === 'ACTIVE') return 'success' as const;
    if (status === 'EXPIRED') return 'warning' as const;
    if (status === 'REVOKED') return 'danger' as const;
    return 'default' as const;
}

function allowedActionsForClassification(classificationLevel: string) {
    if (classificationLevel === 'L0_INTERNAL' || classificationLevel === 'L1_SENSITIVE') {
        return ['VIEW', 'DOWNLOAD'] as const;
    }
    if (classificationLevel === 'L2_CONFIDENTIAL') {
        return ['VIEW', 'CONTROLLED_DOWNLOAD'] as const;
    }
    return ['VIEW'] as const;
}

function decodePreview(contentBase64: string, mimeType: string) {
    const isTextLike = mimeType.startsWith('text/')
        || mimeType === 'application/json'
        || mimeType === 'text/csv';

    if (!isTextLike) {
        return null;
    }

    try {
        const binary = atob(contentBase64);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        const preview = new TextDecoder().decode(bytes);
        return preview.length > 12000 ? `${preview.slice(0, 12000)}\n\n...[truncated]` : preview;
    } catch {
        return null;
    }
}

function formatNetworkZone(value?: string | null) {
    return String(value || 'UNKNOWN').replace(/_/g, ' ');
}

function shortenHash(value?: string | null) {
    const normalized = String(value || '').trim();
    if (!normalized) return 'n/a';
    if (normalized.length <= 18) return normalized;
    return `${normalized.slice(0, 10)}...${normalized.slice(-8)}`;
}

function downloadJsonFile(filename: string, payload: unknown) {
    if (typeof window === 'undefined') return;
    const safeFilename = filename.replace(/[\\/]+/g, '_');
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = safeFilename;
    anchor.click();
    window.URL.revokeObjectURL(url);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        const chunk = bytes.subarray(index, index + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

async function sha256Hex(buffer: ArrayBuffer) {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
        return undefined;
    }

    const digest = await window.crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
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

export default function InternalAccessPage() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string>('Never');
    const [notice, setNotice] = useState<Notice | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [monitoring, setMonitoring] = useState<MonitoringSummary | null>(null);
    const [policyMatrix, setPolicyMatrix] = useState<PolicyMatrixRow[]>([]);
    const [assets, setAssets] = useState<RegistryAsset[]>([]);
    const [requests, setRequests] = useState<AccessRequestRecord[]>([]);
    const [sessions, setSessions] = useState<AccessSessionRecord[]>([]);
    const [managedCredentials, setManagedCredentials] = useState<ManagedCredentialRecord[]>([]);
    const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);
    const [workingKey, setWorkingKey] = useState<string | null>(null);
    const [viewerState, setViewerState] = useState<ViewerState>({
        open: false,
        title: '',
        mimeType: '',
        contentBase64: '',
        previewText: null,
        viewerUrl: null,
        disposition: 'inline',
        controlledViewerRequired: false,
    });
    const [checkoutState, setCheckoutState] = useState({
        open: false,
        session: null as AccessSessionRecord | null,
        credentialId: '',
        agentVersion: 'qv-web-console/1.0.0',
        workspaceId: '',
        reason: '',
        issuedBundle: null as CheckoutBundleRecord | null,
    });
    const [checkinState, setCheckinState] = useState({
        open: false,
        session: null as AccessSessionRecord | null,
        file: null as File | null,
        agentVersion: 'qv-web-console/1.0.0',
        editor: '',
        reason: '',
    });

    const classificationCards = useMemo(
        () => monitoring?.assetsByClassification || [],
        [monitoring],
    );
    const selectedCheckoutCredential = useMemo(
        () => managedCredentials.find((credential) => credential.id === checkoutState.credentialId) || null,
        [managedCredentials, checkoutState.credentialId],
    );

    const expiringSessions = monitoring?.expiringSessions || [];
    const latestIntegrityChecks = monitoring?.latestIntegrityChecks || [];
    const legalHoldQueue = monitoring?.legalHolds || [];

    const loadPage = async ({ silent = false }: { silent?: boolean } = {}) => {
        try {
            if (silent) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const [
                me,
                monitoringSummary,
                policyResponse,
                registryAssets,
                accessRequests,
                accessSessions,
                credentialResponse,
                accessAudit,
            ] = await Promise.all([
                authAPI.getMe(),
                accessAPI.getMonitoringSummary(),
                accessAPI.getPolicyMatrix(),
                accessAPI.getAssets(),
                accessAPI.getRequests(),
                accessAPI.getSessions(),
                accessAPI.getManagedCredentials('ACTIVE'),
                accessAPI.getAuditEvents(),
            ]);

            setCurrentUser((me || null) as CurrentUser | null);
            setMonitoring((monitoringSummary || null) as MonitoringSummary | null);
            setPolicyMatrix(Array.isArray(policyResponse) ? (policyResponse as PolicyMatrixRow[]) : []);
            setAssets(Array.isArray(registryAssets) ? (registryAssets as RegistryAsset[]) : []);
            setRequests(Array.isArray(accessRequests) ? (accessRequests as AccessRequestRecord[]) : []);
            setSessions(Array.isArray(accessSessions) ? (accessSessions as AccessSessionRecord[]) : []);
            setManagedCredentials(Array.isArray(credentialResponse) ? (credentialResponse as ManagedCredentialRecord[]) : []);
            setAuditEvents(Array.isArray(accessAudit) ? (accessAudit as AuditEventRecord[]) : []);
            setLastUpdated(new Date().toLocaleTimeString());
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setError(typeof message === 'string' ? message : 'Failed to load internal access dashboard.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        void loadPage();
    }, []);

    const requestAccess = async (pipelineAssetId: string, action: AccessAction) => {
        const workKey = `request:${pipelineAssetId}:${action}`;
        setWorkingKey(workKey);
        setNotice(null);

        try {
            const result = await accessAPI.requestAccess({
                pipelineAssetId,
                action,
            });

            const session = result?.session as { id?: string } | undefined;
            if (session?.id && result?.sessionToken) {
                storeSessionToken(session.id, result.sessionToken);
            }

            const decision = result?.decision?.decision || result?.request?.decision || 'UNKNOWN';
            if (decision === 'APPROVED') {
                setNotice({
                    kind: 'success',
                    message: `Access approved for ${action.replace('_', ' ')}. Session ${session?.id || ''} is active.`,
                });
            } else if (decision === 'APPROVAL_REQUIRED') {
                setNotice({
                    kind: 'info',
                    message: `Approval required. Request ${result?.request?.id || ''} is waiting for administrator review.`,
                });
            } else {
                setNotice({
                    kind: 'error',
                    message: result?.decision?.reason || 'Access request was denied.',
                });
            }

            await loadPage({ silent: true });
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setNotice({
                kind: 'error',
                message: typeof message === 'string' ? message : 'Failed to request access.',
            });
        } finally {
            setWorkingKey(null);
        }
    };

    const activateRequest = async (requestId: string) => {
        const workKey = `activate:${requestId}`;
        setWorkingKey(workKey);
        setNotice(null);

        try {
            const result = await accessAPI.activateRequest(requestId);
            const session = result?.session as { id?: string } | undefined;

            if (session?.id && result?.sessionToken) {
                storeSessionToken(session.id, result.sessionToken);
            }

            setNotice({
                kind: 'success',
                message: `Approved request activated. Session ${session?.id || ''} is active.`,
            });
            await loadPage({ silent: true });
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setNotice({
                kind: 'error',
                message: typeof message === 'string' ? message : 'Failed to activate approved request.',
            });
        } finally {
            setWorkingKey(null);
        }
    };

    const openSession = async (session: AccessSessionRecord) => {
        const workKey = `open:${session.id}`;
        setWorkingKey(workKey);
        setNotice(null);

        try {
            const sessionToken = getSessionToken(session.id);
            if (!sessionToken) {
                throw new Error('Session token is only available in the browser session that requested or activated access.');
            }

            const materialized = await accessAPI.viewSession(session.id, sessionToken, 'inline');
            const controlledViewerRequired = Boolean(materialized.controlledViewerRequired);
            const viewerToken = typeof materialized.viewerToken === 'string' ? materialized.viewerToken : '';
            setViewerState({
                open: true,
                title: materialized.filename || session.pipelineAsset?.relativePath || session.id,
                mimeType: materialized.mimeType || 'application/octet-stream',
                contentBase64: controlledViewerRequired ? '' : materialized.contentBase64 || '',
                previewText: controlledViewerRequired
                    ? null
                    : decodePreview(materialized.contentBase64 || '', materialized.mimeType || ''),
                viewerUrl: controlledViewerRequired && viewerToken
                    ? accessAPI.buildViewerUrl(session.id, viewerToken)
                    : null,
                disposition: materialized.contentDisposition || 'inline',
                controlledViewerRequired,
                expiresAt: materialized.expiresAt,
            });
            setNotice({
                kind: 'info',
                message: controlledViewerRequired
                    ? `Session ${session.id} opened in controlled-viewer mode.`
                    : `Session ${session.id} opened in ${materialized.contentDisposition || 'inline'} mode.`,
            });
            await loadPage({ silent: true });
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setNotice({
                kind: 'error',
                message: typeof message === 'string' ? message : 'Failed to open access session.',
            });
        } finally {
            setWorkingKey(null);
        }
    };

    const openCheckoutModal = (session: AccessSessionRecord) => {
        const existingBundle = getCheckoutBundle(session.id);
        const preferredCredentialId =
            session.metadata?.checkout?.credentialId
            || existingBundle?.device?.credentialId
            || (managedCredentials.length === 1 ? managedCredentials[0].id : '');

        setCheckoutState({
            open: true,
            session,
            credentialId: preferredCredentialId,
            agentVersion: 'qv-web-console/1.0.0',
            workspaceId: '',
            reason: '',
            issuedBundle: existingBundle,
        });
    };

    const openCheckinModal = (session: AccessSessionRecord) => {
        setCheckinState({
            open: true,
            session,
            file: null,
            agentVersion: 'qv-web-console/1.0.0',
            editor: '',
            reason: '',
        });
    };

    const issueCheckoutBundle = async () => {
        const session = checkoutState.session;
        if (!session) {
            return;
        }

        const credential = managedCredentials.find((entry) => entry.id === checkoutState.credentialId);
        if (!credential) {
            setNotice({
                kind: 'error',
                message: 'Select an active managed credential before issuing a checkout bundle.',
            });
            return;
        }

        const workKey = `checkout:${session.id}`;
        setWorkingKey(workKey);
        setNotice(null);

        try {
            const sessionToken = getSessionToken(session.id);
            if (!sessionToken) {
                throw new Error('Session token is only available in the browser session that requested or activated access.');
            }

            const bundle = await accessAPI.checkoutSession(session.id, {
                sessionToken,
                credentialId: credential.id,
                deviceKeyAlgorithm: credential.deviceKeyAlgorithm,
                devicePublicKey: credential.devicePublicKey,
                agentVersion: checkoutState.agentVersion || undefined,
                workspaceId: checkoutState.workspaceId || undefined,
                reason: checkoutState.reason || undefined,
            });

            storeCheckoutBundle(session.id, bundle as CheckoutBundleRecord);
            downloadJsonFile(
                `${bundle?.filename || session.pipelineAsset?.relativePath || `quantumvault-${session.id}`}.checkout.json`,
                bundle,
            );
            setCheckoutState((current) => ({
                ...current,
                issuedBundle: (bundle || null) as CheckoutBundleRecord | null,
            }));
            setNotice({
                kind: 'success',
                message: `Checkout bundle ${bundle?.bundleId || ''} issued and downloaded.`,
            });
            await loadPage({ silent: true });
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setNotice({
                kind: 'error',
                message: typeof message === 'string' ? message : 'Failed to issue managed checkout bundle.',
            });
        } finally {
            setWorkingKey(null);
        }
    };

    const submitCheckin = async () => {
        const session = checkinState.session;
        const file = checkinState.file;
        const checkoutBundleId = session?.metadata?.checkout?.bundleId || '';
        if (!session || !file || !checkoutBundleId) {
            setNotice({
                kind: 'error',
                message: 'Select the edited file and make sure the session has an issued checkout bundle.',
            });
            return;
        }

        const workKey = `checkin:${session.id}`;
        setWorkingKey(workKey);
        setNotice(null);

        try {
            const sessionToken = getSessionToken(session.id);
            if (!sessionToken) {
                throw new Error('Session token is only available in the browser session that requested or activated access.');
            }

            const buffer = await file.arrayBuffer();
            const contentBase64 = arrayBufferToBase64(buffer);
            const contentSha256 = await sha256Hex(buffer);
            const result = await accessAPI.checkinSession(session.id, {
                sessionToken,
                checkoutBundleId,
                contentBase64,
                contentSha256,
                mediaType: file.type || undefined,
                agentVersion: checkinState.agentVersion || undefined,
                editor: checkinState.editor || undefined,
                reason: checkinState.reason || undefined,
            });

            removeCheckoutBundle(session.id);
            removeSessionToken(session.id);
            setCheckinState({
                open: false,
                session: null,
                file: null,
                agentVersion: 'qv-web-console/1.0.0',
                editor: '',
                reason: '',
            });
            setNotice({
                kind: 'success',
                message: `Check-in completed. New asset version ${result?.versionNumber || ''} stored as ${result?.newAssetId || ''}.`,
            });
            await loadPage({ silent: true });
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setNotice({
                kind: 'error',
                message: typeof message === 'string' ? message : 'Failed to check in edited content.',
            });
        } finally {
            setWorkingKey(null);
        }
    };

    const closeSession = async (sessionId: string) => {
        const workKey = `close:${sessionId}`;
        setWorkingKey(workKey);
        setNotice(null);

        try {
            await accessAPI.closeSession(sessionId, 'closed_from_dashboard');
            removeSessionToken(sessionId);
            removeCheckoutBundle(sessionId);
            setNotice({
                kind: 'success',
                message: `Session ${sessionId} closed and rewrapped key material destroyed.`,
            });
            await loadPage({ silent: true });
        } catch (err: unknown) {
            const message = err && typeof err === 'object'
                ? (err as { response?: { data?: { message?: unknown } }; message?: string }).response?.data?.message
                    || (err as { message?: string }).message
                : null;

            setNotice({
                kind: 'error',
                message: typeof message === 'string' ? message : 'Failed to close access session.',
            });
        } finally {
            setWorkingKey(null);
        }
    };

    if (loading) {
        return (
            <div className="p-6 lg:p-8">
                <GlassPanel className="p-10 text-center text-white/60 animate-pulse">
                    Loading internal access registry and session controls...
                </GlassPanel>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 lg:p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white lg:text-3xl">
                        Internal Secure Access
                    </h1>
                    <p className="mt-1 max-w-3xl text-white/60">
                        Identity-bound access requests, session-scoped key release, immutable audit events,
                        and classification-aware monitoring for pipeline-produced assets.
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-white/45">
                        <Clock3 className="h-4 w-4" />
                        <span>Last updated: {lastUpdated}</span>
                        {refreshing && <span className="text-cyan-300">Refreshing...</span>}
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="glass-card min-w-[240px] px-4 py-3 text-sm">
                        <div className="font-medium text-white">
                            {currentUser?.email || 'Unknown user'}
                        </div>
                        <div className="mt-1 text-white/50">
                            {[
                                currentUser?.identityType === 'service_account' ? 'Service Account' : currentUser?.role,
                                currentUser?.clearanceLevel,
                                currentUser?.department,
                            ]
                                .filter(Boolean)
                                .join(' · ') || 'Identity context unavailable'}
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
                    title="Active Access Sessions"
                    value={monitoring?.activeSessions.length || 0}
                    icon={Lock}
                    subtitle="Short-lived decryption windows"
                    variant="default"
                />
                <MetricCard
                    title="Denied Attempts (24h)"
                    value={Number(monitoring?.deniedAttempts24h || 0)}
                    icon={ShieldAlert}
                    subtitle="Policy-denied access paths"
                    variant="danger"
                />
                <MetricCard
                    title="Legal Holds"
                    value={legalHoldQueue.length}
                    icon={AlertTriangle}
                    subtitle="Registry assets under hold"
                    variant="warning"
                />
                <MetricCard
                    title="Pending Approvals"
                    value={Number(monitoring?.pendingApprovals || 0)}
                    icon={Clock3}
                    subtitle="Manual L4 or override review"
                    variant="info"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <GlassPanel className="p-6 xl:col-span-5">
                    <SectionHeader
                        icon={Shield}
                        title="Classification Posture"
                        subtitle="Asset volume, session pressure, and integrity watch by classification tier."
                        meta={
                            <span className={getBadgeClass('info')}>
                                {classificationCards.length} tiers observed
                            </span>
                        }
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {classificationCards.length === 0 && (
                            <EmptyState message="No classified assets are available yet." />
                        )}
                        {classificationCards.map((entry) => {
                            const tone = getClassificationTone(entry.classificationLevel);
                            return (
                                <div
                                    key={entry.classificationLevel}
                                    className={`rounded-2xl border p-4 ${
                                        tone === 'danger'
                                            ? 'border-rose-500/20 bg-rose-500/10'
                                            : tone === 'warning'
                                                ? 'border-amber-500/20 bg-amber-500/10'
                                                : tone === 'info'
                                                    ? 'border-cyan-500/20 bg-cyan-500/10'
                                                    : tone === 'success'
                                                        ? 'border-emerald-500/20 bg-emerald-500/10'
                                                        : 'border-white/10 bg-white/[0.03]'
                                    }`}
                                >
                                    <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                                        {entry.classificationLevel}
                                    </div>
                                    <div className="mt-3 text-3xl font-bold text-white">{entry.count}</div>
                                    <div className="mt-2 text-sm text-white/55">
                                        Classification-scoped assets in the internal registry
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                            <div className="text-xs uppercase tracking-[0.2em] text-amber-100/70">
                                Expiry Watch
                            </div>
                            <div className="mt-3 text-2xl font-semibold text-white">
                                {expiringSessions.length}
                            </div>
                            <div className="mt-2 text-sm text-white/65">
                                {expiringSessions[0]?.pipelineAsset?.relativePath
                                    ? `${expiringSessions[0].pipelineAsset.relativePath} expires ${formatDateTime(expiringSessions[0].expiresAt)}`
                                    : 'No sessions expire within the next 15 minutes.'}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                            <div className="text-xs uppercase tracking-[0.2em] text-emerald-100/70">
                                Integrity Watch
                            </div>
                            <div className="mt-3 text-sm font-semibold text-white">
                                {latestIntegrityChecks[0]?.relativePath || 'No integrity checks recorded'}
                            </div>
                            <div className="mt-2 text-sm text-white/65">
                                {latestIntegrityChecks[0]
                                    ? `${latestIntegrityChecks[0].classificationLevel} · ${latestIntegrityChecks[0].encryptionState || 'unknown state'} · ${formatDateTime(latestIntegrityChecks[0].integrityCheckTimestamp)}`
                                    : 'Ingress integrity verification has not reported an asset yet.'}
                            </div>
                        </div>
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6 xl:col-span-7">
                    <SectionHeader
                        icon={FileKey2}
                        title="Access Policy Matrix"
                        subtitle="Live classification policy evaluated by the backend access engine."
                        meta={
                            policyMatrix[0]?.policyVersion ? (
                                <span className={getBadgeClass('default')}>
                                    {policyMatrix[0].policyVersion}
                                </span>
                            ) : undefined
                        }
                    />

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-left text-white/45">
                                    <th className="pb-3 pr-4">Class</th>
                                    <th className="pb-3 pr-4">Actions</th>
                                    <th className="pb-3 pr-4">TTL</th>
                                    <th className="pb-3 pr-4">Device</th>
                                    <th className="pb-3 pr-4">Auth</th>
                                    <th className="pb-3">Network</th>
                                </tr>
                            </thead>
                            <tbody>
                                {policyMatrix.map((row) => (
                                    <tr key={row.classificationLevel} className="border-b border-white/5 text-white/80">
                                        <td className="py-3 pr-4">
                                            <span className={getBadgeClass(getClassificationTone(row.classificationLevel))}>
                                                {row.classificationLevel}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <div>{row.allowedActions.join(', ')}</div>
                                            {row.controlledViewerRequired && (
                                                <div className="mt-1 text-xs text-cyan-200/75">
                                                    Controlled viewer required
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 pr-4">{formatTtlLabel(row.ttlSeconds)}</td>
                                        <td className="py-3 pr-4">{row.minDeviceCompliance}</td>
                                        <td className="py-3 pr-4">
                                            <div>
                                                {row.requireStepUp ? 'MFA + step-up' : row.requireMfa ? 'SSO + MFA' : 'SSO'}
                                            </div>
                                            {row.approvalRequired && (
                                                <div className="mt-1 text-xs text-amber-200/80">
                                                    Approval required
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3">
                                            {row.allowedNetworkZones.join(', ')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassPanel>
            </div>

            <GlassPanel className="p-6">
                <SectionHeader
                    icon={Database}
                    title="Asset Registry"
                    subtitle="Pipeline-produced assets with lifecycle, retention, and access state."
                    meta={<span className={getBadgeClass('default')}>{assets.length} assets loaded</span>}
                />

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-left text-white/45">
                                <th className="pb-3 pr-4">Asset</th>
                                <th className="pb-3 pr-4">Class</th>
                                <th className="pb-3 pr-4">Owner</th>
                                <th className="pb-3 pr-4">Lifecycle</th>
                                <th className="pb-3 pr-4">Encryption</th>
                                <th className="pb-3 pr-4">Hold</th>
                                <th className="pb-3 pr-4">Sessions</th>
                                <th className="pb-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-6">
                                        <EmptyState message="No pipeline assets are available in the internal registry." />
                                    </td>
                                </tr>
                            )}
                            {assets.slice(0, 24).map((asset) => {
                                const allowedActions = allowedActionsForClassification(asset.classificationLevel);
                                return (
                                    <tr key={asset.id} className="border-b border-white/5 align-top">
                                        <td className="min-w-[260px] py-4 pr-4">
                                            <div className="font-medium text-white">{asset.relativePath}</div>
                                            <div className="mt-1 text-xs text-white/45">{asset.id}</div>
                                            <div className="mt-2 text-xs text-white/40">
                                                {asset.retentionPolicy || 'No retention policy'} · {asset._count?.accessRequests || 0} requests
                                            </div>
                                        </td>
                                        <td className="py-4 pr-4">
                                            <span className={getBadgeClass(getClassificationTone(asset.classificationLevel))}>
                                                {asset.classificationLevel}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-white/70">{asset.ownerDepartment || 'n/a'}</td>
                                        <td className="py-4 pr-4 text-white/70">{asset.lifecycleState}</td>
                                        <td className="py-4 pr-4 text-white/70">{asset.encryptionState}</td>
                                        <td className="py-4 pr-4">
                                            <span className={getBadgeClass(asset.legalHold ? 'warning' : 'default')}>
                                                {asset.legalHold ? 'Legal hold' : 'No hold'}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-white/70">
                                            {asset.accessSessions?.length || 0}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {allowedActions.map((action) => {
                                                    const workKey = `request:${asset.id}:${action}`;
                                                    return (
                                                        <Button
                                                            key={action}
                                                            size="sm"
                                                            variant={action === 'VIEW' ? 'primary' : 'outline'}
                                                            disabled={workingKey === workKey}
                                                            onClick={() => void requestAccess(asset.id, action)}
                                                        >
                                                            {workingKey === workKey ? 'Requesting...' : action.replace('_', ' ')}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </GlassPanel>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <GlassPanel className="p-6">
                    <SectionHeader
                        icon={Clock3}
                        title="My Access Requests"
                        subtitle="Approved, denied, and pending approval workflows."
                        meta={<span className={getBadgeClass('default')}>{requests.length} requests</span>}
                    />

                    <div className="max-h-[480px] space-y-3 overflow-y-auto">
                        {requests.length === 0 && (
                            <EmptyState message="No access requests recorded for this user." />
                        )}
                        {requests.map((request) => (
                            <div key={request.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="font-medium text-white">
                                            {request.pipelineAsset?.relativePath || request.pipelineAssetId}
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className={getBadgeClass(getClassificationTone(request.classificationLevel))}>
                                                {request.classificationLevel}
                                            </span>
                                            <span className={getBadgeClass(getDecisionTone(request.decision))}>
                                                {request.decision}
                                            </span>
                                            <span className={getBadgeClass('default')}>
                                                {request.requestedAction}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-white/45">
                                        {formatDateTime(request.requestedAt)}
                                    </div>
                                </div>

                                <div className="mt-3 text-sm text-white/60">
                                    {request.decisionReason || 'No decision notes recorded.'}
                                </div>

                                <div className="mt-3 text-xs text-white/45">
                                    Clearance: {request.requesterClearanceLevel || 'n/a'}
                                    {request.approval?.status ? ` · Approval ${request.approval.status}` : ''}
                                </div>

                                {request.decision === 'APPROVAL_REQUIRED' && request.approval?.status === 'APPROVED' && (
                                    <div className="mt-4">
                                        <Button
                                            size="sm"
                                            disabled={workingKey === `activate:${request.id}`}
                                            onClick={() => void activateRequest(request.id)}
                                        >
                                            {workingKey === `activate:${request.id}` ? 'Activating...' : 'Activate Approved Request'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </GlassPanel>

                <GlassPanel className="p-6">
                    <SectionHeader
                        icon={Eye}
                        title="Active Sessions"
                        subtitle="Materialize controlled content only while the session token remains valid."
                        meta={
                            <div className="flex flex-wrap gap-2">
                                <span className={getBadgeClass('success')}>{monitoring?.activeSessions.length || 0} active</span>
                                <span className={getBadgeClass('info')}>{managedCredentials.length} checkout credentials</span>
                            </div>
                        }
                    />

                    <div className="max-h-[480px] space-y-3 overflow-y-auto">
                        {sessions.length === 0 && (
                            <EmptyState message="No active or recent access sessions yet." />
                        )}
                        {sessions.map((session) => {
                            const checkoutStateForSession = session.metadata?.checkout;
                            const managedCheckoutBlocked = Boolean(session.metadata?.controlledViewerRequired) || session.allowedAction === 'VIEW';
                            const canIssueCheckout = session.status === 'ACTIVE' && !managedCheckoutBlocked && checkoutStateForSession?.state !== 'issued';
                            const canCheckIn = session.status === 'ACTIVE' && checkoutStateForSession?.state === 'issued' && Boolean(checkoutStateForSession.bundleId);

                            return (
                                <div key={session.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-medium text-white">
                                                {session.pipelineAsset?.relativePath || session.pipelineAssetId}
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {session.pipelineAsset?.classificationLevel && (
                                                    <span className={getBadgeClass(getClassificationTone(session.pipelineAsset.classificationLevel))}>
                                                        {session.pipelineAsset.classificationLevel}
                                                    </span>
                                                )}
                                                <span className={getBadgeClass('default')}>
                                                    {session.allowedAction}
                                                </span>
                                                <span className={getBadgeClass(getSessionTone(session.status))}>
                                                    {session.status}
                                                </span>
                                                {checkoutStateForSession?.state && (
                                                    <span className={getBadgeClass(checkoutStateForSession.state === 'issued' ? 'info' : 'success')}>
                                                        {checkoutStateForSession.state === 'issued' ? 'Checkout issued' : 'Checked in'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-white/45">
                                            Expires {formatDateTime(session.expiresAt)}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-white/60 md:grid-cols-2">
                                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Managed Checkout</div>
                                            <div className="mt-2 text-white">
                                                {managedCheckoutBlocked
                                                    ? session.metadata?.controlledViewerRequired
                                                        ? 'Blocked by controlled-view policy'
                                                        : 'View-only session'
                                                    : canCheckIn
                                                        ? `Bundle ${checkoutStateForSession?.bundleId || 'issued'} is waiting for check-in`
                                                        : 'Eligible for local checkout with an active credential'}
                                            </div>
                                            <div className="mt-1 text-xs text-white/45">
                                                {checkoutStateForSession?.credentialId
                                                    ? `Credential ${checkoutStateForSession.credentialId}`
                                                    : `${managedCredentials.length} active credentials are available to this user`}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Checkout State</div>
                                            <div className="mt-2 text-white">
                                                {checkoutStateForSession?.state === 'issued'
                                                    ? `Issued ${formatDateTime(checkoutStateForSession.issuedAt || null)}`
                                                    : checkoutStateForSession?.state === 'checked_in'
                                                        ? `Checked in ${formatDateTime(checkoutStateForSession.checkedInAt || null)}`
                                                        : 'No local checkout issued'}
                                            </div>
                                            <div className="mt-1 text-xs text-white/45">
                                                {checkoutStateForSession?.versionNumber
                                                    ? `Returned as version ${checkoutStateForSession.versionNumber}`
                                                    : 'Session key material remains scoped to the active session'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            disabled={workingKey === `open:${session.id}`}
                                            onClick={() => void openSession(session)}
                                        >
                                            {workingKey === `open:${session.id}` ? 'Opening...' : 'Open'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={!canIssueCheckout || workingKey === `checkout:${session.id}` || managedCredentials.length === 0}
                                            onClick={() => openCheckoutModal(session)}
                                        >
                                            {workingKey === `checkout:${session.id}` ? 'Issuing...' : 'Checkout'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={!canCheckIn || workingKey === `checkin:${session.id}`}
                                            onClick={() => openCheckinModal(session)}
                                        >
                                            {workingKey === `checkin:${session.id}` ? 'Checking In...' : 'Check In'}
                                        </Button>
                                        {checkoutStateForSession?.state === 'issued' && getCheckoutBundle(session.id) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const bundle = getCheckoutBundle(session.id);
                                                    if (!bundle) return;
                                                    downloadJsonFile(
                                                        `${(bundle.filename as string) || session.pipelineAsset?.relativePath || `quantumvault-${session.id}`}.checkout.json`,
                                                        bundle,
                                                    );
                                                }}
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Download Bundle
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={workingKey === `close:${session.id}`}
                                            onClick={() => void closeSession(session.id)}
                                        >
                                            {workingKey === `close:${session.id}` ? 'Closing...' : 'Close'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </GlassPanel>
            </div>

            <GlassPanel className="p-6">
                <SectionHeader
                    icon={ShieldAlert}
                    title="Immutable Audit Feed"
                    subtitle="Signed and chain-hashed control-plane events from the access ledger."
                    meta={<span className={getBadgeClass('default')}>{auditEvents.length} events</span>}
                />

                <div className="max-h-[360px] space-y-3 overflow-y-auto">
                    {auditEvents.length === 0 && (
                        <EmptyState message="No audit ledger events available." />
                    )}
                    {auditEvents.map((event) => (
                        <div key={event.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="font-medium text-white">{event.action}</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className={getBadgeClass('default')}>{event.eventType}</span>
                                        <span className={getBadgeClass(event.result === 'success' ? 'success' : 'danger')}>
                                            {event.result}
                                        </span>
                                        <span className={getBadgeClass(event.blockchainTxHash ? 'success' : 'default')}>
                                            {event.blockchainTxHash ? 'Anchored' : 'DB only'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-white/45">
                                    {formatDateTime(event.createdAt)}
                                </div>
                            </div>

                            <div className="mt-3 break-all font-mono text-[11px] text-white/45">
                                {event.eventHash}
                            </div>
                        </div>
                    ))}
                </div>
            </GlassPanel>

            <Modal
                isOpen={viewerState.open}
                onClose={() => setViewerState((current) => ({ ...current, open: false }))}
                title={viewerState.title || 'Session Content'}
                size="xl"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Mime</div>
                            <div className="mt-2 text-sm text-white">{viewerState.mimeType}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Disposition</div>
                            <div className="mt-2 text-sm text-white">{viewerState.disposition}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Viewer Mode</div>
                            <div className="mt-2 text-sm text-white">
                                {viewerState.controlledViewerRequired ? 'Controlled viewer' : 'Standard'}
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Expires</div>
                            <div className="mt-2 text-sm text-white">{formatDateTime(viewerState.expiresAt || null)}</div>
                        </div>
                    </div>

                    {viewerState.viewerUrl ? (
                        <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-black/40">
                            <div className="border-b border-cyan-500/10 bg-cyan-500/5 px-4 py-3 text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                                Controlled viewer stream
                            </div>
                            <iframe
                                title={viewerState.title || 'Controlled Viewer'}
                                src={viewerState.viewerUrl}
                                className="h-[70vh] w-full bg-slate-950"
                            />
                        </div>
                    ) : viewerState.previewText ? (
                        <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-cyan-50">
                            {viewerState.previewText}
                        </pre>
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/60">
                            Binary or non-text content was materialized for this session. The backend returned
                            {` ${Math.round((viewerState.contentBase64.length * 3) / 4 / 1024)}KB `}
                            of decrypted payload in memory for inline handling.
                        </div>
                    )}
                </div>
            </Modal>

            <Modal
                isOpen={checkoutState.open}
                onClose={() => setCheckoutState((current) => ({ ...current, open: false, session: null, issuedBundle: null }))}
                title={checkoutState.session ? `Managed Checkout · ${checkoutState.session.pipelineAsset?.relativePath || checkoutState.session.id}` : 'Managed Checkout'}
                size="lg"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Session</div>
                            <div className="mt-2 text-sm text-white">{checkoutState.session?.id || 'n/a'}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Expires</div>
                            <div className="mt-2 text-sm text-white">{formatDateTime(checkoutState.session?.expiresAt || null)}</div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/35">Managed Credential</label>
                        <select
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:border-cyan-400/40 focus:outline-none"
                            value={checkoutState.credentialId}
                            onChange={(event) => setCheckoutState((current) => ({ ...current, credentialId: event.target.value }))}
                        >
                            <option value="">Select an active credential</option>
                            {managedCredentials.map((credential) => (
                                <option key={credential.id} value={credential.id}>
                                    {credential.displayName} · {credential.deviceLabel || credential.deviceId} · {formatNetworkZone(credential.networkZone)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedCheckoutCredential && (
                        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 text-sm text-white/75 md:grid-cols-3">
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">Machine</div>
                                <div className="mt-2 text-white">{selectedCheckoutCredential.deviceLabel || selectedCheckoutCredential.deviceId}</div>
                                <div className="mt-1 text-white/50">{selectedCheckoutCredential.deviceId}</div>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">Location</div>
                                <div className="mt-2 text-white">{selectedCheckoutCredential.locationLabel || 'Unspecified'}</div>
                                <div className="mt-1 text-white/50">
                                    {selectedCheckoutCredential.locationCode || 'No code'} · {formatNetworkZone(selectedCheckoutCredential.networkZone)}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-white/35">Key</div>
                                <div className="mt-2 text-white">{selectedCheckoutCredential.deviceKeyAlgorithm}</div>
                                <div className="mt-1 font-mono text-xs text-white/50">{shortenHash(selectedCheckoutCredential.devicePublicKeyHash)}</div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/35">Agent Version</label>
                            <input
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
                                value={checkoutState.agentVersion}
                                onChange={(event) => setCheckoutState((current) => ({ ...current, agentVersion: event.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/35">Workspace ID</label>
                            <input
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
                                value={checkoutState.workspaceId}
                                onChange={(event) => setCheckoutState((current) => ({ ...current, workspaceId: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/35">Reason</label>
                        <textarea
                            className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
                            value={checkoutState.reason}
                            onChange={(event) => setCheckoutState((current) => ({ ...current, reason: event.target.value }))}
                        />
                    </div>

                    {checkoutState.issuedBundle && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                            Bundle {checkoutState.issuedBundle.bundleId || 'issued'} was generated for credential {checkoutState.issuedBundle.device?.credentialName || checkoutState.issuedBundle.device?.credentialId || 'selected device'} and stored in this browser session for re-download.
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setCheckoutState((current) => ({ ...current, open: false, session: null, issuedBundle: null }))}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={workingKey === `checkout:${checkoutState.session?.id || ''}` || !checkoutState.credentialId}
                            onClick={() => void issueCheckoutBundle()}
                        >
                            {workingKey === `checkout:${checkoutState.session?.id || ''}` ? 'Issuing...' : 'Issue Bundle'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={checkinState.open}
                onClose={() => setCheckinState({
                    open: false,
                    session: null,
                    file: null,
                    agentVersion: 'qv-web-console/1.0.0',
                    editor: '',
                    reason: '',
                })}
                title={checkinState.session ? `Managed Check-In · ${checkinState.session.pipelineAsset?.relativePath || checkinState.session.id}` : 'Managed Check-In'}
                size="lg"
            >
                <div className="space-y-4">
                    <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 text-sm text-cyan-100">
                        Upload the edited file for the issued checkout bundle. QuantumVault will re-encrypt it as a new PQC-protected asset version and close the session.
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Checkout Bundle</div>
                            <div className="mt-2 break-all text-sm text-white">{checkinState.session?.metadata?.checkout?.bundleId || 'n/a'}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                            <div className="text-xs uppercase tracking-[0.2em] text-white/35">Issued At</div>
                            <div className="mt-2 text-sm text-white">{formatDateTime(checkinState.session?.metadata?.checkout?.issuedAt || null)}</div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/35">Edited File</label>
                        <input
                            type="file"
                            className="block w-full text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-cyan-500/20 file:px-4 file:py-2 file:text-cyan-100 hover:file:bg-cyan-500/30"
                            onChange={(event) => setCheckinState((current) => ({ ...current, file: event.target.files?.[0] || null }))}
                        />
                        <div className="mt-2 text-xs text-white/45">
                            {checkinState.file ? `${checkinState.file.name} · ${Math.round(checkinState.file.size / 1024)}KB` : 'No file selected'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/35">Agent Version</label>
                            <input
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
                                value={checkinState.agentVersion}
                                onChange={(event) => setCheckinState((current) => ({ ...current, agentVersion: event.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/35">Editor</label>
                            <input
                                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
                                value={checkinState.editor}
                                onChange={(event) => setCheckinState((current) => ({ ...current, editor: event.target.value }))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/35">Reason</label>
                        <textarea
                            className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-cyan-400/40 focus:outline-none"
                            value={checkinState.reason}
                            onChange={(event) => setCheckinState((current) => ({ ...current, reason: event.target.value }))}
                        />
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setCheckinState({
                                open: false,
                                session: null,
                                file: null,
                                agentVersion: 'qv-web-console/1.0.0',
                                editor: '',
                                reason: '',
                            })}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={workingKey === `checkin:${checkinState.session?.id || ''}` || !checkinState.file}
                            onClick={() => void submitCheckin()}
                        >
                            {workingKey === `checkin:${checkinState.session?.id || ''}` ? 'Checking In...' : 'Upload and Rewrap'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
