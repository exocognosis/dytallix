import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';
import { RiskService } from '../risk/risk.service';
import { Asset, AssetType, AssetStatus, ExposureLevel, SensitivityLevel, CriticalityLevel, RiskLevel } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private vaultService: VaultService,
    private riskService: RiskService,
  ) {}

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

  async updateAssetMetadata(id: string, data: {
    name?: string;
    exposure?: ExposureLevel;
    sensitivity?: SensitivityLevel;
    criticality?: CriticalityLevel;
    metadata?: any;
  }) {
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
}
