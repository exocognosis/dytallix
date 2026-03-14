import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttestationService } from '../attestation/attestation.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../database/prisma.service';
import { MonitoringService } from '../monitoring/monitoring.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { TransportService } from '../transport/transport.service';
import { VaultService } from '../vault/vault.service';
import { AdminActor } from './admin.types';
import { AdminAccessOperations } from './operations/admin-access.operations';
import { AdminControlsOperations } from './operations/admin-controls.operations';
import { AdminDiagnosticsOperations } from './operations/admin-diagnostics.operations';
import { AdminKeyGovernanceOperations } from './operations/admin-key-governance.operations';
import { AdminPipelineOperations } from './operations/admin-pipeline.operations';

@Injectable()
export class AdminService {
    private readonly controlsOperations: AdminControlsOperations;
    private readonly accessOperations: AdminAccessOperations;
    private readonly keyGovernanceOperations: AdminKeyGovernanceOperations;
    private readonly pipelineOperations: AdminPipelineOperations;
    private readonly diagnosticsOperations: AdminDiagnosticsOperations;

    constructor(
        prisma: PrismaService,
        vaultService: VaultService,
        blockchainService: BlockchainService,
        configService: ConfigService,
        attestationService: AttestationService,
        transportService: TransportService,
        objectStorageService: ObjectStorageService,
        monitoringService: MonitoringService,
    ) {
        this.controlsOperations = new AdminControlsOperations(prisma);
        this.accessOperations = new AdminAccessOperations(prisma);
        this.keyGovernanceOperations = new AdminKeyGovernanceOperations(
            prisma,
            attestationService,
            transportService,
        );
        this.pipelineOperations = new AdminPipelineOperations(
            prisma,
            vaultService,
            objectStorageService,
            this.controlsOperations,
        );
        this.diagnosticsOperations = new AdminDiagnosticsOperations(
            prisma,
            vaultService,
            blockchainService,
            configService,
            monitoringService,
            objectStorageService,
            this.accessOperations,
        );
    }

    async saveScanConfig(config: any) {
        return this.controlsOperations.saveScanConfig(config);
    }

    async getSystemControls() {
        return this.controlsOperations.getSystemControls();
    }

    async setSystemControl(
        input: {
            controlKey: string;
            enabled: boolean;
            reason?: string;
        },
        actor?: AdminActor,
    ) {
        return this.controlsOperations.setSystemControl(input, actor);
    }

    async getRiskRules() {
        return this.controlsOperations.getRiskRules();
    }

    async setRiskRules(
        input: {
            maxRiskScoreAutoApprove: number;
            requireApprovalAtRiskLevel: string;
            maxAssetsPerRun: number;
        },
        actor?: AdminActor,
    ) {
        return this.controlsOperations.setRiskRules(input, actor);
    }

    async clearRiskRules(actor?: AdminActor) {
        return this.controlsOperations.clearRiskRules(actor);
    }

    async getUsers(search?: string) {
        return this.controlsOperations.getUsers(search);
    }

    async listServiceAccounts(search?: string) {
        return this.accessOperations.listServiceAccounts(search);
    }

    async createServiceAccount(
        input: {
            displayName: string;
            clientId?: string;
            description?: string;
            role?: string;
            clearanceLevel?: string;
            department?: string;
            projectMemberships?: string[];
            allowedNetworkZones?: string[];
        },
        actor?: AdminActor,
    ) {
        return this.accessOperations.createServiceAccount(input, actor);
    }

    async rotateServiceAccountSecret(id: string, actor?: AdminActor) {
        return this.accessOperations.rotateServiceAccountSecret(id, actor);
    }

    async setServiceAccountActive(id: string, isActive: boolean, reason?: string, actor?: AdminActor) {
        return this.accessOperations.setServiceAccountActive(id, isActive, reason, actor);
    }

    async updateServiceAccount(
        id: string,
        input: {
            displayName?: string;
            description?: string | null;
            role?: string;
            clearanceLevel?: string;
            department?: string | null;
            projectMemberships?: string[];
            allowedNetworkZones?: string[];
            reason?: string;
        },
        actor?: AdminActor,
    ) {
        return this.accessOperations.updateServiceAccount(id, input, actor);
    }

    async listManagedCredentials(filters?: { search?: string; status?: string }) {
        return this.accessOperations.listManagedCredentials(filters);
    }

    async createManagedCredential(
        input: {
            displayName: string;
            assignedUserId: string;
            deviceId: string;
            deviceLabel?: string;
            deviceKeyAlgorithm: string;
            devicePublicKey: string;
            networkZone: string;
            locationLabel?: string;
            locationCode?: string;
            expiresAt?: string | null;
            reason?: string;
        },
        actor?: AdminActor,
    ) {
        return this.accessOperations.createManagedCredential(input, actor);
    }

    async updateManagedCredential(
        id: string,
        input: {
            displayName?: string;
            deviceLabel?: string | null;
            networkZone?: string;
            locationLabel?: string | null;
            locationCode?: string | null;
            expiresAt?: string | null;
            reason?: string;
        },
        actor?: AdminActor,
    ) {
        return this.accessOperations.updateManagedCredential(id, input, actor);
    }

    async revokeManagedCredential(id: string, reason?: string, actor?: AdminActor) {
        return this.accessOperations.revokeManagedCredential(id, reason, actor);
    }

    async getAssetsForFreeze(search?: string) {
        return this.controlsOperations.getAssetsForFreeze(search);
    }

    async setUserActive(id: string, isActive: boolean, reason?: string, actor?: AdminActor) {
        return this.controlsOperations.setUserActive(id, isActive, reason, actor);
    }

    async setAssetFrozen(id: string, isFrozen: boolean, reason?: string, actor?: AdminActor) {
        return this.controlsOperations.setAssetFrozen(id, isFrozen, reason, actor);
    }

    async getApprovals(status?: string, search?: string) {
        return this.controlsOperations.getApprovals(status, search);
    }

    async approveApproval(id: string, reason?: string, actor?: AdminActor) {
        return this.controlsOperations.approveApproval(id, reason, actor);
    }

    async rejectApproval(id: string, reason?: string, actor?: AdminActor) {
        return this.controlsOperations.rejectApproval(id, reason, actor);
    }

    async getKeyGovernanceStatus() {
        return this.keyGovernanceOperations.getKeyGovernanceStatus();
    }

    async rotateAttestationSigner(input?: {
        reason?: string;
        changeTicket?: string;
        requestedBy?: string;
        expectedPriorKeyId?: string;
        runRecoveryTest?: boolean;
    }) {
        return this.keyGovernanceOperations.rotateAttestationSigner(input);
    }

    async rotateTransportKeys(input?: {
        reason?: string;
        changeTicket?: string;
        requestedBy?: string;
        expectedPriorKemKeyId?: string;
        expectedPriorIdentityKeyId?: string;
        runRecoveryTest?: boolean;
    }) {
        return this.keyGovernanceOperations.rotateTransportKeys(input);
    }

    async runKeyRecoveryTests(input?: { scope?: 'attestation' | 'transport' | 'all'; requestedBy?: string }) {
        return this.keyGovernanceOperations.runKeyRecoveryTests(input);
    }

    async runDiscovery(config: any, actor?: AdminActor) {
        return this.pipelineOperations.runDiscovery(config, actor);
    }

    async runPqcPipeline(config: any, actor?: AdminActor) {
        return this.pipelineOperations.runPqcPipeline(config, actor);
    }

    async getSystemHealth() {
        return this.diagnosticsOperations.getSystemHealth();
    }

    async getRuntimeSummary() {
        return this.diagnosticsOperations.getRuntimeSummary();
    }

    async getSystemLogs() {
        return this.diagnosticsOperations.getSystemLogs();
    }

    async getActivityFeed(filters?: {
        function?: string;
        source?: string;
        result?: string;
        actor?: string;
        search?: string;
        from?: string;
        to?: string;
        limit?: string | number;
    }) {
        return this.diagnosticsOperations.getActivityFeed(filters);
    }

    async getAlgoConfig() {
        return this.keyGovernanceOperations.getAlgoConfig();
    }

    async updateAlgoConfig(id: string, enabled: boolean) {
        return this.keyGovernanceOperations.updateAlgoConfig(id, enabled);
    }
}
