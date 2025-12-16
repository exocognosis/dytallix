import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WrappingController } from './wrapping.controller';
import { WrappingService } from './wrapping.service';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'wrapping' }),
    VaultModule,
  ],
  controllers: [WrappingController],
  providers: [WrappingService],
  exports: [WrappingService],
})
export class WrappingModule {}
