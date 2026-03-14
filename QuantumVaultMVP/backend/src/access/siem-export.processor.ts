import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AuditLedgerService } from './audit-ledger.service';
import { parseSiemExportJobV1 } from '../events/quantumvault-message.schemas';

@Processor('siem-export')
export class SiemExportProcessor extends WorkerHost {
  private readonly logger = new Logger(SiemExportProcessor.name);

  constructor(private readonly auditLedgerService: AuditLedgerService) {
    super();
  }

  async process(job: Job<unknown>) {
    const payload = parseSiemExportJobV1(job.data);
    this.logger.log(`Processing SIEM export job ${job.id} for event ${payload.eventId}`);
    await this.auditLedgerService.processSiemExportJob(payload.eventId);
    return { success: true, eventId: payload.eventId };
  }
}
