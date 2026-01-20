/**
 * Aegis AI Module - Main Service Export
 * Quantum-resistant transaction vulnerability assessment
 */

import { analyzeTransaction, analyzeWallet } from './analyzer.js';
import { getAegisStats, getRecentAnalyses } from './database.js';
import { getPublicKeys, verifySignature } from './crypto.js';
import { logInfo } from '../../logger.js';

logInfo('Aegis AI module initialized');

export {
    analyzeTransaction,
    analyzeWallet,
    getAegisStats,
    getRecentAnalyses,
    getPublicKeys,
    verifySignature
};

export default {
    analyzeTransaction,
    analyzeWallet,
    getAegisStats,
    getRecentAnalyses,
    getPublicKeys,
    verifySignature
};
