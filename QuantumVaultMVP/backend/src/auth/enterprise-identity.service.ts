import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthSource,
  ClearanceLevel,
  DeviceComplianceStatus,
  NetworkZone,
  Prisma,
  UserRole,
} from '@prisma/client';
import { constants, createPublicKey, verify as cryptoVerify } from 'crypto';

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type JwtPayload = Record<string, any> & {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
};

type JwksResponse = {
  keys?: Record<string, any>[];
};

type JwtVerificationOptions = {
  jwksUrl: string;
  expectedIssuer?: string | null;
  expectedAudience?: string | null;
  tokenLabel: string;
};

type StepUpEvidence = {
  satisfied: boolean;
  verifiedAt: string | null;
  claims: Record<string, unknown> | null;
};

type VerifiedDeviceAttestation = {
  deviceId: string;
  compliance: DeviceComplianceStatus;
  trustLevel: string | null;
  networkZone: NetworkZone;
  verifiedAt: string;
  claims: Record<string, unknown>;
};

export type RequestSecurityContext = {
  deviceId: string | null;
  deviceCompliance: DeviceComplianceStatus;
  deviceTrustLevel: string | null;
  networkZone: NetworkZone;
  ipAddress: string | null;
  location: string | null;
  deviceAttested: boolean;
  deviceAttestedAt: string | null;
};

export type VerifiedEnterpriseIdentity = {
  email: string;
  subject: string;
  employeeId: string | null;
  department: string | null;
  clearanceLevel: ClearanceLevel;
  role: UserRole;
  authSource: AuthSource;
  projectMemberships: string[];
  mfaSatisfied: boolean;
  stepUpSatisfied: boolean;
  sessionContext: RequestSecurityContext;
  sessionClaims: Prisma.InputJsonValue;
};

@Injectable()
export class EnterpriseIdentityService {
  private jwksCache = new Map<
    string,
    {
      fetchedAt: number;
      byKid: Map<string, Record<string, any>>;
    }
  >();

  constructor(private readonly configService: ConfigService) {}

  private parseJwt(token: string): { header: JwtHeader; payload: JwtPayload; signingInput: string; signature: Buffer } {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Signed enterprise evidence must be a JWT');
    }

    const [headerPart, payloadPart, signaturePart] = parts;
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as JwtHeader;
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as JwtPayload;

    return {
      header,
      payload,
      signingInput: `${headerPart}.${payloadPart}`,
      signature: Buffer.from(signaturePart, 'base64url'),
    };
  }

  private getConfigValue(name: string): string | null {
    const value = this.configService.get<string>(name);
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private getJwksUrl(): string {
    const jwksUrl = this.getConfigValue('ENTERPRISE_IDP_JWKS_URL');
    if (!jwksUrl) {
      throw new UnauthorizedException('ENTERPRISE_IDP_JWKS_URL is required for enterprise token exchange');
    }
    return jwksUrl;
  }

  private async loadJwks(jwksUrl: string): Promise<Map<string, Record<string, any>>> {
    const cacheTtlMs = 10 * 60 * 1000;
    const cached = this.jwksCache.get(jwksUrl);
    if (cached && Date.now() - cached.fetchedAt < cacheTtlMs) {
      return cached.byKid;
    }

    const response = await fetch(jwksUrl, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new UnauthorizedException(`Failed to fetch JWKS from ${jwksUrl}: HTTP ${response.status}`);
    }

    const payload = (await response.json().catch(() => null)) as JwksResponse | null;
    if (!payload?.keys || !Array.isArray(payload.keys)) {
      throw new UnauthorizedException(`JWKS payload from ${jwksUrl} is invalid`);
    }

    const byKid = new Map<string, Record<string, any>>();
    for (const key of payload.keys) {
      const kid = typeof key?.kid === 'string' ? key.kid : '';
      if (kid) {
        byKid.set(kid, key);
      }
    }

    this.jwksCache.set(jwksUrl, {
      fetchedAt: Date.now(),
      byKid,
    });

    return byKid;
  }

  private async resolveJwk(header: JwtHeader, jwksUrl: string): Promise<Record<string, any>> {
    if (!header.kid) {
      throw new UnauthorizedException('JWT evidence is missing a kid header');
    }

    const keys = await this.loadJwks(jwksUrl);
    const jwk = keys.get(header.kid);
    if (!jwk) {
      throw new UnauthorizedException(`Signing key not found for kid ${header.kid}`);
    }
    return jwk;
  }

  private verifySignature(header: JwtHeader, signingInput: string, signature: Buffer, jwk: Record<string, any>) {
    const alg = String(header.alg || '').toUpperCase();
    const keyObject = createPublicKey({ key: jwk as any, format: 'jwk' });
    const input = Buffer.from(signingInput, 'utf8');

    if (alg === 'RS256') {
      return cryptoVerify('RSA-SHA256', input, keyObject, signature);
    }
    if (alg === 'RS384') {
      return cryptoVerify('RSA-SHA384', input, keyObject, signature);
    }
    if (alg === 'RS512') {
      return cryptoVerify('RSA-SHA512', input, keyObject, signature);
    }
    if (alg === 'PS256') {
      return cryptoVerify(
        'RSA-SHA256',
        input,
        { key: keyObject, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 },
        signature,
      );
    }
    if (alg === 'PS384') {
      return cryptoVerify(
        'RSA-SHA384',
        input,
        { key: keyObject, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 48 },
        signature,
      );
    }
    if (alg === 'PS512') {
      return cryptoVerify(
        'RSA-SHA512',
        input,
        { key: keyObject, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 64 },
        signature,
      );
    }

    throw new UnauthorizedException(`Unsupported JWT algorithm: ${alg || 'unknown'}`);
  }

  private validateClaims(payload: JwtPayload, options: JwtVerificationOptions) {
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp <= now) {
      throw new UnauthorizedException(`${options.tokenLabel} has expired`);
    }
    if (typeof payload.nbf === 'number' && payload.nbf > now) {
      throw new UnauthorizedException(`${options.tokenLabel} is not yet valid`);
    }

    if (options.expectedIssuer && payload.iss !== options.expectedIssuer) {
      throw new UnauthorizedException(`${options.tokenLabel} issuer mismatch`);
    }

    if (options.expectedAudience) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud].filter(Boolean);
      if (!audiences.includes(options.expectedAudience)) {
        throw new UnauthorizedException(`${options.tokenLabel} audience mismatch`);
      }
    }
  }

  private async verifySignedJwt(token: string, options: JwtVerificationOptions) {
    const parsed = this.parseJwt(token);
    const jwk = await this.resolveJwk(parsed.header, options.jwksUrl);

    if (!this.verifySignature(parsed.header, parsed.signingInput, parsed.signature, jwk)) {
      throw new UnauthorizedException(`${options.tokenLabel} signature verification failed`);
    }

    this.validateClaims(parsed.payload, options);
    return parsed;
  }

  private claimString(payload: JwtPayload, keys: string[]): string {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return '';
  }

  private claimStringArray(payload: JwtPayload, keys: string[]): string[] {
    const values: string[] = [];
    for (const key of keys) {
      const value = payload[key];
      if (Array.isArray(value)) {
        values.push(
          ...value
            .filter((entry) => typeof entry === 'string')
            .map((entry) => String(entry).trim())
            .filter(Boolean),
        );
      } else if (typeof value === 'string' && value.trim()) {
        values.push(
          ...value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean),
        );
      }
    }

    return Array.from(new Set(values));
  }

  mapDeviceCompliance(value: unknown): DeviceComplianceStatus {
    const normalized = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (['SECURE_WORKSTATION', 'SECURE', 'LOCKED_DOWN'].includes(normalized)) return 'SECURE_WORKSTATION';
    if (['HARDENED', 'ATTESTED', 'ATTESTATION_PASSED'].includes(normalized)) return 'HARDENED';
    if (['MANAGED', 'COMPLIANT', 'COMPLIANT_DEVICE'].includes(normalized)) return 'MANAGED';
    if (['NON_COMPLIANT', 'UNMANAGED', 'FAILED'].includes(normalized)) return 'NON_COMPLIANT';
    return 'UNKNOWN';
  }

  mapNetworkZone(value: unknown): NetworkZone {
    const normalized = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (['INTERNAL', 'CORP', 'CORPORATE'].includes(normalized)) return 'INTERNAL';
    if (['VPN', 'CORP_VPN', 'TRUSTED_VPN'].includes(normalized)) return 'VPN';
    if (['RESTRICTED', 'HIGH_TRUST', 'PRIVATE_SEGMENT'].includes(normalized)) return 'RESTRICTED';
    if (['SECURE_ENCLAVE', 'ENCLAVE', 'PRIVILEGED'].includes(normalized)) return 'SECURE_ENCLAVE';
    if (['EXTERNAL', 'INTERNET', 'UNTRUSTED'].includes(normalized)) return 'EXTERNAL';
    return 'UNKNOWN';
  }

  private mapAuthSource(): AuthSource {
    const provider = (this.getConfigValue('ENTERPRISE_IDP_PROVIDER') || '').toLowerCase();
    if (provider.includes('azure')) return 'AZURE_AD';
    if (provider.includes('okta')) return 'OKTA';
    if (provider.includes('ad') || provider.includes('active-directory')) return 'ACTIVE_DIRECTORY';
    return 'ENTERPRISE_IAM';
  }

  private mapClearance(value: unknown): ClearanceLevel {
    const normalized = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (normalized.startsWith('L4') || normalized.includes('CRITICAL')) return 'L4_CRITICAL';
    if (normalized.startsWith('L3') || normalized.includes('RESTRICTED')) return 'L3_RESTRICTED';
    if (normalized.startsWith('L2') || normalized.includes('CONFIDENTIAL')) return 'L2_CONFIDENTIAL';
    if (normalized.startsWith('L1') || normalized.includes('SENSITIVE')) return 'L1_SENSITIVE';
    return 'L0_INTERNAL';
  }

  private mapRole(values: string[]): UserRole {
    const normalized = values.map((value) => value.toLowerCase());
    if (normalized.some((value) => value.includes('admin'))) {
      return 'ADMIN';
    }
    if (normalized.some((value) => value.includes('security') || value.includes('engineer'))) {
      return 'SECURITY_ENGINEER';
    }
    return 'VIEWER';
  }

  private getRequestHeader(req: any, headerName: string): string {
    const value = req?.headers?.[headerName];
    if (Array.isArray(value)) {
      return value[0] || '';
    }
    return typeof value === 'string' ? value : '';
  }

  private extractIpAddress(req: any): string | null {
    const forwardedFor = this.getRequestHeader(req, 'x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    const realIp = this.getRequestHeader(req, 'x-real-ip');
    if (realIp) {
      return realIp;
    }
    const rawIp = typeof req?.ip === 'string' ? req.ip : '';
    return rawIp || null;
  }

  extractRequestContext(req: any, attestation?: VerifiedDeviceAttestation | null): RequestSecurityContext {
    const headerDeviceId = this.getRequestHeader(req, 'x-qv-device-id') || null;
    const headerCompliance = this.mapDeviceCompliance(this.getRequestHeader(req, 'x-qv-device-compliance'));
    const headerTrustLevel = this.getRequestHeader(req, 'x-qv-device-trust') || null;
    const headerNetworkZone = this.mapNetworkZone(this.getRequestHeader(req, 'x-qv-network-zone'));

    return {
      deviceId: attestation?.deviceId || headerDeviceId,
      deviceCompliance: attestation?.compliance || headerCompliance,
      deviceTrustLevel: attestation?.trustLevel || headerTrustLevel,
      networkZone: attestation?.networkZone || headerNetworkZone,
      ipAddress: this.extractIpAddress(req),
      location: this.getRequestHeader(req, 'x-qv-location') || null,
      deviceAttested: Boolean(attestation),
      deviceAttestedAt: attestation?.verifiedAt || null,
    };
  }

  private mfaSatisfied(payload: JwtPayload): boolean {
    const amr = this.claimStringArray(payload, ['amr', 'auth_methods', 'authentication_methods']);
    const acr = this.claimString(payload, ['acr', 'authentication_context']);
    return amr.some((value) => value.toLowerCase() === 'mfa')
      || acr.toLowerCase().includes('mfa')
      || payload['mfa'] === true
      || payload['step_up'] === true;
  }

  private stepUpSatisfied(payload: JwtPayload): boolean {
    const acr = this.claimString(payload, ['acr', 'authentication_context']);
    return acr.toLowerCase().includes('step')
      || acr.toLowerCase().includes('phr')
      || payload['step_up'] === true
      || payload['strong_auth'] === true;
  }

  private resolveVerifiedAt(payload: JwtPayload): string {
    if (typeof payload.iat === 'number' && payload.iat > 0) {
      return new Date(payload.iat * 1000).toISOString();
    }
    return new Date().toISOString();
  }

  private assertSubjectMatch(subject: string, email: string, payload: JwtPayload, tokenLabel: string) {
    const candidateSubject = this.claimString(payload, ['sub', 'oid', 'uid']);
    const candidateEmail = this.claimString(payload, ['email', 'preferred_username', 'upn']);

    if (
      candidateSubject
      && candidateSubject !== subject
      && (!candidateEmail || candidateEmail.toLowerCase() !== email.toLowerCase())
    ) {
      throw new UnauthorizedException(`${tokenLabel} does not belong to the authenticated subject`);
    }
  }

  private async resolveStepUpEvidence(
    primaryPayload: JwtPayload,
    subject: string,
    email: string,
    req: any,
  ): Promise<StepUpEvidence> {
    if (this.stepUpSatisfied(primaryPayload)) {
      return {
        satisfied: true,
        verifiedAt: this.resolveVerifiedAt(primaryPayload),
        claims: {
          source: 'enterprise_token',
          acr: this.claimString(primaryPayload, ['acr', 'authentication_context']) || null,
          amr: this.claimStringArray(primaryPayload, ['amr', 'auth_methods', 'authentication_methods']),
        },
      };
    }

    const token = this.getRequestHeader(req, 'x-qv-step-up-token');
    if (!token) {
      return {
        satisfied: false,
        verifiedAt: null,
        claims: null,
      };
    }

    const { payload } = await this.verifySignedJwt(token, {
      jwksUrl: this.getConfigValue('ENTERPRISE_STEP_UP_JWKS_URL') || this.getJwksUrl(),
      expectedIssuer: this.getConfigValue('ENTERPRISE_STEP_UP_ISSUER') || this.getConfigValue('ENTERPRISE_IDP_ISSUER'),
      expectedAudience: this.getConfigValue('ENTERPRISE_STEP_UP_AUDIENCE'),
      tokenLabel: 'Enterprise step-up token',
    });

    this.assertSubjectMatch(subject, email, payload, 'Enterprise step-up token');

    if (!this.stepUpSatisfied(payload) && !this.mfaSatisfied(payload)) {
      throw new UnauthorizedException('Enterprise step-up token is missing strong-auth claims');
    }

    return {
      satisfied: true,
      verifiedAt: this.resolveVerifiedAt(payload),
      claims: {
        source: 'step_up_token',
        issuer: payload.iss || null,
        acr: this.claimString(payload, ['acr', 'authentication_context']) || null,
        amr: this.claimStringArray(payload, ['amr', 'auth_methods', 'authentication_methods']),
      },
    };
  }

  private async resolveDeviceAttestation(req: any): Promise<VerifiedDeviceAttestation | null> {
    const token = this.getRequestHeader(req, 'x-qv-device-attestation-token');
    if (!token) {
      return null;
    }

    const jwksUrl = this.getConfigValue('DEVICE_ATTESTATION_JWKS_URL');
    if (!jwksUrl) {
      throw new UnauthorizedException('DEVICE_ATTESTATION_JWKS_URL is required for device attestation verification');
    }

    const { payload } = await this.verifySignedJwt(token, {
      jwksUrl,
      expectedIssuer: this.getConfigValue('DEVICE_ATTESTATION_ISSUER'),
      expectedAudience: this.getConfigValue('DEVICE_ATTESTATION_AUDIENCE'),
      tokenLabel: 'Device attestation token',
    });

    const deviceId = this.claimString(payload, ['device_id', 'deviceId', 'sub']);
    if (!deviceId) {
      throw new UnauthorizedException('Device attestation token is missing device identity claims');
    }

    const compliance = this.mapDeviceCompliance(
      this.claimString(payload, ['device_compliance', 'deviceCompliance', 'compliance']),
    );
    if (compliance === 'UNKNOWN' || compliance === 'NON_COMPLIANT') {
      throw new UnauthorizedException('Device attestation token does not describe a compliant device');
    }

    const trustLevel = this.claimString(payload, ['device_trust', 'deviceTrust', 'trust_level']) || null;
    const networkZone = this.mapNetworkZone(
      this.claimString(payload, ['network_zone', 'networkZone', 'zone']),
    );

    if (payload['attested'] === false) {
      throw new UnauthorizedException('Device attestation token explicitly failed device attestation');
    }

    return {
      deviceId,
      compliance,
      trustLevel,
      networkZone,
      verifiedAt: this.resolveVerifiedAt(payload),
      claims: {
        issuer: payload.iss || null,
        compliance,
        trustLevel,
        networkZone,
        attested: payload['attested'] !== false,
      },
    };
  }

  async verifyEnterpriseToken(token: string, req: any): Promise<VerifiedEnterpriseIdentity> {
    const { payload, signingInput } = await this.verifySignedJwt(token, {
      jwksUrl: this.getJwksUrl(),
      expectedIssuer: this.getConfigValue('ENTERPRISE_IDP_ISSUER'),
      expectedAudience: this.getConfigValue('ENTERPRISE_IDP_AUDIENCE'),
      tokenLabel: 'Enterprise token',
    });

    const subject = this.claimString(payload, ['sub', 'oid', 'uid']);
    const email = this.claimString(payload, ['email', 'preferred_username', 'upn']);
    if (!subject || !email) {
      throw new UnauthorizedException('Enterprise token is missing required identity claims');
    }

    const claimsRoles = this.claimStringArray(payload, ['roles', 'groups', 'entitlements']);
    const stepUpEvidence = await this.resolveStepUpEvidence(payload, subject, email, req);
    const deviceAttestation = await this.resolveDeviceAttestation(req);
    const requestContext = this.extractRequestContext(req, deviceAttestation);

    const deviceComplianceClaim = this.claimString(payload, ['device_compliance', 'deviceCompliance']);
    if (deviceComplianceClaim && requestContext.deviceCompliance === 'UNKNOWN') {
      requestContext.deviceCompliance = this.mapDeviceCompliance(deviceComplianceClaim);
    }

    const networkZoneClaim = this.claimString(payload, ['network_zone', 'networkZone']);
    if (networkZoneClaim && requestContext.networkZone === 'UNKNOWN') {
      requestContext.networkZone = this.mapNetworkZone(networkZoneClaim);
    }

    const role = this.mapRole(claimsRoles);
    const sessionClaims = {
      identityType: 'user',
      issuer: payload.iss || null,
      audience: payload.aud || null,
      roles: claimsRoles,
      groups: this.claimStringArray(payload, ['groups']),
      projects: this.claimStringArray(payload, ['projects', 'project_memberships', 'projectMemberships']),
      stepUp: stepUpEvidence,
      deviceAttestation: deviceAttestation
        ? {
            ...deviceAttestation.claims,
            deviceId: deviceAttestation.deviceId,
            verifiedAt: deviceAttestation.verifiedAt,
          }
        : null,
      rawClaimsDigest: signingInput,
    } satisfies Record<string, unknown>;

    return {
      email,
      subject,
      employeeId: this.claimString(payload, ['employee_id', 'employeeId']) || null,
      department: this.claimString(payload, ['department', 'dept']) || null,
      clearanceLevel: this.mapClearance(
        this.claimString(payload, ['clearance_level', 'clearanceLevel', 'classification_level']),
      ),
      role,
      authSource: this.mapAuthSource(),
      projectMemberships: this.claimStringArray(payload, ['projects', 'project_memberships', 'projectMemberships']),
      mfaSatisfied: this.mfaSatisfied(payload) || stepUpEvidence.satisfied,
      stepUpSatisfied: stepUpEvidence.satisfied,
      sessionContext: requestContext,
      sessionClaims: sessionClaims as Prisma.InputJsonValue,
    };
  }
}
