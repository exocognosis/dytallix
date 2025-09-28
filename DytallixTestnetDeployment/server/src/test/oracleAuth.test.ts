/**
 * Tests for Oracle HMAC authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import { oracleAuthMiddleware, createOracleSignature, validateOracleConfig, OracleAuthRequest } from '../middleware/oracleAuth';
import { rawBodyMiddleware } from '../middleware/rawBody';

// Mock Express objects
const createMockRequest = (body: any, headers: any = {}, rawBody?: Buffer): OracleAuthRequest => ({
  body,
  headers,
  rawBody,
  ip: '127.0.0.1',
  get: (header: string) => headers[header.toLowerCase()],
} as OracleAuthRequest);

const createMockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createMockNext = () => jest.fn() as NextFunction;

describe('Oracle Authentication Middleware', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('oracleAuthMiddleware', () => {
    const testSecret = 'test-secret-key-32-chars-long-12345';
    const testPayload = JSON.stringify({ tx_hash: '0x123', score: '0.5' });
    
    test('should pass authentication with valid HMAC signature', () => {
      process.env.DLX_ORACLE_INGEST_SECRET = testSecret;
      
      const rawBody = Buffer.from(testPayload);
      const signature = createOracleSignature(rawBody, testSecret);
      
      const req = createMockRequest(
        { tx_hash: '0x123', score: '0.5' },
        { 'x-oracle-signature': signature },
        rawBody
      );
      const res = createMockResponse();
      const next = createMockNext();
      
      oracleAuthMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.oracleAuth?.verified).toBe(true);
      expect(res.status).not.toHaveBeenCalled();
    });
    
    test('should reject authentication with invalid signature', () => {
      process.env.DLX_ORACLE_INGEST_SECRET = testSecret;
      
      const rawBody = Buffer.from(testPayload);
      const wrongSignature = createOracleSignature(Buffer.from('wrong payload'), testSecret);
      
      const req = createMockRequest(
        { tx_hash: '0x123', score: '0.5' },
        { 'x-oracle-signature': wrongSignature },
        rawBody
      );
      const res = createMockResponse();
      const next = createMockNext();
      
      oracleAuthMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid signature',
        code: 'SIGNATURE_MISMATCH'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should reject request with missing signature header', () => {
      process.env.DLX_ORACLE_INGEST_SECRET = testSecret;
      
      const req = createMockRequest(
        { tx_hash: '0x123', score: '0.5' },
        {},
        Buffer.from(testPayload)
      );
      const res = createMockResponse();
      const next = createMockNext();
      
      oracleAuthMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing X-Oracle-Signature header',
        code: 'MISSING_SIGNATURE'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should reject request with missing raw body', () => {
      process.env.DLX_ORACLE_INGEST_SECRET = testSecret;
      
      const req = createMockRequest(
        { tx_hash: '0x123', score: '0.5' },
        { 'x-oracle-signature': 'some-signature' }
        // No rawBody
      );
      const res = createMockResponse();
      const next = createMockNext();
      
      oracleAuthMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Raw body not available for signature verification',
        code: 'NO_RAW_BODY'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should reject signature with invalid format', () => {
      process.env.DLX_ORACLE_INGEST_SECRET = testSecret;
      
      const req = createMockRequest(
        { tx_hash: '0x123', score: '0.5' },
        { 'x-oracle-signature': 'invalid-signature-format' },
        Buffer.from(testPayload)
      );
      const res = createMockResponse();
      const next = createMockNext();
      
      oracleAuthMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid signature format - expected 64 character hex string',
        code: 'INVALID_SIGNATURE_FORMAT'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should skip authentication in development when secret not set', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DLX_ORACLE_INGEST_SECRET;
      
      const req = createMockRequest(
        { tx_hash: '0x123', score: '0.5' },
        {},
        Buffer.from(testPayload)
      );
      const res = createMockResponse();
      const next = createMockNext();
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      oracleAuthMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.oracleAuth?.verified).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Oracle HMAC auth disabled - DLX_ORACLE_INGEST_SECRET not set'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    test('should require secret in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DLX_ORACLE_INGEST_SECRET;
      
      const req = createMockRequest(
        { tx_hash: '0x123', score: '0.5' },
        {},
        Buffer.from(testPayload)
      );
      const res = createMockResponse();
      const next = createMockNext();
      
      oracleAuthMiddleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Oracle authentication not configured',
        code: 'AUTH_CONFIG_MISSING'
      });
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should extract source from headers', () => {
      process.env.DLX_ORACLE_INGEST_SECRET = testSecret;
      
      const rawBody = Buffer.from(testPayload);
      const signature = createOracleSignature(rawBody, testSecret);
      
      const req = createMockRequest(
        { tx_hash: '0x123', score: '0.5' },
        { 
          'x-oracle-signature': signature,
          'x-oracle-source': 'oracle-test-1'
        },
        rawBody
      );
      const res = createMockResponse();
      const next = createMockNext();
      
      oracleAuthMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
      expect(req.oracleAuth?.verified).toBe(true);
      expect(req.oracleAuth?.source).toBe('oracle-test-1');
    });
  });
  
  describe('createOracleSignature', () => {
    test('should create consistent signatures', () => {
      const secret = 'test-secret';
      const payload = 'test-payload';
      
      const signature1 = createOracleSignature(payload, secret);
      const signature2 = createOracleSignature(payload, secret);
      
      expect(signature1).toBe(signature2);
      expect(signature1).toMatch(/^[a-f0-9]{64}$/);
    });
    
    test('should create different signatures for different payloads', () => {
      const secret = 'test-secret';
      
      const signature1 = createOracleSignature('payload1', secret);
      const signature2 = createOracleSignature('payload2', secret);
      
      expect(signature1).not.toBe(signature2);
    });
    
    test('should work with Buffer payloads', () => {
      const secret = 'test-secret';
      const payload = Buffer.from('test-payload');
      
      const signature = createOracleSignature(payload, secret);
      
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });
  
  describe('validateOracleConfig', () => {
    test('should validate production configuration', () => {
      process.env.NODE_ENV = 'production';
      process.env.DLX_ORACLE_INGEST_SECRET = 'valid-secret-key-32-chars-long-123';
      process.env.DLX_ORACLE_MODEL_ID = 'risk-v1';
      
      const result = validateOracleConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('should detect missing secret in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DLX_ORACLE_INGEST_SECRET;
      
      const result = validateOracleConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DLX_ORACLE_INGEST_SECRET is required in production');
    });
    
    test('should detect short secret in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DLX_ORACLE_INGEST_SECRET = 'short';
      
      const result = validateOracleConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DLX_ORACLE_INGEST_SECRET should be at least 32 characters');
    });
    
    test('should detect invalid model ID characters', () => {
      process.env.DLX_ORACLE_MODEL_ID = 'invalid model@id!';
      
      const result = validateOracleConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DLX_ORACLE_MODEL_ID contains invalid characters');
    });
  });
});