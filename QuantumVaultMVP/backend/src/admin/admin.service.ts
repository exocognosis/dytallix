import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(private prisma: PrismaService) { }

    async saveScanConfig(config: any) {
        // Ideally update a SystemConfig table. For MVP, we simply log.
        this.logger.log('Saving scan config:', config);
        return { success: true, message: 'Configuration saved' };
    }

    async runDiscovery(config: any) {
        this.logger.log('Starting discovery with config:', config);

        // Parse config
        const directories = (config.directories || '').split('\n').map(d => d.trim()).filter(Boolean);
        const extensions = (config.fileTypes || '').split(',').map(e => e.trim().replace(/^\*/, '')); // e.g., ".pem"

        if (directories.length === 0) {
            return { success: false, message: 'No directories specified' };
        }

        const results = [];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                this.logger.warn(`Directory not found: ${dir}`);
                continue;
            }

            const files = await this.scanDir(dir, extensions);
            results.push(...files);
        }

        // Limit results for response
        const limitedResults = results.slice(0, 100);

        this.logger.log(`Discovery complete. Found ${results.length} files.`);

        return {
            success: true,
            message: `Discovery complete. Found ${results.length} potential assets.`,
            totalFound: results.length,
            files: limitedResults
        };
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

    async getSystemHealth() {
        // In a real app, we'd check actual connections.
        return {
            vault: { status: 'online', latency: '4ms', version: '1.14.2' },
            blockchain: { status: 'online', peers: 12, height: 145023, sync: '99.9%' },
            database: { status: 'online', pool: '5/20', latency: '1ms' },
            aiEngine: { status: 'online', model: 'Kyber-Detector-v2', load: '12%' }
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
            { id: 'kyber', name: 'Kyber-1024', type: 'KEM', status: 'enabled', securityLevel: 5 },
            { id: 'dilithium', name: 'Dilithium3', type: 'Signature', status: 'enabled', securityLevel: 3 },
            { id: 'sphincs', name: 'SPHINCS+', type: 'Signature', status: 'warning', securityLevel: 5 },
            { id: 'rsa', name: 'RSA-2048', type: 'Legacy', status: 'disabled', securityLevel: 0 },
            { id: 'ecc', name: 'ECC-256', type: 'Legacy', status: 'warning', securityLevel: 1 },
        ];
    }

    async updateAlgoConfig(id: string, enabled: boolean) {
        this.logger.log(`Updating algo ${id} to ${enabled}`);
        return { success: true, id, status: enabled ? 'enabled' : 'disabled' };
    }
}
