import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AuditLedgerService } from './audit-ledger.service';
import { parseAccessAuditAnchorJobV1 } from '../events/quantumvault-message.schemas';

@Processor('access-audit')
export class AccessAuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AccessAuditProcessor.name);

  constructor(private readonly auditLedgerService: AuditLedgerService) {
    super();
  }

  async process(job: Job<unknown>) {
    const payload = parseAccessAuditAnchorJobV1(job.data);
    this.logger.log(`Processing access audit anchor job ${job.id} for event ${payload.eventId}`);
    await this.auditLedgerService.processAnchoringJob(payload.eventId);
    return { success: true, eventId: payload.eventId };
  }
}
