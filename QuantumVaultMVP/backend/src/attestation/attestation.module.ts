import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AttestationController } from './attestation.controller';
import { AttestationService } from './attestation.service';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { AttestationProcessor } from './attestation.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'attestation' }),
    BlockchainModule,
  ],
  controllers: [AttestationController],
  providers: [AttestationService, AttestationProcessor],
  exports: [AttestationService],
})
export class AttestationModule {}
