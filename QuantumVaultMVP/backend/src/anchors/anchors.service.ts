import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';

@Injectable()
export class AnchorsService {
  constructor(
    private prisma: PrismaService,
    private vaultService: VaultService,
  ) {}

  async getAnchors() {
    return this.prisma.anchor.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { wrappingResults: true, attestations: true },
        },
      },
    });
  }

  async getAnchor(id: string) {
    return this.prisma.anchor.findUnique({
      where: { id },
      include: {
        wrappingResults: { take: 10, orderBy: { wrappedAt: 'desc' } },
        attestations: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async createAnchor(name: string, algorithm: string = 'Kyber1024') {
    // Generate PQC keypair in Vault
    const keyId = `anchor-${Date.now()}`;
    const publicKeyPath = `quantumvault/anchors/${keyId}/public`;
    const privateKeyPath = `quantumvault/anchors/${keyId}/private`;

    // For MVP, we generate placeholder keys
    // In production, this would use real PQC key generation
    const publicKey = await this.vaultService.generateKey(algorithm, 1568); // Kyber1024 public key size
    const privateKey = await this.vaultService.generateKey(algorithm, 3168); // Kyber1024 private key size

    await this.vaultService.write(publicKeyPath, { key: publicKey, algorithm });
    await this.vaultService.write(privateKeyPath, { key: privateKey, algorithm });

    return this.prisma.anchor.create({
      data: {
        name,
        algorithm,
        vaultKeyPath: publicKeyPath,
        vaultPrivKeyPath: privateKeyPath,
        isActive: true,
      },
    });
  }

  async rotateAnchor(id: string) {
    const oldAnchor = await this.prisma.anchor.findUnique({ where: { id } });
    if (!oldAnchor) throw new Error('Anchor not found');

    // Deactivate old anchor
    await this.prisma.anchor.update({
      where: { id },
      data: {
        isActive: false,
        rotatedAt: new Date(),
      },
    });

    // Create new anchor
    return this.createAnchor(`${oldAnchor.name} (rotated)`, oldAnchor.algorithm);
  }

  async activateAnchor(id: string) {
    return this.prisma.anchor.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
