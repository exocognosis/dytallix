/**
 * Centralized Configuration Module
 * Single source of truth for all server configuration values
 */

export const CONFIG = {
    // Server Configuration
    server: {
        port: parseInt(
            process.env.API_PORT || process.env.BACKEND_API_PORT || process.env.PORT || '8787',
            10
        ),
        allowedOrigin: process.env.ALLOWED_ORIGIN || 'https://dytallix.com',
        nodeEnv: process.env.NODE_ENV || 'development',
    },

    // Chain Configuration
    chain: {
        get prefix() {
            return process.env.CHAIN_PREFIX || process.env.BECH32_PREFIX || 'dytallix';
        },
        get rpcHttp() {
            return process.env.VITE_RPC_HTTP_URL || process.env.RPC_HTTP_URL;
        },
        get blockchainNode() {
            return process.env.NODE_RPC_URL || process.env.BLOCKCHAIN_NODE_URL || 'http://localhost:3003';
        },
    },

    // Faucet Configuration
    faucet: {
        get url() {
            return (process.env.FAUCET_URL || 'http://localhost:3004').replace(/\/$/, '');
        },
        get cooldownMinutes() {
            return parseInt(process.env.FAUCET_COOLDOWN_MINUTES || '60', 10);
        },
        get maxDGT() {
            return parseInt(process.env.FAUCET_MAX_PER_REQUEST_DGT || '2', 10);
        },
        get maxDRT() {
            return parseInt(process.env.FAUCET_MAX_PER_REQUEST_DRT || '50', 10);
        },
    },

    // Security Configuration
    security: {
        enableHeaders: process.env.ENABLE_SEC_HEADERS === '1',
        enableCSP: process.env.ENABLE_CSP === '1' || process.env.ENABLE_SEC_HEADERS === '1',
    },

    // AI Oracle Configuration
    aiOracle: {
        url: (process.env.AI_ORACLE_URL || 'http://localhost:7000/api/ai/risk').replace(/\/$/, ''),
        timeoutMs: Math.max(250, parseInt(process.env.AI_ORACLE_TIMEOUT_MS || '1000', 10)),
    },

    // Node Cluster Ports
    nodePorts: {
        seed: 3010,
        validator1: 3011,
        validator2: 3012,
        validator3: 3013,
        rpc: 3014,
    },

    // Demo Mode Detection
    get demoMode() {
        return (!process.env.FAUCET_MNEMONIC || process.env.FAUCET_MNEMONIC.includes('placeholder'))
            || !(process.env.RPC_HTTP_URL || process.env.RPC_URL || process.env.VITE_RPC_HTTP_URL);
    },
};

/**
 * Validate required configuration for production
 */
export function validateProductionConfig() {
    if (CONFIG.server.nodeEnv === 'production') {
        const requiredSecrets = ['FAUCET_MNEMONIC'];
        const missing = requiredSecrets.filter(
            secret => !process.env[secret] || process.env[secret].includes('placeholder')
        );

        if (missing.length > 0) {
            throw new Error(`Production startup failed: missing required secrets: ${missing.join(', ')}`);
        }
    }
}

/**
 * Collect CSP connect-src origins from environment
 */
export function collectConnectSrc() {
    const candidates = [
        process.env.VITE_LCD_HTTP_URL,
        process.env.VITE_RPC_HTTP_URL,
        process.env.VITE_RPC_WS_URL,
        process.env.RPC_HTTP_URL,
        process.env.RPC_URL,
        process.env.VITE_API_URL,
        process.env.VITE_FAUCET_URL,
    ].filter(Boolean);

    const origins = new Set(["'self'"]);
    for (const c of candidates) {
        try {
            const u = new URL(c);
            origins.add(u.origin);
        } catch {
            /* ignore malformed */
        }
    }

    return Array.from(origins).join(' ');
}
