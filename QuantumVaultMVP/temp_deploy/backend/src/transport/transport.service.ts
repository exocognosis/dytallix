import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { VaultService } from '../vault/vault.service';
import { getMlDsa65, ML_DSA_65_ALGORITHM, MlDsa65, MlDsaKeyPair } from '../crypto/mldsa';
import { getMlKem1024, ML_KEM_1024_ALGORITHM, MlKem1024, MlKemKeyPair } from '../crypto/mlkem';
import { canonicalJsonBuffer, canonicalJsonSha256Hex } from '../crypto/canonical-json';
import { ConfigService } from '@nestjs/config';

const TRANSPORT_PROTOCOL_VERSION = 'qv.transport.v1';
const NONCE_REPLAY_WINDOW_LIMIT = 2048;

type TransportKemKeyRecord = {
    algorithm: string;
    publicKey: string; // base64
    secretKey: string; // base64
    createdAt: string;
    rotatedAt?: string;
    rotatedFromKeyId?: string;
    rotationCeremonyId?: string;
    rotationReason?: string;
    changeTicket?: string;
    rotatedBy?: string;
};

type TransportIdentityKeyRecord = {
    algorithm: string;
    publicKey: string; // base64
    secretKey: string; // base64
    createdAt: string;
    rotatedAt?: string;
    rotatedFromKeyId?: string;
    rotationCeremonyId?: string;
    rotationReason?: string;
    changeTicket?: string;
    rotatedBy?: string;
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
    private readonly logger = new Logger(TransportService.name);
    private kem: MlKem1024;
    private sig: MlDsa65;

    private kemKeys?: MlKemKeyPair;
    private identityKeys?: MlDsaKeyPair;

    private readonly kemVaultPath = 'quantumvault/system/transport-kem';
    private readonly identityVaultPath = 'quantumvault/system/transport-identity';
    private readonly sessionsVaultPrefix = 'quantumvault/transport/sessions';

    constructor(
        private vaultService: VaultService,
        private configService: ConfigService,
    ) { }

    async onModuleInit() {
        this.kem = await getMlKem1024();
        this.sig = await getMlDsa65();
        await this.ensureTransportKeys();
    }

    private boolEnv(name: string, defaultValue: boolean): boolean {
        const value = this.configService.get<string>(name);
        if (value === undefined) {
            return defaultValue;
        }
        return value.trim().toLowerCase() === 'true';
    }

    private normalizeHex(value?: string): string {
        if (!value) return '';
        const normalized = value.toLowerCase();
        return normalized.startsWith('0x') ? normalized : `0x${normalized}`;
    }

    private isVaultNotFoundError(error: unknown): boolean {
        const message =
            (error as { message?: string })?.message ||
            (error as { response?: { body?: { errors?: string[] } } })?.response?.body?.errors?.join(' ') ||
            '';
        const lower = String(message).toLowerCase();
        return lower.includes('404') || lower.includes('not found') || lower.includes('no value found');
    }

    private ensureReady() {
        if (!this.kem || !this.sig) {
            throw new Error('Transport crypto providers not initialized');
        }
        if (!this.kemKeys || !this.identityKeys) {
            throw new Error('Transport key material not initialized');
        }
    }

    private keyHashHex(publicKey: Uint8Array): string {
        return `0x${crypto.createHash('sha256').update(Buffer.from(publicKey)).digest('hex')}`;
    }

    private kemKeyId(publicKey: Uint8Array): string {
        const digest = this.keyHashHex(publicKey).slice(2);
        return `mlkem1024:${digest.slice(0, 16)}`;
    }

    private identityKeyId(publicKey: Uint8Array): string {
        const digest = this.keyHashHex(publicKey).slice(2);
        return `mldsa65:${digest.slice(0, 16)}`;
    }

    private enforceKeyPinning(): void {
        this.ensureReady();
        const currentKemHash = this.keyHashHex(this.kemKeys!.publicKey);
        const currentIdentityHash = this.keyHashHex(this.identityKeys!.publicKey);
        const currentKemId = this.kemKeyId(this.kemKeys!.publicKey);
        const currentIdentityId = this.identityKeyId(this.identityKeys!.publicKey);

        const pinnedKemHash = this.normalizeHex(this.configService.get<string>('TRANSPORT_KEM_KEY_HASH_PIN'));
        if (pinnedKemHash && pinnedKemHash !== this.normalizeHex(currentKemHash)) {
            throw new Error(
                `Transport KEM key-hash pin mismatch. Expected ${pinnedKemHash}, got ${this.normalizeHex(currentKemHash)}`,
            );
        }

        const pinnedIdentityHash = this.normalizeHex(
            this.configService.get<string>('TRANSPORT_IDENTITY_KEY_HASH_PIN'),
        );
        if (pinnedIdentityHash && pinnedIdentityHash !== this.normalizeHex(currentIdentityHash)) {
            throw new Error(
                `Transport identity key-hash pin mismatch. Expected ${pinnedIdentityHash}, got ${this.normalizeHex(
                    currentIdentityHash,
                )}`,
            );
        }

        const pinnedKemId = this.configService.get<string>('TRANSPORT_KEM_KEY_ID_PIN');
        if (pinnedKemId && pinnedKemId.trim() !== currentKemId) {
            throw new Error(`Transport KEM key-id pin mismatch. Expected ${pinnedKemId.trim()}, got ${currentKemId}`);
        }

        const pinnedIdentityId = this.configService.get<string>('TRANSPORT_IDENTITY_KEY_ID_PIN');
        if (pinnedIdentityId && pinnedIdentityId.trim() !== currentIdentityId) {
            throw new Error(
                `Transport identity key-id pin mismatch. Expected ${pinnedIdentityId.trim()}, got ${currentIdentityId}`,
            );
        }
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
        } catch (error) {
            if (!this.isVaultNotFoundError(error)) {
                throw error;
            }
            const bootstrapDefault = this.configService.get<string>('NODE_ENV') !== 'production';
            const allowBootstrap = this.boolEnv('TRANSPORT_KEYS_BOOTSTRAP_ALLOWED', bootstrapDefault);
            if (!allowBootstrap) {
                throw new Error(
                    'Transport KEM key missing in Vault and bootstrapping is disabled. Run explicit key ceremony.',
                );
            }
            const kp = await this.kem.generateKeyPair();
            await this.vaultService.write(this.kemVaultPath, {
                algorithm: ML_KEM_1024_ALGORITHM,
                publicKey: Buffer.from(kp.publicKey).toString('base64'),
                secretKey: Buffer.from(kp.secretKey).toString('base64'),
                createdAt: new Date().toISOString(),
                rotationReason: 'bootstrap',
            } satisfies TransportKemKeyRecord);
            this.kemKeys = kp;
            this.logger.warn(`⚠️  Bootstrapped transport KEM key (${this.kemKeyId(kp.publicKey)})`);
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
        } catch (error) {
            if (!this.isVaultNotFoundError(error)) {
                throw error;
            }
            const bootstrapDefault = this.configService.get<string>('NODE_ENV') !== 'production';
            const allowBootstrap = this.boolEnv('TRANSPORT_KEYS_BOOTSTRAP_ALLOWED', bootstrapDefault);
            if (!allowBootstrap) {
                throw new Error(
                    'Transport identity key missing in Vault and bootstrapping is disabled. Run explicit key ceremony.',
                );
            }
            const kp = await this.sig.generateKeyPair();
            await this.vaultService.write(this.identityVaultPath, {
                algorithm: ML_DSA_65_ALGORITHM,
                publicKey: Buffer.from(kp.publicKey).toString('base64'),
                secretKey: Buffer.from(kp.secretKey).toString('base64'),
                createdAt: new Date().toISOString(),
                rotationReason: 'bootstrap',
            } satisfies TransportIdentityKeyRecord);
            this.identityKeys = kp;
            this.logger.warn(`⚠️  Bootstrapped transport identity key (${this.identityKeyId(kp.publicKey)})`);
        }

        this.enforceKeyPinning();
    }

    async rotateTransportKeys(options?: {
        reason?: string;
        changeTicket?: string;
        requestedBy?: string;
        expectedPriorKemKeyId?: string;
        expectedPriorIdentityKeyId?: string;
        runRecoveryTest?: boolean;
    }): Promise<{
        ceremonyId: string;
        kemAlgorithm: string;
        identityAlgorithm: string;
        rotatedAt: string;
        previousKemKeyId: string;
        previousIdentityKeyId: string;
        currentKemKeyId: string;
        currentIdentityKeyId: string;
        recoveryTest?: {
            passed: boolean;
            kemDecapsulationMatch: boolean;
            identitySignatureValid: boolean;
            kemKeyId: string;
            identityKeyId: string;
            challengeHash: string;
        } | { passed: true; skipped: true };
    }> {
        this.ensureReady();
        const priorKemKeyId = this.kemKeyId(this.kemKeys!.publicKey);
        const priorIdentityKeyId = this.identityKeyId(this.identityKeys!.publicKey);
        const expectedKem = options?.expectedPriorKemKeyId?.trim();
        const expectedIdentity = options?.expectedPriorIdentityKeyId?.trim();

        if (expectedKem && expectedKem !== priorKemKeyId) {
            throw new Error(`Refusing transport rotation: expected prior KEM key ${expectedKem}, got ${priorKemKeyId}`);
        }
        if (expectedIdentity && expectedIdentity !== priorIdentityKeyId) {
            throw new Error(
                `Refusing transport rotation: expected prior identity key ${expectedIdentity}, got ${priorIdentityKeyId}`,
            );
        }

        const ceremonyId = crypto.randomUUID();
        const kemKp = await this.kem.generateKeyPair();
        const sigKp = await this.sig.generateKeyPair();
        const rotatedAt = new Date().toISOString();

        await this.vaultService.write(this.kemVaultPath, {
            algorithm: ML_KEM_1024_ALGORITHM,
            publicKey: Buffer.from(kemKp.publicKey).toString('base64'),
            secretKey: Buffer.from(kemKp.secretKey).toString('base64'),
            createdAt: rotatedAt,
            rotatedAt,
            rotatedFromKeyId: priorKemKeyId,
            rotationCeremonyId: ceremonyId,
            rotationReason: options?.reason || 'scheduled_rotation',
            changeTicket: options?.changeTicket || null,
            rotatedBy: options?.requestedBy || 'system',
        } satisfies TransportKemKeyRecord);

        await this.vaultService.write(this.identityVaultPath, {
            algorithm: ML_DSA_65_ALGORITHM,
            publicKey: Buffer.from(sigKp.publicKey).toString('base64'),
            secretKey: Buffer.from(sigKp.secretKey).toString('base64'),
            createdAt: rotatedAt,
            rotatedAt,
            rotatedFromKeyId: priorIdentityKeyId,
            rotationCeremonyId: ceremonyId,
            rotationReason: options?.reason || 'scheduled_rotation',
            changeTicket: options?.changeTicket || null,
            rotatedBy: options?.requestedBy || 'system',
        } satisfies TransportIdentityKeyRecord);

        this.kemKeys = kemKp;
        this.identityKeys = sigKp;
        this.enforceKeyPinning();

        const recoveryTest =
            options?.runRecoveryTest === false
                ? ({ passed: true, skipped: true } as const)
                : await this.runTransportRecoveryTest();

        return {
            ceremonyId,
            kemAlgorithm: ML_KEM_1024_ALGORITHM,
            identityAlgorithm: ML_DSA_65_ALGORITHM,
            rotatedAt,
            previousKemKeyId: priorKemKeyId,
            previousIdentityKeyId: priorIdentityKeyId,
            currentKemKeyId: this.kemKeyId(kemKp.publicKey),
            currentIdentityKeyId: this.identityKeyId(sigKp.publicKey),
            recoveryTest,
        };
    }

    async getTransportKeyGovernanceStatus() {
        this.ensureReady();
        const kemRecord = (await this.vaultService.read(this.kemVaultPath)) as TransportKemKeyRecord;
        const identityRecord = (await this.vaultService.read(this.identityVaultPath)) as TransportIdentityKeyRecord;
        const kemHash = this.keyHashHex(this.kemKeys!.publicKey);
        const identityHash = this.keyHashHex(this.identityKeys!.publicKey);

        return {
            protocolVersion: TRANSPORT_PROTOCOL_VERSION,
            kem: {
                keyId: this.kemKeyId(this.kemKeys!.publicKey),
                keyHash: kemHash,
                createdAt: kemRecord?.createdAt || null,
                rotatedAt: kemRecord?.rotatedAt || null,
                rotatedFromKeyId: kemRecord?.rotatedFromKeyId || null,
                rotationCeremonyId: kemRecord?.rotationCeremonyId || null,
            },
            identity: {
                keyId: this.identityKeyId(this.identityKeys!.publicKey),
                keyHash: identityHash,
                createdAt: identityRecord?.createdAt || null,
                rotatedAt: identityRecord?.rotatedAt || null,
                rotatedFromKeyId: identityRecord?.rotatedFromKeyId || null,
                rotationCeremonyId: identityRecord?.rotationCeremonyId || null,
            },
            pins: {
                kemKeyId: this.configService.get<string>('TRANSPORT_KEM_KEY_ID_PIN') || null,
                kemKeyHash: this.normalizeHex(this.configService.get<string>('TRANSPORT_KEM_KEY_HASH_PIN')) || null,
                identityKeyId: this.configService.get<string>('TRANSPORT_IDENTITY_KEY_ID_PIN') || null,
                identityKeyHash:
                    this.normalizeHex(this.configService.get<string>('TRANSPORT_IDENTITY_KEY_HASH_PIN')) || null,
            },
        };
    }

    async runTransportRecoveryTest(): Promise<{
        passed: boolean;
        kemDecapsulationMatch: boolean;
        identitySignatureValid: boolean;
        kemKeyId: string;
        identityKeyId: string;
        challengeHash: string;
    }> {
        this.ensureReady();
        const challengeEnvelope = {
            protocolVersion: `${TRANSPORT_PROTOCOL_VERSION}.recovery`,
            issuedAt: new Date().toISOString(),
            nonce: crypto.randomUUID(),
        };
        const challengeHash = canonicalJsonSha256Hex(challengeEnvelope);
        const challengeMessage = new Uint8Array(Buffer.from(challengeHash, 'hex'));

        const signature = await this.sig.sign(challengeMessage, this.identityKeys!.secretKey);
        const identitySignatureValid = await this.sig.verify(
            challengeMessage,
            signature,
            this.identityKeys!.publicKey,
        );

        const encapsulated = await this.kem.encapsulate(this.kemKeys!.publicKey);
        const decapsulated = await this.kem.decapsulate(encapsulated.ciphertext, this.kemKeys!.secretKey);
        const kemDecapsulationMatch =
            Buffer.from(encapsulated.sharedSecret).equals(Buffer.from(decapsulated));

        return {
            passed: identitySignatureValid && kemDecapsulationMatch,
            kemDecapsulationMatch,
            identitySignatureValid,
            kemKeyId: this.kemKeyId(this.kemKeys!.publicKey),
            identityKeyId: this.identityKeyId(this.identityKeys!.publicKey),
            challengeHash: `0x${challengeHash}`,
        };
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
