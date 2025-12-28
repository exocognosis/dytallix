import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';
import { getMlKem1024, ML_KEM_1024_ALGORITHM } from '../crypto/mlkem';

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

  async createAnchor(name: string, algorithm: string = ML_KEM_1024_ALGORITHM) {
    // Generate PQC keypair in Vault
    const keyId = `anchor-${Date.now()}`;
    const publicKeyPath = `quantumvault/anchors/${keyId}/public`;
    const privateKeyPath = `quantumvault/anchors/${keyId}/private`;

    const kem = await getMlKem1024();
    const { publicKey, secretKey } = await kem.generateKeyPair();

    await this.vaultService.write(publicKeyPath, {
      key: Buffer.from(publicKey).toString('base64'),
      algorithm,
    });
    await this.vaultService.write(privateKeyPath, {
      key: Buffer.from(secretKey).toString('base64'),
      algorithm,
    });

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
