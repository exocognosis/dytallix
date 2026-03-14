import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { MonitoringService } from './monitoring.service';
import { MonitoringGuard } from './monitoring.guard';

@Controller('monitoring')
@UseGuards(MonitoringGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('metrics')
  async getMetrics(@Res({ passthrough: true }) res: FastifyReply) {
    res.header('Content-Type', this.monitoringService.getMetricsContentType());
    return this.monitoringService.renderMetrics();
  }

  @Get('runtime')
  getRuntimeSummary() {
    return this.monitoringService.getRuntimeSummary();
  }
}
