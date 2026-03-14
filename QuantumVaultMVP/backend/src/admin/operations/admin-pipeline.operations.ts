import { Logger } from '@nestjs/common';
import {
    PipelineRunStatus,
} from '@prisma/client';
import * as fs from 'fs';
import { MlKem } from '../../crypto/mlkem';
import { PrismaService } from '../../database/prisma.service';
import { ObjectStorageService } from '../../storage/object-storage.service';
import { VaultService } from '../../vault/vault.service';
import {
    AdminActor,
    PipelinePolicy,
} from '../admin.types';
import { toInputJsonValue } from '../admin.utils';
import {
    PipelineCryptoHelper,
} from '../pipeline/pipeline.crypto';
import {
    LoadedManifest,
    PipelineFilesHelper,
} from '../pipeline/pipeline.files';
import {
    PipelineAssetProcessor,
    PipelineRunResult,
} from '../pipeline/pipeline.asset-processor';
import { PipelinePolicyHelper } from '../pipeline/pipeline.policy';
import { AdminControlsOperations } from './admin-controls.operations';

export class AdminPipelineOperations {
    private readonly logger = new Logger(AdminPipelineOperations.name);
    private readonly filesHelper = new PipelineFilesHelper();
    private readonly policyHelper = new PipelinePolicyHelper();
    private readonly cryptoHelper: PipelineCryptoHelper;
    private readonly assetProcessor: PipelineAssetProcessor;

    constructor(
        private readonly prisma: PrismaService,
        vaultService: VaultService,
        private readonly objectStorageService: ObjectStorageService,
        private readonly controlsOperations: AdminControlsOperations,
    ) {
        this.cryptoHelper = new PipelineCryptoHelper(prisma, vaultService);
        this.assetProcessor = new PipelineAssetProcessor(
            prisma,
            objectStorageService,
            this.filesHelper,
            this.policyHelper,
            this.cryptoHelper,
        );
    }

    async runDiscovery(config: any, actor?: AdminActor) {
        this.logger.log('Starting discovery with config:', config);
        try {
            await this.controlsOperations.assertSystemControlDisabled(
                'pausePipelineWrites',
                'Pipeline write operations are currently paused by administrator control.',
            );

            const directories = this.filesHelper.parseLineList(
                config.originDatabase || config.sourceDirectories || config.directories || '',
            );
            const extensions = this.policyHelper.resolvePipelineExtensions(config);
            const minDate = this.filesHelper.parseDate(config.minDate);
            const maxDate = this.filesHelper.parseDate(config.maxDate);
            const maxFiles = this.filesHelper.parseRequiredPositiveInt(config.maxFiles, 'Max files');
            const maxFileSizeBytes = this.filesHelper.parseRequiredPositiveInt(config.maxFileSizeBytes, 'Max file size');
            const excludePatterns = this.filesHelper.parseCommaList(config.excludePatterns || '').concat(['node_modules', '.git']);
            const riskRule = await this.controlsOperations.ensureAdminRiskRuleRecord();

            if (maxFiles > riskRule.maxAssetsPerRun) {
                return {
                    success: false,
                    message: `maxFiles (${maxFiles}) exceeds configured maxAssetsPerRun (${riskRule.maxAssetsPerRun}). Update Admin Risk Rules or lower run size.`,
                };
            }

            if (directories.length === 0) {
                return { success: false, message: 'No directories specified' };
            }

            if (minDate && maxDate && minDate.getTime() > maxDate.getTime()) {
                return { success: false, message: 'Creation date range is invalid. Start date must be before end date.' };
            }

            const results: string[] = [];
            const manifestsGenerated: string[] = [];

            for (const dir of directories) {
                if (results.length >= maxFiles) {
                    break;
                }

                if (!fs.existsSync(dir)) {
                    this.logger.warn(`Directory not found: ${dir}`);
                    continue;
                }

                const remaining = Math.max(maxFiles - results.length, 0);
                const files = await this.filesHelper.scanDirForPipeline(dir, {
                    extensions,
                    excludePatterns,
                    minDate,
                    maxDate,
                    maxFiles: remaining,
                    maxFileSizeBytes,
                });
                results.push(...files);

                try {
                    const entryCount = await this.filesHelper.writeManifestForFiles(dir, files);
                    if (entryCount > 0) {
                        manifestsGenerated.push(dir);
                        this.logger.log(`Generated manifest for ${dir} with ${entryCount} entries`);
                    }
                } catch (error: any) {
                    this.logger.error(`Failed to generate manifest for ${dir}: ${error?.message || error}`);
                }
            }

            const manifestMsg = manifestsGenerated.length > 0
                ? ` Manifests generated for: ${manifestsGenerated.join(', ')}`
                : '';

            this.logger.log(`Discovery complete. Found ${results.length} files.`);

            return {
                success: true,
                message: `Discovery complete. Found ${results.length} potential assets.${manifestMsg}`,
                totalFound: results.length,
                manifestsGenerated,
                files: results.slice(0, 100),
                evaluatedBy: actor?.email || null,
            };
        } catch (error: any) {
            this.logger.error(`Discovery failed: ${error?.message || error}`);
            return {
                success: false,
                message: error?.message || 'Discovery failed. Check server logs for details.',
                error: error?.message || 'discovery_error',
            };
        }
    }

    async runPqcPipeline(config: any, actor?: AdminActor) {
        this.logger.log('Starting PQC pipeline with config:', config);
        try {
            await this.controlsOperations.assertSystemControlDisabled(
                'pausePipelineWrites',
                'Pipeline write operations are currently paused by administrator control.',
            );

            const sourceDirectories = this.filesHelper.parseLineList(
                config.originDatabase || config.sourceDirectories || config.directories || '',
            );
            const destinationDirectories = this.filesHelper.parseLineList(
                config.destinationDatabase || config.destinationDirectories || '',
            );

            if (sourceDirectories.length === 0) {
                return { success: false, message: 'No source directories specified' };
            }

            if (destinationDirectories.length === 0) {
                return { success: false, message: 'No destination directories specified' };
            }

            const sourceToDest = this.filesHelper.mapSourceDestinations(sourceDirectories, destinationDirectories);
            if (!sourceToDest) {
                return { success: false, message: 'Destination directory mapping invalid. Provide 1 destination or match source count.' };
            }

            const extensions = this.policyHelper.resolvePipelineExtensions(config);
            const excludePatterns = this.filesHelper.parseCommaList(config.excludePatterns || '').concat(['node_modules', '.git']);
            const defaultPolicy = this.policyHelper.resolvePipelinePolicy(config);
            const fileTypePolicies = this.policyHelper.resolveFileTypePolicies(config);
            const metadataOverrides = this.policyHelper.resolveAssetTypeMetadata(config);
            const requiredSignatureAlgorithms = this.policyHelper.collectRequiredSignatureAlgorithms(
                defaultPolicy,
                fileTypePolicies,
            );
            const minDate = this.filesHelper.parseDate(config.minDate);
            const maxDate = this.filesHelper.parseDate(config.maxDate);
            const maxFiles = this.filesHelper.parseRequiredPositiveInt(config.maxFiles, 'Max files');
            const maxFileSizeBytes = this.filesHelper.parseRequiredPositiveInt(config.maxFileSizeBytes, 'Max file size');
            const riskRule = await this.controlsOperations.ensureAdminRiskRuleRecord();

            if (maxFiles > riskRule.maxAssetsPerRun) {
                return {
                    success: false,
                    message: `maxFiles (${maxFiles}) exceeds configured maxAssetsPerRun (${riskRule.maxAssetsPerRun}). Update Admin Risk Rules or lower run size.`,
                };
            }

            const operationRiskScore = Math.min(
                100,
                Math.round((maxFiles / Math.max(riskRule.maxAssetsPerRun, 1)) * 100),
            );
            const operationRiskLevel = this.controlsOperations.deriveRiskLevelFromScore(operationRiskScore);
            const approvalGate = await this.controlsOperations.createOrRequireApproval({
                operationType: 'PIPELINE_TRANSFER',
                resourceType: 'PIPELINE_RUN',
                resourceId: null,
                riskScore: operationRiskScore,
                riskLevel: operationRiskLevel,
                reason: `Pipeline transfer requested with maxFiles=${maxFiles}, riskScore=${operationRiskScore}, riskLevel=${operationRiskLevel}.`,
                requestContext: {
                    maxFiles,
                    maxAssetsPerRun: riskRule.maxAssetsPerRun,
                    sourceDirectories,
                    destinationDirectories,
                },
                actor,
            });
            if (!approvalGate.allowed) {
                return {
                    success: false,
                    message: approvalGate.message,
                    approvalId: approvalGate.approvalId,
                };
            }

            if (minDate && maxDate && minDate.getTime() > maxDate.getTime()) {
                return { success: false, message: 'Creation date range is invalid. Start date must be before end date.' };
            }

            const activeAnchor = await this.cryptoHelper.resolveActiveKemAnchor(defaultPolicy.kemAlgorithm);
            if (!activeAnchor) {
                return {
                    success: false,
                    message: `No active ${defaultPolicy.kemAlgorithm} anchor found. Create an active KEM anchor before running pipeline.`,
                };
            }

            const signatureAnchors = await this.cryptoHelper.resolveSignatureAnchors(requiredSignatureAlgorithms);
            const missingSigners = requiredSignatureAlgorithms.filter((algorithm) => !signatureAnchors.has(algorithm));
            if (missingSigners.length > 0) {
                return {
                    success: false,
                    message: `Missing active signature anchors for: ${missingSigners.join(', ')}. Create and activate signer anchors before running selected policy levels.`,
                };
            }

            const run = await this.prisma.pipelineRun.create({
                data: {
                    status: PipelineRunStatus.IN_PROGRESS,
                    sourceRoots: sourceDirectories,
                    destinationRoots: destinationDirectories,
                    startedAt: new Date(),
                },
            });

            const results: PipelineRunResult[] = [];
            const kemPublicKeyCache = new Map<string, Buffer>();
            const kemByAlgorithmCache = new Map<string, MlKem>();
            const manifestShaBySource: Record<string, string> = {};
            const verifyManifestSha = Boolean(config?.verifyManifestSha);

            let totalFound = 0;
            let processed = 0;
            let skipped = 0;
            let failed = 0;

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

                let loadedManifest: LoadedManifest | null = null;
                try {
                    loadedManifest = await this.filesHelper.loadManifest(sourceDir, verifyManifestSha);
                } catch (error: any) {
                    this.logger.warn(
                        `Manifest load failed for ${sourceDir}: ${error?.message || error}. Attempting auto-generation.`,
                    );
                    const generated = await this.filesHelper.generateManifestForPipeline(sourceDir, extensions);
                    if (!generated) {
                        this.logger.error(`Manifest auto-generation failed for ${sourceDir}`);
                        results.push({ source: sourceDir, status: 'failed', reason: 'manifest_load_failed' });
                        failed += 1;
                        continue;
                    }

                    try {
                        loadedManifest = await this.filesHelper.loadManifest(sourceDir, verifyManifestSha);
                    } catch (retryError: any) {
                        this.logger.error(`Manifest reload failed for ${sourceDir}: ${retryError?.message || retryError}`);
                        results.push({ source: sourceDir, status: 'failed', reason: 'manifest_load_failed' });
                        failed += 1;
                        continue;
                    }
                }

                if (!loadedManifest) {
                    results.push({ source: sourceDir, status: 'failed', reason: 'manifest_load_failed' });
                    failed += 1;
                    continue;
                }

                manifestShaBySource[sourceDir] = loadedManifest.sha256;
                await this.prisma.pipelineRun.update({
                    where: { id: run.id },
                    data: { manifestSha: toInputJsonValue(manifestShaBySource) },
                });

                const files = await this.filesHelper.scanDirForPipeline(sourceDir, {
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
                        const pipelineResult = await this.assetProcessor.processFile({
                            runId: run.id,
                            sourceDir,
                            destDir,
                            filePath,
                            maxFileSizeBytes,
                            loadedManifest,
                            defaultPolicy,
                            fileTypePolicies,
                            metadataOverrides,
                            activeAnchor,
                            signatureAnchors,
                            kemPublicKeyCache,
                            kemByAlgorithmCache,
                        });

                        results.push(pipelineResult.result);
                        if (pipelineResult.result.status === 'processed') {
                            processed += 1;
                        } else {
                            skipped += 1;
                        }
                    } catch (error: any) {
                        failed += 1;
                        results.push({
                            source: filePath,
                            status: 'failed',
                            reason: error?.message || 'pipeline_error',
                        });
                        await this.assetProcessor.recordFailedAsset(
                            run.id,
                            sourceDir,
                            filePath,
                            error?.message || 'pipeline_error',
                        );
                    }
                }
            }

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

            return {
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
                evaluatedRisk: {
                    score: operationRiskScore,
                    level: operationRiskLevel,
                    maxAssetsPerRun: riskRule.maxAssetsPerRun,
                },
                runId: run.id,
                results: results.slice(0, 100),
            };
        } catch (error: any) {
            this.logger.error(`PQC pipeline failed: ${error?.message || error}`);
            return {
                success: false,
                message: error?.message || 'PQC pipeline failed. Check server logs for details.',
                error: error?.message || 'pipeline_error',
            };
        }
    }
}
