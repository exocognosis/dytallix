/**
 * Faucet Routes
 * Proxy requests to the faucet service
 */

import express from 'express';
import { logError } from '../logger.js';
import { checkRateLimit, fundAddress, getFaucetStatus } from '../services/faucetService.js';

const router = express.Router();

/**
 * POST /request
 * Fund a wallet with testnet tokens
 */
router.post('/request', async (req, res) => {
    try {
        const { address, dgt_amount, drt_amount } = req.body;

        if (!address || !address.startsWith('dyt')) {
            return res.status(400).json({ error: 'INVALID_ADDRESS', message: 'Address must start with "dyt"' });
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
        res.status(500).json({
            error: 'FAUCET_ERROR',
            message: error.message
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
