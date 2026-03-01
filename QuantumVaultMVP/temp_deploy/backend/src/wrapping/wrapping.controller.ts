import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { WrappingService } from './wrapping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('wrapping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WrappingController {
  constructor(private wrappingService: WrappingService) {}

  @Post('wrap')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async wrapAsset(@Body() body: { assetId: string; anchorId: string }) {
    return this.wrappingService.wrapAsset(body.assetId, body.anchorId);
  }

  @Post('bulk-wrap-by-policy/:policyId')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async bulkWrapByPolicy(@Param('policyId') policyId: string) {
    return this.wrappingService.bulkWrapByPolicy(policyId);
  }

  @Get('job-status/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.wrappingService.getJobStatus(jobId);
  }
}
