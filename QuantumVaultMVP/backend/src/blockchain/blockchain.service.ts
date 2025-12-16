import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private isAvailable = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL');
      const privateKey = this.configService.get<string>('BLOCKCHAIN_PRIVATE_KEY');
      const contractAddress = this.configService.get<string>('ATTESTATION_CONTRACT_ADDRESS');

      if (!rpcUrl || !privateKey) {
        this.logger.warn('⚠️  Blockchain configuration incomplete, attestation will be unavailable');
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.wallet = new ethers.Wallet(privateKey, this.provider);

      // Simple attestation contract ABI
      const contractABI = [
        'function recordAttestation(bytes32 attestationHash, string memory assetFingerprint, string memory anchorId) public returns (uint256)',
        'function getAttestation(uint256 attestationId) public view returns (bytes32, string memory, string memory, uint256, address)',
        'event AttestationRecorded(uint256 indexed attestationId, bytes32 attestationHash, address indexed recorder)',
      ];

      if (contractAddress) {
        this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
      }

      this.isAvailable = true;
      this.logger.log('✅ Blockchain service initialized');
    } catch (error) {
      this.logger.error(`Failed to initialize blockchain service: ${error.message}`);
    }
  }

  async recordAttestation(
    attestationHash: string,
    assetFingerprint: string,
    anchorId: string,
  ): Promise<{ txHash: string; blockNumber: number; chainId: number }> {
    if (!this.isAvailable || !this.contract) {
      throw new Error('Blockchain service not available');
    }

    try {
      const tx = await this.contract.recordAttestation(
        attestationHash,
        assetFingerprint,
        anchorId,
      );

      const receipt = await tx.wait();
      const network = await this.provider.getNetwork();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        chainId: Number(network.chainId),
      };
    } catch (error) {
      this.logger.error(`Failed to record attestation: ${error.message}`);
      throw error;
    }
  }

  async getTransactionStatus(txHash: string) {
    if (!this.isAvailable) {
      throw new Error('Blockchain service not available');
    }

    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return { status: 'pending', confirmations: 0 };
    }

    const currentBlock = await this.provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;

    return {
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      confirmations,
      blockNumber: receipt.blockNumber,
    };
  }

  getStatus(): { available: boolean } {
    return { available: this.isAvailable };
  }
}
