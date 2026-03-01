import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { JobStatus, AttestationStatus, AssetStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { getMlDsa65, MlDsaKeyPair, MlDsa65 } from '../crypto/mldsa';
import { canonicalJsonSha256Hex, canonicalJsonStringify } from '../crypto/canonical-json';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { VaultService } from '../vault/vault.service';

const ATTESTATION_PROTOCOL_VERSION = 'qv.attestation.v1';
const ATTESTATION_KEY_VAULT_PATH = 'quantumvault/system/attestation-key';

type AttestationKeyRecord = {
  publicKey: string;
  secretKey: string;
  createdAt?: string;
  rotatedAt?: string;
  rotatedFromKeyId?: string;
  rotationCeremonyId?: string;
  rotationReason?: string;
  changeTicket?: string;
  rotatedBy?: string;
};

@Injectable()
export class AttestationService implements OnModuleInit {
  private readonly logger = new Logger(AttestationService.name);
  private dsa: MlDsa65;
  private keys: MlDsaKeyPair;

  private getSignerIdentity() {
    const signerKeyFingerprint = crypto
      .createHash('sha256')
      .update(Buffer.from(this.keys.publicKey))
      .digest('hex');

    return {
      signerKeyFingerprint,
      signerKeyId: `mldsa65:${signerKeyFingerprint.slice(0, 16)}`,
      signerKeyHashHex: `0x${signerKeyFingerprint}`,
    };
  }

  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
    private vaultService: VaultService,
    private configService: ConfigService,
    @InjectQueue('attestation') private attestationQueue: Queue,
  ) { }

  async onModuleInit() {
    this.dsa = await getMlDsa65();
    await this.loadOrBootstrapSignerKey();
  }

  private boolEnv(name: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string>(name);
    if (value === undefined) {
      return defaultValue;
    }
    return value.trim().toLowerCase() === 'true';
  }

  private normalizeHex(value?: string): string {
    if (!value) return '';
    const normalized = value.toLowerCase();
    return normalized.startsWith('0x') ? normalized : `0x${normalized}`;
  }

  private isVaultNotFoundError(error: unknown): boolean {
    const message =
      (error as { message?: string })?.message ||
      (error as { response?: { body?: { errors?: string[] } } })?.response?.body?.errors?.join(' ') ||
      '';
    const lower = String(message).toLowerCase();
    return lower.includes('404') || lower.includes('not found') || lower.includes('no value found');
  }

  private async loadOrBootstrapSignerKey(): Promise<void> {
    try {
      const stored = (await this.vaultService.read(ATTESTATION_KEY_VAULT_PATH)) as AttestationKeyRecord;
      if (!stored?.publicKey || !stored?.secretKey) {
        throw new Error('Attestation key payload is incomplete');
      }
      this.keys = {
        publicKey: Buffer.from(stored.publicKey, 'base64'),
        secretKey: Buffer.from(stored.secretKey, 'base64'),
      };
      const signer = this.getSignerIdentity();
      this.enforceSignerKeyPinning(signer);
      this.logger.log(`✅ Loaded persistent attestation signer key (${signer.signerKeyId})`);
      return;
    } catch (error) {
      if (!this.isVaultNotFoundError(error)) {
        throw error;
      }

      const bootstrapDefault = this.configService.get<string>('NODE_ENV') !== 'production';
      const allowBootstrap = this.boolEnv('ATTESTATION_KEY_BOOTSTRAP_ALLOWED', bootstrapDefault);
      if (!allowBootstrap) {
        throw new Error(
          'Attestation signer key missing in Vault and bootstrapping is disabled. Run an explicit rotation/bootstrap ceremony.',
        );
      }

      this.logger.warn('⚠️  Attestation signer key missing; bootstrapping a new key pair.');
      this.keys = await this.dsa.generateKeyPair();
      const signer = this.getSignerIdentity();
      this.enforceSignerKeyPinning(signer);

      await this.vaultService.write(ATTESTATION_KEY_VAULT_PATH, {
        publicKey: Buffer.from(this.keys.publicKey).toString('base64'),
        secretKey: Buffer.from(this.keys.secretKey).toString('base64'),
        createdAt: new Date().toISOString(),
        rotationReason: 'bootstrap',
      } satisfies AttestationKeyRecord);

      this.logger.log(`✅ Bootstrapped attestation signer key (${signer.signerKeyId})`);
    }
  }

  private ensureReady() {
    if (!this.dsa) {
      throw new Error('ML-DSA provider not initialized');
    }
    if (!this.keys) {
      throw new Error('Attestation signer keys not initialized');
    }
  }

  private enforceSignerKeyPinning(identity: {
    signerKeyId: string;
    signerKeyHashHex: string;
    signerKeyFingerprint: string;
  }): void {
    const pinnedKeyId = this.configService.get<string>('ATTESTATION_SIGNER_KEY_ID_PIN');
    if (pinnedKeyId && pinnedKeyId.trim() !== identity.signerKeyId) {
      throw new Error(
        `Attestation signer key-id pin mismatch. Expected ${pinnedKeyId.trim()} got ${identity.signerKeyId}`,
      );
    }

    const pinnedKeyHash = this.normalizeHex(this.configService.get<string>('ATTESTATION_SIGNER_KEY_HASH_PIN'));
    if (pinnedKeyHash && pinnedKeyHash !== this.normalizeHex(identity.signerKeyHashHex)) {
      throw new Error(
        `Attestation signer key-hash pin mismatch. Expected ${pinnedKeyHash} got ${this.normalizeHex(
          identity.signerKeyHashHex,
        )}`,
      );
    }
  }

  async getSignerGovernanceStatus() {
    this.ensureReady();
    const record = (await this.vaultService.read(ATTESTATION_KEY_VAULT_PATH)) as AttestationKeyRecord;
    const identity = this.getSignerIdentity();
    return {
      ...identity,
      protocolVersion: ATTESTATION_PROTOCOL_VERSION,
      createdAt: record?.createdAt || null,
      rotatedAt: record?.rotatedAt || null,
      rotatedFromKeyId: record?.rotatedFromKeyId || null,
      rotationCeremonyId: record?.rotationCeremonyId || null,
      pinnedKeyId: this.configService.get<string>('ATTESTATION_SIGNER_KEY_ID_PIN') || null,
      pinnedKeyHash: this.normalizeHex(this.configService.get<string>('ATTESTATION_SIGNER_KEY_HASH_PIN')) || null,
    };
  }

  async runSignerRecoveryTest() {
    this.ensureReady();
    const stored = (await this.vaultService.read(ATTESTATION_KEY_VAULT_PATH)) as AttestationKeyRecord;
    if (!stored?.publicKey || !stored?.secretKey) {
      throw new Error('Vault attestation key record is missing publicKey/secretKey');
    }

    const publicKey = Buffer.from(stored.publicKey, 'base64');
    const secretKey = Buffer.from(stored.secretKey, 'base64');
    const challengeEnvelope = {
      protocolVersion: `${ATTESTATION_PROTOCOL_VERSION}.recovery`,
      issuedAt: new Date().toISOString(),
      nonce: randomUUID(),
    };
    const challengeHash = canonicalJsonSha256Hex(challengeEnvelope);
    const message = new Uint8Array(Buffer.from(challengeHash, 'hex'));
    const signature = await this.dsa.sign(message, secretKey);
    const isValid = await this.dsa.verify(message, signature, publicKey);

    const recoveredFingerprint = crypto.createHash('sha256').update(publicKey).digest('hex');
    const liveIdentity = this.getSignerIdentity();

    return {
      passed: isValid && recoveredFingerprint === liveIdentity.signerKeyFingerprint,
      challengeHash: `0x${challengeHash}`,
      signerKeyId: liveIdentity.signerKeyId,
      signerKeyHash: liveIdentity.signerKeyHashHex,
      recoveredFingerprint,
    };
  }

  async rotateSignerKey(input?: {
    reason?: string;
    changeTicket?: string;
    requestedBy?: string;
    expectedPriorKeyId?: string;
    runRecoveryTest?: boolean;
  }) {
    this.ensureReady();
    const previousIdentity = this.getSignerIdentity();
    const expectedPriorKeyId = input?.expectedPriorKeyId?.trim();
    if (expectedPriorKeyId && expectedPriorKeyId !== previousIdentity.signerKeyId) {
      throw new Error(
        `Refusing rotation: expected prior key-id ${expectedPriorKeyId}, current is ${previousIdentity.signerKeyId}`,
      );
    }

    const ceremonyId = randomUUID();
    const rotatedAt = new Date().toISOString();
    const nextKeys = await this.dsa.generateKeyPair();
    this.keys = nextKeys;

    const nextIdentity = this.getSignerIdentity();
    this.enforceSignerKeyPinning(nextIdentity);

    await this.vaultService.write(ATTESTATION_KEY_VAULT_PATH, {
      publicKey: Buffer.from(nextKeys.publicKey).toString('base64'),
      secretKey: Buffer.from(nextKeys.secretKey).toString('base64'),
      createdAt: rotatedAt,
      rotatedAt,
      rotatedFromKeyId: previousIdentity.signerKeyId,
      rotationCeremonyId: ceremonyId,
      rotationReason: input?.reason || 'scheduled_rotation',
      changeTicket: input?.changeTicket || null,
      rotatedBy: input?.requestedBy || 'system',
    } satisfies AttestationKeyRecord);

    const recoveryTest =
      input?.runRecoveryTest === false ? { passed: true, skipped: true } : await this.runSignerRecoveryTest();

    return {
      ceremonyId,
      rotatedAt,
      previous: previousIdentity,
      current: nextIdentity,
      recoveryTest,
      reason: input?.reason || 'scheduled_rotation',
      changeTicket: input?.changeTicket || null,
    };
  }

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

    const signerIdentity = this.getSignerIdentity();
    const anchoringContext = await this.blockchainService.getAttestationContext();
    const attestedAt = new Date().toISOString();

    // Deterministic attestation payload with explicit context/domain binding.
    const attestationEnvelope = {
      context: {
        protocolVersion: ATTESTATION_PROTOCOL_VERSION,
        anchoringBackend: anchoringContext.backend,
        chainId: anchoringContext.chainId,
        contractAddress: anchoringContext.contractAddress,
        endpoint: anchoringContext.endpoint,
        signerKeyId: signerIdentity.signerKeyId,
        signerKeyHash: signerIdentity.signerKeyHashHex,
      },
      payload: {
        assetFingerprint: asset.fingerprint,
        anchorId: wrappingResult.anchorId,
        wrapperAlgorithm: wrappingResult.algorithm,
        wrappedAt: wrappingResult.wrappedAt.toISOString(),
        attestedAt,
      },
    };
    const canonicalEnvelope = canonicalJsonStringify(attestationEnvelope);
    const attestationHash = canonicalJsonSha256Hex(attestationEnvelope);

    const metadataBase = {
      protocolVersion: ATTESTATION_PROTOCOL_VERSION,
      signerKeyId: signerIdentity.signerKeyId,
      signerKeyFingerprint: signerIdentity.signerKeyFingerprint,
      signerKeyHash: signerIdentity.signerKeyHashHex,
      attestationContext: attestationEnvelope.context,
      attestationPayload: attestationEnvelope.payload,
      canonicalPayload: canonicalEnvelope,
      canonicalPayloadSha256: `0x${attestationHash}`,
    };

    // Create attestation record
    const attestation = await this.prisma.attestation.create({
      data: {
        jobId,
        assetId,
        anchorId: wrappingResult.anchorId,
        attestationHash: `0x${attestationHash}`,
        status: AttestationStatus.PENDING,
        metadata: metadataBase,
      },
    });

    try {
      // Sign with ML-DSA
      const messageBytes = new Uint8Array(Buffer.from(attestationHash, 'hex'));
      const signature = await this.dsa.sign(messageBytes, this.keys.secretKey);
      const isValid = await this.dsa.verify(messageBytes, signature, this.keys.publicKey);
      if (!isValid) {
        throw new Error('ML-DSA signature self-verification failed');
      }
      const signatureHex = `0x${Buffer.from(signature).toString('hex')}`;

      // Submit to blockchain
      const result = await this.blockchainService.recordAttestation(
        `0x${attestationHash}`,
        asset.fingerprint,
        wrappingResult.anchorId,
        signatureHex,
        signerIdentity.signerKeyHashHex,
      );

      // Update attestation with transaction details
      const updateData: any = {
        txHash: result.txHash,
        blockNumber: BigInt(result.blockNumber),
        status: AttestationStatus.SUBMITTED,
        submittedAt: new Date(),
        metadata: {
          ...metadataBase,
          txHash: result.txHash,
          submittedAt: new Date().toISOString(),
          chainId: result.chainId ?? anchoringContext.chainId,
        },
      };

      if (result.chainId !== undefined) {
        updateData.chainId = result.chainId;
      }

      await this.prisma.attestation.update({
        where: { id: attestation.id },
        data: {
          ...updateData,
        },
      });

      // Update asset status
      await this.prisma.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.ATTESTED },
      });

      return attestation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'attestation_failed';

      // Mark as failed
      await this.prisma.attestation.update({
        where: { id: attestation.id },
        data: {
          status: AttestationStatus.FAILED,
          metadata: {
            ...metadataBase,
            error: errorMessage,
          },
        },
      });
      throw error;
    }
  }
}
