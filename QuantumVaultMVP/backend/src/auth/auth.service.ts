import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  AuthSource,
  ClearanceLevel,
  DeviceComplianceStatus,
  NetworkZone,
  Prisma,
  User,
  UserRole,
} from '@prisma/client';
import { extractAuthTokenFromRequest } from './auth-token.util';
import { EnterpriseIdentityService } from './enterprise-identity.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private enterpriseIdentityService: EnterpriseIdentityService,
  ) {}

  private asJsonRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    }
    return {};
  }

  private parseExpiryToMs(raw: string): number {
    const value = (raw || '24h').trim().toLowerCase();
    const match = value.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) {
      return 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    if (!Number.isFinite(amount) || amount <= 0) {
      return 24 * 60 * 60 * 1000;
    }

    if (unit === 'ms') return amount;
    if (unit === 's') return amount * 1000;
    if (unit === 'm') return amount * 60 * 1000;
    if (unit === 'h') return amount * 60 * 60 * 1000;
    return amount * 24 * 60 * 60 * 1000;
  }

  private computeSessionExpiry(): Date {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';
    return new Date(Date.now() + this.parseExpiryToMs(expiresIn));
  }

  buildLocalSessionContext(req: any) {
    const requestContext = this.enterpriseIdentityService.extractRequestContext(req);
    return {
      authSource: 'LOCAL' as AuthSource,
      idpSubject: null,
      mfaSatisfied: false,
      stepUpSatisfied: false,
      deviceId: requestContext.deviceId,
      deviceCompliance: requestContext.deviceCompliance as DeviceComplianceStatus,
      deviceTrustLevel: requestContext.deviceTrustLevel,
      networkZone: requestContext.networkZone as NetworkZone,
      ipAddress: requestContext.ipAddress,
      sessionClaims: {
        identityType: 'user',
        loginMethod: 'local',
        location: requestContext.location,
        deviceAttestation: requestContext.deviceAttested
          ? {
              verifiedAt: requestContext.deviceAttestedAt,
              deviceId: requestContext.deviceId,
              compliance: requestContext.deviceCompliance,
            }
          : null,
      } as Prisma.InputJsonValue,
    };
  }

  private async createAppSession(
    user: User,
    context: {
      authSource?: AuthSource;
      idpSubject?: string | null;
      mfaSatisfied?: boolean;
      stepUpSatisfied?: boolean;
      deviceId?: string | null;
      deviceCompliance?: DeviceComplianceStatus;
      deviceTrustLevel?: string | null;
      networkZone?: NetworkZone;
      ipAddress?: string | null;
      sessionClaims?: Prisma.InputJsonValue | null;
    },
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      authSource: context.authSource || user.authSource || AuthSource.LOCAL,
      clearanceLevel: user.clearanceLevel,
    };

    const token = this.jwtService.sign(payload);
    const expiresAt = this.computeSessionExpiry();

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token,
        authSource: context.authSource || user.authSource || AuthSource.LOCAL,
        idpSubject: context.idpSubject || null,
        mfaSatisfied: Boolean(context.mfaSatisfied),
        stepUpSatisfied: Boolean(context.stepUpSatisfied),
        deviceId: context.deviceId || null,
        deviceCompliance: context.deviceCompliance || 'UNKNOWN',
        deviceTrustLevel: context.deviceTrustLevel || null,
        networkZone: context.networkZone || 'UNKNOWN',
        ipAddress: context.ipAddress || null,
        sessionClaims: context.sessionClaims || Prisma.JsonNull,
        expiresAt,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastMfaAt: context.mfaSatisfied ? new Date() : user.lastMfaAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        resource: 'AUTH',
        details: {
          authSource: context.authSource || user.authSource || AuthSource.LOCAL,
          deviceId: context.deviceId || null,
          networkZone: context.networkZone || 'UNKNOWN',
        } as Prisma.InputJsonValue,
      },
    });

    return {
      access_token: token,
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        department: user.department,
        clearanceLevel: user.clearanceLevel,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  }

  async login(
    user: User,
    context: ReturnType<AuthService['buildLocalSessionContext']> = this.buildLocalSessionContext({}),
  ) {
    return this.createAppSession(user, context);
  }

  async exchangeEnterpriseToken(idToken: string, req: any) {
    const identity = await this.enterpriseIdentityService.verifyEnterpriseToken(idToken, req);
    const existing = await this.prisma.user.findUnique({
      where: { email: identity.email },
    });

    const role = existing?.breakGlass ? existing.role : identity.role;
    const user = await this.prisma.user.upsert({
      where: { email: identity.email },
      create: {
        email: identity.email,
        passwordHash: await bcrypt.hash(`federated:${identity.subject}:${randomUUID()}`, 12),
        role,
        authSource: identity.authSource,
        employeeId: identity.employeeId,
        department: identity.department,
        clearanceLevel: identity.clearanceLevel,
        projectMemberships: identity.projectMemberships,
        lastMfaAt: identity.mfaSatisfied ? new Date() : null,
        isActive: true,
      },
      update: {
        role,
        authSource: identity.authSource,
        employeeId: identity.employeeId,
        department: identity.department,
        clearanceLevel: identity.clearanceLevel,
        projectMemberships: identity.projectMemberships,
        lastMfaAt: identity.mfaSatisfied ? new Date() : existing?.lastMfaAt,
        isActive: true,
      },
    });

    return this.createAppSession(user, {
      authSource: identity.authSource,
      idpSubject: identity.subject,
      mfaSatisfied: identity.mfaSatisfied,
      stepUpSatisfied: identity.stepUpSatisfied,
      deviceId: identity.sessionContext.deviceId,
      deviceCompliance: identity.sessionContext.deviceCompliance,
      deviceTrustLevel: identity.sessionContext.deviceTrustLevel,
      networkZone: identity.sessionContext.networkZone,
      ipAddress: identity.sessionContext.ipAddress,
      sessionClaims: identity.sessionClaims,
    });
  }

  private async ensureServiceAccountUser(params: {
    clientId: string;
    role: UserRole;
    clearanceLevel: ClearanceLevel;
    department?: string | null;
    projectMemberships: string[];
    existingUserId?: string;
  }) {
    const syntheticEmail = `${params.clientId}@svc.quantumvault.internal`;
    if (params.existingUserId) {
      return this.prisma.user.update({
        where: { id: params.existingUserId },
        data: {
          email: syntheticEmail,
          role: params.role,
          authSource: AuthSource.ENTERPRISE_IAM,
          department: params.department || null,
          clearanceLevel: params.clearanceLevel,
          projectMemberships: params.projectMemberships,
          isActive: true,
        },
      });
    }

    return this.prisma.user.upsert({
      where: { email: syntheticEmail },
      create: {
        email: syntheticEmail,
        passwordHash: await bcrypt.hash(`service-account:${params.clientId}:${randomUUID()}`, 12),
        role: params.role,
        authSource: AuthSource.ENTERPRISE_IAM,
        department: params.department || null,
        clearanceLevel: params.clearanceLevel,
        projectMemberships: params.projectMemberships,
        isActive: true,
      },
      update: {
        role: params.role,
        authSource: AuthSource.ENTERPRISE_IAM,
        department: params.department || null,
        clearanceLevel: params.clearanceLevel,
        projectMemberships: params.projectMemberships,
        isActive: true,
      },
    });
  }

  async exchangeServiceAccountCredentials(clientId: string, clientSecret: string, req: any) {
    const normalizedClientId = String(clientId || '').trim();
    if (!normalizedClientId || !clientSecret) {
      throw new UnauthorizedException('clientId and clientSecret are required');
    }

    const serviceAccount = await this.prisma.serviceAccount.findUnique({
      where: { clientId: normalizedClientId },
      include: { user: true },
    });

    if (!serviceAccount || !serviceAccount.isActive || !serviceAccount.user.isActive) {
      throw new UnauthorizedException('Service account is not active');
    }

    const secretMatches = await bcrypt.compare(clientSecret, serviceAccount.clientSecretHash);
    if (!secretMatches) {
      throw new UnauthorizedException('Invalid service-account credentials');
    }

    const requestContext = this.enterpriseIdentityService.extractRequestContext(req);
    const sessionClaims = {
      identityType: 'service_account',
      serviceAccountId: serviceAccount.id,
      clientId: serviceAccount.clientId,
      allowedNetworkZones: serviceAccount.allowedNetworkZones,
      strongClientAuth: true,
    } satisfies Record<string, unknown>;

    const user = await this.ensureServiceAccountUser({
      clientId: serviceAccount.clientId,
      role: serviceAccount.role,
      clearanceLevel: serviceAccount.clearanceLevel,
      department: serviceAccount.department,
      projectMemberships: serviceAccount.projectMemberships,
      existingUserId: serviceAccount.userId,
    });

    await this.prisma.serviceAccount.update({
      where: { id: serviceAccount.id },
      data: {
        lastUsedAt: new Date(),
        userId: user.id,
      },
    });

    return this.createAppSession(user, {
      authSource: AuthSource.ENTERPRISE_IAM,
      idpSubject: serviceAccount.clientId,
      mfaSatisfied: false,
      stepUpSatisfied: false,
      deviceId: requestContext.deviceId,
      deviceCompliance: requestContext.deviceCompliance,
      deviceTrustLevel: requestContext.deviceTrustLevel,
      networkZone: requestContext.networkZone,
      ipAddress: requestContext.ipAddress,
      sessionClaims: sessionClaims as Prisma.InputJsonValue,
    });
  }

  async logout(token: string) {
    await this.prisma.session.deleteMany({
      where: { token },
    });

    return { message: 'Logged out successfully' };
  }

  async validateToken(token: string): Promise<User | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.user;
  }

  async getUserFromToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

  async getSessionContext(token: string) {
    if (!token) {
      return null;
    }

    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session;
  }

  async getSessionContextForRequest(req: any) {
    return this.getSessionContext(extractAuthTokenFromRequest(req));
  }

  async getProfileForRequest(req: any) {
    const token = extractAuthTokenFromRequest(req);
    const [user, session] = await Promise.all([
      token ? this.getUserFromToken(token).catch(() => null) : Promise.resolve(null),
      this.getSessionContext(token),
    ]);

    if (!user) {
      throw new UnauthorizedException();
    }

    const claims = this.asJsonRecord(session?.sessionClaims);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      authSource: user.authSource,
      department: user.department,
      clearanceLevel: user.clearanceLevel,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      identityType: typeof claims.identityType === 'string' ? claims.identityType : 'user',
      serviceAccountId: typeof claims.serviceAccountId === 'string' ? claims.serviceAccountId : null,
    };
  }

  async createUser(email: string, password: string, role: UserRole = UserRole.VIEWER) {
    const passwordHash = await bcrypt.hash(password, 12);
    
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });
  }
}
