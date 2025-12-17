import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WrappingController } from './wrapping.controller';
import { WrappingService } from './wrapping.service';
import { VaultModule } from '../vault/vault.module';
import { WrappingProcessor } from './wrapping.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'wrapping' }),
    VaultModule,
  ],
  controllers: [WrappingController],
  providers: [WrappingService, WrappingProcessor],
  exports: [WrappingService],
})
export class WrappingModule {}
