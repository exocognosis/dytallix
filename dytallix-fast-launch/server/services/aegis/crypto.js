/**
 * Aegis Quantum Cryptography Module
 * Implements ML-DSA-87 (CRYSTALS-Dilithium) for post-quantum signatures
 */

import dilithiumPkg from 'dilithium-crystals';
const { dilithium } = dilithiumPkg;
import crypto from 'crypto';
import { logInfo, logError, logWarn } from '../../logger.js';

// Key storage (in production, use secure key management)
let dilithiumKeyPair = null;

/**
 * Initialize cryptographic keys
 * Generates ML-DSA-87 (Dilithium5) key pair
 */
export const initializeKeys = async () => {
    try {
        // Generate Dilithium key pair for signatures (ML-DSA-87 equivalent)
        logInfo('Generating Dilithium5 (ML-DSA-87) key pair...');
        dilithiumKeyPair = await dilithium.keyPair();

        logInfo('Quantum-resistant cryptographic keys initialized', {
            dilithiumPublicKeyLength: dilithiumKeyPair.publicKey.length,
            dilithiumPrivateKeyLength: dilithiumKeyPair.privateKey.length,
            algorithm: 'ML-DSA-87 (Dilithium5)'
        });

        return { success: true };
    } catch (error) {
        logError('Failed to initialize cryptographic keys', { error: error.message });
        throw error;
    }
};

/**
 * Sign data with ML-DSA-87 (Dilithium5)
 */
export const signData = async (data) => {
    try {
        if (!dilithiumKeyPair) {
            throw new Error('Dilithium keys not initialized');
        }

        // Convert data to Uint8Array if it's an object or string
        let dataBuffer;
        if (typeof data === 'string') {
            dataBuffer = new TextEncoder().encode(data);
        } else if (data instanceof Uint8Array) {
            dataBuffer = data;
        } else {
            dataBuffer = new TextEncoder().encode(JSON.stringify(data));
        }

        // Sign with Dilithium5 (detached signature)
        const signature = await dilithium.signDetached(dataBuffer, dilithiumKeyPair.privateKey);

        // Create hash of the data for reference
        const dataHash = crypto.createHash('sha256').update(dataBuffer).digest('hex');

        return {
            signature: Buffer.from(signature).toString('base64'),
            dataHash,
            publicKey: Buffer.from(dilithiumKeyPair.publicKey).toString('base64'),
            algorithm: 'ML-DSA-87 (Dilithium5)',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logError('Failed to sign data', { error: error.message });
        throw error;
    }
};

/**
 * Verify ML-DSA-87 signature
 */
export const verifySignature = async (data, signature, publicKey) => {
    try {
        // Convert data to Uint8Array
        let dataBuffer;
        if (typeof data === 'string') {
            dataBuffer = new TextEncoder().encode(data);
        } else if (data instanceof Uint8Array) {
            dataBuffer = data;
        } else {
            dataBuffer = new TextEncoder().encode(JSON.stringify(data));
        }

        // Convert signature and public key from base64 to Uint8Array
        const signatureBuffer = new Uint8Array(Buffer.from(signature, 'base64'));
        const publicKeyBuffer = new Uint8Array(Buffer.from(publicKey, 'base64'));

        // Verify with Dilithium5
        const isValid = await dilithium.verifyDetached(signatureBuffer, dataBuffer, publicKeyBuffer);

        return {
            valid: isValid,
            algorithm: 'ML-DSA-87 (Dilithium5)',
            verifiedAt: new Date().toISOString()
        };
    } catch (error) {
        logError('Failed to verify signature', { error: error.message });
        return {
            valid: false,
            error: error.message
        };
    }
};

/**
 * Encrypt data with AES-256-GCM
 * Note: Kyber-1024 integration pending - using AES for now
 */
export const encryptData = async (data) => {
    try {
        // Convert data to buffer
        const dataBuffer = typeof data === 'string'
            ? Buffer.from(data, 'utf8')
            : Buffer.from(JSON.stringify(data), 'utf8');

        // Generate random key and IV for AES
        const key = crypto.randomBytes(32);
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        let encrypted = cipher.update(dataBuffer);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        const authTag = cipher.getAuthTag();

        return {
            encryptedData: encrypted.toString('base64'),
            key: key.toString('base64'),
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            algorithm: 'AES-256-GCM (Kyber-1024 integration pending)'
        };
    } catch (error) {
        logError('Failed to encrypt data', { error: error.message });
        throw error;
    }
};

/**
 * Decrypt data with AES-256-GCM
 */
export const decryptData = async (encryptedPackage) => {
    try {
        const key = Buffer.from(encryptedPackage.key, 'base64');
        const iv = Buffer.from(encryptedPackage.iv, 'base64');
        const authTag = Buffer.from(encryptedPackage.authTag, 'base64');
        const encryptedData = Buffer.from(encryptedPackage.encryptedData, 'base64');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        logError('Failed to decrypt data', { error: error.message });
        throw error;
    }
};

/**
 * Get public keys for external verification
 */
export const getPublicKeys = () => {
    if (!dilithiumKeyPair) {
        logWarn('Cryptographic keys not initialized');
        return null;
    }

    return {
        dilithium: {
            publicKey: Buffer.from(dilithiumKeyPair.publicKey).toString('base64'),
            algorithm: 'ML-DSA-87 (Dilithium5)',
            keyLength: dilithiumKeyPair.publicKey.length
        }
    };
};

// Initialize keys on module load
initializeKeys().catch(err => {
    logError('Failed to initialize Aegis cryptography', { error: err.message });
});

export default {
    initializeKeys,
    signData,
    verifySignature,
    encryptData,
    decryptData,
    getPublicKeys
};
