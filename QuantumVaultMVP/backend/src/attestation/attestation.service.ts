import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { JobStatus, AttestationStatus, AssetStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AttestationService {
  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
    @InjectQueue('attestation') private attestationQueue: Queue,
  ) {}

  async createAttestationJob(assetIds: string[]) {
    const job = await this.prisma.attestationJob.create({
      data: {
        totalAssets: assetIds.length,
        status: JobStatus.PENDING,
      },
    });

    for (const assetId of assetIds) {
      await this.attestationQueue.add('attest-asset', {
        jobId: job.id,
        assetId,
      });
    }

    return job;
  }

  async getJobStatus(jobId: string) {
    return this.prisma.attestationJob.findUnique({
      where: { id: jobId },
      include: {
        attestations: true,
      },
    });
  }

  async getAssetAttestations(assetId: string) {
    return this.prisma.attestation.findMany({
      where: { assetId },
      include: {
        anchor: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async performAttestation(assetId: string, jobId: string): Promise<any> {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');

    // Get the most recent wrapping result
    const wrappingResult = await this.prisma.wrappingResult.findFirst({
      where: { assetId },
      orderBy: { wrappedAt: 'desc' },
    });

    if (!wrappingResult) {
      throw new Error('Asset must be wrapped before attestation');
    }

    // Create attestation hash
    const attestationData = {
      assetFingerprint: asset.fingerprint,
      anchorId: wrappingResult.anchorId,
      wrapperAlgorithm: wrappingResult.algorithm,
      timestamp: Date.now(),
    };

    const attestationHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(attestationData))
      .digest('hex');

    // Create attestation record
    const attestation = await this.prisma.attestation.create({
      data: {
        jobId,
        assetId,
        anchorId: wrappingResult.anchorId,
        attestationHash: `0x${attestationHash}`,
        status: AttestationStatus.PENDING,
      },
    });

    try {
      // Submit to blockchain
      const result = await this.blockchainService.recordAttestation(
        `0x${attestationHash}`,
        asset.fingerprint,
        wrappingResult.anchorId,
      );

      // Update attestation with transaction details
      await this.prisma.attestation.update({
        where: { id: attestation.id },
        data: {
          txHash: result.txHash,
          blockNumber: BigInt(result.blockNumber),
          chainId: result.chainId,
          status: AttestationStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      });

      // Update asset status
      await this.prisma.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.ATTESTED },
      });

      return attestation;
    } catch (error) {
      // Mark as failed
      await this.prisma.attestation.update({
        where: { id: attestation.id },
        data: {
          status: AttestationStatus.FAILED,
          metadata: { error: error.message },
        },
      });
      throw error;
    }
  }
}
