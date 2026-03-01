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
import { TlsScannerModule } from './tls-scanner/tls-scanner.module';

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
  ],
})
export class AppModule {}
