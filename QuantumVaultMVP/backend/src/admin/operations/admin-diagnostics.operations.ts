import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    JobStatus,
} from '@prisma/client';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { PrismaService } from '../../database/prisma.service';
import { MonitoringService } from '../../monitoring/monitoring.service';
import { ObjectStorageService } from '../../storage/object-storage.service';
import { VaultService } from '../../vault/vault.service';
import { parseJsonObject } from '../admin.utils';
import { AdminAccessOperations } from './admin-access.operations';

type AdminActivityFunction =
    | 'auth'
    | 'access'
    | 'pipeline'
    | 'credentials'
    | 'service_accounts'
    | 'governance'
    | 'controls'
    | 'assets'
    | 'system';

type AdminActivitySource = 'audit_log' | 'audit_ledger' | 'pipeline_run';
type AdminActivityResult = 'success' | 'pending' | 'denied' | 'failed' | 'active' | 'info';

type AdminActivityFilters = {
    function?: string;
    source?: string;
    result?: string;
    actor?: string;
    search?: string;
    from?: string;
    to?: string;
    limit?: string | number;
};

export class AdminDiagnosticsOperations {
    private readonly logger = new Logger(AdminDiagnosticsOperations.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly vaultService: VaultService,
        private readonly blockchainService: BlockchainService,
        private readonly configService: ConfigService,
        private readonly monitoringService: MonitoringService,
        private readonly objectStorageService: ObjectStorageService,
        private readonly accessOperations: AdminAccessOperations,
    ) { }

    private summarizeAuditDetails(details: unknown): string {
        const detailObj = parseJsonObject(details);
        const explicitMessage = typeof detailObj.message === 'string' ? detailObj.message.trim() : '';
        if (explicitMessage) {
            return explicitMessage;
        }

        const compactFields = ['reason', 'changeTicket', 'ceremonyId', 'resourceId', 'scope']
            .map((field) => ({ field, value: detailObj[field] }))
            .filter(({ value }) => value !== undefined && value !== null && String(value).trim() !== '')
            .slice(0, 3)
            .map(({ field, value }) => `${field}: ${String(value)}`);

        if (compactFields.length > 0) {
            return compactFields.join(' • ');
        }

        if (Object.keys(detailObj).length === 0) {
            return 'No additional details';
        }

        const serialized = JSON.stringify(detailObj);
        return serialized.length > 180 ? `${serialized.slice(0, 177)}...` : serialized;
    }

    private normalizeActivityText(value: unknown): string {
        return String(value || '').trim().toLowerCase();
    }

    private parseActivityDate(value: unknown): Date | null {
        const raw = String(value || '').trim();
        if (!raw) {
            return null;
        }

        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    private parseActivityLimit(value: unknown): number {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            return 150;
        }
        return Math.min(250, Math.max(25, Math.trunc(parsed)));
    }

    private normalizeActivityFunction(value: unknown): AdminActivityFunction | 'all' {
        const normalized = this.normalizeActivityText(value);
        if (!normalized || normalized === 'all') return 'all';

        const allowed = new Set<AdminActivityFunction>([
            'auth',
            'access',
            'pipeline',
            'credentials',
            'service_accounts',
            'governance',
            'controls',
            'assets',
            'system',
        ]);

        return allowed.has(normalized as AdminActivityFunction)
            ? (normalized as AdminActivityFunction)
            : 'all';
    }

    private normalizeActivitySource(value: unknown): AdminActivitySource | 'all' {
        const normalized = this.normalizeActivityText(value);
        if (!normalized || normalized === 'all') return 'all';

        const allowed = new Set<AdminActivitySource>(['audit_log', 'audit_ledger', 'pipeline_run']);
        return allowed.has(normalized as AdminActivitySource)
            ? (normalized as AdminActivitySource)
            : 'all';
    }

    private normalizeActivityResult(value: unknown): AdminActivityResult | 'all' {
        const normalized = this.normalizeActivityText(value);
        if (!normalized || normalized === 'all') return 'all';
        if (['approved', 'success', 'stored', 'issued', 'closed', 'completed', 'anchored', 'online'].includes(normalized)) {
            return 'success';
        }
        if (['approval_required', 'pending', 'queued', 'requested'].includes(normalized)) {
            return 'pending';
        }
        if (['denied', 'rejected'].includes(normalized)) {
            return 'denied';
        }
        if (['failed', 'error', 'offline'].includes(normalized)) {
            return 'failed';
        }
        if (['active', 'running', 'in_progress'].includes(normalized)) {
            return 'active';
        }

        const allowed = new Set<AdminActivityResult>(['success', 'pending', 'denied', 'failed', 'active', 'info']);
        return allowed.has(normalized as AdminActivityResult)
            ? (normalized as AdminActivityResult)
            : 'info';
    }

    private inferAuditLogFunction(action: string, resource?: string | null): AdminActivityFunction {
        const normalizedAction = String(action || '').trim().toUpperCase();
        const normalizedResource = String(resource || '').trim().toUpperCase();

        if (normalizedResource === 'AUTH' || normalizedAction.includes('LOGIN') || normalizedAction.includes('LOGOUT')) {
            return 'auth';
        }
        if (normalizedResource === 'MANAGED_CREDENTIAL') {
            return 'credentials';
        }
        if (normalizedResource === 'SERVICE_ACCOUNT') {
            return 'service_accounts';
        }
        if (normalizedResource === 'KEY_GOVERNANCE' || normalizedAction.includes('KEY_') || normalizedAction.includes('ATTESTATION_') || normalizedAction.includes('TRANSPORT_')) {
            return 'governance';
        }
        if (normalizedResource === 'SYSTEM_CONTROL' || normalizedResource === 'ADMIN_RISK_RULE' || normalizedResource === 'ADMIN_APPROVAL') {
            return 'controls';
        }
        if (normalizedResource === 'ASSET' || normalizedResource === 'USER') {
            return 'assets';
        }
        return 'system';
    }

    private inferAuditLogResult(action: string): AdminActivityResult {
        const normalizedAction = String(action || '').trim().toUpperCase();
        if (normalizedAction.includes('FAILED') || normalizedAction.includes('ERROR')) {
            return 'failed';
        }
        if (normalizedAction.includes('DENIED') || normalizedAction.includes('REJECTED')) {
            return 'denied';
        }
        if (normalizedAction.includes('REQUESTED') || normalizedAction.includes('PENDING')) {
            return 'pending';
        }
        if (
            normalizedAction.includes('LOGIN')
            || normalizedAction.includes('UPDATED')
            || normalizedAction.includes('CREATED')
            || normalizedAction.includes('ROTATED')
            || normalizedAction.includes('REVOKED')
            || normalizedAction.includes('APPROVED')
            || normalizedAction.includes('RECOVERY_TEST')
        ) {
            return 'success';
        }
        return 'info';
    }

    private inferLedgerFunction(): AdminActivityFunction {
        return 'access';
    }

    private actorFromAuditLog(userEmail: string | null | undefined, details: Record<string, unknown>): string {
        const fallbacks = [
            userEmail,
            typeof details.requestedBy === 'string' ? details.requestedBy : '',
            typeof details.reviewedBy === 'string' ? details.reviewedBy : '',
            typeof details.updatedBy === 'string' ? details.updatedBy : '',
            typeof details.issuedBy === 'string' ? details.issuedBy : '',
            typeof details.revokedBy === 'string' ? details.revokedBy : '',
            typeof details.rotatedBy === 'string' ? details.rotatedBy : '',
            typeof details.user === 'string' ? details.user : '',
        ];

        const actor = fallbacks.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
        return actor ? String(actor).trim() : 'SYSTEM';
    }

    private actorFromLedger(userEmail: string | null | undefined, payload: Record<string, unknown>): string {
        const requester = payload.requester && typeof payload.requester === 'object' && !Array.isArray(payload.requester)
            ? (payload.requester as Record<string, unknown>)
            : {};
        const fallbacks = [
            userEmail,
            typeof requester.email === 'string' ? requester.email : '',
            typeof payload.user === 'string' ? payload.user : '',
            typeof payload.requestedBy === 'string' ? payload.requestedBy : '',
        ];

        const actor = fallbacks.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
        return actor ? String(actor).trim() : 'SYSTEM';
    }

    private computePipelineProgress(run: {
        totalFound: number;
        processed: number;
        skipped: number;
        failed: number;
        status: string;
    }): number {
        const completed = Number(run.processed || 0) + Number(run.skipped || 0) + Number(run.failed || 0);
        const totalFound = Number(run.totalFound || 0);
        if (totalFound > 0) {
            return Math.min(100, Math.max(0, Math.round((completed / totalFound) * 100)));
        }
        return run.status === 'COMPLETED' ? 100 : 0;
    }

    private coerceStringArray(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value
                .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
                .map((entry) => entry.trim());
        }

        if (typeof value === 'string' && value.trim()) {
            try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                    return parsed
                        .filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
                        .map((entry) => entry.trim());
                }
            } catch {
                return [value.trim()];
            }
        }

        return [];
    }

    private coerceDate(value: unknown): Date | null {
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        if (typeof value === 'string' || typeof value === 'number') {
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        return null;
    }

    private async getPipelineRunsForActivity(take: number): Promise<Array<{
        id: string;
        status: string;
        sourceRoots: string[];
        destinationRoots: string[];
        startedAt: Date | null;
        completedAt: Date | null;
        totalFound: number;
        processed: number;
        skipped: number;
        failed: number;
        createdAt: Date;
        updatedAt: Date;
    }>> {
        try {
            const rows = await this.prisma.$queryRaw<Array<{
                id: string;
                status: string;
                sourceRootsJson: unknown;
                destinationRootsJson: unknown;
                startedAt: Date | string | null;
                completedAt: Date | string | null;
                totalFound: number | bigint | null;
                processed: number | bigint | null;
                skipped: number | bigint | null;
                failed: number | bigint | null;
                createdAt: Date | string | null;
                updatedAt: Date | string | null;
            }>>`
                SELECT
                    "id",
                    "status"::text AS "status",
                    to_jsonb("sourceRoots") AS "sourceRootsJson",
                    to_jsonb("destinationRoots") AS "destinationRootsJson",
                    "startedAt",
                    "completedAt",
                    "totalFound",
                    "processed",
                    "skipped",
                    "failed",
                    "createdAt",
                    "updatedAt"
                FROM "PipelineRun"
                ORDER BY "updatedAt" DESC
                LIMIT ${take}
            `;

            return rows
                .map((row) => {
                    const createdAt = this.coerceDate(row.createdAt);
                    const updatedAt = this.coerceDate(row.updatedAt);
                    if (!createdAt || !updatedAt) {
                        return null;
                    }

                    return {
                        id: row.id,
                        status: String(row.status || '').trim() || 'UNKNOWN',
                        sourceRoots: this.coerceStringArray(row.sourceRootsJson),
                        destinationRoots: this.coerceStringArray(row.destinationRootsJson),
                        startedAt: this.coerceDate(row.startedAt),
                        completedAt: this.coerceDate(row.completedAt),
                        totalFound: Number(row.totalFound ?? 0),
                        processed: Number(row.processed ?? 0),
                        skipped: Number(row.skipped ?? 0),
                        failed: Number(row.failed ?? 0),
                        createdAt,
                        updatedAt,
                    };
                })
                .filter((row): row is {
                    id: string;
                    status: string;
                    sourceRoots: string[];
                    destinationRoots: string[];
                    startedAt: Date | null;
                    completedAt: Date | null;
                    totalFound: number;
                    processed: number;
                    skipped: number;
                    failed: number;
                    createdAt: Date;
                    updatedAt: Date;
                } => Boolean(row));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Unable to load pipeline runs for admin activity feed: ${message}`);
            return [];
        }
    }

    private summarizePipelineRun(run: {
        totalFound: number;
        processed: number;
        skipped: number;
        failed: number;
        sourceRoots: string[];
        destinationRoots: string[];
        status: string;
    }): string {
        const segments = [
            `${Number(run.processed || 0)}/${Number(run.totalFound || 0)} processed`,
            `${Number(run.skipped || 0)} skipped`,
            `${Number(run.failed || 0)} failed`,
        ];
        const sourceRoot = Array.isArray(run.sourceRoots) && run.sourceRoots.length > 0 ? run.sourceRoots[0] : '';
        const destinationRoot = Array.isArray(run.destinationRoots) && run.destinationRoots.length > 0 ? run.destinationRoots[0] : '';
        if (sourceRoot || destinationRoot) {
            segments.push(`${sourceRoot || 'source'} -> ${destinationRoot || 'destination'}`);
        }
        if (run.status === 'IN_PROGRESS') {
            segments.push('live');
        }
        return segments.join(' • ');
    }

    private activityInRange(timestamp: Date, from: Date | null, to: Date | null): boolean {
        if (from && timestamp.getTime() < from.getTime()) {
            return false;
        }
        if (to && timestamp.getTime() > to.getTime()) {
            return false;
        }
        return true;
    }

    private matchesActivityFilters(
        item: {
            function: AdminActivityFunction;
            source: AdminActivitySource;
            result: AdminActivityResult;
            timestamp: string;
            actor: string;
            action: string;
            resource: string | null;
            resourceId: string | null;
            summary: string;
            targetLabel: string | null;
            ip: string | null;
            location: string | null;
            networkZone: string | null;
        },
        filters: {
            functionFilter: AdminActivityFunction | 'all';
            sourceFilter: AdminActivitySource | 'all';
            resultFilter: AdminActivityResult | 'all';
            actorFilter: string;
            searchFilter: string;
            from: Date | null;
            to: Date | null;
        },
    ): boolean {
        if (filters.functionFilter !== 'all' && item.function !== filters.functionFilter) {
            return false;
        }
        if (filters.sourceFilter !== 'all' && item.source !== filters.sourceFilter) {
            return false;
        }
        if (filters.resultFilter !== 'all' && item.result !== filters.resultFilter) {
            return false;
        }

        const timestamp = new Date(item.timestamp);
        if (Number.isNaN(timestamp.getTime()) || !this.activityInRange(timestamp, filters.from, filters.to)) {
            return false;
        }

        if (filters.actorFilter && !this.normalizeActivityText(item.actor).includes(filters.actorFilter)) {
            return false;
        }

        if (!filters.searchFilter) {
            return true;
        }

        const haystack = [
            item.action,
            item.actor,
            item.resource,
            item.resourceId,
            item.summary,
            item.targetLabel,
            item.ip,
            item.location,
            item.networkZone,
        ]
            .filter((value) => value !== null && value !== undefined)
            .map((value) => this.normalizeActivityText(value))
            .join(' ');

        return haystack.includes(filters.searchFilter);
    }

    async getActivityFeed(filters: AdminActivityFilters = {}) {
        const functionFilter = this.normalizeActivityFunction(filters.function);
        const sourceFilter = this.normalizeActivitySource(filters.source);
        const resultFilter = this.normalizeActivityResult(filters.result);
        const actorFilter = this.normalizeActivityText(filters.actor);
        const searchFilter = this.normalizeActivityText(filters.search);
        let from = this.parseActivityDate(filters.from);
        let to = this.parseActivityDate(filters.to);
        const limit = this.parseActivityLimit(filters.limit);

        if (from && to && from.getTime() > to.getTime()) {
            const swap = from;
            from = to;
            to = swap;
        }

        const sourceTake = Math.max(150, Math.min(500, limit * 4));
        const pipelineTake = Math.max(25, Math.min(100, limit * 2));

        const [auditLogs, auditLedgerEvents, pipelineRuns] = await Promise.all([
            sourceFilter === 'audit_ledger' || sourceFilter === 'pipeline_run'
                ? Promise.resolve([])
                : this.prisma.auditLog.findMany({
                    where: (from || to)
                        ? {
                            timestamp: {
                                ...(from ? { gte: from } : {}),
                                ...(to ? { lte: to } : {}),
                            },
                        }
                        : undefined,
                    take: sourceTake,
                    orderBy: { timestamp: 'desc' },
                    include: {
                        user: {
                            select: { email: true },
                        },
                    },
                }),
            sourceFilter === 'audit_log' || sourceFilter === 'pipeline_run'
                ? Promise.resolve([])
                : this.prisma.auditLedgerEvent.findMany({
                    where: (from || to)
                        ? {
                            createdAt: {
                                ...(from ? { gte: from } : {}),
                                ...(to ? { lte: to } : {}),
                            },
                        }
                        : undefined,
                    take: sourceTake,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: { email: true },
                        },
                        pipelineAsset: {
                            select: { relativePath: true },
                        },
                    },
                }),
            sourceFilter === 'audit_log' || sourceFilter === 'audit_ledger'
                ? Promise.resolve([])
                : this.getPipelineRunsForActivity(pipelineTake),
        ]);

        const auditLogItems = auditLogs.map((entry) => {
            const detailObj = parseJsonObject(entry.details);
            return {
                id: `audit-log:${entry.id}`,
                eventId: entry.id,
                timestamp: entry.timestamp.toISOString(),
                source: 'audit_log' as AdminActivitySource,
                function: this.inferAuditLogFunction(entry.action, entry.resource),
                action: entry.action,
                result: this.inferAuditLogResult(entry.action),
                actor: this.actorFromAuditLog(entry.user?.email || null, detailObj),
                resource: entry.resource || null,
                resourceId: entry.resourceId || null,
                targetLabel:
                    (typeof detailObj.assetName === 'string' && detailObj.assetName)
                    || (typeof detailObj.displayName === 'string' && detailObj.displayName)
                    || (typeof detailObj.userEmail === 'string' && detailObj.userEmail)
                    || (typeof detailObj.clientId === 'string' && detailObj.clientId)
                    || null,
                summary: this.summarizeAuditDetails(entry.details),
                ip: entry.ipAddress || null,
                location: typeof detailObj.location === 'string' ? detailObj.location : null,
                networkZone: typeof detailObj.networkZone === 'string' ? detailObj.networkZone : null,
                pipelineRunId: typeof detailObj.runId === 'string' ? detailObj.runId : null,
                pipelineAssetId: typeof detailObj.pipelineAssetId === 'string' ? detailObj.pipelineAssetId : null,
            };
        });

        const auditLedgerItems = auditLedgerEvents.map((entry) => {
            const payloadObj = parseJsonObject(entry.payload);
            const resource = entry.pipelineAssetId
                ? 'PIPELINE_ASSET'
                : entry.accessSessionId
                    ? 'ACCESS_SESSION'
                    : entry.accessRequestId
                        ? 'ACCESS_REQUEST'
                        : entry.eventType;

            return {
                id: `audit-ledger:${entry.id}`,
                eventId: entry.id,
                timestamp: entry.createdAt.toISOString(),
                source: 'audit_ledger' as AdminActivitySource,
                function: this.inferLedgerFunction(),
                action: entry.action,
                result: this.normalizeActivityResult(entry.result) as AdminActivityResult,
                actor: this.actorFromLedger(entry.user?.email || null, payloadObj),
                resource,
                resourceId: entry.pipelineAssetId || entry.accessSessionId || entry.accessRequestId || entry.id,
                targetLabel:
                    entry.pipelineAsset?.relativePath
                    || (typeof payloadObj.relativePath === 'string' ? payloadObj.relativePath : '')
                    || (typeof payloadObj.checkoutBundleId === 'string' ? payloadObj.checkoutBundleId : '')
                    || null,
                summary: this.summarizeAuditDetails(entry.payload),
                ip: null,
                location: entry.location || null,
                networkZone: entry.networkZone || null,
                pipelineRunId: typeof payloadObj.runId === 'string' ? payloadObj.runId : null,
                pipelineAssetId: entry.pipelineAssetId || null,
            };
        });

        const pipelineRunItems = pipelineRuns.map((run) => {
            const progressPercent = this.computePipelineProgress(run);
            const activityTimestamp = (run.completedAt || run.updatedAt || run.startedAt || run.createdAt).toISOString();
            return {
                id: `pipeline-run:${run.id}`,
                eventId: run.id,
                timestamp: activityTimestamp,
                source: 'pipeline_run' as AdminActivitySource,
                function: 'pipeline' as AdminActivityFunction,
                action: run.status === 'FAILED'
                    ? 'PIPELINE_RUN_FAILED'
                    : run.status === 'COMPLETED'
                        ? 'PIPELINE_RUN_COMPLETED'
                        : 'PIPELINE_RUN_IN_PROGRESS',
                result: run.status === 'FAILED'
                    ? 'failed' as AdminActivityResult
                    : run.status === 'COMPLETED'
                        ? 'success' as AdminActivityResult
                        : 'active' as AdminActivityResult,
                actor: 'SYSTEM',
                resource: 'PIPELINE_RUN',
                resourceId: run.id,
                targetLabel: Array.isArray(run.sourceRoots) && run.sourceRoots.length > 0 ? run.sourceRoots[0] : null,
                summary: `${this.summarizePipelineRun(run)} • ${progressPercent}%`,
                ip: null,
                location: null,
                networkZone: null,
                pipelineRunId: run.id,
                pipelineAssetId: null,
            };
        });

        const combinedItems = [...auditLogItems, ...auditLedgerItems, ...pipelineRunItems]
            .filter((item) => this.matchesActivityFilters(item, {
                functionFilter,
                sourceFilter,
                resultFilter: resultFilter === 'all' ? 'all' : resultFilter,
                actorFilter,
                searchFilter,
                from,
                to,
            }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);

        const activePipelineRuns = pipelineRuns
            .filter((run) => run.status === 'IN_PROGRESS')
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 8)
            .map((run) => ({
                id: run.id,
                status: run.status,
                startedAt: run.startedAt?.toISOString() || null,
                updatedAt: run.updatedAt.toISOString(),
                completedAt: run.completedAt?.toISOString() || null,
                totalFound: run.totalFound,
                processed: run.processed,
                skipped: run.skipped,
                failed: run.failed,
                progressPercent: this.computePipelineProgress(run),
                sourceRoot: Array.isArray(run.sourceRoots) && run.sourceRoots.length > 0 ? run.sourceRoots[0] : null,
                destinationRoot: Array.isArray(run.destinationRoots) && run.destinationRoots.length > 0 ? run.destinationRoots[0] : null,
            }));

        const counts = combinedItems.reduce<{
            total: number;
            byFunction: Record<string, number>;
            byResult: Record<string, number>;
            activePipelineRuns: number;
        }>((acc, item) => {
            acc.total += 1;
            acc.byFunction[item.function] = (acc.byFunction[item.function] || 0) + 1;
            acc.byResult[item.result] = (acc.byResult[item.result] || 0) + 1;
            return acc;
        }, {
            total: 0,
            byFunction: {},
            byResult: {},
            activePipelineRuns: activePipelineRuns.length,
        });

        return {
            generatedAt: new Date().toISOString(),
            filters: {
                function: functionFilter,
                source: sourceFilter,
                result: resultFilter,
                actor: filters.actor || '',
                search: filters.search || '',
                from: from?.toISOString() || null,
                to: to?.toISOString() || null,
                limit,
            },
            counts,
            activePipelineRuns,
            items: combinedItems,
        };
    }

    private async getDatabaseHealth() {
        const startedAt = Date.now();
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            const latencyMs = Date.now() - startedAt;

            let activeConnections: number | null = null;
            try {
                const rows = await this.prisma.$queryRawUnsafe<Array<{ active_connections: number | bigint }>>(
                    'SELECT COUNT(*)::int AS active_connections FROM pg_stat_activity WHERE datname = current_database()',
                );
                activeConnections = Number(rows?.[0]?.active_connections ?? 0);
            } catch {
                activeConnections = null;
            }

            const [wrappingActive, attestationActive] = await Promise.all([
                this.prisma.wrappingJob.count({ where: { status: { in: [JobStatus.PENDING, JobStatus.IN_PROGRESS] } } }),
                this.prisma.attestationJob.count({ where: { status: { in: [JobStatus.PENDING, JobStatus.IN_PROGRESS] } } }),
            ]);

            return {
                status: 'online',
                connections: activeConnections,
                jobs: wrappingActive + attestationActive,
                latency: `${latencyMs}ms`,
            };
        } catch {
            return {
                status: 'offline',
                connections: null,
                jobs: null,
                latency: null,
            };
        }
    }

    private async getAiEngineHealth() {
        const healthUrl =
            this.configService.get<string>('AI_ENGINE_HEALTH_URL') ||
            this.configService.get<string>('PQC_MODEL_HEALTH_URL') ||
            null;
        const model =
            this.configService.get<string>('AI_MODEL_NAME') ||
            this.configService.get<string>('PQC_MODEL_NAME') ||
            this.configService.get<string>('AI_ENGINE_MODEL') ||
            null;

        if (!healthUrl) {
            return null;
        }

        const timeoutMs = Number(this.configService.get<string>('AI_ENGINE_HEALTH_TIMEOUT_MS') || 3000);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 3000);

        try {
            const startedAt = Date.now();
            const authToken = this.configService.get<string>('AI_ENGINE_HEALTH_BEARER_TOKEN') || '';
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
                signal: controller.signal,
            });
            const latencyMs = Date.now() - startedAt;

            const rawText = await response.text();
            let parsed: Record<string, unknown> = {};
            if (rawText.trim()) {
                try {
                    const candidate = JSON.parse(rawText);
                    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
                        parsed = candidate as Record<string, unknown>;
                    }
                } catch {
                    parsed = {};
                }
            }

            const payload = parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
                ? parsed.data as Record<string, unknown>
                : parsed;
            const normalizedStatus = String(payload.status || '').trim().toLowerCase();
            const available = typeof payload.available === 'boolean' ? payload.available : null;
            const status = !response.ok
                ? 'offline'
                : (normalizedStatus === 'online' || normalizedStatus === 'healthy' || normalizedStatus === 'ok' || available === true)
                    ? 'online'
                    : (normalizedStatus === 'degraded' || normalizedStatus === 'warning')
                        ? 'degraded'
                        : 'offline';

            const version = typeof payload.version === 'string'
                ? payload.version
                : (typeof parsed.version === 'string' ? parsed.version : null);
            const activeRequests = Number(payload.activeRequests ?? payload.active_requests);
            const queueDepth = Number(payload.queueDepth ?? payload.queue_depth);

            return {
                status,
                model: typeof payload.model === 'string' ? payload.model : model,
                version,
                endpoint: healthUrl,
                latency: `${latencyMs}ms`,
                activeRequests: Number.isFinite(activeRequests) ? activeRequests : null,
                queueDepth: Number.isFinite(queueDepth) ? queueDepth : null,
            };
        } catch {
            return {
                status: 'offline',
                model,
                endpoint: healthUrl,
                latency: null,
                version: null,
                activeRequests: null,
                queueDepth: null,
            };
        } finally {
            clearTimeout(timeout);
        }
    }

    private async getStorageHealth() {
        const storage = await this.objectStorageService.getBackendStatus();
        return {
            status: storage.available ? 'online' : 'offline',
            backend: storage.backend,
            root: 'root' in storage ? storage.root || null : null,
            bucket: 'bucket' in storage ? storage.bucket || null : null,
            endpoint: 'endpoint' in storage ? storage.endpoint || null : null,
            region: 'region' in storage ? storage.region || null : null,
            error: storage.available ? null : ('error' in storage ? storage.error || null : null),
        };
    }

    async getSystemHealth() {
        const [vault, blockchain, database, aiEngine, storage] = await Promise.all([
            this.vaultService.getHealth(),
            this.blockchainService.getHealth(),
            this.getDatabaseHealth(),
            this.getAiEngineHealth(),
            this.getStorageHealth(),
        ]);

        const hasExtendedChainTelemetry =
            blockchain.tps != null
            || blockchain.blockTimeSec != null
            || blockchain.validators != null
            || blockchain.finalitySec != null;
        const endpointLooksLikeStatusFeed = typeof blockchain.endpoint === 'string'
            && (blockchain.endpoint.includes('/status') || blockchain.endpoint.includes('/stats'));

        const blockchainStatus = !blockchain.available
            ? 'offline'
            : (blockchain.blockHeight == null && !hasExtendedChainTelemetry ? 'degraded' : 'online');

        const health: Record<string, unknown> = {
            vault: {
                status: vault.available ? 'online' : 'offline',
                latency: vault.latencyMs != null ? `${vault.latencyMs}ms` : null,
                version: vault.version || null,
                sealed: vault.sealed == null ? null : String(vault.sealed),
            },
            blockchain: {
                status: blockchainStatus,
                backend: blockchain.backend,
                dataSource: blockchain.endpoint
                    ? ((endpointLooksLikeStatusFeed || hasExtendedChainTelemetry) ? 'live status feed' : 'rpc node')
                    : null,
                network: blockchain.network ?? null,
                endpoint: blockchain.endpoint || null,
                peers: blockchain.peers ?? null,
                height: blockchain.blockHeight ?? null,
                sync: blockchain.sync ?? null,
                tps: blockchain.tps != null ? Number(blockchain.tps.toFixed(2)) : null,
                blockTime: blockchain.blockTimeSec != null ? `${Number(blockchain.blockTimeSec.toFixed(2))}s` : null,
                validators: blockchain.validators ?? null,
                finality: blockchain.finalitySec != null ? `${Number(blockchain.finalitySec.toFixed(2))}s` : null,
                chainId: blockchain.chainId ?? null,
                latency: blockchain.latencyMs != null ? `${blockchain.latencyMs}ms` : null,
                updatedAt: blockchain.updatedAt ?? null,
            },
            database,
            storage,
        };

        if (aiEngine) {
            health.aiEngine = aiEngine;
        }

        return health;
    }

    async getRuntimeSummary() {
        await this.accessOperations.expireManagedCredentials();

        const [
            runtime,
            serviceAccountCount,
            activeServiceAccountCount,
            managedCredentialCount,
            activeManagedCredentialCount,
            legalHoldCount,
            pendingApprovals,
        ] = await Promise.all([
            this.monitoringService.getRuntimeSummary(),
            this.prisma.serviceAccount.count(),
            this.prisma.serviceAccount.count({ where: { isActive: true } }),
            this.prisma.managedCredential.count(),
            this.prisma.managedCredential.count({ where: { status: 'ACTIVE' } }),
            this.prisma.pipelineAsset.count({ where: { legalHold: true } }),
            this.prisma.adminApproval.count({ where: { status: 'PENDING' } }),
        ]);

        return {
            ...runtime,
            controls: {
                serviceAccounts: {
                    total: serviceAccountCount,
                    active: activeServiceAccountCount,
                },
                managedCredentials: {
                    total: managedCredentialCount,
                    active: activeManagedCredentialCount,
                },
                legalHolds: legalHoldCount,
                pendingApprovals,
            },
        };
    }

    async getSystemLogs() {
        const logs = await this.prisma.auditLog.findMany({
            take: 50,
            orderBy: { timestamp: 'desc' },
            include: {
                user: {
                    select: { email: true },
                },
            },
        });

        return logs.map((entry) => {
            const detailObj = parseJsonObject(entry.details);
            const actor =
                entry.user?.email ||
                (typeof detailObj.requestedBy === 'string' ? detailObj.requestedBy : '') ||
                (typeof detailObj.user === 'string' ? detailObj.user : '') ||
                'SYSTEM';

            return {
                id: entry.id,
                timestamp: entry.timestamp.toISOString(),
                action: entry.action,
                user: actor,
                ip: entry.ipAddress || 'n/a',
                details: this.summarizeAuditDetails(entry.details),
            };
        });
    }
}
