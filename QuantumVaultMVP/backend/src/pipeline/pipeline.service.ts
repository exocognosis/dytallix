import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getRuns() {
    return this.prisma.pipelineRun.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        totalFound: true,
        processed: true,
        skipped: true,
        failed: true,
      },
      take: 100,
    });
  }

  async getRun(id: string) {
    const run = await this.prisma.pipelineRun.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        totalFound: true,
        processed: true,
        skipped: true,
        failed: true,
      },
    });

    if (!run) {
      throw new NotFoundException('Pipeline run not found');
    }

    const assets = await this.prisma.pipelineAsset.findMany({
      where: { runId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        runId: true,
        relativePath: true,
        sourcePath: true,
        destinationPath: true,
        status: true,
        pqcStatus: true,
        pqcProtected: true,
        nistLevel: true,
        dataDomain: true,
        stageTimestamps: true,
        createdAt: true,
      },
      take: 1000,
    });

    return {
      ...run,
      assets,
    };
  }

  async getAsset(id: string) {
    const asset = await this.prisma.pipelineAsset.findUnique({
      where: { id },
      select: {
        id: true,
        runId: true,
        objectId: true,
        relativePath: true,
        sourcePath: true,
        destinationPath: true,
        status: true,
        pqcStatus: true,
        pqcProtected: true,
        nistLevel: true,
        dataDomain: true,
        cryptoDomain: true,
        expectedPolicyOutcome: true,
        plaintextSha256: true,
        manifestSha256: true,
        fileSizeBytes: true,
        metadata: true,
        stageTimestamps: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Pipeline asset not found');
    }

    return asset;
  }
}
