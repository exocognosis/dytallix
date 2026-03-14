import { Logger } from '@nestjs/common';
import {
    kemAlgorithmForLevel,
    normalizeKemAlgorithm,
    normalizeSignatureAlgorithm,
    parsePipelineLevel,
    signatureAlgorithmsForLevel,
} from '../admin.algorithms';
import {
    PipelineMetadataOverride,
    PipelinePolicy,
} from '../admin.types';
import { parseJsonObject } from '../admin.utils';

export class PipelinePolicyHelper {
    private readonly logger = new Logger(PipelinePolicyHelper.name);

    resolvePipelineExtensions(config: any): string[] {
        const fileTypes = this.normalizeExtensions(this.parseCommaList(config.fileTypes || ''));

        const formatValue = typeof config?.formats === 'string' ? config.formats : '';
        const formats = this.parseCommaList(formatValue).map((entry) => entry.toLowerCase());
        const formatExtensions = this.normalizeExtensions(this.extensionsFromFormats(formats));

        const combined = Array.from(new Set([...fileTypes, ...formatExtensions]));

        this.logger.log(
            `Pipeline extensions resolved: ${combined.join(', ')} (from fileTypes: ${fileTypes.join(', ')}, formats: ${formatExtensions.join(', ')})`,
        );

        return combined;
    }

    resolvePipelinePolicy(config: any): PipelinePolicy {
        const level = parsePipelineLevel(config?.defaultPqcLevel || config?.pqcLevel || 'enhanced');
        const kemAlgorithm = normalizeKemAlgorithm(
            config?.kemAlgorithm || config?.defaultKemAlgorithm,
            kemAlgorithmForLevel(level),
        );

        let signatureAlgorithms = signatureAlgorithmsForLevel(level);
        const customSignatures = this.parseCommaList(String(config?.signatureAlgorithms || config?.defaultSignatureAlgorithms || ''));
        if (customSignatures.length > 0) {
            signatureAlgorithms = customSignatures
                .map((entry) => normalizeSignatureAlgorithm(entry))
                .filter(Boolean);
        }

        return {
            level,
            kemAlgorithm,
            signatureAlgorithms: Array.from(new Set(signatureAlgorithms)),
        };
    }

    resolveFileTypePolicies(config: any): Map<string, PipelinePolicy> {
        const policyMap = new Map<string, PipelinePolicy>();

        const rawLevelMap = parseJsonObject(config?.fileTypePqcLevels || config?.pqcLevelByFileType || config?.pipelineLevelByFileType);
        for (const [extension, rawLevel] of Object.entries(rawLevelMap)) {
            const level = parsePipelineLevel(rawLevel);
            const normalizedExtensions = this.normalizePolicyExtensions(extension);
            for (const normalizedExtension of normalizedExtensions) {
                policyMap.set(normalizedExtension, {
                    level,
                    kemAlgorithm: kemAlgorithmForLevel(level),
                    signatureAlgorithms: signatureAlgorithmsForLevel(level),
                });
            }
        }

        const rawPolicyMap = parseJsonObject(config?.fileTypePqcPolicies || config?.pqcPolicyByFileType || config?.pipelinePqcPolicyByFileType);
        for (const [extension, rawPolicy] of Object.entries(rawPolicyMap)) {
            const normalizedExtensions = this.normalizePolicyExtensions(extension);
            if (normalizedExtensions.length === 0) continue;

            if (typeof rawPolicy === 'string') {
                const level = parsePipelineLevel(rawPolicy);
                for (const normalizedExtension of normalizedExtensions) {
                    policyMap.set(normalizedExtension, {
                        level,
                        kemAlgorithm: kemAlgorithmForLevel(level),
                        signatureAlgorithms: signatureAlgorithmsForLevel(level),
                    });
                }
                continue;
            }

            if (!rawPolicy || typeof rawPolicy !== 'object' || Array.isArray(rawPolicy)) {
                continue;
            }

            const parsedPolicy = rawPolicy as Record<string, any>;
            const level = parsePipelineLevel(parsedPolicy.level || parsedPolicy.wrapLevel);
            const kemAlgorithm = normalizeKemAlgorithm(
                parsedPolicy.kemAlgorithm || parsedPolicy.kem,
                kemAlgorithmForLevel(level),
            );
            const signatureAlgorithms = Array.isArray(parsedPolicy.signatureAlgorithms)
                ? parsedPolicy.signatureAlgorithms.map((entry) => normalizeSignatureAlgorithm(entry)).filter(Boolean)
                : signatureAlgorithmsForLevel(level);

            for (const normalizedExtension of normalizedExtensions) {
                policyMap.set(normalizedExtension, {
                    level,
                    kemAlgorithm,
                    signatureAlgorithms: Array.from(new Set(signatureAlgorithms)),
                });
            }
        }

        return policyMap;
    }

    resolveAssetTypeMetadata(config: any): Map<string, PipelineMetadataOverride> {
        const metadataMap = new Map<string, PipelineMetadataOverride>();
        const rawMetadataByExtension = parseJsonObject(config?.assetTypeMetadata || config?.metadataByExtension);

        for (const [extension, rawValue] of Object.entries(rawMetadataByExtension)) {
            if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
                continue;
            }

            const parsed = rawValue as Record<string, unknown>;
            const override: PipelineMetadataOverride = {
                dataDomain: this.normalizeMetadataValue(parsed.dataDomain) || this.normalizeMetadataValue(parsed.data_domain),
                retentionTag: this.normalizeMetadataValue(parsed.retentionTag) || this.normalizeMetadataValue(parsed.retention_tag),
                owner: this.normalizeMetadataValue(parsed.owner) || this.normalizeMetadataValue(parsed.businessOwner) || this.normalizeMetadataValue(parsed.business_owner),
            };

            if (!override.dataDomain && !override.retentionTag && !override.owner) {
                continue;
            }

            const normalizedExtensions = this.normalizePolicyExtensions(extension);
            for (const normalizedExtension of normalizedExtensions) {
                metadataMap.set(normalizedExtension, override);
            }
        }

        return metadataMap;
    }

    resolveMetadataOverrideForFile(
        filePath: string,
        metadataOverrides: Map<string, PipelineMetadataOverride>,
    ): PipelineMetadataOverride | null {
        if (metadataOverrides.size === 0) {
            return null;
        }

        const lower = filePath.toLowerCase();
        const orderedExtensions = Array.from(metadataOverrides.keys()).sort((a, b) => b.length - a.length);

        for (const extension of orderedExtensions) {
            if (lower.endsWith(extension)) {
                return metadataOverrides.get(extension) || null;
            }
        }

        return null;
    }

    getPolicyForFile(
        filePath: string,
        defaultPolicy: PipelinePolicy,
        fileTypePolicies: Map<string, PipelinePolicy>,
    ): PipelinePolicy {
        const lower = filePath.toLowerCase();
        const orderedExtensions = Array.from(fileTypePolicies.keys()).sort((a, b) => b.length - a.length);

        for (const extension of orderedExtensions) {
            if (lower.endsWith(extension)) {
                return fileTypePolicies.get(extension) || defaultPolicy;
            }
        }

        return defaultPolicy;
    }

    collectRequiredSignatureAlgorithms(
        defaultPolicy: PipelinePolicy,
        fileTypePolicies: Map<string, PipelinePolicy>,
    ): string[] {
        const combined = new Set<string>(defaultPolicy.signatureAlgorithms);
        for (const policy of fileTypePolicies.values()) {
            for (const algorithm of policy.signatureAlgorithms) {
                combined.add(algorithm);
            }
        }
        return Array.from(combined.values());
    }

    isKemCompatible(requestedAlgorithm: string, activeAlgorithm: string): boolean {
        const normalizedActive = normalizeKemAlgorithm(activeAlgorithm);
        return normalizeKemAlgorithm(requestedAlgorithm, normalizedActive) === normalizedActive;
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

    private extensionsFromFormats(formats: string[]): string[] {
        if (!formats.length) return [];
        const extensions: string[] = [];

        const push = (...nextExtensions: string[]) => extensions.push(...nextExtensions);

        for (const format of formats) {
            if (format.includes('parquet')) push('.parquet');
            if (format === 'csv' || format.includes('csv')) push('.csv');
            if (format === 'json' || format.includes('json')) push('.json');
            if (format === 'txt' || format.includes('txt')) push('.txt');
            if (format === 'pdf' || format.includes('pdf')) push('.pdf');
            if (format.includes('png')) push('.png');
            if (format.includes('jpeg') || format.includes('jpg')) push('.jpeg', '.jpg');
            if (format.includes('tiff') || format.includes('tif')) push('.tiff', '.tif');
            if (format.includes('bin')) push('.bin');
            if (format.includes('dicom')) push('.dcm', '.dicom');
            if (format.includes('fasta')) push('.fasta', '.fa', '.fna', '.ffn', '.faa', '.frn');
            if (format.includes('vcf')) push('.vcf');
            if (format.includes('gz')) push('.gz');
        }

        if (extensions.includes('.gz')) {
            push('.fasta.gz', '.fa.gz', '.fna.gz', '.ffn.gz', '.faa.gz', '.frn.gz', '.vcf.gz');
        }

        return extensions;
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

    private normalizeMetadataValue(value: unknown): string | undefined {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
}
