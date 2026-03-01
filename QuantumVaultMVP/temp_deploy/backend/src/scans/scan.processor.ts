import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { TlsScannerService } from '../tls-scanner/tls-scanner.service';
import { RiskService } from '../risk/risk.service';
import { ScanStatus } from '@prisma/client';

@Processor('scans')
export class ScanProcessor extends WorkerHost {
  private readonly logger = new Logger(ScanProcessor.name);

  constructor(
    private prisma: PrismaService,
    private tlsScanner: TlsScannerService,
    private riskService: RiskService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { scanId, targetId, host, port } = job.data;

    this.logger.log(`Processing scan ${scanId} for ${host}:${port}`);

    try {
      // Update scan status
      await this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.IN_PROGRESS,
          startedAt: new Date(),
        },
      });

      // Perform TLS scan
      const scanResult = await this.tlsScanner.scanTarget(host, port);

      // Create or update asset
      const fingerprint = `${host}:${port}:${scanResult.commonName}`;
      let asset = await this.prisma.asset.findUnique({
        where: { fingerprint },
      });

      if (!asset) {
        asset = await this.prisma.asset.create({
          data: {
            name: scanResult.commonName || `${host}:${port}`,
            type: 'TLS_CERTIFICATE',
            fingerprint,
            status: 'DISCOVERED',
          },
        });
      }

      // Create scan asset record (evidence)
      await this.prisma.scanAsset.create({
        data: {
          scanId,
          assetId: asset.id,
          discoveryDetails: scanResult.discoveryDetails,
          certificateChain: scanResult.certificateChain,
          tlsVersion: scanResult.tlsVersion,
          cipherSuite: scanResult.cipherSuite,
          signatureAlgorithm: scanResult.signatureAlgorithm,
          publicKeyAlgorithm: scanResult.publicKeyAlgorithm,
          publicKeySize: scanResult.publicKeySize,
          validFrom: scanResult.validFrom,
          validUntil: scanResult.validUntil,
          subjectAltNames: scanResult.subjectAltNames,
          commonName: scanResult.commonName,
          isPqcCompliant: scanResult.isPqcCompliant,
        },
      });

      // Calculate risk score for asset
      const riskScore = await this.riskService.calculateRiskScore(asset.id);
      await this.prisma.asset.update({
        where: { id: asset.id },
        data: {
          riskScore: riskScore.score,
          riskLevel: riskScore.level,
          lastScannedAt: new Date(),
        },
      });

      // Complete scan
      await this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Scan ${scanId} completed successfully`);
      return { success: true, scanId, assetId: asset.id };

    } catch (error) {
      this.logger.error(`Scan ${scanId} failed: ${error.message}`);
      
      await this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: ScanStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }
}
