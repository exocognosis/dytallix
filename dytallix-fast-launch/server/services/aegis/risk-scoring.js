/**
 * Aegis Risk Scoring Module
 * Implements multi-factor risk assessment algorithms
 */

import { logInfo, logWarn } from '../../logger.js';

/**
 * Calculate wallet age score (0-100)
 * Newer wallets are higher risk
 */
export const calculateWalletAgeScore = (firstSeenTimestamp) => {
    if (!firstSeenTimestamp) {
        return 80; // Unknown wallet = high risk
    }

    const now = Date.now();
    const firstSeen = new Date(firstSeenTimestamp).getTime();
    const ageInDays = (now - firstSeen) / (1000 * 60 * 60 * 24);

    // Risk decreases with age
    if (ageInDays < 1) return 90;        // Less than 1 day = very high risk
    if (ageInDays < 7) return 70;        // Less than 1 week = high risk
    if (ageInDays < 30) return 50;       // Less than 1 month = medium risk
    if (ageInDays < 90) return 30;       // Less than 3 months = low-medium risk
    if (ageInDays < 180) return 20;      // Less than 6 months = low risk
    return 10;                            // 6+ months = very low risk
};

/**
 * Calculate transaction pattern score (0-100)
 * Unusual patterns indicate higher risk
 */
export const calculateTransactionPatternScore = (transactionHistory) => {
    if (!transactionHistory || transactionHistory.length === 0) {
        return 75; // No history = high risk
    }

    const txCount = transactionHistory.length;
    let riskScore = 50; // Base score

    // Very few transactions = higher risk
    if (txCount < 5) {
        riskScore += 20;
    } else if (txCount < 10) {
        riskScore += 10;
    } else if (txCount > 100) {
        riskScore -= 10; // Many transactions = lower risk
    }

    // Check for rapid-fire transactions (potential bot)
    const timestamps = transactionHistory.map(tx => new Date(tx.timestamp).getTime());
    const timeDiffs = [];
    for (let i = 1; i < timestamps.length; i++) {
        timeDiffs.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const oneMinute = 60 * 1000;

    if (avgTimeDiff < oneMinute) {
        riskScore += 25; // Very rapid transactions = bot-like behavior
    }

    // Check for round-number amounts (potential automation)
    const roundAmounts = transactionHistory.filter(tx => {
        const amount = parseFloat(tx.amount);
        return amount % 1 === 0 && amount % 10 === 0;
    }).length;

    if (roundAmounts / txCount > 0.8) {
        riskScore += 15; // Mostly round numbers = suspicious
    }

    return Math.min(100, Math.max(0, riskScore));
};

/**
 * Calculate amount anomaly score (0-100)
 * Unusually large or small amounts indicate risk
 */
export const calculateAmountAnomalyScore = (amount, walletHistory) => {
    if (!amount || amount <= 0) {
        return 50; // Zero or negative = medium risk
    }

    if (!walletHistory || walletHistory.length === 0) {
        // No history - check if amount is suspiciously large
        if (amount > 10000) return 80;
        if (amount > 1000) return 60;
        return 40;
    }

    // Calculate average and standard deviation of historical amounts
    const amounts = walletHistory.map(tx => parseFloat(tx.amount) || 0);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Check how many standard deviations away from mean
    const zScore = Math.abs((amount - avg) / (stdDev || 1));

    if (zScore > 3) return 85;  // 3+ std devs = very anomalous
    if (zScore > 2) return 65;  // 2+ std devs = anomalous
    if (zScore > 1) return 45;  // 1+ std devs = slightly anomalous
    return 25;                   // Within normal range
};

/**
 * Calculate interaction diversity score (0-100)
 * Interacting with only one or two addresses is suspicious
 */
export const calculateInteractionDiversityScore = (walletHistory) => {
    if (!walletHistory || walletHistory.length === 0) {
        return 70; // No history = high risk
    }

    // Get unique addresses interacted with
    const uniqueAddresses = new Set();
    walletHistory.forEach(tx => {
        if (tx.to) uniqueAddresses.add(tx.to);
        if (tx.from) uniqueAddresses.add(tx.from);
    });

    const diversity = uniqueAddresses.size;
    const txCount = walletHistory.length;
    const diversityRatio = diversity / txCount;

    // Low diversity = higher risk (potential wash trading)
    if (diversity === 1) return 90;           // Only one address = very suspicious
    if (diversity === 2) return 75;           // Two addresses = suspicious
    if (diversityRatio < 0.2) return 60;      // Low diversity
    if (diversityRatio < 0.5) return 40;      // Medium diversity
    return 20;                                 // High diversity = lower risk
};

/**
 * Calculate overall risk score
 * Combines multiple factors with weighted average
 */
export const calculateOverallRiskScore = (analysisData) => {
    const {
        walletAge,
        transactionHistory = [],
        currentAmount,
        fromAddress,
        toAddress
    } = analysisData;

    // Calculate individual scores
    const ageScore = calculateWalletAgeScore(walletAge);
    const patternScore = calculateTransactionPatternScore(transactionHistory);
    const amountScore = calculateAmountAnomalyScore(currentAmount, transactionHistory);
    const diversityScore = calculateInteractionDiversityScore(transactionHistory);

    // Weighted average (can be tuned)
    const weights = {
        age: 0.25,
        pattern: 0.30,
        amount: 0.25,
        diversity: 0.20
    };

    const overallScore = Math.round(
        ageScore * weights.age +
        patternScore * weights.pattern +
        amountScore * weights.amount +
        diversityScore * weights.diversity
    );

    // Calculate confidence based on data availability
    let confidence = 0.5; // Base confidence
    if (walletAge) confidence += 0.15;
    if (transactionHistory.length > 0) confidence += 0.15;
    if (transactionHistory.length > 10) confidence += 0.10;
    if (transactionHistory.length > 50) confidence += 0.10;

    confidence = Math.min(1.0, confidence);

    logInfo('Risk score calculated', {
        fromAddress,
        overallScore,
        confidence,
        components: { ageScore, patternScore, amountScore, diversityScore }
    });

    return {
        riskScore: overallScore,
        confidence,
        breakdown: {
            walletAge: ageScore,
            transactionPattern: patternScore,
            amountAnomaly: amountScore,
            interactionDiversity: diversityScore
        },
        riskLevel: overallScore > 70 ? 'HIGH' : overallScore > 40 ? 'MEDIUM' : 'LOW'
    };
};

/**
 * Get risk level label
 */
export const getRiskLevel = (score) => {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
};

/**
 * Get risk color for UI
 */
export const getRiskColor = (score) => {
    if (score >= 70) return '#ef4444'; // red
    if (score >= 40) return '#f59e0b'; // amber
    return '#10b981'; // green
};

export default {
    calculateWalletAgeScore,
    calculateTransactionPatternScore,
    calculateAmountAnomalyScore,
    calculateInteractionDiversityScore,
    calculateOverallRiskScore,
    getRiskLevel,
    getRiskColor
};
