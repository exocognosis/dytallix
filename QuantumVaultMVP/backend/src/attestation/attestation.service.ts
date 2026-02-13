import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { JobStatus, AttestationStatus, AssetStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { getMlDsa65, MlDsaKeyPair, MlDsa65 } from '../crypto/mldsa';
import { OnModuleInit } from '@nestjs/common';
import { canonicalJsonSha256Hex, canonicalJsonStringify } from '../crypto/canonical-json';

import { VaultService } from '../vault/vault.service';

const ATTESTATION_PROTOCOL_VERSION = 'qv.attestation.v1';

@Injectable()
export class AttestationService implements OnModuleInit {
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
    @InjectQueue('attestation') private attestationQueue: Queue,
  ) { }

  async onModuleInit() {
    this.dsa = await getMlDsa65();

    // Check if keys exist in Vault
    try {
      const storedKeys = await this.vaultService.read('quantumvault/system/attestation-key');
      if (storedKeys && storedKeys.publicKey && storedKeys.secretKey) {
        this.keys = {
          publicKey: Buffer.from(storedKeys.publicKey, 'base64'),
          secretKey: Buffer.from(storedKeys.secretKey, 'base64'),
        };
        console.log('✅ Loaded persistent ML-DSA identity from Vault');
      } else {
        throw new Error('No keys found');
      }
    } catch (error) {
      console.log('⚠️  No persistent identity found, generating new system keys...');
      this.keys = await this.dsa.generateKeyPair();

      // Persist to Vault
      await this.vaultService.write('quantumvault/system/attestation-key', {
        publicKey: Buffer.from(this.keys.publicKey).toString('base64'),
        secretKey: Buffer.from(this.keys.secretKey).toString('base64'),
        createdAt: new Date().toISOString(),
      });
      console.log('✅ New ML-DSA identity persisted to Vault');
    }
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
