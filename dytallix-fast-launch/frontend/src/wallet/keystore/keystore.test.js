// Unit tests for keystore module
import { describe, it, expect, beforeEach } from 'vitest';
import {
  exportKeystore,
  serializeKeystore,
  importKeystore,
  KeystoreParseError,
  KeystoreVersionUnsupportedError,
  DecryptionAuthError,
  DEFAULT_KDF_PARAMS
} from '../wallet/keystore/index.js';
import { createMockWallet } from '../wallet/pqc.js';

describe('Keystore Export/Import', () => {
  let mockWallet;
  
  beforeEach(() => {
    // Create a deterministic mock wallet for testing
    const addr = 'pqc1ml1234567890abcdefghijklmnopqrstuvwxyz';
    const algorithm = 'ML-DSA';
    const publicKey = new Uint8Array(1952); // ML-DSA public key size
    const privateKey = new Uint8Array(4032); // ML-DSA private key size
    
    // Fill with deterministic data
    for (let i = 0; i < publicKey.length; i++) {
      publicKey[i] = i % 256;
    }
    for (let i = 0; i < privateKey.length; i++) {
      privateKey[i] = (i * 3) % 256;
    }
    
    mockWallet = createMockWallet({ address: addr, algorithm, publicKey, privateKey });
  });
  
  it('should export keystore with correct structure', async () => {
    const password = 'test-password-123';
    const now = () => new Date('2025-01-01T00:00:00Z');
    
    const keystore = await exportKeystore(mockWallet, { password, now });
    
    expect(keystore.version).toBe(1);
    expect(keystore.algorithm).toBe('ML-DSA');
    expect(keystore.address).toBe('pqc1ml1234567890abcdefghijklmnopqrstuvwxyz');
    expect(keystore.publicKey).toBeDefined();
    expect(keystore.crypto.cipher).toBe('aes-256-gcm');
    expect(keystore.crypto.kdf).toBe('scrypt');
    expect(keystore.crypto.ciphertext).toBeTruthy();
    expect(keystore.crypto.iv).toBeTruthy();
    expect(keystore.crypto.authTag).toBeTruthy();
    expect(keystore.crypto.salt).toBeTruthy();
    expect(keystore.crypto.kdfparams).toEqual(DEFAULT_KDF_PARAMS);
    expect(keystore.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(keystore.meta.checksum).toBeTruthy();
  });
  
  it('should round-trip export and import successfully', async () => {
    const password = 'secure-password-456';
    
    // Export
    const keystore = await exportKeystore(mockWallet, { password });
    const json = await serializeKeystore(keystore);
    
    // Import
    const result = await importKeystore(json, password);
    
    expect(result.algorithm).toBe('ML-DSA');
    expect(result.privateKey).toBeInstanceOf(Uint8Array);
    expect(result.privateKey.length).toBe(4032); // ML-DSA private key size
    expect(result.addressCheck).toBe('pqc1ml1234567890abcdefghijklmnopqrstuvwxyz');
    
    // Verify private key content matches
    const originalPrivateKey = await mockWallet.exportPrivateKeyRaw();
    expect(Array.from(result.privateKey)).toEqual(Array.from(originalPrivateKey));
  });
  
  it('should fail import with wrong password', async () => {
    const password = 'correct-password';
    const wrongPassword = 'wrong-password';
    
    // Export
    const keystore = await exportKeystore(mockWallet, { password });
    const json = await serializeKeystore(keystore);
    
    // Import with wrong password should fail
    await expect(importKeystore(json, wrongPassword)).rejects.toThrow(DecryptionAuthError);
  });
  
  it('should validate keystore schema correctly', async () => {
    const password = 'test-password';
    const keystore = await exportKeystore(mockWallet, { password });
    const json = await serializeKeystore(keystore);
    
    // Valid keystore should import successfully
    const result = await importKeystore(json, password);
    expect(result).toBeDefined();
  });
  
  it('should reject invalid JSON', async () => {
    const invalidJson = '{ invalid json }';
    
    await expect(importKeystore(invalidJson, 'password')).rejects.toThrow(KeystoreParseError);
  });
  
  it('should reject missing version field', async () => {
    const invalidKeystore = JSON.stringify({
      algorithm: 'ML-DSA',
      address: 'pqc1test',
      crypto: {}
    });
    
    await expect(importKeystore(invalidKeystore, 'password')).rejects.toThrow(KeystoreParseError);
  });
  
  it('should reject unsupported version', async () => {
    const futureKeystore = JSON.stringify({
      version: 2,
      algorithm: 'ML-DSA',
      address: 'pqc1test'
    });
    
    await expect(importKeystore(futureKeystore, 'password')).rejects.toThrow(KeystoreVersionUnsupportedError);
  });
  
  it('should reject missing crypto fields', async () => {
    const password = 'test-password';
    const keystore = await exportKeystore(mockWallet, { password });
    
    // Remove required crypto field
    delete keystore.crypto.iv;
    const json = await serializeKeystore(keystore);
    
    await expect(importKeystore(json, password)).rejects.toThrow(KeystoreParseError);
  });
  
  it('should support SLH-DSA algorithm', async () => {
    const addr = 'pqc1slh9876543210zyxwvutsrqponmlkjihgfedcba';
    const algorithm = 'SLH-DSA';
    const publicKey = new Uint8Array(64); // SLH-DSA public key size
    const privateKey = new Uint8Array(128); // SLH-DSA private key size
    
    for (let i = 0; i < publicKey.length; i++) {
      publicKey[i] = (i + 128) % 256;
    }
    for (let i = 0; i < privateKey.length; i++) {
      privateKey[i] = (i * 5 + 42) % 256;
    }
    
    const slhWallet = createMockWallet({ address: addr, algorithm, publicKey, privateKey });
    const password = 'slh-password';
    
    // Export
    const keystore = await exportKeystore(slhWallet, { password });
    expect(keystore.algorithm).toBe('SLH-DSA');
    expect(keystore.address).toBe(addr);
    
    // Import
    const json = await serializeKeystore(keystore);
    const result = await importKeystore(json, password);
    expect(result.algorithm).toBe('SLH-DSA');
    expect(result.privateKey.length).toBe(128);
  });
  
  it('should use custom KDF parameters', async () => {
    const password = 'test-password';
    const customKdf = {
      n: 16384, // Lower N for faster testing
      r: 8,
      p: 1,
      dklen: 32
    };
    
    const keystore = await exportKeystore(mockWallet, { password, kdf: customKdf });
    
    expect(keystore.crypto.kdfparams.n).toBe(16384);
    expect(keystore.crypto.kdfparams.r).toBe(8);
    expect(keystore.crypto.kdfparams.p).toBe(1);
    expect(keystore.crypto.kdfparams.dklen).toBe(32);
    
    // Should still import correctly
    const json = await serializeKeystore(keystore);
    const result = await importKeystore(json, password);
    expect(result.algorithm).toBe('ML-DSA');
  });
  
  it('should reject password shorter than 8 characters', async () => {
    const shortPassword = '1234567';
    
    await expect(exportKeystore(mockWallet, { password: shortPassword })).rejects.toThrow('at least 8 characters');
  });
  
  it('should include full canonical address (not truncated)', async () => {
    const longAddr = 'pqc1ml' + 'a'.repeat(100); // Very long address
    const algorithm = 'ML-DSA';
    const publicKey = new Uint8Array(1952);
    const privateKey = new Uint8Array(4032);
    
    const walletWithLongAddr = createMockWallet({ 
      address: longAddr, 
      algorithm, 
      publicKey, 
      privateKey 
    });
    
    const password = 'test-password';
    const keystore = await exportKeystore(walletWithLongAddr, { password });
    
    // Address should be stored in full, never truncated
    expect(keystore.address).toBe(longAddr);
    expect(keystore.address.length).toBe(105);
  });
  
  it('should verify address consistency', async () => {
    const password = 'test-password';
    
    // Export
    const keystore = await exportKeystore(mockWallet, { password });
    const json = await serializeKeystore(keystore);
    
    // Import and check
    const result = await importKeystore(json, password);
    
    // addressCheck should match the original address
    expect(result.addressCheck).toBe(await mockWallet.getAddress());
  });
});

describe('Keystore Utilities', () => {
  it('should encode and decode base64 correctly', async () => {
    const { arrayToBase64, base64ToArray } = await import('../wallet/keystore/utils.js');
    
    const original = new Uint8Array([1, 2, 3, 4, 5, 255, 128, 0]);
    const encoded = arrayToBase64(original);
    const decoded = base64ToArray(encoded);
    
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
  
  it('should compute SHA-256 checksum', async () => {
    const { sha256 } = await import('../wallet/keystore/utils.js');
    
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const hash = await sha256(data);
    
    expect(hash).toBeInstanceOf(Uint8Array);
    expect(hash.length).toBe(32); // SHA-256 produces 32 bytes
  });
  
  it('should zeroize sensitive buffers', async () => {
    const { zeroize } = await import('../wallet/keystore/utils.js');
    
    const sensitive = new Uint8Array([1, 2, 3, 4, 5]);
    zeroize(sensitive);
    
    expect(Array.from(sensitive)).toEqual([0, 0, 0, 0, 0]);
  });
});
