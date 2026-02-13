import { Injectable, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { VaultService } from '../vault/vault.service';
import { getMlDsa65, ML_DSA_65_ALGORITHM, MlDsa65, MlDsaKeyPair } from '../crypto/mldsa';
import { getMlKem1024, ML_KEM_1024_ALGORITHM, MlKem1024, MlKemKeyPair } from '../crypto/mlkem';
import { canonicalJsonBuffer, canonicalJsonSha256Hex } from '../crypto/canonical-json';

const TRANSPORT_PROTOCOL_VERSION = 'qv.transport.v1';
const NONCE_REPLAY_WINDOW_LIMIT = 2048;

type TransportKemKeyRecord = {
    algorithm: string;
    publicKey: string; // base64
    secretKey: string; // base64
    createdAt: string;
};

type TransportIdentityKeyRecord = {
    algorithm: string;
    publicKey: string; // base64
    secretKey: string; // base64
    createdAt: string;
};

type TransportSessionRecord = {
    algorithm: string;
    kemAlgorithm: string;
    identityAlgorithm: string;
    sessionKey: string; // base64
    salt: string; // base64
    createdAt: string;
    expiresAt: string;
    scope?: {
        cryptoDomain?: string;
        region?: string;
        regulatoryDomain?: string;
        tenantId?: string;
    };
    inboundNonceDigests?: string[];
    nextInboundCounter?: number;
    nextOutboundCounter?: number;
    lastActivityAt?: string;
};

@Injectable()
export class TransportService implements OnModuleInit {
    private kem: MlKem1024;
    private sig: MlDsa65;

    private kemKeys?: MlKemKeyPair;
    private identityKeys?: MlDsaKeyPair;

    private readonly kemVaultPath = 'quantumvault/system/transport-kem';
    private readonly identityVaultPath = 'quantumvault/system/transport-identity';
    private readonly sessionsVaultPrefix = 'quantumvault/transport/sessions';

    constructor(private vaultService: VaultService) { }

    async onModuleInit() {
        this.kem = await getMlKem1024();
        this.sig = await getMlDsa65();
        await this.ensureTransportKeys();
    }

    private async ensureTransportKeys() {
        // KEM keys
        try {
            const stored = (await this.vaultService.read(this.kemVaultPath)) as TransportKemKeyRecord;
            if (stored?.publicKey && stored?.secretKey) {
                this.kemKeys = {
                    publicKey: Buffer.from(stored.publicKey, 'base64'),
                    secretKey: Buffer.from(stored.secretKey, 'base64'),
                };
            } else {
                throw new Error('missing_transport_kem_keys');
            }
        } catch {
            const kp = await this.kem.generateKeyPair();
            await this.vaultService.write(this.kemVaultPath, {
                algorithm: ML_KEM_1024_ALGORITHM,
                publicKey: Buffer.from(kp.publicKey).toString('base64'),
                secretKey: Buffer.from(kp.secretKey).toString('base64'),
                createdAt: new Date().toISOString(),
            } satisfies TransportKemKeyRecord);
            this.kemKeys = kp;
        }

        // Identity keys (for signing server info / handshakes)
        try {
            const stored = (await this.vaultService.read(this.identityVaultPath)) as TransportIdentityKeyRecord;
            if (stored?.publicKey && stored?.secretKey) {
                this.identityKeys = {
                    publicKey: Buffer.from(stored.publicKey, 'base64'),
                    secretKey: Buffer.from(stored.secretKey, 'base64'),
                };
            } else {
                throw new Error('missing_transport_identity_keys');
            }
        } catch {
            const kp = await this.sig.generateKeyPair();
            await this.vaultService.write(this.identityVaultPath, {
                algorithm: ML_DSA_65_ALGORITHM,
                publicKey: Buffer.from(kp.publicKey).toString('base64'),
                secretKey: Buffer.from(kp.secretKey).toString('base64'),
                createdAt: new Date().toISOString(),
            } satisfies TransportIdentityKeyRecord);
            this.identityKeys = kp;
        }
    }

    async rotateTransportKeys(): Promise<{ kemAlgorithm: string; identityAlgorithm: string; rotatedAt: string }> {
        const kemKp = await this.kem.generateKeyPair();
        const sigKp = await this.sig.generateKeyPair();
        const rotatedAt = new Date().toISOString();

        await this.vaultService.write(this.kemVaultPath, {
            algorithm: ML_KEM_1024_ALGORITHM,
            publicKey: Buffer.from(kemKp.publicKey).toString('base64'),
            secretKey: Buffer.from(kemKp.secretKey).toString('base64'),
            createdAt: rotatedAt,
        } satisfies TransportKemKeyRecord);

        await this.vaultService.write(this.identityVaultPath, {
            algorithm: ML_DSA_65_ALGORITHM,
            publicKey: Buffer.from(sigKp.publicKey).toString('base64'),
            secretKey: Buffer.from(sigKp.secretKey).toString('base64'),
            createdAt: rotatedAt,
        } satisfies TransportIdentityKeyRecord);

        this.kemKeys = kemKp;
        this.identityKeys = sigKp;

        return { kemAlgorithm: ML_KEM_1024_ALGORITHM, identityAlgorithm: ML_DSA_65_ALGORITHM, rotatedAt };
    }

    private deriveSessionKey(sharedSecret: Uint8Array, salt: Uint8Array): Buffer {
        const info = Buffer.from('QuantumVaultMVP:transport:v1:ML-KEM-1024', 'utf8');
        return Buffer.from(
            crypto.hkdfSync('sha256', Buffer.from(sharedSecret), Buffer.from(salt), info, 32),
        );
    }

    private sessionPath(sessionId: string): string {
        const normalized = sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
        if (!normalized) {
            throw new Error('Invalid sessionId');
        }
        return `${this.sessionsVaultPrefix}/${normalized}`;
    }

    private hashNonceForReplayWindow(nonce: Buffer): string {
        return crypto.createHash('sha256').update(nonce).digest('hex');
    }

    private buildTransportAad(params: {
        sessionId: string;
        direction: 'client_request' | 'server_response' | 'server_ack';
        counter: number;
        session: TransportSessionRecord;
    }): Buffer {
        const aadContext = {
            protocolVersion: TRANSPORT_PROTOCOL_VERSION,
            sessionId: params.sessionId,
            direction: params.direction,
            counter: params.counter,
            algorithm: params.session.algorithm,
            kemAlgorithm: params.session.kemAlgorithm,
            identityAlgorithm: params.session.identityAlgorithm,
            scope: params.session.scope || null,
        };
        return canonicalJsonBuffer(aadContext);
    }

    private nextInboundCounter(session: TransportSessionRecord): number {
        const value = session.nextInboundCounter;
        return Number.isSafeInteger(value) && value! >= 1 ? value! : 1;
    }

    private nextOutboundCounter(session: TransportSessionRecord): number {
        const value = session.nextOutboundCounter;
        return Number.isSafeInteger(value) && value! >= 1 ? value! : 1;
    }

    private inboundReplayWindow(session: TransportSessionRecord): string[] {
        return Array.isArray(session.inboundNonceDigests) ? session.inboundNonceDigests : [];
    }

    private async persistSession(sessionId: string, session: TransportSessionRecord): Promise<void> {
        await this.vaultService.write(this.sessionPath(sessionId), session);
    }

    async getPqcServerInfo(): Promise<{
        kemAlgorithm: string;
        kemPublicKey: string;
        identityAlgorithm: string;
        identityPublicKey: string;
        issuedAt: string;
        signature: string;
    }> {
        if (!this.kemKeys || !this.identityKeys) {
            await this.ensureTransportKeys();
        }

        const issuedAt = new Date().toISOString();
        const payload = {
            kemAlgorithm: ML_KEM_1024_ALGORITHM,
            kemPublicKey: Buffer.from(this.kemKeys!.publicKey).toString('base64'),
            identityAlgorithm: ML_DSA_65_ALGORITHM,
            identityPublicKey: Buffer.from(this.identityKeys!.publicKey).toString('base64'),
            issuedAt,
        };

        const message = Buffer.from(JSON.stringify(payload), 'utf8');
        const signature = await this.sig.sign(new Uint8Array(message), this.identityKeys!.secretKey);

        return {
            ...payload,
            signature: Buffer.from(signature).toString('base64'),
        };
    }

    async startPqcSession(body: {
        kemCiphertextB64: string;
        saltB64: string;
        ttlSeconds?: number;
        scope?: TransportSessionRecord['scope'];
    }): Promise<{
        sessionId: string;
        expiresAt: string;
        ack: {
            counter: number;
            aadSha256: string;
            nonceB64: string;
            ciphertextB64: string;
            tagB64: string;
        };
    }> {
        if (!this.kemKeys || !this.identityKeys) {
            await this.ensureTransportKeys();
        }

        const kemCiphertext = Buffer.from(body.kemCiphertextB64, 'base64');
        const salt = Buffer.from(body.saltB64, 'base64');
        if (salt.length < 16) {
            throw new Error('Salt must be at least 16 bytes');
        }

        const sharedSecret = await this.kem.decapsulate(new Uint8Array(kemCiphertext), this.kemKeys!.secretKey);
        const sessionKey = this.deriveSessionKey(sharedSecret, salt);

        const ttlSeconds = Math.max(30, Math.min(24 * 60 * 60, body.ttlSeconds ?? 10 * 60)); // 30s .. 24h
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);

        const sessionId = crypto.randomBytes(32).toString('base64url');

        const record: TransportSessionRecord = {
            algorithm: 'AES-256-GCM',
            kemAlgorithm: ML_KEM_1024_ALGORITHM,
            identityAlgorithm: ML_DSA_65_ALGORITHM,
            sessionKey: sessionKey.toString('base64'),
            salt: salt.toString('base64'),
            createdAt: createdAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            scope: body.scope,
            inboundNonceDigests: [],
            nextInboundCounter: 1,
            nextOutboundCounter: 1,
        };

        await this.vaultService.write(this.sessionPath(sessionId), record);

        // Encrypt an ACK message so the client can confirm both sides derived the same key.
        const ackCounter = 0;
        const ackAadContext = {
            protocolVersion: TRANSPORT_PROTOCOL_VERSION,
            sessionId,
            direction: 'server_ack',
            counter: ackCounter,
            algorithm: record.algorithm,
            kemAlgorithm: record.kemAlgorithm,
            identityAlgorithm: record.identityAlgorithm,
            scope: record.scope || null,
        };
        const ackNonce = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, ackNonce);
        cipher.setAAD(canonicalJsonBuffer(ackAadContext));
        const ackCiphertext = Buffer.concat([cipher.update('ok', 'utf8'), cipher.final()]);
        const ackTag = cipher.getAuthTag();

        return {
            sessionId,
            expiresAt: expiresAt.toISOString(),
            ack: {
                counter: ackCounter,
                aadSha256: canonicalJsonSha256Hex(ackAadContext),
                nonceB64: ackNonce.toString('base64'),
                ciphertextB64: ackCiphertext.toString('base64'),
                tagB64: ackTag.toString('base64'),
            },
        };
    }

    private async loadSession(sessionId: string): Promise<TransportSessionRecord> {
        const record = (await this.vaultService.read(this.sessionPath(sessionId))) as TransportSessionRecord;
        if (!record?.sessionKey || !record?.expiresAt) {
            throw new Error('Session not found');
        }
        if (Date.parse(record.expiresAt) <= Date.now()) {
            // Best-effort cleanup
            await this.vaultService.delete(this.sessionPath(sessionId)).catch(() => undefined);
            throw new Error('Session expired');
        }

        if (!Array.isArray(record.inboundNonceDigests)) {
            record.inboundNonceDigests = [];
        }
        if (!Number.isSafeInteger(record.nextInboundCounter) || (record.nextInboundCounter ?? 0) < 1) {
            record.nextInboundCounter = 1;
        }
        if (!Number.isSafeInteger(record.nextOutboundCounter) || (record.nextOutboundCounter ?? 0) < 1) {
            record.nextOutboundCounter = 1;
        }

        return record;
    }

    async secureEcho(body: {
        sessionId: string;
        counter: number;
        nonceB64: string;
        ciphertextB64: string;
        tagB64: string;
    }) {
        const session = await this.loadSession(body.sessionId);
        const key = Buffer.from(session.sessionKey, 'base64');
        const nonce = Buffer.from(body.nonceB64, 'base64');
        const ciphertext = Buffer.from(body.ciphertextB64, 'base64');
        const tag = Buffer.from(body.tagB64, 'base64');
        const inboundCounter = this.nextInboundCounter(session);

        if (!Number.isSafeInteger(body.counter) || body.counter < 1) {
            throw new Error('Invalid message counter');
        }
        if (body.counter !== inboundCounter) {
            throw new Error(`Unexpected message counter. Expected ${inboundCounter}`);
        }
        if (nonce.length !== 12) {
            throw new Error('Invalid nonce length');
        }
        if (tag.length !== 16) {
            throw new Error('Invalid auth tag length');
        }

        const replayDigest = this.hashNonceForReplayWindow(nonce);
        const replayWindow = this.inboundReplayWindow(session);
        if (replayWindow.includes(replayDigest)) {
            throw new Error('Replay detected');
        }
        const nextReplayWindow = [...replayWindow, replayDigest].slice(-NONCE_REPLAY_WINDOW_LIMIT);

        const requestAad = this.buildTransportAad({
            sessionId: body.sessionId,
            direction: 'client_request',
            counter: inboundCounter,
            session,
        });

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
        decipher.setAuthTag(tag);
        decipher.setAAD(requestAad);

        let plaintext: Buffer;
        try {
            plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        } catch {
            session.inboundNonceDigests = nextReplayWindow;
            session.lastActivityAt = new Date().toISOString();
            await this.persistSession(body.sessionId, session);
            throw new Error('Invalid ciphertext or AAD');
        }

        const outboundCounter = this.nextOutboundCounter(session);
        const responseNonce = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, responseNonce);
        const responseAad = this.buildTransportAad({
            sessionId: body.sessionId,
            direction: 'server_response',
            counter: outboundCounter,
            session,
        });
        cipher.setAAD(responseAad);
        const responseCiphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const responseTag = cipher.getAuthTag();

        session.inboundNonceDigests = nextReplayWindow;
        session.nextInboundCounter = inboundCounter + 1;
        session.nextOutboundCounter = outboundCounter + 1;
        session.lastActivityAt = new Date().toISOString();
        await this.persistSession(body.sessionId, session);

        return {
            requestCounter: inboundCounter,
            requestAadSha256: crypto.createHash('sha256').update(requestAad).digest('hex'),
            plaintextB64: plaintext.toString('base64'),
            response: {
                counter: outboundCounter,
                aadSha256: crypto.createHash('sha256').update(responseAad).digest('hex'),
                nonceB64: responseNonce.toString('base64'),
                ciphertextB64: responseCiphertext.toString('base64'),
                tagB64: responseTag.toString('base64'),
            },
        };
    }

    async closeSession(sessionId: string): Promise<{ closed: boolean }> {
        await this.vaultService.delete(this.sessionPath(sessionId));
        return { closed: true };
    }

    getSessions() {
        return {
            pqcSessions: 847,
            hybridTunnels: 156,
            protectedTraffic: 94.5,
            vulnerableTraffic: 5.5,
        };
    }

    getTunnels() {
        return [
            { id: 'tunnel-1', name: 'Primary DC Link', protocol: 'TLS 1.3 + ML-KEM', status: 'active', bandwidth: '10 Gbps' },
            { id: 'tunnel-2', name: 'DR Site Backup', protocol: 'TLS 1.3 + ML-KEM', status: 'active', bandwidth: '5 Gbps' },
            { id: 'tunnel-3', name: 'Partner API Gateway', protocol: 'mTLS + PQC', status: 'active', bandwidth: '1 Gbps' },
            { id: 'tunnel-4', name: 'Cloud Hybrid', protocol: 'IPsec + ML-KEM', status: 'degraded', bandwidth: '2 Gbps' },
        ];
    }

    getTraffic() {
        return [
            { month: 'Jan', protected: 85, vulnerable: 15 },
            { month: 'Feb', protected: 88, vulnerable: 12 },
            { month: 'Mar', protected: 90, vulnerable: 10 },
            { month: 'Apr', protected: 92, vulnerable: 8 },
            { month: 'May', protected: 93, vulnerable: 7 },
            { month: 'Jun', protected: 94.5, vulnerable: 5.5 },
        ];
    }
}
