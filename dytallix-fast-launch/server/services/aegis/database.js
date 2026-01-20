/**
 * Aegis Database Module
 * Handles database operations for transaction analysis and risk scoring
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logError } from '../../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the same database as leads
const DB_PATH = path.join(__dirname, '../../../data/leads.db');

// Initialize database connection
const db = new Database(DB_PATH);

// Create Aegis tables
db.exec(`
  CREATE TABLE IF NOT EXISTS aegis_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT UNIQUE NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT,
    amount REAL,
    risk_score INTEGER,
    confidence REAL,
    analysis_data TEXT,
    signature TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS aegis_wallet_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT UNIQUE NOT NULL,
    current_score INTEGER,
    total_transactions INTEGER DEFAULT 0,
    first_seen DATETIME,
    last_analyzed DATETIME,
    metadata TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS aegis_signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_hash TEXT NOT NULL,
    signature TEXT NOT NULL,
    public_key TEXT NOT NULL,
    algorithm TEXT DEFAULT 'ML-DSA-87',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create indexes for performance
db.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_tx_hash ON aegis_transactions(tx_hash)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_tx_from ON aegis_transactions(from_address)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_wallet_addr ON aegis_wallet_scores(address)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_aegis_tx_created ON aegis_transactions(created_at)`);

logInfo('Aegis database initialized', { path: DB_PATH });

/**
 * Save transaction analysis
 */
export const saveTransactionAnalysis = (txData) => {
    try {
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO aegis_transactions (
        tx_hash, from_address, to_address, amount, risk_score, 
        confidence, analysis_data, signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const result = stmt.run(
            txData.tx_hash,
            txData.from_address,
            txData.to_address || null,
            txData.amount || 0,
            txData.risk_score,
            txData.confidence,
            JSON.stringify(txData.analysis_data || {}),
            txData.signature || null
        );

        logInfo('Transaction analysis saved', { tx_hash: txData.tx_hash, risk_score: txData.risk_score });
        return { id: result.lastInsertRowid, success: true };
    } catch (error) {
        logError('Failed to save transaction analysis', { error: error.message, tx_hash: txData.tx_hash });
        throw error;
    }
};

/**
 * Get transaction analysis by hash
 */
export const getTransactionAnalysis = (txHash) => {
    const stmt = db.prepare('SELECT * FROM aegis_transactions WHERE tx_hash = ?');
    const result = stmt.get(txHash);

    if (result && result.analysis_data) {
        result.analysis_data = JSON.parse(result.analysis_data);
    }

    return result;
};

/**
 * Update or create wallet score
 */
export const updateWalletScore = (walletData) => {
    try {
        const existing = db.prepare('SELECT * FROM aegis_wallet_scores WHERE address = ?').get(walletData.address);

        if (existing) {
            const stmt = db.prepare(`
        UPDATE aegis_wallet_scores 
        SET current_score = ?, total_transactions = ?, last_analyzed = CURRENT_TIMESTAMP,
            metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE address = ?
      `);

            stmt.run(
                walletData.current_score,
                (existing.total_transactions || 0) + 1,
                JSON.stringify(walletData.metadata || {}),
                walletData.address
            );
        } else {
            const stmt = db.prepare(`
        INSERT INTO aegis_wallet_scores (
          address, current_score, total_transactions, first_seen, 
          last_analyzed, metadata
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)
      `);

            stmt.run(
                walletData.address,
                walletData.current_score,
                1,
                JSON.stringify(walletData.metadata || {})
            );
        }

        logInfo('Wallet score updated', { address: walletData.address, score: walletData.current_score });
        return { success: true };
    } catch (error) {
        logError('Failed to update wallet score', { error: error.message, address: walletData.address });
        throw error;
    }
};

/**
 * Get wallet score by address
 */
export const getWalletScore = (address) => {
    const stmt = db.prepare('SELECT * FROM aegis_wallet_scores WHERE address = ?');
    const result = stmt.get(address);

    if (result && result.metadata) {
        result.metadata = JSON.parse(result.metadata);
    }

    return result;
};

/**
 * Save quantum signature
 */
export const saveSignature = (signatureData) => {
    try {
        const stmt = db.prepare(`
      INSERT INTO aegis_signatures (data_hash, signature, public_key, algorithm)
      VALUES (?, ?, ?, ?)
    `);

        const result = stmt.run(
            signatureData.data_hash,
            signatureData.signature,
            signatureData.public_key,
            signatureData.algorithm || 'ML-DSA-87'
        );

        return { id: result.lastInsertRowid, success: true };
    } catch (error) {
        logError('Failed to save signature', { error: error.message });
        throw error;
    }
};

/**
 * Get recent transaction analyses
 */
export const getRecentAnalyses = (limit = 50) => {
    const stmt = db.prepare(`
    SELECT * FROM aegis_transactions 
    ORDER BY created_at DESC 
    LIMIT ?
  `);

    const results = stmt.all(limit);
    return results.map(r => {
        if (r.analysis_data) {
            r.analysis_data = JSON.parse(r.analysis_data);
        }
        return r;
    });
};

/**
 * Get system statistics
 */
export const getAegisStats = () => {
    const stats = {};

    // Total transactions analyzed
    stats.totalTransactions = db.prepare('SELECT COUNT(*) as count FROM aegis_transactions').get().count;

    // Total unique wallets
    stats.totalWallets = db.prepare('SELECT COUNT(*) as count FROM aegis_wallet_scores').get().count;

    // Average risk score
    const avgScore = db.prepare('SELECT AVG(risk_score) as avg FROM aegis_transactions WHERE risk_score IS NOT NULL').get();
    stats.averageRiskScore = Math.round(avgScore.avg || 0);

    // High risk transactions (score > 70)
    stats.highRiskCount = db.prepare('SELECT COUNT(*) as count FROM aegis_transactions WHERE risk_score > 70').get().count;

    // Transactions today
    stats.today = db.prepare(`
    SELECT COUNT(*) as count 
    FROM aegis_transactions 
    WHERE date(created_at) = date('now')
  `).get().count;

    // Transactions this hour
    stats.thisHour = db.prepare(`
    SELECT COUNT(*) as count 
    FROM aegis_transactions 
    WHERE datetime(created_at) >= datetime('now', '-1 hour')
  `).get().count;

    // Last analysis timestamp
    const lastAnalysis = db.prepare('SELECT MAX(created_at) as last FROM aegis_transactions').get();
    stats.lastAnalysis = lastAnalysis.last;

    // Risk distribution
    stats.riskDistribution = {
        low: db.prepare('SELECT COUNT(*) as count FROM aegis_transactions WHERE risk_score <= 30').get().count,
        medium: db.prepare('SELECT COUNT(*) as count FROM aegis_transactions WHERE risk_score > 30 AND risk_score <= 70').get().count,
        high: db.prepare('SELECT COUNT(*) as count FROM aegis_transactions WHERE risk_score > 70').get().count,
    };

    return stats;
};

export default {
    saveTransactionAnalysis,
    getTransactionAnalysis,
    updateWalletScore,
    getWalletScore,
    saveSignature,
    getRecentAnalyses,
    getAegisStats,
};
