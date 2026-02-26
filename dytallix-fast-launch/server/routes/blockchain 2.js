/**
 * Blockchain Routes
 * Proxy routes for wallet compatibility (status, balance, account, submit)
 */

import express from 'express/lib/express.js';
import { CONFIG } from '../config/environment.js';

const router = express.Router();

// Proxy /status to Node (for chain_id check)
router.get('/status', async (req, res, next) => {
    try {
        const response = await fetch(`${CONFIG.chain.blockchainNode}/status`);
        const data = await response.json().catch(() => ({}));
        // Unwrap Tendermint RPC result if needed, or pass through custom node status
        if (data.result && data.result.node_info) {
            res.json({ chain_id: data.result.node_info.network, ...data });
        } else {
            res.status(response.status).json(data);
        }
    } catch (err) {
        next(err);
    }
});

// Proxy /balance/:address
router.get('/balance/:address', async (req, res, next) => {
    try {
        const response = await fetch(`${CONFIG.chain.blockchainNode}/balance/${req.params.address}`);
        const data = await response.json().catch(() => ({}));
        res.status(response.status).json(data);
    } catch (err) {
        next(err);
    }
});

// Proxy /account/:address
router.get('/account/:address', async (req, res, next) => {
    try {
        const response = await fetch(`${CONFIG.chain.blockchainNode}/account/${req.params.address}`);
        const data = await response.json().catch(() => ({}));
        res.status(response.status).json(data);
    } catch (err) {
        next(err);
    }
});

// Proxy /submit (Transaction Broadcast)
router.post('/submit', async (req, res, next) => {
    try {
        const response = await fetch(`${CONFIG.chain.blockchainNode}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const data = await response.json().catch(() => ({}));
        res.status(response.status).json(data);
    } catch (err) {
        next(err);
    }
});

export default router;
