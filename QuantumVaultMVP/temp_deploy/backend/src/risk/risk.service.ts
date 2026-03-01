import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Asset, RiskLevel, ExposureLevel, SensitivityLevel, CriticalityLevel, AssetStatus } from '@prisma/client';

export interface RiskScoreResult {
  score: number;
  level: RiskLevel;
  factors: {
    pqcCompliance: number;
    exposure: number;
    sensitivity: number;
    criticality: number;
    assetAge: number;
    status: number;
  };
}

@Injectable()
export class RiskService {
  constructor(private prisma: PrismaService) {}

  async calculateRiskScore(assetId: string): Promise<RiskScoreResult> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        scanAssets: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    const factors = {
      pqcCompliance: this.calculatePqcComplianceFactor(asset.scanAssets[0]),
      exposure: this.calculateExposureFactor(asset.exposure),
      sensitivity: this.calculateSensitivityFactor(asset.sensitivity),
      criticality: this.calculateCriticalityFactor(asset.criticality),
      assetAge: this.calculateAssetAgeFactor(asset),
      status: this.calculateStatusFactor(asset.status),
    };

    // Weighted risk score calculation (0-100)
    const score = Math.round(
      factors.pqcCompliance * 0.40 +
      factors.exposure * 0.20 +
      factors.sensitivity * 0.15 +
      factors.criticality * 0.15 +
      factors.assetAge * 0.05 +
      factors.status * 0.05
    );

    const level = this.determineRiskLevel(score);

    return { score, level, factors };
  }

  private calculatePqcComplianceFactor(scanAsset: any): number {
    if (!scanAsset) return 80; // No scan data = assume high risk
    
    if (scanAsset.isPqcCompliant) return 10; // PQC compliant = low risk
    
    // Check for weak algorithms
    const publicKeyAlg = scanAsset.publicKeyAlgorithm?.toUpperCase() || '';
    const signatureAlg = scanAsset.signatureAlgorithm?.toUpperCase() || '';
    const keySize = scanAsset.publicKeySize || 0;

    if (publicKeyAlg.includes('RSA') && keySize < 2048) return 100; // Very weak
    if (publicKeyAlg.includes('RSA') && keySize < 3072) return 85;  // Weak
    if (publicKeyAlg.includes('RSA') && keySize < 4096) return 70;  // Moderate
    
    if (signatureAlg.includes('SHA1') || signatureAlg.includes('MD5')) return 95; // Broken
    
    // Non-PQC but acceptable classical crypto
    return 60;
  }

  private calculateExposureFactor(exposure: ExposureLevel): number {
    switch (exposure) {
      case ExposureLevel.PUBLIC: return 100;
      case ExposureLevel.INTERNAL: return 40;
      case ExposureLevel.RESTRICTED: return 20;
      case ExposureLevel.CONFIDENTIAL: return 10;
      default: return 50;
    }
  }

  private calculateSensitivityFactor(sensitivity: SensitivityLevel): number {
    switch (sensitivity) {
      case SensitivityLevel.CRITICAL: return 100;
      case SensitivityLevel.HIGH: return 75;
      case SensitivityLevel.MEDIUM: return 50;
      case SensitivityLevel.LOW: return 25;
      default: return 50;
    }
  }

  private calculateCriticalityFactor(criticality: CriticalityLevel): number {
    switch (criticality) {
      case CriticalityLevel.CRITICAL: return 100;
      case CriticalityLevel.HIGH: return 75;
      case CriticalityLevel.MEDIUM: return 50;
      case CriticalityLevel.LOW: return 25;
      default: return 50;
    }
  }

  private calculateAssetAgeFactor(asset: Asset): number {
    const daysSinceCreation = Math.floor(
      (Date.now() - asset.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Older assets without remediation are riskier
    if (daysSinceCreation > 365) return 80;
    if (daysSinceCreation > 180) return 60;
    if (daysSinceCreation > 90) return 40;
    if (daysSinceCreation > 30) return 20;
    return 10;
  }

  private calculateStatusFactor(status: AssetStatus): number {
    switch (status) {
      case AssetStatus.DISCOVERED: return 70;
      case AssetStatus.ASSESSED: return 50;
      case AssetStatus.WRAPPED_PQC: return 10;
      case AssetStatus.ATTESTED: return 5;
      case AssetStatus.ROTATED: return 5;
      case AssetStatus.DECOMMISSIONED: return 0;
      default: return 50;
    }
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return RiskLevel.CRITICAL;
    if (score >= 60) return RiskLevel.HIGH;
    if (score >= 40) return RiskLevel.MEDIUM;
    if (score >= 20) return RiskLevel.LOW;
    return RiskLevel.LOW;
  }
}
