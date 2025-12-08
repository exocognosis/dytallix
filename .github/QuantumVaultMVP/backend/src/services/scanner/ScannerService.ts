import * as tls from 'tls';
import * as https from 'https';
import { URL } from 'url';
import { PrismaClient, AssetType, PqcCompliance, Environment, Exposure } from '@prisma/client';
import { RiskService } from '../risk/RiskService';

const prisma = new PrismaClient();
const riskService = new RiskService();

interface ScanResult {
    host: string;
    port: number;
    open: boolean;
    algorithm?: string;
    keySize?: number;
    protocol?: string;
    error?: string;
}

export class ScannerService {

    async scanTarget(targetUrl: string): Promise<ScanResult> {
        try {
            const url = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
            const host = url.hostname;
            const port = parseInt(url.port) || 443;

            return new Promise((resolve) => {
                const socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {
                    const cipher = socket.getCipher();
                    const cert = socket.getPeerCertificate();

                    socket.end();

                    resolve({
                        host,
                        port,
                        open: true,
                        algorithm: cipher.name, // e.g., 'TLS_AES_256_GCM_SHA384'
                        protocol: socket.getProtocol() || undefined, // e.g., 'TLSv1.3'
                        keySize: cert.pubkey ? cert.pubkey.length : 0 // heuristic if buffer
                    });
                });

                socket.on('error', (err) => {
                    resolve({ host, port, open: false, error: err.message });
                });

                socket.setTimeout(5000, () => {
                    socket.destroy();
                    resolve({ host, port, open: false, error: 'Timeout' });
                });
            });
        } catch (e: any) {
            return { host: targetUrl, port: 0, open: false, error: e.message || 'Unknown error' };
        }
    }

    // Main entry to run a scan job
    async runDiscoveryScan(scanId: string, targets: string[]) {
        console.log(`Starting scan ${scanId} for ${targets.length} targets.`);

        // Update status to RUNNING
        await prisma.scan.update({
            where: { id: scanId },
            data: { status: 'RUNNING' }
        });

        let scannedCount = 0;
        let nonPqcCount = 0;

        for (const target of targets) {
            const result = await this.scanTarget(target);
            scannedCount++;

            if (result.open && result.algorithm) {
                const isPqc = this.checkPqcCompliance(result.algorithm);
                if (!isPqc) nonPqcCount++;

                // Create/Update Asset
                await this.upsertAsset(target, result, isPqc);
            }
        }

        // Complete
        await prisma.scan.update({
            where: { id: scanId },
            data: {
                status: 'SUCCESS',
                completedAt: new Date(),
                numberOfAssetsScanned: scannedCount,
                numberOfNonPqcFound: nonPqcCount
            }
        });
    }

    checkPqcCompliance(algoName: string): boolean {
        // Simple heuristic for MVP: if it doesn't contain "KYBER" or "DILITHIUM" or similar, it's classic.
        const pqcKeywords = ['KYBER', 'DILITHIUM', 'FALCON', 'SPHINCS', 'ML-KEM', 'ML-DSA'];
        return pqcKeywords.some(kw => algoName.toUpperCase().includes(kw));
    }

    async upsertAsset(target: string, result: ScanResult, isPqc: boolean) {
        // Logic to find existing asset or create new
        // This is simplified. In prod, we'd use IP/Hostname resolution.

        const cryptoDetails = [{
            layer: 'TLS',
            algorithm: result.algorithm,
            protocol: result.protocol
        }];

        const asset = await prisma.asset.upsert({
            where: { name: result.host }, // Assuming name is unique for MVP simplicity or we'd use a composite
            create: {
                name: result.host,
                type: AssetType.API_ENDPOINT, // Heuristic
                location: `${result.host}:${result.port}`,
                environment: Environment.PROD, // Default
                cryptoAlgorithmsInUse: cryptoDetails as any,
                pqcCompliance: isPqc ? PqcCompliance.COMPLIANT : PqcCompliance.NON_COMPLIANT,
                status: isPqc ? 'WRAPPED_PQC' : 'AT_RISK', // Simplified state map
                exposure: Exposure.INTERNET_FACING
            },
            update: {
                cryptoAlgorithmsInUse: cryptoDetails as any,
                pqcCompliance: isPqc ? PqcCompliance.COMPLIANT : PqcCompliance.NON_COMPLIANT,
                lastScanTimestamp: new Date()
            }
        });

        // Recalculate Risk
        const { score, riskLevel } = riskService.calculateRiskScore(asset);
        await prisma.asset.update({
            where: { id: asset.id },
            data: { quantumRiskScore: score, riskLevel }
        });
        // We should also link to ScanAsset table here
    }
}
