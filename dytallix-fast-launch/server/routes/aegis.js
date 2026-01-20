/**
 * Aegis API Routes
 * REST endpoints for transaction risk analysis
 */

import express from 'express';
import {
    analyzeTransaction,
    analyzeWallet,
    getAegisStats,
    getRecentAnalyses,
    getPublicKeys,
    verifySignature
} from '../services/aegis/index.js';
import { getTransactionAnalysis, getWalletScore } from '../services/aegis/database.js';
import { getThrottleStatus, getThrottledWallets, clearThrottle } from '../services/aegis/throttle.js';
import {
    getQueuedTransactions,
    getQueuedTransaction,
    approveTransaction,
    rejectTransaction,
    getQueueStats
} from '../services/aegis/review-queue.js';
import { aegisWebSocket } from '../services/aegis/websocket.js';
import { logInfo, logError } from '../logger.js';

const router = express.Router();

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
 * GET /api/aegis/stats
 * Get system-wide statistics
 */
router.get('/stats', async (req, res, next) => {
    try {
        const stats = getAegisStats();

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

        const verification = verifySignature(data, signature, publicKey);

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
        const { tx_hash, address, outcome, validator_id, notes } = req.body;

        if (!tx_hash || !address || !outcome) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['tx_hash', 'address', 'outcome']
            });
        }

        // Log the validator report
        logInfo('Validator report received', {
            tx_hash,
            address,
            outcome,
            validator_id: validator_id || 'unknown'
        });

        // TODO: Store validator feedback for ML improvement

        res.json({
            success: true,
            message: 'Report received',
            tx_hash
        });
    } catch (error) {
        logError('Validator report endpoint failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to process report',
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

export default router;

