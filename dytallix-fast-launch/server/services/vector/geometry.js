/**
 * Information Geometry Utilities for Vector Risk Predictions
 * 
 * This module applies concepts of differential geometry to probability 
 * distributions of address behaviors (statistical manifolds).
 */

/**
 * Normalizes an array of raw counts into a probability distribution.
 * If the sum is 0, returns a uniform distribution to avoid undefined states
 * on the statistical manifold.
 * 
 * @param {number[]} counts Array of observed frequencies
 * @returns {number[]} Normalized probability distribution (sums to 1)
 */
export const normalizeDistribution = (counts) => {
    const sum = counts.reduce((acc, val) => acc + Math.max(0, val), 0);
    if (sum === 0) {
        // Return uniform distribution if no data
        return counts.map(() => 1 / counts.length);
    }
    return counts.map(val => Math.max(0, val) / sum);
};

/**
 * Calculates the Kullback-Leibler (KL) Divergence from distribution Q to P.
 * D_KL(P || Q) = SUM( P(i) * log( P(i) / Q(i) ) )
 * 
 * In information geometry, this represents a specific Bregman divergence 
 * measuring the informational "distance" from a reference model (Q) to 
 * the observed behavior (P).
 * 
 * @param {number[]} p Observed probability distribution
 * @param {number[]} q Reference probability distribution (e.g., "ideal scammer")
 * @returns {number} The divergence score (0 = identical, higher = more divergent)
 */
export const calculateKLDivergence = (p, q) => {
    if (p.length !== q.length) throw new Error('Distributions must have same dimensionality');

    // Epsilon to prevent log(0) and division by zero
    const epsilon = 1e-9;

    let divergence = 0;
    for (let i = 0; i < p.length; i++) {
        const p_i = p[i] + epsilon;
        const q_i = q[i] + epsilon;
        divergence += p_i * Math.log(p_i / q_i);
    }
    return Math.max(0, divergence); // Prevent floating point negative zeroes
};

/**
 * Approximates the Fisher Information Metric component for a shifting distribution.
 * This measures the "velocity" of an address across the statistical manifold.
 * High Fisher information indicates rapid, significant character changes.
 * 
 * Approximated here as the squared Hellinger distance between past and current
 * probability distributions over the time delta.
 * 
 * @param {number[]} pCurrent The current probability distribution
 * @param {number[]} pPast The past probability distribution
 * @returns {number} The Fisher-approximated rate of change metric
 */
export const approximateFisherVelocity = (pCurrent, pPast) => {
    if (!pPast || pCurrent.length !== pPast.length) return 0;

    let hellingerSq = 0;
    for (let i = 0; i < pCurrent.length; i++) {
        const diff = Math.sqrt(pCurrent[i]) - Math.sqrt(pPast[i]);
        hellingerSq += diff * diff;
    }

    // Hellinger distance squared
    return hellingerSq / 2;
};

/**
 * Transforms a raw KL Divergence score into a bounded risk component (0-1).
 * The closer P is to Q (the malicious reference), the lower the divergence, 
 * which translates to a HIGHER risk score.
 * 
 * @param {number} divergence Score from KL Divergence
 * @param {number} scale Factor to tune the sensitivity curve
 * @returns {number} Bounded risk component [0, 1]
 */
export const mapDivergenceToRisk = (divergence, scale = 1.0) => {
    // If divergence is 0, they match the scammer completely -> risk = 1.0
    // As divergence grows, risk exponentially decays toward 0.
    return Math.exp(-scale * divergence);
};

export default {
    normalizeDistribution,
    calculateKLDivergence,
    approximateFisherVelocity,
    mapDivergenceToRisk
};
