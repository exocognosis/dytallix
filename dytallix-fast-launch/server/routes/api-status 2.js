/**
 * API Status Routes
 * System status, node cluster info, and health checks
 */

import express from 'express/lib/express.js';
import { fetchNodeStatus, nodeGet } from '../services/blockchain-client.js';
import { CONFIG } from '../config/environment.js';
import { logError, logInfo, logWarn } from '../logger.js';

const router = express.Router();

// Standardized API status endpoint
router.get('/status', async (req, res, next) => {
    try {
        const started = Date.now();
        let network = 'unknown';
        let nodeStatus = false;
        let height = 0;

        try {
            const nodeInfo = await fetchNodeStatus();
            network = nodeInfo.network || 'dytallix-testnet-1';
            height = nodeInfo.height || 0;
            nodeStatus = true;
        } catch (nodeErr) {
            logError('Node status check failed', nodeErr);
        }

        // Calculate KPIs from recent blocks
        let tps = 0;
        let avgLatency = 0;
        let networkLoad = 0;
        let activeValidators = 1; // Default to 1 (self)

        try {
            // Fetch last 10 blocks for stats
            const blocksRes = await nodeGet('/blocks?limit=10');
            const blocks = blocksRes.blocks || [];

            if (blocks.length >= 2) {
                const getTimeSeconds = (t) => {
                    if (typeof t === 'number') return t;
                    return new Date(t).getTime() / 1000;
                };
                const newestTime = getTimeSeconds(blocks[0].block.header.time);
                const oldestTime = getTimeSeconds(blocks[blocks.length - 1].block.header.time);
                const timeDiffSeconds = newestTime - oldestTime;

                if (timeDiffSeconds > 0) {
                    const totalTxs = blocks.reduce((sum, b) => sum + (b.block.data.txs ? b.block.data.txs.length : 0), 0);
                    tps = Math.floor(totalTxs / timeDiffSeconds);
                }

                // Calculate Latency (avg time between blocks)
                avgLatency = Number((timeDiffSeconds / (blocks.length - 1)).toFixed(2));

                // Calculate Network Load (assuming max 1000 txs per block capacity for demo)
                const avgTxsPerBlock = blocks.reduce((sum, b) => sum + (b.block.data.txs ? b.block.data.txs.length : 0), 0) / blocks.length;
                networkLoad = Math.min(100, Math.floor((avgTxsPerBlock / 1000) * 100));
            }
        } catch (e) {
            logWarn('Failed to calculate KPIs', e);
        }

        const response = {
            ok: nodeStatus,
            status: nodeStatus ? 'healthy' : 'offline',
            network,
            latest_height: height,
            height,
            metrics: {
                tps,
                avgLatency,
                networkLoad,
                activeValidators,
            },
            redis: !!process.env.DLX_RATE_LIMIT_REDIS_URL,
            rateLimit: {
                dgtWindowHours: 24,
                drtWindowHours: 6,
                maxRequests: 1,
            },
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        };

        res.json(response);
        logInfo('api.status', { ms: Date.now() - started, network, redis: response.redis });
    } catch (err) {
        next(err);
    }
});

// Proxy endpoint for individual node status
router.get('/nodes/:nodeId/status', async (req, res, next) => {
    try {
        const { nodeId } = req.params;
        const port = CONFIG.nodePorts[nodeId];

        if (!port) {
            return res.status(404).json({ error: 'Node not found' });
        }

        const nodeUrl = `http://localhost:${port}/status`;
        const response = await fetch(nodeUrl);

        if (!response.ok) {
            throw new Error(`Node returned status ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (err) {
        logError('Node proxy error', { nodeId: req.params.nodeId, error: err.message });
        res.status(503).json({ error: 'Node unavailable', online: false });
    }
});

// Get all nodes status
router.get('/nodes/cluster', async (req, res, next) => {
    try {
        const nodes = [];

        for (const [nodeId, port] of Object.entries(CONFIG.nodePorts)) {
            try {
                const nodeUrl = `http://localhost:${port}/status`;
                const response = await fetch(nodeUrl);
                const data = await response.json();
                nodes.push({
                    id: nodeId,
                    port,
                    online: true,
                    ...data,
                });
            } catch (err) {
                nodes.push({
                    id: nodeId,
                    port,
                    online: false,
                });
            }
        }

        res.json({ nodes });
    } catch (err) {
        next(err);
    }
});

export default router;
