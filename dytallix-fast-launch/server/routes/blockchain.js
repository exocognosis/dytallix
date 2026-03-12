/**
 * Blockchain Routes
 * Proxy routes for wallet compatibility (status, balance, account, submit)
 */

import express from 'express';
import { CONFIG } from '../config/environment.js';

const router = express.Router();
const SIGNED_TX_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHED_SIGNED_TXS = 200;
const signedTxEnvelopeCache = new Map();
const DUMMY_WEB_WALLET_PUBLIC_KEY = 'ZHVtbXlfcHViX2tleQ==';
const DUMMY_WEB_WALLET_SIGNATURE = 'ZHVtbXlfc2lnbmF0dXJl';

const readJsonResponse = async (response, fallbackError) => {
    const text = await response.text();
    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            error: fallbackError,
            message: text,
        };
    }
};

const cacheSignedTxEnvelope = (rawEnvelope) => {
    if (!rawEnvelope) {
        return;
    }

    try {
        const payload = JSON.parse(rawEnvelope);
        const signature = payload?.signed_tx?.signature;
        if (typeof signature !== 'string' || !signature) {
            return;
        }

        signedTxEnvelopeCache.set(signature, {
            rawEnvelope,
            expiresAt: Date.now() + SIGNED_TX_CACHE_TTL_MS,
        });

        const now = Date.now();
        for (const [key, entry] of signedTxEnvelopeCache.entries()) {
            if (!entry || entry.expiresAt <= now) {
                signedTxEnvelopeCache.delete(key);
            }
        }

        while (signedTxEnvelopeCache.size > MAX_CACHED_SIGNED_TXS) {
            const oldestKey = signedTxEnvelopeCache.keys().next().value;
            if (!oldestKey) {
                break;
            }
            signedTxEnvelopeCache.delete(oldestKey);
        }
    } catch {
        // Ignore cache population for malformed payloads and fall back to normal proxy behavior.
    }
};

const getCachedSignedTxEnvelope = (signedTx) => {
    const signature = signedTx?.signature;
    if (typeof signature !== 'string' || !signature) {
        return null;
    }

    const entry = signedTxEnvelopeCache.get(signature);
    if (!entry) {
        return null;
    }

    if (entry.expiresAt <= Date.now()) {
        signedTxEnvelopeCache.delete(signature);
        return null;
    }

    return entry.rawEnvelope;
};

const getNodePathFromRequest = (req) => {
    const originalPath = req.originalUrl || req.url || '/';
    return originalPath.replace(/^\/api\/blockchain/, '') || '/';
};

const proxyNodeGet = async (req, res, next, { fallbackError = 'NODE_PROXY_FAILED', responseType = 'json' } = {}) => {
    try {
        const response = await fetch(`${CONFIG.chain.blockchainNode}${getNodePathFromRequest(req)}`);

        if (responseType === 'text') {
            const text = await response.text();
            const contentType = response.headers.get('content-type');
            if (contentType) {
                res.type(contentType);
            }
            return res.status(response.status).send(text);
        }

        const data = await readJsonResponse(response, fallbackError);
        return res.status(response.status).json(data);
    } catch (err) {
        next(err);
    }
};

const isLegacyDummySignedTx = (signedTx) => (
    Boolean(signedTx?.tx)
    && signedTx.public_key === DUMMY_WEB_WALLET_PUBLIC_KEY
    && signedTx.signature === DUMMY_WEB_WALLET_SIGNATURE
);

const createNodeWalletKeypair = async () => {
    const response = await fetch(`${CONFIG.chain.blockchainNode}/wallet/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await readJsonResponse(response, 'WALLET_CREATE_FAILED');

    if (!response.ok) {
        const error = new Error(data.message || data.error || 'Failed to create wallet keypair');
        error.statusCode = response.status;
        error.responseData = data;
        throw error;
    }

    if (!data.private_key || !data.public_key) {
        const error = new Error('Wallet keypair response was incomplete');
        error.statusCode = 502;
        error.responseData = {
            error: 'WALLET_CREATE_FAILED',
            message: 'Wallet keypair response was incomplete',
        };
        throw error;
    }

    return data;
};

const signAndSubmitWithNodeWallet = async (tx) => {
    const keypair = await createNodeWalletKeypair();
    const signPayload = {
        tx,
        public_key: keypair.public_key,
        private_key: keypair.private_key,
    };

    const signResponse = await fetch(`${CONFIG.chain.blockchainNode}/wallet/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signPayload),
    });
    const signText = await signResponse.text();
    cacheSignedTxEnvelope(signText);

    if (!signResponse.ok) {
        let signData = {};
        try {
            signData = signText ? JSON.parse(signText) : {};
        } catch {
            signData = {
                error: 'SIGN_FAILED',
                message: signText || 'Failed to sign transaction',
            };
        }

        const error = new Error(signData.message || signData.error || 'Failed to sign transaction');
        error.statusCode = signResponse.status;
        error.responseData = signData;
        throw error;
    }

    const submitResponse = await fetch(`${CONFIG.chain.blockchainNode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: signText,
    });
    const submitData = await readJsonResponse(submitResponse, 'SUBMIT_FAILED');

    return {
        status: submitResponse.status,
        data: submitData,
    };
};

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

// Proxy explorer/data endpoints that previously went directly to the node through nginx.
router.get('/blocks', async (req, res, next) => {
    await proxyNodeGet(req, res, next, { fallbackError: 'BLOCKS_FETCH_FAILED' });
});

router.get('/block/:id', async (req, res, next) => {
    await proxyNodeGet(req, res, next, { fallbackError: 'BLOCK_FETCH_FAILED' });
});

router.get('/transactions', async (req, res, next) => {
    await proxyNodeGet(req, res, next, { fallbackError: 'TRANSACTIONS_FETCH_FAILED' });
});

router.get('/transactions/pending', async (req, res, next) => {
    await proxyNodeGet(req, res, next, { fallbackError: 'PENDING_TRANSACTIONS_FETCH_FAILED' });
});

router.get('/transactions/:hash', async (req, res, next) => {
    await proxyNodeGet(req, res, next, { fallbackError: 'TRANSACTION_FETCH_FAILED' });
});

router.get('/tx/:hash', async (req, res, next) => {
    await proxyNodeGet(req, res, next, { fallbackError: 'TRANSACTION_FETCH_FAILED' });
});

router.get('/metrics', async (req, res, next) => {
    await proxyNodeGet(req, res, next, { fallbackError: 'METRICS_FETCH_FAILED', responseType: 'text' });
});

router.get('/api/anchored-assets', async (req, res, next) => {
    await proxyNodeGet(req, res, next, { fallbackError: 'ANCHORED_ASSETS_FETCH_FAILED' });
});

router.get('/api/staking/validators', async (req, res, next) => {
    await proxyNodeGet(req, res, next, { fallbackError: 'STAKING_VALIDATORS_FETCH_FAILED' });
});

// Proxy /wallet/create (generate a real PQC keypair for the browser wallet)
router.post('/wallet/create', async (_req, res, next) => {
    try {
        const response = await fetch(`${CONFIG.chain.blockchainNode}/wallet/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json().catch(() => ({}));
        res.status(response.status).json(data);
    } catch (err) {
        next(err);
    }
});

// Proxy /wallet/sign (sign a transaction with browser-supplied wallet material)
router.post('/wallet/sign', async (req, res, next) => {
    try {
        const response = await fetch(`${CONFIG.chain.blockchainNode}/wallet/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const signText = await response.text();
        cacheSignedTxEnvelope(signText);

        if (!signText) {
            return res.status(response.status).json({});
        }

        return res
            .status(response.status)
            .type('application/json')
            .send(signText);
    } catch (err) {
        next(err);
    }
});

// Proxy /wallet/sign-submit so the signed payload stays server-side between sign and submit.
router.post('/wallet/sign-submit', async (req, res, next) => {
    try {
        const signResponse = await fetch(`${CONFIG.chain.blockchainNode}/wallet/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });
        const signText = await signResponse.text();
        cacheSignedTxEnvelope(signText);

        if (!signResponse.ok) {
            let signData = {};
            try {
                signData = signText ? JSON.parse(signText) : {};
            } catch {
                signData = {
                    error: 'SIGN_FAILED',
                    message: signText || 'Failed to sign transaction',
                };
            }
            return res.status(signResponse.status).json(signData);
        }

        const submitResponse = await fetch(`${CONFIG.chain.blockchainNode}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: signText,
        });
        const submitData = await readJsonResponse(submitResponse, 'SUBMIT_FAILED');
        return res.status(submitResponse.status).json(submitData);
    } catch (err) {
        next(err);
    }
});

// Proxy /submit (Transaction Broadcast)
router.post('/submit', async (req, res, next) => {
    try {
        // The currently deployed wallet bundle submits a dummy signature; replace it server-side.
        if (isLegacyDummySignedTx(req.body?.signed_tx)) {
            const submitResult = await signAndSubmitWithNodeWallet(req.body.signed_tx.tx);
            return res.status(submitResult.status).json(submitResult.data);
        }

        const cachedEnvelope = getCachedSignedTxEnvelope(req.body?.signed_tx);
        const response = await fetch(`${CONFIG.chain.blockchainNode}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: cachedEnvelope || JSON.stringify(req.body),
        });
        const data = await response.json().catch(() => ({}));
        res.status(response.status).json(data);
    } catch (err) {
        next(err);
    }
});

export default router;
