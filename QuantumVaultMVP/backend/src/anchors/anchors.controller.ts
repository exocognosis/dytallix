import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AnchorsService } from './anchors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('anchors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnchorsController {
  constructor(private anchorsService: AnchorsService) {}

  @Get()
  async getAnchors() {
    return this.anchorsService.getAnchors();
  }

  @Get(':id')
  async getAnchor(@Param('id') id: string) {
    return this.anchorsService.getAnchor(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async createAnchor(@Body() body: { name: string; algorithm?: string }) {
    return this.anchorsService.createAnchor(body.name, body.algorithm);
  }

  @Post(':id/rotate')
  @Roles(UserRole.ADMIN)
  async rotateAnchor(@Param('id') id: string) {
    return this.anchorsService.rotateAnchor(id);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN)
  async activateAnchor(@Param('id') id: string) {
    return this.anchorsService.activateAnchor(id);
  }
}
