import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
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
