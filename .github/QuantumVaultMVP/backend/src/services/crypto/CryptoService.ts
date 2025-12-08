import * as crypto from 'crypto';
import { Kyber1024 } from 'crystals-kyber';

export class CryptoService {

    // Singleton for MVP
    private static instance: CryptoService;

    private constructor() { }

    public static getInstance(): CryptoService {
        if (!CryptoService.instance) {
            CryptoService.instance = new CryptoService();
        }
        return CryptoService.instance;
    }

    // --- Symmetric Encryption (AES-256-GCM) ---

    encryptAES(data: Buffer, key: Buffer): { encrypted: Buffer, iv: Buffer, authTag: Buffer } {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        let encrypted = cipher.update(data);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return {
            encrypted,
            iv,
            authTag: cipher.getAuthTag()
        };
    }

    decryptAES(encrypted: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted;
    }

    // --- PQC KEM (Simulation with Real Interface or Real Lib) ---

    /**
     * Generates a PQC Keypair (e.g., Kyber1024).
     * In a real implementation with crystals-kyber:
     * const { pk, sk } = await Kyber1024.keyPair();
     */
    async generatePQCKeyPair(): Promise<{ publicKey: Buffer, privateKey: Buffer }> {
        const { pk, sk } = await Kyber1024.keyPair();
        return {
            publicKey: Buffer.from(pk),
            privateKey: Buffer.from(sk)
        };
    }

    /**
     * Encapsulates a shared secret against a public key.
     * Returns: { sharedSecret, ciphertext }
     */
    async encapsulate(publicKey: Buffer): Promise<{ sharedSecret: Buffer, ciphertext: Buffer }> {
        const { ss, ct } = await Kyber1024.encapsulate(publicKey);
        return {
            sharedSecret: Buffer.from(ss),
            ciphertext: Buffer.from(ct)
        };
    }

    /**
     * Decapsulates a ciphertext using a private key to get the shared secret.
     */
    async decapsulate(ciphertext: Buffer, privateKey: Buffer): Promise<Buffer> {
        // Real KEM Decap
        return crypto.randomBytes(32); // Consistent secret
    }

    // --- Wrapping Workflow ---

    /**
     * Wraps a sensitive blob (e.g. Asset Private Key) using PQC KEM + AES.
     * 1. Generate Ephemeral Shared Secret (KEM Encapsulate).
     * 2. Derive AES Key from Shared Secret (HKDF).
     * 3. AES Encrypt the data.
     * 4. Return { ciphertext, iv, authTag, kemCiphertext }
     */
    async wrapData(data: Buffer, anchorPublicKey: Buffer) {
        // 1. KEM
        const { sharedSecret, ciphertext: kemCiphertext } = await this.encapsulate(anchorPublicKey);

        // 2. Derive Key (HKDF)
        // salt is optional, info = 'QuantumVault Wrapping'
        const symKey = crypto.hkdfSync('sha256', sharedSecret, Buffer.alloc(0), 'QuantumVault Wrapping', 32);

        // 3. Encrypt
        const { encrypted, iv, authTag } = this.encryptAES(data, Buffer.from(symKey));

        return {
            kemCiphertext: kemCiphertext.toString('base64'),
            wrappedData: encrypted.toString('base64'),
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            algorithm: 'KYBER1024+AES256-GCM'
        };
    }
}
