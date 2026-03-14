import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { StorageModule } from '../storage/storage.module';
import { MetricsModule } from './metrics.module';
import { MonitoringController } from './monitoring.controller';
import { MonitoringGuard } from './monitoring.guard';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [
    MetricsModule,
    StorageModule,
    BlockchainModule,
    BullModule.registerQueue(
      { name: 'scans' },
      { name: 'wrapping' },
      { name: 'attestation' },
      { name: 'access-audit' },
      { name: 'siem-export' },
    ),
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringGuard],
  exports: [MonitoringService],
})
export class MonitoringModule {}
