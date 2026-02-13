import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';
import { JobStatus, AssetStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { deriveAes256Key, getMlKem1024, ML_KEM_1024_ALGORITHM, ML_KEM_1024_WRAP_SUITE } from '../crypto/mlkem';
import { canonicalJsonBuffer, canonicalJsonSha256Hex } from '../crypto/canonical-json';

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

    const assetIds = policy.policyAssets
      .filter((pa: any) => pa.result === true || pa.result?.matches === true || pa.result?.matched === true)
      .map(pa => pa.assetId);

    if (assetIds.length === 0) {
      throw new Error('No matching assets for policy (run policy evaluation first)');
    }

    const activeAnchor = await this.prisma.anchor.findFirst({
      where: { isActive: true, algorithm: ML_KEM_1024_ALGORITHM },
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

  async performWrapping(assetId: string, anchorId: string, jobId?: string): Promise<any> {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      throw new Error('Asset not found');
    }

    // Get asset key material from Vault
    const keyMaterial = await this.prisma.assetKeyMaterial.findUnique({
      where: { assetId },
    });

    if (!keyMaterial) {
      throw new Error('No key material found for asset');
    }

    const vaultData = await this.vaultService.read(keyMaterial.vaultPath);
    const keyMaterialB64 = vaultData?.keyMaterial || vaultData?.data?.keyMaterial;
    if (!keyMaterialB64) {
      throw new Error('Invalid key material payload in Vault');
    }
    const plaintext = Buffer.from(keyMaterialB64, 'base64');

    const anchor = await this.prisma.anchor.findUnique({ where: { id: anchorId } });
    if (!anchor) {
      throw new Error('Anchor not found');
    }

    const anchorAlgUpper = String(anchor.algorithm || '').toUpperCase();
    if (!anchorAlgUpper.includes('KEM') && !anchorAlgUpper.includes('KYBER')) {
      throw new Error(`Anchor algorithm must be a KEM (got: ${anchor.algorithm})`);
    }

    // Enforce tenant/geo isolation based on metadata (whitepaper: cryptographic domains + geo-fencing)
    const assetMeta = (asset.metadata || {}) as any;
    const anchorMeta = (anchor.metadata || {}) as any;

    const assetCryptoDomain = assetMeta.cryptoDomain || assetMeta.tenantId || assetMeta.domain;
    const anchorCryptoDomain = anchorMeta.cryptoDomain || anchorMeta.tenantId || anchorMeta.domain;
    if (assetCryptoDomain && anchorCryptoDomain && String(assetCryptoDomain) !== String(anchorCryptoDomain)) {
      throw new Error('Crypto domain mismatch between asset and anchor');
    }

    const assetRegion = assetMeta.region;
    const anchorRegion = anchorMeta.region;
    const anchorAllowedRegions = Array.isArray(anchorMeta.allowedRegions) ? anchorMeta.allowedRegions : undefined;
    if (assetRegion && anchorAllowedRegions && !anchorAllowedRegions.map(String).includes(String(assetRegion))) {
      throw new Error('Geo-fence violation (asset region not allowed by anchor)');
    }
    if (assetRegion && anchorRegion && String(assetRegion) !== String(anchorRegion)) {
      throw new Error('Geo-fence violation (asset region does not match anchor region)');
    }

    const assetRegDomain = assetMeta.regulatoryDomain;
    const anchorRegDomain = anchorMeta.regulatoryDomain;
    const anchorAllowedRegDomains = Array.isArray(anchorMeta.allowedRegulatoryDomains)
      ? anchorMeta.allowedRegulatoryDomains
      : undefined;
    if (assetRegDomain && anchorAllowedRegDomains && !anchorAllowedRegDomains.map(String).includes(String(assetRegDomain))) {
      throw new Error('Regulatory-domain violation (asset domain not allowed by anchor)');
    }
    if (assetRegDomain && anchorRegDomain && String(assetRegDomain) !== String(anchorRegDomain)) {
      throw new Error('Regulatory-domain violation (asset domain does not match anchor domain)');
    }

    const anchorPub = await this.vaultService.read(anchor.vaultKeyPath);
    const anchorKeyB64 = anchorPub?.key || anchorPub?.data?.key;
    if (!anchorKeyB64) {
      throw new Error('Invalid anchor public key payload in Vault');
    }
    const anchorPublicKey = Buffer.from(anchorKeyB64, 'base64');

    const kem = await getMlKem1024();
    const { ciphertext: kemCiphertext, sharedSecret } = await kem.encapsulate(anchorPublicKey);

    const salt = crypto.randomBytes(32);
    const symmetricKey = deriveAes256Key(sharedSecret, salt);

    // Generate nonce
    const nonce = crypto.randomBytes(12); // 96-bit nonce for GCM

    const aadContext = {
      protocolVersion: 'qv.wrap.v1',
      algorithm: ML_KEM_1024_WRAP_SUITE,
      assetId: asset.id,
      assetFingerprint: asset.fingerprint,
      anchorId: anchor.id,
      anchorAlgorithm: anchor.algorithm,
      tenantId: assetMeta.tenantId || null,
      cryptoDomain: assetMeta.cryptoDomain || null,
      region: assetMeta.region || null,
      regulatoryDomain: assetMeta.regulatoryDomain || null,
    };
    const aad = canonicalJsonBuffer(aadContext);
    const aadSha256 = canonicalJsonSha256Hex(aadContext);

    // Encrypt plaintext with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, nonce);
    cipher.setAAD(aad);
    const aeadCiphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const aeadTag = cipher.getAuthTag();

    // Store wrapped result in Vault
    const tenantPrefix = assetMeta.tenantId ? `quantumvault/tenants/${assetMeta.tenantId}` : 'quantumvault';
    const wrappedPath = `${tenantPrefix}/wrapped/${assetId}`;
    await this.vaultService.write(wrappedPath, {
      kemCiphertext: Buffer.from(kemCiphertext).toString('base64'),
      salt: salt.toString('base64'),
      nonce: nonce.toString('base64'),
      aeadCiphertext: aeadCiphertext.toString('base64'),
      aeadTag: aeadTag.toString('base64'),
      aeadAadSha256: aadSha256,
      aeadAadContext: aadContext,
      wrappedAt: new Date().toISOString(),
    });

    // Create wrapping result in DB
    const result = await this.prisma.wrappingResult.create({
      data: {
        jobId,
        assetId,
        anchorId,
        kemCiphertext: Buffer.from(kemCiphertext).toString('base64'),
        nonce: nonce.toString('base64'),
        aeadCiphertext: aeadCiphertext.toString('base64'),
        aeadTag: aeadTag.toString('base64'),
        algorithm: ML_KEM_1024_WRAP_SUITE,
        vaultPath: wrappedPath,
        metadata: {
          aeadAadSha256: aadSha256,
          aeadAadContext: aadContext,
        },
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
