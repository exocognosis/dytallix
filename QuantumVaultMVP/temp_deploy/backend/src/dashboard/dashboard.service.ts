import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RiskLevel, AssetStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKPIs() {
    const [
      totalAssets,
      discoveredAssets,
      wrappedAssets,
      attestedAssets,
      criticalRiskAssets,
      highRiskAssets,
      mediumRiskAssets,
      lowRiskAssets,
      avgRisk,
      recentScans,
    ] = await Promise.all([
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { status: AssetStatus.DISCOVERED } }),
      this.prisma.asset.count({ where: { status: AssetStatus.WRAPPED_PQC } }),
      this.prisma.asset.count({ where: { status: AssetStatus.ATTESTED } }),
      this.prisma.asset.count({ where: { riskLevel: RiskLevel.CRITICAL } }),
      this.prisma.asset.count({ where: { riskLevel: RiskLevel.HIGH } }),
      this.prisma.asset.count({ where: { riskLevel: RiskLevel.MEDIUM } }),
      this.prisma.asset.count({ where: { riskLevel: RiskLevel.LOW } }),
      this.prisma.asset.aggregate({ _avg: { riskScore: true } }),
      this.prisma.scan.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    const pqcCompliant = await this.prisma.scanAsset.count({
      where: { isPqcCompliant: true },
    });
    const totalScanned = await this.prisma.scanAsset.count();
    const pqcCompliantPercent = totalScanned > 0 ? (pqcCompliant / totalScanned) * 100 : 0;

    return {
      totalAssets,
      discoveredAssets,
      wrappedAssets,
      attestedAssets,
      criticalRiskAssets,
      highRiskAssets,
      mediumRiskAssets,
      lowRiskAssets,
      avgRiskScore: avgRisk._avg.riskScore || 0,
      pqcCompliantPercent,
      recentScans,
      migrationProgress: {
        total: totalAssets,
        discovered: discoveredAssets,
        wrapped: wrappedAssets,
        attested: attestedAssets,
        percentComplete: totalAssets > 0 ? ((wrappedAssets + attestedAssets) / totalAssets) * 100 : 0,
      },
    };
  }

  async getTrends(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const snapshots = await this.prisma.orgSnapshot.findMany({
      where: {
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    return snapshots.map(snap => ({
      timestamp: snap.timestamp,
      totalAssets: snap.totalAssets,
      wrappedAssets: snap.wrappedAssets,
      attestedAssets: snap.attestedAssets,
      avgRiskScore: snap.avgRiskScore,
      pqcCompliantPercent: snap.pqcCompliantPercent,
    }));
  }

  async getMigrationTimeline() {
    const assets = await this.prisma.asset.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastScannedAt: true,
        status: true,
        riskLevel: true,
        wrappingResults: {
          select: { wrappedAt: true },
          orderBy: { wrappedAt: 'desc' },
          take: 1,
        },
        attestations: {
          select: { submittedAt: true },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map(asset => ({
      assetId: asset.id,
      assetName: asset.name,
      discoveredAt: asset.createdAt,
      scannedAt: asset.lastScannedAt,
      wrappedAt: asset.wrappingResults[0]?.wrappedAt || null,
      attestedAt: asset.attestations[0]?.submittedAt || null,
      status: asset.status,
      riskLevel: asset.riskLevel,
    }));
  }

  async captureSnapshot() {
    const kpis = await this.getKPIs();

    return this.prisma.orgSnapshot.create({
      data: {
        totalAssets: kpis.totalAssets,
        discoveredAssets: kpis.discoveredAssets,
        wrappedAssets: kpis.wrappedAssets,
        attestedAssets: kpis.attestedAssets,
        criticalRiskAssets: kpis.criticalRiskAssets,
        highRiskAssets: kpis.highRiskAssets,
        mediumRiskAssets: kpis.mediumRiskAssets,
        lowRiskAssets: kpis.lowRiskAssets,
        pqcCompliantPercent: kpis.pqcCompliantPercent,
        avgRiskScore: kpis.avgRiskScore,
      },
    });
  }
}
