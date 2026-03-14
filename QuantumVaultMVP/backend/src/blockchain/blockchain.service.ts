import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { BlockchainAccessProofV1 } from '../events/quantumvault-message.schemas';

type AnchoringBackend = 'evm' | 'dytallix';
type BlockchainWriteResult = { txHash: string; blockNumber: number; chainId?: number };

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private backend: AnchoringBackend = 'evm';

  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Signer;
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
      const fromAddress = this.configService.get<string>('BLOCKCHAIN_FROM_ADDRESS');
      const contractAddress = this.configService.get<string>('ATTESTATION_CONTRACT_ADDRESS');

      if (!rpcUrl) {
        this.logger.warn('⚠️  Blockchain configuration incomplete, attestation will be unavailable');
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      if (privateKey) {
        this.signer = new ethers.Wallet(privateKey, this.provider);
      } else {
        const candidateAccounts = fromAddress
          ? [fromAddress]
          : await this.provider.send('eth_accounts', []);

        if (!candidateAccounts.length) {
          this.logger.warn('⚠️  No blockchain signer configured, attestation will be unavailable');
          return;
        }

        this.signer = await this.provider.getSigner(candidateAccounts[0]);
      }

      // Simple attestation contract ABI
      const contractABI = [
        'function recordAttestation(bytes32 attestationHash, string memory assetFingerprint, string memory anchorId, bytes memory mldsaSignature, bytes32 signerKeyHash) public returns (uint256)',
        'function recordAccessProof(bytes32 attestationHash, bytes32 assetIdHash, bytes32 contentHash, bytes32 policyHash, bytes32 eventTypeHash, bytes32 requesterHash, bytes32 approvalHash, uint256 sessionTtlSeconds, string memory anchorRef, bytes memory systemSignature, bytes32 signerKeyHash) public returns (uint256)',
        'function getAttestation(uint256 attestationId) public view returns (bytes32, string memory, string memory, uint256, address, bytes memory, bytes32)',
        'event AttestationRecorded(uint256 indexed attestationId, bytes32 attestationHash, address indexed recorder)',
        'event AccessProofRecorded(uint256 indexed proofId, bytes32 attestationHash, address indexed recorder)',
      ];

      if (contractAddress) {
        this.contract = new ethers.Contract(contractAddress, contractABI, this.signer);
      }

      this.isAvailable = true;
      const signerAddress = await this.signer.getAddress();
      this.logger.log(`✅ Blockchain service initialized with signer ${signerAddress}`);
    } catch (error) {
      this.logger.error(`Failed to initialize blockchain service: ${error.message}`);
    }
  }

  private async postDytallixRegister(payload: Record<string, unknown>): Promise<BlockchainWriteResult> {
    if (!this.dytallixApiUrl) {
      throw new Error('Dytallix anchoring not configured');
    }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (this.dytallixApiToken) {
      headers.authorization = `Bearer ${this.dytallixApiToken}`;
    }

    const candidatePaths = ['/asset/register', '/register'];
    let lastError: string | null = null;

    for (const path of candidatePaths) {
      const response = await fetch(`${this.dytallixApiUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as any;
      if (response.status === 404) {
        lastError = `HTTP 404 at ${path}`;
        continue;
      }

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

    throw new Error(`Dytallix anchor failed: no register endpoint matched${lastError ? ` (${lastError})` : ''}`);
  }

  async recordAttestation(
    attestationHash: string,
    assetFingerprint: string,
    anchorId: string,
    mldsaSignature: string,
    signerKeyHash: string,
  ): Promise<BlockchainWriteResult> {
    if (!this.isAvailable) {
      throw new Error('Blockchain service not available');
    }

    if (this.backend === 'dytallix') {
      const metadata = {
        source: 'QuantumVaultMVP',
        attestationHash,
        assetFingerprint,
        anchorId,
        mldsaSignature,
        signerKeyHash,
        createdAt: new Date().toISOString(),
      };

      return this.postDytallixRegister({
        params: [attestationHash, JSON.stringify(metadata)],
      });
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

  async recordAccessProof(proof: BlockchainAccessProofV1): Promise<BlockchainWriteResult> {
    if (!this.isAvailable) {
      throw new Error('Blockchain service not available');
    }

    if (this.backend === 'dytallix') {
      return this.postDytallixRegister({
        params: [proof.attestationHash, JSON.stringify({
          source: 'QuantumVaultMVP',
          proof,
          createdAt: new Date().toISOString(),
        })],
      });
    }

    if (!this.contract) {
      throw new Error('EVM attestation contract not configured (ATTESTATION_CONTRACT_ADDRESS)');
    }

    try {
      const tx = await this.contract.recordAccessProof(
        proof.attestationHash,
        proof.assetIdHash,
        proof.contentHash,
        proof.policyHash,
        proof.eventTypeHash,
        proof.requesterHash,
        proof.approvalHash,
        proof.sessionTtlSeconds,
        proof.anchorRef,
        proof.systemSignature,
        proof.signerKeyHash,
      );

      const receipt = await tx.wait();
      const network = await this.provider.getNetwork();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        chainId: Number(network.chainId),
      };
    } catch (error) {
      this.logger.error(`Failed to record access proof: ${error.message}`);
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

  getStatus(): { available: boolean; backend: AnchoringBackend; endpoint?: string } {
    return {
      available: this.isAvailable,
      backend: this.backend,
      endpoint: this.backend === 'dytallix' ? this.dytallixApiUrl : this.configService.get<string>('BLOCKCHAIN_RPC_URL') || undefined,
    };
  }

  private buildStatusCandidateUrls(configuredStatusUrl: string, dytallixApiUrl: string): string[] {
    const candidates: string[] = [];

    if (configuredStatusUrl) {
      candidates.push(configuredStatusUrl);
    }

    if (dytallixApiUrl) {
      const baseUrl = dytallixApiUrl.replace(/\/$/, '');
      candidates.push(`${baseUrl}/status`, `${baseUrl}/stats`);
    }

    return Array.from(new Set(candidates.filter(Boolean)));
  }

  private parseStatusNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private parseStatusDecimal(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private parseStatusChainId(value: unknown): number | null {
    const direct = this.parseStatusNumber(value);
    if (direct !== null) return direct;

    if (typeof value === 'string') {
      const match = value.match(/(\d+)$/);
      if (match) {
        const parsed = Number.parseInt(match[1], 10);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return null;
  }

  private parseStatusTimestamp(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }

      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        const millis = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
        return new Date(millis).toISOString();
      }

      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const millis = value > 1_000_000_000_000 ? value : value * 1000;
      return new Date(millis).toISOString();
    }

    return null;
  }

  private unwrapStatusPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const nested = payload.data;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return {
        ...payload,
        ...(nested as Record<string, unknown>),
      };
    }

    return payload;
  }

  private async fetchExternalStatusSnapshot(): Promise<{
    chainId: number | null;
    blockHeight: number | null;
    peers: number | null;
    sync: string | null;
    network: string | null;
    tps: number | null;
    blockTimeSec: number | null;
    validators: number | null;
    finalitySec: number | null;
    updatedAt: string | null;
    endpoint: string;
    latencyMs: number | null;
  } | null> {
    const configuredStatusUrl = (this.configService.get<string>('BLOCKCHAIN_STATUS_URL') || '').trim();
    const dytallixApiUrl = (this.configService.get<string>('DYTALLIX_API_URL') || '').trim();

    const candidateUrls = this.buildStatusCandidateUrls(configuredStatusUrl, dytallixApiUrl);

    if (!candidateUrls.length) {
      return null;
    }

    for (const statusUrl of candidateUrls) {
      const startedAt = Date.now();

      try {
        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          continue;
        }

        const rawPayload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
        if (!rawPayload || typeof rawPayload !== 'object') {
          continue;
        }

        const payload = this.unwrapStatusPayload(rawPayload);
        const latencyMs = Date.now() - startedAt;
        const blockHeight = this.parseStatusNumber(
          payload.latest_height
          ?? payload.latestHeight
          ?? payload.block_height
          ?? payload.blockHeight
          ?? payload.height,
        );
        const peers = this.parseStatusNumber(payload.peer_count ?? payload.peers ?? payload.p2p_peers);
        const chainId = this.parseStatusChainId(payload.chain_id ?? payload.chainId);
        const tps = this.parseStatusDecimal(
          payload.rolling_tps
          ?? payload.tx_per_second
          ?? payload.txs_per_second
          ?? payload.tps,
        );
        const blockTimeSec = this.parseStatusDecimal(
          payload.block_time_seconds_avg
          ?? payload.block_time_seconds
          ?? payload.block_time
          ?? payload.blockTime,
        );
        const validators = this.parseStatusNumber(
          payload.validator_active_total
          ?? payload.validators
          ?? payload.active_validators,
        );
        const finalitySec = this.parseStatusDecimal(
          payload.block_finality_seconds
          ?? payload.finality_seconds
          ?? payload.finality,
        );

        const networkRaw = payload.network ?? payload.network_id;
        const network = typeof networkRaw === 'string' && networkRaw.trim() ? networkRaw.trim() : null;

        const updatedAtRaw = payload.updatedAt ?? payload.updated_at ?? payload.timestamp;
        const updatedAt = this.parseStatusTimestamp(updatedAtRaw);

        let sync: string | null = null;
        if (typeof payload.sync === 'string' && payload.sync.trim()) {
          sync = payload.sync;
        } else if (typeof payload.syncing === 'boolean') {
          sync = payload.syncing ? 'syncing' : '100%';
        }

        if (
          blockHeight == null
          && peers == null
          && chainId == null
          && tps == null
          && blockTimeSec == null
          && validators == null
          && finalitySec == null
          && sync == null
          && network == null
          && updatedAt == null
        ) {
          continue;
        }

        return {
          chainId,
          blockHeight,
          peers,
          sync,
          network,
          tps,
          blockTimeSec,
          validators,
          finalitySec,
          updatedAt,
          endpoint: statusUrl,
          latencyMs,
        };
      } catch {
        continue;
      }
    }

    return null;
  }

  async getHealth(): Promise<{
    available: boolean;
    backend: AnchoringBackend;
    chainId: number | null;
    blockHeight: number | null;
    peers: number | null;
    sync: string | null;
    network: string | null;
    tps: number | null;
    blockTimeSec: number | null;
    validators: number | null;
    finalitySec: number | null;
    updatedAt: string | null;
    endpoint: string | null;
    latencyMs: number | null;
  }> {
    const context = await this.getAttestationContext();
    const externalStatus = await this.fetchExternalStatusSnapshot();

    if (!this.isAvailable) {
      return {
        available: Boolean(externalStatus),
        backend: context.backend,
        chainId: externalStatus?.chainId ?? context.chainId,
        blockHeight: externalStatus?.blockHeight ?? null,
        peers: externalStatus?.peers ?? null,
        sync: externalStatus?.sync ?? null,
        network: externalStatus?.network ?? null,
        tps: externalStatus?.tps ?? null,
        blockTimeSec: externalStatus?.blockTimeSec ?? null,
        validators: externalStatus?.validators ?? null,
        finalitySec: externalStatus?.finalitySec ?? null,
        updatedAt: externalStatus?.updatedAt ?? null,
        endpoint: externalStatus?.endpoint ?? context.endpoint,
        latencyMs: externalStatus?.latencyMs ?? null,
      };
    }

    if (this.backend === 'dytallix') {
      return {
        available: true,
        backend: 'dytallix',
        chainId: externalStatus?.chainId ?? context.chainId,
        blockHeight: externalStatus?.blockHeight ?? null,
        peers: externalStatus?.peers ?? null,
        sync: externalStatus?.sync ?? null,
        network: externalStatus?.network ?? null,
        tps: externalStatus?.tps ?? null,
        blockTimeSec: externalStatus?.blockTimeSec ?? null,
        validators: externalStatus?.validators ?? null,
        finalitySec: externalStatus?.finalitySec ?? null,
        updatedAt: externalStatus?.updatedAt ?? null,
        endpoint: externalStatus?.endpoint ?? context.endpoint,
        latencyMs: externalStatus?.latencyMs ?? null,
      };
    }

    const startedAt = Date.now();
    try {
      const [network, blockHeight, peerHex, syncing] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
        this.provider.send('net_peerCount', []),
        this.provider.send('eth_syncing', []),
      ]);

      const latencyMs = Date.now() - startedAt;
      const peers = typeof peerHex === 'string' ? Number.parseInt(peerHex, 16) : null;

      let sync: string | null = null;
      if (syncing === false) {
        sync = '100%';
      } else if (syncing && typeof syncing === 'object') {
        const currentBlockHex = (syncing as { currentBlock?: string }).currentBlock;
        const highestBlockHex = (syncing as { highestBlock?: string }).highestBlock;
        const currentBlock = currentBlockHex ? Number.parseInt(currentBlockHex, 16) : 0;
        const highestBlock = highestBlockHex ? Number.parseInt(highestBlockHex, 16) : 0;
        if (highestBlock > 0) {
          const pct = Math.max(0, Math.min(100, Math.round((currentBlock / highestBlock) * 100)));
          sync = `${pct}%`;
        }
      }

      return {
        available: true,
        backend: 'evm',
        chainId: externalStatus?.chainId ?? Number(network.chainId),
        blockHeight: externalStatus?.blockHeight ?? blockHeight,
        peers: externalStatus?.peers ?? (Number.isFinite(peers as number) ? peers : null),
        sync: externalStatus?.sync ?? sync,
        network: externalStatus?.network ?? null,
        tps: externalStatus?.tps ?? null,
        blockTimeSec: externalStatus?.blockTimeSec ?? null,
        validators: externalStatus?.validators ?? null,
        finalitySec: externalStatus?.finalitySec ?? null,
        updatedAt: externalStatus?.updatedAt ?? null,
        endpoint: externalStatus?.endpoint ?? context.endpoint,
        latencyMs: externalStatus?.latencyMs ?? latencyMs,
      };
    } catch {
      if (externalStatus) {
        return {
          available: true,
          backend: 'evm',
          chainId: externalStatus.chainId ?? context.chainId,
          blockHeight: externalStatus.blockHeight,
          peers: externalStatus.peers,
          sync: externalStatus.sync,
          network: externalStatus.network,
          tps: externalStatus.tps,
          blockTimeSec: externalStatus.blockTimeSec,
          validators: externalStatus.validators,
          finalitySec: externalStatus.finalitySec,
          updatedAt: externalStatus.updatedAt,
          endpoint: externalStatus.endpoint,
          latencyMs: externalStatus.latencyMs,
        };
      }

      return {
        available: false,
        backend: 'evm',
        chainId: context.chainId,
        blockHeight: null,
        peers: null,
        sync: null,
        network: null,
        tps: null,
        blockTimeSec: null,
        validators: null,
        finalitySec: null,
        updatedAt: null,
        endpoint: context.endpoint,
        latencyMs: null,
      };
    }
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
