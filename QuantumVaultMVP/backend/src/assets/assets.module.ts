import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { RiskModule } from '../risk/risk.module';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [RiskModule, VaultModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
