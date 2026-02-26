import { Controller, Get, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
    constructor(private readonly complianceService: ComplianceService) { }

    @Get('standards')
    getStandards() {
        return this.complianceService.getStandards();
    }

    @Get('migration-progress')
    getMigrationProgress() {
        return this.complianceService.getMigrationProgress();
    }
}
