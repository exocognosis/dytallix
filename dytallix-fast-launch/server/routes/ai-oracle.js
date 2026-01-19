/**
 * AI Oracle Routes
 * AI risk scoring for transactions
 */

import express from 'express';
import { nodeGet } from '../services/blockchain-client.js';
import { CONFIG } from '../config/environment.js';
import { logInfo, logWarn } from '../logger.js';
import { aiOracleRequestsTotal, aiOracleFailuresTotal, aiOracleLatencySeconds } from '../metrics.js';

const router = express.Router();

// AI risk proxy – enrich a transaction receipt with oracle scoring
router.get('/risk/transaction/:hash', async (req, res, next) => {
    const hash = req.params.hash;
    if (typeof hash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
        const err = new Error('INVALID_TX_HASH');
        err.status = 400;
        return next(err);
    }

    const toNumber = (value) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    };

    const started = Date.now();

    try {
        // Try to fetch receipt, but don't fail the whole request if node is down
        let receipt = null;
        try {
            receipt = await nodeGet(`/tx/${encodeURIComponent(hash)}`);
        } catch (e) {
            logWarn('ai.risk.receipt_unavailable', { hash, error: e?.message });
        }

        const payload = {
            tx_hash: receipt?.hash || hash,
            from: receipt?.from || receipt?.sender || null,
            to: receipt?.to || receipt?.recipient || null,
            amount: toNumber(receipt?.amount ?? receipt?.value ?? receipt?.amount_udgt ?? 0),
            fee: toNumber(receipt?.fee ?? receipt?.gas_fee ?? receipt?.gas ?? 0),
            nonce: toNumber(receipt?.nonce ?? receipt?.sequence ?? 0),
        };

        const stopTimer = aiOracleLatencySeconds.startTimer();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.aiOracle.timeoutMs);

        try {
            const aiResponse = await fetch(CONFIG.aiOracle.url, {
                method: 'POST',
                headers: { 'content-type': 'application/json', accept: 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            if (!aiResponse.ok) {
                const err = new Error(`AI_ORACLE_HTTP_${aiResponse.status}`);
                err.status = aiResponse.status;
                throw err;
            }

            const parsed = await aiResponse.json().catch(() => null);
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('AI_ORACLE_INVALID_RESPONSE');
            }

            const scoreValue = Number(parsed.score ?? parsed.ai_risk_score ?? parsed.result);
            const aiScore = Number.isFinite(scoreValue) ? scoreValue : null;

            aiOracleRequestsTotal.inc({ result: 'success' });
            logInfo('ai.risk.enriched', { hash, score: aiScore, ms: Date.now() - started });

            const base = (receipt && typeof receipt === 'object') ? receipt : { hash };
            return res.json({
                ...base,
                ai_risk_score: aiScore,
                ai_risk_model: parsed.model_id || parsed.version || null,
                ai_risk_signature: parsed.signature || null,
                ai_risk_timestamp: parsed.timestamp || parsed.ts || null,
                risk_status: 'ok',
            });
        } catch (err) {
            const reason = err.name === 'AbortError' ? 'timeout' : (err.status ? 'http' : 'exception');
            aiOracleRequestsTotal.inc({ result: 'failure' });
            aiOracleFailuresTotal.inc({ reason });
            logWarn('AI oracle request failed; returning fallback response', { hash, reason, ms: Date.now() - started, error: err.message });
            const base = (receipt && typeof receipt === 'object') ? receipt : { hash };
            return res.json({
                ...base,
                ai_risk_score: null,
                risk_status: 'unavailable',
            });
        } finally {
            clearTimeout(timeout);
            stopTimer();
        }
    } catch (err) {
        next(err);
    }
});

export default router;
