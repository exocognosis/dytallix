import { BadRequestException } from '@nestjs/common';
import {
    ClearanceLevel,
    ManagedCredentialStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
    ML_KEM_1024_ALGORITHM,
    ML_KEM_512_ALGORITHM,
    ML_KEM_768_ALGORITHM,
} from '../../crypto/mlkem';
import { PrismaService } from '../../database/prisma.service';
import { AdminActor } from '../admin.types';
import { parseJsonObject, toInputJsonValue } from '../admin.utils';

export class AdminAccessOperations {
    constructor(private readonly prisma: PrismaService) { }

    private parseServiceAccountRole(value: unknown) {
        const normalized = String(value || 'VIEWER').trim().toUpperCase();
        if (normalized === 'ADMIN') return 'ADMIN';
        if (normalized === 'SECURITY_ENGINEER') return 'SECURITY_ENGINEER';
        return 'VIEWER';
    }

    private normalizeServiceAccountClientId(displayName: string, requestedClientId?: string) {
        const base = (requestedClientId || displayName)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 48);

        if (!base) {
            throw new BadRequestException('Unable to derive a service-account clientId from the provided name');
        }

        return base;
    }

    private normalizeServiceAccountNetworkZones(value: unknown): string[] {
        const allowed = new Set(['UNKNOWN', 'INTERNAL', 'VPN', 'RESTRICTED', 'SECURE_ENCLAVE', 'EXTERNAL']);
        const values = Array.isArray(value)
            ? value
            : typeof value === 'string'
                ? value.split(',')
                : [];

        const normalized = values
            .map((entry) => String(entry || '').trim().toUpperCase())
            .filter((entry) => allowed.has(entry));

        return Array.from(new Set(normalized));
    }

    private parseNetworkZone(value: unknown) {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'INTERNAL') return 'INTERNAL';
        if (normalized === 'VPN') return 'VPN';
        if (normalized === 'RESTRICTED') return 'RESTRICTED';
        if (normalized === 'SECURE_ENCLAVE') return 'SECURE_ENCLAVE';
        if (normalized === 'EXTERNAL') return 'EXTERNAL';
        return 'UNKNOWN';
    }

    private parseManagedCredentialStatus(value: unknown): ManagedCredentialStatus | null {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'ACTIVE') return 'ACTIVE';
        if (normalized === 'REVOKED') return 'REVOKED';
        if (normalized === 'EXPIRED') return 'EXPIRED';
        return null;
    }

    private parseOptionalDate(value: unknown): Date | null {
        if (value == null || String(value).trim() === '') {
            return null;
        }
        const parsed = new Date(String(value));
        if (Number.isNaN(parsed.getTime())) {
            throw new BadRequestException('Invalid date value');
        }
        return parsed;
    }

    private normalizeManagedCredentialDeviceKeyAlgorithm(value: unknown) {
        const normalized = String(value || '').trim().toUpperCase().replace(/_/g, '-');
        const allowed = new Set([
            ML_KEM_512_ALGORITHM,
            ML_KEM_768_ALGORITHM,
            ML_KEM_1024_ALGORITHM,
        ]);
        if (!allowed.has(normalized)) {
            throw new BadRequestException('deviceKeyAlgorithm must be ML-KEM-512, ML-KEM-768, or ML-KEM-1024');
        }
        return normalized;
    }

    private normalizeManagedCredentialPublicKey(value: unknown) {
        const normalized = String(value || '').trim();
        if (!normalized) {
            throw new BadRequestException('devicePublicKey is required');
        }

        let decoded: Buffer;
        try {
            decoded = Buffer.from(normalized, 'base64');
        } catch {
            throw new BadRequestException('devicePublicKey must be valid base64');
        }

        if (!decoded.length) {
            throw new BadRequestException('devicePublicKey must be valid base64');
        }

        return {
            base64: normalized,
            hashHex: `0x${crypto.createHash('sha256').update(decoded).digest('hex')}`,
        };
    }

    async expireManagedCredentials() {
        await this.prisma.managedCredential.updateMany({
            where: {
                status: 'ACTIVE',
                expiresAt: { lt: new Date() },
            },
            data: {
                status: 'EXPIRED',
            },
        });
    }

    private parseClearanceLevel(value: unknown): ClearanceLevel {
        const normalized = String(value || '').trim().toUpperCase();
        if (normalized === 'L4_CRITICAL') return 'L4_CRITICAL';
        if (normalized === 'L3_RESTRICTED') return 'L3_RESTRICTED';
        if (normalized === 'L2_CONFIDENTIAL') return 'L2_CONFIDENTIAL';
        if (normalized === 'L1_SENSITIVE') return 'L1_SENSITIVE';
        return 'L0_INTERNAL';
    }

    async listServiceAccounts(search?: string) {
        const normalizedSearch = String(search || '').trim();
        const serviceAccounts = await this.prisma.serviceAccount.findMany({
            where: normalizedSearch
                ? {
                    OR: [
                        { clientId: { contains: normalizedSearch, mode: 'insensitive' } },
                        { displayName: { contains: normalizedSearch, mode: 'insensitive' } },
                        { description: { contains: normalizedSearch, mode: 'insensitive' } },
                    ],
                }
                : undefined,
            include: {
                user: {
                    select: {
                        email: true,
                        isActive: true,
                    },
                },
            },
            orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
            take: 100,
        });

        return serviceAccounts.map((serviceAccount) => ({
            id: serviceAccount.id,
            clientId: serviceAccount.clientId,
            displayName: serviceAccount.displayName,
            description: serviceAccount.description,
            role: serviceAccount.role,
            clearanceLevel: serviceAccount.clearanceLevel,
            department: serviceAccount.department,
            projectMemberships: serviceAccount.projectMemberships,
            allowedNetworkZones: serviceAccount.allowedNetworkZones,
            isActive: serviceAccount.isActive && serviceAccount.user.isActive,
            shadowUserEmail: serviceAccount.user.email,
            lastUsedAt: serviceAccount.lastUsedAt?.toISOString() || null,
            secretRotatedAt: serviceAccount.secretRotatedAt?.toISOString() || null,
            createdAt: serviceAccount.createdAt.toISOString(),
            updatedAt: serviceAccount.updatedAt.toISOString(),
        }));
    }

    async createServiceAccount(
        input: {
            displayName: string;
            clientId?: string;
            description?: string;
            role?: string;
            clearanceLevel?: string;
            department?: string;
            projectMemberships?: string[];
            allowedNetworkZones?: string[];
        },
        actor?: AdminActor,
    ) {
        const displayName = String(input?.displayName || '').trim();
        if (!displayName) {
            throw new BadRequestException('displayName is required');
        }

        const clientId = this.normalizeServiceAccountClientId(displayName, input?.clientId);
        const projectMemberships = Array.isArray(input?.projectMemberships)
            ? input.projectMemberships.map((entry) => String(entry).trim()).filter(Boolean)
            : [];
        const allowedNetworkZones = this.normalizeServiceAccountNetworkZones(input?.allowedNetworkZones);
        const role = this.parseServiceAccountRole(input?.role);
        const clearanceLevel = this.parseClearanceLevel(input?.clearanceLevel);
        const clientSecret = `qvs_${crypto.randomBytes(32).toString('base64url')}`;
        const clientSecretHash = await bcrypt.hash(clientSecret, 12);

        const created = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: `${clientId}@svc.quantumvault.internal`,
                    passwordHash: await bcrypt.hash(`svc:${clientId}:${crypto.randomUUID()}`, 12),
                    role,
                    authSource: 'ENTERPRISE_IAM',
                    department: input?.department?.trim() || null,
                    clearanceLevel,
                    projectMemberships,
                    isActive: true,
                },
            });

            return tx.serviceAccount.create({
                data: {
                    clientId,
                    displayName,
                    description: input?.description?.trim() || null,
                    clientSecretHash,
                    role,
                    clearanceLevel,
                    department: input?.department?.trim() || null,
                    projectMemberships,
                    allowedNetworkZones,
                    userId: user.id,
                    secretRotatedAt: new Date(),
                },
                include: {
                    user: {
                        select: {
                            email: true,
                        },
                    },
                },
            });
        });

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'SERVICE_ACCOUNT_CREATED',
                resource: 'SERVICE_ACCOUNT',
                resourceId: created.id,
                details: toInputJsonValue({
                    clientId: created.clientId,
                    displayName: created.displayName,
                    role: created.role,
                    clearanceLevel: created.clearanceLevel,
                    allowedNetworkZones: created.allowedNetworkZones,
                    requestedBy: actor?.email || 'admin',
                }),
            },
        });

        return {
            id: created.id,
            clientId: created.clientId,
            displayName: created.displayName,
            description: created.description,
            role: created.role,
            clearanceLevel: created.clearanceLevel,
            department: created.department,
            projectMemberships: created.projectMemberships,
            allowedNetworkZones: created.allowedNetworkZones,
            shadowUserEmail: created.user.email,
            clientSecret,
            createdAt: created.createdAt.toISOString(),
        };
    }

    async rotateServiceAccountSecret(id: string, actor?: AdminActor) {
        const serviceAccount = await this.prisma.serviceAccount.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        email: true,
                    },
                },
            },
        });

        if (!serviceAccount) {
            throw new BadRequestException('Service account not found');
        }

        const clientSecret = `qvs_${crypto.randomBytes(32).toString('base64url')}`;
        const clientSecretHash = await bcrypt.hash(clientSecret, 12);
        const updated = await this.prisma.serviceAccount.update({
            where: { id },
            data: {
                clientSecretHash,
                secretRotatedAt: new Date(),
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'SERVICE_ACCOUNT_SECRET_ROTATED',
                resource: 'SERVICE_ACCOUNT',
                resourceId: id,
                details: toInputJsonValue({
                    clientId: serviceAccount.clientId,
                    rotatedBy: actor?.email || 'admin',
                }),
            },
        });

        return {
            id: updated.id,
            clientId: serviceAccount.clientId,
            shadowUserEmail: serviceAccount.user.email,
            clientSecret,
            secretRotatedAt: updated.secretRotatedAt?.toISOString() || null,
        };
    }

    async setServiceAccountActive(id: string, isActive: boolean, reason?: string, actor?: AdminActor) {
        const serviceAccount = await this.prisma.serviceAccount.findUnique({
            where: { id },
        });
        if (!serviceAccount) {
            throw new BadRequestException('Service account not found');
        }

        const [updated] = await this.prisma.$transaction([
            this.prisma.serviceAccount.update({
                where: { id },
                data: { isActive },
            }),
            this.prisma.user.update({
                where: { id: serviceAccount.userId },
                data: { isActive },
            }),
        ]);

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'SERVICE_ACCOUNT_STATUS_UPDATED',
                resource: 'SERVICE_ACCOUNT',
                resourceId: id,
                details: toInputJsonValue({
                    clientId: serviceAccount.clientId,
                    isActive,
                    reason: reason || null,
                    updatedBy: actor?.email || 'admin',
                }),
            },
        });

        return {
            id: updated.id,
            clientId: updated.clientId,
            isActive: updated.isActive,
            updatedAt: updated.updatedAt.toISOString(),
        };
    }

    async updateServiceAccount(
        id: string,
        input: {
            displayName?: string;
            description?: string | null;
            role?: string;
            clearanceLevel?: string;
            department?: string | null;
            projectMemberships?: string[];
            allowedNetworkZones?: string[];
            reason?: string;
        },
        actor?: AdminActor,
    ) {
        const existing = await this.prisma.serviceAccount.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
        });
        if (!existing) {
            throw new BadRequestException('Service account not found');
        }

        const displayName = input?.displayName !== undefined
            ? String(input.displayName || '').trim()
            : existing.displayName;
        if (!displayName) {
            throw new BadRequestException('displayName is required');
        }

        const description = input?.description !== undefined
            ? String(input.description || '').trim() || null
            : existing.description;
        const role = input?.role !== undefined
            ? this.parseServiceAccountRole(input.role)
            : existing.role;
        const clearanceLevel = input?.clearanceLevel !== undefined
            ? this.parseClearanceLevel(input.clearanceLevel)
            : existing.clearanceLevel;
        const department = input?.department !== undefined
            ? String(input.department || '').trim() || null
            : existing.department;
        const projectMemberships = Array.isArray(input?.projectMemberships)
            ? input.projectMemberships.map((entry) => String(entry).trim()).filter(Boolean)
            : existing.projectMemberships;
        const allowedNetworkZones = input?.allowedNetworkZones !== undefined
            ? this.normalizeServiceAccountNetworkZones(input.allowedNetworkZones)
            : existing.allowedNetworkZones;

        const [updated] = await this.prisma.$transaction([
            this.prisma.serviceAccount.update({
                where: { id },
                data: {
                    displayName,
                    description,
                    role,
                    clearanceLevel,
                    department,
                    projectMemberships,
                    allowedNetworkZones,
                },
            }),
            this.prisma.user.update({
                where: { id: existing.userId },
                data: {
                    role,
                    clearanceLevel,
                    department,
                    projectMemberships,
                },
            }),
        ]);

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'SERVICE_ACCOUNT_UPDATED',
                resource: 'SERVICE_ACCOUNT',
                resourceId: id,
                details: toInputJsonValue({
                    clientId: existing.clientId,
                    previous: {
                        displayName: existing.displayName,
                        description: existing.description,
                        role: existing.role,
                        clearanceLevel: existing.clearanceLevel,
                        department: existing.department,
                        projectMemberships: existing.projectMemberships,
                        allowedNetworkZones: existing.allowedNetworkZones,
                    },
                    current: {
                        displayName,
                        description,
                        role,
                        clearanceLevel,
                        department,
                        projectMemberships,
                        allowedNetworkZones,
                    },
                    reason: String(input?.reason || '').trim() || null,
                    updatedBy: actor?.email || 'admin',
                }),
            },
        });

        return {
            id: updated.id,
            clientId: updated.clientId,
            displayName: updated.displayName,
            description: updated.description,
            role: updated.role,
            clearanceLevel: updated.clearanceLevel,
            department: updated.department,
            projectMemberships: updated.projectMemberships,
            allowedNetworkZones: updated.allowedNetworkZones,
            updatedAt: updated.updatedAt.toISOString(),
        };
    }

    async listManagedCredentials(filters?: { search?: string; status?: string }) {
        await this.expireManagedCredentials();

        const normalizedSearch = String(filters?.search || '').trim();
        const status = this.parseManagedCredentialStatus(filters?.status);

        const credentials = await this.prisma.managedCredential.findMany({
            where: {
                ...(status ? { status } : {}),
                ...(normalizedSearch
                    ? {
                        OR: [
                            { displayName: { contains: normalizedSearch, mode: 'insensitive' } },
                            { deviceId: { contains: normalizedSearch, mode: 'insensitive' } },
                            { deviceLabel: { contains: normalizedSearch, mode: 'insensitive' } },
                            { locationLabel: { contains: normalizedSearch, mode: 'insensitive' } },
                            { locationCode: { contains: normalizedSearch, mode: 'insensitive' } },
                            { assignedUser: { email: { contains: normalizedSearch, mode: 'insensitive' } } },
                            { assignedUser: { department: { contains: normalizedSearch, mode: 'insensitive' } } },
                        ],
                    }
                    : {}),
            },
            include: {
                assignedUser: {
                    select: {
                        id: true,
                        email: true,
                        employeeId: true,
                        department: true,
                        clearanceLevel: true,
                        role: true,
                        isActive: true,
                    },
                },
                issuedByUser: {
                    select: { email: true },
                },
                revokedByUser: {
                    select: { email: true },
                },
            },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            take: 200,
        });

        return credentials.map((credential) => ({
            id: credential.id,
            displayName: credential.displayName,
            status: credential.status,
            assignedUser: {
                id: credential.assignedUser.id,
                email: credential.assignedUser.email,
                employeeId: credential.assignedUser.employeeId,
                department: credential.assignedUser.department,
                clearanceLevel: credential.assignedUser.clearanceLevel,
                role: credential.assignedUser.role,
                isActive: credential.assignedUser.isActive,
            },
            deviceId: credential.deviceId,
            deviceLabel: credential.deviceLabel,
            deviceKeyAlgorithm: credential.deviceKeyAlgorithm,
            devicePublicKeyHash: credential.devicePublicKeyHash,
            networkZone: credential.networkZone,
            locationLabel: credential.locationLabel,
            locationCode: credential.locationCode,
            issuedReason: credential.issuedReason,
            revokedReason: credential.revokedReason,
            expiresAt: credential.expiresAt?.toISOString() || null,
            lastUsedAt: credential.lastUsedAt?.toISOString() || null,
            issuedBy: credential.issuedByUser?.email || null,
            revokedBy: credential.revokedByUser?.email || null,
            createdAt: credential.createdAt.toISOString(),
            updatedAt: credential.updatedAt.toISOString(),
        }));
    }

    async createManagedCredential(
        input: {
            displayName: string;
            assignedUserId: string;
            deviceId: string;
            deviceLabel?: string;
            deviceKeyAlgorithm: string;
            devicePublicKey: string;
            networkZone: string;
            locationLabel?: string;
            locationCode?: string;
            expiresAt?: string | null;
            reason?: string;
        },
        actor?: AdminActor,
    ) {
        await this.expireManagedCredentials();

        const displayName = String(input?.displayName || '').trim();
        const assignedUserId = String(input?.assignedUserId || '').trim();
        const deviceId = String(input?.deviceId || '').trim();
        if (!displayName) {
            throw new BadRequestException('displayName is required');
        }
        if (!assignedUserId) {
            throw new BadRequestException('assignedUserId is required');
        }
        if (!deviceId) {
            throw new BadRequestException('deviceId is required');
        }

        const assignedUser = await this.prisma.user.findUnique({
            where: { id: assignedUserId },
            select: {
                id: true,
                email: true,
                isActive: true,
                department: true,
                clearanceLevel: true,
                role: true,
            },
        });
        if (!assignedUser) {
            throw new BadRequestException('Assigned user not found');
        }
        if (!assignedUser.isActive) {
            throw new BadRequestException('Assigned user is inactive');
        }

        const deviceKeyAlgorithm = this.normalizeManagedCredentialDeviceKeyAlgorithm(input?.deviceKeyAlgorithm);
        const publicKey = this.normalizeManagedCredentialPublicKey(input?.devicePublicKey);
        const networkZone = this.parseNetworkZone(input?.networkZone);
        const expiresAt = this.parseOptionalDate(input?.expiresAt);
        if (expiresAt && expiresAt.getTime() <= Date.now()) {
            throw new BadRequestException('expiresAt must be in the future');
        }

        const existingActive = await this.prisma.managedCredential.findFirst({
            where: {
                assignedUserId,
                deviceId,
                networkZone,
                status: 'ACTIVE',
            },
            select: { id: true },
        });
        if (existingActive) {
            throw new BadRequestException('An active managed credential already exists for this person, device, and network zone');
        }

        const created = await this.prisma.managedCredential.create({
            data: {
                displayName,
                assignedUserId,
                deviceId,
                deviceLabel: String(input?.deviceLabel || '').trim() || null,
                deviceKeyAlgorithm,
                devicePublicKey: publicKey.base64,
                devicePublicKeyHash: publicKey.hashHex,
                networkZone,
                locationLabel: String(input?.locationLabel || '').trim() || null,
                locationCode: String(input?.locationCode || '').trim() || null,
                issuedReason: String(input?.reason || '').trim() || null,
                expiresAt,
                issuedByUserId: actor?.id || null,
                metadata: toInputJsonValue({
                    source: 'credentials_console',
                    assignedUserDepartment: assignedUser.department || null,
                    assignedUserClearance: assignedUser.clearanceLevel,
                }),
            },
            include: {
                assignedUser: {
                    select: {
                        id: true,
                        email: true,
                        employeeId: true,
                        department: true,
                        clearanceLevel: true,
                        role: true,
                        isActive: true,
                    },
                },
                issuedByUser: {
                    select: { email: true },
                },
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'MANAGED_CREDENTIAL_CREATED',
                resource: 'MANAGED_CREDENTIAL',
                resourceId: created.id,
                details: toInputJsonValue({
                    displayName: created.displayName,
                    assignedUser: created.assignedUser.email,
                    deviceId: created.deviceId,
                    deviceLabel: created.deviceLabel,
                    devicePublicKeyHash: created.devicePublicKeyHash,
                    networkZone: created.networkZone,
                    locationLabel: created.locationLabel,
                    locationCode: created.locationCode,
                    expiresAt: created.expiresAt?.toISOString() || null,
                    issuedBy: actor?.email || 'admin',
                }),
            },
        });

        return {
            id: created.id,
            displayName: created.displayName,
            status: created.status,
            assignedUser: created.assignedUser,
            deviceId: created.deviceId,
            deviceLabel: created.deviceLabel,
            deviceKeyAlgorithm: created.deviceKeyAlgorithm,
            devicePublicKeyHash: created.devicePublicKeyHash,
            networkZone: created.networkZone,
            locationLabel: created.locationLabel,
            locationCode: created.locationCode,
            issuedReason: created.issuedReason,
            expiresAt: created.expiresAt?.toISOString() || null,
            createdAt: created.createdAt.toISOString(),
            issuedBy: created.issuedByUser?.email || actor?.email || null,
        };
    }

    async updateManagedCredential(
        id: string,
        input: {
            displayName?: string;
            deviceLabel?: string | null;
            networkZone?: string;
            locationLabel?: string | null;
            locationCode?: string | null;
            expiresAt?: string | null;
            reason?: string;
        },
        actor?: AdminActor,
    ) {
        await this.expireManagedCredentials();

        const existing = await this.prisma.managedCredential.findUnique({
            where: { id },
            include: {
                assignedUser: {
                    select: { email: true },
                },
            },
        });
        if (!existing) {
            throw new BadRequestException('Managed credential not found');
        }
        if (existing.status !== 'ACTIVE') {
            throw new BadRequestException('Only active managed credentials can be updated');
        }

        const expiresAt = input?.expiresAt === undefined ? existing.expiresAt : this.parseOptionalDate(input.expiresAt);
        if (expiresAt && expiresAt.getTime() <= Date.now()) {
            throw new BadRequestException('expiresAt must be in the future');
        }

        const updated = await this.prisma.managedCredential.update({
            where: { id },
            data: {
                displayName: input?.displayName !== undefined ? String(input.displayName || '').trim() || existing.displayName : undefined,
                deviceLabel: input?.deviceLabel !== undefined ? String(input.deviceLabel || '').trim() || null : undefined,
                networkZone: input?.networkZone !== undefined ? this.parseNetworkZone(input.networkZone) : undefined,
                locationLabel: input?.locationLabel !== undefined ? String(input.locationLabel || '').trim() || null : undefined,
                locationCode: input?.locationCode !== undefined ? String(input.locationCode || '').trim() || null : undefined,
                expiresAt: input?.expiresAt !== undefined ? expiresAt : undefined,
                metadata: toInputJsonValue({
                    ...parseJsonObject(existing.metadata),
                    lastUpdatedReason: String(input?.reason || '').trim() || null,
                    lastUpdatedBy: actor?.email || 'admin',
                    lastUpdatedAt: new Date().toISOString(),
                }),
            },
            include: {
                assignedUser: {
                    select: {
                        id: true,
                        email: true,
                        employeeId: true,
                        department: true,
                        clearanceLevel: true,
                        role: true,
                        isActive: true,
                    },
                },
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'MANAGED_CREDENTIAL_UPDATED',
                resource: 'MANAGED_CREDENTIAL',
                resourceId: updated.id,
                details: toInputJsonValue({
                    displayName: updated.displayName,
                    assignedUser: existing.assignedUser.email,
                    deviceId: updated.deviceId,
                    networkZone: updated.networkZone,
                    locationLabel: updated.locationLabel,
                    locationCode: updated.locationCode,
                    expiresAt: updated.expiresAt?.toISOString() || null,
                    reason: String(input?.reason || '').trim() || null,
                    updatedBy: actor?.email || 'admin',
                }),
            },
        });

        return {
            id: updated.id,
            displayName: updated.displayName,
            status: updated.status,
            assignedUser: updated.assignedUser,
            deviceId: updated.deviceId,
            deviceLabel: updated.deviceLabel,
            deviceKeyAlgorithm: updated.deviceKeyAlgorithm,
            devicePublicKeyHash: updated.devicePublicKeyHash,
            networkZone: updated.networkZone,
            locationLabel: updated.locationLabel,
            locationCode: updated.locationCode,
            expiresAt: updated.expiresAt?.toISOString() || null,
            updatedAt: updated.updatedAt.toISOString(),
        };
    }

    async revokeManagedCredential(id: string, reason?: string, actor?: AdminActor) {
        await this.expireManagedCredentials();

        const existing = await this.prisma.managedCredential.findUnique({
            where: { id },
            include: {
                assignedUser: {
                    select: { email: true },
                },
            },
        });
        if (!existing) {
            throw new BadRequestException('Managed credential not found');
        }
        if (existing.status === 'REVOKED') {
            return {
                id: existing.id,
                status: existing.status,
                revokedReason: existing.revokedReason,
                updatedAt: existing.updatedAt.toISOString(),
            };
        }

        const revoked = await this.prisma.managedCredential.update({
            where: { id },
            data: {
                status: 'REVOKED',
                revokedReason: String(reason || '').trim() || 'Revoked from Credentials Console',
                revokedByUserId: actor?.id || null,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                userId: actor?.id || null,
                action: 'MANAGED_CREDENTIAL_REVOKED',
                resource: 'MANAGED_CREDENTIAL',
                resourceId: revoked.id,
                details: toInputJsonValue({
                    displayName: revoked.displayName,
                    assignedUser: existing.assignedUser.email,
                    deviceId: revoked.deviceId,
                    networkZone: revoked.networkZone,
                    revokedReason: revoked.revokedReason,
                    revokedBy: actor?.email || 'admin',
                }),
            },
        });

        return {
            id: revoked.id,
            status: revoked.status,
            revokedReason: revoked.revokedReason,
            updatedAt: revoked.updatedAt.toISOString(),
        };
    }
}
