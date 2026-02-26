import { Controller, Get, Put, Post, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, AssetStatus, RiskLevel, AssetType } from '@prisma/client';

@Controller('assets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Get()
  async getAssets(
    @Query('status') status?: AssetStatus,
    @Query('riskLevel') riskLevel?: RiskLevel,
    @Query('type') type?: AssetType,
    @Query('search') search?: string,
  ) {
    return this.assetsService.getAssets({ status, riskLevel, type, search });
  }

  @Get(':id')
  async getAsset(@Param('id') id: string) {
    return this.assetsService.getAsset(id);
  }

  @Put(':id/metadata')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async updateAssetMetadata(@Param('id') id: string, @Body() body: any) {
    return this.assetsService.updateAssetMetadata(id, body);
  }

  @Post(':id/key-material')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async ingestKeyMaterial(
    @Param('id') id: string,
    @Body() body: { keyMaterial: string; keyType: string },
  ) {
    const buffer = Buffer.from(body.keyMaterial, 'base64');
    await this.assetsService.ingestKeyMaterial(id, buffer, body.keyType);
    return { message: 'Key material ingested successfully' };
  }

  @Post('bulk-action')
  @Roles(UserRole.ADMIN, UserRole.SECURITY_ENGINEER)
  async bulkAction(@Body() body: { assetIds: string[]; action: string; params?: any }) {
    return this.assetsService.bulkAction(body.assetIds, body.action, body.params);
  }
}
