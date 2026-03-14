import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { MonitoringMetricsService } from '../monitoring/metrics.service';

type StorageBackend = 'filesystem' | 's3';

type WriteObjectInput = {
  destinationPath: string;
  body: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
};

type StoredObjectResult = {
  backend: StorageBackend;
  destinationPath: string;
  storageLocation: string;
  sizeBytes: number;
  checksumSha256Hex: string;
  etag: string | null;
};

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private s3Client: S3Client | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly monitoringMetrics: MonitoringMetricsService,
  ) {}

  private getConfiguredBackend(): StorageBackend {
    const configured = (this.configService.get<string>('STORAGE_BACKEND') || 'filesystem').trim().toLowerCase();
    return configured === 's3' ? 's3' : 'filesystem';
  }

  private normalizeS3Key(key: string) {
    return key.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/{2,}/g, '/');
  }

  private getFilesystemRoot() {
    const configured = (this.configService.get<string>('STORAGE_FILESYSTEM_ROOT') || '').trim();
    return configured ? path.resolve(configured) : '';
  }

  private normalizeFilesystemPath(target: string) {
    if (target.startsWith('file://')) {
      return decodeURIComponent(new URL(target).pathname);
    }

    if (path.isAbsolute(target)) {
      return target;
    }

    const root = this.getFilesystemRoot();
    if (root) {
      return path.join(root, target.replace(/^[/\\]+/, ''));
    }

    return path.resolve(target);
  }

  private getS3Bucket() {
    const bucket = (this.configService.get<string>('OBJECT_STORAGE_BUCKET') || '').trim();
    if (!bucket) {
      throw new Error('OBJECT_STORAGE_BUCKET is required when STORAGE_BACKEND=s3');
    }
    return bucket;
  }

  private getS3Client() {
    if (this.s3Client) {
      return this.s3Client;
    }

    const region = (this.configService.get<string>('OBJECT_STORAGE_REGION') || 'us-east-1').trim();
    const endpoint = (this.configService.get<string>('OBJECT_STORAGE_ENDPOINT') || '').trim();
    const accessKeyId = (this.configService.get<string>('OBJECT_STORAGE_ACCESS_KEY_ID') || '').trim();
    const secretAccessKey = (this.configService.get<string>('OBJECT_STORAGE_SECRET_ACCESS_KEY') || '').trim();
    const forcePathStyle = ((this.configService.get<string>('OBJECT_STORAGE_FORCE_PATH_STYLE') || 'true').trim().toLowerCase() === 'true');

    this.s3Client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });

    return this.s3Client;
  }

  private toStorageLocation(backend: StorageBackend, destinationPath: string) {
    if (backend === 's3') {
      return `s3://${this.getS3Bucket()}/${this.normalizeS3Key(destinationPath)}`;
    }

    const absolute = this.normalizeFilesystemPath(destinationPath);
    return `file://${absolute}`;
  }

  private parseStorageLocation(location: string): { backend: StorageBackend; destinationPath: string } {
    if (location.startsWith('s3://')) {
      const withoutScheme = location.slice('s3://'.length);
      const slashIndex = withoutScheme.indexOf('/');
      if (slashIndex === -1) {
        throw new Error(`Invalid S3 storage location: ${location}`);
      }
      const bucket = withoutScheme.slice(0, slashIndex);
      const key = withoutScheme.slice(slashIndex + 1);
      if (bucket !== this.getS3Bucket()) {
        this.logger.warn(`Reading object from configured bucket ${this.getS3Bucket()} but location references ${bucket}`);
      }
      return { backend: 's3', destinationPath: this.normalizeS3Key(key) };
    }

    if (location.startsWith('file://')) {
      return { backend: 'filesystem', destinationPath: this.normalizeFilesystemPath(location) };
    }

    if (path.isAbsolute(location)) {
      return { backend: 'filesystem', destinationPath: location };
    }

    return {
      backend: this.getConfiguredBackend(),
      destinationPath:
        this.getConfiguredBackend() === 's3' ? this.normalizeS3Key(location) : this.normalizeFilesystemPath(location),
    };
  }

  private buildS3Key(destinationPath: string) {
    const prefix = this.normalizeS3Key((this.configService.get<string>('OBJECT_STORAGE_PREFIX') || '').trim());
    const normalizedPath = this.normalizeS3Key(destinationPath);
    return [prefix, normalizedPath].filter(Boolean).join('/');
  }

  private async bodyToBuffer(body: any): Promise<Buffer> {
    if (!body) {
      return Buffer.alloc(0);
    }

    if (Buffer.isBuffer(body)) {
      return body;
    }

    if (body instanceof Uint8Array) {
      return Buffer.from(body);
    }

    if (typeof body.transformToByteArray === 'function') {
      return Buffer.from(await body.transformToByteArray());
    }

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      body.on('data', (chunk: Buffer | Uint8Array | string) => {
        if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk));
        } else if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
        } else {
          chunks.push(Buffer.from(chunk));
        }
      });
      body.on('end', () => resolve(Buffer.concat(chunks)));
      body.on('error', reject);
    });
  }

  async writeEncryptedPayload(input: WriteObjectInput): Promise<StoredObjectResult> {
    const backend = this.getConfiguredBackend();
    const startedAt = process.hrtime.bigint();
    const bodyBuffer = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body, 'utf8');
    const checksumSha256Hex = createHash('sha256').update(bodyBuffer).digest('hex');

    try {
      if (backend === 's3') {
        const destinationPath = this.buildS3Key(input.destinationPath);
        const response = await this.getS3Client().send(
          new PutObjectCommand({
            Bucket: this.getS3Bucket(),
            Key: destinationPath,
            Body: bodyBuffer,
            ContentType: input.contentType || 'application/octet-stream',
            Metadata: input.metadata,
            ChecksumSHA256: createHash('sha256').update(bodyBuffer).digest('base64'),
          }),
        );

        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
        this.monitoringMetrics.recordStorageOperation('put', backend, 'success', durationSeconds);

        return {
          backend,
          destinationPath,
          storageLocation: this.toStorageLocation(backend, destinationPath),
          sizeBytes: bodyBuffer.length,
          checksumSha256Hex,
          etag: response.ETag || null,
        };
      }

      const destinationPath = this.normalizeFilesystemPath(input.destinationPath);
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.writeFile(destinationPath, bodyBuffer);

      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.monitoringMetrics.recordStorageOperation('put', backend, 'success', durationSeconds);

      return {
        backend,
        destinationPath,
        storageLocation: this.toStorageLocation(backend, destinationPath),
        sizeBytes: bodyBuffer.length,
        checksumSha256Hex,
        etag: null,
      };
    } catch (error) {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.monitoringMetrics.recordStorageOperation('put', backend, 'error', durationSeconds);
      throw error;
    }
  }

  async readObject(location: string): Promise<Buffer> {
    const resolved = this.parseStorageLocation(location);
    const startedAt = process.hrtime.bigint();

    try {
      if (resolved.backend === 's3') {
        const response = await this.getS3Client().send(
          new GetObjectCommand({
            Bucket: this.getS3Bucket(),
            Key: resolved.destinationPath,
          }),
        );
        const buffer = await this.bodyToBuffer(response.Body);
        const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
        this.monitoringMetrics.recordStorageOperation('get', resolved.backend, 'success', durationSeconds);
        return buffer;
      }

      const buffer = await fs.readFile(resolved.destinationPath);
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.monitoringMetrics.recordStorageOperation('get', resolved.backend, 'success', durationSeconds);
      return buffer;
    } catch (error) {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.monitoringMetrics.recordStorageOperation('get', resolved.backend, 'error', durationSeconds);
      throw error;
    }
  }

  async readText(location: string) {
    return (await this.readObject(location)).toString('utf8');
  }

  async getBackendStatus() {
    const backend = this.getConfiguredBackend();

    try {
      if (backend === 's3') {
        const bucket = this.getS3Bucket();
        await this.getS3Client().send(new HeadBucketCommand({ Bucket: bucket }));
        this.monitoringMetrics.setStorageBackendAvailability(backend, true);
        return {
          backend,
          available: true,
          bucket,
          endpoint: (this.configService.get<string>('OBJECT_STORAGE_ENDPOINT') || '').trim() || null,
          region: (this.configService.get<string>('OBJECT_STORAGE_REGION') || 'us-east-1').trim(),
        };
      }

      const root = this.getFilesystemRoot() || process.cwd();
      await fs.mkdir(root, { recursive: true });
      this.monitoringMetrics.setStorageBackendAvailability(backend, true);
      return {
        backend,
        available: true,
        root,
      };
    } catch (error) {
      this.monitoringMetrics.setStorageBackendAvailability(backend, false);
      return {
        backend,
        available: false,
        error: error instanceof Error ? error.message : 'storage_unavailable',
      };
    }
  }
}
