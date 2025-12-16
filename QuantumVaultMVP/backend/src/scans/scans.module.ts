import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { ScanProcessor } from './scan.processor';
import { TlsScannerModule } from '../tls-scanner/tls-scanner.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scans' }),
    TlsScannerModule,
    RiskModule,
  ],
  controllers: [ScansController],
  providers: [ScansService, ScanProcessor],
  exports: [ScansService],
})
export class ScansModule {}
