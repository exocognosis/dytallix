/**
 * Unit Tests - Config/Environment
 * Tests for server/config/environment.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Config - Environment', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original env
        originalEnv = { ...process.env };

        // Reset to defaults
        delete process.env.PORT;
        delete process.env.ALLOWED_ORIGIN;
        delete process.env.CHAIN_PREFIX;
        delete process.env.FAUCET_MNEMONIC;
    });

    afterEach(() => {
        // Restore original env
        process.env = originalEnv;
    });

    describe('CONFIG object', () => {
        it('should have default server configuration', async () => {
            const { CONFIG } = await import('@server/config/environment.js');

            expect(CONFIG.server.port).toBe(3001);
            expect(CONFIG.server.allowedOrigin).toBe('http://localhost:3000');
            expect(CONFIG.server.nodeEnv).toBe('test'); // Set in setup.js
        });

        it('should use environment variables when provided', async () => {
            process.env.PORT = '4000';
            process.env.ALLOWED_ORIGIN = 'https://example.com';

            // Re-import to get new values
            vi.resetModules();
            const { CONFIG } = await import('@server/config/environment.js');

            expect(CONFIG.server.port).toBe(4000);
            expect(CONFIG.server.allowedOrigin).toBe('https://example.com');
        });

        it('should have chain configuration', async () => {
            const { CONFIG } = await import('@server/config/environment.js');

            expect(CONFIG.chain.prefix).toBe('dytallix');
            expect(CONFIG.chain.blockchainNode).toBeDefined();
        });

        it('should have faucet configuration', async () => {
            const { CONFIG } = await import('@server/config/environment.js');

            expect(CONFIG.faucet.cooldownMinutes).toBe(60);
            expect(CONFIG.faucet.maxDGT).toBe(2);
            expect(CONFIG.faucet.maxDRT).toBe(50);
        });

        it('should detect demo mode when mnemonic is missing', async () => {
            delete process.env.FAUCET_MNEMONIC;
            vi.resetModules();

            const { CONFIG } = await import('@server/config/environment.js');

            expect(CONFIG.demoMode).toBe(true);
        });

        it('should detect demo mode when mnemonic is placeholder', async () => {
            process.env.FAUCET_MNEMONIC = 'your-placeholder-mnemonic';
            vi.resetModules();

            const { CONFIG } = await import('@server/config/environment.js');

            expect(CONFIG.demoMode).toBe(true);
        });
    });

    describe('collectConnectSrc', () => {
        it('should include self by default', async () => {
            const { collectConnectSrc } = await import('@server/config/environment.js');

            const result = collectConnectSrc();

            expect(result).toContain("'self'");
        });

        it('should parse and include valid URLs', async () => {
            process.env.VITE_RPC_HTTP_URL = 'http://localhost:26657';
            process.env.VITE_API_URL = 'http://localhost:3001';
            vi.resetModules();

            const { collectConnectSrc } = await import('@server/config/environment.js');
            const result = collectConnectSrc();

            expect(result).toContain('http://localhost:26657');
            expect(result).toContain('http://localhost:3001');
        });

        it('should ignore malformed URLs', async () => {
            process.env.VITE_RPC_HTTP_URL = 'not-a-valid-url';
            vi.resetModules();

            const { collectConnectSrc } = await import('@server/config/environment.js');

            // Should not throw
            expect(() => collectConnectSrc()).not.toThrow();
        });
    });

    describe('validateProductionConfig', () => {
        it('should pass validation in non-production', async () => {
            process.env.NODE_ENV = 'development';
            vi.resetModules();

            const { validateProductionConfig } = await import('@server/config/environment.js');

            expect(() => validateProductionConfig()).not.toThrow();
        });

        it('should throw error in production without mnemonic', async () => {
            process.env.NODE_ENV = 'production';
            delete process.env.FAUCET_MNEMONIC;
            vi.resetModules();

            const { validateProductionConfig } = await import('@server/config/environment.js');

            expect(() => validateProductionConfig()).toThrow(/missing required secrets/);
        });

        it('should throw error in production with placeholder mnemonic', async () => {
            process.env.NODE_ENV = 'production';
            process.env.FAUCET_MNEMONIC = 'placeholder-value';
            vi.resetModules();

            const { validateProductionConfig } = await import('@server/config/environment.js');

            expect(() => validateProductionConfig()).toThrow(/missing required secrets/);
        });

        it('should pass validation in production with valid mnemonic', async () => {
            process.env.NODE_ENV = 'production';
            process.env.FAUCET_MNEMONIC = 'valid mnemonic words here';
            vi.resetModules();

            const { validateProductionConfig } = await import('@server/config/environment.js');

            expect(() => validateProductionConfig()).not.toThrow();
        });
    });
});
