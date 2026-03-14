import { PrismaService } from '../../database/prisma.service';
import { ML_KEM_1024_ALGORITHM } from '../../crypto/mlkem';
import { ML_DSA_65_ALGORITHM } from '../../crypto/mldsa';
import { AttestationService } from '../../attestation/attestation.service';
import { TransportService } from '../../transport/transport.service';
import { algorithmMeta, algorithmToId } from '../admin.algorithms';
import { toInputJsonValue } from '../admin.utils';

export class AdminKeyGovernanceOperations {
    constructor(
        private readonly prisma: PrismaService,
        private readonly attestationService: AttestationService,
        private readonly transportService: TransportService,
    ) { }

    private async writeGovernanceAudit(action: string, details: Record<string, unknown>) {
        await this.prisma.auditLog.create({
            data: {
                action,
                resource: 'KEY_GOVERNANCE',
                details: toInputJsonValue(details),
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

    async getAlgoConfig() {
        const [keyGovernanceStatus, anchors] = await Promise.all([
            this.getKeyGovernanceStatus(),
            this.prisma.anchor.findMany({
                select: {
                    id: true,
                    algorithm: true,
                    isActive: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const byAlgorithm = new Map<string, {
            governanceActive: boolean;
            activeAnchors: number;
            totalAnchors: number;
        }>();

        const markGovernance = (algorithm: string, isActive: boolean) => {
            const meta = algorithmMeta(algorithm);
            const current = byAlgorithm.get(meta.canonical) || { governanceActive: false, activeAnchors: 0, totalAnchors: 0 };
            current.governanceActive = current.governanceActive || isActive;
            byAlgorithm.set(meta.canonical, current);
        };

        markGovernance(ML_DSA_65_ALGORITHM, Boolean(keyGovernanceStatus?.attestation?.signerKeyId));
        markGovernance(ML_KEM_1024_ALGORITHM, Boolean(keyGovernanceStatus?.transport?.kem?.keyId));
        markGovernance(ML_DSA_65_ALGORITHM, Boolean(keyGovernanceStatus?.transport?.identity?.keyId));

        for (const anchor of anchors) {
            const meta = algorithmMeta(anchor.algorithm);
            const current = byAlgorithm.get(meta.canonical) || { governanceActive: false, activeAnchors: 0, totalAnchors: 0 };
            current.totalAnchors += 1;
            if (anchor.isActive) {
                current.activeAnchors += 1;
            }
            byAlgorithm.set(meta.canonical, current);
        }

        return Array.from(byAlgorithm.entries())
            .map(([algorithm, signal]) => {
                const meta = algorithmMeta(algorithm);
                const status = signal.governanceActive || signal.activeAnchors > 0
                    ? 'enabled'
                    : signal.totalAnchors > 0
                        ? 'disabled'
                        : 'warning';

                return {
                    id: algorithmToId(meta.canonical),
                    name: meta.name,
                    type: meta.type,
                    status,
                    securityLevel: meta.securityLevel,
                    activeAnchors: signal.activeAnchors,
                    totalAnchors: signal.totalAnchors,
                    manageable: signal.totalAnchors > 0,
                };
            })
            .sort((a, b) => {
                if (b.securityLevel !== a.securityLevel) {
                    return b.securityLevel - a.securityLevel;
                }
                return a.name.localeCompare(b.name);
            });
    }

    async updateAlgoConfig(id: string, enabled: boolean) {
        const anchors = await this.prisma.anchor.findMany({
            select: {
                id: true,
                algorithm: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const matchingAnchors = anchors.filter((anchor) => {
            const canonical = algorithmMeta(anchor.algorithm).canonical;
            return algorithmToId(canonical) === id;
        });

        if (matchingAnchors.length === 0) {
            return {
                success: false,
                id,
                status: 'warning',
                message: 'Algorithm is governance-managed and not directly toggleable from anchor state.',
            };
        }

        if (enabled) {
            const firstInactive = matchingAnchors.find((anchor) => !anchor.isActive);
            if (firstInactive) {
                await this.prisma.anchor.update({
                    where: { id: firstInactive.id },
                    data: { isActive: true },
                });
            }
        } else {
            const activeIds = matchingAnchors.filter((anchor) => anchor.isActive).map((anchor) => anchor.id);
            if (activeIds.length > 0) {
                await this.prisma.anchor.updateMany({
                    where: { id: { in: activeIds } },
                    data: { isActive: false },
                });
            }
        }

        await this.writeGovernanceAudit('ALGORITHM_STATUS_UPDATE', {
            algorithmId: id,
            enabled,
            affectedAnchors: matchingAnchors.length,
            performedAt: new Date().toISOString(),
        });

        const refreshed = await this.getAlgoConfig();
        const updated = refreshed.find((algo) => algo.id === id);

        return {
            success: true,
            id,
            status: updated?.status || (enabled ? 'enabled' : 'disabled'),
        };
    }
}
