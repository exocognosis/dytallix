import { Controller, Get, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ObjectStorageService } from './object-storage.service';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
    constructor(
        private readonly storageService: StorageService,
        private readonly objectStorageService: ObjectStorageService,
    ) { }

    @Get('metrics')
    getMetrics() {
        return this.storageService.getMetrics();
    }

    @Get('tenants')
    getTenants() {
        return this.storageService.getTenants();
    }

    @Get('backend')
    getBackendStatus() {
        return this.objectStorageService.getBackendStatus();
    }
}
