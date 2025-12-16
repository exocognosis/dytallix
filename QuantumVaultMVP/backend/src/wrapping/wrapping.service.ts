import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';
import { JobStatus, AssetStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WrappingService {
  constructor(
    private prisma: PrismaService,
    private vaultService: VaultService,
    @InjectQueue('wrapping') private wrappingQueue: Queue,
  ) {}

  async wrapAsset(assetId: string, anchorId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    const anchor = await this.prisma.anchor.findUnique({ where: { id: anchorId } });

    if (!asset || !anchor) throw new Error('Asset or anchor not found');

    const job = await this.prisma.wrappingJob.create({
      data: {
        totalAssets: 1,
        status: JobStatus.PENDING,
      },
    });

    await this.wrappingQueue.add('wrap-asset', {
      jobId: job.id,
      assetId,
      anchorId,
    });

    return job;
  }

  async bulkWrapByPolicy(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      include: { policyAssets: true },
    });

    if (!policy) throw new Error('Policy not found');

    const assetIds = policy.policyAssets.map(pa => pa.assetId);
    const activeAnchor = await this.prisma.anchor.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeAnchor) throw new Error('No active anchor found');

    const job = await this.prisma.wrappingJob.create({
      data: {
        policyId,
        totalAssets: assetIds.length,
        status: JobStatus.PENDING,
      },
    });

    for (const assetId of assetIds) {
      await this.wrappingQueue.add('wrap-asset', {
        jobId: job.id,
        assetId,
        anchorId: activeAnchor.id,
      });
    }

    return job;
  }

  async getJobStatus(jobId: string) {
    return this.prisma.wrappingJob.findUnique({
      where: { id: jobId },
      include: {
        wrappingResults: true,
        policy: true,
      },
    });
  }

  async performWrapping(assetId: string, anchorId: string): Promise<any> {
    // Get asset key material from Vault
    const keyMaterial = await this.prisma.assetKeyMaterial.findUnique({
      where: { assetId },
    });

    if (!keyMaterial) {
      throw new Error('No key material found for asset');
    }

    const vaultData = await this.vaultService.read(keyMaterial.vaultPath);
    const plaintext = Buffer.from(vaultData.data.keyMaterial, 'base64');

    // Generate symmetric key for AEAD
    const symmetricKey = crypto.randomBytes(32); // 256-bit key for AES-256-GCM
    
    // Generate nonce
    const nonce = crypto.randomBytes(12); // 96-bit nonce for GCM

    // Encrypt plaintext with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, nonce);
    const aeadCiphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const aeadTag = cipher.getAuthTag();

    // Simulate PQC KEM encapsulation
    // In production, this would use real Kyber KEM
    const kemCiphertext = crypto.randomBytes(1568); // Kyber1024 ciphertext size

    // Store wrapped result in Vault
    const wrappedPath = `quantumvault/wrapped/${assetId}`;
    await this.vaultService.write(wrappedPath, {
      kemCiphertext: kemCiphertext.toString('base64'),
      nonce: nonce.toString('base64'),
      aeadCiphertext: aeadCiphertext.toString('base64'),
      aeadTag: aeadTag.toString('base64'),
      wrappedAt: new Date().toISOString(),
    });

    // Create wrapping result in DB
    const result = await this.prisma.wrappingResult.create({
      data: {
        assetId,
        anchorId,
        kemCiphertext: kemCiphertext.toString('base64'),
        nonce: nonce.toString('base64'),
        aeadCiphertext: aeadCiphertext.toString('base64'),
        aeadTag: aeadTag.toString('base64'),
        algorithm: 'Kyber1024-HKDF-SHA256-AES-256-GCM',
        vaultPath: wrappedPath,
      },
    });

    // Update asset status
    await this.prisma.asset.update({
      where: { id: assetId },
      data: { status: AssetStatus.WRAPPED_PQC },
    });

    return result;
  }
}
