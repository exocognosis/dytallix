import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BlockchainService } from '../blockchain/blockchain.service';
import { MonitoringMetricsService } from './metrics.service';
import { ObjectStorageService } from '../storage/object-storage.service';

@Injectable()
export class MonitoringService {
  constructor(
    private readonly metrics: MonitoringMetricsService,
    private readonly blockchainService: BlockchainService,
    private readonly objectStorageService: ObjectStorageService,
    @InjectQueue('scans') private readonly scansQueue: Queue,
    @InjectQueue('wrapping') private readonly wrappingQueue: Queue,
    @InjectQueue('attestation') private readonly attestationQueue: Queue,
    @InjectQueue('access-audit') private readonly accessAuditQueue: Queue,
    @InjectQueue('siem-export') private readonly siemExportQueue: Queue,
  ) {}

  async renderMetrics() {
    return this.metrics.renderMetrics();
  }

  getMetricsContentType() {
    return this.metrics.getMetricsContentType();
  }

  async getRuntimeSummary() {
    const [storage, scans, wrapping, attestation, accessAudit, siemExport] = await Promise.all([
      this.objectStorageService.getBackendStatus(),
      this.scansQueue.getJobCounts(),
      this.wrappingQueue.getJobCounts(),
      this.attestationQueue.getJobCounts(),
      this.accessAuditQueue.getJobCounts(),
      this.siemExportQueue.getJobCounts(),
    ]);

    return {
      storage,
      blockchain: this.blockchainService.getStatus(),
      queues: {
        scans,
        wrapping,
        attestation,
        accessAudit,
        siemExport,
      },
    };
  }
}
