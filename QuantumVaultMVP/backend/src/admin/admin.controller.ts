import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
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
    async triggerDiscovery(@Body() config: any) {
        return this.adminService.runDiscovery(config);
    }

    @Post('pqc-pipeline')
    async runPqcPipeline(@Body() config: any) {
        return this.adminService.runPqcPipeline(config);
    }

    @Get('health')
    async getHealth() {
        return this.adminService.getSystemHealth();
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
}
