import { describe, it, expect } from 'vitest';
import { isValidAddress, normalizeAddress } from '../src/util/validators.js';

describe('Validators', () => {
  describe('isValidAddress', () => {
    it('should validate hex addresses', () => {
      expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBe(true);
      expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });
    
    it('should validate bech32 addresses', () => {
      expect(isValidAddress('dytallix1abcdefghijklmnopqrstuvwxyz0123456')).toBe(true);
    });
    
    it('should reject invalid addresses', () => {
      expect(isValidAddress('')).toBe(false);
      expect(isValidAddress('invalid')).toBe(false);
      expect(isValidAddress('0x123')).toBe(false);
    });
  });
  
  describe('normalizeAddress', () => {
    it('should normalize to lowercase', () => {
      expect(normalizeAddress('0xABC')).toBe('0xabc');
      expect(normalizeAddress('DYTALLIX1ABC')).toBe('dytallix1abc');
    });
  });
});
