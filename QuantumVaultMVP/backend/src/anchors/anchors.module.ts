import { Module } from '@nestjs/common';
import { AnchorsController } from './anchors.controller';
import { AnchorsService } from './anchors.service';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [VaultModule],
  controllers: [AnchorsController],
  providers: [AnchorsService],
  exports: [AnchorsService],
})
export class AnchorsModule {}
