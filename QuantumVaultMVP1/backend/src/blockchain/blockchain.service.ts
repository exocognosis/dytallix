import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

type AnchoringBackend = 'evm' | 'dytallix';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private backend: AnchoringBackend = 'evm';

  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  private dytallixApiUrl?: string;
  private dytallixApiToken?: string;
  private isAvailable = false;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    try {
      const backendRaw = (this.configService.get<string>('ANCHORING_BACKEND') || 'evm').toLowerCase();
      this.backend = backendRaw === 'dytallix' ? 'dytallix' : 'evm';

      if (this.backend === 'dytallix') {
        const apiUrl = this.configService.get<string>('DYTALLIX_API_URL');
        const nodeEnv = this.configService.get<string>('NODE_ENV');
        const isProduction = nodeEnv === 'production';
        if (!apiUrl) {
          this.logger.warn('⚠️  DYTALLIX_API_URL not set; Dytallix anchoring will be unavailable');
          return;
        }

        if (isProduction && !apiUrl.startsWith('https://')) {
          throw new Error('DYTALLIX_API_URL must use HTTPS in production');
        }

        this.dytallixApiToken = this.configService.get<string>('DYTALLIX_API_TOKEN');
        if (isProduction && !this.dytallixApiToken) {
          throw new Error('DYTALLIX_API_TOKEN is required in production');
        }

        this.dytallixApiUrl = apiUrl.replace(/\/$/, '');
        this.isAvailable = true;
        this.logger.log(`✅ Dytallix anchoring initialized (${this.dytallixApiUrl})`);
        return;
      }

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
        'function recordAttestation(bytes32 attestationHash, string memory assetFingerprint, string memory anchorId, bytes memory mldsaSignature, bytes32 signerKeyHash) public returns (uint256)',
        'function getAttestation(uint256 attestationId) public view returns (bytes32, string memory, string memory, uint256, address, bytes memory, bytes32)',
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
    mldsaSignature: string,
    signerKeyHash: string,
  ): Promise<{ txHash: string; blockNumber: number; chainId?: number }> {
    if (!this.isAvailable) {
      throw new Error('Blockchain service not available');
    }

    if (this.backend === 'dytallix') {
      if (!this.dytallixApiUrl) {
        throw new Error('Dytallix anchoring not configured');
      }

      const metadata = {
        source: 'QuantumVaultMVP',
        attestationHash,
        assetFingerprint,
        anchorId,
        mldsaSignature,
        signerKeyHash,
        createdAt: new Date().toISOString(),
      };

      const headers: Record<string, string> = {
        'content-type': 'application/json',
      };
      if (this.dytallixApiToken) {
        headers.authorization = `Bearer ${this.dytallixApiToken}`;
      }

      const response = await fetch(`${this.dytallixApiUrl}/asset/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          params: [attestationHash, JSON.stringify(metadata)],
        }),
      });

      const data = (await response.json().catch(() => null)) as any;
      if (!response.ok) {
        throw new Error(
          `Dytallix anchor failed: HTTP ${response.status}${data?.error ? ` - ${data.error}` : ''}`,
        );
      }

      if (!data || data.error || data.success === false || !data.tx_hash) {
        throw new Error(`Dytallix anchor failed${data?.error ? `: ${data.error}` : ''}`);
      }

      return {
        txHash: data.tx_hash,
        blockNumber: Number(data.block_height ?? 0),
      };
    }

    if (!this.contract) {
      throw new Error('EVM attestation contract not configured (ATTESTATION_CONTRACT_ADDRESS)');
    }

    try {
      const tx = await this.contract.recordAttestation(
        attestationHash,
        assetFingerprint,
        anchorId,
        mldsaSignature,
        signerKeyHash,
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

    if (this.backend === 'dytallix') {
      return { status: 'unknown', confirmations: 0 };
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

  async getAttestationContext(): Promise<{
    backend: AnchoringBackend;
    chainId: number | null;
    contractAddress: string | null;
    endpoint: string | null;
  }> {
    if (this.backend === 'dytallix') {
      return {
        backend: 'dytallix',
        chainId: null,
        contractAddress: null,
        endpoint: this.dytallixApiUrl || this.configService.get<string>('DYTALLIX_API_URL') || null,
      };
    }

    let chainId: number | null = null;
    try {
      if (this.provider) {
        const network = await this.provider.getNetwork();
        chainId = Number(network.chainId);
      }
    } catch {
      chainId = null;
    }

    if (!chainId) {
      const configured = this.configService.get<string>('BLOCKCHAIN_CHAIN_ID');
      if (configured) {
        const parsed = Number.parseInt(configured, 10);
        if (Number.isFinite(parsed)) {
          chainId = parsed;
        }
      }
    }

    return {
      backend: 'evm',
      chainId,
      contractAddress: this.configService.get<string>('ATTESTATION_CONTRACT_ADDRESS') || null,
      endpoint: this.configService.get<string>('BLOCKCHAIN_RPC_URL') || null,
    };
  }
}
