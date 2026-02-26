import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DatabaseModule } from '../database/database.module';
import { VaultModule } from '../vault/vault.module';
import { AttestationModule } from '../attestation/attestation.module';
import { TransportModule } from '../transport/transport.module';

@Module({
    imports: [DatabaseModule, VaultModule, AttestationModule, TransportModule],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule { }
