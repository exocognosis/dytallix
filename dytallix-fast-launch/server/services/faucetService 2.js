import { CONFIG } from '../config/environment.js';
import { logError, logInfo } from '../logger.js';

// Rate limiting storage (in-memory)
// TODO: Move to Redis for distributed deployments
const rateLimits = new Map();

// Configuration from environment or defaults
const COOLDOWN_MINUTES = CONFIG.faucet.cooldownMinutes || 60;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;

// Configure defaults if not set in CONFIG
const FAUCET_LIMITS = {
    DGT: {
        amount: CONFIG.faucet.maxDGT || 1000,
        denom: 'udgt',
        microMultiplier: 1_000_000
    },
    DRT: {
        amount: CONFIG.faucet.maxDRT || 10000,
        denom: 'udrt',
        microMultiplier: 1_000_000
    }
};

/**
 * Check rate limit for an address
 * @param {string} address 
 * @returns {Object} Rate limit status
 */
export function checkRateLimit(address) {
    const now = Date.now();
    const userRequests = rateLimits.get(address) || [];

    // Remove old requests
    const recentRequests = userRequests.filter(time => now - time < COOLDOWN_MS);

    if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
        const oldestRequest = Math.min(...recentRequests);
        const timeUntilNext = COOLDOWN_MS - (now - oldestRequest);
        return {
            allowed: false,
            timeUntilNext: Math.ceil(timeUntilNext / 1000 / 60), // minutes
            requestCount: recentRequests.length,
            maxRequests: MAX_REQUESTS_PER_HOUR
        };
    }

    return { allowed: true, requestCount: recentRequests.length };
}

/**
 * Record a successful request
 * @param {string} address 
 */
export function recordRequest(address) {
    const now = Date.now();
    const userRequests = rateLimits.get(address) || [];
    const recentRequests = userRequests.filter(time => now - time < COOLDOWN_MS);
    recentRequests.push(now);
    rateLimits.set(address, recentRequests);
}

/**
 * Fund an address via the blockchain node's dev faucet
 * @param {string} address 
 * @param {number} dgtAmount 
 * @param {number} drtAmount 
 */
export async function fundAddress(address, dgtAmount, drtAmount) {
    try {
        const nodeUrl = CONFIG.chain.blockchainNode; // e.g., http://localhost:3030

        // Ensure inputs are valid numbers
        const dgt = Math.min(dgtAmount || 0, FAUCET_LIMITS.DGT.amount);
        const drt = Math.min(drtAmount || 0, FAUCET_LIMITS.DRT.amount);

        if (dgt <= 0 && drt <= 0) {
            throw new Error('Invalid amounts: must request at least one token type');
        }

        logInfo(`[FaucetService] Requesting funding from node at ${nodeUrl}/dev/faucet`, { address, dgt, drt });

        const response = await fetch(`${nodeUrl}/dev/faucet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                address,
                udgt: dgt * FAUCET_LIMITS.DGT.microMultiplier,
                udrt: drt * FAUCET_LIMITS.DRT.microMultiplier
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Blockchain node rejected faucet request: ${errorText}`);
        }

        const result = await response.json();

        // Record success for rate limiting
        recordRequest(address);

        return {
            success: true,
            txHash: result.tx_hash || result.hash, // Adapt to node response format
            funded: { dgt, drt },
            message: 'Tokens sent successfully'
        };

    } catch (error) {
        logError('Faucet funding failed', { address, error: error.message });
        throw error; // Re-throw for router to handle
    }
}

export function getFaucetStatus() {
    return {
        status: 'operational',
        limits: {
            dgt: FAUCET_LIMITS.DGT.amount,
            drt: FAUCET_LIMITS.DRT.amount,
            cooldownMinutes: COOLDOWN_MINUTES,
            maxRequestsPerHour: MAX_REQUESTS_PER_HOUR
        },
        activeUsers: rateLimits.size
    };
}
