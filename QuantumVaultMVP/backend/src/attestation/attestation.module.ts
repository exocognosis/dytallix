import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AttestationController } from './attestation.controller';
import { AttestationService } from './attestation.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'attestation' }),
    BlockchainModule,
  ],
  controllers: [AttestationController],
  providers: [AttestationService],
  exports: [AttestationService],
})
export class AttestationModule {}
