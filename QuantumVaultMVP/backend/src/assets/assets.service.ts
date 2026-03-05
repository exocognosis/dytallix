import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';
import { RiskService } from '../risk/risk.service';
import { WrappingService } from '../wrapping/wrapping.service';
import { Asset, AssetType, AssetStatus, ExposureLevel, SensitivityLevel, CriticalityLevel, RiskLevel } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private vaultService: VaultService,
    private riskService: RiskService,
    private wrappingService: WrappingService,
  ) { }

  async getAssets(filters?: {
    status?: AssetStatus;
    riskLevel?: RiskLevel;
    type?: AssetType;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters?.type) where.type = filters.type;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { fingerprint: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.asset.findMany({
      where,
      include: {
        _count: {
          select: {
            scanAssets: true,
            wrappingResults: true,
            attestations: true,
          },
        },
      },
      orderBy: [
        { riskScore: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async getAsset(id: string) {
    return this.prisma.asset.findUnique({
      where: { id },
      include: {
        scanAssets: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        assetKeyMaterial: true,
        wrappingResults: {
          include: { anchor: true },
          orderBy: { wrappedAt: 'desc' },
          take: 5,
        },
        attestations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  private async assertAssetNotFrozen(assetId: string, operation: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        isFrozen: true,
        freezeReason: true,
      },
    });

    if (!asset) {
      throw new BadRequestException('Asset not found');
    }

    if (asset.isFrozen) {
      throw new BadRequestException(
        `Asset is frozen. Cannot ${operation}.${asset.freezeReason ? ` Reason: ${asset.freezeReason}` : ''}`,
      );
    }
  }

  async updateAssetMetadata(id: string, data: {
    name?: string;
    exposure?: ExposureLevel;
    sensitivity?: SensitivityLevel;
    criticality?: CriticalityLevel;
    metadata?: any;
  }) {
    await this.assertAssetNotFrozen(id, 'update metadata');

    const asset = await this.prisma.asset.update({
      where: { id },
      data,
    });

    // Recalculate risk score
    const riskScore = await this.riskService.calculateRiskScore(id);
    return this.prisma.asset.update({
      where: { id },
      data: {
        riskScore: riskScore.score,
        riskLevel: riskScore.level,
      },
    });
  }

  async ingestKeyMaterial(
    assetId: string,
    keyMaterial: Buffer,
    keyType: string,
  ): Promise<void> {
    await this.assertAssetNotFrozen(assetId, 'ingest key material');

    // Validate size (max 10MB for MVP)
    const maxSize = 10 * 1024 * 1024;
    if (keyMaterial.length > maxSize) {
      throw new Error(`Key material too large: ${keyMaterial.length} bytes (max ${maxSize})`);
    }

    // Store in Vault
    const vaultPath = `quantumvault/assets/${assetId}/key-material`;
    await this.vaultService.write(vaultPath, {
      keyMaterial: keyMaterial.toString('base64'),
      keyType,
      uploadedAt: new Date().toISOString(),
    });

    // Store reference in DB
    await this.prisma.assetKeyMaterial.upsert({
      where: { assetId },
      create: {
        assetId,
        vaultPath,
        keyType,
        sizeBytes: keyMaterial.length,
      },
      update: {
        vaultPath,
        keyType,
        sizeBytes: keyMaterial.length,
        uploadedAt: new Date(),
        vaultVersion: { increment: 1 },
      },
    });

    // Update asset status
    await this.prisma.asset.update({
      where: { id: assetId },
      data: { status: AssetStatus.ASSESSED },
    });
  }

  async bulkAction(assetIds: string[], action: string, params?: any) {
    // This will be expanded based on action type
    return {
      message: `Bulk action ${action} queued for ${assetIds.length} assets`,
      assetIds,
      action,
    };
  }

  async intakeAsset(data: {
    name: string;
    type: AssetType;
    exposure?: ExposureLevel;
    sensitivity?: SensitivityLevel;
    criticality?: CriticalityLevel;
    metadata?: any;
    keyMaterial?: string;
    keyType?: string;
    targetAlgorithm?: string;
  }) {
    const fingerprint = crypto.createHash('sha256')
      .update(`${data.name}-${Date.now()}-${Math.random()}`)
      .digest('hex');

    const asset = await this.prisma.asset.create({
      data: {
        name: data.name,
        type: data.type || AssetType.GENERIC_SECRET,
        fingerprint,
        exposure: data.exposure || ExposureLevel.INTERNAL,
        sensitivity: data.sensitivity || SensitivityLevel.MEDIUM,
        criticality: data.criticality || CriticalityLevel.MEDIUM,
        metadata: data.metadata || {},
        status: AssetStatus.DISCOVERED,
      },
    });

    // Recalculate risk score
    const riskScore = await this.riskService.calculateRiskScore(asset.id);
    await this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        riskScore: riskScore.score,
        riskLevel: riskScore.level,
      },
    });

    if (data.keyMaterial && data.keyType) {
      const buffer = Buffer.from(data.keyMaterial, 'base64');
      await this.ingestKeyMaterial(asset.id, buffer, data.keyType);
    }

    if (data.targetAlgorithm) {
      // Find an active anchor (for MVP we'll pick the first active one, effectively hardcoding logic to assume anchor selection is handled per target algo mapping in a real prod system)
      const activeAnchor = await this.prisma.anchor.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (activeAnchor) {
        await this.wrappingService.wrapAsset(asset.id, activeAnchor.id);
      }
    }

    return this.getAsset(asset.id);
  }
}
