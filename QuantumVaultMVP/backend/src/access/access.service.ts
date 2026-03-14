import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  AccessDecision,
  AccessSessionStatus,
  DeviceComplianceStatus,
  ManagedCredentialStatus,
  NetworkZone,
  PipelineAsset,
  Prisma,
  User,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AssetRegistryService } from './asset-registry.service';
import { AccessPolicyService } from './access-policy.service';
import { AuditLedgerService } from './audit-ledger.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { deriveAes256Key, getMlKemByAlgorithm, wrapSuiteForKemAlgorithm } from '../crypto/mlkem';
import { VaultService } from '../vault/vault.service';
import { canonicalJsonBuffer, canonicalJsonSha256Hex } from '../crypto/canonical-json';
import { ObjectStorageService } from '../storage/object-storage.service';
import { MonitoringMetricsService } from '../monitoring/metrics.service';
import { AttestationService } from '../attestation/attestation.service';

type StoredPipelinePayload = {
  version: string;
  algorithm: string;
  kemAlgorithm: string;
  anchorId: string;
  source?: {
    relativePath?: string;
    sizeBytes?: number;
  };
  envelope: {
    kemCiphertext: string;
    salt: string;
    nonce: string;
    aeadTag: string;
    aadContext: Record<string, unknown>;
  };
  ciphertext: string;
};

type SessionMetadata = {
  storagePath?: string;
  controlledViewerRequired?: boolean;
  sourceRelativePath?: string;
  requestLocation?: string;
  locationPolicyRequired?: boolean;
  checkout?: {
    bundleId?: string;
    credentialId?: string;
    state?: 'issued' | 'checked_in';
    issuedAt?: string;
    checkedInAt?: string;
    checkedInAssetId?: string;
    manifestDigestSha256?: string;
    devicePublicKeyHash?: string;
    deviceKeyAlgorithm?: string;
    versionNumber?: number;
  };
};

type SessionEnvelopeState = {
  metadata: SessionMetadata;
  storedPayload: StoredPipelinePayload;
  contentKey: Buffer;
  relativePath: string;
};

const PQC_PIPELINE_VERSION = 'qv-pqc-v1';

@Injectable()
export class AccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetRegistryService: AssetRegistryService,
    private readonly accessPolicyService: AccessPolicyService,
    private readonly auditLedgerService: AuditLedgerService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly vaultService: VaultService,
    private readonly objectStorageService: ObjectStorageService,
    private readonly monitoringMetrics: MonitoringMetricsService,
    private readonly attestationService: AttestationService,
  ) {}

  private sessionWrapKeyPath(sessionId: string) {
    return `quantumvault/access-sessions/${sessionId}/wrap-key`;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private asJsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    }
    return {};
  }

  private getRequestHeader(req: any, headerName: string): string | null {
    const value = req?.headers?.[headerName];
    if (Array.isArray(value)) {
      return typeof value[0] === 'string' && value[0].trim() ? value[0].trim() : null;
    }
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private normalizeLocationValue(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().replace(/\s+/g, ' ').toUpperCase();
    return normalized || null;
  }

  private parseSessionMetadata(value: Prisma.JsonValue | null | undefined): SessionMetadata {
    const payload = this.asJsonRecord(value);
    const checkoutRecord =
      payload.checkout && typeof payload.checkout === 'object' && !Array.isArray(payload.checkout)
        ? (payload.checkout as Record<string, unknown>)
        : {};
    return {
      storagePath: typeof payload.storagePath === 'string' ? payload.storagePath : undefined,
      controlledViewerRequired: Boolean(payload.controlledViewerRequired),
      sourceRelativePath: typeof payload.sourceRelativePath === 'string' ? payload.sourceRelativePath : undefined,
      requestLocation: typeof payload.requestLocation === 'string' ? payload.requestLocation : undefined,
      locationPolicyRequired: Boolean(payload.locationPolicyRequired),
      checkout: Object.keys(checkoutRecord).length
        ? {
            bundleId: typeof checkoutRecord.bundleId === 'string' ? checkoutRecord.bundleId : undefined,
            credentialId:
              typeof checkoutRecord.credentialId === 'string' ? checkoutRecord.credentialId : undefined,
            state:
              checkoutRecord.state === 'issued' || checkoutRecord.state === 'checked_in'
                ? checkoutRecord.state
                : undefined,
            issuedAt: typeof checkoutRecord.issuedAt === 'string' ? checkoutRecord.issuedAt : undefined,
            checkedInAt: typeof checkoutRecord.checkedInAt === 'string' ? checkoutRecord.checkedInAt : undefined,
            checkedInAssetId:
              typeof checkoutRecord.checkedInAssetId === 'string' ? checkoutRecord.checkedInAssetId : undefined,
            manifestDigestSha256:
              typeof checkoutRecord.manifestDigestSha256 === 'string'
                ? checkoutRecord.manifestDigestSha256
                : undefined,
            devicePublicKeyHash:
              typeof checkoutRecord.devicePublicKeyHash === 'string' ? checkoutRecord.devicePublicKeyHash : undefined,
            deviceKeyAlgorithm:
              typeof checkoutRecord.deviceKeyAlgorithm === 'string' ? checkoutRecord.deviceKeyAlgorithm : undefined,
            versionNumber:
              typeof checkoutRecord.versionNumber === 'number' && Number.isFinite(checkoutRecord.versionNumber)
                ? Math.trunc(checkoutRecord.versionNumber)
                : undefined,
          }
        : undefined,
    };
  }

  private toJsonSafe<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_key, currentValue) =>
        typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
      ),
    ) as T;
  }

  private sha256Hex(value: Buffer | string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashBytes32(value: string) {
    return `0x${this.sha256Hex(value)}`;
  }

  private hashBase64Bytes(value: string) {
    return this.sha256Hex(Buffer.from(value, 'base64'));
  }

  private parseManagedCredentialStatus(value: unknown): ManagedCredentialStatus | null {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'ACTIVE') return 'ACTIVE';
    if (normalized === 'REVOKED') return 'REVOKED';
    if (normalized === 'EXPIRED') return 'EXPIRED';
    return null;
  }

  private buildViewerUrl(sessionId: string, viewerToken: string) {
    return `/access/sessions/${sessionId}/viewer?viewerToken=${encodeURIComponent(viewerToken)}`;
  }

  private viewerTokenLifetimeSeconds(expiresAt: Date) {
    const remainingSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    return Math.min(remainingSeconds, 5 * 60);
  }

  private signViewerToken(sessionId: string, requesterUserId: string, expiresAt: Date) {
    return this.jwtService.sign(
      {
        sub: requesterUserId,
        sid: sessionId,
        typ: 'controlled-viewer',
      },
      { expiresIn: this.viewerTokenLifetimeSeconds(expiresAt) },
    );
  }

  private verifyViewerToken(sessionId: string, requesterUserId: string, viewerToken: string) {
    try {
      const payload = this.jwtService.verify(viewerToken);
      if (payload?.typ !== 'controlled-viewer' || payload?.sid !== sessionId || payload?.sub !== requesterUserId) {
        throw new UnauthorizedException('Controlled viewer token is invalid for this session');
      }
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Controlled viewer token is invalid or expired');
    }
  }

  private async expireManagedCredentials() {
    await this.prisma.managedCredential.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          not: null,
          lt: new Date(),
        },
      },
      data: {
        status: 'EXPIRED',
      },
    }).catch(() => undefined);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async expireStaleSessions() {
    const stale = await this.prisma.accessSession.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() },
      },
      select: {
        id: true,
        wrapKeyVaultPath: true,
        pipelineAssetId: true,
      },
    });

    if (stale.length === 0) {
      return;
    }

    await this.prisma.accessSession.updateMany({
      where: { id: { in: stale.map((entry) => entry.id) } },
      data: {
        status: 'EXPIRED',
        revokedAt: new Date(),
      },
    });

    for (const session of stale) {
      await this.vaultService.delete(session.wrapKeyVaultPath).catch(() => undefined);
      await this.prisma.pipelineAsset.update({
        where: { id: session.pipelineAssetId },
        data: { lifecycleState: 'ACCESS_EXPIRED' },
      }).catch(() => undefined);
    }
  }

  private async loadPipelineAsset(id: string): Promise<PipelineAsset> {
    const asset = await this.prisma.pipelineAsset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException('Pipeline asset not found');
    }
    return asset;
  }

  private resolveAssetStoragePath(asset: Pick<PipelineAsset, 'storageLocation' | 'destinationPath'>) {
    const storagePath = asset.storageLocation || asset.destinationPath;
    if (!storagePath) {
      throw new Error('Pipeline asset storage location is not available');
    }
    return storagePath;
  }

  private async loadStoredPayloadForAsset(asset: Pick<PipelineAsset, 'storageLocation' | 'destinationPath'>) {
    return this.parsePipelinePayload(await this.objectStorageService.readText(this.resolveAssetStoragePath(asset)));
  }

  private async unwrapSessionContentKey(session: Awaited<ReturnType<AccessService['verifySessionToken']>>) {
    const wrapKeyRecord = await this.vaultService.read(session.wrapKeyVaultPath);
    const wrapKeyBase64 = wrapKeyRecord?.data?.key || wrapKeyRecord?.key;
    if (!wrapKeyBase64) {
      throw new Error('Session wrap key is unavailable');
    }

    const wrapKey = Buffer.from(wrapKeyBase64, 'base64');
    const unwrapCipher = createDecipheriv('aes-256-gcm', wrapKey, Buffer.from(session.rewrappedKeyNonce, 'base64'));
    unwrapCipher.setAuthTag(Buffer.from(session.rewrappedKeyTag, 'base64'));
    unwrapCipher.setAAD(
      canonicalJsonBuffer({
        schemaVersion: 'qv.access.rewrap.v1',
        sessionId: session.id,
        accessRequestId: session.accessRequestId,
        pipelineAssetId: session.pipelineAssetId,
        expiresAt: session.expiresAt.toISOString(),
      }),
    );

    return Buffer.concat([
      unwrapCipher.update(Buffer.from(session.rewrappedKeyCiphertext, 'base64')),
      unwrapCipher.final(),
    ]);
  }

  private async recoverSessionEnvelopeState(
    session: Awaited<ReturnType<AccessService['verifySessionToken']>>,
  ): Promise<SessionEnvelopeState> {
    const metadata = this.parseSessionMetadata(session.metadata);
    const storedPayload = await this.loadStoredPayloadForAsset(session.pipelineAsset);
    const contentKey = await this.unwrapSessionContentKey(session);
    const relativePath = metadata.sourceRelativePath || session.pipelineAsset.relativePath;

    return {
      metadata,
      storedPayload,
      contentKey,
      relativePath,
    };
  }

  private async resolveRequesterContext(user: User, req: any) {
    const session = await this.authService.getSessionContextForRequest(req);
    const sessionClaims = this.asJsonRecord(session?.sessionClaims);
    const deviceAttestation =
      sessionClaims.deviceAttestation && typeof sessionClaims.deviceAttestation === 'object' && !Array.isArray(sessionClaims.deviceAttestation)
        ? (sessionClaims.deviceAttestation as Record<string, unknown>)
        : {};
    const currentRequestLocation = this.getRequestHeader(req, 'x-qv-location');
    const identityType: 'user' | 'service_account' =
      sessionClaims.identityType === 'service_account' ? 'service_account' : 'user';

    return {
      role: user.role,
      department: session?.user?.department || user.department || null,
      clearanceLevel: session?.user?.clearanceLevel || user.clearanceLevel,
      projectMemberships: Array.isArray(session?.user?.projectMemberships)
        ? session!.user.projectMemberships
        : Array.isArray(user.projectMemberships)
          ? user.projectMemberships
          : [],
      mfaSatisfied: Boolean(session?.mfaSatisfied || session?.user?.lastMfaAt),
      stepUpSatisfied: Boolean(session?.stepUpSatisfied),
      strongClientAuth: Boolean(sessionClaims.strongClientAuth),
      deviceId: session?.deviceId || null,
      deviceCompliance: (session?.deviceCompliance || 'UNKNOWN') as DeviceComplianceStatus,
      deviceAttested: Boolean(deviceAttestation.verifiedAt || deviceAttestation.attested),
      networkZone: (session?.networkZone || 'UNKNOWN') as NetworkZone,
      identityType,
      ipAddress: session?.ipAddress || null,
      location: currentRequestLocation || (typeof sessionClaims.location === 'string' ? sessionClaims.location : null),
    };
  }

  private async countActiveSessions(pipelineAssetId: string, requesterUserId: string) {
    const [activeSessionsForAsset, activeSessionsForUser] = await Promise.all([
      this.prisma.accessSession.count({
        where: {
          pipelineAssetId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      }),
      this.prisma.accessSession.count({
        where: {
          requesterUserId,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    return { activeSessionsForAsset, activeSessionsForUser };
  }

  private async createApprovalForRequest(
    requestId: string,
    user: User,
    asset: PipelineAsset,
    reason: string,
    policyHash: string,
  ) {
    const approval = await this.prisma.adminApproval.create({
      data: {
        operationType: 'ACCESS_SESSION',
        resourceType: 'ACCESS_REQUEST',
        resourceId: requestId,
        status: 'PENDING',
        reason,
        requestedByUserId: user.id,
        requestContext: {
          pipelineAssetId: asset.id,
          classificationLevel: asset.classificationLevel,
          ownerDepartment: asset.ownerDepartment,
          policyHash,
        } as Prisma.InputJsonValue,
      },
    });

    const approvalHash = `0x${canonicalJsonSha256Hex({
      approvalId: approval.id,
      requestId,
      pipelineAssetId: asset.id,
      classificationLevel: asset.classificationLevel,
      policyHash,
      createdAt: approval.createdAt.toISOString(),
    })}`;

    await this.prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        approvalId: approval.id,
        approvalHash,
      },
    });

    return { approval, approvalHash };
  }

  private parsePipelinePayload(raw: string): StoredPipelinePayload {
    const parsed = JSON.parse(raw) as StoredPipelinePayload;
    if (!parsed?.envelope?.kemCiphertext || !parsed?.ciphertext || !parsed?.anchorId) {
      throw new Error('Stored pipeline payload is incomplete');
    }
    return parsed;
  }

  private async deriveContentKey(asset: PipelineAsset, payload: StoredPipelinePayload): Promise<Buffer> {
    const anchor = await this.prisma.anchor.findUnique({
      where: { id: payload.anchorId },
    });
    if (!anchor) {
      throw new Error(`Anchor ${payload.anchorId} not found for stored payload`);
    }

    const privateKeyRecord = await this.vaultService.read(anchor.vaultPrivKeyPath);
    const privateKeyBase64 = privateKeyRecord?.data?.key || privateKeyRecord?.key;
    if (!privateKeyBase64) {
      throw new Error(`Private key payload missing at ${anchor.vaultPrivKeyPath}`);
    }

    const kem = await getMlKemByAlgorithm(payload.kemAlgorithm || anchor.algorithm);
    const sharedSecret = await kem.decapsulate(
      Uint8Array.from(Buffer.from(payload.envelope.kemCiphertext, 'base64')),
      Uint8Array.from(Buffer.from(privateKeyBase64, 'base64')),
    );

    return deriveAes256Key(
      sharedSecret,
      Uint8Array.from(Buffer.from(payload.envelope.salt, 'base64')),
      payload.kemAlgorithm || anchor.algorithm,
    );
  }

  private async createAccessSession(params: {
    asset: PipelineAsset;
    request: any;
    requester: User;
    effectiveTtlSeconds: number;
    controlledViewerRequired: boolean;
    requestLocation?: string | null;
    locationPolicyRequired?: boolean;
    auditLocation?: string | null;
  }) {
    const storagePath = params.asset.storageLocation || params.asset.destinationPath;
    if (!storagePath) {
      throw new Error('Pipeline asset storage location is not available');
    }

    const rawPayload = await this.objectStorageService.readText(storagePath);
    const storedPayload = this.parsePipelinePayload(rawPayload);
    const contentKey = await this.deriveContentKey(params.asset, storedPayload);

    const sessionId = randomUUID();
    const sessionWrapKey = randomBytes(32);
    const wrapNonce = randomBytes(12);
    const expiresAt = new Date(Date.now() + params.effectiveTtlSeconds * 1000);
    const wrapCipher = createCipheriv('aes-256-gcm', sessionWrapKey, wrapNonce);
    wrapCipher.setAAD(
      canonicalJsonBuffer({
        schemaVersion: 'qv.access.rewrap.v1',
        sessionId,
        accessRequestId: params.request.id,
        pipelineAssetId: params.asset.id,
        expiresAt: expiresAt.toISOString(),
      }),
    );
    const rewrappedKeyCiphertext = Buffer.concat([wrapCipher.update(contentKey), wrapCipher.final()]);
    const rewrappedKeyTag = wrapCipher.getAuthTag();

    const sessionToken = this.jwtService.sign(
      {
        sub: params.requester.id,
        sid: sessionId,
        aid: params.asset.id,
        typ: 'access-session',
      },
      { expiresIn: params.effectiveTtlSeconds },
    );

    const tokenHash = this.hashToken(sessionToken);
    const wrapKeyVaultPath = this.sessionWrapKeyPath(sessionId);
    await this.vaultService.write(wrapKeyVaultPath, {
      key: sessionWrapKey.toString('base64'),
      createdAt: new Date().toISOString(),
      accessRequestId: params.request.id,
      pipelineAssetId: params.asset.id,
    });

    const session = await this.prisma.accessSession.create({
      data: {
        id: sessionId,
        accessRequestId: params.request.id,
        pipelineAssetId: params.asset.id,
        requesterUserId: params.requester.id,
        sessionTokenHash: tokenHash,
        wrapKeyVaultPath,
        rewrappedKeyNonce: wrapNonce.toString('base64'),
        rewrappedKeyCiphertext: rewrappedKeyCiphertext.toString('base64'),
        rewrappedKeyTag: rewrappedKeyTag.toString('base64'),
        rewrapAlgorithm: 'AES-256-GCM',
        contentHash: params.asset.plaintextSha256 || params.asset.objectId || params.asset.id,
        allowedAction: params.request.requestedAction,
        expiresAt,
        metadata: {
          storagePath,
          controlledViewerRequired: params.controlledViewerRequired,
          sourceRelativePath: storedPayload.source?.relativePath || params.asset.relativePath,
          requestLocation: params.requestLocation || null,
          locationPolicyRequired: Boolean(params.locationPolicyRequired),
        } as Prisma.InputJsonValue,
      },
    });

    await this.prisma.pipelineAsset.update({
      where: { id: params.asset.id },
      data: {
        lifecycleState: 'ACCESS_GRANTED',
        encryptionState: 'SESSION_REWRAPPED',
        lastAccessAt: new Date(),
        accessHistoryRef: params.request.id,
      },
    });

    await this.auditLedgerService.recordEvent({
      eventType: 'SESSION_START',
      action: 'ACCESS_SESSION_ISSUED',
      result: 'approved',
      pipelineAssetId: params.asset.id,
      accessRequestId: params.request.id,
      accessSessionId: session.id,
      userId: params.requester.id,
      role: params.requester.role,
      deviceId: params.request.deviceId || null,
      networkZone: params.request.networkZone,
      policyVersion: params.request.policyVersion,
      policyHash: params.request.policyHash,
      assetHash: session.contentHash,
      payload: {
        requestedAction: params.request.requestedAction,
        expiresAt: session.expiresAt.toISOString(),
        controlledViewerRequired: params.controlledViewerRequired,
      },
      location: params.auditLocation || 'internal_secure_access',
    });

    this.monitoringMetrics.recordAccessSessionEvent('issued', params.asset.classificationLevel);

    return {
      session,
      sessionToken,
    };
  }

  async requestAccess(user: User, req: any, input: { pipelineAssetId: string; action: any; ttlSeconds?: number; reason?: string }) {
    await this.expireStaleSessions();

    const asset = await this.loadPipelineAsset(input.pipelineAssetId);
    const requester = await this.resolveRequesterContext(user, req);
    const locationPolicy = this.accessPolicyService.describeLocationPolicy(asset);
    const locationPolicyRequired = locationPolicy.requireLocation || locationPolicy.allowedLocations.length > 0;
    const sessionCounts = await this.countActiveSessions(asset.id, user.id);
    const evalStartedAt = process.hrtime.bigint();
    const evaluation = this.accessPolicyService.evaluate({
      asset,
      requestedAction: input.action,
      requestedTtlSeconds: input.ttlSeconds,
      requester,
      activeSessionsForAsset: sessionCounts.activeSessionsForAsset,
      activeSessionsForUser: sessionCounts.activeSessionsForUser,
    });
    const evalDurationSeconds = Number(process.hrtime.bigint() - evalStartedAt) / 1_000_000_000;
    this.monitoringMetrics.recordAccessRequest(evaluation.decision, asset.classificationLevel, input.action);
    this.monitoringMetrics.observeAccessPolicyEvaluation(
      evaluation.decision,
      asset.classificationLevel,
      evalDurationSeconds,
    );

    const accessRequest = await this.prisma.accessRequest.create({
      data: {
        pipelineAssetId: asset.id,
        requesterUserId: user.id,
        requestedAction: input.action,
        requestedTtlSeconds: input.ttlSeconds || evaluation.effectiveTtlSeconds,
        decision: evaluation.decision,
        decisionReason: input.reason?.trim() || evaluation.reason,
        policyVersion: evaluation.policyVersion,
        policyHash: evaluation.policyHash,
        classificationLevel: asset.classificationLevel,
        requesterClearanceLevel: requester.clearanceLevel,
        requesterDepartment: requester.department,
        requesterRole: requester.role,
        requesterProjects: requester.projectMemberships,
        deviceId: requester.deviceId,
        deviceCompliance: requester.deviceCompliance,
        networkZone: requester.networkZone,
        decidedAt: evaluation.decision === 'APPROVAL_REQUIRED' ? null : new Date(),
        context: {
          controls: evaluation.controls,
          ownerDepartment: asset.ownerDepartment,
          requestedReason: input.reason || null,
          requestLocation: requester.location,
          locationPolicyRequired,
          allowedLocations: locationPolicy.allowedLocations,
        } as Prisma.InputJsonValue,
      },
    });

    await this.prisma.pipelineAsset.update({
      where: { id: asset.id },
      data: {
        lifecycleState: 'ACCESS_REQUESTED',
        accessHistoryRef: accessRequest.id,
      },
    });

    await this.auditLedgerService.recordEvent({
      eventType: 'ACCESS_REQUEST',
      action: 'ACCESS_REQUEST_CREATED',
      result: evaluation.decision.toLowerCase(),
      pipelineAssetId: asset.id,
      accessRequestId: accessRequest.id,
      userId: user.id,
      role: user.role,
      deviceId: requester.deviceId,
      networkZone: requester.networkZone,
      policyVersion: evaluation.policyVersion,
      policyHash: evaluation.policyHash,
      assetHash: asset.plaintextSha256 || asset.objectId || asset.id,
      payload: {
        requestedAction: input.action,
        requestedTtlSeconds: input.ttlSeconds || evaluation.effectiveTtlSeconds,
        controls: evaluation.controls,
      },
      location: requester.location || requester.ipAddress || 'internal_network',
    });

    if (evaluation.decision === 'DENIED') {
      await this.auditLedgerService.recordEvent({
        eventType: 'DENIAL',
        action: 'ACCESS_REQUEST_DENIED',
        result: 'denied',
        pipelineAssetId: asset.id,
        accessRequestId: accessRequest.id,
        userId: user.id,
        role: user.role,
        deviceId: requester.deviceId,
        networkZone: requester.networkZone,
        policyVersion: evaluation.policyVersion,
        policyHash: evaluation.policyHash,
        assetHash: asset.plaintextSha256 || asset.objectId || asset.id,
        payload: {
          reason: evaluation.reason,
        },
        location: requester.location || requester.ipAddress || 'internal_network',
      });

      return {
        request: accessRequest,
        decision: evaluation,
      };
    }

    if (evaluation.decision === 'APPROVAL_REQUIRED') {
      const { approval, approvalHash } = await this.createApprovalForRequest(
        accessRequest.id,
        user,
        asset,
        evaluation.reason,
        evaluation.policyHash,
      );

      await this.auditLedgerService.recordEvent({
        eventType: 'APPROVAL',
        action: 'ACCESS_APPROVAL_PENDING',
        result: 'approval_required',
        pipelineAssetId: asset.id,
        accessRequestId: accessRequest.id,
        userId: user.id,
        role: user.role,
        deviceId: requester.deviceId,
        networkZone: requester.networkZone,
        policyVersion: evaluation.policyVersion,
        policyHash: evaluation.policyHash,
        assetHash: asset.plaintextSha256 || asset.objectId || asset.id,
        payload: {
          approvalId: approval.id,
          approvalHash,
          reason: evaluation.reason,
        },
        location: requester.location || requester.ipAddress || 'internal_network',
      });

      return {
        request: await this.prisma.accessRequest.findUnique({
          where: { id: accessRequest.id },
          include: { approval: true },
        }),
        decision: evaluation,
      };
    }

    const { session, sessionToken } = await this.createAccessSession({
      asset,
      request: accessRequest,
      requester: user,
      effectiveTtlSeconds: evaluation.effectiveTtlSeconds,
      controlledViewerRequired: evaluation.controlledViewerRequired,
      requestLocation: requester.location,
      locationPolicyRequired,
      auditLocation: requester.location || requester.ipAddress || 'internal_secure_access',
    });

    return {
      request: accessRequest,
      decision: evaluation,
      session,
      sessionToken,
    };
  }

  async activateApprovedRequest(requestId: string, user: User, req: any) {
    await this.expireStaleSessions();

    const accessRequest = await this.prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: {
        pipelineAsset: true,
        approval: true,
        accessSession: true,
      },
    });

    if (!accessRequest) {
      throw new NotFoundException('Access request not found');
    }
    if (accessRequest.requesterUserId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException('You do not own this access request');
    }
    if (accessRequest.accessSession) {
      return accessRequest.accessSession;
    }
    if (accessRequest.decision !== 'APPROVAL_REQUIRED') {
      throw new UnauthorizedException('This access request does not require activation');
    }
    if (!accessRequest.approval || accessRequest.approval.status !== 'APPROVED') {
      throw new UnauthorizedException('Approval has not been granted for this access request');
    }

    const requester = await this.resolveRequesterContext(user, req);
    const sessionCounts = await this.countActiveSessions(accessRequest.pipelineAssetId, user.id);
    const locationPolicy = this.accessPolicyService.describeLocationPolicy(accessRequest.pipelineAsset);
    const locationPolicyRequired = locationPolicy.requireLocation || locationPolicy.allowedLocations.length > 0;
    const evaluation = this.accessPolicyService.evaluate({
      asset: accessRequest.pipelineAsset,
      requestedAction: accessRequest.requestedAction,
      requestedTtlSeconds: accessRequest.requestedTtlSeconds,
      requester,
      activeSessionsForAsset: sessionCounts.activeSessionsForAsset,
      activeSessionsForUser: sessionCounts.activeSessionsForUser,
      approvalAlreadyGranted: true,
    });

    if (evaluation.decision !== 'APPROVED') {
      throw new UnauthorizedException(`Request no longer satisfies policy: ${evaluation.reason}`);
    }

    const { session, sessionToken } = await this.createAccessSession({
      asset: accessRequest.pipelineAsset,
      request: accessRequest,
      requester: user,
      effectiveTtlSeconds: evaluation.effectiveTtlSeconds,
      controlledViewerRequired: evaluation.controlledViewerRequired,
      requestLocation: requester.location,
      locationPolicyRequired,
      auditLocation: requester.location || requester.ipAddress || 'internal_secure_access',
    });

    return {
      requestId: accessRequest.id,
      session,
      sessionToken,
    };
  }

  async listRequests(user: User, filters?: { decision?: AccessDecision }) {
    return this.prisma.accessRequest.findMany({
      where: {
        ...(user.role === 'ADMIN' ? {} : { requesterUserId: user.id }),
        ...(filters?.decision ? { decision: filters.decision } : {}),
      },
      orderBy: { requestedAt: 'desc' },
      include: {
        pipelineAsset: true,
        approval: true,
        accessSession: true,
      },
      take: 200,
    });
  }

  async listSessions(user: User, filters?: { status?: AccessSessionStatus }) {
    await this.expireStaleSessions();

    return this.prisma.accessSession.findMany({
      where: {
        ...(user.role === 'ADMIN' ? {} : { requesterUserId: user.id }),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      orderBy: { expiresAt: 'asc' },
      include: {
        pipelineAsset: true,
        accessRequest: true,
        requesterUser: {
          select: {
            id: true,
            email: true,
            department: true,
            role: true,
          },
        },
      },
      take: 200,
    });
  }

  async listManagedCredentialsForUser(user: User, filters?: { status?: string }) {
    await this.expireManagedCredentials();

    const status = this.parseManagedCredentialStatus(filters?.status);
    const credentials = await this.prisma.managedCredential.findMany({
      where: {
        assignedUserId: user.id,
        ...(status ? { status } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return credentials.map((credential) => ({
      id: credential.id,
      displayName: credential.displayName,
      status: credential.status,
      deviceId: credential.deviceId,
      deviceLabel: credential.deviceLabel,
      deviceKeyAlgorithm: credential.deviceKeyAlgorithm,
      devicePublicKey: credential.devicePublicKey,
      devicePublicKeyHash: credential.devicePublicKeyHash,
      networkZone: credential.networkZone,
      locationLabel: credential.locationLabel,
      locationCode: credential.locationCode,
      issuedReason: credential.issuedReason,
      revokedReason: credential.revokedReason,
      expiresAt: credential.expiresAt?.toISOString() || null,
      lastUsedAt: credential.lastUsedAt?.toISOString() || null,
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
    }));
  }

  async getManagedEndpointTrustBundle() {
    return this.attestationService.getVerifierBundle();
  }

  async agentCheckinSessionContent(
    sessionId: string,
    body: {
      sessionToken: string;
      checkoutBundleId: string;
      contentBase64: string;
      contentSha256?: string;
      mediaType?: string;
      agentVersion?: string;
      editor?: string;
      reason?: string;
    },
  ) {
    const session = await this.verifySessionToken(sessionId, body.sessionToken);
    const user = await this.prisma.user.findUnique({
      where: { id: session.requesterUserId },
    });

    if (!user) {
      throw new UnauthorizedException('The session requester no longer exists');
    }

    return this.checkinSessionContent(sessionId, user, body);
  }

  async getSession(sessionId: string, user: User) {
    await this.expireStaleSessions();
    const session = await this.prisma.accessSession.findUnique({
      where: { id: sessionId },
      include: {
        pipelineAsset: true,
        accessRequest: true,
        requesterUser: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Access session not found');
    }
    if (session.requesterUserId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException('You do not have access to this session');
    }
    return session;
  }

  private async verifySessionToken(sessionId: string, sessionToken: string) {
    const session = await this.prisma.accessSession.findUnique({
      where: { id: sessionId },
      include: {
        pipelineAsset: true,
        accessRequest: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Access session not found');
    }

    if (session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Access session is no longer active');
    }

    const tokenHash = this.hashToken(sessionToken);
    if (tokenHash !== session.sessionTokenHash) {
      throw new UnauthorizedException('Invalid access session token');
    }

    return session;
  }

  private async updateLastAccessTimestamps(sessionId: string, pipelineAssetId: string) {
    await this.prisma.accessSession.update({
      where: { id: sessionId },
      data: {
        lastAccessAt: new Date(),
      },
    });
    await this.prisma.pipelineAsset.update({
      where: { id: pipelineAssetId },
      data: {
        lastAccessAt: new Date(),
      },
    });
  }

  private async updateSessionMetadata(
    sessionId: string,
    mutator: (current: SessionMetadata) => SessionMetadata,
  ) {
    const session = await this.prisma.accessSession.findUnique({
      where: { id: sessionId },
      select: { metadata: true },
    });
    if (!session) {
      throw new NotFoundException('Access session not found');
    }

    await this.prisma.accessSession.update({
      where: { id: sessionId },
      data: {
        metadata: this.toJsonSafe(mutator(this.parseSessionMetadata(session.metadata))) as Prisma.InputJsonValue,
      },
    });
  }

  private async resolveManagedCredentialForCheckout(params: {
    credentialId: string;
    userId: string;
    session: Awaited<ReturnType<AccessService['verifySessionToken']>>;
    deviceKeyAlgorithm: string;
    devicePublicKey: string;
  }) {
    const credential = await this.prisma.managedCredential.findUnique({
      where: { id: params.credentialId },
      include: {
        assignedUser: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (!credential) {
      throw new BadRequestException('Managed credential not found');
    }
    if (credential.assignedUserId !== params.userId) {
      throw new UnauthorizedException('Managed credential is not assigned to this user');
    }
    if (!credential.assignedUser.isActive) {
      throw new UnauthorizedException('Managed credential subject is inactive');
    }
    if (credential.status !== 'ACTIVE') {
      throw new UnauthorizedException('Managed credential is not active');
    }
    if (credential.expiresAt && credential.expiresAt.getTime() <= Date.now()) {
      await this.prisma.managedCredential.update({
        where: { id: credential.id },
        data: { status: 'EXPIRED' },
      }).catch(() => undefined);
      throw new UnauthorizedException('Managed credential has expired');
    }

    const sessionDeviceId = String(params.session.accessRequest.deviceId || '').trim();
    if (!sessionDeviceId || sessionDeviceId !== credential.deviceId) {
      throw new UnauthorizedException('Managed credential device binding does not match the active access session');
    }
    if (params.session.accessRequest.networkZone !== credential.networkZone) {
      throw new UnauthorizedException('Managed credential network zone does not match the active access session');
    }
    if (credential.deviceKeyAlgorithm !== params.deviceKeyAlgorithm) {
      throw new UnauthorizedException('Managed credential key algorithm does not match the provided device key');
    }

    const sessionMetadata = this.parseSessionMetadata(params.session.metadata);
    if (sessionMetadata.locationPolicyRequired) {
      const sessionLocation = this.normalizeLocationValue(sessionMetadata.requestLocation);
      if (!sessionLocation) {
        throw new UnauthorizedException('Location-bound access session is missing a verified request location');
      }

      const credentialLocations = [
        this.normalizeLocationValue(credential.locationCode),
        this.normalizeLocationValue(credential.locationLabel),
      ].filter((value): value is string => Boolean(value));

      if (credentialLocations.length === 0) {
        throw new UnauthorizedException('Managed credential is missing a bound location for this access session');
      }
      if (!credentialLocations.includes(sessionLocation)) {
        throw new UnauthorizedException('Managed credential location does not match the active access session');
      }
    }

    const presentedPublicKeyHash = `0x${this.hashBase64Bytes(params.devicePublicKey)}`;
    if (presentedPublicKeyHash !== credential.devicePublicKeyHash || params.devicePublicKey !== credential.devicePublicKey) {
      throw new UnauthorizedException('Managed credential public key does not match the registered device key');
    }

    return {
      credential,
      presentedPublicKeyHash,
    };
  }

  private async buildEncryptedPayloadForCheckin(params: {
    asset: PipelineAsset;
    storedPayload: StoredPipelinePayload;
    plaintext: Buffer;
    contentSha256: string;
    checkoutBundleId: string;
    sessionId: string;
    user: User;
    reason?: string;
    mediaType?: string;
  }) {
    const anchor = await this.prisma.anchor.findUnique({
      where: { id: params.storedPayload.anchorId },
    });
    if (!anchor) {
      throw new Error(`Anchor ${params.storedPayload.anchorId} not found for check-in`);
    }

    const publicKeyRecord = await this.vaultService.read(anchor.vaultKeyPath);
    const publicKeyBase64 = publicKeyRecord?.data?.key || publicKeyRecord?.key;
    if (!publicKeyBase64) {
      throw new Error(`Public key payload missing at ${anchor.vaultKeyPath}`);
    }

    const kemAlgorithm = params.storedPayload.kemAlgorithm || anchor.algorithm;
    const kem = await getMlKemByAlgorithm(kemAlgorithm);
    const aadContext = {
      protocolVersion: PQC_PIPELINE_VERSION,
      wrapSuite: wrapSuiteForKemAlgorithm(kemAlgorithm),
      kemAlgorithm,
      wrapLevel:
        typeof params.storedPayload.envelope?.aadContext?.wrapLevel === 'string'
          ? params.storedPayload.envelope.aadContext.wrapLevel
          : 'SESSION_CHECKIN',
      anchorId: anchor.id,
      anchorAlgorithm: anchor.algorithm,
      objectId: params.asset.objectId || null,
      relativePath: params.asset.relativePath,
      plaintextSha256: params.contentSha256,
      manifestSha256: params.asset.manifestSha256 || null,
      dataDomain: params.asset.dataDomain || null,
      cryptoDomain: params.asset.cryptoDomain || null,
      sourceAssetId: params.asset.id,
      previousContentHash: params.asset.plaintextSha256 || params.asset.objectId || params.asset.id,
      checkoutBundleId: params.checkoutBundleId,
      checkedInByUserId: params.user.id,
      checkedInFromSessionId: params.sessionId,
      mediaType: params.mediaType || null,
    };

    const publicKey = Buffer.from(publicKeyBase64, 'base64');
    const publicKeyArray = new Uint8Array(publicKey);
    const { ciphertext: kemCiphertext, sharedSecret } = await kem.encapsulate(publicKeyArray);
    const salt = randomBytes(32);
    const symmetricKey = deriveAes256Key(sharedSecret, salt, kemAlgorithm);
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', symmetricKey, nonce);
    cipher.setAAD(canonicalJsonBuffer(aadContext));
    const aeadCiphertext = Buffer.concat([cipher.update(params.plaintext), cipher.final()]);
    const aeadTag = cipher.getAuthTag();

    const payload = {
      version: PQC_PIPELINE_VERSION,
      algorithm: wrapSuiteForKemAlgorithm(kemAlgorithm),
      kemAlgorithm,
      wrapLevel:
        typeof params.storedPayload.envelope?.aadContext?.wrapLevel === 'string'
          ? params.storedPayload.envelope.aadContext.wrapLevel
          : 'SESSION_CHECKIN',
      anchorId: anchor.id,
      anchorAlgorithm: anchor.algorithm,
      object_id: params.asset.objectId || null,
      relative_path: params.asset.relativePath,
      plaintext_sha256: params.contentSha256,
      manifest_sha256: params.asset.manifestSha256 || null,
      data_domain: params.asset.dataDomain || null,
      crypto_domain: params.asset.cryptoDomain || null,
      expected_policy_outcome: params.asset.expectedPolicyOutcome || null,
      pqc_status: 'PQC_PROTECTED',
      pqc_protected: true,
      metadata: {
        ...(this.asJsonRecord(params.asset.metadata) || {}),
        checkin: {
          checkoutBundleId: params.checkoutBundleId,
          checkedInAt: new Date().toISOString(),
          checkedInByUserId: params.user.id,
          checkedInFromSessionId: params.sessionId,
          reason: params.reason || null,
          mediaType: params.mediaType || null,
        },
      },
      source: {
        path: params.asset.sourcePath,
        relativePath: params.asset.relativePath,
        sizeBytes: params.plaintext.length,
        sha256: params.contentSha256,
      },
      envelope: {
        kemCiphertext: Buffer.from(kemCiphertext).toString('base64'),
        salt: salt.toString('base64'),
        nonce: nonce.toString('base64'),
        aeadTag: aeadTag.toString('base64'),
        aadSha256: canonicalJsonSha256Hex(aadContext),
        aadContext,
      },
      ciphertext: aeadCiphertext.toString('base64'),
      wrappedAt: new Date().toISOString(),
    };

    const payloadDigestSha256 = canonicalJsonSha256Hex(payload);
    const signature = await this.attestationService.signDigest(
      'qv.checkin.payload.v1',
      `0x${payloadDigestSha256}`,
    );

    return {
      payload: {
        ...payload,
        attestation: {
          payloadDigestSha256: `0x${payloadDigestSha256}`,
          systemSignature: signature,
        },
      },
      payloadDigestSha256: `0x${payloadDigestSha256}`,
      signature,
    };
  }

  private async nextAssetVersionNumber(asset: PipelineAsset) {
    const conditions: Prisma.PipelineAssetWhereInput[] = [
      { runId: asset.runId, relativePath: asset.relativePath },
    ];
    if (asset.objectId) {
      conditions.unshift({ objectId: asset.objectId });
    }

    const count = await this.prisma.pipelineAsset.count({
      where: conditions.length === 1 ? conditions[0] : { OR: conditions },
    });
    return count + 1;
  }

  private buildVersionedDestinationPath(asset: PipelineAsset, versionNumber: number) {
    const basePath = asset.destinationPath || `${asset.relativePath}.pqc.json`;
    if (basePath.endsWith('.pqc.json')) {
      return basePath.replace(/\.pqc\.json$/i, `.v${versionNumber}.pqc.json`);
    }
    return `${basePath}.v${versionNumber}.pqc.json`;
  }

  private async decryptSessionPayload(session: Awaited<ReturnType<AccessService['verifySessionToken']>>) {
    const state = await this.recoverSessionEnvelopeState(session);

    const decipher = createDecipheriv(
      'aes-256-gcm',
      state.contentKey,
      Buffer.from(state.storedPayload.envelope.nonce, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(state.storedPayload.envelope.aeadTag, 'base64'));
    decipher.setAAD(canonicalJsonBuffer(state.storedPayload.envelope.aadContext || {}));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(state.storedPayload.ciphertext, 'base64')),
      decipher.final(),
    ]);
    const relativePath = state.relativePath;

    return {
      metadata: state.metadata,
      plaintext,
      mimeType: this.inferMimeType(relativePath),
      filename: relativePath.split('/').pop() || relativePath,
      relativePath,
    };
  }

  private renderControlledViewerHtml(params: {
    sessionId: string;
    classificationLevel: string;
    relativePath: string;
    filename: string;
    mimeType: string;
    plaintext: Buffer;
    expiresAt: Date;
    userEmail: string;
  }) {
    const watermark = this.escapeHtml(
      `${params.userEmail} • ${params.classificationLevel} • ${params.sessionId} • ${params.expiresAt.toISOString()}`,
    );
    const escapedRelativePath = this.escapeHtml(params.relativePath);
    const escapedMimeType = this.escapeHtml(params.mimeType);
    const escapedClassification = this.escapeHtml(params.classificationLevel);
    const escapedExpires = this.escapeHtml(params.expiresAt.toISOString());
    const lowerMimeType = params.mimeType.toLowerCase();

    let body = `
      <section class="metadata-grid">
        <article class="meta-card"><span class="meta-label">Asset</span><span class="meta-value">${escapedRelativePath}</span></article>
        <article class="meta-card"><span class="meta-label">Classification</span><span class="meta-value">${escapedClassification}</span></article>
        <article class="meta-card"><span class="meta-label">Mime</span><span class="meta-value">${escapedMimeType}</span></article>
        <article class="meta-card"><span class="meta-label">Expires</span><span class="meta-value">${escapedExpires}</span></article>
      </section>
    `;

    if (
      lowerMimeType.startsWith('text/')
      || lowerMimeType === 'application/json'
      || lowerMimeType === 'text/csv'
    ) {
      const preview = params.plaintext.toString('utf8', 0, Math.min(params.plaintext.length, 256 * 1024));
      const maybeTruncated = params.plaintext.length > 256 * 1024 ? '\n\n[QuantumVault truncated this preview at 256KB.]' : '';
      body += `<pre class="viewer-text">${this.escapeHtml(preview + maybeTruncated)}</pre>`;
    } else if (
      (lowerMimeType === 'image/png' || lowerMimeType === 'image/jpeg')
      && params.plaintext.length <= 2 * 1024 * 1024
    ) {
      body += `
        <div class="viewer-image-shell">
          <img class="viewer-image" alt="${this.escapeHtml(params.filename)}" src="data:${escapedMimeType};base64,${params.plaintext.toString('base64')}" />
        </div>
      `;
    } else {
      body += `
        <div class="viewer-warning">
          Controlled-view mode is active for this asset. QuantumVault suppressed raw payload delivery for this mime type and is showing metadata only.
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Cache-Control" content="no-store, max-age=0" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(params.filename)} • QuantumVault Controlled Viewer</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #07111d;
        --panel: rgba(11, 26, 41, 0.88);
        --border: rgba(141, 214, 255, 0.18);
        --text: #ecfeff;
        --muted: rgba(236, 254, 255, 0.62);
        --accent: #7dd3fc;
        --watermark: rgba(125, 211, 252, 0.055);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(34, 211, 238, 0.14), transparent 42%),
          linear-gradient(160deg, #020817 0%, var(--bg) 48%, #020617 100%);
        color: var(--text);
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      }
      body::before {
        content: "${watermark}";
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 3rem;
        color: var(--watermark);
        font-size: 2rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        text-align: center;
        transform: rotate(-24deg);
        pointer-events: none;
        white-space: pre-wrap;
      }
      .shell {
        position: relative;
        z-index: 1;
        padding: 2rem;
        display: grid;
        gap: 1.25rem;
      }
      .hero, .meta-card, .viewer-text, .viewer-warning, .viewer-image-shell {
        border: 1px solid var(--border);
        background: var(--panel);
        backdrop-filter: blur(10px);
        border-radius: 22px;
      }
      .hero { padding: 1.25rem 1.5rem; }
      .eyebrow {
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-size: 0.72rem;
      }
      h1 {
        margin: 0.8rem 0 0.5rem;
        font-size: clamp(1.35rem, 3vw, 2.2rem);
      }
      p { margin: 0; color: var(--muted); line-height: 1.7; }
      .metadata-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      }
      .meta-card { padding: 1rem; display: grid; gap: 0.4rem; }
      .meta-label {
        color: var(--muted);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
      }
      .meta-value { word-break: break-word; }
      .viewer-text {
        margin: 0;
        padding: 1.2rem 1.3rem;
        max-height: 68vh;
        overflow: auto;
        line-height: 1.75;
        font-size: 0.86rem;
        white-space: pre-wrap;
        font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
      }
      .viewer-warning {
        padding: 1.1rem 1.2rem;
        color: #dbeafe;
      }
      .viewer-image-shell {
        padding: 1rem;
        display: flex;
        justify-content: center;
      }
      .viewer-image {
        max-width: 100%;
        max-height: 70vh;
        border-radius: 16px;
      }
      @media print {
        body { display: none; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="eyebrow">QuantumVault Controlled Viewer</div>
        <h1>${this.escapeHtml(params.filename)}</h1>
        <p>
          Controlled-view mode is active. Raw downloads are blocked for this classification tier, and this page is delivered with no-store headers and watermarking.
        </p>
      </section>
      ${body}
    </main>
  </body>
</html>`;
  }

  private inferMimeType(relativePath: string): string {
    const lower = relativePath.toLowerCase();
    if (lower.endsWith('.json')) return 'application/json';
    if (lower.endsWith('.csv')) return 'text/csv';
    if (lower.endsWith('.txt')) return 'text/plain';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  }

  async materializeSessionContent(sessionId: string, user: User, body: { sessionToken: string; mode?: 'inline' | 'download' }) {
    const session = await this.verifySessionToken(sessionId, body.sessionToken);
    if (session.requesterUserId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException('You do not own this access session');
    }
    const decrypted = await this.decryptSessionPayload(session);
    await this.updateLastAccessTimestamps(session.id, session.pipelineAssetId);

    const controlledViewerRequired = Boolean(decrypted.metadata.controlledViewerRequired);
    this.monitoringMetrics.recordAccessMaterialization(body.mode || 'inline', controlledViewerRequired);

    if (controlledViewerRequired) {
      const viewerToken = this.signViewerToken(session.id, session.requesterUserId, session.expiresAt);
      return {
        sessionId: session.id,
        pipelineAssetId: session.pipelineAssetId,
        filename: decrypted.filename,
        relativePath: decrypted.relativePath,
        mimeType: decrypted.mimeType,
        contentDisposition: 'inline',
        controlledViewerRequired: true,
        viewerToken,
        viewerUrl: this.buildViewerUrl(session.id, viewerToken),
        expiresAt: session.expiresAt,
      };
    }

    return {
      sessionId: session.id,
      pipelineAssetId: session.pipelineAssetId,
      filename: decrypted.filename,
      relativePath: decrypted.relativePath,
      mimeType: decrypted.mimeType,
      contentBase64: decrypted.plaintext.toString('base64'),
      encoding: 'base64',
      contentDisposition:
        body.mode === 'download' && session.allowedAction !== 'VIEW' ? 'attachment' : 'inline',
      controlledViewerRequired: false,
      expiresAt: session.expiresAt,
    };
  }

  async checkoutSessionContent(
    sessionId: string,
    user: User,
    body: {
      sessionToken: string;
      credentialId: string;
      deviceKeyAlgorithm: string;
      devicePublicKey: string;
      agentVersion?: string;
      workspaceId?: string;
      reason?: string;
    },
  ) {
    const session = await this.verifySessionToken(sessionId, body.sessionToken);
    if (session.requesterUserId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException('You do not own this access session');
    }

    const state = await this.recoverSessionEnvelopeState(session);
    if (state.metadata.controlledViewerRequired) {
      throw new BadRequestException('Controlled-view assets cannot be checked out to a local device');
    }
    if (session.allowedAction === 'VIEW') {
      throw new BadRequestException('This access session is view-only and cannot be checked out');
    }

    const normalizedDeviceKeyAlgorithm = String(body.deviceKeyAlgorithm || '').trim().toUpperCase().replace(/_/g, '-');
    if (!normalizedDeviceKeyAlgorithm) {
      throw new BadRequestException('deviceKeyAlgorithm is required');
    }

    const managedCredential = await this.resolveManagedCredentialForCheckout({
      credentialId: body.credentialId,
      userId: user.id,
      session,
      deviceKeyAlgorithm: normalizedDeviceKeyAlgorithm,
      devicePublicKey: body.devicePublicKey,
    });

    let deviceKem;
    try {
      deviceKem = await getMlKemByAlgorithm(normalizedDeviceKeyAlgorithm);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Unsupported managed-endpoint KEM algorithm',
      );
    }

    const devicePublicKey = Buffer.from(body.devicePublicKey, 'base64');
    if (!devicePublicKey.length) {
      throw new BadRequestException('devicePublicKey is empty or invalid');
    }

    const bundleId = randomUUID();
    const issuedAt = new Date();
    const devicePublicKeyHash = managedCredential.presentedPublicKeyHash;
    const deviceWrapSalt = randomBytes(32);
    const deviceWrapNonce = randomBytes(12);
    const deviceWrapAad = {
      schemaVersion: 'qv.checkout.content-key-envelope.v1',
      bundleId,
      sessionId: session.id,
      accessRequestId: session.accessRequestId,
      pipelineAssetId: session.pipelineAssetId,
      requesterUserId: session.requesterUserId,
      deviceId: session.accessRequest.deviceId || 'device:unknown',
      credentialId: managedCredential.credential.id,
      devicePublicKeyHash,
      deviceKeyAlgorithm: normalizedDeviceKeyAlgorithm,
      expiresAt: session.expiresAt.toISOString(),
    };

    const { ciphertext: deviceKemCiphertext, sharedSecret } = await deviceKem.encapsulate(
      new Uint8Array(devicePublicKey),
    );
    const deviceWrapKey = deriveAes256Key(sharedSecret, deviceWrapSalt, normalizedDeviceKeyAlgorithm);
    const deviceWrapCipher = createCipheriv('aes-256-gcm', deviceWrapKey, deviceWrapNonce);
    deviceWrapCipher.setAAD(canonicalJsonBuffer(deviceWrapAad));
    const encryptedContentKey = Buffer.concat([
      deviceWrapCipher.update(state.contentKey),
      deviceWrapCipher.final(),
    ]);
    const deviceWrapTag = deviceWrapCipher.getAuthTag();
    const sessionTokenNonce = randomBytes(12);
    const sessionTokenAad = {
      schemaVersion: 'qv.checkout.session-token-envelope.v1',
      bundleId,
      sessionId: session.id,
      accessRequestId: session.accessRequestId,
      pipelineAssetId: session.pipelineAssetId,
      requesterUserId: session.requesterUserId,
      credentialId: managedCredential.credential.id,
      devicePublicKeyHash,
      deviceKeyAlgorithm: normalizedDeviceKeyAlgorithm,
      expiresAt: session.expiresAt.toISOString(),
    };
    const sessionTokenCipher = createCipheriv('aes-256-gcm', deviceWrapKey, sessionTokenNonce);
    sessionTokenCipher.setAAD(canonicalJsonBuffer(sessionTokenAad));
    const encryptedSessionToken = Buffer.concat([
      sessionTokenCipher.update(Buffer.from(body.sessionToken, 'utf8')),
      sessionTokenCipher.final(),
    ]);
    const sessionTokenTag = sessionTokenCipher.getAuthTag();

    const bundleEnvelope = {
      schemaVersion: 'qv.checkout.bundle.v1',
      bundleId,
      issuedAt: issuedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      sessionId: session.id,
      accessRequestId: session.accessRequestId,
      pipelineAssetId: session.pipelineAssetId,
      classificationLevel: session.pipelineAsset.classificationLevel,
      allowedAction: session.allowedAction,
      relativePath: state.relativePath,
      filename: state.relativePath.split('/').pop() || state.relativePath,
      mimeType: this.inferMimeType(state.relativePath),
      requester: {
        id: user.id,
        email: user.email,
        department: user.department || null,
        role: user.role,
      },
      device: {
        deviceId: session.accessRequest.deviceId || null,
        credentialId: managedCredential.credential.id,
        credentialName: managedCredential.credential.displayName,
        deviceLabel: managedCredential.credential.deviceLabel,
        publicKeyHash: devicePublicKeyHash,
        keyAlgorithm: normalizedDeviceKeyAlgorithm,
        agentVersion: body.agentVersion || null,
        workspaceId: body.workspaceId || null,
      },
      assetEnvelope: {
        schemaVersion: 'qv.checkout.asset-envelope.v1',
        algorithm: state.storedPayload.algorithm,
        kemAlgorithm: state.storedPayload.kemAlgorithm,
        anchorId: state.storedPayload.anchorId,
        ciphertext: state.storedPayload.ciphertext,
        nonce: state.storedPayload.envelope.nonce,
        aeadTag: state.storedPayload.envelope.aeadTag,
        aadContext: state.storedPayload.envelope.aadContext,
        source: state.storedPayload.source || null,
        contentHash: session.contentHash,
      },
      contentKeyEnvelope: {
        schemaVersion: 'qv.checkout.content-key-envelope.v1',
        kemAlgorithm: normalizedDeviceKeyAlgorithm,
        kemCiphertext: Buffer.from(deviceKemCiphertext).toString('base64'),
        salt: deviceWrapSalt.toString('base64'),
        nonce: deviceWrapNonce.toString('base64'),
        aeadTag: deviceWrapTag.toString('base64'),
        aadContext: deviceWrapAad,
        encryptedContentKey: encryptedContentKey.toString('base64'),
      },
      sessionTokenEnvelope: {
        schemaVersion: 'qv.checkout.session-token-envelope.v1',
        kemAlgorithm: normalizedDeviceKeyAlgorithm,
        salt: deviceWrapSalt.toString('base64'),
        nonce: sessionTokenNonce.toString('base64'),
        aeadTag: sessionTokenTag.toString('base64'),
        aadContext: sessionTokenAad,
        encryptedSessionToken: encryptedSessionToken.toString('base64'),
      },
      checkin: {
        schemaVersion: 'qv.checkin.manifest.v1',
        endpointPath: `/api/v1/access/agent/sessions/${session.id}/checkin`,
        checkoutBundleId: bundleId,
      },
      policy: {
        version: session.accessRequest.policyVersion,
        hash: session.accessRequest.policyHash,
      },
      lineage: {
        sourceAssetId: session.pipelineAssetId,
        sourceContentHash: session.contentHash,
      },
      location: {
        networkZone: managedCredential.credential.networkZone,
        locationLabel: managedCredential.credential.locationLabel,
        locationCode: managedCredential.credential.locationCode,
      },
      reason: body.reason || null,
    };

    const manifestDigestSha256 = `0x${canonicalJsonSha256Hex(bundleEnvelope)}`;
    const signature = await this.attestationService.signDigest('qv.checkout.bundle.v1', manifestDigestSha256);

    await this.updateSessionMetadata(session.id, (current) => ({
      ...current,
      checkout: {
        bundleId,
        credentialId: managedCredential.credential.id,
        state: 'issued',
        issuedAt: issuedAt.toISOString(),
        manifestDigestSha256,
        devicePublicKeyHash,
        deviceKeyAlgorithm: normalizedDeviceKeyAlgorithm,
      },
    }));
    await this.updateLastAccessTimestamps(session.id, session.pipelineAssetId);

    await this.auditLedgerService.recordEvent({
      eventType: 'SESSION_START',
      action: 'CHECKOUT_BUNDLE_ISSUED',
      result: 'issued',
      pipelineAssetId: session.pipelineAssetId,
      accessRequestId: session.accessRequestId,
      accessSessionId: session.id,
      userId: user.id,
      role: user.role,
      deviceId: session.accessRequest.deviceId || null,
      networkZone: session.accessRequest.networkZone,
      policyVersion: session.accessRequest.policyVersion,
      policyHash: session.accessRequest.policyHash,
      assetHash: session.contentHash,
      payload: {
        checkoutBundleId: bundleId,
        credentialId: managedCredential.credential.id,
        manifestDigestSha256,
        devicePublicKeyHash,
        deviceKeyAlgorithm: normalizedDeviceKeyAlgorithm,
        agentVersion: body.agentVersion || null,
        workspaceId: body.workspaceId || null,
        deviceId: managedCredential.credential.deviceId,
        deviceLabel: managedCredential.credential.deviceLabel || null,
        locationLabel: managedCredential.credential.locationLabel || null,
        locationCode: managedCredential.credential.locationCode || null,
        checkoutSchemaVersion: 'qv.checkout.bundle.v1',
        expiresAt: session.expiresAt.toISOString(),
        reason: body.reason || null,
      },
      location: 'managed_endpoint_checkout',
    });

    await this.prisma.managedCredential.update({
      where: { id: managedCredential.credential.id },
      data: { lastUsedAt: issuedAt },
    }).catch(() => undefined);

    return this.toJsonSafe({
      ...bundleEnvelope,
      signature,
    });
  }

  async checkinSessionContent(
    sessionId: string,
    user: User,
    body: {
      sessionToken: string;
      checkoutBundleId: string;
      contentBase64: string;
      contentSha256?: string;
      mediaType?: string;
      agentVersion?: string;
      editor?: string;
      reason?: string;
    },
  ) {
    const session = await this.verifySessionToken(sessionId, body.sessionToken);
    if (session.requesterUserId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException('You do not own this access session');
    }

    const state = await this.recoverSessionEnvelopeState(session);
    if (state.metadata.controlledViewerRequired) {
      throw new BadRequestException('Controlled-view assets cannot be checked back in from a local device');
    }
    if (session.allowedAction === 'VIEW') {
      throw new BadRequestException('This access session is view-only and cannot be checked in');
    }

    const checkoutState = state.metadata.checkout;
    if (!checkoutState?.bundleId || checkoutState.bundleId !== body.checkoutBundleId) {
      throw new BadRequestException('checkoutBundleId does not match the issued checkout bundle');
    }
    if (checkoutState.state !== 'issued') {
      throw new BadRequestException('This checkout bundle has already been checked in');
    }
    if (!checkoutState.credentialId) {
      throw new BadRequestException('Managed credential context is missing for this checkout bundle');
    }

    const plaintext = Buffer.from(body.contentBase64, 'base64');
    const contentSha256 = this.sha256Hex(plaintext);
    if (body.contentSha256 && body.contentSha256.toLowerCase() !== contentSha256.toLowerCase()) {
      throw new BadRequestException('contentSha256 does not match the supplied content');
    }

    const versionNumber = await this.nextAssetVersionNumber(session.pipelineAsset);
    const destinationPath = this.buildVersionedDestinationPath(session.pipelineAsset, versionNumber);
    const payloadBuild = await this.buildEncryptedPayloadForCheckin({
      asset: session.pipelineAsset,
      storedPayload: state.storedPayload,
      plaintext,
      contentSha256,
      checkoutBundleId: body.checkoutBundleId,
      sessionId: session.id,
      user,
      reason: body.reason,
      mediaType: body.mediaType,
    });

    const storedObject = await this.objectStorageService.writeEncryptedPayload({
      destinationPath,
      body: JSON.stringify(payloadBuild.payload, null, 2),
      contentType: 'application/json',
      metadata: {
        assetid: session.pipelineAssetId,
        accesssessionid: session.id,
        classification: session.pipelineAsset.classificationLevel,
        ownerdepartment: session.pipelineAsset.ownerDepartment || 'unassigned',
      },
    });

    const now = new Date();
    const originalMetadata = this.asJsonRecord(session.pipelineAsset.metadata);
    const originalVersioning =
      originalMetadata.versioning && typeof originalMetadata.versioning === 'object' && !Array.isArray(originalMetadata.versioning)
        ? (originalMetadata.versioning as Record<string, unknown>)
        : {};
    const nextStageTimestamps = {
      ...this.asJsonRecord(session.pipelineAsset.stageTimestamps),
      CHECKIN_RECEIVED: now.toISOString(),
      CHECKIN_REWRAPPED: now.toISOString(),
      TRANSFERRED: now.toISOString(),
    };

    const newAsset = await this.prisma.pipelineAsset.create({
      data: {
        runId: session.pipelineAsset.runId,
        objectId: session.pipelineAsset.objectId,
        relativePath: session.pipelineAsset.relativePath,
        sourcePath: session.pipelineAsset.sourcePath,
        destinationPath: storedObject.destinationPath,
        status: 'TRANSFERRED',
        pqcStatus: 'PQC_PROTECTED',
        pqcProtected: true,
        dataDomain: session.pipelineAsset.dataDomain,
        cryptoDomain: session.pipelineAsset.cryptoDomain,
        expectedPolicyOutcome: session.pipelineAsset.expectedPolicyOutcome,
        plaintextSha256: contentSha256,
        manifestSha256: session.pipelineAsset.manifestSha256,
        fileSizeBytes: plaintext.length,
        nistLevel: session.pipelineAsset.nistLevel,
        metadata: {
          ...originalMetadata,
          versioning: {
            ...originalVersioning,
            rootAssetId:
              typeof originalVersioning.rootAssetId === 'string' ? originalVersioning.rootAssetId : session.pipelineAssetId,
            previousAssetId: session.pipelineAssetId,
            sourceAssetId: session.pipelineAssetId,
            previousContentHash: session.contentHash,
            checkoutBundleId: body.checkoutBundleId,
            checkedInByUserId: user.id,
            checkedInFromSessionId: session.id,
            checkedInAt: now.toISOString(),
            versionNumber,
          },
        } as Prisma.InputJsonValue,
        classificationLevel: session.pipelineAsset.classificationLevel,
        ownerDepartment: session.pipelineAsset.ownerDepartment,
        storageLocation: storedObject.storageLocation,
        encryptionState: 'PQC_WRAPPED',
        keyManifestRef: session.pipelineAsset.keyManifestRef,
        authorizedRoles: session.pipelineAsset.authorizedRoles,
        retentionPolicy: session.pipelineAsset.retentionPolicy,
        lifecycleState: 'AVAILABLE',
        integrityCheckTimestamp: now,
        legalHold: session.pipelineAsset.legalHold,
        legalHoldReason: session.pipelineAsset.legalHoldReason,
        approvalRequired: session.pipelineAsset.approvalRequired,
        lastAccessAt: now,
        accessHistoryRef: session.id,
        stageTimestamps: nextStageTimestamps as Prisma.InputJsonValue,
      },
    });

    await this.prisma.pipelineAsset.update({
      where: { id: session.pipelineAssetId },
      data: {
        lifecycleState: 'ACCESS_EXPIRED',
        lastAccessAt: now,
        accessHistoryRef: session.id,
        metadata: {
          ...originalMetadata,
          versioning: {
            ...originalVersioning,
            latestVersionAssetId: newAsset.id,
            latestVersionNumber: versionNumber,
            supersededAt: now.toISOString(),
          },
        } as Prisma.InputJsonValue,
      },
    });

    await this.updateSessionMetadata(session.id, (current) => ({
      ...current,
      checkout: {
        ...(current.checkout || {}),
        bundleId: body.checkoutBundleId,
        state: 'checked_in',
        checkedInAt: now.toISOString(),
        checkedInAssetId: newAsset.id,
        versionNumber,
      },
    }));

    await this.prisma.accessSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closedAt: now,
        revokedAt: now,
        lastAccessAt: now,
      },
    });
    await this.vaultService.delete(session.wrapKeyVaultPath).catch(() => undefined);

    await this.auditLedgerService.recordEvent({
      eventType: 'STORAGE_WRITE',
      action: 'CHECKIN_PQC_VERSION_STORED',
      result: 'stored',
      pipelineAssetId: newAsset.id,
      accessSessionId: session.id,
      accessRequestId: session.accessRequestId,
      userId: user.id,
      role: user.role,
      deviceId: session.accessRequest.deviceId || null,
      networkZone: session.accessRequest.networkZone,
      policyVersion: session.accessRequest.policyVersion,
      policyHash: session.accessRequest.policyHash,
      assetHash: contentSha256,
      payload: {
        checkoutBundleId: body.checkoutBundleId,
        credentialId: checkoutState.credentialId,
        payloadDigestSha256: payloadBuild.payloadDigestSha256,
        storageLocation: storedObject.storageLocation,
        versionNumber,
        sourceAssetId: session.pipelineAssetId,
        previousContentHash: session.contentHash,
        newContentHash: contentSha256,
        devicePublicKeyHash: checkoutState.devicePublicKeyHash || null,
        deviceKeyAlgorithm: checkoutState.deviceKeyAlgorithm || null,
      },
      location: 'managed_endpoint_checkin',
    });

    await this.auditLedgerService.recordEvent({
      eventType: 'SESSION_END',
      action: 'CHECKOUT_SESSION_CHECKED_IN',
      result: 'checked_in',
      pipelineAssetId: newAsset.id,
      accessSessionId: session.id,
      accessRequestId: session.accessRequestId,
      userId: user.id,
      role: user.role,
      deviceId: session.accessRequest.deviceId || null,
      networkZone: session.accessRequest.networkZone,
      policyVersion: session.accessRequest.policyVersion,
      policyHash: session.accessRequest.policyHash,
      assetHash: contentSha256,
      payload: {
        checkoutBundleId: body.checkoutBundleId,
        credentialId: checkoutState.credentialId,
        devicePublicKeyHash: checkoutState.devicePublicKeyHash || null,
        deviceKeyAlgorithm: checkoutState.deviceKeyAlgorithm || null,
        agentVersion: body.agentVersion || null,
        editor: body.editor || null,
        reason: body.reason || null,
        sourceAssetId: session.pipelineAssetId,
        newAssetId: newAsset.id,
        previousContentHash: session.contentHash,
        newContentHash: contentSha256,
        storageLocation: storedObject.storageLocation,
        approvalHash: session.accessRequest.approvalHash || null,
        lineage: {
          sourceAssetId: session.pipelineAssetId,
          previousContentHash: session.contentHash,
          newContentHash: contentSha256,
          versionNumber,
        },
      },
      location: 'managed_endpoint_checkin',
    });

    this.monitoringMetrics.recordAccessSessionEvent('closed', session.pipelineAsset.classificationLevel);

    return this.toJsonSafe({
      checkedIn: true,
      sessionClosed: true,
      sessionId: session.id,
      checkoutBundleId: body.checkoutBundleId,
      credentialId: checkoutState.credentialId,
      newAssetId: newAsset.id,
      versionNumber,
      contentSha256,
      payloadDigestSha256: payloadBuild.payloadDigestSha256,
      storageLocation: storedObject.storageLocation,
      attestationSignature: payloadBuild.signature,
    });
  }

  async renderSessionViewer(sessionId: string, user: User, viewerToken: string) {
    const session = await this.prisma.accessSession.findUnique({
      where: { id: sessionId },
      include: {
        pipelineAsset: true,
        accessRequest: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Access session not found');
    }
    if (session.requesterUserId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException('You do not own this access session');
    }
    if (session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Access session is no longer active');
    }

    const metadata = this.parseSessionMetadata(session.metadata);
    if (!metadata.controlledViewerRequired) {
      throw new UnauthorizedException('Controlled viewer is not required for this session');
    }

    this.verifyViewerToken(session.id, session.requesterUserId, viewerToken);
    const decrypted = await this.decryptSessionPayload(session);
    await this.updateLastAccessTimestamps(session.id, session.pipelineAssetId);
    this.monitoringMetrics.recordAccessMaterialization('controlled_viewer', true);

    return this.renderControlledViewerHtml({
      sessionId: session.id,
      classificationLevel: session.pipelineAsset.classificationLevel,
      relativePath: decrypted.relativePath,
      filename: decrypted.filename,
      mimeType: decrypted.mimeType,
      plaintext: decrypted.plaintext,
      expiresAt: session.expiresAt,
      userEmail: user.email,
    });
  }

  async closeSession(sessionId: string, user: User, reason?: string) {
    const session = await this.prisma.accessSession.findUnique({
      where: { id: sessionId },
      include: {
        pipelineAsset: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Access session not found');
    }
    if (session.requesterUserId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException('You do not own this access session');
    }

    await this.prisma.accessSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        revokedAt: new Date(),
      },
    });
    await this.vaultService.delete(session.wrapKeyVaultPath).catch(() => undefined);

    await this.prisma.pipelineAsset.update({
      where: { id: session.pipelineAssetId },
      data: {
        lifecycleState: 'ACCESS_EXPIRED',
      },
    }).catch(() => undefined);

    await this.auditLedgerService.recordEvent({
      eventType: 'SESSION_END',
      action: 'ACCESS_SESSION_CLOSED',
      result: 'closed',
      pipelineAssetId: session.pipelineAssetId,
      accessSessionId: session.id,
      accessRequestId: session.accessRequestId,
      userId: user.id,
      role: user.role,
      assetHash: session.contentHash,
      payload: {
        reason: reason || 'session_closed',
      },
      location: 'internal_secure_access',
    });

    this.monitoringMetrics.recordAccessSessionEvent('closed', session.pipelineAsset.classificationLevel);

    return { closed: true };
  }

  async getMonitoringSummary() {
    await this.expireStaleSessions();

    const now = new Date();
    const nextFifteenMinutes = new Date(Date.now() + 15 * 60 * 1000);
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      assetsByClassification,
      activeSessions,
      expiringSessions,
      deniedAttempts,
      approvalQueue,
      legalHolds,
      latestIntegrityChecks,
    ] = await Promise.all([
      this.prisma.pipelineAsset.groupBy({
        by: ['classificationLevel'],
        _count: { _all: true },
      }),
      this.prisma.accessSession.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
        orderBy: { expiresAt: 'asc' },
        take: 50,
        include: {
          requesterUser: {
            select: {
              email: true,
              department: true,
            },
          },
          pipelineAsset: {
            select: {
              relativePath: true,
              classificationLevel: true,
            },
          },
        },
      }),
      this.prisma.accessSession.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            gt: now,
            lte: nextFifteenMinutes,
          },
        },
        orderBy: { expiresAt: 'asc' },
        include: {
          requesterUser: {
            select: {
              email: true,
            },
          },
          pipelineAsset: {
            select: {
              relativePath: true,
            },
          },
        },
      }),
      this.prisma.auditLedgerEvent.count({
        where: {
          eventType: 'DENIAL',
          createdAt: { gte: last24Hours },
        },
      }),
      this.prisma.accessRequest.count({
        where: {
          decision: 'APPROVAL_REQUIRED',
          approval: { is: { status: 'PENDING' } },
        },
      }),
      this.prisma.pipelineAsset.findMany({
        where: { legalHold: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          relativePath: true,
          ownerDepartment: true,
          legalHoldReason: true,
          classificationLevel: true,
        },
      }),
      this.prisma.pipelineAsset.findMany({
        where: { integrityCheckTimestamp: { not: null } },
        orderBy: { integrityCheckTimestamp: 'desc' },
        take: 50,
        select: {
          id: true,
          relativePath: true,
          integrityCheckTimestamp: true,
          classificationLevel: true,
          encryptionState: true,
        },
      }),
    ]);

    return {
      assetsByClassification: assetsByClassification.map((entry) => ({
        classificationLevel: entry.classificationLevel,
        count: entry._count._all,
      })),
      activeSessions,
      expiringSessions,
      deniedAttempts24h: deniedAttempts,
      pendingApprovals: approvalQueue,
      legalHolds,
      latestIntegrityChecks,
    };
  }
}
