import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AccessController } from './access.controller';
import { AccessAgentController } from './access-agent.controller';
import { AccessService } from './access.service';
import { AssetRegistryService } from './asset-registry.service';
import { AccessPolicyService } from './access-policy.service';
import { AuditLedgerService } from './audit-ledger.service';
import { AuthModule } from '../auth/auth.module';
import { AttestationModule } from '../attestation/attestation.module';
import { StorageModule } from '../storage/storage.module';
import { AccessAuditProcessor } from './access-audit.processor';
import { SiemExportProcessor } from './siem-export.processor';

@Module({
  imports: [
    AuthModule,
    AttestationModule,
    StorageModule,
    BullModule.registerQueue({ name: 'access-audit' }, { name: 'siem-export' }),
  ],
  controllers: [AccessController, AccessAgentController],
  providers: [
    AccessService,
    AssetRegistryService,
    AccessPolicyService,
    AuditLedgerService,
    AccessAuditProcessor,
    SiemExportProcessor,
  ],
  exports: [AccessService, AssetRegistryService, AuditLedgerService],
})
export class AccessModule {}
