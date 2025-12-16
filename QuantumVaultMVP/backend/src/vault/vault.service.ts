import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import vault from 'node-vault';

@Injectable()
export class VaultService implements OnModuleInit {
  private readonly logger = new Logger(VaultService.name);
  private vaultClient: any;
  private isAvailable = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const vaultAddr = this.configService.get<string>('VAULT_ADDR');
    const vaultToken = this.configService.get<string>('VAULT_TOKEN');

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
      this.logger.log('✅ HashiCorp Vault connected successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to connect to Vault: ${error.message}`);
      throw new Error(`Vault connection failed: ${error.message}`);
    }
  }

  async write(path: string, data: any): Promise<void> {
    this.ensureAvailable();
    try {
      await this.vaultClient.write(path, { data });
    } catch (error) {
      this.logger.error(`Failed to write to Vault at ${path}: ${error.message}`);
      throw error;
    }
  }

  async read(path: string): Promise<any> {
    this.ensureAvailable();
    try {
      const result = await this.vaultClient.read(path);
      return result.data;
    } catch (error) {
      this.logger.error(`Failed to read from Vault at ${path}: ${error.message}`);
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    this.ensureAvailable();
    try {
      await this.vaultClient.delete(path);
    } catch (error) {
      this.logger.error(`Failed to delete from Vault at ${path}: ${error.message}`);
      throw error;
    }
  }

  async generateKey(algorithm: string, keySize: number): Promise<string> {
    this.ensureAvailable();
    // Generate random bytes for key material
    const crypto = require('crypto');
    return crypto.randomBytes(keySize).toString('base64');
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
