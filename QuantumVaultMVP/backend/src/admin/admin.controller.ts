import { Controller, Post, Patch, Body, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Post('scan-config')
    async saveScanConfig(@Body() config: any) {
        return this.adminService.saveScanConfig(config);
    }

    @Post('scan')
    async triggerDiscovery(@Body() config: any, @Request() req: any) {
        return this.adminService.runDiscovery(config, {
            id: req?.user?.id,
            email: req?.user?.email,
        });
    }

    @Post('pqc-pipeline')
    async runPqcPipeline(@Body() config: any, @Request() req: any) {
        return this.adminService.runPqcPipeline(config, {
            id: req?.user?.id,
            email: req?.user?.email,
        });
    }

    @Get('health')
    async getHealth() {
        return this.adminService.getSystemHealth();
    }

    @Get('controls')
    async getSystemControls() {
        return this.adminService.getSystemControls();
    }

    @Post('controls')
    async updateSystemControl(
        @Body()
        body: {
            controlKey: string;
            enabled: boolean;
            reason?: string;
        },
        @Request() req: any,
    ) {
        return this.adminService.setSystemControl(body, {
            id: req?.user?.id,
            email: req?.user?.email,
        });
    }

    @Get('users')
    async getUsers(@Query('search') search?: string) {
        return this.adminService.getUsers(search);
    }

    @Get('assets')
    async getAssetsForFreeze(@Query('search') search?: string) {
        return this.adminService.getAssetsForFreeze(search);
    }

    @Patch('users/:id/active')
    async setUserActive(
        @Param('id') id: string,
        @Body() body: { isActive: boolean; reason?: string },
        @Request() req: any,
    ) {
        return this.adminService.setUserActive(id, body.isActive, body.reason, {
            id: req?.user?.id,
            email: req?.user?.email,
        });
    }

    @Patch('assets/:id/freeze')
    async setAssetFrozen(
        @Param('id') id: string,
        @Body() body: { isFrozen: boolean; reason?: string },
        @Request() req: any,
    ) {
        return this.adminService.setAssetFrozen(id, body.isFrozen, body.reason, {
            id: req?.user?.id,
            email: req?.user?.email,
        });
    }

    @Get('approvals')
    async getApprovals(@Query('status') status?: string) {
        return this.adminService.getApprovals(status);
    }

    @Post('approvals/:id/approve')
    async approveApproval(
        @Param('id') id: string,
        @Body() body: { reason?: string },
        @Request() req: any,
    ) {
        return this.adminService.approveApproval(id, body?.reason, {
            id: req?.user?.id,
            email: req?.user?.email,
        });
    }

    @Post('approvals/:id/reject')
    async rejectApproval(
        @Param('id') id: string,
        @Body() body: { reason?: string },
        @Request() req: any,
    ) {
        return this.adminService.rejectApproval(id, body?.reason, {
            id: req?.user?.id,
            email: req?.user?.email,
        });
    }

    @Get('risk-rules')
    async getRiskRules() {
        return this.adminService.getRiskRules();
    }

    @Post('risk-rules')
    async updateRiskRules(
        @Body()
        body: {
            maxRiskScoreAutoApprove: number;
            requireApprovalAtRiskLevel: string;
            maxAssetsPerRun: number;
        },
        @Request() req: any,
    ) {
        return this.adminService.setRiskRules(body, {
            id: req?.user?.id,
            email: req?.user?.email,
        });
    }

    @Get('logs')
    async getLogs() {
        return this.adminService.getSystemLogs();
    }

    @Get('algos')
    async getAlgos() {
        return this.adminService.getAlgoConfig();
    }

    @Post('algos/update')
    async updateAlgo(@Body() body: { id: string; enabled: boolean }) {
        return this.adminService.updateAlgoConfig(body.id, body.enabled);
    }

    @Get('keys/status')
    async getKeyGovernanceStatus() {
        return this.adminService.getKeyGovernanceStatus();
    }

    @Post('keys/attestation/rotate')
    async rotateAttestationSigner(
        @Body()
        body: {
            reason?: string;
            changeTicket?: string;
            requestedBy?: string;
            expectedPriorKeyId?: string;
            runRecoveryTest?: boolean;
        },
    ) {
        return this.adminService.rotateAttestationSigner(body);
    }

    @Post('keys/transport/rotate')
    async rotateTransportKeys(
        @Body()
        body: {
            reason?: string;
            changeTicket?: string;
            requestedBy?: string;
            expectedPriorKemKeyId?: string;
            expectedPriorIdentityKeyId?: string;
            runRecoveryTest?: boolean;
        },
    ) {
        return this.adminService.rotateTransportKeys(body);
    }

    @Post('keys/recovery-test')
    async runKeyRecoveryTests(
        @Body() body: { scope?: 'attestation' | 'transport' | 'all'; requestedBy?: string },
    ) {
        return this.adminService.runKeyRecoveryTests(body);
    }
}
