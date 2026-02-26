import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { AttestationService } from './attestation.service';
import { JobStatus } from '@prisma/client';

@Processor('attestation')
export class AttestationProcessor extends WorkerHost {
  private readonly logger = new Logger(AttestationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private attestationService: AttestationService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { jobId, assetId } = job.data as { jobId: string; assetId: string };

    this.logger.log(`Processing attestation job ${jobId} for asset ${assetId}`);

    await this.prisma.attestationJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    try {
      const attestation = await this.attestationService.performAttestation(assetId, jobId);

      const updatedJob = await this.prisma.attestationJob.update({
        where: { id: jobId },
        data: {
          processedAssets: { increment: 1 },
        },
      });

      if (updatedJob.processedAssets + updatedJob.failedAssets >= updatedJob.totalAssets) {
        await this.prisma.attestationJob.update({
          where: { id: jobId },
          data: {
            status: updatedJob.failedAssets > 0 ? JobStatus.FAILED : JobStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }

      return { success: true, attestationId: attestation.id };
    } catch (error: any) {
      this.logger.error(`Attestation job ${jobId} failed for asset ${assetId}: ${error?.message || error}`);

      const updatedJob = await this.prisma.attestationJob.update({
        where: { id: jobId },
        data: {
          failedAssets: { increment: 1 },
          errorMessage: error?.message || String(error),
        },
      });

      if (updatedJob.processedAssets + updatedJob.failedAssets >= updatedJob.totalAssets) {
        await this.prisma.attestationJob.update({
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
