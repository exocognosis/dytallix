import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { RiskModule } from '../risk/risk.module';
import { VaultModule } from '../vault/vault.module';
import { WrappingModule } from '../wrapping/wrapping.module';

@Module({
  imports: [RiskModule, VaultModule, WrappingModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule { }
