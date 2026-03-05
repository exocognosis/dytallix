import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
    deriveAes256Key,
    getMlKemByAlgorithm,
    ML_KEM_1024_ALGORITHM,
    ML_KEM_512_ALGORITHM,
    ML_KEM_768_ALGORITHM,
    MlKem,
    normalizeKemAlgorithmName,
    wrapSuiteForKemAlgorithm,
} from '../crypto/mlkem';
import { getMlDsa65, ML_DSA_65_ALGORITHM } from '../crypto/mldsa';
import { getSlhDsaShake128s, SLH_DSA_SHAKE_128S_ALGORITHM } from '../crypto/slhdsa';
import { canonicalJsonBuffer, canonicalJsonSha256Hex } from '../crypto/canonical-json';
import {
    AdminApprovalOperation,
    AdminApprovalStatus,
    JobStatus,
    PipelineAssetStatus,
    PipelineRunStatus,
    Prisma,
    RiskLevel,
    ScanStatus,
} from '@prisma/client';
import { AttestationService } from '../attestation/attestation.service';
import { TransportService } from '../transport/transport.service';

const PQC_PIPELINE_VERSION = 'qv-pqc-v1';

type PipelineWrapLevel = 'baseline' | 'enhanced' | 'maximum';

type PipelinePolicy = {
    level: PipelineWrapLevel;
    kemAlgorithm: string;
    signatureAlgorithms: string[];
};

type PipelineMetadataOverride = {
    dataDomain?: string;
    retentionTag?: string;
    owner?: string;
};

type AdminActor = {
    id?: string;
    email?: string;
};

type AdminSystemControlKey =
    | 'pausePipelineWrites'
    | 'pauseAttestationSubmissions'
    | 'pauseWrappingJobs';

type AdminSystemControlDefinition = {
    controlKey: AdminSystemControlKey;
    label: string;
    description: string;
};

const ADMIN_SYSTEM_CONTROLS: AdminSystemControlDefinition[] = [
    {
        controlKey: 'pausePipelineWrites',
        label: 'Pause Pipeline Writes',
        description: 'Blocks discovery/pipeline write operations and bulk file transformation jobs.',
    },
    {
        controlKey: 'pauseAttestationSubmissions',
        label: 'Pause Attestation Submissions',
        description: 'Blocks creation of new attestation queue jobs while enabled.',
    },
    {
        controlKey: 'pauseWrappingJobs',
        label: 'Pause Wrapping Jobs',
        description: 'Blocks creation of new PQC wrapping jobs while enabled.',
    },
];

const ADMIN_SYSTEM_CONTROL_LOOKUP = new Map<string, AdminSystemControlDefinition>(
    ADMIN_SYSTEM_CONTROLS.map((control) => [control.controlKey, control]),
);

const RISK_LEVEL_RANK: Record<RiskLevel, number> = {
    UNKNOWN: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
};

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private prisma: PrismaService,
        private vaultService: VaultService,
        private blockchainService: BlockchainService,
        private configService: ConfigService,
        private attestationService: AttestationService,
        private transportService: TransportService,
    ) { }

    async saveScanConfig(config: any) {
        // Ideally update a SystemConfig table. For MVP, we simply log.
        this.logger.log('Saving scan config:', config);
        return { success: true, message: 'Configuration saved' };
    }

    private async ensureSystemControlRecords() {
        await Promise.all(
            ADMIN_SYSTEM_CONTROLS.map((control) =>
                this.prisma.systemControl.upsert({
                    where: { controlKey: control.controlKey },
                    create: {
                        controlKey: control.controlKey,
                        label: control.label,
                        description: control.description,
                        metadata: {
                            source: 'admin_console',
                            seededBy: 'admin_service',
                        },
                    },
                    update: {
                        label: control.label,
                        description: control.description,
                    },
                }),
            ),
        );
    }

    private async assertSystemControlDisabled(controlKey: AdminSystemControlKey, blockedMessage: string) {
        const control = await this.prisma.systemControl.findUnique({
            where: { controlKey },
            select: { isEnabled: true },
        });

        if (control?.isEnabled) {
            throw new Error(blockedMessage);
        }
    }

    async getSystemControls() {
        await this.ensureSystemControlRecords();

        const rows = await this.prisma.systemControl.findMany({
            where: {
                controlKey: {
                    in: ADMIN_SYSTEM_CONTROLS.map((control) => control.controlKey),
                },
            },
            include: {
                updatedByUser: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
            orderBy: { controlKey: 'asc' },
        });

        const byKey = new Map(rows.map((row) => [row.controlKey, row]));

        return ADMIN_SYSTEM_CONTROLS.map((definition) => {
            const row = byKey.get(definition.controlKey);
            return {
                controlKey: definition.controlKey,
                label: row?.label || definition.label,
                description: row?.description || definition.description,
                isEnabled: Boolean(row?.isEnabled),
                reason: row?.reason || null,
                updatedAt: row?.updatedAt?.toISOString() || null,
                updatedBy: row?.updatedByUser?.email || null,
            };
        });
    }

    async setSystemControl(
        input: {
            controlKey: string;
            enabled: boolean;
            reason?: string;
        },
        actor?: {
            id?: string;
            email?: string;
        },
    ) {
        if (typeof input?.enabled !== 'boolean') {
            throw new BadRequestException('enabled must be a boolean');
        }

        const definition = ADMIN_SYSTEM_CONTROL_LOOKUP.get(input?.controlKey);
        if (!definition) {
            throw new BadRequestException(`Unknown control key: ${input?.controlKey || 'n/a'}`);
        }

        await this.ensureSystemControlRecords();

        const previous = await this.prisma.systemControl.findUnique({
            where: { controlKey: definition.controlKey },
            select: { isEnabled: true, reason: true },
        });

        const normalizedReason =
            input.reason?.trim()
            || (input.enabled ? 'Paused via Administrator Console' : 'Resumed via Administrator Console');

        const updated = await this.prisma.systemControl.update({
            where: { controlKey: definition.controlKey },
            data: {
                isEnabled: input.enabled,
                reason: normalizedReason,
                updatedByUserId: actor?.id || null,
                label: definition.label,
                description: definition.description,
            },
            include: {
                updatedByUser: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        const details = JSON.parse(
            JSON.stringify({
                controlKey: definition.controlKey,
                label: definition.label,
                previousEnabled: previous?.isEnabled ?? false,
                nextEnabled: updated.isEnabled,
                previousReason: previous?.reason || null,
                nextReason: updated.reason || null,
                requestedBy: actor?.email || 'admin',
                changedAt: updated.updatedAt.toISOString(),
            }),
        ) as Prisma.InputJsonValue;

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'SYSTEM_CONTROL_UPDATED',
                resource: 'SYSTEM_CONTROL',
                resourceId: definition.controlKey,
                details,
            },
        });

        return {
            controlKey: definition.controlKey,
            label: updated.label,
            description: updated.description,
            isEnabled: updated.isEnabled,
            reason: updated.reason,
            updatedAt: updated.updatedAt.toISOString(),
            updatedBy: updated.updatedByUser?.email || actor?.email || null,
        };
    }

    private parseRiskLevelInput(value: unknown): RiskLevel {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'LOW') return 'LOW';
        if (normalized === 'MEDIUM') return 'MEDIUM';
        if (normalized === 'HIGH') return 'HIGH';
        if (normalized === 'CRITICAL') return 'CRITICAL';
        return 'HIGH';
    }

    private deriveRiskLevelFromScore(score: number): RiskLevel {
        if (score >= 85) return 'CRITICAL';
        if (score >= 70) return 'HIGH';
        if (score >= 40) return 'MEDIUM';
        if (score > 0) return 'LOW';
        return 'UNKNOWN';
    }

    private shouldRequireApproval(
        rule: {
            maxRiskScoreAutoApprove: number;
            requireApprovalAtRiskLevel: RiskLevel;
        },
        riskScore: number,
        riskLevel: RiskLevel,
    ): boolean {
        const levelRank = RISK_LEVEL_RANK[riskLevel] ?? 0;
        const requiredLevelRank = RISK_LEVEL_RANK[rule.requireApprovalAtRiskLevel] ?? 0;
        if (riskScore > rule.maxRiskScoreAutoApprove) {
            return true;
        }
        return levelRank >= requiredLevelRank;
    }

    private async ensureAdminRiskRuleRecord() {
        return this.prisma.adminRiskRule.upsert({
            where: { ruleKey: 'default' },
            create: {
                ruleKey: 'default',
                maxRiskScoreAutoApprove: 70,
                requireApprovalAtRiskLevel: 'HIGH',
                maxAssetsPerRun: 1000,
                isActive: true,
            },
            update: {
                isActive: true,
            },
        });
    }

    async getRiskRules() {
        const rule = await this.ensureAdminRiskRuleRecord();
        return {
            id: rule.id,
            maxRiskScoreAutoApprove: rule.maxRiskScoreAutoApprove,
            requireApprovalAtRiskLevel: rule.requireApprovalAtRiskLevel,
            maxAssetsPerRun: rule.maxAssetsPerRun,
            updatedAt: rule.updatedAt.toISOString(),
        };
    }

    async setRiskRules(
        input: {
            maxRiskScoreAutoApprove: number;
            requireApprovalAtRiskLevel: string;
            maxAssetsPerRun: number;
        },
        actor?: AdminActor,
    ) {
        const maxRiskScoreAutoApprove = Number(input?.maxRiskScoreAutoApprove);
        if (!Number.isFinite(maxRiskScoreAutoApprove) || maxRiskScoreAutoApprove < 0 || maxRiskScoreAutoApprove > 100) {
            throw new BadRequestException('maxRiskScoreAutoApprove must be between 0 and 100');
        }

        const maxAssetsPerRun = Number(input?.maxAssetsPerRun);
        if (!Number.isFinite(maxAssetsPerRun) || maxAssetsPerRun <= 0) {
            throw new BadRequestException('maxAssetsPerRun must be greater than 0');
        }

        const requireApprovalAtRiskLevel = this.parseRiskLevelInput(input?.requireApprovalAtRiskLevel);

        const existing = await this.ensureAdminRiskRuleRecord();
        const updated = await this.prisma.adminRiskRule.update({
            where: { id: existing.id },
            data: {
                maxRiskScoreAutoApprove: Math.round(maxRiskScoreAutoApprove),
                requireApprovalAtRiskLevel,
                maxAssetsPerRun: Math.round(maxAssetsPerRun),
                updatedByUserId: actor?.id || null,
                isActive: true,
            },
        });

        const details = JSON.parse(
            JSON.stringify({
                previous: {
                    maxRiskScoreAutoApprove: existing.maxRiskScoreAutoApprove,
                    requireApprovalAtRiskLevel: existing.requireApprovalAtRiskLevel,
                    maxAssetsPerRun: existing.maxAssetsPerRun,
                },
                current: {
                    maxRiskScoreAutoApprove: updated.maxRiskScoreAutoApprove,
                    requireApprovalAtRiskLevel: updated.requireApprovalAtRiskLevel,
                    maxAssetsPerRun: updated.maxAssetsPerRun,
                },
                updatedBy: actor?.email || 'admin',
            }),
        ) as Prisma.InputJsonValue;

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'ADMIN_RISK_RULE_UPDATED',
                resource: 'ADMIN_RISK_RULE',
                resourceId: updated.id,
                details,
            },
        });

        return {
            id: updated.id,
            maxRiskScoreAutoApprove: updated.maxRiskScoreAutoApprove,
            requireApprovalAtRiskLevel: updated.requireApprovalAtRiskLevel,
            maxAssetsPerRun: updated.maxAssetsPerRun,
            updatedAt: updated.updatedAt.toISOString(),
        };
    }

    async getUsers(search?: string) {
        const normalizedSearch = String(search || '').trim();
        const users = await this.prisma.user.findMany({
            where: normalizedSearch
                ? {
                    OR: [
                        { email: { contains: normalizedSearch, mode: 'insensitive' } },
                        { id: { contains: normalizedSearch, mode: 'insensitive' } },
                    ],
                }
                : undefined,
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                lastLoginAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return users.map((user) => ({
            ...user,
            createdAt: user.createdAt.toISOString(),
            lastLoginAt: user.lastLoginAt?.toISOString() || null,
        }));
    }

    async getAssetsForFreeze(search?: string) {
        const normalizedSearch = String(search || '').trim();
        const assets = await this.prisma.asset.findMany({
            where: normalizedSearch
                ? {
                    OR: [
                        { name: { contains: normalizedSearch, mode: 'insensitive' } },
                        { fingerprint: { contains: normalizedSearch, mode: 'insensitive' } },
                        { id: { contains: normalizedSearch, mode: 'insensitive' } },
                    ],
                }
                : undefined,
            select: {
                id: true,
                name: true,
                fingerprint: true,
                type: true,
                status: true,
                riskScore: true,
                riskLevel: true,
                isFrozen: true,
                freezeReason: true,
                frozenAt: true,
                frozenByUser: {
                    select: {
                        email: true,
                    },
                },
            },
            orderBy: [{ isFrozen: 'desc' }, { updatedAt: 'desc' }],
            take: 75,
        });

        return assets.map((asset) => ({
            ...asset,
            frozenAt: asset.frozenAt?.toISOString() || null,
            frozenBy: asset.frozenByUser?.email || null,
        }));
    }

    async setUserActive(id: string, isActive: boolean, reason?: string, actor?: AdminActor) {
        if (typeof isActive !== 'boolean') {
            throw new BadRequestException('isActive must be a boolean');
        }

        const updated = await this.prisma.user.update({
            where: { id },
            data: { isActive },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });

        const details = JSON.parse(
            JSON.stringify({
                userId: updated.id,
                userEmail: updated.email,
                isActive: updated.isActive,
                reason: reason || null,
                updatedBy: actor?.email || 'admin',
            }),
        ) as Prisma.InputJsonValue;

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'USER_ACTIVE_STATUS_UPDATED',
                resource: 'USER',
                resourceId: updated.id,
                details,
            },
        });

        return {
            ...updated,
            updatedAt: updated.updatedAt.toISOString(),
        };
    }

    async setAssetFrozen(id: string, isFrozen: boolean, reason?: string, actor?: AdminActor) {
        if (typeof isFrozen !== 'boolean') {
            throw new BadRequestException('isFrozen must be a boolean');
        }

        const freezeReason = reason?.trim() || (isFrozen ? 'Frozen via Administrator Console' : null);

        const updated = await this.prisma.asset.update({
            where: { id },
            data: {
                isFrozen,
                freezeReason: isFrozen ? freezeReason : null,
                frozenAt: isFrozen ? new Date() : null,
                frozenByUserId: isFrozen ? actor?.id || null : null,
            },
            include: {
                frozenByUser: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        const details = JSON.parse(
            JSON.stringify({
                assetId: updated.id,
                assetName: updated.name,
                isFrozen: updated.isFrozen,
                reason: updated.freezeReason || null,
                updatedBy: actor?.email || 'admin',
            }),
        ) as Prisma.InputJsonValue;

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'ASSET_FREEZE_STATUS_UPDATED',
                resource: 'ASSET',
                resourceId: updated.id,
                details,
            },
        });

        return {
            id: updated.id,
            name: updated.name,
            isFrozen: updated.isFrozen,
            freezeReason: updated.freezeReason,
            frozenAt: updated.frozenAt?.toISOString() || null,
            frozenBy: updated.frozenByUser?.email || null,
        };
    }

    async getApprovals(status?: string) {
        const normalizedStatus = String(status || 'PENDING').trim().toUpperCase();
        const allowedStatuses = new Set<AdminApprovalStatus>(['PENDING', 'APPROVED', 'REJECTED']);
        if (!allowedStatuses.has(normalizedStatus as AdminApprovalStatus)) {
            throw new BadRequestException('status must be one of PENDING, APPROVED, REJECTED');
        }

        const approvals = await this.prisma.adminApproval.findMany({
            where: {
                status: normalizedStatus as AdminApprovalStatus,
            },
            include: {
                requestedByUser: {
                    select: {
                        email: true,
                    },
                },
                reviewedByUser: {
                    select: {
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 150,
        });

        return approvals.map((approval) => ({
            id: approval.id,
            operationType: approval.operationType,
            resourceType: approval.resourceType,
            resourceId: approval.resourceId,
            status: approval.status,
            reason: approval.reason,
            requestContext: approval.requestContext,
            requestedBy: approval.requestedByUser?.email || null,
            reviewedBy: approval.reviewedByUser?.email || null,
            reviewedAt: approval.reviewedAt?.toISOString() || null,
            createdAt: approval.createdAt.toISOString(),
            updatedAt: approval.updatedAt.toISOString(),
        }));
    }

    async approveApproval(id: string, reason?: string, actor?: AdminActor) {
        const updated = await this.prisma.adminApproval.update({
            where: { id },
            data: {
                status: 'APPROVED',
                reason: reason?.trim() || undefined,
                reviewedByUserId: actor?.id || null,
                reviewedAt: new Date(),
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'ADMIN_APPROVAL_APPROVED',
                resource: 'ADMIN_APPROVAL',
                resourceId: updated.id,
                details: JSON.parse(
                    JSON.stringify({
                        operationType: updated.operationType,
                        resourceType: updated.resourceType,
                        resourceId: updated.resourceId,
                        reviewedBy: actor?.email || 'admin',
                        reason: updated.reason || null,
                    }),
                ) as Prisma.InputJsonValue,
            },
        });

        return {
            id: updated.id,
            status: updated.status,
            reason: updated.reason,
            reviewedAt: updated.reviewedAt?.toISOString() || null,
        };
    }

    async rejectApproval(id: string, reason?: string, actor?: AdminActor) {
        const updated = await this.prisma.adminApproval.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reason: reason?.trim() || 'Rejected from Administrator Console',
                reviewedByUserId: actor?.id || null,
                reviewedAt: new Date(),
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'ADMIN_APPROVAL_REJECTED',
                resource: 'ADMIN_APPROVAL',
                resourceId: updated.id,
                details: JSON.parse(
                    JSON.stringify({
                        operationType: updated.operationType,
                        resourceType: updated.resourceType,
                        resourceId: updated.resourceId,
                        reviewedBy: actor?.email || 'admin',
                        reason: updated.reason || null,
                    }),
                ) as Prisma.InputJsonValue,
            },
        });

        return {
            id: updated.id,
            status: updated.status,
            reason: updated.reason,
            reviewedAt: updated.reviewedAt?.toISOString() || null,
        };
    }

    private async createOrRequireApproval(params: {
        operationType: AdminApprovalOperation;
        resourceType: string;
        resourceId?: string | null;
        riskScore: number;
        riskLevel: RiskLevel;
        reason: string;
        requestContext?: Record<string, unknown>;
        actor?: AdminActor;
    }): Promise<{ allowed: boolean; message?: string; approvalId?: string }> {
        const rule = await this.ensureAdminRiskRuleRecord();
        if (!this.shouldRequireApproval(rule, params.riskScore, params.riskLevel)) {
            return { allowed: true };
        }

        const baseWhere: Prisma.AdminApprovalWhereInput = {
            operationType: params.operationType,
            resourceType: params.resourceType,
            resourceId: params.resourceId || null,
        };

        const existingApproved = await this.prisma.adminApproval.findFirst({
            where: {
                ...baseWhere,
                status: 'APPROVED',
            },
            orderBy: { reviewedAt: 'desc' },
        });
        if (existingApproved) {
            return { allowed: true, approvalId: existingApproved.id };
        }

        const existingPending = await this.prisma.adminApproval.findFirst({
            where: {
                ...baseWhere,
                status: 'PENDING',
            },
            orderBy: { createdAt: 'desc' },
        });

        if (existingPending) {
            return {
                allowed: false,
                approvalId: existingPending.id,
                message: `Operation requires approval and is already pending (approval: ${existingPending.id}).`,
            };
        }

        const created = await this.prisma.adminApproval.create({
            data: {
                operationType: params.operationType,
                resourceType: params.resourceType,
                resourceId: params.resourceId || null,
                status: 'PENDING',
                reason: params.reason,
                requestContext: JSON.parse(
                    JSON.stringify({
                        riskScore: params.riskScore,
                        riskLevel: params.riskLevel,
                        ...(params.requestContext || {}),
                    }),
                ) as Prisma.InputJsonValue,
                requestedByUserId: params.actor?.id || null,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: params.actor?.id || null,
                action: 'ADMIN_APPROVAL_REQUESTED',
                resource: 'ADMIN_APPROVAL',
                resourceId: created.id,
                details: JSON.parse(
                    JSON.stringify({
                        operationType: params.operationType,
                        resourceType: params.resourceType,
                        resourceId: params.resourceId || null,
                        reason: params.reason,
                        requestedBy: params.actor?.email || 'system',
                    }),
                ) as Prisma.InputJsonValue,
            },
        });

        return {
            allowed: false,
            approvalId: created.id,
            message: `Operation requires approval. Approval request ${created.id} is pending.`,
        };
    }

    private async writeGovernanceAudit(action: string, details: Record<string, unknown>) {
        const serializedDetails = JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue;
        await this.prisma.auditLog.create({
            data: {
                action,
                resource: 'KEY_GOVERNANCE',
                details: serializedDetails,
            },
        });
    }

    async getKeyGovernanceStatus() {
        const [attestation, transport] = await Promise.all([
            this.attestationService.getSignerGovernanceStatus(),
            this.transportService.getTransportKeyGovernanceStatus(),
        ]);

        return {
            collectedAt: new Date().toISOString(),
            attestation,
            transport,
        };
    }

    async rotateAttestationSigner(input?: {
        reason?: string;
        changeTicket?: string;
        requestedBy?: string;
        expectedPriorKeyId?: string;
        runRecoveryTest?: boolean;
    }) {
        const result = await this.attestationService.rotateSignerKey(input);
        await this.writeGovernanceAudit('ATTESTATION_KEY_ROTATION', {
            ceremonyId: result.ceremonyId,
            rotatedAt: result.rotatedAt,
            previousKeyId: result.previous.signerKeyId,
            newKeyId: result.current.signerKeyId,
            reason: result.reason,
            changeTicket: result.changeTicket,
            requestedBy: input?.requestedBy || 'admin',
            recoveryPassed: result.recoveryTest?.passed ?? false,
        });
        return result;
    }

    async rotateTransportKeys(input?: {
        reason?: string;
        changeTicket?: string;
        requestedBy?: string;
        expectedPriorKemKeyId?: string;
        expectedPriorIdentityKeyId?: string;
        runRecoveryTest?: boolean;
    }) {
        const result = await this.transportService.rotateTransportKeys(input);
        await this.writeGovernanceAudit('TRANSPORT_KEY_ROTATION', {
            ceremonyId: result.ceremonyId,
            rotatedAt: result.rotatedAt,
            previousKemKeyId: result.previousKemKeyId,
            previousIdentityKeyId: result.previousIdentityKeyId,
            newKemKeyId: result.currentKemKeyId,
            newIdentityKeyId: result.currentIdentityKeyId,
            reason: input?.reason || 'scheduled_rotation',
            changeTicket: input?.changeTicket || null,
            requestedBy: input?.requestedBy || 'admin',
            recoveryPassed: result.recoveryTest?.passed ?? false,
        });
        return result;
    }

    async runKeyRecoveryTests(input?: { scope?: 'attestation' | 'transport' | 'all'; requestedBy?: string }) {
        const scope = input?.scope || 'all';
        const output: Record<string, unknown> = {
            scope,
            executedAt: new Date().toISOString(),
        };

        if (scope === 'all' || scope === 'attestation') {
            output.attestation = await this.attestationService.runSignerRecoveryTest();
        }
        if (scope === 'all' || scope === 'transport') {
            output.transport = await this.transportService.runTransportRecoveryTest();
        }

        await this.writeGovernanceAudit('KEY_RECOVERY_TEST', {
            ...output,
            requestedBy: input?.requestedBy || 'admin',
        });

        return output;
    }

    async runDiscovery(config: any, actor?: AdminActor) {
        this.logger.log('Starting discovery with config:', config);
        try {
            await this.assertSystemControlDisabled(
                'pausePipelineWrites',
                'Pipeline write operations are currently paused by administrator control.',
            );

            const directories = this.parseLineList(config.originDatabase || config.sourceDirectories || config.directories || '');
            const extensions = this.resolvePipelineExtensions(config);
            const minDate = this.parseDate(config.minDate);
            const maxDate = this.parseDate(config.maxDate);
            const maxFiles = this.parseRequiredPositiveInt(config.maxFiles, 'Max files');
            const maxFileSizeBytes = this.parseRequiredPositiveInt(config.maxFileSizeBytes, 'Max file size');
            const excludePatterns = this.parseCommaList(config.excludePatterns || '').concat(['node_modules', '.git']);
            const riskRule = await this.ensureAdminRiskRuleRecord();

            if (maxFiles > riskRule.maxAssetsPerRun) {
                return {
                    success: false,
                    message: `maxFiles (${maxFiles}) exceeds configured maxAssetsPerRun (${riskRule.maxAssetsPerRun}). Update Admin Risk Rules or lower run size.`,
                };
            }

            if (directories.length === 0) {
                return { success: false, message: 'No directories specified' };
            }

            if (minDate && maxDate && minDate.getTime() > maxDate.getTime()) {
                return { success: false, message: 'Creation date range is invalid. Start date must be before end date.' };
            }

            const results = [];
            const manifestsGenerated: string[] = [];

            for (const dir of directories) {
                if (results.length >= maxFiles) {
                    break;
                }

                if (!fs.existsSync(dir)) {
                    this.logger.warn(`Directory not found: ${dir}`);
                    continue;
                }

                const remaining = Math.max(maxFiles - results.length, 0);
                const files = await this.scanDirForPipeline(dir, {
                    extensions,
                    excludePatterns,
                    minDate,
                    maxDate,
                    maxFiles: remaining,
                    maxFileSizeBytes,
                });
                results.push(...files);

                try {
                    const manifestEntries: string[] = [];
                    for (const filePath of files) {
                        const relativePath = path.relative(dir, filePath);
                        const stat = await fs.promises.stat(filePath);
                        const fileBuffer = await fs.promises.readFile(filePath);
                        const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                        const dataDomain = this.inferDataDomain(relativePath);
                        const cryptoDomain = this.inferCryptoDomain(relativePath);

                        const entry = {
                            object_id: crypto.randomUUID(),
                            relative_path: relativePath,
                            plaintext_sha256: sha256,
                            file_size_bytes: stat.size,
                            data_domain: dataDomain,
                            crypto_domain: cryptoDomain,
                            pqc_status: 'UNPROTECTED',
                            pqc_protected: false,
                            expected_policy_outcome: 'WRAP_PQC',
                            discovered_at: new Date().toISOString(),
                        };
                        manifestEntries.push(JSON.stringify(entry));
                    }

                    if (manifestEntries.length > 0) {
                        const manifestContent = manifestEntries.join('\n') + '\n';
                        const manifestPath = path.join(dir, 'manifest.jsonl');
                        const manifestSha = crypto.createHash('sha256').update(manifestContent).digest('hex');
                        const shaPath = path.join(dir, 'manifest.sha256');

                        await fs.promises.writeFile(manifestPath, manifestContent, 'utf8');
                        await fs.promises.writeFile(shaPath, manifestSha, 'utf8');
                        manifestsGenerated.push(dir);
                        this.logger.log(`Generated manifest for ${dir} with ${manifestEntries.length} entries`);
                    }
                } catch (err: any) {
                    this.logger.error(`Failed to generate manifest for ${dir}: ${err.message}`);
                }
            }

            const limitedResults = results.slice(0, 100);

            this.logger.log(`Discovery complete. Found ${results.length} files.`);

            const manifestMsg = manifestsGenerated.length > 0
                ? ` Manifests generated for: ${manifestsGenerated.join(', ')}`
                : '';

            return {
                success: true,
                message: `Discovery complete. Found ${results.length} potential assets.${manifestMsg}`,
                totalFound: results.length,
                manifestsGenerated,
                files: limitedResults,
                evaluatedBy: actor?.email || null,
            };
        } catch (error: any) {
            this.logger.error(`Discovery failed: ${error?.message || error}`);
            return {
                success: false,
                message: error?.message || 'Discovery failed. Check server logs for details.',
                error: error?.message || 'discovery_error',
            };
        }
    }

    private async generateManifestForPipeline(sourceDir: string, extensions: string[]): Promise<boolean> {
        try {
            if (!fs.existsSync(sourceDir)) {
                return false;
            }

            const files = await this.scanDirForPipeline(sourceDir, {
                extensions,
                excludePatterns: ['node_modules', '.git'],
            });

            const manifestEntries: string[] = [];

            for (const filePath of files) {
                if (filePath.toLowerCase().endsWith('.pqc.json') || filePath.toLowerCase().endsWith('.meta.json')) {
                    continue;
                }

                const relativePath = path.relative(sourceDir, filePath);
                const stat = await fs.promises.stat(filePath);
                const fileBuffer = await fs.promises.readFile(filePath);
                const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                const entry = {
                    object_id: crypto.randomUUID(),
                    relative_path: relativePath,
                    plaintext_sha256: sha256,
                    file_size_bytes: stat.size,
                    data_domain: this.inferDataDomain(relativePath),
                    crypto_domain: this.inferCryptoDomain(relativePath),
                    pqc_status: 'UNPROTECTED',
                    pqc_protected: false,
                    expected_policy_outcome: 'WRAP_PQC',
                    discovered_at: new Date().toISOString(),
                };

                manifestEntries.push(JSON.stringify(entry));
            }

            const manifestContent = manifestEntries.join('\n') + (manifestEntries.length ? '\n' : '');
            const manifestPath = path.join(sourceDir, 'manifest.jsonl');
            const manifestSha = crypto.createHash('sha256').update(manifestContent).digest('hex');
            const shaPath = path.join(sourceDir, 'manifest.sha256');

            await fs.promises.writeFile(manifestPath, manifestContent, 'utf8');
            await fs.promises.writeFile(shaPath, manifestSha, 'utf8');
            this.logger.log(`Auto-generated manifest for ${sourceDir} with ${manifestEntries.length} entries`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to auto-generate manifest for ${sourceDir}: ${error?.message || error}`);
            return false;
        }
    }

    private inferDataDomain(relativePath: string): string {
        const lower = relativePath.toLowerCase();
        if (lower.includes('genomic') || lower.includes('dna') || lower.includes('fasta') || lower.includes('vcf')) return 'GENOMIC';
        if (lower.includes('patient') || lower.includes('phi') || lower.includes('medical')) return 'PHI';
        if (lower.includes('imaging') || lower.includes('dicom') || lower.includes('scan')) return 'IMAGING';
        if (lower.includes('derived') || lower.includes('analytics') || lower.includes('report')) return 'DERIVED';
        if (lower.includes('audit') || lower.includes('log')) return 'AUDIT';
        if (lower.includes('cert') || lower.includes('key') || lower.includes('pem') || lower.includes('crt')) return 'CRYPTO_MATERIAL';
        if (lower.includes('config') || lower.includes('settings')) return 'CONFIGURATION';
        return 'OPERATIONAL';
    }

    private inferCryptoDomain(relativePath: string): string {
        const lower = relativePath.toLowerCase();
        if (lower.includes('key') || lower.includes('secret') || lower.includes('private')) return 'HIGH';
        if (lower.includes('cert') || lower.includes('pem') || lower.includes('crt')) return 'MEDIUM';
        return 'STANDARD';
    }

    async runPqcPipeline(config: any, actor?: AdminActor) {
        this.logger.log('Starting PQC pipeline with config:', config);
        try {
            await this.assertSystemControlDisabled(
                'pausePipelineWrites',
                'Pipeline write operations are currently paused by administrator control.',
            );

            const sourceDirectories = this.parseLineList(config.originDatabase || config.sourceDirectories || config.directories || '');
            const destinationDirectories = this.parseLineList(config.destinationDatabase || config.destinationDirectories || '');

            if (sourceDirectories.length === 0) {
                return { success: false, message: 'No source directories specified' };
            }

            if (destinationDirectories.length === 0) {
                return { success: false, message: 'No destination directories specified' };
            }

            const sourceToDest = this.mapSourceDestinations(sourceDirectories, destinationDirectories);
            if (!sourceToDest) {
                return { success: false, message: 'Destination directory mapping invalid. Provide 1 destination or match source count.' };
            }

            const extensions = this.resolvePipelineExtensions(config);
            const excludePatterns = this.parseCommaList(config.excludePatterns || '').concat(['node_modules', '.git']);
            const defaultPolicy = this.resolvePipelinePolicy(config);
            const fileTypePolicies = this.resolveFileTypePolicies(config);
            const metadataOverrides = this.resolveAssetTypeMetadata(config);
            const requiredSignatureAlgorithms = this.collectRequiredSignatureAlgorithms(defaultPolicy, fileTypePolicies);

            const minDate = this.parseDate(config.minDate);
            const maxDate = this.parseDate(config.maxDate);

            const maxFiles = this.parseRequiredPositiveInt(config.maxFiles, 'Max files');
            const maxFileSizeBytes = this.parseRequiredPositiveInt(config.maxFileSizeBytes, 'Max file size');
            const riskRule = await this.ensureAdminRiskRuleRecord();

            if (maxFiles > riskRule.maxAssetsPerRun) {
                return {
                    success: false,
                    message: `maxFiles (${maxFiles}) exceeds configured maxAssetsPerRun (${riskRule.maxAssetsPerRun}). Update Admin Risk Rules or lower run size.`,
                };
            }

            const operationRiskScore = Math.min(
                100,
                Math.round((maxFiles / Math.max(riskRule.maxAssetsPerRun, 1)) * 100),
            );
            const operationRiskLevel = this.deriveRiskLevelFromScore(operationRiskScore);
            const approvalGate = await this.createOrRequireApproval({
                operationType: 'PIPELINE_TRANSFER',
                resourceType: 'PIPELINE_RUN',
                resourceId: null,
                riskScore: operationRiskScore,
                riskLevel: operationRiskLevel,
                reason: `Pipeline transfer requested with maxFiles=${maxFiles}, riskScore=${operationRiskScore}, riskLevel=${operationRiskLevel}.`,
                requestContext: {
                    maxFiles,
                    maxAssetsPerRun: riskRule.maxAssetsPerRun,
                    sourceDirectories,
                    destinationDirectories,
                },
                actor,
            });
            if (!approvalGate.allowed) {
                return {
                    success: false,
                    message: approvalGate.message,
                    approvalId: approvalGate.approvalId,
                };
            }

            if (minDate && maxDate && minDate.getTime() > maxDate.getTime()) {
                return { success: false, message: 'Creation date range is invalid. Start date must be before end date.' };
            }

            const activeAnchor = await this.resolveActiveKemAnchor(defaultPolicy.kemAlgorithm);

            if (!activeAnchor) {
                return { success: false, message: `No active ${defaultPolicy.kemAlgorithm} anchor found. Create an active KEM anchor before running pipeline.` };
            }

            const signatureAnchors = await this.resolveSignatureAnchors(requiredSignatureAlgorithms);

            const missingSigners = requiredSignatureAlgorithms.filter((algorithm) => !signatureAnchors.has(algorithm));
            if (missingSigners.length > 0) {
                return {
                    success: false,
                    message: `Missing active signature anchors for: ${missingSigners.join(', ')}. Create and activate signer anchors before running selected policy levels.`,
                };
            }

            const kemPublicKeyCache = new Map<string, Buffer>();
            const kemByAlgorithmCache = new Map<string, MlKem>();

        const run = await this.prisma.pipelineRun.create({
            data: {
                status: PipelineRunStatus.IN_PROGRESS,
                sourceRoots: sourceDirectories,
                destinationRoots: destinationDirectories,
                startedAt: new Date(),
            },
        });

        const results: Array<{
            source: string;
            destination?: string;
            status: 'processed' | 'skipped' | 'failed';
            reason?: string;
            sizeBytes?: number;
            sha256?: string;
        }> = [];

        let totalFound = 0;
        let processed = 0;
        let skipped = 0;
        let failed = 0;

        const manifestBySource = new Map<string, { entries: Map<string, any>; sha256: string }>();
        const manifestShaBySource: Record<string, string> = {};
        const verifyManifestSha = Boolean(config?.verifyManifestSha);

        for (const sourceDir of sourceDirectories) {
            const destDir = sourceToDest.get(sourceDir);
            if (!destDir) {
                continue;
            }

            if (!fs.existsSync(sourceDir)) {
                this.logger.warn(`Source directory not found: ${sourceDir}`);
                results.push({ source: sourceDir, status: 'skipped', reason: 'source_missing' });
                skipped += 1;
                continue;
            }

            let manifest: { entries: Map<string, any>; sha256: string } | null = null;
            try {
                manifest = await this.loadManifest(sourceDir, verifyManifestSha);
            } catch (error: any) {
                this.logger.warn(`Manifest load failed for ${sourceDir}: ${error?.message || error}. Attempting auto-generation.`);
                const generated = await this.generateManifestForPipeline(sourceDir, extensions);
                if (!generated) {
                    this.logger.error(`Manifest auto-generation failed for ${sourceDir}`);
                    results.push({ source: sourceDir, status: 'failed', reason: 'manifest_load_failed' });
                    failed += 1;
                    continue;
                }

                try {
                    manifest = await this.loadManifest(sourceDir, verifyManifestSha);
                } catch (retryError: any) {
                    this.logger.error(`Manifest reload failed for ${sourceDir}: ${retryError?.message || retryError}`);
                    results.push({ source: sourceDir, status: 'failed', reason: 'manifest_load_failed' });
                    failed += 1;
                    continue;
                }
            }

            if (!manifest) {
                results.push({ source: sourceDir, status: 'failed', reason: 'manifest_load_failed' });
                failed += 1;
                continue;
            }

            manifestBySource.set(sourceDir, manifest);
            manifestShaBySource[sourceDir] = manifest.sha256;
            await this.prisma.pipelineRun.update({
                where: { id: run.id },
                data: { manifestSha: manifestShaBySource },
            });

            const files = await this.scanDirForPipeline(sourceDir, {
                extensions,
                excludePatterns,
                minDate,
                maxDate,
                maxFiles: maxFiles ? Math.max(maxFiles - totalFound, 0) : undefined,
            });

            for (const filePath of files) {
                totalFound += 1;
                if (maxFiles && totalFound > maxFiles) {
                    break;
                }

                try {
                    if (filePath.toLowerCase().endsWith('.pqc.json')) {
                        skipped += 1;
                        results.push({ source: filePath, status: 'skipped', reason: 'already_pqc' });
                        continue;
                    }

                    if (filePath.toLowerCase().endsWith('.meta.json')) {
                        skipped += 1;
                        results.push({ source: filePath, status: 'skipped', reason: 'metadata_sidecar' });
                        continue;
                    }

                    const stat = await fs.promises.stat(filePath);
                    if (stat.size > maxFileSizeBytes) {
                        skipped += 1;
                        results.push({
                            source: filePath,
                            status: 'skipped',
                            reason: `file_too_large_${stat.size}`,
                            sizeBytes: stat.size,
                        });
                        continue;
                    }

                    const fileBuffer = await fs.promises.readFile(filePath);
                    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                    const relativePath = path.relative(sourceDir, filePath);
                    const destinationPath = this.buildDestinationPath(destDir, relativePath);
                    const stageTimestamps: Record<string, string> = {
                        IDENTIFIED: new Date().toISOString(),
                    };

                    const manifest = manifestBySource.get(sourceDir);
                    const metadata = manifest?.entries.get(relativePath);
                    if (!metadata) {
                        skipped += 1;
                        results.push({ source: filePath, status: 'skipped', reason: 'manifest_missing' });
                        await this.prisma.pipelineAsset.create({
                            data: {
                                runId: run.id,
                                relativePath,
                                sourcePath: filePath,
                                status: PipelineAssetStatus.SKIPPED,
                                manifestSha256: manifest?.sha256 || manifestShaBySource[sourceDir],
                                plaintextSha256: sha256,
                                fileSizeBytes: stat.size,
                                stageTimestamps,
                                errorMessage: 'manifest_missing',
                            },
                        });
                        continue;
                    }

                    const sidecar = await this.loadSidecarMetadata(filePath);
                    const mergedMetadata = { ...metadata, ...sidecar };
                    const metadataOverride = this.resolveMetadataOverrideForFile(relativePath, metadataOverrides);
                    if (metadataOverride) {
                        if (metadataOverride.dataDomain) {
                            mergedMetadata.data_domain = metadataOverride.dataDomain;
                            mergedMetadata.dataDomain = metadataOverride.dataDomain;
                        }
                        if (metadataOverride.retentionTag) {
                            mergedMetadata.retention_tag = metadataOverride.retentionTag;
                            mergedMetadata.retentionTag = metadataOverride.retentionTag;
                        }
                        if (metadataOverride.owner) {
                            mergedMetadata.owner = metadataOverride.owner;
                            mergedMetadata.business_owner = metadataOverride.owner;
                        }
                    }
                    const effectivePolicy = this.getPolicyForFile(filePath, defaultPolicy, fileTypePolicies);
                    const effectiveKemAlgorithm = this.normalizeKemAlgorithm(effectivePolicy.kemAlgorithm, this.kemAlgorithmForLevel(effectivePolicy.level));
                    const selectedKemAnchor = this.isKemCompatible(effectivePolicy.kemAlgorithm, activeAnchor.algorithm)
                        ? activeAnchor
                        : await this.resolveActiveKemAnchor(effectiveKemAlgorithm);

                    if (!selectedKemAnchor) {
                        throw new Error(`No active KEM anchor available for ${effectiveKemAlgorithm}`);
                    }

                    const selectedAnchorAlgorithm = this.normalizeKemAlgorithm(selectedKemAnchor.algorithm, effectiveKemAlgorithm);
                    const selectedKemAlgorithm = this.normalizeKemAlgorithm(effectiveKemAlgorithm, selectedAnchorAlgorithm);

                    let selectedAnchorPublicKey = kemPublicKeyCache.get(selectedKemAnchor.id);
                    if (!selectedAnchorPublicKey) {
                        const selectedAnchorPublicRecord: any = await this.vaultService.read(selectedKemAnchor.vaultKeyPath);
                        const selectedAnchorPublicKeyB64 = selectedAnchorPublicRecord?.data?.key || selectedAnchorPublicRecord?.key;
                        if (!selectedAnchorPublicKeyB64) {
                            throw new Error(`Invalid public key payload at ${selectedKemAnchor.vaultKeyPath}`);
                        }
                        selectedAnchorPublicKey = Buffer.from(selectedAnchorPublicKeyB64, 'base64');
                        kemPublicKeyCache.set(selectedKemAnchor.id, selectedAnchorPublicKey);
                    }

                    let selectedKem = kemByAlgorithmCache.get(selectedKemAlgorithm);
                    if (!selectedKem) {
                        selectedKem = await getMlKemByAlgorithm(selectedKemAlgorithm);
                        kemByAlgorithmCache.set(selectedKemAlgorithm, selectedKem);
                    }

                    const pipelineAsset = await this.prisma.pipelineAsset.create({
                        data: {
                            runId: run.id,
                            objectId: mergedMetadata.object_id || metadata.object_id,
                            relativePath: mergedMetadata.relative_path || metadata.relative_path || relativePath,
                            sourcePath: filePath,
                            status: PipelineAssetStatus.IDENTIFIED,
                            pqcStatus: mergedMetadata.pqc_status || undefined,
                            pqcProtected: Boolean(mergedMetadata.pqc_protected),
                            dataDomain: mergedMetadata.data_domain || metadata.data_domain,
                            cryptoDomain: mergedMetadata.crypto_domain || metadata.crypto_domain,
                            expectedPolicyOutcome: mergedMetadata.expected_policy_outcome || metadata.expected_policy_outcome,
                            plaintextSha256: mergedMetadata.plaintext_sha256 || metadata.plaintext_sha256 || sha256,
                            manifestSha256: manifest?.sha256,
                            fileSizeBytes: stat.size,
                            metadata: {
                                ...mergedMetadata,
                                pipeline_pqc_policy: {
                                    level: effectivePolicy.level,
                                    kemAlgorithm: selectedKemAlgorithm,
                                    signatureAlgorithms: effectivePolicy.signatureAlgorithms,
                                },
                            },
                            stageTimestamps,
                        },
                    });

                    stageTimestamps.CATEGORIZED = new Date().toISOString();
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.CATEGORIZED,
                            stageTimestamps,
                        },
                    });

                    stageTimestamps.ANALYZED = new Date().toISOString();
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.ANALYZED,
                            stageTimestamps,
                        },
                    });

                    const nistLevel = this.deriveNistLevel(mergedMetadata);
                    stageTimestamps.NIST_ASSIGNED = new Date().toISOString();
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.NIST_ASSIGNED,
                            nistLevel,
                            stageTimestamps,
                        },
                    });

                    const pqcStatus = typeof mergedMetadata.pqc_status === 'string' ? mergedMetadata.pqc_status : '';
                    const pqcProtected = typeof mergedMetadata.pqc_protected === 'boolean'
                        ? mergedMetadata.pqc_protected
                        : pqcStatus.toUpperCase() === 'PQC_PROTECTED';

                    if (pqcProtected) {
                        skipped += 1;
                        results.push({ source: filePath, status: 'skipped', reason: 'already_pqc' });
                        stageTimestamps.SKIPPED = new Date().toISOString();
                        await this.prisma.pipelineAsset.update({
                            where: { id: pipelineAsset.id },
                            data: {
                                status: PipelineAssetStatus.SKIPPED,
                                pqcStatus: pqcStatus || 'PQC_PROTECTED',
                                pqcProtected: true,
                                stageTimestamps,
                            },
                        });
                        continue;
                    }

                    const aadContext = {
                        protocolVersion: PQC_PIPELINE_VERSION,
                        wrapSuite: wrapSuiteForKemAlgorithm(selectedKemAlgorithm),
                        kemAlgorithm: selectedKemAlgorithm,
                        wrapLevel: effectivePolicy.level,
                        anchorId: selectedKemAnchor.id,
                        anchorAlgorithm: selectedKemAnchor.algorithm,
                        objectId: mergedMetadata.object_id || metadata.object_id || null,
                        relativePath: mergedMetadata.relative_path || metadata.relative_path || relativePath,
                        plaintextSha256: mergedMetadata.plaintext_sha256 || metadata.plaintext_sha256 || sha256,
                        manifestSha256: manifest?.sha256 || null,
                        dataDomain: mergedMetadata.data_domain || metadata.data_domain || null,
                        cryptoDomain: mergedMetadata.crypto_domain || metadata.crypto_domain || null,
                    };

                    const envelope = await this.encryptBuffer(
                        fileBuffer,
                        selectedKem,
                        selectedAnchorPublicKey,
                        aadContext,
                        selectedKemAlgorithm,
                    );

                    const payload = {
                        version: PQC_PIPELINE_VERSION,
                        algorithm: wrapSuiteForKemAlgorithm(selectedKemAlgorithm),
                        kemAlgorithm: selectedKemAlgorithm,
                        wrapLevel: effectivePolicy.level,
                        anchorId: selectedKemAnchor.id,
                        anchorAlgorithm: selectedKemAnchor.algorithm,
                        object_id: mergedMetadata.object_id || metadata.object_id,
                        relative_path: mergedMetadata.relative_path || metadata.relative_path || relativePath,
                        plaintext_sha256: mergedMetadata.plaintext_sha256 || metadata.plaintext_sha256 || sha256,
                        manifest_sha256: manifest?.sha256,
                        data_domain: mergedMetadata.data_domain || metadata.data_domain,
                        crypto_domain: mergedMetadata.crypto_domain || metadata.crypto_domain,
                        expected_policy_outcome: mergedMetadata.expected_policy_outcome || metadata.expected_policy_outcome,
                        pqc_status: pqcStatus || (pqcProtected ? 'PQC_PROTECTED' : 'UNPROTECTED'),
                        pqc_protected: pqcProtected,
                        metadata: mergedMetadata,
                        source: {
                            path: filePath,
                            relativePath,
                            sizeBytes: fileBuffer.length,
                            sha256,
                        },
                        envelope: {
                            kemCiphertext: Buffer.from(envelope.kemCiphertext).toString('base64'),
                            salt: envelope.salt.toString('base64'),
                            nonce: envelope.nonce.toString('base64'),
                            aeadTag: envelope.aeadTag.toString('base64'),
                            aadSha256: envelope.aadSha256,
                            aadContext,
                        },
                        ciphertext: envelope.aeadCiphertext.toString('base64'),
                        attestation: {
                            payloadDigestSha256: '',
                            signatures: [] as Array<{
                                algorithm: string;
                                anchorId: string;
                                anchorName: string;
                                signature: string;
                            }>,
                        },
                        wrappedAt: new Date().toISOString(),
                    };

                    const payloadDigestSha256 = canonicalJsonSha256Hex({
                        ...payload,
                        attestation: undefined,
                    });

                    const attestationSignatures = await this.signDigestForPolicy(
                        payloadDigestSha256,
                        effectivePolicy.signatureAlgorithms,
                        signatureAnchors,
                    );

                    payload.attestation = {
                        payloadDigestSha256: `0x${payloadDigestSha256}`,
                        signatures: attestationSignatures,
                    };

                    stageTimestamps.WRAPPED_PQC = new Date().toISOString();
                    if (attestationSignatures.length > 0) {
                        stageTimestamps.ATTESTED = new Date().toISOString();
                    }
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.WRAPPED_PQC,
                            pqcStatus: 'PQC_PROTECTED', // Successfully wrapped = protected
                            pqcProtected: true,
                            stageTimestamps,
                        },
                    });

                    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
                    await fs.promises.writeFile(destinationPath, JSON.stringify(payload, null, 2), 'utf8');

                    stageTimestamps.TRANSFERRED = new Date().toISOString();
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.TRANSFERRED,
                            destinationPath,
                            stageTimestamps,
                        },
                    });

                    processed += 1;
                    results.push({
                        source: filePath,
                        destination: destinationPath,
                        status: 'processed',
                        sizeBytes: fileBuffer.length,
                        sha256,
                    });
                } catch (error: any) {
                    failed += 1;
                    results.push({
                        source: filePath,
                        status: 'failed',
                        reason: error?.message || 'pipeline_error',
                    });
                    await this.prisma.pipelineAsset.create({
                        data: {
                            runId: run.id,
                            relativePath: path.relative(sourceDir, filePath),
                            sourcePath: filePath,
                            status: PipelineAssetStatus.FAILED,
                            errorMessage: error?.message || 'pipeline_error',
                        },
                    });
                }
            }
        }

        const summary = {
            success: failed === 0,
            message: `PQC pipeline complete. Processed ${processed}, skipped ${skipped}, failed ${failed}.`,
            totalFound,
            processed,
            skipped,
            failed,
            anchorId: activeAnchor.id,
            anchorAlgorithm: activeAnchor.algorithm,
            pipelinePolicy: {
                default: defaultPolicy,
                byFileType: Object.fromEntries(fileTypePolicies.entries()),
            },
            evaluatedRisk: {
                score: operationRiskScore,
                level: operationRiskLevel,
                maxAssetsPerRun: riskRule.maxAssetsPerRun,
            },
            runId: run.id,
            results: results.slice(0, 100),
        };

        await this.prisma.pipelineRun.update({
            where: { id: run.id },
            data: {
                status: failed > 0 ? PipelineRunStatus.FAILED : PipelineRunStatus.COMPLETED,
                totalFound,
                processed,
                skipped,
                failed,
                completedAt: new Date(),
            },
        });

            this.logger.log(`PQC pipeline complete. Processed ${processed}, skipped ${skipped}, failed ${failed}.`);
            return summary;
        } catch (error: any) {
            this.logger.error(`PQC pipeline failed: ${error?.message || error}`);
            return {
                success: false,
                message: error?.message || 'PQC pipeline failed. Check server logs for details.',
                error: error?.message || 'pipeline_error',
            };
        }
    }

    private parseLineList(value: string): string[] {
        return (value || '')
            .split('\n')
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    private parseCommaList(value: string): string[] {
        return (value || '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    private normalizeExtensions(extensions: string[]): string[] {
        const normalized = extensions
            .map((ext) => ext.replace(/^\*\./, '.').replace(/^\*/, ''))
            .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
            .filter((ext) => ext !== '.');

        if (normalized.some((ext) => ext === '.*' || ext === '*')) {
            return [];
        }

        return Array.from(new Set(normalized.map((ext) => ext.toLowerCase())));
    }

    private resolvePipelineExtensions(config: any): string[] {
        // Combine file types and format-derived extensions
        const fileTypes = this.normalizeExtensions(this.parseCommaList(config.fileTypes || ''));
        
        const formatValue = typeof config?.formats === 'string' ? config.formats : '';
        const formats = this.parseCommaList(formatValue).map((f) => f.toLowerCase());
        const formatExtensions = this.normalizeExtensions(this.extensionsFromFormats(formats));
        
        // Merge both lists, removing duplicates
        const combined = Array.from(new Set([...fileTypes, ...formatExtensions]));
        
        this.logger.log(`Pipeline extensions resolved: ${combined.join(', ')} (from fileTypes: ${fileTypes.join(', ')}, formats: ${formatExtensions.join(', ')})`);
        
        return combined;
    }

    private extensionsFromFormats(formats: string[]): string[] {
        if (!formats.length) return [];
        const extensions: string[] = [];

        const push = (...exts: string[]) => extensions.push(...exts);

        for (const fmt of formats) {
            if (fmt.includes('parquet')) push('.parquet');
            if (fmt === 'csv' || fmt.includes('csv')) push('.csv');
            if (fmt === 'json' || fmt.includes('json')) push('.json');
            if (fmt === 'txt' || fmt.includes('txt')) push('.txt');
            if (fmt === 'pdf' || fmt.includes('pdf')) push('.pdf');
            if (fmt.includes('png')) push('.png');
            if (fmt.includes('jpeg') || fmt.includes('jpg')) push('.jpeg', '.jpg');
            if (fmt.includes('tiff') || fmt.includes('tif')) push('.tiff', '.tif');
            if (fmt.includes('bin')) push('.bin');
            if (fmt.includes('dicom')) push('.dcm', '.dicom');
            if (fmt.includes('fasta')) push('.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn');
            if (fmt.includes('vcf')) push('.vcf');
            if (fmt.includes('gz')) push('.gz');
        }

        // If gz is present, allow common gzipped fasta/vcf variants
        if (extensions.includes('.gz')) {
            push('.fasta.gz', '.fa.gz', '.fna.gz', '.ffn.gz', '.faa.gz', '.frn.gz', '.vcf.gz');
        }

        return extensions;
    }

    private async loadManifest(
        sourceRoot: string,
        verifySha: boolean
    ): Promise<{ entries: Map<string, any>; sha256: string }> {
        const manifestPath = path.join(sourceRoot, 'manifest.jsonl');
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest not found at ${manifestPath}. Run "Discovery" first to auto-generate the manifest.`);
        }

        const data = await fs.promises.readFile(manifestPath, 'utf8');
        const map = new Map<string, any>();
        const manifestSha = await this.readManifestSha(sourceRoot);

        if (!manifestSha) {
            throw new Error(`manifest.sha256 missing or invalid in ${sourceRoot}. Run "Discovery" to regenerate.`);
        }

        if (verifySha) {
            const computed = crypto.createHash('sha256').update(data).digest('hex');
            if (computed !== manifestSha) {
                throw new Error(`manifest.sha256 mismatch for ${sourceRoot}`);
            }
        }

        for (const line of data.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                const obj = JSON.parse(trimmed);
                const rel = typeof obj.relative_path === 'string' ? obj.relative_path : '';
                if (rel) {
                    map.set(rel, obj);
                }
            } catch (err) {
                // Ignore malformed lines
            }
        }

        return { entries: map, sha256: manifestSha };
    }

    private async readManifestSha(sourceRoot: string): Promise<string> {
        const shaPath = path.join(sourceRoot, 'manifest.sha256');
        if (!fs.existsSync(shaPath)) {
            return '';
        }
        try {
            const data = await fs.promises.readFile(shaPath, 'utf8');
            const trimmed = data.trim();
            if (!trimmed) return '';
            const token = trimmed.split(/\s+/)[0];
            return token || '';
        } catch (err) {
            return '';
        }
    }

    private async loadSidecarMetadata(filePath: string): Promise<Record<string, any>> {
        const sidecarPath = `${filePath}.meta.json`;
        if (!fs.existsSync(sidecarPath)) {
            return {};
        }
        try {
            const data = await fs.promises.readFile(sidecarPath, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object') {
                return parsed as Record<string, any>;
            }
        } catch (err) {
            return {};
        }
        return {};
    }

    private deriveNistLevel(metadata: Record<string, any>): number {
        const explicit = Number(metadata?.nist_level ?? metadata?.nistLevel);
        if (Number.isFinite(explicit) && explicit > 0) {
            return Math.min(Math.max(Math.floor(explicit), 1), 5);
        }

        const domain = String(metadata?.data_domain || '').toLowerCase();
        const cryptoDomain = String(metadata?.crypto_domain || '').toLowerCase();

        if (domain.includes('genomic') || domain.includes('phi') || domain.includes('patient')) return 5;
        if (domain.includes('imaging') || domain.includes('media') || domain.includes('legal')) return 4;
        if (cryptoDomain.includes('high')) return 4;
        if (domain.includes('derived') || domain.includes('de-identified')) return 2;
        if (domain.includes('operational') || domain.includes('audit')) return 3;
        return 3;
    }

    private parseJsonObject(value: unknown): Record<string, any> {
        if (!value) return {};
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                    ? parsed as Record<string, any>
                    : {};
            } catch {
                return {};
            }
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, any>;
        }
        return {};
    }

    private parsePipelineLevel(value: unknown): PipelineWrapLevel {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized === 'baseline' || normalized === 'low' || normalized === 'level1') return 'baseline';
        if (normalized === 'maximum' || normalized === 'max' || normalized === 'high' || normalized === 'level3') return 'maximum';
        return 'enhanced';
    }

    private canonicalAlgorithm(value: unknown): string {
        const signature = this.normalizeSignatureAlgorithm(value);
        if (signature) {
            return signature;
        }

        const raw = String(value || '').trim();
        return this.normalizeKemAlgorithm(raw, raw || ML_KEM_1024_ALGORITHM);
    }

    private algorithmToId(algorithm: string): string {
        return algorithm
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    private algorithmMeta(algorithm: string): {
        canonical: string;
        name: string;
        type: 'KEM' | 'Signature' | 'Legacy';
        securityLevel: number;
    } {
        const canonical = this.canonicalAlgorithm(algorithm);
        switch (canonical) {
            case ML_KEM_512_ALGORITHM:
                return {
                    canonical,
                    name: 'ML-KEM-512 (FIPS 203)',
                    type: 'KEM',
                    securityLevel: 1,
                };
            case ML_KEM_768_ALGORITHM:
                return {
                    canonical,
                    name: 'ML-KEM-768 (FIPS 203)',
                    type: 'KEM',
                    securityLevel: 3,
                };
            case ML_KEM_1024_ALGORITHM:
                return {
                    canonical,
                    name: 'ML-KEM-1024 (FIPS 203)',
                    type: 'KEM',
                    securityLevel: 5,
                };
            case ML_DSA_65_ALGORITHM:
                return {
                    canonical,
                    name: 'ML-DSA-65 (FIPS 204)',
                    type: 'Signature',
                    securityLevel: 3,
                };
            case SLH_DSA_SHAKE_128S_ALGORITHM:
                return {
                    canonical,
                    name: 'SLH-DSA-SHAKE-128s (FIPS 205)',
                    type: 'Signature',
                    securityLevel: 5,
                };
            default:
                return {
                    canonical,
                    name: canonical,
                    type: 'Legacy',
                    securityLevel: 0,
                };
        }
    }

    private summarizeAuditDetails(details: Prisma.JsonValue | null): string {
        const detailObj = this.parseJsonObject(details);
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

    private kemAlgorithmForLevel(level: PipelineWrapLevel): string {
        if (level === 'baseline') return ML_KEM_512_ALGORITHM;
        if (level === 'maximum') return ML_KEM_1024_ALGORITHM;
        return ML_KEM_768_ALGORITHM;
    }

    private normalizeKemAlgorithm(value: unknown, fallback: string = ML_KEM_1024_ALGORITHM): string {
        const normalized = normalizeKemAlgorithmName(value, fallback);
        const compact = normalized.replace(/[^A-Z0-9]/g, '');

        if (compact.includes('MLKEM512') || compact.includes('KYBER512')) {
            return ML_KEM_512_ALGORITHM;
        }
        if (compact.includes('MLKEM768') || compact.includes('KYBER768')) {
            return ML_KEM_768_ALGORITHM;
        }
        if (compact.includes('MLKEM1024') || compact.includes('KYBER1024')) {
            return ML_KEM_1024_ALGORITHM;
        }

        return normalized;
    }

    private normalizeSignatureAlgorithm(value: unknown): string {
        const normalized = String(value || '').trim().toUpperCase();
        if (!normalized) return '';
        if (normalized.includes('DILITHIUM') || normalized.includes('ML-DSA') || normalized.includes('MLDSA')) {
            return ML_DSA_65_ALGORITHM;
        }
        if (normalized.includes('SPHINCS') || normalized.includes('SLH-DSA') || normalized.includes('SLHDSA')) {
            return SLH_DSA_SHAKE_128S_ALGORITHM;
        }
        return '';
    }

    private signatureAlgorithmsForLevel(level: PipelineWrapLevel): string[] {
        if (level === 'baseline') return [];
        if (level === 'maximum') return [ML_DSA_65_ALGORITHM, SLH_DSA_SHAKE_128S_ALGORITHM];
        return [ML_DSA_65_ALGORITHM];
    }

    private resolvePipelinePolicy(config: any): PipelinePolicy {
        const level = this.parsePipelineLevel(config?.defaultPqcLevel || config?.pqcLevel || 'enhanced');
        const kemAlgorithm = this.normalizeKemAlgorithm(
            config?.kemAlgorithm || config?.defaultKemAlgorithm,
            this.kemAlgorithmForLevel(level),
        );

        let signatureAlgorithms = this.signatureAlgorithmsForLevel(level);
        const customSignatures = this.parseCommaList(String(config?.signatureAlgorithms || config?.defaultSignatureAlgorithms || ''));
        if (customSignatures.length > 0) {
            signatureAlgorithms = customSignatures
                .map((entry) => this.normalizeSignatureAlgorithm(entry))
                .filter(Boolean);
        }

        return {
            level,
            kemAlgorithm,
            signatureAlgorithms: Array.from(new Set(signatureAlgorithms)),
        };
    }

    private normalizePolicyExtension(extension: string): string {
        const trimmed = extension.trim().toLowerCase();
        if (!trimmed) return '';
        if (trimmed.startsWith('.')) return trimmed;
        return `.${trimmed}`;
    }

    private normalizePolicyExtensions(extensionList: string): string[] {
        return extensionList
            .split(',')
            .map((entry) => this.normalizePolicyExtension(entry))
            .filter(Boolean);
    }

    private resolveFileTypePolicies(config: any): Map<string, PipelinePolicy> {
        const policyMap = new Map<string, PipelinePolicy>();

        const rawLevelMap = this.parseJsonObject(config?.fileTypePqcLevels || config?.pqcLevelByFileType || config?.pipelineLevelByFileType);
        for (const [ext, rawLevel] of Object.entries(rawLevelMap)) {
            const level = this.parsePipelineLevel(rawLevel);
            const normalizedExts = this.normalizePolicyExtensions(ext);
            for (const normalizedExt of normalizedExts) {
                policyMap.set(normalizedExt, {
                    level,
                    kemAlgorithm: this.kemAlgorithmForLevel(level),
                    signatureAlgorithms: this.signatureAlgorithmsForLevel(level),
                });
            }
        }

        const rawPolicyMap = this.parseJsonObject(config?.fileTypePqcPolicies || config?.pqcPolicyByFileType || config?.pipelinePqcPolicyByFileType);
        for (const [ext, rawPolicy] of Object.entries(rawPolicyMap)) {
            const normalizedExts = this.normalizePolicyExtensions(ext);
            if (normalizedExts.length === 0) continue;

            if (typeof rawPolicy === 'string') {
                const level = this.parsePipelineLevel(rawPolicy);
                for (const normalizedExt of normalizedExts) {
                    policyMap.set(normalizedExt, {
                        level,
                        kemAlgorithm: this.kemAlgorithmForLevel(level),
                        signatureAlgorithms: this.signatureAlgorithmsForLevel(level),
                    });
                }
                continue;
            }

            if (!rawPolicy || typeof rawPolicy !== 'object' || Array.isArray(rawPolicy)) {
                continue;
            }

            const parsedPolicy = rawPolicy as Record<string, any>;
            const level = this.parsePipelineLevel(parsedPolicy.level || parsedPolicy.wrapLevel);
            const kemAlgorithm = this.normalizeKemAlgorithm(
                parsedPolicy.kemAlgorithm || parsedPolicy.kem,
                this.kemAlgorithmForLevel(level),
            );
            const signatureAlgorithms = Array.isArray(parsedPolicy.signatureAlgorithms)
                ? parsedPolicy.signatureAlgorithms.map((entry) => this.normalizeSignatureAlgorithm(entry)).filter(Boolean)
                : this.signatureAlgorithmsForLevel(level);

            for (const normalizedExt of normalizedExts) {
                policyMap.set(normalizedExt, {
                    level,
                    kemAlgorithm,
                    signatureAlgorithms: Array.from(new Set(signatureAlgorithms)),
                });
            }
        }

        return policyMap;
    }

    private normalizeMetadataValue(value: unknown): string | undefined {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    private resolveAssetTypeMetadata(config: any): Map<string, PipelineMetadataOverride> {
        const metadataMap = new Map<string, PipelineMetadataOverride>();
        const rawMetadataByExtension = this.parseJsonObject(config?.assetTypeMetadata || config?.metadataByExtension);

        for (const [extension, rawValue] of Object.entries(rawMetadataByExtension)) {
            if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
                continue;
            }

            const parsed = rawValue as Record<string, unknown>;
            const override: PipelineMetadataOverride = {
                dataDomain: this.normalizeMetadataValue(parsed.dataDomain) || this.normalizeMetadataValue(parsed.data_domain),
                retentionTag: this.normalizeMetadataValue(parsed.retentionTag) || this.normalizeMetadataValue(parsed.retention_tag),
                owner: this.normalizeMetadataValue(parsed.owner) || this.normalizeMetadataValue(parsed.businessOwner) || this.normalizeMetadataValue(parsed.business_owner),
            };

            if (!override.dataDomain && !override.retentionTag && !override.owner) {
                continue;
            }

            const normalizedExts = this.normalizePolicyExtensions(extension);
            for (const normalizedExt of normalizedExts) {
                metadataMap.set(normalizedExt, override);
            }
        }

        return metadataMap;
    }

    private resolveMetadataOverrideForFile(filePath: string, metadataOverrides: Map<string, PipelineMetadataOverride>): PipelineMetadataOverride | null {
        if (metadataOverrides.size === 0) {
            return null;
        }

        const lower = filePath.toLowerCase();
        const orderedExtensions = Array.from(metadataOverrides.keys()).sort((a, b) => b.length - a.length);

        for (const extension of orderedExtensions) {
            if (lower.endsWith(extension)) {
                return metadataOverrides.get(extension) || null;
            }
        }

        return null;
    }

    private getPolicyForFile(filePath: string, defaultPolicy: PipelinePolicy, fileTypePolicies: Map<string, PipelinePolicy>): PipelinePolicy {
        const lower = filePath.toLowerCase();
        const orderedExtensions = Array.from(fileTypePolicies.keys()).sort((a, b) => b.length - a.length);

        for (const extension of orderedExtensions) {
            if (lower.endsWith(extension)) {
                return fileTypePolicies.get(extension) || defaultPolicy;
            }
        }

        return defaultPolicy;
    }

    private collectRequiredSignatureAlgorithms(defaultPolicy: PipelinePolicy, fileTypePolicies: Map<string, PipelinePolicy>): string[] {
        const combined = new Set<string>(defaultPolicy.signatureAlgorithms);
        for (const policy of fileTypePolicies.values()) {
            for (const algorithm of policy.signatureAlgorithms) {
                combined.add(algorithm);
            }
        }
        return Array.from(combined.values());
    }

    private isKemCompatible(requestedAlgorithm: string, activeAlgorithm: string): boolean {
        const normalizedActive = this.normalizeKemAlgorithm(activeAlgorithm);
        return this.normalizeKemAlgorithm(requestedAlgorithm, normalizedActive) === normalizedActive;
    }

    private async resolveActiveKemAnchor(kemAlgorithm: string) {
        const normalized = this.normalizeKemAlgorithm(kemAlgorithm);
        const activeAnchors = await this.prisma.anchor.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });

        return activeAnchors.find((anchor) => {
            const anchorAlgorithm = this.normalizeKemAlgorithm(anchor.algorithm, normalized);
            return anchorAlgorithm === normalized;
        }) || null;
    }

    private async resolveSignatureAnchors(algorithms: string[]): Promise<Map<string, { id: string; name: string; algorithm: string; vaultPrivKeyPath: string }>> {
        const anchors = new Map<string, { id: string; name: string; algorithm: string; vaultPrivKeyPath: string }>();
        const activeAnchors = await this.prisma.anchor.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });

        for (const algorithm of algorithms) {
            const normalizedAlgorithm = this.normalizeSignatureAlgorithm(algorithm) || String(algorithm || '').trim().toUpperCase();
            const anchor = activeAnchors.find((candidate) => {
                const normalizedCandidate = this.normalizeSignatureAlgorithm(candidate.algorithm);
                if (normalizedCandidate) {
                    return normalizedCandidate === normalizedAlgorithm;
                }
                return String(candidate.algorithm || '').trim().toUpperCase() === normalizedAlgorithm;
            });

            if (anchor) {
                anchors.set(algorithm, {
                    id: anchor.id,
                    name: anchor.name,
                    algorithm: anchor.algorithm,
                    vaultPrivKeyPath: anchor.vaultPrivKeyPath,
                });
            }
        }
        return anchors;
    }

    private async signDigestWithAlgorithm(digestHex: string, algorithm: string, privateKeyBytes: Uint8Array): Promise<string> {
        const messageBytes = new Uint8Array(Buffer.from(digestHex, 'hex'));

        if (algorithm === ML_DSA_65_ALGORITHM) {
            const signer = await getMlDsa65();
            const signature = await signer.sign(messageBytes, privateKeyBytes);
            return Buffer.from(signature).toString('base64');
        }

        if (algorithm === SLH_DSA_SHAKE_128S_ALGORITHM) {
            const signer = await getSlhDsaShake128s();
            const signature = await signer.sign(messageBytes, privateKeyBytes);
            return Buffer.from(signature).toString('base64');
        }

        throw new Error(`Unsupported signature algorithm: ${algorithm}`);
    }

    private async signDigestForPolicy(
        digestHex: string,
        signatureAlgorithms: string[],
        signatureAnchors: Map<string, { id: string; name: string; algorithm: string; vaultPrivKeyPath: string }>,
    ): Promise<Array<{ algorithm: string; anchorId: string; anchorName: string; signature: string }>> {
        const signatures: Array<{ algorithm: string; anchorId: string; anchorName: string; signature: string }> = [];

        for (const algorithm of signatureAlgorithms) {
            const anchor = signatureAnchors.get(algorithm);
            if (!anchor) {
                throw new Error(`Missing active anchor for signature algorithm ${algorithm}`);
            }

            const privateKeyRecord: any = await this.vaultService.read(anchor.vaultPrivKeyPath);
            const privateKeyB64 = privateKeyRecord?.data?.key || privateKeyRecord?.key;
            if (!privateKeyB64) {
                throw new Error(`Invalid private key payload at ${anchor.vaultPrivKeyPath}`);
            }

            const signature = await this.signDigestWithAlgorithm(
                digestHex,
                algorithm,
                new Uint8Array(Buffer.from(privateKeyB64, 'base64')),
            );

            signatures.push({
                algorithm,
                anchorId: anchor.id,
                anchorName: anchor.name,
                signature,
            });
        }

        return signatures;
    }

    private parseDate(value: any): Date | undefined {
        if (!value) return undefined;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return undefined;
        return date;
    }

    private parseRequiredPositiveInt(value: any, fieldName: string): number {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error(`${fieldName} must be a positive number.`);
        }
        return Math.floor(parsed);
    }

    private mapSourceDestinations(sourceDirs: string[], destinationDirs: string[]): Map<string, string> | null {
        if (destinationDirs.length === 1) {
            const map = new Map<string, string>();
            for (const source of sourceDirs) {
                map.set(source, destinationDirs[0]);
            }
            return map;
        }

        if (destinationDirs.length !== sourceDirs.length) {
            return null;
        }

        const map = new Map<string, string>();
        sourceDirs.forEach((source, index) => {
            map.set(source, destinationDirs[index]);
        });
        return map;
    }

    private buildDestinationPath(destDir: string, relativePath: string): string {
        const outputFile = `${path.basename(relativePath)}.pqc.json`;
        const outputDir = path.dirname(relativePath);
        return path.join(destDir, outputDir, outputFile);
    }

    private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
        const lower = filePath.toLowerCase();
        return excludePatterns.some((pattern) => lower.includes(pattern.toLowerCase()));
    }

    private fileMatchesExtensions(filePath: string, extensions: string[]): boolean {
        if (extensions.length === 0) return true;
        const lower = filePath.toLowerCase();
        return extensions.some((ext) => lower.endsWith(ext));
    }

    private fileWithinDateRange(stat: fs.Stats, minDate?: Date, maxDate?: Date): boolean {
        if (!minDate && !maxDate) return true;
        const birthTimeMs = stat.birthtimeMs && stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.mtimeMs;
        const fileDate = new Date(birthTimeMs);
        if (minDate && fileDate < minDate) return false;
        if (maxDate && fileDate > maxDate) return false;
        return true;
    }

    private async scanDirForPipeline(
        dir: string,
        options: {
            extensions: string[];
            excludePatterns: string[];
            minDate?: Date;
            maxDate?: Date;
            maxFiles?: number;
            maxFileSizeBytes?: number;
        }
    ): Promise<string[]> {
        let results: string[] = [];
        try {
            const list = await fs.promises.readdir(dir);
            for (const file of list) {
                if (options.maxFiles && results.length >= options.maxFiles) {
                    break;
                }

                const filePath = path.join(dir, file);

                if (this.shouldExclude(filePath, options.excludePatterns)) {
                    continue;
                }

                try {
                    const stat = await fs.promises.lstat(filePath);
                    if (stat.isSymbolicLink()) {
                        continue;
                    }

                    if (stat.isDirectory()) {
                        if (!file.startsWith('.')) {
                            const nested = await this.scanDirForPipeline(filePath, options);
                            results = results.concat(nested);
                        }
                    } else if (stat.isFile()) {
                        if (!this.fileMatchesExtensions(filePath, options.extensions)) {
                            continue;
                        }
                        if (!this.fileWithinDateRange(stat, options.minDate, options.maxDate)) {
                            continue;
                        }
                        if (options.maxFileSizeBytes && stat.size > options.maxFileSizeBytes) {
                            continue;
                        }
                        results.push(filePath);
                    }
                } catch (err) {
                    // Ignore access errors
                }
            }
        } catch (e: any) {
            this.logger.error(`Error scanning ${dir}: ${e.message}`);
        }
        return results;
    }

    private async encryptBuffer(
        buffer: Buffer,
        kem: MlKem,
        anchorPublicKey: Buffer,
        aadContext: Record<string, unknown>,
        kemAlgorithm: string,
    ) {
        // Convert Buffer to Uint8Array for liboqs compatibility
        const publicKeyArray = new Uint8Array(anchorPublicKey);
        const { ciphertext: kemCiphertext, sharedSecret } = await kem.encapsulate(publicKeyArray);
        const salt = crypto.randomBytes(32);
        const symmetricKey = deriveAes256Key(sharedSecret, salt, kemAlgorithm);
        const nonce = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, nonce);
        cipher.setAAD(canonicalJsonBuffer(aadContext));
        const aeadCiphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const aeadTag = cipher.getAuthTag();
        return {
            kemCiphertext,
            salt,
            nonce,
            aeadCiphertext,
            aeadTag,
            aadSha256: canonicalJsonSha256Hex(aadContext),
        };
    }

    private async getDatabaseHealth() {
        const startedAt = Date.now();
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            const latencyMs = Date.now() - startedAt;

            let pool = '?/?';
            try {
                const rows = await this.prisma.$queryRawUnsafe<Array<{ active_connections: number | bigint }>>(
                    'SELECT COUNT(*)::int AS active_connections FROM pg_stat_activity WHERE datname = current_database()'
                );
                const activeConnections = Number(rows?.[0]?.active_connections ?? 0);
                pool = `${activeConnections}/?`;
            } catch {
                pool = '?/?';
            }

            const [wrappingActive, attestationActive] = await Promise.all([
                this.prisma.wrappingJob.count({ where: { status: { in: [JobStatus.PENDING, JobStatus.IN_PROGRESS] } } }),
                this.prisma.attestationJob.count({ where: { status: { in: [JobStatus.PENDING, JobStatus.IN_PROGRESS] } } }),
            ]);

            return {
                status: 'online',
                pool,
                jobs: wrappingActive + attestationActive,
                latency: `${latencyMs}ms`,
            };
        } catch {
            return {
                status: 'offline',
                pool: '-/-',
                jobs: '-',
                latency: '-',
            };
        }
    }

    private async getAiEngineHealth() {
        const model =
            this.configService.get<string>('AI_MODEL_NAME') ||
            this.configService.get<string>('PQC_MODEL_NAME') ||
            this.configService.get<string>('AI_ENGINE_MODEL') ||
            null;

        try {
            const [activeScans, queuedScans] = await Promise.all([
                this.prisma.scan.count({ where: { status: ScanStatus.IN_PROGRESS } }),
                this.prisma.scan.count({ where: { status: ScanStatus.PENDING } }),
            ]);

            const syntheticLoad = Math.min(100, activeScans * 25 + queuedScans * 10);
            const status = model ? (activeScans > 0 ? 'online' : 'degraded') : 'offline';

            return {
                status,
                model: model || 'unconfigured',
                load: model ? `${syntheticLoad}%` : '-',
                activeScans,
                queuedScans,
            };
        } catch {
            return {
                status: model ? 'degraded' : 'offline',
                model: model || 'unconfigured',
                load: '-',
                activeScans: '-',
                queuedScans: '-',
            };
        }
    }

    async getSystemHealth() {
        const [vault, blockchain, database, aiEngine] = await Promise.all([
            this.vaultService.getHealth(),
            this.blockchainService.getHealth(),
            this.getDatabaseHealth(),
            this.getAiEngineHealth(),
        ]);

        const hasExtendedChainTelemetry =
            blockchain.tps != null
            || blockchain.blockTimeSec != null
            || blockchain.validators != null
            || blockchain.finalitySec != null;

        const blockchainStatus = !blockchain.available
            ? 'offline'
            : (blockchain.blockHeight == null && !hasExtendedChainTelemetry ? 'degraded' : 'online');

        return {
            vault: {
                status: vault.available ? 'online' : 'offline',
                latency: vault.latencyMs != null ? `${vault.latencyMs}ms` : '-',
                version: vault.version || '-',
                sealed: vault.sealed == null ? '-' : String(vault.sealed),
            },
            blockchain: {
                status: blockchainStatus,
                backend: blockchain.backend,
                dataSource: blockchain.endpoint
                    ? ((blockchain.endpoint.includes('/status') || hasExtendedChainTelemetry) ? 'live status feed' : 'rpc node')
                    : '-',
                network: blockchain.network ?? '-',
                endpoint: blockchain.endpoint || '-',
                peers: blockchain.peers ?? '-',
                height: blockchain.blockHeight ?? '-',
                sync: blockchain.sync ?? '-',
                tps: blockchain.tps != null ? Number(blockchain.tps.toFixed(2)) : '-',
                blockTime: blockchain.blockTimeSec != null ? `${Number(blockchain.blockTimeSec.toFixed(2))}s` : '-',
                validators: blockchain.validators ?? '-',
                finality: blockchain.finalitySec != null ? `${Number(blockchain.finalitySec.toFixed(2))}s` : '-',
                chainId: blockchain.chainId ?? '-',
                latency: blockchain.latencyMs != null ? `${blockchain.latencyMs}ms` : '-',
                updatedAt: blockchain.updatedAt ?? '-',
            },
            database,
            aiEngine,
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
            const detailObj = this.parseJsonObject(entry.details);
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

    async getAlgoConfig() {
        const [keyGovernanceStatus, anchors] = await Promise.all([
            this.getKeyGovernanceStatus(),
            this.prisma.anchor.findMany({
                select: {
                    id: true,
                    algorithm: true,
                    isActive: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const byAlgorithm = new Map<string, {
            governanceActive: boolean;
            activeAnchors: number;
            totalAnchors: number;
        }>();

        const markGovernance = (algorithm: string, isActive: boolean) => {
            const meta = this.algorithmMeta(algorithm);
            const current = byAlgorithm.get(meta.canonical) || { governanceActive: false, activeAnchors: 0, totalAnchors: 0 };
            current.governanceActive = current.governanceActive || isActive;
            byAlgorithm.set(meta.canonical, current);
        };

        markGovernance(ML_DSA_65_ALGORITHM, Boolean(keyGovernanceStatus?.attestation?.signerKeyId));
        markGovernance(ML_KEM_1024_ALGORITHM, Boolean(keyGovernanceStatus?.transport?.kem?.keyId));
        markGovernance(ML_DSA_65_ALGORITHM, Boolean(keyGovernanceStatus?.transport?.identity?.keyId));

        for (const anchor of anchors) {
            const meta = this.algorithmMeta(anchor.algorithm);
            const current = byAlgorithm.get(meta.canonical) || { governanceActive: false, activeAnchors: 0, totalAnchors: 0 };
            current.totalAnchors += 1;
            if (anchor.isActive) {
                current.activeAnchors += 1;
            }
            byAlgorithm.set(meta.canonical, current);
        }

        return Array.from(byAlgorithm.entries())
            .map(([algorithm, signal]) => {
                const meta = this.algorithmMeta(algorithm);
                const status = signal.governanceActive || signal.activeAnchors > 0
                    ? 'enabled'
                    : signal.totalAnchors > 0
                        ? 'disabled'
                        : 'warning';

                return {
                    id: this.algorithmToId(meta.canonical),
                    name: meta.name,
                    type: meta.type,
                    status,
                    securityLevel: meta.securityLevel,
                    activeAnchors: signal.activeAnchors,
                    totalAnchors: signal.totalAnchors,
                    manageable: signal.totalAnchors > 0,
                };
            })
            .sort((a, b) => {
                if (b.securityLevel !== a.securityLevel) {
                    return b.securityLevel - a.securityLevel;
                }
                return a.name.localeCompare(b.name);
            });
    }

    async updateAlgoConfig(id: string, enabled: boolean) {
        const anchors = await this.prisma.anchor.findMany({
            select: {
                id: true,
                algorithm: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const matchingAnchors = anchors.filter((anchor) => {
            const canonical = this.algorithmMeta(anchor.algorithm).canonical;
            return this.algorithmToId(canonical) === id;
        });

        if (matchingAnchors.length === 0) {
            return {
                success: false,
                id,
                status: 'warning',
                message: 'Algorithm is governance-managed and not directly toggleable from anchor state.',
            };
        }

        if (enabled) {
            const firstInactive = matchingAnchors.find((anchor) => !anchor.isActive);
            if (firstInactive) {
                await this.prisma.anchor.update({
                    where: { id: firstInactive.id },
                    data: { isActive: true },
                });
            }
        } else {
            const activeIds = matchingAnchors.filter((anchor) => anchor.isActive).map((anchor) => anchor.id);
            if (activeIds.length > 0) {
                await this.prisma.anchor.updateMany({
                    where: { id: { in: activeIds } },
                    data: { isActive: false },
                });
            }
        }

        await this.writeGovernanceAudit('ALGORITHM_STATUS_UPDATE', {
            algorithmId: id,
            enabled,
            affectedAnchors: matchingAnchors.length,
            performedAt: new Date().toISOString(),
        });

        const refreshed = await this.getAlgoConfig();
        const updated = refreshed.find((algo) => algo.id === id);

        return {
            success: true,
            id,
            status: updated?.status || (enabled ? 'enabled' : 'disabled'),
        };
    }
}
