import { Controller, Get, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
    constructor(private readonly storageService: StorageService) { }

    @Get('metrics')
    getMetrics() {
        return this.storageService.getMetrics();
    }

    @Get('tenants')
    getTenants() {
        return this.storageService.getTenants();
    }
}
