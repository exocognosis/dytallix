/**
 * Faucet Routes
 * Proxy requests to the faucet service
 */

import express from 'express/lib/express.js';
import { logError } from '../logger.js';
import { CONFIG } from '../config/environment.js';
import { checkRateLimit, fundAddress, getFaucetStatus } from '../services/faucetService.js';

const router = express.Router();

/**
 * POST /request
 * Fund a wallet with testnet tokens
 */
router.post('/request', async (req, res) => {
    try {
        const { address, token } = req.body;
        let { dgt_amount, drt_amount } = req.body;

        if (!address || !address.startsWith('dyt')) {
            return res.status(400).json({ error: 'INVALID_ADDRESS', message: 'Address must start with "dyt"' });
        }

        // Backward compatibility: some clients submit { token: 'DGT' | 'DRT' }
        // instead of explicit amount fields.
        if ((dgt_amount == null && drt_amount == null) && token) {
            if (token === 'DGT') {
                dgt_amount = CONFIG.faucet.maxDGT || 1000;
                drt_amount = 0;
            } else if (token === 'DRT') {
                dgt_amount = 0;
                drt_amount = CONFIG.faucet.maxDRT || 10000;
            } else {
                return res.status(400).json({
                    error: 'INVALID_TOKEN',
                    message: 'Token must be DGT or DRT'
                });
            }
        }

        if ((dgt_amount == null && drt_amount == null) && !token) {
            return res.status(400).json({
                error: 'INVALID_REQUEST',
                message: 'Provide token or dgt_amount/drt_amount'
            });
        }

        const rateCheck = checkRateLimit(address);
        if (!rateCheck.allowed) {
            return res.status(429).json({
                error: 'RATE_LIMIT_EXCEEDED',
                message: `Too many requests. Try again in ${rateCheck.timeUntilNext} minutes.`,
                retryAfter: rateCheck.timeUntilNext * 60
            });
        }

        const result = await fundAddress(address, dgt_amount, drt_amount);
        res.json(result);

    } catch (error) {
        const message = error?.message || 'Unknown faucet error';
        const isUpstreamFailure =
            message.includes('Blockchain node rejected faucet request')
            || message.includes('fetch failed')
            || message.includes('ECONNREFUSED')
            || message.includes('ENOTFOUND')
            || message.includes('Invalid amounts');

        if (isUpstreamFailure) {
            return res.status(502).json({
                error: 'FAUCET_UNAVAILABLE',
                message
            });
        }

        res.status(500).json({
            error: 'FAUCET_ERROR',
            message
        });
    }
});

/**
 * GET /status
 * Public faucet status
 */
router.get('/status', (req, res) => {
    res.json(getFaucetStatus());
});

/**
 * GET /check/:address
 * Check eligibility for an address
 */
router.get('/check/:address', (req, res) => {
    const { address } = req.params;
    const rateCheck = checkRateLimit(address);
    res.json({
        address,
        allowed: rateCheck.allowed,
        ...(!rateCheck.allowed && { timeUntilNext: rateCheck.timeUntilNext })
    });
});

export default router;
