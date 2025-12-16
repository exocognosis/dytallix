import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { ScanStatus, TargetType } from '@prisma/client';

@Injectable()
export class ScansService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('scans') private scanQueue: Queue,
  ) {}

  async createTarget(data: {
    name: string;
    type: TargetType;
    host: string;
    port?: number;
    protocol?: string;
    metadata?: any;
  }) {
    return this.prisma.target.create({ data });
  }

  async getTargets() {
    return this.prisma.target.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTarget(id: string) {
    return this.prisma.target.findUnique({ where: { id } });
  }

  async updateTarget(id: string, data: any) {
    return this.prisma.target.update({ where: { id }, data });
  }

  async deleteTarget(id: string) {
    return this.prisma.target.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async triggerScan(targetId: string) {
    const target = await this.prisma.target.findUnique({ where: { id: targetId } });
    if (!target) {
      throw new Error('Target not found');
    }

    const scan = await this.prisma.scan.create({
      data: {
        targetId,
        status: ScanStatus.PENDING,
      },
    });

    await this.scanQueue.add('scan-target', {
      scanId: scan.id,
      targetId: target.id,
      host: target.host,
      port: target.port || 443,
    });

    return scan;
  }

  async getScanStatus(scanId: string) {
    return this.prisma.scan.findUnique({
      where: { id: scanId },
      include: {
        target: true,
        scanAssets: true,
      },
    });
  }

  async getScanHistory(targetId?: string) {
    return this.prisma.scan.findMany({
      where: targetId ? { targetId } : undefined,
      include: {
        target: true,
        _count: {
          select: { scanAssets: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
