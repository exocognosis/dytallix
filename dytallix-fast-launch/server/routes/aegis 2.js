/**
 * Aegis API Routes
 * REST endpoints for transaction risk analysis
 */

import express from 'express/lib/express.js';
import {
    analyzeTransaction,
    analyzeWallet,
    getAegisStats,
    getRecentAnalyses,
    getPublicKeys,
    verifySignature
} from '../services/aegis/index.js';
import { getAegisInsights } from '../services/aegis/insights.js';
import {
    getTransactionAnalysis,
    getWalletScore,
    saveValidatorFeedback,
    getOracleReputation
} from '../services/aegis/database.js';
import { getRiskLevel } from '../services/aegis/risk-scoring.js';
import { getThrottleStatus, getThrottledWallets, clearThrottle } from '../services/aegis/throttle.js';
import {
    getQueuedTransactions,
    getQueuedTransaction,
    approveTransaction,
    rejectTransaction,
    getQueueStats
} from '../services/aegis/review-queue.js';
import { nodeGet, getNodeBase } from '../services/blockchain-client.js';
import { aegisWebSocket } from '../services/aegis/websocket.js';
import { logInfo, logError } from '../logger.js';
import { getAegisSecurityPosture } from '../services/aegis/posture.js';

const router = express.Router();

const VALID_SEARCH_TYPES = new Set(['auto', 'wallet', 'transaction', 'block', 'attestation', 'anchoring']);

const normalizeSearchType = (value) => {
    const normalized = String(value || 'auto').trim().toLowerCase();
    if (normalized === 'tx') return 'transaction';
    if (normalized === 'anchor') return 'anchoring';
    if (normalized === 'attest') return 'attestation';
    return VALID_SEARCH_TYPES.has(normalized) ? normalized : 'auto';
};

const looksLikeWalletAddress = (value) => (
    /^(dytallix1[0-9a-z]{20,}|dytallix[0-9a-f]{40}|[a-z]{2,}1[0-9a-z]{20,})$/i.test(value)
);

const looksLikeTxHash = (value) => /^(0x)?[a-f0-9]{64}$/i.test(value);

const stripSearchPrefix = (query) => String(query || '')
    .replace(/^(attestation|attest|anchor|anchoring)\s*:\s*/i, '')
    .replace(/^oracle:ai:/i, '')
    .trim();

const detectSearchType = (query, hint = 'auto') => {
    const typeHint = normalizeSearchType(hint);
    if (typeHint !== 'auto') return typeHint;

    const raw = String(query || '').trim();
    if (!raw) return 'auto';

    if (/^(attestation|attest)\s*:/i.test(raw) || /^oracle:ai:/i.test(raw)) {
        return 'attestation';
    }
    if (/^(anchor|anchoring)\s*:/i.test(raw)) {
        return 'anchoring';
    }
    if (/^\d+$/.test(raw)) {
        return 'block';
    }
    if (looksLikeWalletAddress(raw)) {
        return 'wallet';
    }
    if (looksLikeTxHash(raw)) {
        return 'transaction';
    }
    return 'wallet';
};

const normalizeRiskScore = (rawScore) => {
    const score = Number(rawScore);
    if (!Number.isFinite(score)) return null;
    const normalized = score <= 1 ? score * 100 : score;
    return Math.max(0, Math.min(100, Math.round(normalized)));
};

const deriveRecommendation = (riskScore) => {
    if (!Number.isFinite(riskScore)) return 'UNKNOWN';
    if (riskScore >= 90) return 'REVIEW';
    if (riskScore >= 70) return 'DELAY';
    if (riskScore >= 40) return 'CAUTION';
    return 'APPROVE';
};

const buildRiskSummary = (riskScore, confidence = null) => {
    const normalizedScore = normalizeRiskScore(riskScore);
    if (normalizedScore === null) return null;
    return {
        risk_score: normalizedScore,
        risk_level: getRiskLevel(normalizedScore),
        confidence: Number.isFinite(Number(confidence)) ? Number(confidence) : null,
        recommendation: deriveRecommendation(normalizedScore)
    };
};

const toIso = (value) => {
    if (!value) return null;
    const epoch = new Date(value).getTime();
    return Number.isFinite(epoch) ? new Date(epoch).toISOString() : null;
};

const txHashCandidates = (txHash) => {
    const raw = String(txHash || '').trim();
    if (!raw) return [];
    if (raw.startsWith('0x')) return [raw];
    return [raw, `0x${raw}`];
};

const findTransactionAnalysis = (txHash) => {
    for (const candidate of txHashCandidates(txHash)) {
        const cached = getTransactionAnalysis(candidate);
        if (cached) {
            return { analysis: cached, tx_hash: candidate };
        }
    }
    return null;
};

const fetchNodeTx = async (txHash) => {
    for (const candidate of txHashCandidates(txHash)) {
        try {
            const tx = await nodeGet(`/tx/${encodeURIComponent(candidate)}`);
            return { tx, tx_hash: candidate };
        } catch {
            // keep trying candidates
        }
    }
    return null;
};

const fetchAiRiskAttestation = async (txHash) => {
    const candidates = txHashCandidates(txHash);
    if (candidates.length === 0) return null;

    try {
        const response = await fetch(`${getNodeBase()}/oracle/ai_risk_query_batch`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(candidates)
        });
        if (!response.ok) return null;
        const payload = await response.json().catch(() => ({}));
        const found = Array.isArray(payload?.found) ? payload.found : [];
        return found[0] || null;
    } catch {
        return null;
    }
};

const evaluateBlockRisk = async (block) => {
    const txs = Array.isArray(block?.txs) ? block.txs : [];
    if (txs.length === 0) {
        return {
            risk: null,
            sampled_transactions: 0,
            analyzed_transactions: 0,
            high_risk_transactions: 0,
            max_risk_score: null
        };
    }

    const sampled = txs.slice(0, 25);
    const scoreSamples = await Promise.all(sampled.map(async (tx) => {
        if (!tx?.hash) return null;

        const cached = findTransactionAnalysis(tx.hash);
        if (cached?.analysis) {
            return normalizeRiskScore(cached.analysis.risk_score);
        }

        const nodeTx = await fetchNodeTx(tx.hash);
        return normalizeRiskScore(nodeTx?.tx?.ai_risk_score);
    }));

    const scores = scoreSamples.filter((value) => Number.isFinite(value));
    if (scores.length === 0) {
        return {
            risk: null,
            sampled_transactions: sampled.length,
            analyzed_transactions: 0,
            high_risk_transactions: 0,
            max_risk_score: null
        };
    }

    const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const highRiskTransactions = scores.filter((score) => score >= 70).length;

    return {
        risk: buildRiskSummary(averageScore),
        sampled_transactions: sampled.length,
        analyzed_transactions: scores.length,
        high_risk_transactions: highRiskTransactions,
        max_risk_score: maxScore
    };
};

/**
 * POST /api/aegis/analyze
 * Analyze a transaction for risk
 */
router.post('/analyze', async (req, res, next) => {
    try {
        const { tx_hash, from, to, amount } = req.body;

        // Validate required fields
        if (!from) {
            return res.status(400).json({
                error: 'Missing required field: from'
            });
        }

        // Generate tx_hash if not provided
        const txHash = tx_hash || `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

        const result = await analyzeTransaction({
            tx_hash: txHash,
            from,
            to: to || null,
            amount: parseFloat(amount) || 0
        });

        res.json({
            success: true,
            analysis: result
        });
    } catch (error) {
        logError('Transaction analysis endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Analysis failed',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/score/:address
 * Get risk score for a wallet address
 */
router.get('/score/:address', async (req, res, next) => {
    try {
        const { address } = req.params;

        if (!address) {
            return res.status(400).json({
                error: 'Address required'
            });
        }

        // Try to get from database first
        let walletScore = getWalletScore(address);

        // If not in database, analyze the wallet
        if (!walletScore) {
            logInfo('Wallet not in database, performing analysis', { address });
            const analysis = await analyzeWallet(address);
            walletScore = getWalletScore(address);

            return res.json({
                success: true,
                wallet: {
                    address,
                    risk_score: analysis.risk_score,
                    confidence: analysis.confidence,
                    risk_level: analysis.risk_level,
                    breakdown: analysis.breakdown,
                    metadata: analysis.wallet_metadata,
                    freshly_analyzed: true
                }
            });
        }

        res.json({
            success: true,
            wallet: {
                address: walletScore.address,
                risk_score: walletScore.current_score,
                total_transactions: walletScore.total_transactions,
                first_seen: walletScore.first_seen,
                last_analyzed: walletScore.last_analyzed,
                metadata: walletScore.metadata,
                freshly_analyzed: false
            }
        });
    } catch (error) {
        logError('Wallet score endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get wallet score',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/search?q=...&type=auto|wallet|transaction|block|attestation|anchoring
 * Unified lookup with risk analysis enrichment for wallets, txs, blocks, and attestations.
 */
router.get('/search', async (req, res) => {
    try {
        const rawQuery = String(req.query.q || '').trim();
        if (!rawQuery) {
            return res.status(400).json({
                error: 'Missing required query parameter: q'
            });
        }

        const typeHint = normalizeSearchType(req.query.type);
        const detectedType = detectSearchType(rawQuery, typeHint);
        const searchValue = stripSearchPrefix(rawQuery);

        if (!searchValue) {
            return res.status(400).json({
                error: 'Invalid query value'
            });
        }

        if (detectedType === 'wallet') {
            let walletScore = getWalletScore(searchValue);
            let walletPayload = null;

            if (!walletScore) {
                const analysis = await analyzeWallet(searchValue);
                walletScore = getWalletScore(searchValue);
                walletPayload = {
                    address: searchValue,
                    risk_score: analysis.risk_score,
                    confidence: analysis.confidence,
                    risk_level: analysis.risk_level,
                    breakdown: analysis.breakdown,
                    metadata: analysis.wallet_metadata,
                    freshly_analyzed: true
                };
            } else {
                walletPayload = {
                    address: walletScore.address,
                    risk_score: walletScore.current_score,
                    confidence: null,
                    risk_level: getRiskLevel(walletScore.current_score),
                    breakdown: null,
                    metadata: walletScore.metadata,
                    total_transactions: walletScore.total_transactions,
                    first_seen: toIso(walletScore.first_seen),
                    last_analyzed: toIso(walletScore.last_analyzed),
                    freshly_analyzed: false
                };
            }

            const throttle = getThrottleStatus(searchValue);
            return res.json({
                success: true,
                type: 'wallet',
                query: searchValue,
                risk: buildRiskSummary(walletPayload.risk_score, walletPayload.confidence),
                wallet: walletPayload,
                throttle,
                timestamp: new Date().toISOString()
            });
        }

        if (detectedType === 'transaction') {
            const cached = findTransactionAnalysis(searchValue);
            const cachedAnalysis = cached?.analysis || null;
            const nodeTxLookup = cachedAnalysis ? null : await fetchNodeTx(searchValue);
            const nodeTx = nodeTxLookup?.tx || null;
            const txHash = cached?.tx_hash || nodeTxLookup?.tx_hash || txHashCandidates(searchValue)[0] || searchValue;
            let source = cachedAnalysis ? 'aegis-database' : 'node';

            let risk = null;
            if (cachedAnalysis) {
                risk = buildRiskSummary(cachedAnalysis.risk_score, cachedAnalysis.confidence);
            } else {
                const nodeRisk = buildRiskSummary(nodeTx?.ai_risk_score, nodeTx?.ai_confidence);
                if (nodeRisk) {
                    source = 'node-attestation';
                    risk = nodeRisk;
                } else if (nodeTx?.from) {
                    // On-demand risk pass for historical txs that do not yet have a local Aegis score.
                    const txAmount = Number.parseFloat(nodeTx?.amount ?? nodeTx?.value ?? '0') || 0;
                    const analyzed = await analyzeTransaction({
                        tx_hash: txHash,
                        from: nodeTx.from,
                        to: nodeTx.to || null,
                        amount: txAmount
                    });
                    source = 'aegis-on-demand';
                    risk = buildRiskSummary(analyzed?.analysis?.risk_score, analyzed?.analysis?.confidence);
                }
            }

            const attestation = await fetchAiRiskAttestation(txHash);
            if (!cachedAnalysis && !nodeTx && !attestation) {
                return res.status(404).json({
                    error: 'Transaction not found',
                    tx_hash: searchValue
                });
            }

            return res.json({
                success: true,
                type: 'transaction',
                query: searchValue,
                source,
                risk,
                transaction: {
                    tx_hash: cachedAnalysis?.tx_hash || txHash,
                    from_address: cachedAnalysis?.from_address || nodeTx?.from || null,
                    to_address: cachedAnalysis?.to_address || nodeTx?.to || null,
                    amount: cachedAnalysis?.amount ?? (Number.parseFloat(nodeTx?.amount ?? nodeTx?.value ?? '0') || 0),
                    status: nodeTx?.status || 'analyzed',
                    block_height: nodeTx?.block_height ?? nodeTx?.height ?? null,
                    created_at: toIso(cachedAnalysis?.created_at || nodeTx?.timestamp || nodeTx?.time)
                },
                attestation,
                timestamp: new Date().toISOString()
            });
        }

        if (detectedType === 'block') {
            const block = await nodeGet(`/block/${encodeURIComponent(searchValue)}`);
            const blockRisk = await evaluateBlockRisk(block);

            return res.json({
                success: true,
                type: 'block',
                query: searchValue,
                risk: blockRisk.risk,
                block_risk: blockRisk,
                block: {
                    height: block?.height ?? null,
                    hash: block?.hash ?? null,
                    timestamp: toIso(block?.timestamp),
                    tx_count: Array.isArray(block?.txs) ? block.txs.length : 0,
                    asset_hashes: Array.isArray(block?.asset_hashes) ? block.asset_hashes : []
                },
                timestamp: new Date().toISOString()
            });
        }

        if (detectedType === 'attestation') {
            const attestation = await fetchAiRiskAttestation(searchValue);
            if (!attestation) {
                return res.status(404).json({
                    error: 'Attestation not found for transaction hash',
                    tx_hash: searchValue
                });
            }

            return res.json({
                success: true,
                type: 'attestation',
                query: searchValue,
                risk: buildRiskSummary(attestation.risk_score, attestation.confidence),
                attestation,
                timestamp: new Date().toISOString()
            });
        }

        if (detectedType === 'anchoring') {
            const anchorLookupValue = searchValue.toLowerCase();
            let anchorBlock = null;
            let fullBlock = null;

            if (/^\d+$/.test(searchValue) || looksLikeTxHash(searchValue)) {
                try {
                    const block = await nodeGet(`/block/${encodeURIComponent(searchValue)}`);
                    if (Array.isArray(block?.asset_hashes) && block.asset_hashes.length > 0) {
                        fullBlock = block;
                        anchorBlock = {
                            height: block.height,
                            hash: block.hash,
                            timestamp: block.timestamp,
                            asset_hashes: block.asset_hashes,
                            txs: Array.isArray(block.txs) ? block.txs.length : 0
                        };
                    }
                } catch {
                    // fallback to anchored-assets list below
                }
            }

            if (!anchorBlock) {
                const anchoredAssets = await nodeGet('/api/anchored-assets');
                const blocks = Array.isArray(anchoredAssets?.blocks) ? anchoredAssets.blocks : [];
                anchorBlock = blocks.find((block) => {
                    const matchesHeight = String(block?.height) === searchValue;
                    const matchesHash = String(block?.hash || '').toLowerCase() === anchorLookupValue;
                    const matchesAssetHash = Array.isArray(block?.asset_hashes)
                        && block.asset_hashes.some((assetHash) => String(assetHash).toLowerCase().includes(anchorLookupValue));
                    return matchesHeight || matchesHash || matchesAssetHash;
                }) || null;

                if (anchorBlock) {
                    try {
                        fullBlock = await nodeGet(`/block/${encodeURIComponent(anchorBlock.height)}`);
                    } catch {
                        fullBlock = null;
                    }
                }
            }

            if (!anchorBlock) {
                return res.status(404).json({
                    error: 'Anchoring record not found',
                    query: searchValue
                });
            }

            const blockRisk = await evaluateBlockRisk(fullBlock || anchorBlock);
            const txCount = fullBlock
                ? (Array.isArray(fullBlock?.txs) ? fullBlock.txs.length : 0)
                : Number(anchorBlock?.txs || 0);

            return res.json({
                success: true,
                type: 'anchoring',
                query: searchValue,
                risk: blockRisk.risk,
                anchor_risk: blockRisk,
                anchor: {
                    height: anchorBlock.height ?? null,
                    hash: anchorBlock.hash ?? null,
                    timestamp: toIso(anchorBlock.timestamp),
                    tx_count: txCount,
                    asset_hashes: Array.isArray(anchorBlock.asset_hashes) ? anchorBlock.asset_hashes : []
                },
                timestamp: new Date().toISOString()
            });
        }

        return res.status(400).json({
            error: 'Unsupported search type',
            type: detectedType
        });
    } catch (error) {
        logError('Aegis search failed', { error: error.message, query: req.query?.q, type: req.query?.type });
        return res.status(500).json({
            error: 'Aegis search failed',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/stats
 * Get system-wide statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const stats = getAegisStats();
        let chainObservedWallets = null;
        let lastChainActivity = null;

        // Pull light on-chain telemetry so module cards reflect fresh network activity
        // even when no local Aegis analysis has been triggered yet.
        try {
            const txPayload = await nodeGet('/transactions?limit=200');
            const txs = Array.isArray(txPayload?.transactions) ? txPayload.transactions : [];
            const walletSet = new Set();
            let latestActivityEpoch = null;

            for (const tx of txs) {
                if (tx?.from) walletSet.add(String(tx.from));
                if (tx?.to) walletSet.add(String(tx.to));
                const txEpoch = new Date(tx?.timestamp || tx?.time || tx?.created_at || 0).getTime();
                if (Number.isFinite(txEpoch)) {
                    latestActivityEpoch = latestActivityEpoch === null ? txEpoch : Math.max(latestActivityEpoch, txEpoch);
                }
            }

            chainObservedWallets = walletSet.size;
            lastChainActivity = latestActivityEpoch ? new Date(latestActivityEpoch).toISOString() : null;
        } catch {
            // Keep stats endpoint available even when node telemetry is temporarily unavailable.
        }

        const lastUpdateCandidates = [
            stats.lastUpdate,
            stats.lastAnalysis,
            stats.lastWalletAnalysis,
            lastChainActivity
        ]
            .filter(Boolean)
            .map((value) => new Date(value).getTime())
            .filter((value) => Number.isFinite(value));
        const lastUpdate = lastUpdateCandidates.length > 0
            ? new Date(Math.max(...lastUpdateCandidates)).toISOString()
            : null;

        res.json({
            success: true,
            stats: {
                total_transactions: stats.totalTransactions,
                total_wallets: stats.totalWallets,
                average_risk_score: stats.averageRiskScore,
                high_risk_count: stats.highRiskCount,
                transactions_today: stats.today,
                transactions_this_hour: stats.thisHour,
                last_analysis: stats.lastAnalysis,
                last_wallet_analysis: stats.lastWalletAnalysis,
                last_chain_activity: lastChainActivity,
                last_update: lastUpdate,
                chain_observed_wallets: chainObservedWallets,
                risk_distribution: stats.riskDistribution,
                status: 'Active on TestNet',
                uptime: process.uptime(),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logError('Stats endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get statistics',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/insights
 * Predictive outlook + agent recommendations
 */
router.get('/insights', async (req, res) => {
    try {
        const hoursBack = req.query.hours ? parseInt(req.query.hours) : 24;
        const bucketMinutes = req.query.bucket_minutes ? parseInt(req.query.bucket_minutes) : 60;
        const topWalletsLimit = req.query.top_wallets ? parseInt(req.query.top_wallets) : 5;

        const insights = getAegisInsights({ hoursBack, bucketMinutes, topWalletsLimit });

        res.json({
            success: true,
            insights,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logError('Insights endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to generate insights',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/posture
 * Security posture KPIs (SLA compliance, time-to-decision, FP rate approximation)
 */
router.get('/posture', async (req, res) => {
    try {
        const windowDays = req.query.days ? parseInt(req.query.days) : 7;
        const posture = getAegisSecurityPosture({ windowDays });

        res.json({
            success: true,
            posture,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logError('Posture endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to generate posture metrics',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/recent
 * Get recent transaction analyses
 */
router.get('/recent', async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const analyses = getRecentAnalyses(limit);

        res.json({
            success: true,
            count: analyses.length,
            analyses: analyses.map(a => ({
                tx_hash: a.tx_hash,
                from_address: a.from_address,
                to_address: a.to_address,
                amount: a.amount,
                risk_score: a.risk_score,
                confidence: a.confidence,
                created_at: a.created_at,
                analysis_data: a.analysis_data
            }))
        });
    } catch (error) {
        logError('Recent analyses endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get recent analyses',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/transaction/:hash
 * Get analysis for a specific transaction
 */
router.get('/transaction/:hash', async (req, res, next) => {
    try {
        const { hash } = req.params;

        if (!hash) {
            return res.status(400).json({
                error: 'Transaction hash required'
            });
        }

        const analysis = getTransactionAnalysis(hash);

        if (!analysis) {
            return res.status(404).json({
                error: 'Transaction analysis not found',
                tx_hash: hash
            });
        }

        res.json({
            success: true,
            analysis: {
                tx_hash: analysis.tx_hash,
                from_address: analysis.from_address,
                to_address: analysis.to_address,
                amount: analysis.amount,
                risk_score: analysis.risk_score,
                confidence: analysis.confidence,
                analysis_data: analysis.analysis_data,
                signature: analysis.signature,
                created_at: analysis.created_at
            }
        });
    } catch (error) {
        logError('Transaction analysis lookup failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get transaction analysis',
            message: error.message
        });
    }
});

/**
 * POST /api/aegis/verify
 * Verify a quantum signature
 */
router.post('/verify', async (req, res, next) => {
    try {
        const { data, signature, publicKey } = req.body;

        if (!data || !signature || !publicKey) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['data', 'signature', 'publicKey']
            });
        }

        const verification = await verifySignature(data, signature, publicKey);

        res.json({
            success: true,
            verification
        });
    } catch (error) {
        logError('Signature verification failed', { error: error.message });
        res.status(500).json({
            error: 'Verification failed',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/keys
 * Get public keys for verification
 */
router.get('/keys', async (req, res, next) => {
    try {
        const keys = getPublicKeys();

        if (!keys) {
            return res.status(503).json({
                error: 'Cryptographic keys not initialized'
            });
        }

        res.json({
            success: true,
            keys
        });
    } catch (error) {
        logError('Public keys endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get public keys',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/health
 * Health check endpoint
 */
router.get('/health', async (req, res, next) => {
    try {
        const stats = getAegisStats();
        const keys = getPublicKeys();

        res.json({
            success: true,
            status: 'healthy',
            service: 'Aegis AI',
            version: '1.0.0',
            cryptography_initialized: !!keys,
            database_connected: true,
            total_analyses: stats.totalTransactions,
            uptime_seconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

// ============================================================================
// VALIDATOR INTEGRATION ENDPOINTS
// ============================================================================

/**
 * GET /api/aegis/validator/check/:address
 * Validator endpoint to check wallet risk before processing transaction
 */
router.get('/validator/check/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (!address) {
            return res.status(400).json({
                error: 'Address required'
            });
        }

        // Get wallet score
        let walletData = getWalletScore(address);
        let riskScore = 0;
        let confidence = 0;

        if (walletData) {
            riskScore = walletData.current_score;
            confidence = 0.85; // High confidence for existing data
        } else {
            // Analyze wallet if not in database
            const analysis = await analyzeWallet(address);
            riskScore = analysis.risk_score;
            confidence = analysis.confidence;
        }

        // Get throttle status
        const throttleStatus = getThrottleStatus(address);

        // Determine recommendation
        let recommendation = 'APPROVE';
        if (riskScore >= 90) recommendation = 'REVIEW';
        else if (riskScore >= 70) recommendation = 'DELAY';
        else if (riskScore >= 40) recommendation = 'CAUTION';

        res.json({
            success: true,
            address,
            risk_score: riskScore,
            risk_level: riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW',
            is_throttled: throttleStatus.is_throttled,
            throttle_level: throttleStatus.throttle_level,
            throttle_until: throttleStatus.throttle_until,
            recommendation,
            confidence,
            recent_flags: walletData?.total_transactions || 0,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logError('Validator check endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to check wallet',
            message: error.message
        });
    }
});

/**
 * POST /api/aegis/validator/report
 * Validators report transaction outcomes for feedback loop
 */
router.post('/validator/report', async (req, res) => {
    try {
        const {
            tx_hash,
            address,
            outcome,
            validator_id,
            notes,
            model_id,
            risk_score,
            predicted_action
        } = req.body;

        if (!tx_hash || !address || !outcome) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['tx_hash', 'address', 'outcome']
            });
        }

        const feedbackResult = saveValidatorFeedback({
            tx_hash,
            address,
            outcome,
            validator_id,
            notes,
            model_id: model_id || process.env.AEGIS_MODEL_ID || 'aegis-heuristic-v1',
            risk_score,
            predicted_action
        });

        const reputation = getOracleReputation({
            modelId: model_id || process.env.AEGIS_MODEL_ID || 'aegis-heuristic-v1',
            daysBack: req.query.days ? parseInt(req.query.days) : 30
        });

        logInfo('Validator report received', {
            tx_hash,
            address,
            outcome,
            validator_id: validator_id || 'unknown',
            model_id: model_id || process.env.AEGIS_MODEL_ID || 'aegis-heuristic-v1'
        });

        res.json({
            success: true,
            message: 'Report received',
            tx_hash,
            feedback_id: feedbackResult.id,
            reputation
        });
    } catch (error) {
        logError('Validator report endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to process report',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/validator/reputation
 * Compute oracle accuracy/reputation from validator outcomes
 */
router.get('/validator/reputation', async (req, res) => {
    try {
        const modelId = req.query.model_id || process.env.AEGIS_MODEL_ID || 'aegis-heuristic-v1';
        const daysBack = req.query.days ? parseInt(req.query.days) : 30;
        const reputation = getOracleReputation({ modelId, daysBack });

        res.json({
            success: true,
            reputation,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logError('Validator reputation endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to compute reputation',
            message: error.message
        });
    }
});

// ============================================================================
// THROTTLE MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/aegis/throttle/:address
 * Get throttle status for a wallet
 */
router.get('/throttle/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (!address) {
            return res.status(400).json({
                error: 'Address required'
            });
        }

        const throttleStatus = getThrottleStatus(address);

        res.json({
            success: true,
            address,
            ...throttleStatus
        });
    } catch (error) {
        logError('Throttle status endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get throttle status',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/throttle
 * Get all throttled wallets
 */
router.get('/throttle', async (req, res) => {
    try {
        const level = req.query.level ? parseInt(req.query.level) : null;
        const wallets = getThrottledWallets(level);

        res.json({
            success: true,
            count: wallets.length,
            wallets
        });
    } catch (error) {
        logError('Throttled wallets endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get throttled wallets',
            message: error.message
        });
    }
});

/**
 * DELETE /api/aegis/throttle/:address
 * Clear throttle for a wallet (admin function)
 */
router.delete('/throttle/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (!address) {
            return res.status(400).json({
                error: 'Address required'
            });
        }

        const result = clearThrottle(address);

        res.json({
            success: result.success,
            address,
            message: result.success ? 'Throttle cleared' : 'Failed to clear throttle'
        });
    } catch (error) {
        logError('Clear throttle endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to clear throttle',
            message: error.message
        });
    }
});

// ============================================================================
// REVIEW QUEUE ENDPOINTS
// ============================================================================

/**
 * GET /api/aegis/review/queue
 * Get queued transactions for review
 */
router.get('/review/queue', async (req, res) => {
    try {
        const filters = {
            status: req.query.status || 'pending',
            priority: req.query.priority ? parseInt(req.query.priority) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : 50
        };

        const transactions = getQueuedTransactions(filters);

        res.json({
            success: true,
            count: transactions.length,
            transactions
        });
    } catch (error) {
        logError('Review queue endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get review queue',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/review/stats
 * Get review queue statistics
 */
router.get('/review/stats', async (req, res) => {
    try {
        const stats = getQueueStats();

        res.json({
            success: true,
            stats
        });
    } catch (error) {
        logError('Review stats endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get review stats',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/review/:hash
 * Get details for a queued transaction
 */
router.get('/review/:hash', async (req, res) => {
    try {
        const { hash } = req.params;

        if (!hash) {
            return res.status(400).json({
                error: 'Transaction hash required'
            });
        }

        const transaction = getQueuedTransaction(hash);

        if (!transaction) {
            return res.status(404).json({
                error: 'Transaction not found in review queue'
            });
        }

        res.json({
            success: true,
            transaction
        });
    } catch (error) {
        logError('Review transaction lookup failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get transaction',
            message: error.message
        });
    }
});

/**
 * POST /api/aegis/review/:hash/approve
 * Approve a queued transaction
 */
router.post('/review/:hash/approve', async (req, res) => {
    try {
        const { hash } = req.params;
        const { reviewer_id, notes } = req.body;

        if (!hash) {
            return res.status(400).json({
                error: 'Transaction hash required'
            });
        }

        if (!reviewer_id) {
            return res.status(400).json({
                error: 'Reviewer ID required'
            });
        }

        const result = approveTransaction(hash, reviewer_id, notes);

        if (!result.success) {
            return res.status(400).json({
                error: result.error
            });
        }

        res.json({
            success: true,
            tx_hash: hash,
            status: 'approved',
            reviewed_by: reviewer_id
        });
    } catch (error) {
        logError('Approve transaction failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to approve transaction',
            message: error.message
        });
    }
});

/**
 * POST /api/aegis/review/:hash/reject
 * Reject a queued transaction
 */
router.post('/review/:hash/reject', async (req, res) => {
    try {
        const { hash } = req.params;
        const { reviewer_id, notes } = req.body;

        if (!hash) {
            return res.status(400).json({
                error: 'Transaction hash required'
            });
        }

        if (!reviewer_id) {
            return res.status(400).json({
                error: 'Reviewer ID required'
            });
        }

        const result = rejectTransaction(hash, reviewer_id, notes);

        if (!result.success) {
            return res.status(400).json({
                error: result.error
            });
        }

        res.json({
            success: true,
            tx_hash: hash,
            status: 'rejected',
            reviewed_by: reviewer_id
        });
    } catch (error) {
        logError('Reject transaction failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to reject transaction',
            message: error.message
        });
    }
});

/**
 * GET /api/aegis/ws/stats
 * Get WebSocket connection statistics
 */
router.get('/ws/stats', async (req, res) => {
    try {
        const stats = aegisWebSocket.getStats();

        res.json({
            success: true,
            websocket: stats
        });
    } catch (error) {
        logError('WebSocket stats endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to get WebSocket stats',
            message: error.message
        });
    }
});

export const __testables = {
    normalizeSearchType,
    detectSearchType,
    stripSearchPrefix,
    normalizeRiskScore,
    buildRiskSummary
};

export default router;
