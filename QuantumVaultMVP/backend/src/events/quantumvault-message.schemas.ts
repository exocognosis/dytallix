import { AuditEventType } from '@prisma/client';

type RecordLike = Record<string, unknown>;

export type AccessAuditAnchorJobV1 = {
  schemaVersion: 'qv.access.audit.anchor-job.v1';
  eventId: string;
  queuedAt: string;
};

export type SiemExportJobV1 = {
  schemaVersion: 'qv.audit.siem-export-job.v1';
  eventId: string;
  queuedAt: string;
};

export type BlockchainAccessProofV1 = {
  schemaVersion: 'qv.blockchain.access-proof.v1';
  attestationHash: string;
  assetIdHash: string;
  contentHash: string;
  policyHash: string;
  eventType: AuditEventType;
  eventTypeHash: string;
  requesterHash: string;
  approvalHash: string;
  sessionTtlSeconds: number;
  anchorRef: string;
  systemSignature: string;
  signerKeyHash: string;
  proofOccurredAt: string;
  lineage?: {
    sourceAssetIdHash?: string;
    previousContentHash?: string;
    nextContentHash?: string;
    versionNumber?: number;
  };
  checkoutContext?: {
    bundleId?: string;
    credentialId?: string;
    devicePublicKeyHash?: string;
    deviceKeyAlgorithm?: string;
  };
};

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

export function buildAccessAuditAnchorJobV1(eventId: string): AccessAuditAnchorJobV1 {
  return {
    schemaVersion: 'qv.access.audit.anchor-job.v1',
    eventId,
    queuedAt: new Date().toISOString(),
  };
}

export function buildSiemExportJobV1(eventId: string): SiemExportJobV1 {
  return {
    schemaVersion: 'qv.audit.siem-export-job.v1',
    eventId,
    queuedAt: new Date().toISOString(),
  };
}

export function parseAccessAuditAnchorJobV1(value: unknown): AccessAuditAnchorJobV1 {
  const payload = value as RecordLike;
  if (payload?.schemaVersion !== 'qv.access.audit.anchor-job.v1') {
    throw new Error('Unsupported access-audit job schema version');
  }

  return {
    schemaVersion: 'qv.access.audit.anchor-job.v1',
    eventId: assertString(payload.eventId, 'eventId'),
    queuedAt: assertString(payload.queuedAt, 'queuedAt'),
  };
}

export function parseSiemExportJobV1(value: unknown): SiemExportJobV1 {
  const payload = value as RecordLike;
  if (payload?.schemaVersion !== 'qv.audit.siem-export-job.v1') {
    throw new Error('Unsupported siem-export job schema version');
  }

  return {
    schemaVersion: 'qv.audit.siem-export-job.v1',
    eventId: assertString(payload.eventId, 'eventId'),
    queuedAt: assertString(payload.queuedAt, 'queuedAt'),
  };
}

export function buildBlockchainAccessProofV1(input: BlockchainAccessProofV1): BlockchainAccessProofV1 {
  return {
    ...input,
    schemaVersion: 'qv.blockchain.access-proof.v1',
  };
}
