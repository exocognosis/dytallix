import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import vault from 'node-vault';

@Injectable()
export class VaultService implements OnModuleInit {
  private readonly logger = new Logger(VaultService.name);
  private vaultClient: any;
  private isAvailable = false;
  private kvMount = 'secret';

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const vaultAddr = this.configService.get<string>('VAULT_ADDR');
    const vaultToken = this.configService.get<string>('VAULT_TOKEN');
    this.kvMount = this.configService.get<string>('VAULT_KV_MOUNT') || 'secret';

    if (!vaultAddr || !vaultToken) {
      this.logger.error('❌ Vault configuration missing! VAULT_ADDR and VAULT_TOKEN are required.');
      throw new Error('Vault configuration is required but not provided');
    }

    try {
      this.vaultClient = vault({
        apiVersion: 'v1',
        endpoint: vaultAddr,
        token: vaultToken,
      });

      // Test connection with health check
      await this.vaultClient.health();
      this.isAvailable = true;
      this.logger.log(`✅ HashiCorp Vault connected successfully (kv mount: ${this.kvMount})`);
    } catch (error) {
      this.logger.error(`❌ Failed to connect to Vault: ${error.message}`);
      throw new Error(`Vault connection failed: ${error.message}`);
    }
  }

  async write(path: string, data: any): Promise<void> {
    this.ensureAvailable();
    try {
      await this.vaultClient.write(this.toKvV2DataPath(path), { data });
    } catch (error) {
      this.logger.error(`Failed to write to Vault at ${path}: ${error.message}`);
      throw error;
    }
  }

  async read(path: string): Promise<any> {
    this.ensureAvailable();
    try {
      const result = await this.vaultClient.read(this.toKvV2DataPath(path));
      // KV v2 shape: { data: { data: <payload>, metadata: ... } }
      if (result?.data?.data !== undefined) {
        return result.data.data;
      }
      return result?.data;
    } catch (error) {
      this.logger.error(`Failed to read from Vault at ${path}: ${error.message}`);
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    this.ensureAvailable();
    try {
      await this.vaultClient.delete(this.toKvV2DataPath(path));
    } catch (error) {
      this.logger.error(`Failed to delete from Vault at ${path}: ${error.message}`);
      throw error;
    }
  }

  private toKvV2DataPath(path: string): string {
    const normalized = path.replace(/^\/+/, '');
    // If caller already passed a fully-qualified KV v2 route, respect it.
    if (normalized.includes('/data/') || normalized.includes('/metadata/')) {
      return normalized;
    }
    return `${this.kvMount}/data/${normalized}`;
  }

  private ensureAvailable() {
    if (!this.isAvailable) {
      throw new Error('Vault is not available');
    }
  }

  getStatus(): { available: boolean } {
    return { available: this.isAvailable };
  }
}
