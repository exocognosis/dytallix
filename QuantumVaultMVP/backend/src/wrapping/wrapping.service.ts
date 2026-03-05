import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';
import {
  AdminApprovalOperation,
  AssetStatus,
  JobStatus,
  Prisma,
  RiskLevel,
} from '@prisma/client';
import * as crypto from 'crypto';
import { deriveAes256Key, getMlKem1024, ML_KEM_1024_ALGORITHM, ML_KEM_1024_WRAP_SUITE } from '../crypto/mlkem';
import { canonicalJsonBuffer, canonicalJsonSha256Hex } from '../crypto/canonical-json';

const RISK_LEVEL_RANK: Record<RiskLevel, number> = {
  UNKNOWN: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

@Injectable()
export class WrappingService {
  constructor(
    private prisma: PrismaService,
    private vaultService: VaultService,
    @InjectQueue('wrapping') private wrappingQueue: Queue,
  ) {}

  private async assertWrappingNotPaused() {
    const control = await this.prisma.systemControl.findUnique({
      where: { controlKey: 'pauseWrappingJobs' },
      select: { isEnabled: true },
    });

    if (control?.isEnabled) {
      throw new Error('Wrapping jobs are currently paused by administrator control.');
    }
  }

  private deriveRiskLevelFromScore(score: number): RiskLevel {
    if (score >= 85) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'UNKNOWN';
  }

  private shouldRequireApproval(
    rule: { maxRiskScoreAutoApprove: number; requireApprovalAtRiskLevel: RiskLevel },
    riskScore: number,
    riskLevel: RiskLevel,
  ) {
    if (riskScore > rule.maxRiskScoreAutoApprove) {
      return true;
    }
    return (RISK_LEVEL_RANK[riskLevel] ?? 0) >= (RISK_LEVEL_RANK[rule.requireApprovalAtRiskLevel] ?? 0);
  }

  private async ensureAdminRiskRuleRecord() {
    return this.prisma.adminRiskRule.upsert({
      where: { ruleKey: 'default' },
      create: {
        ruleKey: 'default',
        maxRiskScoreAutoApprove: 70,
        requireApprovalAtRiskLevel: 'HIGH',
        maxAssetsPerRun: 1000,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    });
  }

  private async createOrRequireApproval(params: {
    operationType: AdminApprovalOperation;
    resourceType: string;
    resourceId?: string | null;
    riskScore: number;
    riskLevel: RiskLevel;
    reason: string;
    requestedByUserId?: string | null;
    requestContext?: Record<string, unknown>;
  }): Promise<{ allowed: boolean; message?: string; approvalId?: string }> {
    const rule = await this.ensureAdminRiskRuleRecord();
    if (!this.shouldRequireApproval(rule, params.riskScore, params.riskLevel)) {
      return { allowed: true };
    }

    const baseWhere: Prisma.AdminApprovalWhereInput = {
      operationType: params.operationType,
      resourceType: params.resourceType,
      resourceId: params.resourceId || null,
    };

    const approved = await this.prisma.adminApproval.findFirst({
      where: { ...baseWhere, status: 'APPROVED' },
      orderBy: { reviewedAt: 'desc' },
    });
    if (approved) {
      return { allowed: true, approvalId: approved.id };
    }

    const pending = await this.prisma.adminApproval.findFirst({
      where: { ...baseWhere, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) {
      return {
        allowed: false,
        approvalId: pending.id,
        message: `Wrapping requires approval and is already pending (approval: ${pending.id}).`,
      };
    }

    const created = await this.prisma.adminApproval.create({
      data: {
        operationType: params.operationType,
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        status: 'PENDING',
        reason: params.reason,
        requestContext: JSON.parse(
          JSON.stringify({
            riskScore: params.riskScore,
            riskLevel: params.riskLevel,
            ...(params.requestContext || {}),
          }),
        ) as Prisma.InputJsonValue,
        requestedByUserId: params.requestedByUserId || null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: params.requestedByUserId || null,
        action: 'ADMIN_APPROVAL_REQUESTED',
        resource: 'ADMIN_APPROVAL',
        resourceId: created.id,
        details: JSON.parse(
          JSON.stringify({
            operationType: params.operationType,
            resourceType: params.resourceType,
            resourceId: params.resourceId || null,
            reason: params.reason,
          }),
        ) as Prisma.InputJsonValue,
      },
    });

    return {
      allowed: false,
      approvalId: created.id,
      message: `Wrapping requires approval. Approval request ${created.id} is pending.`,
    };
  }

  private async assertAssetsNotFrozen(assetIds: string[], operation: string) {
    const frozenAssets = await this.prisma.asset.findMany({
      where: {
        id: { in: assetIds },
        isFrozen: true,
      },
      select: {
        id: true,
        name: true,
        freezeReason: true,
      },
    });

    if (frozenAssets.length > 0) {
      const sample = frozenAssets[0];
      throw new Error(
        `Cannot ${operation}. Asset ${sample.name || sample.id} is frozen.${sample.freezeReason ? ` Reason: ${sample.freezeReason}` : ''}`,
      );
    }
  }

  async wrapAsset(assetId: string, anchorId: string, actor?: { id?: string }) {
    await this.assertWrappingNotPaused();

    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    const anchor = await this.prisma.anchor.findUnique({ where: { id: anchorId } });

    if (!asset || !anchor) throw new Error('Asset or anchor not found');

    await this.assertAssetsNotFrozen([assetId], 'wrap asset');

    const approvalGate = await this.createOrRequireApproval({
      operationType: 'WRAPPING_JOB',
      resourceType: 'ASSET',
      resourceId: asset.id,
      riskScore: asset.riskScore || 0,
      riskLevel: asset.riskLevel || this.deriveRiskLevelFromScore(asset.riskScore || 0),
      reason: `Wrapping requested for asset ${asset.id} at riskScore=${asset.riskScore}, riskLevel=${asset.riskLevel}.`,
      requestedByUserId: actor?.id || null,
    });
    if (!approvalGate.allowed) {
      throw new Error(approvalGate.message || 'Wrapping requires admin approval.');
    }

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

  async bulkWrapByPolicy(policyId: string, actor?: { id?: string }) {
    await this.assertWrappingNotPaused();

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

    await this.assertAssetsNotFrozen(assetIds, 'bulk wrap by policy');

    const assets = await this.prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, riskScore: true, riskLevel: true },
    });
    const maxRiskScore = assets.reduce((max, asset) => Math.max(max, asset.riskScore || 0), 0);
    const highestRiskLevel = assets.reduce<RiskLevel>(
      (current, asset) => ((RISK_LEVEL_RANK[asset.riskLevel] ?? 0) > (RISK_LEVEL_RANK[current] ?? 0) ? asset.riskLevel : current),
      'UNKNOWN',
    );

    const approvalGate = await this.createOrRequireApproval({
      operationType: 'WRAPPING_JOB',
      resourceType: 'POLICY',
      resourceId: policy.id,
      riskScore: maxRiskScore,
      riskLevel: highestRiskLevel,
      reason: `Bulk wrapping requested for policy ${policy.id} with ${assetIds.length} assets at maxRiskScore=${maxRiskScore}, highestRiskLevel=${highestRiskLevel}.`,
      requestedByUserId: actor?.id || null,
      requestContext: {
        policyId: policy.id,
        assetCount: assetIds.length,
      },
    });
    if (!approvalGate.allowed) {
      throw new Error(approvalGate.message || 'Bulk wrapping requires admin approval.');
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
    if (asset.isFrozen) {
      throw new Error(`Asset is frozen and cannot be wrapped.${asset.freezeReason ? ` Reason: ${asset.freezeReason}` : ''}`);
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
    const anchorPublicKey = Uint8Array.from(Buffer.from(anchorKeyB64, 'base64'));

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
