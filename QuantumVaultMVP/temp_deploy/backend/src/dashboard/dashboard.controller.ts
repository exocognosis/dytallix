import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('kpis')
  async getKPIs() {
    return this.dashboardService.getKPIs();
  }

  @Get('trends')
  async getTrends(@Query('days') days?: string) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.dashboardService.getTrends(numDays);
  }

  @Get('migration-timeline')
  async getMigrationTimeline() {
    return this.dashboardService.getMigrationTimeline();
  }

  @Post('snapshot')
  async captureSnapshot() {
    return this.dashboardService.captureSnapshot();
  }
}
