import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ScansService } from './scans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('scans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScansController {
  constructor(private scansService: ScansService) {}

  @Post('targets')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async createTarget(@Body() body: any) {
    return this.scansService.createTarget(body);
  }

  @Get('targets')
  async getTargets() {
    return this.scansService.getTargets();
  }

  @Get('targets/:id')
  async getTarget(@Param('id') id: string) {
    return this.scansService.getTarget(id);
  }

  @Put('targets/:id')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async updateTarget(@Param('id') id: string, @Body() body: any) {
    return this.scansService.updateTarget(id, body);
  }

  @Delete('targets/:id')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async deleteTarget(@Param('id') id: string) {
    return this.scansService.deleteTarget(id);
  }

  @Post('trigger/:targetId')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async triggerScan(@Param('targetId') targetId: string) {
    return this.scansService.triggerScan(targetId);
  }

  @Get('status/:scanId')
  async getScanStatus(@Param('scanId') scanId: string) {
    return this.scansService.getScanStatus(scanId);
  }

  @Get('history')
  async getScanHistory() {
    return this.scansService.getScanHistory();
  }

  @Get('history/:targetId')
  async getTargetScanHistory(@Param('targetId') targetId: string) {
    return this.scansService.getScanHistory(targetId);
  }
}
