import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('policies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PoliciesController {
  constructor(private policiesService: PoliciesService) {}

  @Get()
  async getPolicies() {
    return this.policiesService.getPolicies();
  }

  @Get(':id')
  async getPolicy(@Param('id') id: string) {
    return this.policiesService.getPolicy(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async createPolicy(@Body() body: any) {
    return this.policiesService.createPolicy(body);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async updatePolicy(@Param('id') id: string, @Body() body: any) {
    return this.policiesService.updatePolicy(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deletePolicy(@Param('id') id: string) {
    return this.policiesService.deletePolicy(id);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async activatePolicy(@Param('id') id: string) {
    return this.policiesService.activatePolicy(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async deactivatePolicy(@Param('id') id: string) {
    return this.policiesService.deactivatePolicy(id);
  }

  @Post(':id/evaluate')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async evaluatePolicy(@Param('id') id: string) {
    return this.policiesService.evaluatePolicy(id);
  }
}
