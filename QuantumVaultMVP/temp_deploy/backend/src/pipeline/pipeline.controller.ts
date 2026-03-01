import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PipelineService } from './pipeline.service';

@Controller('pipeline')
@UseGuards(JwtAuthGuard)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get('runs')
  async getRuns() {
    return this.pipelineService.getRuns();
  }

  @Get('runs/:id')
  async getRun(@Param('id') id: string) {
    return this.pipelineService.getRun(id);
  }

  @Get('assets/:id')
  async getAsset(@Param('id') id: string) {
    return this.pipelineService.getAsset(id);
  }
}
