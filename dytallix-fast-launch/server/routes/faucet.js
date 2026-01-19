/**
 * Faucet Routes
 * Proxy requests to the faucet service
 */

import express from 'express';
import { logError } from '../logger.js';
import { CONFIG } from '../config/environment.js';

const router = express.Router();

// Faucet Service Proxy
router.use('/', async (req, res, next) => {
    try {
        const url = `${CONFIG.faucet.url}/api/faucet${req.url === '/' ? '' : req.url}`;
        const options = {
            method: req.method,
            headers: { 'Content-Type': 'application/json' },
        };

        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            options.body = JSON.stringify(req.body);
        }

        const response = await fetch(url, options);
        const data = await response.json().catch(() => ({}));

        // Forward status code
        res.status(response.status).json(data);
    } catch (err) {
        logError('Faucet proxy failed', { error: err.message, url: req.url });
        res.status(502).json({
            error: 'FAUCET_SERVICE_UNAVAILABLE',
            message: 'Faucet service is currently unreachable',
        });
    }
});

export default router;
