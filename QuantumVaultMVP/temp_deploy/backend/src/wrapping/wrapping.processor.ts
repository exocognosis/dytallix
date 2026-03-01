import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { WrappingService } from './wrapping.service';
import { JobStatus } from '@prisma/client';

@Processor('wrapping')
export class WrappingProcessor extends WorkerHost {
  private readonly logger = new Logger(WrappingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private wrappingService: WrappingService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { jobId, assetId, anchorId } = job.data as {
      jobId: string;
      assetId: string;
      anchorId: string;
    };

    this.logger.log(`Processing wrapping job ${jobId} for asset ${assetId}`);

    await this.prisma.wrappingJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    try {
      const result = await this.wrappingService.performWrapping(assetId, anchorId, jobId);

      const updatedJob = await this.prisma.wrappingJob.update({
        where: { id: jobId },
        data: {
          processedAssets: { increment: 1 },
        },
      });

      if (updatedJob.processedAssets + updatedJob.failedAssets >= updatedJob.totalAssets) {
        await this.prisma.wrappingJob.update({
          where: { id: jobId },
          data: {
            status: updatedJob.failedAssets > 0 ? JobStatus.FAILED : JobStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }

      return { success: true, wrappingResultId: result.id };
    } catch (error: any) {
      this.logger.error(`Wrapping job ${jobId} failed for asset ${assetId}: ${error?.message || error}`);

      const updatedJob = await this.prisma.wrappingJob.update({
        where: { id: jobId },
        data: {
          failedAssets: { increment: 1 },
          errorMessage: error?.message || String(error),
        },
      });

      if (updatedJob.processedAssets + updatedJob.failedAssets >= updatedJob.totalAssets) {
        await this.prisma.wrappingJob.update({
          where: { id: jobId },
          data: {
            status: JobStatus.FAILED,
            completedAt: new Date(),
          },
        });
      }

      throw error;
    }
  }
}
