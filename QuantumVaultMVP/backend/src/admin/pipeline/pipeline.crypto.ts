import * as crypto from 'crypto';
import { canonicalJsonBuffer, canonicalJsonSha256Hex } from '../../crypto/canonical-json';
import {
    deriveAes256Key,
    getMlKemByAlgorithm,
    MlKem,
} from '../../crypto/mlkem';
import { getMlDsa65, ML_DSA_65_ALGORITHM } from '../../crypto/mldsa';
import { getSlhDsaShake128s, SLH_DSA_SHAKE_128S_ALGORITHM } from '../../crypto/slhdsa';
import { PrismaService } from '../../database/prisma.service';
import { VaultService } from '../../vault/vault.service';
import { normalizeKemAlgorithm, normalizeSignatureAlgorithm } from '../admin.algorithms';
import { SignatureAnchorRecord } from '../admin.types';

export type KemAnchorRecord = {
    id: string;
    algorithm: string;
    vaultKeyPath: string;
};

export class PipelineCryptoHelper {
    constructor(
        private readonly prisma: PrismaService,
        private readonly vaultService: VaultService,
    ) { }

    async resolveActiveKemAnchor(kemAlgorithm: string): Promise<KemAnchorRecord | null> {
        const normalized = normalizeKemAlgorithm(kemAlgorithm);
        const activeAnchors = await this.prisma.anchor.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                algorithm: true,
                vaultKeyPath: true,
            },
        });

        return activeAnchors.find((anchor) => {
            const anchorAlgorithm = normalizeKemAlgorithm(anchor.algorithm, normalized);
            return anchorAlgorithm === normalized;
        }) || null;
    }

    async resolveSignatureAnchors(algorithms: string[]): Promise<Map<string, SignatureAnchorRecord>> {
        const anchors = new Map<string, SignatureAnchorRecord>();
        const activeAnchors = await this.prisma.anchor.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                algorithm: true,
                vaultPrivKeyPath: true,
            },
        });

        for (const algorithm of algorithms) {
            const normalizedAlgorithm = normalizeSignatureAlgorithm(algorithm) || String(algorithm || '').trim().toUpperCase();
            const anchor = activeAnchors.find((candidate) => {
                const normalizedCandidate = normalizeSignatureAlgorithm(candidate.algorithm);
                if (normalizedCandidate) {
                    return normalizedCandidate === normalizedAlgorithm;
                }
                return String(candidate.algorithm || '').trim().toUpperCase() === normalizedAlgorithm;
            });

            if (anchor) {
                anchors.set(algorithm, {
                    id: anchor.id,
                    name: anchor.name,
                    algorithm: anchor.algorithm,
                    vaultPrivKeyPath: anchor.vaultPrivKeyPath,
                });
            }
        }
        return anchors;
    }

    async loadAnchorPublicKey(
        anchor: KemAnchorRecord,
        cache: Map<string, Buffer>,
    ): Promise<Buffer> {
        let publicKey = cache.get(anchor.id);
        if (publicKey) {
            return publicKey;
        }

        const publicKeyRecord: any = await this.vaultService.read(anchor.vaultKeyPath);
        const publicKeyB64 = publicKeyRecord?.data?.key || publicKeyRecord?.key;
        if (!publicKeyB64) {
            throw new Error(`Invalid public key payload at ${anchor.vaultKeyPath}`);
        }

        publicKey = Buffer.from(publicKeyB64, 'base64');
        cache.set(anchor.id, publicKey);
        return publicKey;
    }

    async loadKem(algorithm: string, cache: Map<string, MlKem>): Promise<MlKem> {
        let kem = cache.get(algorithm);
        if (kem) {
            return kem;
        }

        kem = await getMlKemByAlgorithm(algorithm);
        cache.set(algorithm, kem);
        return kem;
    }

    async signDigestForPolicy(
        digestHex: string,
        signatureAlgorithms: string[],
        signatureAnchors: Map<string, SignatureAnchorRecord>,
    ): Promise<Array<{ algorithm: string; anchorId: string; anchorName: string; signature: string }>> {
        const signatures: Array<{ algorithm: string; anchorId: string; anchorName: string; signature: string }> = [];

        for (const algorithm of signatureAlgorithms) {
            const anchor = signatureAnchors.get(algorithm);
            if (!anchor) {
                throw new Error(`Missing active anchor for signature algorithm ${algorithm}`);
            }

            const privateKeyRecord: any = await this.vaultService.read(anchor.vaultPrivKeyPath);
            const privateKeyB64 = privateKeyRecord?.data?.key || privateKeyRecord?.key;
            if (!privateKeyB64) {
                throw new Error(`Invalid private key payload at ${anchor.vaultPrivKeyPath}`);
            }

            const signature = await this.signDigestWithAlgorithm(
                digestHex,
                algorithm,
                new Uint8Array(Buffer.from(privateKeyB64, 'base64')),
            );

            signatures.push({
                algorithm,
                anchorId: anchor.id,
                anchorName: anchor.name,
                signature,
            });
        }

        return signatures;
    }

    async encryptBuffer(
        buffer: Buffer,
        kem: MlKem,
        anchorPublicKey: Buffer,
        aadContext: Record<string, unknown>,
        kemAlgorithm: string,
    ) {
        const publicKeyArray = new Uint8Array(anchorPublicKey);
        const { ciphertext: kemCiphertext, sharedSecret } = await kem.encapsulate(publicKeyArray);
        const salt = crypto.randomBytes(32);
        const symmetricKey = deriveAes256Key(sharedSecret, salt, kemAlgorithm);
        const nonce = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', symmetricKey, nonce);
        cipher.setAAD(canonicalJsonBuffer(aadContext));
        const aeadCiphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
        const aeadTag = cipher.getAuthTag();
        return {
            kemCiphertext,
            salt,
            nonce,
            aeadCiphertext,
            aeadTag,
            aadSha256: canonicalJsonSha256Hex(aadContext),
        };
    }

    private async signDigestWithAlgorithm(
        digestHex: string,
        algorithm: string,
        privateKeyBytes: Uint8Array,
    ): Promise<string> {
        const messageBytes = new Uint8Array(Buffer.from(digestHex, 'hex'));

        if (algorithm === ML_DSA_65_ALGORITHM) {
            const signer = await getMlDsa65();
            const signature = await signer.sign(messageBytes, privateKeyBytes);
            return Buffer.from(signature).toString('base64');
        }

        if (algorithm === SLH_DSA_SHAKE_128S_ALGORITHM) {
            const signer = await getSlhDsaShake128s();
            const signature = await signer.sign(messageBytes, privateKeyBytes);
            return Buffer.from(signature).toString('base64');
        }

        throw new Error(`Unsupported signature algorithm: ${algorithm}`);
    }
}
