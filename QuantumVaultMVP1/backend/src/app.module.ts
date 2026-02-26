import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AssetsModule } from './assets/assets.module';
import { ScansModule } from './scans/scans.module';
import { PoliciesModule } from './policies/policies.module';
import { AnchorsModule } from './anchors/anchors.module';
import { WrappingModule } from './wrapping/wrapping.module';
import { AttestationModule } from './attestation/attestation.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { VaultModule } from './vault/vault.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { RiskModule } from './risk/risk.module';
import { StorageModule } from './storage/storage.module';
import { ComplianceModule } from './compliance/compliance.module';
import { TransportModule } from './transport/transport.module';
import { ThreatsModule } from './threats/threats.module';
import { TlsScannerModule } from './tls-scanner/tls-scanner.module';
import { AdminModule } from './admin/admin.module';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    QueueModule,
    VaultModule,
    BlockchainModule,
    AuthModule,
    AssetsModule,
    ScansModule,
    PoliciesModule,
    AnchorsModule,
    WrappingModule,
    AttestationModule,
    DashboardModule,
    RiskModule,
    TlsScannerModule,
    StorageModule,
    ComplianceModule,
    TransportModule,
    ThreatsModule,
    PipelineModule,
    AdminModule,
  ],
})
export class AppModule { }
