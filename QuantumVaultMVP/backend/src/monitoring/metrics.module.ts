import { Global, Module } from '@nestjs/common';
import { MonitoringMetricsService } from './metrics.service';

@Global()
@Module({
  providers: [MonitoringMetricsService],
  exports: [MonitoringMetricsService],
})
export class MetricsModule {}
