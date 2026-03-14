import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DatabaseModule } from '../database/database.module';
import { VaultModule } from '../vault/vault.module';
import { AttestationModule } from '../attestation/attestation.module';
import { TransportModule } from '../transport/transport.module';
import { StorageModule } from '../storage/storage.module';
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
    imports: [DatabaseModule, VaultModule, AttestationModule, TransportModule, StorageModule, MonitoringModule],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule { }
