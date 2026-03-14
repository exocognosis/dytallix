import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { AuditEventType, NetworkZone, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { canonicalJsonSha256Hex } from '../crypto/canonical-json';
import { AttestationService } from '../attestation/attestation.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '@nestjs/config';
import { MonitoringMetricsService } from '../monitoring/metrics.service';
import {
  buildAccessAuditAnchorJobV1,
  buildBlockchainAccessProofV1,
  buildSiemExportJobV1,
} from '../events/quantumvault-message.schemas';

@Injectable()
export class AuditLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attestationService: AttestationService,
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
    private readonly monitoringMetrics: MonitoringMetricsService,
    @InjectQueue('access-audit') private readonly accessAuditQueue: Queue,
    @InjectQueue('siem-export') private readonly siemExportQueue: Queue,
  ) {}

  private shouldAnchor(eventType: AuditEventType): boolean {
    const configured = (this.configService.get<string>('ACCESS_AUDIT_ANCHOR_EVENTS') || '').trim();
    if (configured) {
      const events = configured.split(',').map((value) => value.trim().toUpperCase());
      return events.includes(eventType);
    }

    return ['ACCESS_REQUEST', 'APPROVAL', 'DENIAL', 'SESSION_START', 'SESSION_END', 'REVOCATION'].includes(eventType);
  }

  private shouldExportToSiem() {
    const enabled = (this.configService.get<string>('SIEM_EXPORT_ENABLED') || 'false').trim().toLowerCase();
    return enabled === 'true';
  }

  private siemExportUrl() {
    return (this.configService.get<string>('SIEM_EXPORT_URL') || '').trim();
  }

  private siemExportFormat() {
    const format = (this.configService.get<string>('SIEM_EXPORT_FORMAT') || 'json').trim().toLowerCase();
    return format === 'splunk_hec' ? 'splunk_hec' : 'json';
  }

  private asPayloadRecord(payload: Prisma.JsonValue | null | undefined): Record<string, any> {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      return JSON.parse(JSON.stringify(payload)) as Record<string, any>;
    }
    return {};
  }

  private toJsonSafe<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_key, currentValue) =>
        typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
      ),
    ) as T;
  }

  private asBytes32Hex(value: string | null | undefined) {
    const normalized = String(value || '').trim();
    if (/^0x[a-fA-F0-9]{64}$/.test(normalized)) {
      return normalized;
    }
    return `0x${createHash('sha256').update(normalized || 'quantumvault').digest('hex')}`;
  }

  private async updateEventPayload(eventId: string, mutator: (payload: Record<string, any>) => Record<string, any>) {
    const current = await this.prisma.auditLedgerEvent.findUnique({
      where: { id: eventId },
      select: { payload: true },
    });
    if (!current) {
      return;
    }

    await this.prisma.auditLedgerEvent.update({
      where: { id: eventId },
      data: {
        payload: JSON.parse(JSON.stringify(mutator(this.asPayloadRecord(current.payload)))) as Prisma.InputJsonValue,
      },
    });
  }

  async recordEvent(input: {
    eventType: AuditEventType;
    action: string;
    result: string;
    pipelineAssetId?: string | null;
    accessRequestId?: string | null;
    accessSessionId?: string | null;
    userId?: string | null;
    role?: string | null;
    deviceId?: string | null;
    location?: string | null;
    networkZone?: NetworkZone | null;
    policyVersion?: string | null;
    policyHash?: string | null;
    assetHash?: string | null;
    payload: Record<string, unknown>;
  }) {
    const shouldAnchor = this.shouldAnchor(input.eventType);
    const blockchainAvailable = this.blockchainService.getStatus().available;
    const siemEnabled = this.shouldExportToSiem();
    const previous = await this.prisma.auditLedgerEvent.findFirst({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        eventHash: true,
      },
    });

    const envelope = {
      schemaVersion: 'qv.audit.v1',
      eventType: input.eventType,
      action: input.action,
      result: input.result,
      pipelineAssetId: input.pipelineAssetId || null,
      accessRequestId: input.accessRequestId || null,
      accessSessionId: input.accessSessionId || null,
      userId: input.userId || null,
      role: input.role || null,
      deviceId: input.deviceId || null,
      location: input.location || null,
      networkZone: input.networkZone || null,
      policyVersion: input.policyVersion || null,
      policyHash: input.policyHash || null,
      assetHash: input.assetHash || null,
      previousEventHash: previous?.eventHash || null,
      payload: input.payload,
      occurredAt: new Date().toISOString(),
    };

    const eventHash = `0x${canonicalJsonSha256Hex(envelope)}`;
    const signature = await this.attestationService.signDigest('qv.audit.v1', eventHash);

    const event = await this.prisma.auditLedgerEvent.create({
      data: {
        eventType: input.eventType,
        action: input.action,
        result: input.result,
        pipelineAssetId: input.pipelineAssetId || null,
        accessRequestId: input.accessRequestId || null,
        accessSessionId: input.accessSessionId || null,
        userId: input.userId || null,
        role: input.role || null,
        deviceId: input.deviceId || null,
        location: input.location || null,
        networkZone: input.networkZone || null,
        policyVersion: input.policyVersion || null,
        policyHash: input.policyHash || null,
        assetHash: input.assetHash || null,
        previousEventHash: previous?.eventHash || null,
        eventHash,
        signatureAlgorithm: signature.algorithm,
        digitalSignature: signature.signatureHex,
        blockchainTxHash: null,
        blockchainBlockNumber: null,
        payload: JSON.parse(JSON.stringify({
          ...envelope,
          signer: signature,
          anchor: shouldAnchor
            ? blockchainAvailable
              ? { status: 'queued', queuedAt: new Date().toISOString() }
              : { status: 'skipped', reason: 'blockchain_unavailable' }
            : { status: 'skipped', reason: 'policy_excluded' },
          siemExport: siemEnabled
            ? this.siemExportUrl()
              ? { status: 'queued', queuedAt: new Date().toISOString(), format: this.siemExportFormat() }
              : { status: 'skipped', reason: 'siem_url_missing' }
            : { status: 'skipped', reason: 'disabled' },
        })) as Prisma.InputJsonValue,
      },
    });

    this.monitoringMetrics.recordAuditLedgerEvent(input.eventType, input.result);

    if (input.pipelineAssetId) {
      await this.prisma.pipelineAsset.update({
        where: { id: input.pipelineAssetId },
        data: { accessHistoryRef: event.id },
      }).catch(() => undefined);
    }

    if (shouldAnchor && blockchainAvailable) {
      try {
        await this.accessAuditQueue.add(
          'anchor-audit-event',
          buildAccessAuditAnchorJobV1(event.id),
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: 1000,
            removeOnFail: 1000,
          },
        );
        this.monitoringMetrics.recordAuditAnchorJob('queued');
      } catch (error) {
        this.monitoringMetrics.recordAuditAnchorJob('failed');
        await this.updateEventPayload(event.id, (payload) => ({
          ...payload,
          anchor: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'queue_enqueue_failed',
            failedAt: new Date().toISOString(),
          },
        }));
      }
    } else {
      this.monitoringMetrics.recordAuditAnchorJob('skipped');
    }

    if (siemEnabled && this.siemExportUrl()) {
      try {
        await this.siemExportQueue.add(
          'export-audit-event',
          buildSiemExportJobV1(event.id),
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 1500 },
            removeOnComplete: 1000,
            removeOnFail: 1000,
          },
        );
        this.monitoringMetrics.recordSiemExportJob('queued');
      } catch (error) {
        this.monitoringMetrics.recordSiemExportJob('failed');
        await this.updateEventPayload(event.id, (payload) => ({
          ...payload,
          siemExport: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'queue_enqueue_failed',
            failedAt: new Date().toISOString(),
          },
        }));
      }
    } else {
      this.monitoringMetrics.recordSiemExportJob('skipped');
    }

    return event;
  }

  private buildAccessProof(event: {
    id: string;
    eventType: AuditEventType;
    eventHash: string;
    assetHash: string | null;
    pipelineAssetId: string | null;
    accessRequestId: string | null;
    accessSessionId: string | null;
    userId: string | null;
    policyHash: string | null;
    digitalSignature: string;
    createdAt: Date;
    payload: Prisma.JsonValue | null;
    accessRequest?: { approvalHash: string | null } | null;
  }, signerKeyHashHex: string) {
    const payload = this.asPayloadRecord(event.payload);
    const lineage = payload.lineage && typeof payload.lineage === 'object' && !Array.isArray(payload.lineage)
      ? (payload.lineage as Record<string, unknown>)
      : {};
    const approvalHash =
      (typeof payload.approvalHash === 'string' && payload.approvalHash)
      || event.accessRequest?.approvalHash
      || 'approval:none';
    const expiresAt =
      typeof payload.expiresAt === 'string'
        ? new Date(payload.expiresAt)
        : null;
    const sessionTtlSeconds = expiresAt && Number.isFinite(expiresAt.getTime())
      ? Math.max(0, Math.floor((expiresAt.getTime() - event.createdAt.getTime()) / 1000))
      : 0;

    return buildBlockchainAccessProofV1({
      schemaVersion: 'qv.blockchain.access-proof.v1',
      attestationHash: this.asBytes32Hex(event.eventHash),
      assetIdHash: this.asBytes32Hex(event.pipelineAssetId || 'asset:none'),
      contentHash: this.asBytes32Hex(event.assetHash || event.pipelineAssetId || event.id),
      policyHash: this.asBytes32Hex(event.policyHash || 'policy:none'),
      eventType: event.eventType,
      eventTypeHash: this.asBytes32Hex(event.eventType),
      requesterHash: this.asBytes32Hex(event.userId || 'requester:none'),
      approvalHash: this.asBytes32Hex(approvalHash),
      sessionTtlSeconds,
      anchorRef: event.accessSessionId || event.accessRequestId || event.id,
      systemSignature: event.digitalSignature,
      signerKeyHash: this.asBytes32Hex(signerKeyHashHex),
      proofOccurredAt: event.createdAt.toISOString(),
      lineage: {
        sourceAssetIdHash:
          typeof lineage.sourceAssetId === 'string' && lineage.sourceAssetId
            ? this.asBytes32Hex(lineage.sourceAssetId)
            : undefined,
        previousContentHash:
          typeof lineage.previousContentHash === 'string' && lineage.previousContentHash
            ? this.asBytes32Hex(lineage.previousContentHash)
            : undefined,
        nextContentHash:
          typeof lineage.newContentHash === 'string' && lineage.newContentHash
            ? this.asBytes32Hex(lineage.newContentHash)
            : undefined,
        versionNumber:
          typeof lineage.versionNumber === 'number' && Number.isFinite(lineage.versionNumber)
            ? Math.trunc(lineage.versionNumber)
            : undefined,
      },
      checkoutContext: {
        bundleId: typeof payload.checkoutBundleId === 'string' ? payload.checkoutBundleId : undefined,
        credentialId: typeof payload.credentialId === 'string' ? payload.credentialId : undefined,
        devicePublicKeyHash:
          typeof payload.devicePublicKeyHash === 'string' ? payload.devicePublicKeyHash : undefined,
        deviceKeyAlgorithm:
          typeof payload.deviceKeyAlgorithm === 'string' ? payload.deviceKeyAlgorithm : undefined,
      },
    });
  }

  async processAnchoringJob(eventId: string) {
    const event = await this.prisma.auditLedgerEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        eventType: true,
        eventHash: true,
        assetHash: true,
        pipelineAssetId: true,
        accessRequestId: true,
        accessSessionId: true,
        userId: true,
        policyHash: true,
        digitalSignature: true,
        blockchainTxHash: true,
        createdAt: true,
        payload: true,
        accessRequest: {
          select: {
            approvalHash: true,
          },
        },
      },
    });

    if (!event || event.blockchainTxHash) {
      return;
    }

    const payload = this.asPayloadRecord(event.payload);
    const signerKeyHashHex = payload?.signer?.signerKeyHashHex;
    if (typeof signerKeyHashHex !== 'string' || signerKeyHashHex.length === 0) {
      throw new Error(`Audit event ${eventId} is missing signer key hash`);
    }

    try {
      const result = await this.blockchainService.recordAccessProof(
        this.buildAccessProof(event, signerKeyHashHex),
      );

      await this.prisma.auditLedgerEvent.update({
        where: { id: event.id },
        data: {
          blockchainTxHash: result.txHash,
          blockchainBlockNumber: BigInt(result.blockNumber),
          payload: JSON.parse(JSON.stringify({
            ...payload,
            anchor: {
              status: 'anchored',
              txHash: result.txHash,
              blockNumber: result.blockNumber,
              chainId: result.chainId ?? null,
              anchoredAt: new Date().toISOString(),
            },
          })) as Prisma.InputJsonValue,
        },
      });

      this.monitoringMetrics.recordAuditAnchorJob('success');
    } catch (error) {
      this.monitoringMetrics.recordAuditAnchorJob('failed');
      await this.updateEventPayload(event.id, (currentPayload) => ({
        ...currentPayload,
        anchor: {
          status: 'failed',
          error: error instanceof Error ? error.message : 'anchor_failed',
          failedAt: new Date().toISOString(),
        },
      }));
      throw error;
    }
  }

  async processSiemExportJob(eventId: string) {
    const event = await this.prisma.auditLedgerEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        eventType: true,
        action: true,
        result: true,
        pipelineAssetId: true,
        accessRequestId: true,
        accessSessionId: true,
        userId: true,
        role: true,
        deviceId: true,
        location: true,
        networkZone: true,
        policyVersion: true,
        policyHash: true,
        assetHash: true,
        eventHash: true,
        digitalSignature: true,
        payload: true,
        createdAt: true,
      },
    });

    if (!event) {
      return;
    }

    const exportUrl = this.siemExportUrl();
    if (!exportUrl) {
      await this.updateEventPayload(eventId, (payload) => ({
        ...payload,
        siemExport: {
          status: 'skipped',
          reason: 'siem_url_missing',
        },
      }));
      return;
    }

    const exportEnvelope = {
      schemaVersion: 'qv.audit.siem.v1',
      exportedAt: new Date().toISOString(),
      event,
    };

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    const exportToken = (this.configService.get<string>('SIEM_EXPORT_AUTH_TOKEN') || '').trim();
    const exportFormat = this.siemExportFormat();
    let body: string;

    if (exportFormat === 'splunk_hec') {
      if (exportToken) {
        headers.authorization = `Splunk ${exportToken}`;
      }
      body = JSON.stringify({
        time: Math.floor(event.createdAt.getTime() / 1000),
        host: this.configService.get<string>('HOSTNAME') || 'quantumvault-backend',
        source: 'quantumvault.audit',
        sourcetype: 'quantumvault:audit',
        event: exportEnvelope,
      });
    } else {
      if (exportToken) {
        headers.authorization = `Bearer ${exportToken}`;
      }
      body = JSON.stringify(exportEnvelope);
    }

    const timeoutMs = Math.max(1000, Number(this.configService.get<string>('SIEM_EXPORT_TIMEOUT_MS') || 5000));
    const response = await fetch(exportUrl, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      this.monitoringMetrics.recordSiemExportJob('failed');
      await this.updateEventPayload(event.id, (payload) => ({
        ...payload,
        siemExport: {
          status: 'failed',
          format: exportFormat,
          httpStatus: response.status,
          failedAt: new Date().toISOString(),
        },
      }));
      throw new Error(`SIEM export failed with HTTP ${response.status}`);
    }

    this.monitoringMetrics.recordSiemExportJob('success');
    await this.updateEventPayload(event.id, (payload) => ({
      ...payload,
      siemExport: {
        status: 'exported',
        format: exportFormat,
        exportedAt: new Date().toISOString(),
        endpoint: exportUrl,
      },
    }));
  }

  async listEvents(filters?: { eventType?: string; pipelineAssetId?: string; limit?: number }) {
    const events = await this.prisma.auditLedgerEvent.findMany({
      where: {
        ...(filters?.eventType ? { eventType: filters.eventType as AuditEventType } : {}),
        ...(filters?.pipelineAssetId ? { pipelineAssetId: filters.pipelineAssetId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.max(1, Math.min(filters?.limit || 100, 500)),
    });

    return this.toJsonSafe(events);
  }
}
