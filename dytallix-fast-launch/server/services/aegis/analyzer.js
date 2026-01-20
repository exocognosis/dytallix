/**
 * Aegis Transaction Analyzer
 * Analyzes blockchain transactions for risk assessment
 */

import { nodeGet } from '../blockchain-client.js';
import { logInfo, logError, logWarn } from '../../logger.js';
import { calculateOverallRiskScore } from './risk-scoring.js';
import { signData } from './crypto.js';
import {
    saveTransactionAnalysis,
    updateWalletScore,
    getWalletScore,
    saveSignature
} from './database.js';
import { aegisWebSocket } from './websocket.js';
import { applyThrottle, recordTransaction } from './throttle.js';
import { shouldQueue, addToQueue } from './review-queue.js';

/**
 * Fetch wallet transaction history from blockchain
 */
export const fetchWalletHistory = async (address) => {
    try {
        // Try to fetch from blockchain node
        const response = await nodeGet(`/wallet/${address}/transactions`);
        return response.transactions || [];
    } catch (error) {
        logWarn('Failed to fetch wallet history from blockchain', {
            address,
            error: error.message
        });
        return [];
    }
};

/**
 * Fetch wallet metadata
 */
export const fetchWalletMetadata = async (address) => {
    try {
        const response = await nodeGet(`/wallet/${address}`);
        return {
            balance: response.balance || 0,
            nonce: response.nonce || 0,
            firstSeen: response.created_at || response.first_seen || null
        };
    } catch (error) {
        logWarn('Failed to fetch wallet metadata', {
            address,
            error: error.message
        });
        return {
            balance: 0,
            nonce: 0,
            firstSeen: null
        };
    }
};

/**
 * Analyze a transaction for risk
 */
export const analyzeTransaction = async (txData) => {
    try {
        const { tx_hash, from, to, amount } = txData;

        logInfo('Starting transaction analysis', { tx_hash, from, to, amount });

        // Fetch wallet history and metadata
        const [walletHistory, walletMetadata] = await Promise.all([
            fetchWalletHistory(from),
            fetchWalletMetadata(from)
        ]);

        // Get existing wallet score if available
        const existingScore = getWalletScore(from);

        // Prepare analysis data
        const analysisData = {
            walletAge: existingScore?.first_seen || walletMetadata.firstSeen,
            transactionHistory: walletHistory,
            currentAmount: amount,
            fromAddress: from,
            toAddress: to,
            walletBalance: walletMetadata.balance,
            walletNonce: walletMetadata.nonce
        };

        // Calculate risk score
        const riskAnalysis = calculateOverallRiskScore(analysisData);

        // Apply throttling based on risk score
        const throttleStatus = applyThrottle(from, riskAnalysis.riskScore);

        // Check if transaction should be queued for review
        const needsReview = shouldQueue({ ...txData, walletAge: analysisData.walletAge }, riskAnalysis.riskScore);

        // Sign the risk score with quantum-resistant signature
        const signatureData = await signData({
            tx_hash,
            from,
            to,
            amount,
            risk_score: riskAnalysis.riskScore,
            confidence: riskAnalysis.confidence,
            timestamp: new Date().toISOString()
        });

        // Save signature to database
        await saveSignature({
            data_hash: signatureData.dataHash,
            signature: signatureData.signature,
            public_key: signatureData.publicKey,
            algorithm: signatureData.algorithm
        });

        // Save transaction analysis
        await saveTransactionAnalysis({
            tx_hash,
            from_address: from,
            to_address: to,
            amount,
            risk_score: riskAnalysis.riskScore,
            confidence: riskAnalysis.confidence,
            analysis_data: {
                breakdown: riskAnalysis.breakdown,
                riskLevel: riskAnalysis.riskLevel,
                walletHistoryCount: walletHistory.length,
                walletBalance: walletMetadata.balance
            },
            signature: signatureData.signature
        });

        // Update wallet score
        await updateWalletScore({
            address: from,
            current_score: riskAnalysis.riskScore,
            metadata: {
                lastAmount: amount,
                lastTo: to,
                balance: walletMetadata.balance,
                riskLevel: riskAnalysis.riskLevel
            }
        });

        // Add to review queue if needed
        if (needsReview) {
            const queueResult = addToQueue({
                tx_hash,
                from,
                to,
                amount,
                risk_score: riskAnalysis.riskScore,
                confidence: riskAnalysis.confidence
            }, {
                breakdown: riskAnalysis.breakdown,
                riskLevel: riskAnalysis.riskLevel,
                walletBalance: walletMetadata.balance
            });

            if (queueResult.success) {
                // Send review required alert
                aegisWebSocket.alertReviewRequired({
                    tx_hash,
                    from,
                    to,
                    amount,
                    risk_score: riskAnalysis.riskScore
                }, queueResult.priority);
            }
        }

        // Send WebSocket alerts based on risk level
        if (riskAnalysis.riskScore >= 90) {
            aegisWebSocket.alertCriticalRisk({
                tx_hash,
                from,
                to,
                amount,
                risk_score: riskAnalysis.riskScore,
                risk_level: riskAnalysis.riskLevel,
                confidence: riskAnalysis.confidence,
                breakdown: riskAnalysis.breakdown
            });
        } else if (riskAnalysis.riskScore >= 70) {
            aegisWebSocket.alertHighRisk({
                tx_hash,
                from,
                to,
                amount,
                risk_score: riskAnalysis.riskScore,
                risk_level: riskAnalysis.riskLevel,
                confidence: riskAnalysis.confidence,
                breakdown: riskAnalysis.breakdown
            });
        }

        // Record transaction for throttling
        const throttleCheck = recordTransaction(from);
        if (throttleCheck.violation) {
            aegisWebSocket.alertThrottleViolation(from, riskAnalysis.riskScore, throttleStatus.throttle_level);
        }

        logInfo('Transaction analysis complete', {
            tx_hash,
            risk_score: riskAnalysis.riskScore,
            risk_level: riskAnalysis.riskLevel,
            confidence: riskAnalysis.confidence,
            throttled: throttleStatus.throttle_level > 0,
            queued: needsReview
        });

        return {
            tx_hash,
            from,
            to,
            amount,
            risk_score: riskAnalysis.riskScore,
            confidence: riskAnalysis.confidence,
            risk_level: riskAnalysis.riskLevel,
            breakdown: riskAnalysis.breakdown,
            signature: {
                value: signatureData.signature,
                public_key: signatureData.publicKey,
                algorithm: signatureData.algorithm,
                data_hash: signatureData.dataHash
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logError('Transaction analysis failed', {
            tx_hash: txData.tx_hash,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Analyze a wallet's overall risk profile
 */
export const analyzeWallet = async (address) => {
    try {
        logInfo('Starting wallet analysis', { address });

        // Fetch wallet data
        const [walletHistory, walletMetadata] = await Promise.all([
            fetchWalletHistory(address),
            fetchWalletMetadata(address)
        ]);

        // Get existing score
        const existingScore = getWalletScore(address);

        // Prepare analysis data
        const analysisData = {
            walletAge: existingScore?.first_seen || walletMetadata.firstSeen,
            transactionHistory: walletHistory,
            currentAmount: walletMetadata.balance,
            fromAddress: address,
            walletBalance: walletMetadata.balance,
            walletNonce: walletMetadata.nonce
        };

        // Calculate risk score
        const riskAnalysis = calculateOverallRiskScore(analysisData);

        // Update wallet score
        await updateWalletScore({
            address,
            current_score: riskAnalysis.riskScore,
            metadata: {
                balance: walletMetadata.balance,
                transactionCount: walletHistory.length,
                riskLevel: riskAnalysis.riskLevel,
                lastAnalyzed: new Date().toISOString()
            }
        });

        logInfo('Wallet analysis complete', {
            address,
            risk_score: riskAnalysis.riskScore,
            risk_level: riskAnalysis.riskLevel
        });

        return {
            address,
            risk_score: riskAnalysis.riskScore,
            confidence: riskAnalysis.confidence,
            risk_level: riskAnalysis.riskLevel,
            breakdown: riskAnalysis.breakdown,
            wallet_metadata: {
                balance: walletMetadata.balance,
                transaction_count: walletHistory.length,
                first_seen: existingScore?.first_seen || walletMetadata.firstSeen,
                last_analyzed: new Date().toISOString()
            }
        };
    } catch (error) {
        logError('Wallet analysis failed', {
            address,
            error: error.message
        });
        throw error;
    }
};

export default {
    analyzeTransaction,
    analyzeWallet,
    fetchWalletHistory,
    fetchWalletMetadata
};
