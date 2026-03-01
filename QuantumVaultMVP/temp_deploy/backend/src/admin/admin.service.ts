import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
    deriveAes256Key,
    getMlKemByAlgorithm,
    ML_KEM_1024_ALGORITHM,
    ML_KEM_512_ALGORITHM,
    ML_KEM_768_ALGORITHM,
    MlKem,
    normalizeKemAlgorithmName,
    wrapSuiteForKemAlgorithm,
} from '../crypto/mlkem';
import { getMlDsa65, ML_DSA_65_ALGORITHM } from '../crypto/mldsa';
import { getSlhDsaShake128s, SLH_DSA_SHAKE_128S_ALGORITHM } from '../crypto/slhdsa';
import { canonicalJsonBuffer, canonicalJsonSha256Hex } from '../crypto/canonical-json';
import { PipelineAssetStatus, PipelineRunStatus, Prisma } from '@prisma/client';
import { AttestationService } from '../attestation/attestation.service';
import { TransportService } from '../transport/transport.service';

const PQC_PIPELINE_VERSION = 'qv-pqc-v1';
const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_FILES = 2000;

type PipelineWrapLevel = 'baseline' | 'enhanced' | 'maximum';

type PipelinePolicy = {
    level: PipelineWrapLevel;
    kemAlgorithm: string;
    signatureAlgorithms: string[];
};

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);
    private readonly qvAdminBase =
        process.env.QUANTUMVAULT_ADMIN_URL ||
        process.env.QUANTUMVAULT_API_URL ||
        'http://localhost:3031';

    constructor(
        private prisma: PrismaService,
        private vaultService: VaultService,
        private attestationService: AttestationService,
        private transportService: TransportService,
    ) { }

    async saveScanConfig(config: any) {
        // Ideally update a SystemConfig table. For MVP, we simply log.
        this.logger.log('Saving scan config:', config);
        return { success: true, message: 'Configuration saved' };
    }

    private async writeGovernanceAudit(action: string, details: Record<string, unknown>) {
        const serializedDetails = JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue;
        await this.prisma.auditLog.create({
            data: {
                action,
                resource: 'KEY_GOVERNANCE',
                details: serializedDetails,
            },
        });
    }

    async getKeyGovernanceStatus() {
        const [attestation, transport] = await Promise.all([
            this.attestationService.getSignerGovernanceStatus(),
            this.transportService.getTransportKeyGovernanceStatus(),
        ]);

        return {
            collectedAt: new Date().toISOString(),
            attestation,
            transport,
        };
    }

    async rotateAttestationSigner(input?: {
        reason?: string;
        changeTicket?: string;
        requestedBy?: string;
        expectedPriorKeyId?: string;
        runRecoveryTest?: boolean;
    }) {
        const result = await this.attestationService.rotateSignerKey(input);
        await this.writeGovernanceAudit('ATTESTATION_KEY_ROTATION', {
            ceremonyId: result.ceremonyId,
            rotatedAt: result.rotatedAt,
            previousKeyId: result.previous.signerKeyId,
            newKeyId: result.current.signerKeyId,
            reason: result.reason,
            changeTicket: result.changeTicket,
            requestedBy: input?.requestedBy || 'admin',
            recoveryPassed: result.recoveryTest?.passed ?? false,
        });
        return result;
    }

    async rotateTransportKeys(input?: {
        reason?: string;
        changeTicket?: string;
        requestedBy?: string;
        expectedPriorKemKeyId?: string;
        expectedPriorIdentityKeyId?: string;
        runRecoveryTest?: boolean;
    }) {
        const result = await this.transportService.rotateTransportKeys(input);
        await this.writeGovernanceAudit('TRANSPORT_KEY_ROTATION', {
            ceremonyId: result.ceremonyId,
            rotatedAt: result.rotatedAt,
            previousKemKeyId: result.previousKemKeyId,
            previousIdentityKeyId: result.previousIdentityKeyId,
            newKemKeyId: result.currentKemKeyId,
            newIdentityKeyId: result.currentIdentityKeyId,
            reason: input?.reason || 'scheduled_rotation',
            changeTicket: input?.changeTicket || null,
            requestedBy: input?.requestedBy || 'admin',
            recoveryPassed: result.recoveryTest?.passed ?? false,
        });
        return result;
    }

    async runKeyRecoveryTests(input?: { scope?: 'attestation' | 'transport' | 'all'; requestedBy?: string }) {
        const scope = input?.scope || 'all';
        const output: Record<string, unknown> = {
            scope,
            executedAt: new Date().toISOString(),
        };

        if (scope === 'all' || scope === 'attestation') {
            output.attestation = await this.attestationService.runSignerRecoveryTest();
        }
        if (scope === 'all' || scope === 'transport') {
            output.transport = await this.transportService.runTransportRecoveryTest();
        }

        await this.writeGovernanceAudit('KEY_RECOVERY_TEST', {
            ...output,
            requestedBy: input?.requestedBy || 'admin',
        });

        return output;
    }

    async runDiscovery(config: any) {
        this.logger.log('Starting discovery with config:', config);

        const remoteResult = await this.tryRemoteScan();
        if (remoteResult) {
            return remoteResult;
        }

        // Parse config
        const directorySource = config.originDatabase || config.sourceDirectories || config.directories || '';
        const directories = (directorySource || '').split('\n').map(d => d.trim()).filter(Boolean);
        const extensions = (config.fileTypes || '').split(',').map(e => e.trim().replace(/^\*/, '')); // e.g., ".pem"

        if (directories.length === 0) {
            return { success: false, message: 'No directories specified' };
        }

        const results = [];
        const manifestsGenerated: string[] = [];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                this.logger.warn(`Directory not found: ${dir}`);
                continue;
            }

            const files = await this.scanDir(dir, extensions);
            results.push(...files);

            // Auto-generate manifest.jsonl for this directory
            try {
                const manifestEntries: string[] = [];
                for (const filePath of files) {
                    const relativePath = path.relative(dir, filePath);
                    const stat = await fs.promises.stat(filePath);
                    const fileBuffer = await fs.promises.readFile(filePath);
                    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                    // Infer data domain from path/extension
                    const dataDomain = this.inferDataDomain(relativePath);
                    const cryptoDomain = this.inferCryptoDomain(relativePath);

                    const entry = {
                        object_id: crypto.randomUUID(),
                        relative_path: relativePath,
                        plaintext_sha256: sha256,
                        file_size_bytes: stat.size,
                        data_domain: dataDomain,
                        crypto_domain: cryptoDomain,
                        pqc_status: 'UNPROTECTED',
                        pqc_protected: false,
                        expected_policy_outcome: 'WRAP_PQC',
                        discovered_at: new Date().toISOString(),
                    };
                    manifestEntries.push(JSON.stringify(entry));
                }

                if (manifestEntries.length > 0) {
                    const manifestContent = manifestEntries.join('\n') + '\n';
                    const manifestPath = path.join(dir, 'manifest.jsonl');
                    const manifestSha = crypto.createHash('sha256').update(manifestContent).digest('hex');
                    const shaPath = path.join(dir, 'manifest.sha256');

                    await fs.promises.writeFile(manifestPath, manifestContent, 'utf8');
                    await fs.promises.writeFile(shaPath, manifestSha, 'utf8');
                    manifestsGenerated.push(dir);
                    this.logger.log(`Generated manifest for ${dir} with ${manifestEntries.length} entries`);
                }
            } catch (err: any) {
                this.logger.error(`Failed to generate manifest for ${dir}: ${err.message}`);
            }
        }

        // Limit results for response
        const limitedResults = results.slice(0, 100);

        this.logger.log(`Discovery complete. Found ${results.length} files.`);

        const manifestMsg = manifestsGenerated.length > 0
            ? ` Manifests generated for: ${manifestsGenerated.join(', ')}`
            : '';

        return {
            success: true,
            message: `Discovery complete. Found ${results.length} potential assets.${manifestMsg}`,
            totalFound: results.length,
            manifestsGenerated,
            files: limitedResults
        };
    }

    private async generateManifestForPipeline(sourceDir: string, extensions: string[]): Promise<boolean> {
        try {
            if (!fs.existsSync(sourceDir)) {
                return false;
            }

            const files = await this.scanDirForPipeline(sourceDir, {
                extensions,
                excludePatterns: ['node_modules', '.git'],
            });

            const manifestEntries: string[] = [];

            for (const filePath of files) {
                if (filePath.toLowerCase().endsWith('.pqc.json') || filePath.toLowerCase().endsWith('.meta.json')) {
                    continue;
                }

                const relativePath = path.relative(sourceDir, filePath);
                const stat = await fs.promises.stat(filePath);
                const fileBuffer = await fs.promises.readFile(filePath);
                const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

                const entry = {
                    object_id: crypto.randomUUID(),
                    relative_path: relativePath,
                    plaintext_sha256: sha256,
                    file_size_bytes: stat.size,
                    data_domain: this.inferDataDomain(relativePath),
                    crypto_domain: this.inferCryptoDomain(relativePath),
                    pqc_status: 'UNPROTECTED',
                    pqc_protected: false,
                    expected_policy_outcome: 'WRAP_PQC',
                    discovered_at: new Date().toISOString(),
                };

                manifestEntries.push(JSON.stringify(entry));
            }

            const manifestContent = manifestEntries.join('\n') + (manifestEntries.length ? '\n' : '');
            const manifestPath = path.join(sourceDir, 'manifest.jsonl');
            const manifestSha = crypto.createHash('sha256').update(manifestContent).digest('hex');
            const shaPath = path.join(sourceDir, 'manifest.sha256');

            await fs.promises.writeFile(manifestPath, manifestContent, 'utf8');
            await fs.promises.writeFile(shaPath, manifestSha, 'utf8');
            this.logger.log(`Auto-generated manifest for ${sourceDir} with ${manifestEntries.length} entries`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to auto-generate manifest for ${sourceDir}: ${error?.message || error}`);
            return false;
        }
    }

    private inferDataDomain(relativePath: string): string {
        const lower = relativePath.toLowerCase();
        if (lower.includes('genomic') || lower.includes('dna') || lower.includes('fasta') || lower.includes('vcf')) return 'GENOMIC';
        if (lower.includes('patient') || lower.includes('phi') || lower.includes('medical')) return 'PHI';
        if (lower.includes('imaging') || lower.includes('dicom') || lower.includes('scan')) return 'IMAGING';
        if (lower.includes('derived') || lower.includes('analytics') || lower.includes('report')) return 'DERIVED';
        if (lower.includes('audit') || lower.includes('log')) return 'AUDIT';
        if (lower.includes('cert') || lower.includes('key') || lower.includes('pem') || lower.includes('crt')) return 'CRYPTO_MATERIAL';
        if (lower.includes('config') || lower.includes('settings')) return 'CONFIGURATION';
        return 'OPERATIONAL';
    }

    private inferCryptoDomain(relativePath: string): string {
        const lower = relativePath.toLowerCase();
        if (lower.includes('key') || lower.includes('secret') || lower.includes('private')) return 'HIGH';
        if (lower.includes('cert') || lower.includes('pem') || lower.includes('crt')) return 'MEDIUM';
        return 'STANDARD';
    }

    async runPqcPipeline(config: any) {
        this.logger.log('Starting PQC pipeline with config:', config);
        try {
            const sourceDirectories = this.parseLineList(config.originDatabase || config.sourceDirectories || config.directories || '');
            const destinationDirectories = this.parseLineList(config.destinationDatabase || config.destinationDirectories || '');

            if (sourceDirectories.length === 0) {
                return { success: false, message: 'No source directories specified' };
            }

            if (destinationDirectories.length === 0) {
                return { success: false, message: 'No destination directories specified' };
            }

            const sourceToDest = this.mapSourceDestinations(sourceDirectories, destinationDirectories);
            if (!sourceToDest) {
                return { success: false, message: 'Destination directory mapping invalid. Provide 1 destination or match source count.' };
            }

            const extensions = this.resolvePipelineExtensions(config);
            const excludePatterns = this.parseCommaList(config.excludePatterns || '').concat(['node_modules', '.git']);
            const defaultPolicy = this.resolvePipelinePolicy(config);
            const fileTypePolicies = this.resolveFileTypePolicies(config);
            const requiredSignatureAlgorithms = this.collectRequiredSignatureAlgorithms(defaultPolicy, fileTypePolicies);

            const minDate = this.parseDate(config.minDate);
            const maxDate = this.parseDate(config.maxDate);

            const maxFiles = this.parsePositiveInt(config.maxFiles, DEFAULT_MAX_FILES);
            const maxFileSizeBytes = this.parsePositiveInt(config.maxFileSizeBytes, DEFAULT_MAX_FILE_SIZE_BYTES);

            const activeAnchor = await this.resolveActiveKemAnchor(defaultPolicy.kemAlgorithm);

            if (!activeAnchor) {
                return { success: false, message: `No active ${defaultPolicy.kemAlgorithm} anchor found. Create an active KEM anchor before running pipeline.` };
            }

            const signatureAnchors = await this.resolveSignatureAnchors(requiredSignatureAlgorithms);

            const missingSigners = requiredSignatureAlgorithms.filter((algorithm) => !signatureAnchors.has(algorithm));
            if (missingSigners.length > 0) {
                return {
                    success: false,
                    message: `Missing active signature anchors for: ${missingSigners.join(', ')}. Create and activate signer anchors before running selected policy levels.`,
                };
            }

            const kemPublicKeyCache = new Map<string, Buffer>();
            const kemByAlgorithmCache = new Map<string, MlKem>();

        const run = await this.prisma.pipelineRun.create({
            data: {
                status: PipelineRunStatus.IN_PROGRESS,
                sourceRoots: sourceDirectories,
                destinationRoots: destinationDirectories,
                startedAt: new Date(),
            },
        });

        const results: Array<{
            source: string;
            destination?: string;
            status: 'processed' | 'skipped' | 'failed';
            reason?: string;
            sizeBytes?: number;
            sha256?: string;
        }> = [];

        let totalFound = 0;
        let processed = 0;
        let skipped = 0;
        let failed = 0;

        const manifestBySource = new Map<string, { entries: Map<string, any>; sha256: string }>();
        const manifestShaBySource: Record<string, string> = {};
        const verifyManifestSha = Boolean(config?.verifyManifestSha);

        for (const sourceDir of sourceDirectories) {
            const destDir = sourceToDest.get(sourceDir);
            if (!destDir) {
                continue;
            }

            if (!fs.existsSync(sourceDir)) {
                this.logger.warn(`Source directory not found: ${sourceDir}`);
                results.push({ source: sourceDir, status: 'skipped', reason: 'source_missing' });
                skipped += 1;
                continue;
            }

            let manifest: { entries: Map<string, any>; sha256: string } | null = null;
            try {
                manifest = await this.loadManifest(sourceDir, verifyManifestSha);
            } catch (error: any) {
                this.logger.warn(`Manifest load failed for ${sourceDir}: ${error?.message || error}. Attempting auto-generation.`);
                const generated = await this.generateManifestForPipeline(sourceDir, extensions);
                if (!generated) {
                    this.logger.error(`Manifest auto-generation failed for ${sourceDir}`);
                    results.push({ source: sourceDir, status: 'failed', reason: 'manifest_load_failed' });
                    failed += 1;
                    continue;
                }

                try {
                    manifest = await this.loadManifest(sourceDir, verifyManifestSha);
                } catch (retryError: any) {
                    this.logger.error(`Manifest reload failed for ${sourceDir}: ${retryError?.message || retryError}`);
                    results.push({ source: sourceDir, status: 'failed', reason: 'manifest_load_failed' });
                    failed += 1;
                    continue;
                }
            }

            if (!manifest) {
                results.push({ source: sourceDir, status: 'failed', reason: 'manifest_load_failed' });
                failed += 1;
                continue;
            }

            manifestBySource.set(sourceDir, manifest);
            manifestShaBySource[sourceDir] = manifest.sha256;
            await this.prisma.pipelineRun.update({
                where: { id: run.id },
                data: { manifestSha: manifestShaBySource },
            });

            const files = await this.scanDirForPipeline(sourceDir, {
                extensions,
                excludePatterns,
                minDate,
                maxDate,
                maxFiles: maxFiles ? Math.max(maxFiles - totalFound, 0) : undefined,
            });

            for (const filePath of files) {
                totalFound += 1;
                if (maxFiles && totalFound > maxFiles) {
                    break;
                }

                try {
                    if (filePath.toLowerCase().endsWith('.pqc.json')) {
                        skipped += 1;
                        results.push({ source: filePath, status: 'skipped', reason: 'already_pqc' });
                        continue;
                    }

                    if (filePath.toLowerCase().endsWith('.meta.json')) {
                        skipped += 1;
                        results.push({ source: filePath, status: 'skipped', reason: 'metadata_sidecar' });
                        continue;
                    }

                    const stat = await fs.promises.stat(filePath);
                    if (stat.size > maxFileSizeBytes) {
                        skipped += 1;
                        results.push({
                            source: filePath,
                            status: 'skipped',
                            reason: `file_too_large_${stat.size}`,
                            sizeBytes: stat.size,
                        });
                        continue;
                    }

                    const fileBuffer = await fs.promises.readFile(filePath);
                    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
                    const relativePath = path.relative(sourceDir, filePath);
                    const destinationPath = this.buildDestinationPath(destDir, relativePath);
                    const stageTimestamps: Record<string, string> = {
                        IDENTIFIED: new Date().toISOString(),
                    };

                    const manifest = manifestBySource.get(sourceDir);
                    const metadata = manifest?.entries.get(relativePath);
                    if (!metadata) {
                        skipped += 1;
                        results.push({ source: filePath, status: 'skipped', reason: 'manifest_missing' });
                        await this.prisma.pipelineAsset.create({
                            data: {
                                runId: run.id,
                                relativePath,
                                sourcePath: filePath,
                                status: PipelineAssetStatus.SKIPPED,
                                manifestSha256: manifest?.sha256 || manifestShaBySource[sourceDir],
                                plaintextSha256: sha256,
                                fileSizeBytes: stat.size,
                                stageTimestamps,
                                errorMessage: 'manifest_missing',
                            },
                        });
                        continue;
                    }

                    const sidecar = await this.loadSidecarMetadata(filePath);
                    const mergedMetadata = { ...metadata, ...sidecar };
                    const effectivePolicy = this.getPolicyForFile(filePath, defaultPolicy, fileTypePolicies);
                    const effectiveKemAlgorithm = this.normalizeKemAlgorithm(effectivePolicy.kemAlgorithm, this.kemAlgorithmForLevel(effectivePolicy.level));
                    const selectedKemAnchor = this.isKemCompatible(effectivePolicy.kemAlgorithm, activeAnchor.algorithm)
                        ? activeAnchor
                        : await this.resolveActiveKemAnchor(effectiveKemAlgorithm);

                    if (!selectedKemAnchor) {
                        throw new Error(`No active KEM anchor available for ${effectiveKemAlgorithm}`);
                    }

                    const selectedAnchorAlgorithm = this.normalizeKemAlgorithm(selectedKemAnchor.algorithm, effectiveKemAlgorithm);
                    const selectedKemAlgorithm = this.normalizeKemAlgorithm(effectiveKemAlgorithm, selectedAnchorAlgorithm);

                    let selectedAnchorPublicKey = kemPublicKeyCache.get(selectedKemAnchor.id);
                    if (!selectedAnchorPublicKey) {
                        const selectedAnchorPublicRecord: any = await this.vaultService.read(selectedKemAnchor.vaultKeyPath);
                        const selectedAnchorPublicKeyB64 = selectedAnchorPublicRecord?.data?.key || selectedAnchorPublicRecord?.key;
                        if (!selectedAnchorPublicKeyB64) {
                            throw new Error(`Invalid public key payload at ${selectedKemAnchor.vaultKeyPath}`);
                        }
                        selectedAnchorPublicKey = Buffer.from(selectedAnchorPublicKeyB64, 'base64');
                        kemPublicKeyCache.set(selectedKemAnchor.id, selectedAnchorPublicKey);
                    }

                    let selectedKem = kemByAlgorithmCache.get(selectedKemAlgorithm);
                    if (!selectedKem) {
                        selectedKem = await getMlKemByAlgorithm(selectedKemAlgorithm);
                        kemByAlgorithmCache.set(selectedKemAlgorithm, selectedKem);
                    }

                    const pipelineAsset = await this.prisma.pipelineAsset.create({
                        data: {
                            runId: run.id,
                            objectId: mergedMetadata.object_id || metadata.object_id,
                            relativePath: mergedMetadata.relative_path || metadata.relative_path || relativePath,
                            sourcePath: filePath,
                            status: PipelineAssetStatus.IDENTIFIED,
                            pqcStatus: mergedMetadata.pqc_status || undefined,
                            pqcProtected: Boolean(mergedMetadata.pqc_protected),
                            dataDomain: mergedMetadata.data_domain || metadata.data_domain,
                            cryptoDomain: mergedMetadata.crypto_domain || metadata.crypto_domain,
                            expectedPolicyOutcome: mergedMetadata.expected_policy_outcome || metadata.expected_policy_outcome,
                            plaintextSha256: mergedMetadata.plaintext_sha256 || metadata.plaintext_sha256 || sha256,
                            manifestSha256: manifest?.sha256,
                            fileSizeBytes: stat.size,
                            metadata: {
                                ...mergedMetadata,
                                pipeline_pqc_policy: {
                                    level: effectivePolicy.level,
                                    kemAlgorithm: selectedKemAlgorithm,
                                    signatureAlgorithms: effectivePolicy.signatureAlgorithms,
                                },
                            },
                            stageTimestamps,
                        },
                    });

                    stageTimestamps.CATEGORIZED = new Date().toISOString();
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.CATEGORIZED,
                            stageTimestamps,
                        },
                    });

                    stageTimestamps.ANALYZED = new Date().toISOString();
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.ANALYZED,
                            stageTimestamps,
                        },
                    });

                    const nistLevel = this.deriveNistLevel(mergedMetadata);
                    stageTimestamps.NIST_ASSIGNED = new Date().toISOString();
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.NIST_ASSIGNED,
                            nistLevel,
                            stageTimestamps,
                        },
                    });

                    const pqcStatus = typeof mergedMetadata.pqc_status === 'string' ? mergedMetadata.pqc_status : '';
                    const pqcProtected = typeof mergedMetadata.pqc_protected === 'boolean'
                        ? mergedMetadata.pqc_protected
                        : pqcStatus.toUpperCase() === 'PQC_PROTECTED';

                    if (pqcProtected) {
                        skipped += 1;
                        results.push({ source: filePath, status: 'skipped', reason: 'already_pqc' });
                        stageTimestamps.SKIPPED = new Date().toISOString();
                        await this.prisma.pipelineAsset.update({
                            where: { id: pipelineAsset.id },
                            data: {
                                status: PipelineAssetStatus.SKIPPED,
                                pqcStatus: pqcStatus || 'PQC_PROTECTED',
                                pqcProtected: true,
                                stageTimestamps,
                            },
                        });
                        continue;
                    }

                    const aadContext = {
                        protocolVersion: PQC_PIPELINE_VERSION,
                        wrapSuite: wrapSuiteForKemAlgorithm(selectedKemAlgorithm),
                        kemAlgorithm: selectedKemAlgorithm,
                        wrapLevel: effectivePolicy.level,
                        anchorId: selectedKemAnchor.id,
                        anchorAlgorithm: selectedKemAnchor.algorithm,
                        objectId: mergedMetadata.object_id || metadata.object_id || null,
                        relativePath: mergedMetadata.relative_path || metadata.relative_path || relativePath,
                        plaintextSha256: mergedMetadata.plaintext_sha256 || metadata.plaintext_sha256 || sha256,
                        manifestSha256: manifest?.sha256 || null,
                        dataDomain: mergedMetadata.data_domain || metadata.data_domain || null,
                        cryptoDomain: mergedMetadata.crypto_domain || metadata.crypto_domain || null,
                    };

                    const envelope = await this.encryptBuffer(
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
                        object_id: mergedMetadata.object_id || metadata.object_id,
                        relative_path: mergedMetadata.relative_path || metadata.relative_path || relativePath,
                        plaintext_sha256: mergedMetadata.plaintext_sha256 || metadata.plaintext_sha256 || sha256,
                        manifest_sha256: manifest?.sha256,
                        data_domain: mergedMetadata.data_domain || metadata.data_domain,
                        crypto_domain: mergedMetadata.crypto_domain || metadata.crypto_domain,
                        expected_policy_outcome: mergedMetadata.expected_policy_outcome || metadata.expected_policy_outcome,
                        pqc_status: pqcStatus || (pqcProtected ? 'PQC_PROTECTED' : 'UNPROTECTED'),
                        pqc_protected: pqcProtected,
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

                    const attestationSignatures = await this.signDigestForPolicy(
                        payloadDigestSha256,
                        effectivePolicy.signatureAlgorithms,
                        signatureAnchors,
                    );

                    payload.attestation = {
                        payloadDigestSha256: `0x${payloadDigestSha256}`,
                        signatures: attestationSignatures,
                    };

                    stageTimestamps.WRAPPED_PQC = new Date().toISOString();
                    if (attestationSignatures.length > 0) {
                        stageTimestamps.ATTESTED = new Date().toISOString();
                    }
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.WRAPPED_PQC,
                            pqcStatus: 'PQC_PROTECTED', // Successfully wrapped = protected
                            pqcProtected: true,
                            stageTimestamps,
                        },
                    });

                    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
                    await fs.promises.writeFile(destinationPath, JSON.stringify(payload, null, 2), 'utf8');

                    stageTimestamps.TRANSFERRED = new Date().toISOString();
                    await this.prisma.pipelineAsset.update({
                        where: { id: pipelineAsset.id },
                        data: {
                            status: PipelineAssetStatus.TRANSFERRED,
                            destinationPath,
                            stageTimestamps,
                        },
                    });

                    processed += 1;
                    results.push({
                        source: filePath,
                        destination: destinationPath,
                        status: 'processed',
                        sizeBytes: fileBuffer.length,
                        sha256,
                    });
                } catch (error: any) {
                    failed += 1;
                    results.push({
                        source: filePath,
                        status: 'failed',
                        reason: error?.message || 'pipeline_error',
                    });
                    await this.prisma.pipelineAsset.create({
                        data: {
                            runId: run.id,
                            relativePath: path.relative(sourceDir, filePath),
                            sourcePath: filePath,
                            status: PipelineAssetStatus.FAILED,
                            errorMessage: error?.message || 'pipeline_error',
                        },
                    });
                }
            }
        }

        const summary = {
            success: failed === 0,
            message: `PQC pipeline complete. Processed ${processed}, skipped ${skipped}, failed ${failed}.`,
            totalFound,
            processed,
            skipped,
            failed,
            anchorId: activeAnchor.id,
            anchorAlgorithm: activeAnchor.algorithm,
            pipelinePolicy: {
                default: defaultPolicy,
                byFileType: Object.fromEntries(fileTypePolicies.entries()),
            },
            runId: run.id,
            results: results.slice(0, 100),
        };

        await this.prisma.pipelineRun.update({
            where: { id: run.id },
            data: {
                status: failed > 0 ? PipelineRunStatus.FAILED : PipelineRunStatus.COMPLETED,
                totalFound,
                processed,
                skipped,
                failed,
                completedAt: new Date(),
            },
        });

            this.logger.log(`PQC pipeline complete. Processed ${processed}, skipped ${skipped}, failed ${failed}.`);
            return summary;
        } catch (error: any) {
            this.logger.error(`PQC pipeline failed: ${error?.message || error}`);
            return {
                success: false,
                message: 'PQC pipeline failed. Check server logs for details.',
                error: error?.message || 'pipeline_error',
            };
        }
    }

    private async tryRemoteScan() {
        const url = `${this.qvAdminBase.replace(/\/$/, '')}/admin/scan`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch(url, { method: 'GET', signal: controller.signal });
            if (!response.ok) {
                this.logger.warn(`QuantumVault admin scan failed: ${response.status}`);
                return null;
            }
            const data = await response.json();
            if (data && typeof data === 'object') {
                return data;
            }
        } catch (error: any) {
            this.logger.warn(`QuantumVault admin scan unreachable: ${error?.message || error}`);
            return null;
        } finally {
            clearTimeout(timeout);
        }

        return null;
    }

    private async scanDir(dir: string, extensions: string[]): Promise<string[]> {
        let results: string[] = [];
        try {
            const list = await fs.promises.readdir(dir);
            for (const file of list) {
                const filePath = path.join(dir, file);

                try {
                    const stat = await fs.promises.stat(filePath);
                    if (stat && stat.isDirectory()) {
                        // Avoid hidden folders and node_modules
                        if (!file.startsWith('.') && file !== 'node_modules') {
                            results = results.concat(await this.scanDir(filePath, extensions));
                        }
                    } else {
                        if (extensions.some(ext => file.toLowerCase().endsWith(ext.toLowerCase()))) {
                            results.push(filePath);
                        }
                    }
                } catch (err) {
                    // Ignore access errors
                }
            }
        } catch (e) {
            this.logger.error(`Error scanning ${dir}: ${e.message}`);
        }
        return results;
    }

    private parseLineList(value: string): string[] {
        return (value || '')
            .split('\n')
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    private parseCommaList(value: string): string[] {
        return (value || '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    private normalizeExtensions(extensions: string[]): string[] {
        const normalized = extensions
            .map((ext) => ext.replace(/^\*\./, '.').replace(/^\*/, ''))
            .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`))
            .filter((ext) => ext !== '.');

        if (normalized.some((ext) => ext === '.*' || ext === '*')) {
            return [];
        }

        return Array.from(new Set(normalized.map((ext) => ext.toLowerCase())));
    }

    private resolvePipelineExtensions(config: any): string[] {
        // Combine file types and format-derived extensions
        const fileTypes = this.normalizeExtensions(this.parseCommaList(config.fileTypes || ''));
        
        const formatValue = typeof config?.formats === 'string' ? config.formats : '';
        const formats = this.parseCommaList(formatValue).map((f) => f.toLowerCase());
        const formatExtensions = this.normalizeExtensions(this.extensionsFromFormats(formats));
        
        // Merge both lists, removing duplicates
        const combined = Array.from(new Set([...fileTypes, ...formatExtensions]));
        
        this.logger.log(`Pipeline extensions resolved: ${combined.join(', ')} (from fileTypes: ${fileTypes.join(', ')}, formats: ${formatExtensions.join(', ')})`);
        
        return combined;
    }

    private extensionsFromFormats(formats: string[]): string[] {
        if (!formats.length) return [];
        const extensions: string[] = [];

        const push = (...exts: string[]) => extensions.push(...exts);

        for (const fmt of formats) {
            if (fmt.includes('parquet')) push('.parquet');
            if (fmt === 'csv' || fmt.includes('csv')) push('.csv');
            if (fmt === 'json' || fmt.includes('json')) push('.json');
            if (fmt === 'txt' || fmt.includes('txt')) push('.txt');
            if (fmt === 'pdf' || fmt.includes('pdf')) push('.pdf');
            if (fmt.includes('png')) push('.png');
            if (fmt.includes('jpeg') || fmt.includes('jpg')) push('.jpeg', '.jpg');
            if (fmt.includes('tiff') || fmt.includes('tif')) push('.tiff', '.tif');
            if (fmt.includes('bin')) push('.bin');
            if (fmt.includes('dicom')) push('.dcm', '.dicom');
            if (fmt.includes('fasta')) push('.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn');
            if (fmt.includes('vcf')) push('.vcf');
            if (fmt.includes('gz')) push('.gz');
        }

        // If gz is present, allow common gzipped fasta/vcf variants
        if (extensions.includes('.gz')) {
            push('.fasta.gz', '.fa.gz', '.fna.gz', '.ffn.gz', '.faa.gz', '.frn.gz', '.vcf.gz');
        }

        return extensions;
    }

    private async loadManifest(
        sourceRoot: string,
        verifySha: boolean
    ): Promise<{ entries: Map<string, any>; sha256: string }> {
        const manifestPath = path.join(sourceRoot, 'manifest.jsonl');
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest not found at ${manifestPath}. Run "Discovery" first to auto-generate the manifest.`);
        }

        const data = await fs.promises.readFile(manifestPath, 'utf8');
        const map = new Map<string, any>();
        const manifestSha = await this.readManifestSha(sourceRoot);

        if (!manifestSha) {
            throw new Error(`manifest.sha256 missing or invalid in ${sourceRoot}. Run "Discovery" to regenerate.`);
        }

        if (verifySha) {
            const computed = crypto.createHash('sha256').update(data).digest('hex');
            if (computed !== manifestSha) {
                throw new Error(`manifest.sha256 mismatch for ${sourceRoot}`);
            }
        }

        for (const line of data.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                const obj = JSON.parse(trimmed);
                const rel = typeof obj.relative_path === 'string' ? obj.relative_path : '';
                if (rel) {
                    map.set(rel, obj);
                }
            } catch (err) {
                // Ignore malformed lines
            }
        }

        return { entries: map, sha256: manifestSha };
    }

    private async readManifestSha(sourceRoot: string): Promise<string> {
        const shaPath = path.join(sourceRoot, 'manifest.sha256');
        if (!fs.existsSync(shaPath)) {
            return '';
        }
        try {
            const data = await fs.promises.readFile(shaPath, 'utf8');
            const trimmed = data.trim();
            if (!trimmed) return '';
            const token = trimmed.split(/\s+/)[0];
            return token || '';
        } catch (err) {
            return '';
        }
    }

    private async loadSidecarMetadata(filePath: string): Promise<Record<string, any>> {
        const sidecarPath = `${filePath}.meta.json`;
        if (!fs.existsSync(sidecarPath)) {
            return {};
        }
        try {
            const data = await fs.promises.readFile(sidecarPath, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed === 'object') {
                return parsed as Record<string, any>;
            }
        } catch (err) {
            return {};
        }
        return {};
    }

    private deriveNistLevel(metadata: Record<string, any>): number {
        const explicit = Number(metadata?.nist_level ?? metadata?.nistLevel);
        if (Number.isFinite(explicit) && explicit > 0) {
            return Math.min(Math.max(Math.floor(explicit), 1), 5);
        }

        const domain = String(metadata?.data_domain || '').toLowerCase();
        const cryptoDomain = String(metadata?.crypto_domain || '').toLowerCase();

        if (domain.includes('genomic') || domain.includes('phi') || domain.includes('patient')) return 5;
        if (domain.includes('imaging') || domain.includes('media') || domain.includes('legal')) return 4;
        if (cryptoDomain.includes('high')) return 4;
        if (domain.includes('derived') || domain.includes('de-identified')) return 2;
        if (domain.includes('operational') || domain.includes('audit')) return 3;
        return 3;
    }

    private parseJsonObject(value: unknown): Record<string, any> {
        if (!value) return {};
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                    ? parsed as Record<string, any>
                    : {};
            } catch {
                return {};
            }
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, any>;
        }
        return {};
    }

    private parsePipelineLevel(value: unknown): PipelineWrapLevel {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized === 'baseline' || normalized === 'low' || normalized === 'level1') return 'baseline';
        if (normalized === 'maximum' || normalized === 'max' || normalized === 'high' || normalized === 'level3') return 'maximum';
        return 'enhanced';
    }

    private kemAlgorithmForLevel(level: PipelineWrapLevel): string {
        if (level === 'baseline') return ML_KEM_512_ALGORITHM;
        if (level === 'maximum') return ML_KEM_1024_ALGORITHM;
        return ML_KEM_768_ALGORITHM;
    }

    private normalizeKemAlgorithm(value: unknown, fallback: string = ML_KEM_1024_ALGORITHM): string {
        return normalizeKemAlgorithmName(value, fallback);
    }

    private normalizeSignatureAlgorithm(value: unknown): string {
        const normalized = String(value || '').trim().toUpperCase();
        if (!normalized) return '';
        if (normalized.includes('DILITHIUM') || normalized.includes('ML-DSA') || normalized.includes('MLDSA')) {
            return ML_DSA_65_ALGORITHM;
        }
        if (normalized.includes('SPHINCS') || normalized.includes('SLH-DSA') || normalized.includes('SLHDSA')) {
            return SLH_DSA_SHAKE_128S_ALGORITHM;
        }
        return '';
    }

    private signatureAlgorithmsForLevel(level: PipelineWrapLevel): string[] {
        if (level === 'baseline') return [];
        if (level === 'maximum') return [ML_DSA_65_ALGORITHM, SLH_DSA_SHAKE_128S_ALGORITHM];
        return [ML_DSA_65_ALGORITHM];
    }

    private resolvePipelinePolicy(config: any): PipelinePolicy {
        const level = this.parsePipelineLevel(config?.defaultPqcLevel || config?.pqcLevel || 'enhanced');
        const kemAlgorithm = this.normalizeKemAlgorithm(
            config?.kemAlgorithm || config?.defaultKemAlgorithm,
            this.kemAlgorithmForLevel(level),
        );

        let signatureAlgorithms = this.signatureAlgorithmsForLevel(level);
        const customSignatures = this.parseCommaList(String(config?.signatureAlgorithms || config?.defaultSignatureAlgorithms || ''));
        if (customSignatures.length > 0) {
            signatureAlgorithms = customSignatures
                .map((entry) => this.normalizeSignatureAlgorithm(entry))
                .filter(Boolean);
        }

        return {
            level,
            kemAlgorithm,
            signatureAlgorithms: Array.from(new Set(signatureAlgorithms)),
        };
    }

    private normalizePolicyExtension(extension: string): string {
        const trimmed = extension.trim().toLowerCase();
        if (!trimmed) return '';
        if (trimmed.startsWith('.')) return trimmed;
        return `.${trimmed}`;
    }

    private normalizePolicyExtensions(extensionList: string): string[] {
        return extensionList
            .split(',')
            .map((entry) => this.normalizePolicyExtension(entry))
            .filter(Boolean);
    }

    private resolveFileTypePolicies(config: any): Map<string, PipelinePolicy> {
        const policyMap = new Map<string, PipelinePolicy>();

        const rawLevelMap = this.parseJsonObject(config?.fileTypePqcLevels || config?.pqcLevelByFileType || config?.pipelineLevelByFileType);
        for (const [ext, rawLevel] of Object.entries(rawLevelMap)) {
            const level = this.parsePipelineLevel(rawLevel);
            const normalizedExts = this.normalizePolicyExtensions(ext);
            for (const normalizedExt of normalizedExts) {
                policyMap.set(normalizedExt, {
                    level,
                    kemAlgorithm: this.kemAlgorithmForLevel(level),
                    signatureAlgorithms: this.signatureAlgorithmsForLevel(level),
                });
            }
        }

        const rawPolicyMap = this.parseJsonObject(config?.fileTypePqcPolicies || config?.pqcPolicyByFileType || config?.pipelinePqcPolicyByFileType);
        for (const [ext, rawPolicy] of Object.entries(rawPolicyMap)) {
            const normalizedExts = this.normalizePolicyExtensions(ext);
            if (normalizedExts.length === 0) continue;

            if (typeof rawPolicy === 'string') {
                const level = this.parsePipelineLevel(rawPolicy);
                for (const normalizedExt of normalizedExts) {
                    policyMap.set(normalizedExt, {
                        level,
                        kemAlgorithm: this.kemAlgorithmForLevel(level),
                        signatureAlgorithms: this.signatureAlgorithmsForLevel(level),
                    });
                }
                continue;
            }

            if (!rawPolicy || typeof rawPolicy !== 'object' || Array.isArray(rawPolicy)) {
                continue;
            }

            const parsedPolicy = rawPolicy as Record<string, any>;
            const level = this.parsePipelineLevel(parsedPolicy.level || parsedPolicy.wrapLevel);
            const kemAlgorithm = this.normalizeKemAlgorithm(
                parsedPolicy.kemAlgorithm || parsedPolicy.kem,
                this.kemAlgorithmForLevel(level),
            );
            const signatureAlgorithms = Array.isArray(parsedPolicy.signatureAlgorithms)
                ? parsedPolicy.signatureAlgorithms.map((entry) => this.normalizeSignatureAlgorithm(entry)).filter(Boolean)
                : this.signatureAlgorithmsForLevel(level);

            for (const normalizedExt of normalizedExts) {
                policyMap.set(normalizedExt, {
                    level,
                    kemAlgorithm,
                    signatureAlgorithms: Array.from(new Set(signatureAlgorithms)),
                });
            }
        }

        return policyMap;
    }

    private getPolicyForFile(filePath: string, defaultPolicy: PipelinePolicy, fileTypePolicies: Map<string, PipelinePolicy>): PipelinePolicy {
        const lower = filePath.toLowerCase();
        const orderedExtensions = Array.from(fileTypePolicies.keys()).sort((a, b) => b.length - a.length);

        for (const extension of orderedExtensions) {
            if (lower.endsWith(extension)) {
                return fileTypePolicies.get(extension) || defaultPolicy;
            }
        }

        return defaultPolicy;
    }

    private collectRequiredSignatureAlgorithms(defaultPolicy: PipelinePolicy, fileTypePolicies: Map<string, PipelinePolicy>): string[] {
        const combined = new Set<string>(defaultPolicy.signatureAlgorithms);
        for (const policy of fileTypePolicies.values()) {
            for (const algorithm of policy.signatureAlgorithms) {
                combined.add(algorithm);
            }
        }
        return Array.from(combined.values());
    }

    private isKemCompatible(requestedAlgorithm: string, activeAlgorithm: string): boolean {
        const normalizedActive = this.normalizeKemAlgorithm(activeAlgorithm);
        return this.normalizeKemAlgorithm(requestedAlgorithm, normalizedActive) === normalizedActive;
    }

    private kemAlgorithmAliases(kemAlgorithm: string): string[] {
        const normalized = this.normalizeKemAlgorithm(kemAlgorithm);
        if (normalized === ML_KEM_512_ALGORITHM) {
            return [ML_KEM_512_ALGORITHM, 'KYBER-512', 'KYBER512'];
        }
        if (normalized === ML_KEM_768_ALGORITHM) {
            return [ML_KEM_768_ALGORITHM, 'KYBER-768', 'KYBER768'];
        }
        return [ML_KEM_1024_ALGORITHM, 'KYBER-1024', 'KYBER1024'];
    }

    private async resolveActiveKemAnchor(kemAlgorithm: string) {
        const normalized = this.normalizeKemAlgorithm(kemAlgorithm);
        return this.prisma.anchor.findFirst({
            where: {
                isActive: true,
                algorithm: {
                    in: this.kemAlgorithmAliases(normalized),
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    private async resolveSignatureAnchors(algorithms: string[]): Promise<Map<string, { id: string; name: string; algorithm: string; vaultPrivKeyPath: string }>> {
        const anchors = new Map<string, { id: string; name: string; algorithm: string; vaultPrivKeyPath: string }>();
        for (const algorithm of algorithms) {
            const anchor = await this.prisma.anchor.findFirst({
                where: {
                    isActive: true,
                    algorithm,
                },
                orderBy: { createdAt: 'desc' },
            });
            if (anchor) {
                anchors.set(algorithm, {
                    id: anchor.id,
                    name: anchor.name,
                    algorithm: anchor.algorithm,
                    vaultPrivKeyPath: anchor.vaultPrivKeyPath,
                });
            }
        }
        return anchors;
    }

    private async signDigestWithAlgorithm(digestHex: string, algorithm: string, privateKeyBytes: Uint8Array): Promise<string> {
        const messageBytes = new Uint8Array(Buffer.from(digestHex, 'hex'));

        if (algorithm === ML_DSA_65_ALGORITHM) {
            const signer = await getMlDsa65();
            const signature = await signer.sign(messageBytes, privateKeyBytes);
            return Buffer.from(signature).toString('base64');
        }

        if (algorithm === SLH_DSA_SHAKE_128S_ALGORITHM) {
            const signer = await getSlhDsaShake128s();
            const signature = await signer.sign(messageBytes, privateKeyBytes);
            return Buffer.from(signature).toString('base64');
        }

        throw new Error(`Unsupported signature algorithm: ${algorithm}`);
    }

    private async signDigestForPolicy(
        digestHex: string,
        signatureAlgorithms: string[],
        signatureAnchors: Map<string, { id: string; name: string; algorithm: string; vaultPrivKeyPath: string }>,
    ): Promise<Array<{ algorithm: string; anchorId: string; anchorName: string; signature: string }>> {
        const signatures: Array<{ algorithm: string; anchorId: string; anchorName: string; signature: string }> = [];

        for (const algorithm of signatureAlgorithms) {
            const anchor = signatureAnchors.get(algorithm);
            if (!anchor) {
                throw new Error(`Missing active anchor for signature algorithm ${algorithm}`);
            }

            const privateKeyRecord: any = await this.vaultService.read(anchor.vaultPrivKeyPath);
            const privateKeyB64 = privateKeyRecord?.data?.key || privateKeyRecord?.key;
            if (!privateKeyB64) {
                throw new Error(`Invalid private key payload at ${anchor.vaultPrivKeyPath}`);
            }

            const signature = await this.signDigestWithAlgorithm(
                digestHex,
                algorithm,
                new Uint8Array(Buffer.from(privateKeyB64, 'base64')),
            );

            signatures.push({
                algorithm,
                anchorId: anchor.id,
                anchorName: anchor.name,
                signature,
            });
        }

        return signatures;
    }

    private parseDate(value: any): Date | undefined {
        if (!value) return undefined;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return undefined;
        return date;
    }

    private parsePositiveInt(value: any, fallback: number): number {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
        return Math.floor(parsed);
    }

    private mapSourceDestinations(sourceDirs: string[], destinationDirs: string[]): Map<string, string> | null {
        if (destinationDirs.length === 1) {
            const map = new Map<string, string>();
            for (const source of sourceDirs) {
                map.set(source, destinationDirs[0]);
            }
            return map;
        }

        if (destinationDirs.length !== sourceDirs.length) {
            return null;
        }

        const map = new Map<string, string>();
        sourceDirs.forEach((source, index) => {
            map.set(source, destinationDirs[index]);
        });
        return map;
    }

    private buildDestinationPath(destDir: string, relativePath: string): string {
        const outputFile = `${path.basename(relativePath)}.pqc.json`;
        const outputDir = path.dirname(relativePath);
        return path.join(destDir, outputDir, outputFile);
    }

    private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
        const lower = filePath.toLowerCase();
        return excludePatterns.some((pattern) => lower.includes(pattern.toLowerCase()));
    }

    private fileMatchesExtensions(filePath: string, extensions: string[]): boolean {
        if (extensions.length === 0) return true;
        const lower = filePath.toLowerCase();
        return extensions.some((ext) => lower.endsWith(ext));
    }

    private fileWithinDateRange(stat: fs.Stats, minDate?: Date, maxDate?: Date): boolean {
        if (!minDate && !maxDate) return true;
        const birthTimeMs = stat.birthtimeMs && stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.mtimeMs;
        const fileDate = new Date(birthTimeMs);
        if (minDate && fileDate < minDate) return false;
        if (maxDate && fileDate > maxDate) return false;
        return true;
    }

    private async scanDirForPipeline(
        dir: string,
        options: {
            extensions: string[];
            excludePatterns: string[];
            minDate?: Date;
            maxDate?: Date;
            maxFiles?: number;
        }
    ): Promise<string[]> {
        let results: string[] = [];
        try {
            const list = await fs.promises.readdir(dir);
            for (const file of list) {
                if (options.maxFiles && results.length >= options.maxFiles) {
                    break;
                }

                const filePath = path.join(dir, file);

                if (this.shouldExclude(filePath, options.excludePatterns)) {
                    continue;
                }

                try {
                    const stat = await fs.promises.lstat(filePath);
                    if (stat.isSymbolicLink()) {
                        continue;
                    }

                    if (stat.isDirectory()) {
                        if (!file.startsWith('.')) {
                            const nested = await this.scanDirForPipeline(filePath, options);
                            results = results.concat(nested);
                        }
                    } else if (stat.isFile()) {
                        if (!this.fileMatchesExtensions(filePath, options.extensions)) {
                            continue;
                        }
                        if (!this.fileWithinDateRange(stat, options.minDate, options.maxDate)) {
                            continue;
                        }
                        results.push(filePath);
                    }
                } catch (err) {
                    // Ignore access errors
                }
            }
        } catch (e: any) {
            this.logger.error(`Error scanning ${dir}: ${e.message}`);
        }
        return results;
    }

    private async encryptBuffer(
        buffer: Buffer,
        kem: MlKem,
        anchorPublicKey: Buffer,
        aadContext: Record<string, unknown>,
        kemAlgorithm: string,
    ) {
        // Convert Buffer to Uint8Array for liboqs compatibility
        const publicKeyArray = new Uint8Array(anchorPublicKey);
        const { ciphertext: kemCiphertext, sharedSecret } = await kem.encapsulate(publicKeyArray);
        const salt = crypto.randomBytes(32);
        const symmetricKey = deriveAes256Key(sharedSecret, salt, kemAlgorithm);
        const nonce = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, nonce);
        cipher.setAAD(canonicalJsonBuffer(aadContext));
        const aeadCiphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const aeadTag = cipher.getAuthTag();
        return {
            kemCiphertext,
            salt,
            nonce,
            aeadCiphertext,
            aeadTag,
            aadSha256: canonicalJsonSha256Hex(aadContext),
        };
    }

    async getSystemHealth() {
        // In a real app, we'd check actual connections.
        return {
            vault: { status: 'online', latency: '4ms', version: '1.14.2' },
            blockchain: { status: 'online', peers: 12, height: 145023, sync: '99.9%' },
            database: { status: 'online', pool: '5/20', latency: '1ms' },
            aiEngine: { status: 'online', model: 'PQC-Detector-v2 (ML-KEM/ML-DSA)', load: '12%' }
        };
    }

    async getSystemLogs() {
        return [
            { id: 1, timestamp: new Date().toISOString(), action: 'LOGIN_SUCCESS', user: 'admin@dytallix.com', ip: '192.168.1.42', details: 'User logged in successfully' },
            { id: 2, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), action: 'CONFIG_UPDATE', user: 'admin@dytallix.com', ip: '192.168.1.42', details: 'Updated scan directory configuration' },
            { id: 3, timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), action: 'SCAN_COMPLETED', user: 'SYSTEM', ip: 'localhost', details: 'Scheduled scan completed. 24 assets found.' },
            { id: 4, timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), action: 'KEY_ROTATION', user: 'SYSTEM', ip: 'localhost', details: 'Automated rotation for Policy #POL-882' },
            { id: 5, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), action: 'LOGIN_FAILED', user: 'unknown', ip: '45.32.11.2', details: 'Invalid credentials provided' },
        ];
    }

    async getAlgoConfig() {
        return [
            { id: 'ml-kem-512', name: 'ML-KEM-512 (FIPS 203)', type: 'KEM', status: 'enabled', securityLevel: 1 },
            { id: 'ml-kem-768', name: 'ML-KEM-768 (FIPS 203)', type: 'KEM', status: 'enabled', securityLevel: 3 },
            { id: 'ml-kem-1024', name: 'ML-KEM-1024 (FIPS 203)', type: 'KEM', status: 'enabled', securityLevel: 5 },
            { id: 'ml-dsa-65', name: 'ML-DSA-65 (FIPS 204)', type: 'Signature', status: 'enabled', securityLevel: 3 },
            { id: 'slh-dsa-shake-128s', name: 'SLH-DSA-SHAKE-128s (FIPS 205)', type: 'Signature', status: 'warning', securityLevel: 5 },
            { id: 'rsa', name: 'RSA-2048', type: 'Legacy', status: 'disabled', securityLevel: 0 },
            { id: 'ecc', name: 'ECC-256', type: 'Legacy', status: 'warning', securityLevel: 1 },
        ];
    }

    async updateAlgoConfig(id: string, enabled: boolean) {
        this.logger.log(`Updating algo ${id} to ${enabled}`);
        return { success: true, id, status: enabled ? 'enabled' : 'disabled' };
    }
}
