import { Module } from '@nestjs/common';
import { TlsScannerService } from './tls-scanner.service';

@Module({
  providers: [TlsScannerService],
  exports: [TlsScannerService],
})
export class TlsScannerModule {}
