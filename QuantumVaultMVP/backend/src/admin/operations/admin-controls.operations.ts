import { BadRequestException, Logger } from '@nestjs/common';
import {
    AdminApprovalOperation,
    AdminApprovalStatus,
    Prisma,
    RiskLevel,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
    ADMIN_SYSTEM_CONTROLS,
    ADMIN_SYSTEM_CONTROL_LOOKUP,
    AdminActor,
    AdminSystemControlKey,
    RISK_LEVEL_RANK,
} from '../admin.types';
import { toInputJsonValue } from '../admin.utils';

export class AdminControlsOperations {
    private readonly logger = new Logger(AdminControlsOperations.name);

    constructor(private readonly prisma: PrismaService) { }

    private async ensureSystemControlsPresent() {
        for (const control of ADMIN_SYSTEM_CONTROLS) {
            await this.prisma.systemControl.upsert({
                where: { controlKey: control.controlKey },
                update: {
                    label: control.label,
                    description: control.description,
                },
                create: {
                    controlKey: control.controlKey,
                    label: control.label,
                    description: control.description,
                    isEnabled: false,
                },
            });
        }
    }

    async saveScanConfig(config: any) {
        this.logger.warn(`Rejected scan config persistence request: ${JSON.stringify(config || {})}`);
        throw new BadRequestException(
            'Scan configuration persistence is not implemented. Submit discovery and pipeline jobs with explicit per-run settings.',
        );
    }

    async assertSystemControlDisabled(controlKey: AdminSystemControlKey, blockedMessage: string) {
        await this.ensureSystemControlsPresent();
        const control = await this.prisma.systemControl.findUnique({
            where: { controlKey },
            select: { isEnabled: true },
        });

        if (control?.isEnabled) {
            throw new Error(blockedMessage);
        }
    }

    private isLegacySystemControlRow(row: {
        updatedByUserId?: string | null;
        reason?: string | null;
    }) {
        return !row.updatedByUserId && !String(row.reason || '').trim();
    }

    async getSystemControls() {
        await this.ensureSystemControlsPresent();
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

        const sortRank = new Map<string, number>(ADMIN_SYSTEM_CONTROLS.map((control, index) => [control.controlKey, index]));
        return rows
            .sort((a, b) => (sortRank.get(a.controlKey) ?? Number.MAX_SAFE_INTEGER) - (sortRank.get(b.controlKey) ?? Number.MAX_SAFE_INTEGER))
            .map((row) => ({
                controlKey: row.controlKey,
                label: row.label,
                description: row.description,
                isEnabled: Boolean(row.isEnabled),
                configured: !this.isLegacySystemControlRow({
                    updatedByUserId: row.updatedByUserId,
                    reason: row.reason,
                }),
                reason: row.reason || null,
                updatedAt: row.updatedAt?.toISOString() || null,
                updatedBy: row.updatedByUser?.email || null,
            }));
    }

    async setSystemControl(
        input: {
            controlKey: string;
            enabled: boolean;
            reason?: string;
        },
        actor?: AdminActor,
    ) {
        if (typeof input?.enabled !== 'boolean') {
            throw new BadRequestException('enabled must be a boolean');
        }

        const definition = ADMIN_SYSTEM_CONTROL_LOOKUP.get(input?.controlKey);
        if (!definition) {
            throw new BadRequestException(`Unknown control key: ${input?.controlKey || 'n/a'}`);
        }

        await this.ensureSystemControlsPresent();
        const previous = await this.prisma.systemControl.findUnique({
            where: { controlKey: definition.controlKey },
            select: { isEnabled: true, reason: true },
        });
        if (!previous) {
            throw new BadRequestException(`System control record is not configured for ${definition.controlKey}`);
        }

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

        const details = toInputJsonValue({
            controlKey: definition.controlKey,
            label: definition.label,
            previousEnabled: previous?.isEnabled ?? false,
            nextEnabled: updated.isEnabled,
            previousReason: previous?.reason || null,
            nextReason: updated.reason || null,
            requestedBy: actor?.email || 'admin',
            changedAt: updated.updatedAt.toISOString(),
        });

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

    deriveRiskLevelFromScore(score: number): RiskLevel {
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

    private isLegacyAdminRiskRuleRecord(rule: {
        updatedByUserId?: string | null;
        maxRiskScoreAutoApprove: number;
        requireApprovalAtRiskLevel: RiskLevel;
        maxAssetsPerRun: number;
    }) {
        return !rule.updatedByUserId
            && rule.maxRiskScoreAutoApprove === 70
            && rule.requireApprovalAtRiskLevel === 'HIGH'
            && rule.maxAssetsPerRun === 1000;
    }

    private async findStoredAdminRiskRuleRecord() {
        return this.prisma.adminRiskRule.findUnique({
            where: { ruleKey: 'default' },
        });
    }

    async getAdminRiskRuleRecord() {
        const rule = await this.findStoredAdminRiskRuleRecord();
        if (!rule || this.isLegacyAdminRiskRuleRecord(rule)) {
            return null;
        }
        return rule;
    }

    async ensureAdminRiskRuleRecord() {
        const rule = await this.getAdminRiskRuleRecord();
        if (!rule) {
            throw new BadRequestException('Admin risk rules are not configured');
        }
        return rule;
    }

    async getRiskRules() {
        const rule = await this.findStoredAdminRiskRuleRecord();
        if (!rule) {
            return {
                configured: false,
                id: null,
                maxRiskScoreAutoApprove: null,
                requireApprovalAtRiskLevel: null,
                maxAssetsPerRun: null,
                updatedAt: null,
            };
        }
        return {
            configured: !this.isLegacyAdminRiskRuleRecord(rule),
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

        const existing = await this.findStoredAdminRiskRuleRecord();
        const updated = existing
            ? await this.prisma.adminRiskRule.update({
                where: { id: existing.id },
                data: {
                    maxRiskScoreAutoApprove: Math.round(maxRiskScoreAutoApprove),
                    requireApprovalAtRiskLevel,
                    maxAssetsPerRun: Math.round(maxAssetsPerRun),
                    updatedByUserId: actor?.id || null,
                    isActive: true,
                },
            })
            : await this.prisma.adminRiskRule.create({
                data: {
                    ruleKey: 'default',
                    maxRiskScoreAutoApprove: Math.round(maxRiskScoreAutoApprove),
                    requireApprovalAtRiskLevel,
                    maxAssetsPerRun: Math.round(maxAssetsPerRun),
                    updatedByUserId: actor?.id || null,
                    isActive: true,
                },
            });

        const details = toInputJsonValue({
            previous: {
                maxRiskScoreAutoApprove: existing?.maxRiskScoreAutoApprove ?? null,
                requireApprovalAtRiskLevel: existing?.requireApprovalAtRiskLevel ?? null,
                maxAssetsPerRun: existing?.maxAssetsPerRun ?? null,
            },
            current: {
                maxRiskScoreAutoApprove: updated.maxRiskScoreAutoApprove,
                requireApprovalAtRiskLevel: updated.requireApprovalAtRiskLevel,
                maxAssetsPerRun: updated.maxAssetsPerRun,
            },
            updatedBy: actor?.email || 'admin',
        });

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

    async clearRiskRules(actor?: AdminActor) {
        const existing = await this.findStoredAdminRiskRuleRecord();
        if (!existing) {
            return {
                configured: false,
                id: null,
                maxRiskScoreAutoApprove: null,
                requireApprovalAtRiskLevel: null,
                maxAssetsPerRun: null,
                updatedAt: null,
            };
        }

        await this.prisma.adminRiskRule.delete({
            where: { id: existing.id },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'ADMIN_RISK_RULE_DEACTIVATED',
                resource: 'ADMIN_RISK_RULE',
                resourceId: existing.id,
                details: toInputJsonValue({
                    previous: {
                        maxRiskScoreAutoApprove: existing.maxRiskScoreAutoApprove,
                        requireApprovalAtRiskLevel: existing.requireApprovalAtRiskLevel,
                        maxAssetsPerRun: existing.maxAssetsPerRun,
                    },
                    updatedBy: actor?.email || 'admin',
                }),
            },
        });

        return {
            configured: false,
            id: null,
            maxRiskScoreAutoApprove: null,
            requireApprovalAtRiskLevel: null,
            maxAssetsPerRun: null,
            updatedAt: null,
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
                        { department: { contains: normalizedSearch, mode: 'insensitive' } },
                        { employeeId: { contains: normalizedSearch, mode: 'insensitive' } },
                    ],
                }
                : undefined,
            select: {
                id: true,
                email: true,
                role: true,
                employeeId: true,
                department: true,
                clearanceLevel: true,
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

        const details = toInputJsonValue({
            userId: updated.id,
            userEmail: updated.email,
            isActive: updated.isActive,
            reason: reason || null,
            updatedBy: actor?.email || 'admin',
        });

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

        const details = toInputJsonValue({
            assetId: updated.id,
            assetName: updated.name,
            isFrozen: updated.isFrozen,
            reason: updated.freezeReason || null,
            updatedBy: actor?.email || 'admin',
        });

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

    async getApprovals(status?: string, search?: string) {
        const normalizedStatus = String(status || 'PENDING').trim().toUpperCase();
        const allowedStatuses = new Set<AdminApprovalStatus>(['PENDING', 'APPROVED', 'REJECTED']);
        if (normalizedStatus !== 'ALL' && !allowedStatuses.has(normalizedStatus as AdminApprovalStatus)) {
            throw new BadRequestException('status must be one of ALL, PENDING, APPROVED, REJECTED');
        }

        const normalizedSearch = String(search || '').trim();
        const where: Prisma.AdminApprovalWhereInput = {
            ...(normalizedStatus === 'ALL' ? {} : { status: normalizedStatus as AdminApprovalStatus }),
            ...(normalizedSearch
                ? {
                    OR: [
                        { resourceType: { contains: normalizedSearch, mode: 'insensitive' } },
                        { resourceId: { contains: normalizedSearch, mode: 'insensitive' } },
                        { reason: { contains: normalizedSearch, mode: 'insensitive' } },
                        { requestedByUser: { email: { contains: normalizedSearch, mode: 'insensitive' } } },
                        { reviewedByUser: { email: { contains: normalizedSearch, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        };

        const approvals = await this.prisma.adminApproval.findMany({
            where,
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
                details: toInputJsonValue({
                    operationType: updated.operationType,
                    resourceType: updated.resourceType,
                    resourceId: updated.resourceId,
                    reviewedBy: actor?.email || 'admin',
                    reason: updated.reason || null,
                }),
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
                details: toInputJsonValue({
                    operationType: updated.operationType,
                    resourceType: updated.resourceType,
                    resourceId: updated.resourceId,
                    reviewedBy: actor?.email || 'admin',
                    reason: updated.reason || null,
                }),
            },
        });

        return {
            id: updated.id,
            status: updated.status,
            reason: updated.reason,
            reviewedAt: updated.reviewedAt?.toISOString() || null,
        };
    }

    async createOrRequireApproval(params: {
        operationType: AdminApprovalOperation;
        resourceType: string;
        resourceId?: string | null;
        riskScore: number;
        riskLevel: RiskLevel;
        reason: string;
        requestContext?: Record<string, unknown>;
        actor?: AdminActor;
    }): Promise<{ allowed: boolean; message?: string; approvalId?: string }> {
        const rule = await this.getAdminRiskRuleRecord();
        if (!rule) {
            return {
                allowed: false,
                message: 'Admin risk rules are not configured. Configure Risk Rules before submitting approval-gated operations.',
            };
        }
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
                requestContext: toInputJsonValue({
                    riskScore: params.riskScore,
                    riskLevel: params.riskLevel,
                    ...(params.requestContext || {}),
                }),
                requestedByUserId: params.actor?.id || null,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: params.actor?.id || null,
                action: 'ADMIN_APPROVAL_REQUESTED',
                resource: 'ADMIN_APPROVAL',
                resourceId: created.id,
                details: toInputJsonValue({
                    operationType: params.operationType,
                    resourceType: params.resourceType,
                    resourceId: params.resourceId || null,
                    reason: params.reason,
                    requestedBy: params.actor?.email || 'system',
                }),
            },
        });

        return {
            allowed: false,
            approvalId: created.id,
            message: `Operation requires approval. Approval request ${created.id} is pending.`,
        };
    }
}
