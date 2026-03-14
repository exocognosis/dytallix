import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditLedgerService } from './audit-ledger.service';

@Injectable()
export class AssetRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLedgerService: AuditLedgerService,
  ) {}

  async listAssets(filters?: {
    classificationLevel?: string;
    lifecycleState?: string;
    legalHold?: boolean;
    search?: string;
  }) {
    const where: Prisma.PipelineAssetWhereInput = {};

    if (filters?.classificationLevel) {
      where.classificationLevel = filters.classificationLevel as any;
    }
    if (filters?.lifecycleState) {
      where.lifecycleState = filters.lifecycleState as any;
    }
    if (typeof filters?.legalHold === 'boolean') {
      where.legalHold = filters.legalHold;
    }
    if (filters?.search) {
      where.OR = [
        { relativePath: { contains: filters.search, mode: 'insensitive' } },
        { objectId: { contains: filters.search, mode: 'insensitive' } },
        { plaintextSha256: { contains: filters.search, mode: 'insensitive' } },
        { ownerDepartment: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.pipelineAsset.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        accessSessions: {
          where: { status: 'ACTIVE' },
          orderBy: { expiresAt: 'asc' },
          take: 5,
          select: {
            id: true,
            status: true,
            expiresAt: true,
            lastAccessAt: true,
            allowedAction: true,
            requesterUser: {
              select: {
                id: true,
                email: true,
                department: true,
              },
            },
          },
        },
        _count: {
          select: {
            accessRequests: true,
            accessSessions: true,
            auditLedgerEvents: true,
          },
        },
      },
    });
  }

  async getAsset(id: string) {
    const asset = await this.prisma.pipelineAsset.findUnique({
      where: { id },
      include: {
        accessRequests: {
          orderBy: { requestedAt: 'desc' },
          take: 25,
          include: {
            requesterUser: {
              select: {
                id: true,
                email: true,
                department: true,
                clearanceLevel: true,
                role: true,
              },
            },
            approval: true,
            accessSession: {
              select: {
                id: true,
                status: true,
                expiresAt: true,
                lastAccessAt: true,
                allowedAction: true,
              },
            },
          },
        },
        accessSessions: {
          orderBy: { createdAt: 'desc' as any },
          take: 25,
          include: {
            requesterUser: {
              select: {
                id: true,
                email: true,
                department: true,
                role: true,
              },
            },
          },
        },
        auditLedgerEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Pipeline asset not found in registry');
    }

    return asset;
  }

  async setLegalHold(id: string, enabled: boolean, reason: string | undefined, actor: User) {
    const asset = await this.prisma.pipelineAsset.findUnique({
      where: { id },
    });
    if (!asset) {
      throw new NotFoundException('Pipeline asset not found');
    }

    const updated = await this.prisma.pipelineAsset.update({
      where: { id },
      data: {
        legalHold: enabled,
        legalHoldReason: enabled ? reason || 'Legal hold enabled' : null,
        lifecycleState: enabled ? 'REVOKED' : 'AVAILABLE',
      },
    });

    await this.auditLedgerService.recordEvent({
      eventType: enabled ? 'REVOCATION' : 'APPROVAL',
      action: enabled ? 'LEGAL_HOLD_ENABLED' : 'LEGAL_HOLD_RELEASED',
      result: enabled ? 'hold_active' : 'hold_released',
      pipelineAssetId: updated.id,
      userId: actor.id,
      role: actor.role,
      assetHash: updated.plaintextSha256 || updated.objectId || updated.id,
      payload: {
        enabled,
        reason: reason || null,
        classificationLevel: updated.classificationLevel,
      },
      location: 'administrator_console',
    });

    return updated;
  }
}
