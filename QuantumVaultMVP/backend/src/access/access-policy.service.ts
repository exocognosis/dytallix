import { Injectable } from '@nestjs/common';
import {
  AccessAction,
  AccessDecision,
  ClassificationLevel,
  ClearanceLevel,
  DeviceComplianceStatus,
  NetworkZone,
  PipelineAsset,
} from '@prisma/client';
import { canonicalJsonSha256Hex } from '../crypto/canonical-json';

type PolicyRule = {
  classificationLevel: ClassificationLevel;
  minClearance: ClearanceLevel;
  requireMfa: boolean;
  requireStepUp: boolean;
  requireAttestedDevice: boolean;
  minDeviceCompliance: DeviceComplianceStatus;
  allowedActions: AccessAction[];
  ttlSeconds: number;
  allowedNetworkZones: NetworkZone[];
  approvalRequired: boolean;
  controlledViewerRequired: boolean;
};

type RequesterContext = {
  role: string;
  department: string | null;
  clearanceLevel: ClearanceLevel;
  projectMemberships: string[];
  mfaSatisfied: boolean;
  stepUpSatisfied: boolean;
  strongClientAuth: boolean;
  deviceCompliance: DeviceComplianceStatus;
  deviceAttested: boolean;
  networkZone: NetworkZone;
  location: string | null;
  identityType: 'user' | 'service_account';
};

export type AccessEvaluationResult = {
  decision: AccessDecision;
  policyVersion: string;
  policyHash: string;
  effectiveTtlSeconds: number;
  approvalRequired: boolean;
  controlledViewerRequired: boolean;
  reason: string;
  controls: string[];
};

const CLEARANCE_RANK: Record<ClearanceLevel, number> = {
  L0_INTERNAL: 0,
  L1_SENSITIVE: 1,
  L2_CONFIDENTIAL: 2,
  L3_RESTRICTED: 3,
  L4_CRITICAL: 4,
};

const DEVICE_RANK: Record<DeviceComplianceStatus, number> = {
  UNKNOWN: 0,
  NON_COMPLIANT: 0,
  MANAGED: 1,
  HARDENED: 2,
  SECURE_WORKSTATION: 3,
};

@Injectable()
export class AccessPolicyService {
  private readonly policyVersion = 'qv-internal-access-policy.v1';

  private readonly policyMatrix: Record<ClassificationLevel, PolicyRule> = {
    L0_INTERNAL: {
      classificationLevel: 'L0_INTERNAL',
      minClearance: 'L0_INTERNAL',
      requireMfa: false,
      requireStepUp: false,
      requireAttestedDevice: false,
      minDeviceCompliance: 'MANAGED',
      allowedActions: ['VIEW', 'DOWNLOAD'],
      ttlSeconds: 24 * 60 * 60,
      allowedNetworkZones: ['INTERNAL', 'VPN', 'RESTRICTED', 'SECURE_ENCLAVE'],
      approvalRequired: false,
      controlledViewerRequired: false,
    },
    L1_SENSITIVE: {
      classificationLevel: 'L1_SENSITIVE',
      minClearance: 'L1_SENSITIVE',
      requireMfa: true,
      requireStepUp: false,
      requireAttestedDevice: false,
      minDeviceCompliance: 'MANAGED',
      allowedActions: ['VIEW', 'DOWNLOAD'],
      ttlSeconds: 8 * 60 * 60,
      allowedNetworkZones: ['INTERNAL', 'VPN', 'RESTRICTED', 'SECURE_ENCLAVE'],
      approvalRequired: false,
      controlledViewerRequired: false,
    },
    L2_CONFIDENTIAL: {
      classificationLevel: 'L2_CONFIDENTIAL',
      minClearance: 'L2_CONFIDENTIAL',
      requireMfa: true,
      requireStepUp: false,
      requireAttestedDevice: false,
      minDeviceCompliance: 'MANAGED',
      allowedActions: ['VIEW', 'CONTROLLED_DOWNLOAD'],
      ttlSeconds: 4 * 60 * 60,
      allowedNetworkZones: ['INTERNAL', 'VPN', 'RESTRICTED', 'SECURE_ENCLAVE'],
      approvalRequired: false,
      controlledViewerRequired: false,
    },
    L3_RESTRICTED: {
      classificationLevel: 'L3_RESTRICTED',
      minClearance: 'L3_RESTRICTED',
      requireMfa: true,
      requireStepUp: false,
      requireAttestedDevice: true,
      minDeviceCompliance: 'HARDENED',
      allowedActions: ['VIEW'],
      ttlSeconds: 60 * 60,
      allowedNetworkZones: ['RESTRICTED', 'SECURE_ENCLAVE'],
      approvalRequired: false,
      controlledViewerRequired: true,
    },
    L4_CRITICAL: {
      classificationLevel: 'L4_CRITICAL',
      minClearance: 'L4_CRITICAL',
      requireMfa: true,
      requireStepUp: true,
      requireAttestedDevice: true,
      minDeviceCompliance: 'SECURE_WORKSTATION',
      allowedActions: ['VIEW'],
      ttlSeconds: 30 * 60,
      allowedNetworkZones: ['SECURE_ENCLAVE'],
      approvalRequired: true,
      controlledViewerRequired: true,
    },
  };

  getPolicyMatrix() {
    return Object.values(this.policyMatrix).map((rule) => ({
      ...rule,
      policyVersion: this.policyVersion,
    }));
  }

  private assetMetadata(asset: PipelineAsset): Record<string, unknown> {
    return asset.metadata && typeof asset.metadata === 'object' && !Array.isArray(asset.metadata)
      ? (asset.metadata as Record<string, unknown>)
      : {};
  }

  private parseOptionalBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      return null;
    }
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'required'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'optional'].includes(normalized)) {
      return false;
    }
    return null;
  }

  private normalizeStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .filter((entry) => typeof entry === 'string')
        .map((entry) => String(entry).trim())
        .filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
    return [];
  }

  private normalizeLocationValue(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().replace(/\s+/g, ' ').toUpperCase();
    return normalized || null;
  }

  describeLocationPolicy(asset: PipelineAsset): {
    requireLocation: boolean;
    allowedLocations: string[];
  } {
    const metadata = this.assetMetadata(asset);
    const nestedLocationPolicy =
      metadata.locationPolicy && typeof metadata.locationPolicy === 'object' && !Array.isArray(metadata.locationPolicy)
        ? (metadata.locationPolicy as Record<string, unknown>)
        : metadata.location_policy && typeof metadata.location_policy === 'object' && !Array.isArray(metadata.location_policy)
          ? (metadata.location_policy as Record<string, unknown>)
          : {};

    const requireLocation =
      this.parseOptionalBoolean(
        nestedLocationPolicy.required
          ?? nestedLocationPolicy.requireLocation
          ?? nestedLocationPolicy.require_location
          ?? metadata.requireLocation
          ?? metadata.require_location
          ?? metadata.locationRequired
          ?? metadata.location_required,
      ) ?? false;

    const allowedLocations = [
      ...this.normalizeStringList(nestedLocationPolicy.allowedLocations),
      ...this.normalizeStringList(nestedLocationPolicy.allowed_locations),
      ...this.normalizeStringList(nestedLocationPolicy.allowedLocationCodes),
      ...this.normalizeStringList(nestedLocationPolicy.allowed_location_codes),
      ...this.normalizeStringList(nestedLocationPolicy.allowedLocationLabels),
      ...this.normalizeStringList(nestedLocationPolicy.allowed_location_labels),
      ...this.normalizeStringList(metadata.allowedLocations),
      ...this.normalizeStringList(metadata.allowed_locations),
      ...this.normalizeStringList(metadata.allowedLocationCodes),
      ...this.normalizeStringList(metadata.allowed_location_codes),
      ...this.normalizeStringList(metadata.allowedLocationLabels),
      ...this.normalizeStringList(metadata.allowed_location_labels),
    ]
      .map((entry) => this.normalizeLocationValue(entry))
      .filter((entry): entry is string => Boolean(entry));

    return {
      requireLocation,
      allowedLocations: Array.from(new Set(allowedLocations)),
    };
  }

  private normalizeAuthorizedRoles(asset: PipelineAsset): string[] {
    return Array.isArray(asset.authorizedRoles)
      ? asset.authorizedRoles.map((value) => String(value).trim().toUpperCase()).filter(Boolean)
      : [];
  }

  private normalizeAllowedProjects(asset: PipelineAsset): string[] {
    const metadata = this.assetMetadata(asset);
    const value = metadata['allowedProjects'] ?? metadata['allowed_projects'];
    if (Array.isArray(value)) {
      return value
        .filter((entry) => typeof entry === 'string')
        .map((entry) => String(entry).trim())
        .filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
    return [];
  }

  evaluate(params: {
    asset: PipelineAsset;
    requestedAction: AccessAction;
    requestedTtlSeconds?: number;
    requester: RequesterContext;
    activeSessionsForUser: number;
    activeSessionsForAsset: number;
    approvalAlreadyGranted?: boolean;
  }): AccessEvaluationResult {
    const rule = this.policyMatrix[params.asset.classificationLevel];
    const controls: string[] = [];
    const locationPolicy = this.describeLocationPolicy(params.asset);
    const requesterLocation = this.normalizeLocationValue(params.requester.location);

    const policyEnvelope = {
      version: this.policyVersion,
      classificationLevel: params.asset.classificationLevel,
      requestedAction: params.requestedAction,
      ownerDepartment: params.asset.ownerDepartment || null,
      authorizedRoles: this.normalizeAuthorizedRoles(params.asset),
      locationPolicy,
      retentionPolicy: params.asset.retentionPolicy || null,
      legalHold: params.asset.legalHold,
      requester: {
        role: params.requester.role,
        department: params.requester.department,
        clearanceLevel: params.requester.clearanceLevel,
        projectMemberships: params.requester.projectMemberships,
        mfaSatisfied: params.requester.mfaSatisfied,
        stepUpSatisfied: params.requester.stepUpSatisfied,
        strongClientAuth: params.requester.strongClientAuth,
        deviceCompliance: params.requester.deviceCompliance,
        deviceAttested: params.requester.deviceAttested,
        networkZone: params.requester.networkZone,
        location: requesterLocation,
        identityType: params.requester.identityType,
      },
    };
    const policyHash = `0x${canonicalJsonSha256Hex(policyEnvelope)}`;

    if (!rule.allowedActions.includes(params.requestedAction)) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: `Action ${params.requestedAction} is not permitted for ${params.asset.classificationLevel}.`,
        controls,
      };
    }

    if ((CLEARANCE_RANK[params.requester.clearanceLevel] ?? 0) < (CLEARANCE_RANK[rule.minClearance] ?? 0)) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Requester clearance is below the asset classification.',
        controls,
      };
    }
    controls.push(`clearance>=${rule.minClearance}`);

    if (
      params.requester.identityType === 'service_account'
      && (CLEARANCE_RANK[params.asset.classificationLevel] ?? 0) >= CLEARANCE_RANK['L3_RESTRICTED']
    ) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Service accounts are not permitted to access restricted or critical assets.',
        controls,
      };
    }
    controls.push(`identity=${params.requester.identityType}`);

    const normalizedRole = params.requester.role.toUpperCase();
    const authorizedRoles = this.normalizeAuthorizedRoles(params.asset);
    if (
      authorizedRoles.length > 0
      && normalizedRole !== 'ADMIN'
      && !authorizedRoles.includes(normalizedRole)
    ) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Requester role is not authorized for this asset.',
        controls,
      };
    }
    controls.push(authorizedRoles.length > 0 ? 'role-allowlist' : 'role-default');

    if (
      params.asset.ownerDepartment
      && params.requester.department
      && params.requester.department !== params.asset.ownerDepartment
      && normalizedRole !== 'ADMIN'
    ) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Requester department does not match the asset owner department.',
        controls,
      };
    }
    controls.push('department-bound');

    const allowedProjects = this.normalizeAllowedProjects(params.asset);
    if (
      allowedProjects.length > 0
      && !allowedProjects.some((project) => params.requester.projectMemberships.includes(project))
      && normalizedRole !== 'ADMIN'
    ) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Requester is not a member of an approved project scope.',
        controls,
      };
    }
    if (allowedProjects.length > 0) {
      controls.push('project-bound');
    }

    if (rule.requireMfa && !params.requester.mfaSatisfied && !params.requester.strongClientAuth) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'MFA is required for this classification level.',
        controls,
      };
    }
    if (rule.requireMfa) {
      controls.push(params.requester.strongClientAuth ? 'strong-client-auth' : 'mfa');
    }

    if (rule.requireStepUp && !params.requester.stepUpSatisfied) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Step-up authentication is required for this classification level.',
        controls,
      };
    }
    if (rule.requireStepUp) {
      controls.push('step-up');
    }

    if (rule.requireAttestedDevice && !params.requester.deviceAttested) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Verified device attestation is required for this classification level.',
        controls,
      };
    }
    if (rule.requireAttestedDevice) {
      controls.push('device-attested');
    }

    if ((DEVICE_RANK[params.requester.deviceCompliance] ?? 0) < (DEVICE_RANK[rule.minDeviceCompliance] ?? 0)) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Device compliance level is insufficient for the requested asset.',
        controls,
      };
    }
    controls.push(`device>=${rule.minDeviceCompliance}`);

    if (!rule.allowedNetworkZones.includes(params.requester.networkZone)) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: `Network zone ${params.requester.networkZone} is not permitted for ${params.asset.classificationLevel}.`,
        controls,
      };
    }
    controls.push(`network=${params.requester.networkZone}`);

    if ((locationPolicy.requireLocation || locationPolicy.allowedLocations.length > 0) && !requesterLocation) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'A requester location assertion is required for this asset.',
        controls,
      };
    }
    if (locationPolicy.requireLocation) {
      controls.push('location-asserted');
    }

    if (locationPolicy.allowedLocations.length > 0 && !locationPolicy.allowedLocations.includes(requesterLocation!)) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: `Location ${params.requester.location || 'UNKNOWN'} is not permitted for this asset.`,
        controls,
      };
    }
    if (locationPolicy.allowedLocations.length > 0) {
      controls.push('location-allowlist');
    }

    if (params.asset.legalHold && params.requestedAction !== 'VIEW') {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Legal hold is active; download-capable actions are blocked.',
        controls,
      };
    }
    if (params.asset.legalHold) {
      controls.push('legal-hold-view-only');
    }

    if (params.activeSessionsForUser >= 3) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'User has reached the concurrent session limit.',
        controls,
      };
    }
    if (params.activeSessionsForAsset >= (params.asset.classificationLevel === 'L4_CRITICAL' ? 1 : 5)) {
      return {
        decision: 'DENIED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds: rule.ttlSeconds,
        approvalRequired: false,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Asset has reached the concurrent session limit.',
        controls,
      };
    }
    controls.push('session-limits');

    const effectiveTtlSeconds = Math.min(params.requestedTtlSeconds || rule.ttlSeconds, rule.ttlSeconds);
    const requiresApproval = rule.approvalRequired || params.asset.approvalRequired;
    if (requiresApproval && !params.approvalAlreadyGranted) {
      return {
        decision: 'APPROVAL_REQUIRED',
        policyVersion: this.policyVersion,
        policyHash,
        effectiveTtlSeconds,
        approvalRequired: true,
        controlledViewerRequired: rule.controlledViewerRequired,
        reason: 'Manual approval is required before session key release.',
        controls,
      };
    }

    return {
      decision: 'APPROVED',
      policyVersion: this.policyVersion,
      policyHash,
      effectiveTtlSeconds,
      approvalRequired: requiresApproval,
      controlledViewerRequired: rule.controlledViewerRequired,
      reason: 'Access approved under the internal secure-access policy.',
      controls,
    };
  }
}
