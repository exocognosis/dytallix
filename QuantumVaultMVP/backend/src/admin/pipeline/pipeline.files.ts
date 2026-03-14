import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { buildDiscoveryManifestEntry } from './pipeline.domain';

export type LoadedManifest = {
    entries: Map<string, any>;
    sha256: string;
};

export type PipelineScanOptions = {
    extensions: string[];
    excludePatterns: string[];
    minDate?: Date;
    maxDate?: Date;
    maxFiles?: number;
    maxFileSizeBytes?: number;
};

export class PipelineFilesHelper {
    private readonly logger = new Logger(PipelineFilesHelper.name);

    parseLineList(value: string): string[] {
        return (value || '')
            .split('\n')
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    parseCommaList(value: string): string[] {
        return (value || '')
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    parseDate(value: any): Date | undefined {
        if (!value) return undefined;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return undefined;
        return date;
    }

    parseRequiredPositiveInt(value: any, fieldName: string): number {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new Error(`${fieldName} must be a positive number.`);
        }
        return Math.floor(parsed);
    }

    mapSourceDestinations(sourceDirs: string[], destinationDirs: string[]): Map<string, string> | null {
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

    buildDestinationPath(destDir: string, relativePath: string): string {
        const outputFile = `${path.basename(relativePath)}.pqc.json`;
        const outputDir = path.dirname(relativePath);
        return path.join(destDir, outputDir, outputFile);
    }

    async writeManifestForFiles(sourceDir: string, filePaths: string[]): Promise<number> {
        const manifestEntries: string[] = [];

        for (const filePath of filePaths) {
            if (filePath.toLowerCase().endsWith('.pqc.json') || filePath.toLowerCase().endsWith('.meta.json')) {
                continue;
            }

            const relativePath = path.relative(sourceDir, filePath);
            const stat = await fs.promises.stat(filePath);
            const fileBuffer = await fs.promises.readFile(filePath);
            const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            manifestEntries.push(
                JSON.stringify(buildDiscoveryManifestEntry(relativePath, stat.size, sha256)),
            );
        }

        const manifestContent = manifestEntries.join('\n') + (manifestEntries.length ? '\n' : '');
        const manifestPath = path.join(sourceDir, 'manifest.jsonl');
        const manifestSha = crypto.createHash('sha256').update(manifestContent).digest('hex');
        const shaPath = path.join(sourceDir, 'manifest.sha256');

        await fs.promises.writeFile(manifestPath, manifestContent, 'utf8');
        await fs.promises.writeFile(shaPath, manifestSha, 'utf8');

        return manifestEntries.length;
    }

    async generateManifestForPipeline(sourceDir: string, extensions: string[]): Promise<boolean> {
        try {
            if (!fs.existsSync(sourceDir)) {
                return false;
            }

            const files = await this.scanDirForPipeline(sourceDir, {
                extensions,
                excludePatterns: ['node_modules', '.git'],
            });

            const entryCount = await this.writeManifestForFiles(sourceDir, files);
            this.logger.log(`Auto-generated manifest for ${sourceDir} with ${entryCount} entries`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to auto-generate manifest for ${sourceDir}: ${error?.message || error}`);
            return false;
        }
    }

    async loadManifest(sourceRoot: string, verifySha: boolean): Promise<LoadedManifest> {
        const manifestPath = path.join(sourceRoot, 'manifest.jsonl');
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Manifest not found at ${manifestPath}. Run "Discovery" first to auto-generate the manifest.`);
        }

        const data = await fs.promises.readFile(manifestPath, 'utf8');
        const entries = new Map<string, any>();
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
                const entry = JSON.parse(trimmed);
                const relativePath = typeof entry.relative_path === 'string' ? entry.relative_path : '';
                if (relativePath) {
                    entries.set(relativePath, entry);
                }
            } catch {
                // Ignore malformed lines.
            }
        }

        return { entries, sha256: manifestSha };
    }

    async loadSidecarMetadata(filePath: string): Promise<Record<string, any>> {
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
        } catch {
            return {};
        }
        return {};
    }

    async scanDirForPipeline(dir: string, options: PipelineScanOptions): Promise<string[]> {
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
                        if (options.maxFileSizeBytes && stat.size > options.maxFileSizeBytes) {
                            continue;
                        }
                        results.push(filePath);
                    }
                } catch {
                    // Ignore access errors.
                }
            }
        } catch (error: any) {
            this.logger.error(`Error scanning ${dir}: ${error.message}`);
        }
        return results;
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
        } catch {
            return '';
        }
    }

    private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
        const lower = filePath.toLowerCase();
        return excludePatterns.some((pattern) => lower.includes(pattern.toLowerCase()));
    }

    private fileMatchesExtensions(filePath: string, extensions: string[]): boolean {
        if (extensions.length === 0) return true;
        const lower = filePath.toLowerCase();
        return extensions.some((extension) => lower.endsWith(extension));
    }

    private fileWithinDateRange(stat: fs.Stats, minDate?: Date, maxDate?: Date): boolean {
        if (!minDate && !maxDate) return true;
        const birthTimeMs = stat.birthtimeMs && stat.birthtimeMs > 0 ? stat.birthtimeMs : stat.mtimeMs;
        const fileDate = new Date(birthTimeMs);
        if (minDate && fileDate < minDate) return false;
        if (maxDate && fileDate > maxDate) return false;
        return true;
    }
}
