/**
 * WASM Provider Tests
 * Tests the WASM backend provider implementation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createProvider, ProviderWasm } from '../src/index.js';
import type { Provider } from '../src/provider.js';

describe('ProviderWasm', () => {
  let provider: Provider;

  beforeAll(async () => {
    provider = new ProviderWasm({ hrp: 'dyt', algo: 'dilithium3' });
    await provider.init();
  });

  it('should have correct name and version', () => {
    expect(provider.name).toBe('wasm');
    expect(provider.version).toBeDefined();
  });

  it('should initialize successfully', async () => {
    const newProvider = new ProviderWasm();
    await expect(newProvider.init()).resolves.not.toThrow();
  });

  describe('keygen', () => {
    it('should generate a valid keypair', async () => {
      const keypair = await provider.keygen();
      
      expect(keypair).toBeDefined();
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array);
      
      // Dilithium3 key sizes
      expect(keypair.publicKey.length).toBe(1952); // PK length
      expect(keypair.secretKey.length).toBe(4000); // SK length
    });

    it('should generate different keypairs on successive calls', async () => {
      const kp1 = await provider.keygen();
      const kp2 = await provider.keygen();
      
      // Keys should be different
      expect(Buffer.from(kp1.publicKey).equals(Buffer.from(kp2.publicKey))).toBe(false);
      expect(Buffer.from(kp1.secretKey).equals(Buffer.from(kp2.secretKey))).toBe(false);
    });
  });

  describe('sign and verify', () => {
    it('should sign and verify a message', async () => {
      const keypair = await provider.keygen();
      const message = new TextEncoder().encode('Hello, Dytallix!');
      
      const signResult = await provider.sign(message, keypair.secretKey);
      expect(signResult.signature).toBeInstanceOf(Uint8Array);
      expect(signResult.signature.length).toBe(3309); // Dilithium3 signature length
      
      const verifyResult = await provider.verify(
        message,
        signResult.signature,
        keypair.publicKey
      );
      expect(verifyResult.ok).toBe(true);
    });

    it('should fail verification with wrong public key', async () => {
      const kp1 = await provider.keygen();
      const kp2 = await provider.keygen();
      const message = new TextEncoder().encode('Test message');
      
      const signResult = await provider.sign(message, kp1.secretKey);
      const verifyResult = await provider.verify(
        message,
        signResult.signature,
        kp2.publicKey // Wrong key
      );
      
      expect(verifyResult.ok).toBe(false);
    });

    it('should fail verification with modified message', async () => {
      const keypair = await provider.keygen();
      const message = new TextEncoder().encode('Original message');
      const modifiedMessage = new TextEncoder().encode('Modified message');
      
      const signResult = await provider.sign(message, keypair.secretKey);
      const verifyResult = await provider.verify(
        modifiedMessage,
        signResult.signature,
        keypair.publicKey
      );
      
      expect(verifyResult.ok).toBe(false);
    });

    it('should handle empty messages', async () => {
      const keypair = await provider.keygen();
      const message = new Uint8Array(0);
      
      const signResult = await provider.sign(message, keypair.secretKey);
      const verifyResult = await provider.verify(
        message,
        signResult.signature,
        keypair.publicKey
      );
      
      expect(verifyResult.ok).toBe(true);
    });

    it('should handle large messages', async () => {
      const keypair = await provider.keygen();
      const message = new Uint8Array(10000).fill(42);
      
      const signResult = await provider.sign(message, keypair.secretKey);
      const verifyResult = await provider.verify(
        message,
        signResult.signature,
        keypair.publicKey
      );
      
      expect(verifyResult.ok).toBe(true);
    });
  });

  describe('addressFromPublicKey', () => {
    it('should derive a valid address from public key', async () => {
      const keypair = await provider.keygen();
      const address = await provider.addressFromPublicKey(keypair.publicKey);
      
      expect(address).toBeDefined();
      expect(typeof address).toBe('string');
      expect(address.startsWith('dyt1')).toBe(true);
    });

    it('should derive consistent addresses for same public key', async () => {
      const keypair = await provider.keygen();
      const address1 = await provider.addressFromPublicKey(keypair.publicKey);
      const address2 = await provider.addressFromPublicKey(keypair.publicKey);
      
      expect(address1).toBe(address2);
    });

    it('should derive different addresses for different public keys', async () => {
      const kp1 = await provider.keygen();
      const kp2 = await provider.keygen();
      
      const address1 = await provider.addressFromPublicKey(kp1.publicKey);
      const address2 = await provider.addressFromPublicKey(kp2.publicKey);
      
      expect(address1).not.toBe(address2);
    });
  });

  describe('zeroize', () => {
    it('should zeroize a buffer', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      
      if (provider.zeroize) {
        provider.zeroize(buffer);
        expect(Array.from(buffer)).toEqual([0, 0, 0, 0, 0]);
      }
    });
  });
});

describe('createProvider', () => {
  it('should create a WASM provider by default', async () => {
    const provider = await createProvider();
    expect(provider.name).toBe('wasm');
  });

  it('should create a WASM provider when explicitly requested', async () => {
    const provider = await createProvider({ backend: 'wasm' });
    expect(provider.name).toBe('wasm');
  });

  it('should accept custom HRP', async () => {
    const provider = await createProvider({ hrp: 'test' });
    const keypair = await provider.keygen();
    const address = await provider.addressFromPublicKey(keypair.publicKey);
    
    expect(address.startsWith('test1')).toBe(true);
  });

  it('should be immediately usable after creation', async () => {
    const provider = await createProvider();
    const keypair = await provider.keygen();
    const message = new TextEncoder().encode('Quick test');
    const sig = await provider.sign(message, keypair.secretKey);
    const result = await provider.verify(message, sig.signature, keypair.publicKey);
    
    expect(result.ok).toBe(true);
  });
});
