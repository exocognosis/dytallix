import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VaultService } from '../vault/vault.service';
import { getMlKemByAlgorithm, ML_KEM_1024_ALGORITHM, normalizeKemAlgorithmName } from '../crypto/mlkem';
import { getMlDsa65, ML_DSA_65_ALGORITHM } from '../crypto/mldsa';
import { getSlhDsaShake128s, SLH_DSA_SHAKE_128S_ALGORITHM } from '../crypto/slhdsa';

@Injectable()
export class AnchorsService {
  constructor(
    private prisma: PrismaService,
    private vaultService: VaultService,
  ) { }

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
    const normalizedAlgorithm = normalizeKemAlgorithmName(algorithm, algorithm || ML_KEM_1024_ALGORITHM);

    // Generate PQC keypair in Vault
    const keyId = `anchor-${Date.now()}`;
    const publicKeyPath = `quantumvault/anchors/${keyId}/public`;
    const privateKeyPath = `quantumvault/anchors/${keyId}/private`;

    let publicKey: Uint8Array;
    let secretKey: Uint8Array;

    if (normalizedAlgorithm.includes('ML-KEM')) {
      const kem = await getMlKemByAlgorithm(normalizedAlgorithm);
      const kp = await kem.generateKeyPair();
      publicKey = kp.publicKey;
      secretKey = kp.secretKey;
    } else if (algorithm === ML_DSA_65_ALGORITHM) {
      const sig = await getMlDsa65();
      const kp = await sig.generateKeyPair();
      publicKey = kp.publicKey;
      secretKey = kp.secretKey;
    } else if (algorithm === SLH_DSA_SHAKE_128S_ALGORITHM) {
      const sig = await getSlhDsaShake128s();
      const kp = await sig.generateKeyPair();
      publicKey = kp.publicKey;
      secretKey = kp.secretKey;
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    await this.vaultService.write(publicKeyPath, {
      key: Buffer.from(publicKey).toString('base64'),
      algorithm: normalizedAlgorithm,
    });
    await this.vaultService.write(privateKeyPath, {
      key: Buffer.from(secretKey).toString('base64'),
      algorithm: normalizedAlgorithm,
    });

    return this.prisma.anchor.create({
      data: {
        name,
        algorithm: normalizedAlgorithm,
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
