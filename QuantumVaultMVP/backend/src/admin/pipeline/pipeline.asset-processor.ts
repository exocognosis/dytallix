import {
    PipelineAssetStatus,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { canonicalJsonSha256Hex } from '../../crypto/canonical-json';
import {
    MlKem,
    wrapSuiteForKemAlgorithm,
} from '../../crypto/mlkem';
import { PrismaService } from '../../database/prisma.service';
import { ObjectStorageService } from '../../storage/object-storage.service';
import {
    kemAlgorithmForLevel,
    normalizeKemAlgorithm,
} from '../admin.algorithms';
import {
    PipelineMetadataOverride,
    PipelinePolicy,
    PQC_PIPELINE_VERSION,
    SignatureAnchorRecord,
} from '../admin.types';
import { toInputJsonValue } from '../admin.utils';
import {
    deriveAuthorizedRoles,
    deriveClassificationLevel,
    deriveNistLevel,
    deriveRetentionPolicy,
    inferOwnerDepartment,
} from './pipeline.domain';
import {
    KemAnchorRecord,
    PipelineCryptoHelper,
} from './pipeline.crypto';
import {
    LoadedManifest,
    PipelineFilesHelper,
} from './pipeline.files';
import { PipelinePolicyHelper } from './pipeline.policy';

export type PipelineRunResult = {
    source: string;
    destination?: string;
    status: 'processed' | 'skipped' | 'failed';
    reason?: string;
    sizeBytes?: number;
    sha256?: string;
};

export type PipelineFileContext = {
    runId: string;
    sourceDir: string;
    destDir: string;
    filePath: string;
    maxFileSizeBytes: number;
    loadedManifest: LoadedManifest;
    defaultPolicy: PipelinePolicy;
    fileTypePolicies: Map<string, PipelinePolicy>;
    metadataOverrides: Map<string, PipelineMetadataOverride>;
    activeAnchor: KemAnchorRecord;
    signatureAnchors: Map<string, SignatureAnchorRecord>;
    kemPublicKeyCache: Map<string, Buffer>;
    kemByAlgorithmCache: Map<string, MlKem>;
};

export class PipelineAssetProcessor {
    constructor(
        private readonly prisma: PrismaService,
        private readonly objectStorageService: ObjectStorageService,
        private readonly filesHelper: PipelineFilesHelper,
        private readonly policyHelper: PipelinePolicyHelper,
        private readonly cryptoHelper: PipelineCryptoHelper,
    ) { }

    async processFile(context: PipelineFileContext): Promise<{ result: PipelineRunResult }> {
        const { runId, sourceDir, destDir, filePath, maxFileSizeBytes, loadedManifest } = context;

        if (filePath.toLowerCase().endsWith('.pqc.json')) {
            return {
                result: { source: filePath, status: 'skipped', reason: 'already_pqc' },
            };
        }

        if (filePath.toLowerCase().endsWith('.meta.json')) {
            return {
                result: { source: filePath, status: 'skipped', reason: 'metadata_sidecar' },
            };
        }

        const stat = await fs.promises.stat(filePath);
        if (stat.size > maxFileSizeBytes) {
            return {
                result: {
                    source: filePath,
                    status: 'skipped',
                    reason: `file_too_large_${stat.size}`,
                    sizeBytes: stat.size,
                },
            };
        }

        const fileBuffer = await fs.promises.readFile(filePath);
        const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const relativePath = path.relative(sourceDir, filePath);
        const destinationPath = this.filesHelper.buildDestinationPath(destDir, relativePath);
        const stageTimestamps: Record<string, string> = {
            IDENTIFIED: new Date().toISOString(),
        };

        const manifestMetadata = loadedManifest.entries.get(relativePath);
        if (!manifestMetadata) {
            await this.prisma.pipelineAsset.create({
                data: {
                    runId,
                    relativePath,
                    sourcePath: filePath,
                    status: PipelineAssetStatus.SKIPPED,
                    manifestSha256: loadedManifest.sha256,
                    plaintextSha256: sha256,
                    fileSizeBytes: stat.size,
                    stageTimestamps: toInputJsonValue(stageTimestamps),
                    errorMessage: 'manifest_missing',
                },
            });
            return {
                result: { source: filePath, status: 'skipped', reason: 'manifest_missing' },
            };
        }

        const sidecarMetadata = await this.filesHelper.loadSidecarMetadata(filePath);
        const mergedMetadata = this.applyMetadataOverride(
            relativePath,
            { ...manifestMetadata, ...sidecarMetadata },
            context.metadataOverrides,
        );

        const effectivePolicy = this.policyHelper.getPolicyForFile(
            filePath,
            context.defaultPolicy,
            context.fileTypePolicies,
        );
        const effectiveKemAlgorithm = normalizeKemAlgorithm(
            effectivePolicy.kemAlgorithm,
            kemAlgorithmForLevel(effectivePolicy.level),
        );
        const selectedKemAnchor = this.policyHelper.isKemCompatible(
            effectivePolicy.kemAlgorithm,
            context.activeAnchor.algorithm,
        )
            ? context.activeAnchor
            : await this.cryptoHelper.resolveActiveKemAnchor(effectiveKemAlgorithm);

        if (!selectedKemAnchor) {
            throw new Error(`No active KEM anchor available for ${effectiveKemAlgorithm}`);
        }

        const selectedAnchorAlgorithm = normalizeKemAlgorithm(selectedKemAnchor.algorithm, effectiveKemAlgorithm);
        const selectedKemAlgorithm = normalizeKemAlgorithm(effectiveKemAlgorithm, selectedAnchorAlgorithm);
        const selectedAnchorPublicKey = await this.cryptoHelper.loadAnchorPublicKey(
            selectedKemAnchor,
            context.kemPublicKeyCache,
        );
        const selectedKem = await this.cryptoHelper.loadKem(
            selectedKemAlgorithm,
            context.kemByAlgorithmCache,
        );

        const nistLevel = deriveNistLevel(mergedMetadata);
        const classificationLevel = deriveClassificationLevel(mergedMetadata, nistLevel);
        const ownerDepartment = String(
            mergedMetadata.owner_department
            || mergedMetadata.ownerDepartment
            || mergedMetadata.owner
            || inferOwnerDepartment(mergedMetadata.data_domain || manifestMetadata.data_domain || 'OPERATIONAL'),
        ).trim() || null;
        const authorizedRoles = deriveAuthorizedRoles(mergedMetadata, classificationLevel);
        const retentionPolicy = deriveRetentionPolicy(
            mergedMetadata,
            String(mergedMetadata.data_domain || manifestMetadata.data_domain || 'OPERATIONAL'),
        );
        const keyManifestRef = `manifest:${loadedManifest.sha256}|anchor:${selectedKemAnchor.id}|kem:${selectedKemAlgorithm}`;
        const approvalRequired =
            mergedMetadata.approval_required === true
            || classificationLevel === 'L4_CRITICAL';

        const pipelineAsset = await this.prisma.pipelineAsset.create({
            data: {
                runId,
                objectId: mergedMetadata.object_id || manifestMetadata.object_id,
                relativePath: mergedMetadata.relative_path || manifestMetadata.relative_path || relativePath,
                sourcePath: filePath,
                status: PipelineAssetStatus.IDENTIFIED,
                pqcStatus: mergedMetadata.pqc_status || undefined,
                pqcProtected: Boolean(mergedMetadata.pqc_protected),
                dataDomain: mergedMetadata.data_domain || manifestMetadata.data_domain,
                cryptoDomain: mergedMetadata.crypto_domain || manifestMetadata.crypto_domain,
                expectedPolicyOutcome: mergedMetadata.expected_policy_outcome || manifestMetadata.expected_policy_outcome,
                plaintextSha256: mergedMetadata.plaintext_sha256 || manifestMetadata.plaintext_sha256 || sha256,
                manifestSha256: loadedManifest.sha256,
                classificationLevel,
                ownerDepartment,
                storageLocation: destinationPath,
                encryptionState: 'UNENCRYPTED',
                keyManifestRef,
                authorizedRoles,
                retentionPolicy,
                lifecycleState: 'DISCOVERED',
                integrityCheckTimestamp: new Date(),
                approvalRequired,
                fileSizeBytes: stat.size,
                metadata: toInputJsonValue({
                    ...mergedMetadata,
                    pipeline_pqc_policy: {
                        level: effectivePolicy.level,
                        kemAlgorithm: selectedKemAlgorithm,
                        signatureAlgorithms: effectivePolicy.signatureAlgorithms,
                    },
                }),
                stageTimestamps: toInputJsonValue(stageTimestamps),
            },
        });

        stageTimestamps.CATEGORIZED = new Date().toISOString();
        await this.updatePipelineAsset(pipelineAsset.id, {
            status: PipelineAssetStatus.CATEGORIZED,
            lifecycleState: 'CLASSIFIED',
        }, stageTimestamps);

        stageTimestamps.ANALYZED = new Date().toISOString();
        await this.updatePipelineAsset(pipelineAsset.id, {
            status: PipelineAssetStatus.ANALYZED,
        }, stageTimestamps);

        stageTimestamps.NIST_ASSIGNED = new Date().toISOString();
        await this.updatePipelineAsset(pipelineAsset.id, {
            status: PipelineAssetStatus.NIST_ASSIGNED,
            nistLevel,
        }, stageTimestamps);

        const pqcStatus = typeof mergedMetadata.pqc_status === 'string' ? mergedMetadata.pqc_status : '';
        const pqcProtected = typeof mergedMetadata.pqc_protected === 'boolean'
            ? mergedMetadata.pqc_protected
            : pqcStatus.toUpperCase() === 'PQC_PROTECTED';

        if (pqcProtected) {
            stageTimestamps.SKIPPED = new Date().toISOString();
            await this.updatePipelineAsset(pipelineAsset.id, {
                status: PipelineAssetStatus.SKIPPED,
                pqcStatus: pqcStatus || 'PQC_PROTECTED',
                pqcProtected: true,
                encryptionState: 'PQC_WRAPPED',
                lifecycleState: 'AVAILABLE',
                integrityCheckTimestamp: new Date(),
            }, stageTimestamps);

            return {
                result: { source: filePath, status: 'skipped', reason: 'already_pqc' },
            };
        }

        const aadContext = {
            protocolVersion: PQC_PIPELINE_VERSION,
            wrapSuite: wrapSuiteForKemAlgorithm(selectedKemAlgorithm),
            kemAlgorithm: selectedKemAlgorithm,
            wrapLevel: effectivePolicy.level,
            anchorId: selectedKemAnchor.id,
            anchorAlgorithm: selectedKemAnchor.algorithm,
            objectId: mergedMetadata.object_id || manifestMetadata.object_id || null,
            relativePath: mergedMetadata.relative_path || manifestMetadata.relative_path || relativePath,
            plaintextSha256: mergedMetadata.plaintext_sha256 || manifestMetadata.plaintext_sha256 || sha256,
            manifestSha256: loadedManifest.sha256,
            dataDomain: mergedMetadata.data_domain || manifestMetadata.data_domain || null,
            cryptoDomain: mergedMetadata.crypto_domain || manifestMetadata.crypto_domain || null,
        };

        const envelope = await this.cryptoHelper.encryptBuffer(
            fileBuffer,
            selectedKem,
            selectedAnchorPublicKey,
            aadContext,
            selectedKemAlgorithm,
        );

        const payload = {
            version: PQC_PIPELINE_VERSION,
            algorithm: wrapSuiteForKemAlgorithm(selectedKemAlgorithm),
            kemAlgorithm: selectedKemAlgorithm,
            wrapLevel: effectivePolicy.level,
            anchorId: selectedKemAnchor.id,
            anchorAlgorithm: selectedKemAnchor.algorithm,
            object_id: mergedMetadata.object_id || manifestMetadata.object_id,
            relative_path: mergedMetadata.relative_path || manifestMetadata.relative_path || relativePath,
            plaintext_sha256: mergedMetadata.plaintext_sha256 || manifestMetadata.plaintext_sha256 || sha256,
            manifest_sha256: loadedManifest.sha256,
            data_domain: mergedMetadata.data_domain || manifestMetadata.data_domain,
            crypto_domain: mergedMetadata.crypto_domain || manifestMetadata.crypto_domain,
            expected_policy_outcome: mergedMetadata.expected_policy_outcome || manifestMetadata.expected_policy_outcome,
            pqc_status: pqcStatus || 'UNPROTECTED',
            pqc_protected: false,
            metadata: mergedMetadata,
            source: {
                path: filePath,
                relativePath,
                sizeBytes: fileBuffer.length,
                sha256,
            },
            envelope: {
                kemCiphertext: Buffer.from(envelope.kemCiphertext).toString('base64'),
                salt: envelope.salt.toString('base64'),
                nonce: envelope.nonce.toString('base64'),
                aeadTag: envelope.aeadTag.toString('base64'),
                aadSha256: envelope.aadSha256,
                aadContext,
            },
            ciphertext: envelope.aeadCiphertext.toString('base64'),
            attestation: {
                payloadDigestSha256: '',
                signatures: [] as Array<{
                    algorithm: string;
                    anchorId: string;
                    anchorName: string;
                    signature: string;
                }>,
            },
            wrappedAt: new Date().toISOString(),
        };

        const payloadDigestSha256 = canonicalJsonSha256Hex({
            ...payload,
            attestation: undefined,
        });
        const attestationSignatures = await this.cryptoHelper.signDigestForPolicy(
            payloadDigestSha256,
            effectivePolicy.signatureAlgorithms,
            context.signatureAnchors,
        );

        payload.attestation = {
            payloadDigestSha256: `0x${payloadDigestSha256}`,
            signatures: attestationSignatures,
        };

        stageTimestamps.WRAPPED_PQC = new Date().toISOString();
        if (attestationSignatures.length > 0) {
            stageTimestamps.ATTESTED = new Date().toISOString();
        }
        await this.updatePipelineAsset(pipelineAsset.id, {
            status: PipelineAssetStatus.WRAPPED_PQC,
            pqcStatus: 'PQC_PROTECTED',
            pqcProtected: true,
            encryptionState: 'PQC_WRAPPED',
            lifecycleState: 'ENCRYPTED',
            keyManifestRef,
            integrityCheckTimestamp: new Date(),
        }, stageTimestamps);

        const storedObject = await this.objectStorageService.writeEncryptedPayload({
            destinationPath,
            body: JSON.stringify(payload, null, 2),
            contentType: 'application/json',
            metadata: {
                assetid: pipelineAsset.id,
                runid: runId,
                classification: classificationLevel,
                ownerdepartment: ownerDepartment || 'unassigned',
            },
        });

        stageTimestamps.TRANSFERRED = new Date().toISOString();
        await this.updatePipelineAsset(pipelineAsset.id, {
            status: PipelineAssetStatus.TRANSFERRED,
            destinationPath: storedObject.destinationPath,
            storageLocation: storedObject.storageLocation,
            lifecycleState: 'AVAILABLE',
            integrityCheckTimestamp: new Date(),
        }, stageTimestamps);

        return {
            result: {
                source: filePath,
                destination: storedObject.storageLocation,
                status: 'processed',
                sizeBytes: fileBuffer.length,
                sha256,
            },
        };
    }

    async recordFailedAsset(
        runId: string,
        sourceDir: string,
        filePath: string,
        errorMessage: string,
    ) {
        await this.prisma.pipelineAsset.create({
            data: {
                runId,
                relativePath: path.relative(sourceDir, filePath),
                sourcePath: filePath,
                status: PipelineAssetStatus.FAILED,
                errorMessage,
            },
        });
    }

    private applyMetadataOverride(
        relativePath: string,
        metadata: Record<string, any>,
        metadataOverrides: Map<string, PipelineMetadataOverride>,
    ) {
        const override = this.policyHelper.resolveMetadataOverrideForFile(relativePath, metadataOverrides);
        if (!override) {
            return metadata;
        }

        const merged = { ...metadata };
        if (override.dataDomain) {
            merged.data_domain = override.dataDomain;
            merged.dataDomain = override.dataDomain;
        }
        if (override.retentionTag) {
            merged.retention_tag = override.retentionTag;
            merged.retentionTag = override.retentionTag;
        }
        if (override.owner) {
            merged.owner = override.owner;
            merged.business_owner = override.owner;
        }
        return merged;
    }

    private async updatePipelineAsset(
        assetId: string,
        data: Record<string, unknown>,
        stageTimestamps: Record<string, string>,
    ) {
        await this.prisma.pipelineAsset.update({
            where: { id: assetId },
            data: {
                ...data,
                stageTimestamps: toInputJsonValue(stageTimestamps),
            } as any,
        });
    }
}
