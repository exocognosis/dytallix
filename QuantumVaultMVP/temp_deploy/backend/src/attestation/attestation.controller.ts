import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AttestationService } from './attestation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('attestation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttestationController {
  constructor(private attestationService: AttestationService) {}

  @Post('create-job')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async createAttestationJob(@Body() body: { assetIds: string[] }) {
    return this.attestationService.createAttestationJob(body.assetIds);
  }

  @Get('job-status/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.attestationService.getJobStatus(jobId);
  }

  @Get('asset/:assetId')
  async getAssetAttestations(@Param('assetId') assetId: string) {
    return this.attestationService.getAssetAttestations(assetId);
  }
}
